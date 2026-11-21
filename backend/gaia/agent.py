"""GAIA Farm Agent: one reasoning step of a tool-using language model.

The agent loop runs in the browser, because GAIA's tools (Land DNA, FAO-56 water need, groundwater guard,
Solar Brain, plant health, weather) are JavaScript modules working on the farmer's saved plot. The page sends the
conversation so far and the tool definitions; this endpoint asks the model for its next move and returns either
tool calls for the page to run, or the final answer. The page then sends the tool results back, and so on.

Providers are the same as the AI Lab (assistant.py): Claude (native tool use), any OpenAI-compatible service with
function calling (Groq, OpenRouter, Hugging Face router, LM Studio...), or Ollama on this machine.

Message format (provider-neutral, what the page sends):
  {"role": "user", "content": "..."}
  {"role": "assistant", "content": "...", "tool_calls": [{"id": "c1", "name": "water_need", "args": {...}}]}
  {"role": "tool", "tool_call_id": "c1", "name": "water_need", "content": "<json result>"}
Tools: [{"name": ..., "description": ..., "parameters": <JSON schema>}]
Answer: {"type": "tool_calls", "calls": [...], "text": "..."} or {"type": "final", "text": "..."}.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from .assistant import (MODEL, OLLAMA_URL, AssistantUnavailable, anthropic_configured, env, ollama_model,
                        openai_config)

SYSTEM = """You are the GAIA Farm Agent, for small farms in Tunisia (water, solar energy, agriculture; Tunisian \
and Japanese practices). The farmer gives you a goal for their plot. Work like an agronomist with instruments:

1. Plan briefly which measurements you need, then CALL GAIA's tools to get them. Never guess a value a tool can give.
   Call several tools in one turn when they do not depend on each other.
2. Read each result. If a result shows a risk (heat wave, over-pumping, disease pressure, a rejected practice), \
   investigate it with another tool before concluding.
3. Finish with an action plan, in the language given by the farmer's LANG, in this exact shape:
   - one sentence: the situation of the plot,
   - "## Actions" then 3 to 7 lines "- [when] action — why (tool that showed it)", most urgent first, where \
     [when] is a date or a period such as "this week", "before 15 June",
   - "## Watch" then 1 to 3 lines: what to check next and which data is missing or low confidence.
Every number about the plot must come from a tool result. Say when a tool reported low confidence or a simulation. \
Do not invent prices, subsidies or laws. At most 8 tool rounds, then answer with what you have."""

MAX_TOKENS = 1500


def _clip(s: Any, n: int = 6000) -> str:
    s = s if isinstance(s, str) else json.dumps(s, ensure_ascii=False)
    return s if len(s) <= n else s[:n] + "…(truncated)"


# ---------------------------------------------------------------- Claude (native tool use)
def _to_claude(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for m in messages:
        role = m.get("role")
        if role == "user":
            out.append({"role": "user", "content": str(m.get("content", ""))})
        elif role == "assistant":
            blocks: list[dict[str, Any]] = []
            if m.get("content"):
                blocks.append({"type": "text", "text": str(m["content"])})
            for c in m.get("tool_calls") or []:
                blocks.append({"type": "tool_use", "id": c["id"], "name": c["name"], "input": c.get("args") or {}})
            out.append({"role": "assistant", "content": blocks or [{"type": "text", "text": "…"}]})
        elif role == "tool":
            block = {"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": _clip(m.get("content", ""))}
            # consecutive tool results go in one user turn
            if out and out[-1]["role"] == "user" and isinstance(out[-1]["content"], list):
                out[-1]["content"].append(block)
            else:
                out.append({"role": "user", "content": [block]})
    return out


def _claude(messages: list[dict[str, Any]], tools: list[dict[str, Any]], client: Any = None) -> dict[str, Any]:
    try:
        import anthropic
    except ImportError as e:  # pragma: no cover
        raise AssistantUnavailable({"status": "sdk_missing", "message": "pip install anthropic"}) from e
    if client is None:
        key = env("ANTHROPIC_API_KEY")
        client = anthropic.Anthropic(api_key=key) if key else anthropic.Anthropic()
    try:
        msg = client.messages.create(
            model=MODEL, max_tokens=MAX_TOKENS * 3, system=SYSTEM,
            tools=[{"name": t["name"], "description": t.get("description", ""), "input_schema": t.get("parameters") or {"type": "object", "properties": {}}} for t in tools],
            messages=_to_claude(messages),
        )
    except anthropic.APIStatusError as e:
        raise AssistantUnavailable({"status": "api_error", "message": f"Claude API error {e.status_code}"}) from e
    except anthropic.APIConnectionError as e:
        raise AssistantUnavailable({"status": "api_unreachable", "message": "Claude API unreachable"}) from e
    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text").strip()
    calls = [{"id": b.id, "name": b.name, "args": b.input or {}} for b in msg.content if getattr(b, "type", None) == "tool_use"]
    return {"type": "tool_calls" if calls else "final", "calls": calls, "text": text, "provider": "claude", "model": msg.model}


# ---------------------------------------------------------------- OpenAI-compatible (Groq, OpenRouter, Ollama...)
def _to_openai(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM}]
    for m in messages:
        role = m.get("role")
        if role == "user":
            out.append({"role": "user", "content": str(m.get("content", ""))})
        elif role == "assistant":
            o: dict[str, Any] = {"role": "assistant", "content": m.get("content") or ""}
            if m.get("tool_calls"):
                o["tool_calls"] = [{"id": c["id"], "type": "function",
                                    "function": {"name": c["name"], "arguments": json.dumps(c.get("args") or {}, ensure_ascii=False)}}
                                   for c in m["tool_calls"]]
            out.append(o)
        elif role == "tool":
            out.append({"role": "tool", "tool_call_id": m["tool_call_id"], "content": _clip(m.get("content", ""))})
    return out


def _args(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    try:
        v = json.loads(raw or "{}")
        return v if isinstance(v, dict) else {}
    except (TypeError, ValueError):
        return {}


def _openai(messages: list[dict[str, Any]], tools: list[dict[str, Any]], cfg: dict[str, str], http: Any = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if cfg.get("key"):
        headers["Authorization"] = "Bearer " + cfg["key"]
    payload = {"model": cfg["model"], "temperature": 0.2, "max_tokens": MAX_TOKENS, "messages": _to_openai(messages),
               "tools": [{"type": "function", "function": {"name": t["name"], "description": t.get("description", ""),
                                                           "parameters": t.get("parameters") or {"type": "object", "properties": {}}}} for t in tools],
               "tool_choice": "auto"}
    http = http or httpx
    try:
        r = http.post(cfg["base_url"] + "/chat/completions", json=payload, headers=headers, timeout=120)
    except httpx.HTTPError as e:
        raise AssistantUnavailable({"status": "api_unreachable", "message": f"{cfg['provider']} unreachable"}) from e
    if r.status_code != 200:
        raise AssistantUnavailable({"status": "api_error", "message": f"{cfg['provider']} error {r.status_code}"})
    try:
        msg = r.json()["choices"][0]["message"]
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise AssistantUnavailable({"status": "api_error", "message": f"{cfg['provider']}: unexpected answer"}) from e
    text = (msg.get("content") or "").strip()
    if "</think>" in text:
        text = text.split("</think>", 1)[1].strip()
    calls = [{"id": c.get("id") or f"c{i}", "name": c["function"]["name"], "args": _args(c["function"].get("arguments"))}
             for i, c in enumerate(msg.get("tool_calls") or []) if c.get("function", {}).get("name")]
    return {"type": "tool_calls" if calls else "final", "calls": calls, "text": text, "provider": cfg["provider"], "model": cfg["model"]}


def step(messages: list[dict[str, Any]], tools: list[dict[str, Any]], client: Any = None, http: Any = None) -> dict[str, Any]:
    """Next move of the agent, from the first provider that answers. Raises AssistantUnavailable when none does."""
    errors: list[dict[str, Any]] = []
    if client is not None or anthropic_configured():
        try:
            return _claude(messages, tools, client)
        except AssistantUnavailable as e:
            errors.append({"provider": "claude", **e.detail})
    cfg = openai_config()
    if cfg:
        try:
            return _openai(messages, tools, cfg, http)
        except AssistantUnavailable as e:
            errors.append({"provider": cfg["provider"], **e.detail})
    if not cfg or cfg["provider"] != "ollama":
        local = ollama_model()
        if local:
            try:
                return _openai(messages, tools, {"provider": "ollama-local", "base_url": OLLAMA_URL + "/v1", "key": "", "model": local}, http)
            except AssistantUnavailable as e:
                errors.append({"provider": "ollama-local", **e.detail})
    if errors:
        raise AssistantUnavailable({"status": errors[-1]["status"], "message": "; ".join(x["message"] for x in errors), "tried": errors})
    raise AssistantUnavailable({"status": "no_api_key", "message": "No language model configured (see the AI Lab section of the README)."})
