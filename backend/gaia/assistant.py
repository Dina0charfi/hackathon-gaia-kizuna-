"""AI Lab assistant: a real language model, grounded in the evidence the page retrieved.

The browser sends the question, the last turns of the conversation, the parcel profile (Land DNA values with
their source and confidence), the engine verdicts and the knowledge records it retrieved. The model answers from
that evidence first; when the records do not cover the question it may use general agronomy knowledge, but must
say so. The page still checks every number against the evidence and marks the ones it cannot find.

Providers, tried in this order (the first one that is configured and answers wins):

  1. Claude          ANTHROPIC_API_KEY                      (paid key; GAIA_LLM_MODEL, default claude-opus-5-5)
  2. OpenAI-compatible endpoint, free options included:
       GAIA_LLM_PROVIDER = groq | huggingface | openrouter | ollama | custom
       GAIA_LLM_API_KEY  = the provider's key (Groq and Hugging Face give free keys; Ollama needs none)
       GAIA_LLM_BASE_URL = only for "custom" (any /v1/chat/completions server: LM Studio, vLLM, llama.cpp…)
       GAIA_LLM_OPENAI_MODEL = override the provider's default model
  3. Ollama on this machine (http://127.0.0.1:11434), found automatically: free, no key, works offline.

Every variable can also go in backend/.env (git-ignored). Never commit a key.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import httpx

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def env(name: str, default: str = "") -> str:
    """Environment variable, else backend/.env, else default."""
    v = os.environ.get(name, "").strip()
    if v:
        return v
    try:
        for line in ENV_FILE.read_text(encoding="utf-8-sig").splitlines():
            k, _, val = line.partition("=")
            if k.strip() == name and not line.lstrip().startswith("#"):
                val = val.strip().strip("\"'")
                if val and "colle-ta-cle" not in val:
                    return val
    except OSError:
        pass
    return default


MODEL = env("GAIA_LLM_MODEL", "claude-opus-5-5")

# OpenAI-compatible presets. Default models are small, multilingual (French, Arabic) and free on each service.
PRESETS: dict[str, dict[str, str]] = {
    "groq": {"base_url": "https://api.groq.com/openai/v1", "model": "llama-3.3-70b-versatile"},
    "huggingface": {"base_url": "https://router.huggingface.co/v1", "model": "Qwen/Qwen2.5-72B-Instruct"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "model": "meta-llama/llama-3.3-70b-instruct:free"},
    "ollama": {"base_url": "http://127.0.0.1:11434/v1", "model": "qwen2.5:3b"},
    "custom": {"base_url": "", "model": ""},
}
OLLAMA_URL = "http://127.0.0.1:11434"
# Local models that answer well in French and Arabic, best first. Any installed model is used if none of these is.
OLLAMA_PREFERRED = ("qwen2.5", "qwen3", "llama3.2", "llama3.1", "gemma3", "gemma2", "mistral", "phi4", "aya")

SYSTEM = """You are GAIA, the AI Lab assistant for small farms in Tunisia (water, solar energy and agriculture, \
with Tunisian and Japanese practices). You talk with a farmer about their own plot.

How to answer:
- Use the evidence in the user message first: the parcel profile (each value has its source and confidence), the \
compatibility verdicts, the knowledge records, and GAIA's rule-based answer. Name the records you rely on.
- If the evidence does not cover the question, you may answer from general agronomy knowledge, but start that part \
with "General knowledge (not from GAIA's records):" in the answer's language, stay cautious, and say what data or \
record would make the answer specific to this plot.
- Never invent a number about this plot (rain, slope, soil, area, water, costs, yields). Any figure about the plot \
must come from the evidence. Do not invent prices, laws, subsidies or sources.
- Say when a value is low confidence (a regional soil estimate, a demonstration value) or when a record is a draft \
with provisional thresholds.
- Use the conversation so far to understand follow-up questions.
- Answer in the language given in "lang" (fr = French, ar = Arabic, en = English, ja = Japanese), in plain words a \
farmer understands, in at most 170 words: short paragraphs or a short "- " list. No headings, no tables."""


class AssistantUnavailable(Exception):
    def __init__(self, detail: dict[str, Any]):
        super().__init__(detail.get("message", "assistant unavailable"))
        self.detail = detail


# ---------------------------------------------------------------- evidence
def _compact_record(r: dict[str, Any]) -> dict[str, Any]:
    keep = ["id", "origin", "name", "name_ar", "jp", "families", "summary", "description", "conditions", "materials",
            "cost", "actors", "regulation", "risks", "adaptations", "actions", "sources", "dimNotes", "review"]
    return {k: r[k] for k in keep if k in r}


def _history(body: dict[str, Any]) -> list[dict[str, str]]:
    out = []
    for h in (body.get("history") or [])[-4:]:
        q, a = str(h.get("q", "")).strip()[:600], str(h.get("a", "")).strip()[:900]
        if q and a:
            out.append({"q": q, "a": a})
    return out


def build_prompt(body: dict[str, Any]) -> str:
    evidence = {
        "lang": body.get("lang") or "fr",
        "parcel_profile": body.get("profile") or {},
        "verdicts": body.get("verdicts") or [],
        "gaia_rule_based_answer": body.get("answer") or {},
        "records": [_compact_record(r) for r in (body.get("records") or [])],
    }
    hist = _history(body)
    conv = ("<conversation_so_far>\n" + json.dumps(hist, ensure_ascii=False, indent=1) + "\n</conversation_so_far>\n\n") if hist else ""
    return ("<evidence>\n" + json.dumps(evidence, ensure_ascii=False, indent=1) + "\n</evidence>\n\n" + conv +
            "<question>\n" + str(body.get("question", "")).strip()[:2000] + "\n</question>")


# ---------------------------------------------------------------- providers
_ollama_cache: dict[str, Any] = {"t": 0.0, "model": None}


def ollama_model() -> str | None:
    """Name of a local Ollama model, or None when Ollama is not running. Cached for 60 s."""
    if time.time() - _ollama_cache["t"] < 60:
        return _ollama_cache["model"]
    model = None
    try:
        r = httpx.get(OLLAMA_URL + "/api/tags", timeout=0.8)
        names = [m.get("name", "") for m in r.json().get("models", [])] if r.status_code == 200 else []
        names = [n for n in names if n and "embed" not in n]
        for pref in OLLAMA_PREFERRED:
            hit = next((n for n in names if n.startswith(pref)), None)
            if hit:
                model = hit
                break
        model = model or (names[0] if names else None)
    except (httpx.HTTPError, ValueError):
        model = None
    _ollama_cache.update(t=time.time(), model=model)
    return model


def openai_config() -> dict[str, str] | None:
    """The configured OpenAI-compatible provider, or None."""
    name = env("GAIA_LLM_PROVIDER").lower()
    if not name:
        return None
    p = PRESETS.get(name, PRESETS["custom"])
    base = env("GAIA_LLM_BASE_URL", p["base_url"]).rstrip("/")
    key = env("GAIA_LLM_API_KEY")
    model = env("GAIA_LLM_OPENAI_MODEL", p["model"])
    if name == "ollama" and not env("GAIA_LLM_OPENAI_MODEL"):
        model = ollama_model() or model
    if not base or not model or (name not in ("ollama", "custom") and not key):
        return None
    return {"provider": name, "base_url": base, "key": key, "model": model}


def model_options(model: str) -> dict[str, Any]:
    """gpt-oss models think before answering; short thinking, or the answer can run out of tokens and come back empty."""
    return {"reasoning_effort": "low"} if "gpt-oss" in model else {}


# Groq counts its free limits per model: when one is busy (429), too small for the request (413) or withdrawn (404),
# the next one is tried. GAIA_LLM_FALLBACK_MODELS = "a,b" replaces this list for any provider; "none" turns it off.
FALLBACK_MODELS = {"groq": ("openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b")}
RETRY_HTTP = (404, 413, 429, 500, 502, 503)
MAX_MODELS = 3


def with_fallback(cfg: dict[str, str], ask: Any) -> dict[str, Any]:
    """Call ask(cfg) with the configured model, then with the fallback models when the model itself is the problem."""
    raw = env("GAIA_LLM_FALLBACK_MODELS")
    extra = () if raw.lower() == "none" else tuple(x.strip() for x in raw.split(",") if x.strip()) or FALLBACK_MODELS.get(cfg["provider"], ())
    models = [cfg["model"]] + [m for m in extra if m != cfg["model"]]
    last: AssistantUnavailable | None = None
    for m in models[:MAX_MODELS]:
        try:
            return ask({**cfg, "model": m})
        except AssistantUnavailable as e:
            last = e
            if e.detail.get("http") not in RETRY_HTTP:   # wrong key, unreachable...: another model would not help
                break
    assert last is not None
    raise last


def anthropic_configured() -> bool:
    return bool(env("ANTHROPIC_API_KEY") or env("ANTHROPIC_AUTH_TOKEN") or env("ANTHROPIC_PROFILE"))


def available() -> list[str]:
    """Providers that are configured right now, in the order they are tried."""
    out = []
    if anthropic_configured():
        out.append("claude")
    cfg = openai_config()
    if cfg:
        out.append(cfg["provider"])
    if (not cfg or cfg["provider"] != "ollama") and ollama_model():
        out.append("ollama-local")
    return out


def _claude(body: dict[str, Any], client: Any = None) -> dict[str, Any]:
    try:
        import anthropic
    except ImportError as e:  # pragma: no cover - depends on the install
        raise AssistantUnavailable({"status": "sdk_missing", "message": "pip install anthropic"}) from e
    if client is None:
        key = env("ANTHROPIC_API_KEY")
        client = anthropic.Anthropic(api_key=key) if key else anthropic.Anthropic()
    try:
        msg = client.beta.messages.create(
            model=MODEL,
            max_tokens=4000,
            system=SYSTEM,
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[{"role": "user", "content": build_prompt(body)}],
        )
    except anthropic.APIStatusError as e:
        raise AssistantUnavailable({"status": "api_error", "message": f"Claude API error {e.status_code}"}) from e
    except anthropic.APIConnectionError as e:
        raise AssistantUnavailable({"status": "api_unreachable", "message": "Claude API unreachable"}) from e
    if msg.stop_reason == "refusal":
        return {"text": "", "status": "refusal", "model": msg.model, "provider": "claude"}
    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text").strip()
    return {"text": text, "status": "ok", "model": msg.model, "provider": "claude"}


def _openai(body: dict[str, Any], cfg: dict[str, str], http: Any = None) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if cfg.get("key"):
        headers["Authorization"] = "Bearer " + cfg["key"]
    payload = {"model": cfg["model"], **model_options(cfg["model"]), "temperature": 0.3, "max_tokens": 700,
               "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": build_prompt(body)}]}
    http = http or httpx
    try:
        r = http.post(cfg["base_url"] + "/chat/completions", json=payload, headers=headers, timeout=120)
    except httpx.HTTPError as e:
        raise AssistantUnavailable({"status": "api_unreachable", "message": f"{cfg['provider']} unreachable"}) from e
    if r.status_code != 200:
        raise AssistantUnavailable({"status": "api_error", "message": f"{cfg['provider']} error {r.status_code}", "http": r.status_code})
    try:
        text = (r.json()["choices"][0]["message"]["content"] or "").strip()
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise AssistantUnavailable({"status": "api_error", "message": f"{cfg['provider']}: unexpected answer"}) from e
    if "</think>" in text:  # reasoning models (Qwen3, DeepSeek-R1) put their thoughts first
        text = text.split("</think>", 1)[1].strip()
    if not text:
        raise AssistantUnavailable({"status": "api_error", "message": f"{cfg['provider']}: empty answer", "http": 502})
    return {"text": text, "status": "ok", "model": cfg["model"], "provider": cfg["provider"]}


def answer(body: dict[str, Any], client: Any = None, http: Any = None) -> dict[str, Any]:
    """Ask the first provider that is configured and answers. Raises AssistantUnavailable when none does."""
    errors: list[dict[str, Any]] = []
    if client is not None or anthropic_configured():
        try:
            return _claude(body, client)
        except AssistantUnavailable as e:
            errors.append({"provider": "claude", **e.detail})
    cfg = openai_config()
    if cfg:
        try:
            return with_fallback(cfg, lambda c: _openai(body, c, http))
        except AssistantUnavailable as e:
            errors.append({"provider": cfg["provider"], **e.detail})
    if not cfg or cfg["provider"] != "ollama":
        local = ollama_model()
        if local:
            try:
                return _openai(body, {"provider": "ollama-local", "base_url": OLLAMA_URL + "/v1", "key": "", "model": local}, http)
            except AssistantUnavailable as e:
                errors.append({"provider": "ollama-local", **e.detail})
    if errors:
        raise AssistantUnavailable({"status": errors[-1]["status"], "message": "; ".join(x["message"] for x in errors), "tried": errors})
    raise AssistantUnavailable({"status": "no_api_key", "message": (
        "No language model configured. Free options: install Ollama (ollama pull qwen2.5:3b), or set "
        "GAIA_LLM_PROVIDER=groq with a free GAIA_LLM_API_KEY from console.groq.com. Paid: ANTHROPIC_API_KEY.")})
