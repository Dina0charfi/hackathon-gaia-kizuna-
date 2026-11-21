"""AI Lab wording with Claude, grounded in the evidence the page retrieved.

The browser sends the question, the parcel profile (Land DNA values with their
source and confidence), the engine verdicts and the knowledge records it
retrieved. Claude only rephrases and connects that evidence; it is told to say
it is not sure when the evidence does not cover the question. The page still
blocks any number that is not in the evidence it sent.

Configuration (never commit a key):
  ANTHROPIC_API_KEY   required to enable the assistant (or any credential the SDK resolves)
  GAIA_LLM_MODEL      optional, default claude-opus-5-5
"""
from __future__ import annotations

import json
import os
from typing import Any

MODEL = os.environ.get("GAIA_LLM_MODEL", "claude-opus-5-5")

SYSTEM = """You are the GAIA AI Lab, an assistant for small farms in Tunisia (water, solar energy and agriculture, \
with Tunisian and Japanese practices). Answer the farmer's question using ONLY the evidence in the user message: \
the parcel profile (each value has its source and confidence), the compatibility verdicts, the knowledge records, \
and GAIA's rule-based answer.

Rules:
- Never invent a number, a price, a threshold, a law or a source. Every number you write must appear in the evidence.
- If the evidence does not cover the question, say plainly that GAIA's records do not cover it, and say which \
information or record would be needed. Do not answer from general knowledge.
- Say when a value is low confidence (for example a regional soil estimate or a demonstration value) or when a \
record is a draft with provisional thresholds.
- Name the records you rely on by their name.
- Answer in the language given in "lang" (fr = French, ar = Arabic, en = English), in plain words a farmer \
understands, in at most 150 words, as short paragraphs or a short list. No headings."""


class AssistantUnavailable(Exception):
    def __init__(self, detail: dict[str, Any]):
        super().__init__(detail.get("message", "assistant unavailable"))
        self.detail = detail


def _compact_record(r: dict[str, Any]) -> dict[str, Any]:
    keep = ["id", "origin", "name", "name_ar", "jp", "families", "summary", "description", "conditions", "materials",
            "cost", "actors", "regulation", "risks", "adaptations", "actions", "sources", "dimNotes", "review"]
    return {k: r[k] for k in keep if k in r}


def build_prompt(body: dict[str, Any]) -> str:
    evidence = {
        "lang": body.get("lang") or "fr",
        "parcel_profile": body.get("profile") or {},
        "verdicts": body.get("verdicts") or [],
        "gaia_rule_based_answer": body.get("answer") or {},
        "records": [_compact_record(r) for r in (body.get("records") or [])],
    }
    return ("<evidence>\n" + json.dumps(evidence, ensure_ascii=False, indent=1) + "\n</evidence>\n\n"
            "<question>\n" + str(body.get("question", "")).strip()[:2000] + "\n</question>")


def answer(body: dict[str, Any], client: Any = None) -> dict[str, Any]:
    try:
        import anthropic
    except ImportError as e:  # pragma: no cover - depends on the install
        raise AssistantUnavailable({"status": "sdk_missing", "message": "pip install anthropic"}) from e
    if client is None:
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.environ.get("ANTHROPIC_PROFILE")):
            raise AssistantUnavailable({"status": "no_api_key", "message": "Set ANTHROPIC_API_KEY on the server to enable the assistant."})
        client = anthropic.Anthropic()
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
        return {"text": "", "status": "refusal", "model": msg.model}
    text = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text").strip()
    return {"text": text, "status": "ok", "model": msg.model}
