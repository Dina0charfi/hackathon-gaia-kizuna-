"""Smart GAIA agent on a FREE hosted language model (Google Gemini API or Groq free tier).

Both services speak the OpenAI "chat completions" format with function calling, so one engine
covers both. The model reads the farmer's question, chooses which GAIA tools to call (soil forecast,
optimal plan, what-if simulation, solar forecast), the tools run on this server, and the model
writes the answer from their results, in the farmer's language.

Configuration, in backend/.env (never committed) or as environment variables:
  GAIA_LLM_PROVIDER   gemini | groq            (default gemini)
  GAIA_LLM_API_KEY    the free key: https://aistudio.google.com/apikey (Gemini) or https://console.groq.com/keys (Groq)
  GAIA_FREE_MODEL     optional model override (default gemini-3.5-flash / openai/gpt-oss-120b); when it is overloaded
                      or slow, GAIA_FREE_BACKUP_MODEL takes over (default gemini-3.1-flash-lite / openai/gpt-oss-20b)
  GAIA_LLM_BASE_URL   optional, any other OpenAI-compatible service

Free tiers have per-minute and per-day limits; when one is reached the page asks to try again a minute later.
Gemini's free tier uses prompts to improve Google products: the agent only sends the parcel's
coordinates, crop settings, the question and GAIA's tool results (no name, no account data).
"""
from __future__ import annotations

import json
import os
from typing import Any

from . import irrigation_agent as agent

PROVIDERS = {
    # measured on the free tier (21/11/2026): gemini-3.5-flash ~6 s per step, gemini-3.1-flash-lite ~1.5 s;
    # gemini-3.8-flash answered correctly but took ~70 s, too slow for a farmer waiting
    "gemini": dict(base_url="https://generativelanguage.googleapis.com/v1beta/openai", model="gemini-3.5-flash",
                   backup="gemini-3.1-flash-lite", name="Google Gemini"),
    "groq": dict(base_url="https://api.groq.com/openai/v1", model="openai/gpt-oss-120b", backup="openai/gpt-oss-20b", name="Groq"),
}


def config() -> dict[str, Any] | None:
    key = os.environ.get("GAIA_LLM_API_KEY")
    if not key:
        return None
    p = PROVIDERS.get((os.environ.get("GAIA_LLM_PROVIDER") or "gemini").lower(), PROVIDERS["gemini"])
    return dict(key=key, base_url=(os.environ.get("GAIA_LLM_BASE_URL") or p["base_url"]).rstrip("/"),
                model=os.environ.get("GAIA_FREE_MODEL") or p["model"], backup=os.environ.get("GAIA_FREE_BACKUP_MODEL") or p["backup"],
                name=p["name"])


def _schema(s: dict[str, Any]) -> dict[str, Any]:
    """JSON schema without the keywords some OpenAI-compatible services reject."""
    out = {k: v for k, v in s.items() if k not in ("additionalProperties", "minItems", "maxItems")}
    if "properties" in out:
        out["properties"] = {k: _schema(v) for k, v in out["properties"].items()}
    if "items" in out:
        out["items"] = _schema(out["items"])
    return out


TOOLS = [{"type": "function", "function": {"name": t["name"], "description": t["description"], "parameters": _schema(t["input_schema"])}}
         for t in agent.TOOLS]


async def answer(body: dict[str, Any], post=None) -> dict[str, Any]:
    """post(url, headers, json) -> (status, json); injectable for tests."""
    cfg = config()
    if cfg is None:
        raise agent.AgentUnavailable({"status": "no_free_key", "message": "Add the free Gemini key (GAIA_LLM_API_KEY) in backend/.env, then restart the backend."})
    if post is None:
        import httpx

        async def post(url, headers, payload):
            try:
                async with httpx.AsyncClient(timeout=45) as c:
                    r = await c.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                return 504, {"error": "timeout"}
            try:
                return r.status_code, r.json()
            except ValueError:
                return r.status_code, {"error": r.text[:200]}

    parcel, lang = body["parcel"], body.get("lang") or "fr"
    messages: list[dict[str, Any]] = [{"role": "system", "content": agent.SYSTEM}] + agent.first_messages(body)
    steps: list[dict[str, Any]] = []
    url = f"{cfg['base_url']}/chat/completions"
    headers = {"Authorization": f"Bearer {cfg['key']}", "Content-Type": "application/json"}

    model = cfg["model"]
    for _ in range(agent.MAX_TURNS):
        status, j = await post(url, headers, {"model": model, "messages": messages, "tools": TOOLS, "tool_choice": "auto", "temperature": 0.2})
        if status == 429 and model == cfg["model"]:
            import asyncio
            await asyncio.sleep(12)                            # free per-minute quota: wait once, then retry the main model
            status, j = await post(url, headers, {"model": model, "messages": messages, "tools": TOOLS, "tool_choice": "auto", "temperature": 0.2})
        if status in (429, 500, 502, 503, 504) and cfg["backup"] and model != cfg["backup"]:
            model = cfg["backup"]          # quota, overload or too slow: the lighter free model (its own quota) continues
            status, j = await post(url, headers, {"model": model, "messages": messages, "tools": TOOLS, "tool_choice": "auto", "temperature": 0.2})
        if status == 429:
            raise agent.AgentUnavailable({"status": "free_quota", "message": f"{cfg['name']}: free quota reached for the moment, try again in a minute."})
        if status in (401, 403):
            raise agent.AgentUnavailable({"status": "bad_key", "message": f"{cfg['name']} refused the key (error {status}): check GAIA_LLM_API_KEY in backend/.env."})
        if status != 200 or not j.get("choices"):
            err = j.get("error") if isinstance(j, dict) else None
            msg = err.get("message") if isinstance(err, dict) else err
            raise agent.AgentUnavailable({"status": "free_llm_error", "message": f"{cfg['name']} error {status}: {str(msg)[:160]}"})
        m = j["choices"][0]["message"]
        calls = m.get("tool_calls") or []
        if not calls:
            return {"text": (m.get("content") or "").strip(), "status": "ok", "steps": steps, "model": model,
                    "engine": "free_llm", "provider": cfg["name"]}
        messages.append({"role": "assistant", "content": m.get("content") or "", "tool_calls": calls})
        for c in calls:
            fn = c.get("function", {})
            name, raw = fn.get("name", ""), fn.get("arguments") or "{}"
            try:
                inp = json.loads(raw) if isinstance(raw, str) else dict(raw)
            except ValueError:
                inp = {}
            try:
                out = await agent.run_tool(name, inp, parcel)
                content = json.dumps(out, ensure_ascii=False)
            except Exception as e:  # reported to the model, which can explain it
                out = {"error": f"{type(e).__name__}: {e}"}
                content = out["error"]
            steps.append({"tool": name, "input": inp, "summary": agent._summary(name, inp, out, lang)})
            messages.append({"role": "tool", "tool_call_id": c.get("id", name), "content": content})
    return {"text": "", "status": "max_turns", "steps": steps, "model": model, "engine": "free_llm", "provider": cfg["name"]}
