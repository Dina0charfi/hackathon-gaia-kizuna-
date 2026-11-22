"""GAIA irrigation agent: Claude with tools on the trained models and the optimal planner.

The farmer asks a question in plain words ("can I skip watering until Friday?", "what if I water
10 mm tomorrow?", "when should I run the pump this week?"). Claude decides which tools to call,
runs them on this server (soil forecast, optimal plan, what-if simulation, solar forecast) and
answers only from their results. Every tool call is returned as a step so the page can show
what the agent did.

Engines (GAIA_AGENT_ENGINE = auto | claude | free_llm, default auto):
  free_llm  FREE hosted language model, Google Gemini or Groq free tier (gaia/agent_llm.py): GAIA_LLM_API_KEY in backend/.env
  claude    Claude API, paid, used instead when ANTHROPIC_API_KEY is set (never commit a key);
            GAIA_LLM_MODEL (default claude-opus-5-5)
The farmer can ask follow-up questions: the page sends the previous turns (history) and the model remembers them.
"""
from __future__ import annotations

import json
import os
from typing import Any

import uuid
from contextvars import ContextVar
from datetime import date, timedelta

from . import farm_state, irrigation, planner

PROPOSALS: ContextVar[list] = ContextVar("gaia_proposals", default=None)   # actions proposed during one answer

MODEL = os.environ.get("GAIA_LLM_MODEL", "claude-opus-5-5")
ENGINE = os.environ.get("GAIA_AGENT_ENGINE", "auto")
MAX_TURNS = 8

SYSTEM = """You are GAIA's irrigation agent for a small farm in Tunisia. You plan irrigation and solar pumping \
for ONE parcel, whose settings are given in <parcel>. You have tools that run GAIA's trained models and its \
optimal planner on live ECMWF IFS data:
- get_soil_forecast: root-zone soil reserve today and for the next 7 days if nobody irrigates, with rain and ET0.
- optimize_irrigation_plan: the least water (mode "water") or the least non-solar energy (mode "solar") that keeps \
the crop out of water stress for 8 days, with the pumping hours.
- simulate_irrigation_schedule: what happens to the soil reserve with a schedule the farmer proposes (what-if).
- get_solar_forecast: sunshine per day and the best pumping hours.
- get_farm_record: the saved irrigation calendar, the irrigations reported, the settings, the morning check, the alerts.
Action tools (they only PROPOSE; a "Confirm" button appears on the page and nothing changes until the farmer presses it):
- propose_save_plan: save the plan in the farm's irrigation calendar.
- propose_log_irrigation: record an irrigation the farmer reports ("I watered 8 mm this morning").
- propose_update_settings: change pump flow, pumping head, solar power, area, Kc or crop when the farmer gives them.
- propose_monitoring: turn on/off the automatic morning check and its alerts.

Rules:
- Call the tools you need before answering; never invent a number. Every number you give must come from a tool result.
- When the farmer reports an irrigation or gives a setting, propose the matching action, then answer with the updated numbers
  only after it is confirmed (say the numbers will update once they press Confirm). When they agree with a plan or ask to
  keep it, propose_save_plan. Never say an action is done: say it is waiting for their confirmation.
- For every new question, including follow-ups, call the tools again: never reuse a number from an earlier answer
  without checking it with a tool, and correct an earlier answer if the tools disagree with it.
- Never compute a value the tools did not give (pumping hours, flow, energy, cost). If a result says a value is unknown
  or null, say it is unknown and which setting the farmer must enter on the page (pump flow, pumping head, solar power).
- For "what if" questions, simulate the farmer's schedule, and compare it with the optimal plan when useful.
- Say plainly that the soil state comes from a model analysis (ECMWF IFS, not a field sensor) and does not know about irrigation the \
farmer did not report; ask how much they irrigated recently if it matters, or pass irrigated_mm when they say it.
- Crop thresholds (rooting depth, depletion fraction) are FAO-56 table values to be checked; say so when they drive \
the answer.
- This is a conversation: use the previous turns to understand follow-up questions ("and on Thursday?", "why?").
- Answer in the language given in <lang> (fr = French, ar = Arabic, en = English, ja = Japanese), in plain words a \
farmer understands, at most 150 words: the decision first (how much, which day, which hours), then why. Plain text only: no headings, no markdown (no ** or #), short paragraphs; reserves as percentages (53 %), not fractions."""

TOOLS = [
    {
        "name": "get_soil_forecast",
        "description": "Root-zone (7-28 cm) soil reserve of the parcel: yesterday's state from ECMWF IFS, today's estimate and "
                       "the next 7 days predicted by GAIA's trained LightGBM models if nobody irrigates, with forecast rain and ET0. "
                       "Reserve 0 = as dry as the driest days since 2020 near the parcel, 1 = as wet as the wettest.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "optimize_irrigation_plan",
        "description": "Optimal irrigation for today and the next 7 days (model predictive control on the FAO-56 root-zone water "
                       "balance, crop Kc, learned effective rain). Returns net mm and m³ per day, the soil reserve with and without "
                       "the plan, pumping hours, solar and other energy, and the water saved against replacing the crop's use every "
                       "day (the monthly quota method). Use mode 'solar' to pump on sunny days and store water in the soil.",
        "input_schema": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["water", "solar"], "description": "water = least water; solar = least non-solar energy"},
                "irrigated_mm": {"type": "number", "description": "net mm the farmer irrigated since yesterday (0 if none or unknown)"},
                "kc": {"type": "number", "description": "crop coefficient, only if the farmer gives another value"},
            },
            "required": ["mode"],
            "additionalProperties": False,
        },
    },
    {
        "name": "simulate_irrigation_schedule",
        "description": "What-if: simulate the soil reserve for today and the next 7 days with an irrigation schedule the farmer "
                       "proposes (net mm reaching the root zone each day, index 0 = today). Returns days of crop water stress, "
                       "water drained away, m³ and energy.",
        "input_schema": {
            "type": "object",
            "properties": {
                "irrigation_net_mm": {"type": "array", "items": {"type": "number"}, "minItems": 1, "maxItems": 8,
                                      "description": "net mm per day, today first"},
                "irrigated_mm": {"type": "number", "description": "net mm the farmer irrigated since yesterday"},
            },
            "required": ["irrigation_net_mm"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_solar_forecast",
        "description": "Solar radiation forecast for the parcel: kWh/m² per day for the next 8 days and the 4 sunniest hours of each day.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "get_farm_record",
        "description": "What is saved for this parcel: the irrigation calendar the farmer confirmed, the irrigations they reported, "
                       "the saved settings, whether the morning check is on, and the latest alerts.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    # ---- action tools: they only PROPOSE; the farmer confirms on the page, then the action is applied
    {
        "name": "propose_save_plan",
        "description": "ACTION (needs the farmer's confirmation): save the optimal irrigation plan of the next 8 days in the farm's "
                       "irrigation calendar (dashboard). Use it when the farmer wants to keep or follow the plan.",
        "input_schema": {"type": "object", "properties": {
            "mode": {"type": "string", "enum": ["water", "solar"], "description": "water = least water; solar = sun first"}},
            "required": ["mode"], "additionalProperties": False},
    },
    {
        "name": "propose_log_irrigation",
        "description": "ACTION (needs confirmation): record an irrigation the farmer says they did (net mm reaching the roots). "
                       "Plans then take it into account. Use it whenever the farmer reports watering.",
        "input_schema": {"type": "object", "properties": {
            "mm": {"type": "number", "description": "net mm applied"},
            "day": {"type": "string", "description": "'today', 'yesterday' or a date YYYY-MM-DD"}},
            "required": ["mm"], "additionalProperties": False},
    },
    {
        "name": "propose_update_settings",
        "description": "ACTION (needs confirmation): change the parcel settings the farmer gives (pump flow, pumping head, solar power, "
                       "area, crop coefficient Kc, crop). Only include the values the farmer stated.",
        "input_schema": {"type": "object", "properties": {
            "flow_m3h": {"type": "number", "description": "pump flow, m³/h"},
            "head_m": {"type": "number", "description": "pumping head, m"},
            "pv_kwp": {"type": "number", "description": "solar array driving the pump, kWp"},
            "area_ha": {"type": "number", "description": "irrigated area, ha"},
            "kc": {"type": "number", "description": "crop coefficient"},
            "crop": {"type": "string", "enum": ["olive", "palm", "citrus", "cereal", "veg", "other"]}},
            "additionalProperties": False},
    },
    {
        "name": "propose_monitoring",
        "description": "ACTION (needs confirmation): turn on or off the automatic morning check: every day at the chosen hour GAIA "
                       "re-plans the parcel on its own and leaves an alert saying whether and when to irrigate.",
        "input_schema": {"type": "object", "properties": {
            "enabled": {"type": "boolean"},
            "hour": {"type": "integer", "description": "hour of the check, 0-23 (default 7)"}},
            "required": ["enabled"], "additionalProperties": False},
    },
]


class AgentUnavailable(Exception):
    def __init__(self, detail: dict[str, Any]):
        super().__init__(detail.get("message", "agent unavailable"))
        self.detail = detail


def _num(v, lo, hi, default):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return min(hi, max(lo, x))


def _plan_args(parcel: dict[str, Any]) -> dict[str, Any]:
    keys = ["lat", "lon", "crop", "kc", "area_ha", "ea", "head_m", "pump_eff", "flow_m3h", "pv_kwp", "pr", "months", "quota_m3_month"]
    return {k: parcel[k] for k in keys if parcel.get(k) is not None}


def _brief_plan(p: dict[str, Any]) -> dict[str, Any]:
    """Keep what the model needs to answer; drop the hour-by-hour detail except the hours themselves."""
    days = [dict(date=d["date"], rain_mm=d["rain_mm"], etc_mm=d["etc_mm"], effective_rain_mm=d["effective_rain_mm"],
                 irrigation_net_mm=d["irrigation_net_mm"], irrigation_m3=d["irrigation_m3"],
                 reserve=d["reserve"], reserve_without=d["reserve_without"], drainage_mm=d["drainage_mm"],
                 pumping_hours=[h["hour"] for h in d["pumping"].get("hours", [])],
                 solar_share=d["pumping"].get("solar_share")) for d in p["days"]]
    missing = []
    if any(d["pumping"].get("note") == "pump flow unknown" for d in p["days"]):
        missing.append("pump flow (m³/h): pumping hours are unknown")
    if any(d["irrigation_m3"] for d in p["days"]) and p["totals"].get("solar_kwh") is None:
        missing.append("pumping head (m) or solar power (kWp): energy and solar share are unknown")
    return dict(mode=p["mode"], crop=p["crop"], kc=p["kc"], area_ha=p["area_ha"], per_ha=p["per_ha"], soil=p["soil"],
                totals=p["totals"], baseline=p["baseline"], days=days,
                unknown=missing or None)


async def run_tool(name: str, inp: dict[str, Any], parcel: dict[str, Any]) -> dict[str, Any]:
    lat, lon = parcel["lat"], parcel["lon"]
    if name == "get_soil_forecast":
        f = await irrigation.forecast(lat, lon)
        return dict(state=f["state"], reference_site=f["reference_site"]["nom"],
                    days=[{k: d[k] for k in ("date", "is_today", "rain_mm", "et0_mm", "reserve", "reserve_low", "reserve_high")} for d in f["days"]])
    if name == "optimize_irrigation_plan":
        args = _plan_args(parcel) | dict(mode="solar" if inp.get("mode") == "solar" else "water",
                                         irrigated_mm=_num(inp.get("irrigated_mm"), 0, 200, 0.0))
        if inp.get("kc") is not None:
            args["kc"] = _num(inp["kc"], 0.1, 1.5, args.get("kc", 0.65))
        return _brief_plan(await planner.plan(**args))
    if name == "simulate_irrigation_schedule":
        sched = [_num(x, 0, 100, 0.0) for x in (inp.get("irrigation_net_mm") or [])][:8]
        args = _plan_args(parcel) | dict(mode="water", irrigated_mm=_num(inp.get("irrigated_mm"), 0, 200, 0.0), plan_override=sched)
        return _brief_plan(await planner.plan(**args))
    if name == "get_solar_forecast":
        sun = await planner.solar_hours(lat, lon)
        return {"days": [dict(date=d, kwh_m2=round(sum(v) / 1000, 2), best_hours=sorted(sorted(range(len(v)), key=lambda h: -v[h])[:4]))
                         for d, v in sorted(sun.items())[:8]]}
    if name == "get_farm_record":
        st = farm_state.load(lat, lon)
        return dict(saved_plan=st["plan"], plan_saved_at=st.get("plan_saved_at"), irrigation_log=st["irrigation_log"][-10:],
                    settings=st["settings"], monitoring=st["monitoring"],
                    alerts=[dict(date=a["date"], level=a["level"], text=a["text"].get("en")) for a in st["alerts"][-5:]])
    if name.startswith("propose_"):
        out = _propose(name, inp, parcel)
        if name == "propose_save_plan":
            plan = await _propose_plan(inp, parcel)
            out["proposed"]["params"] = plan
            out["plan"] = plan
        return out
    raise ValueError(f"unknown tool {name}")


async def _propose_plan(inp: dict[str, Any], parcel: dict[str, Any]) -> dict[str, Any]:
    mode = "solar" if inp.get("mode") == "solar" else "water"
    p = await planner.plan(**(_plan_args(parcel) | dict(mode=mode)))
    days = [dict(date=d["date"], mm=d["irrigation_net_mm"], m3=d["irrigation_m3"],
                 hours=[h["hour"] for h in d["pumping"].get("hours", [])]) for d in p["days"] if d["irrigation_net_mm"] > 0]
    return dict(mode=mode, days=days, total_mm=p["totals"]["net_mm"], total_m3=p["totals"]["m3"])


def _day(v: Any) -> str:
    v = str(v or "today").strip().lower()
    if v in ("today", "aujourd'hui"):
        return date.today().isoformat()
    if v in ("yesterday", "hier"):
        return (date.today() - timedelta(days=1)).isoformat()
    date.fromisoformat(v)                                  # raises ValueError on a bad date
    return v


def _propose(name: str, inp: dict[str, Any], parcel: dict[str, Any]) -> dict[str, Any]:
    if name == "propose_log_irrigation":
        mm = _num(inp.get("mm"), 0, 200, 0.0)
        if mm <= 0:
            raise ValueError("mm must be > 0")
        action = dict(type="log_irrigation", params=dict(mm=mm, date=_day(inp.get("day"))))
    elif name == "propose_update_settings":
        lim = dict(flow_m3h=(0.1, 500), head_m=(1, 500), pv_kwp=(0.1, 500), area_ha=(0.01, 1000), kc=(0.1, 1.5))
        st = {k: _num(inp[k], *lim[k], None) for k in lim if inp.get(k) is not None}
        if inp.get("crop") in planner.CROPS:
            st["crop"] = inp["crop"]
        if not st:
            raise ValueError("no setting given")
        action = dict(type="update_settings", params=dict(settings=st))
    elif name == "propose_monitoring":
        action = dict(type="set_monitoring", params=dict(enabled=bool(inp.get("enabled", True)),
                                                         hour=int(_num(inp.get("hour"), 0, 23, 7))))
    elif name == "propose_save_plan":
        action = dict(type="save_plan", params=dict(mode="solar" if inp.get("mode") == "solar" else "water", pending=True))
    else:
        raise ValueError(f"unknown action {name}")
    action["id"] = uuid.uuid4().hex[:10]
    bag = PROPOSALS.get()
    if bag is not None:
        bag.append(action)
    return dict(proposed=action, status="waiting for the farmer's confirmation on the page (button Confirm); nothing is applied yet")


STEP_TXT = {
    "fr": dict(record="calendrier : {p} jour(s), {l} irrigation(s) notée(s), suivi du matin {m}", on="activé", off="désactivé",
               proposed="action proposée, en attente de votre confirmation", soil="réserve aujourd'hui {a}, dans 7 jours {b} sans irrigation", plan="{mm} mm nets, {m3} m³, {s} jour(s) de stress",
               solar=", solaire {p}", sun=" kWh/m²"),
    "en": dict(record="calendar: {p} day(s), {l} irrigation(s) logged, morning check {m}", on="on", off="off",
               proposed="action proposed, waiting for your confirmation", soil="reserve today {a}, in 7 days {b} without irrigation", plan="{mm} net mm, {m3} m³, {s} stress day(s)",
               solar=", solar {p}", sun=" kWh/m²"),
    "ar": dict(record="الرزنامة: {p} يوم، {l} ري مسجّل، المتابعة الصباحية {m}", on="مفعّلة", off="متوقفة",
               proposed="إجراء مقترح، في انتظار تأكيدك", soil="المخزون اليوم {a}، بعد 7 أيام {b} دون ري", plan="{mm} مم صافية، {m3} م³، {s} يوم إجهاد",
               solar="، شمسي {p}", sun=" ك.و.س/م²"),
    "ja": dict(record="カレンダー：{p}日、記録した灌漑{l}回、朝のチェック{m}", on="オン", off="オフ",
               proposed="提案された操作、確認待ち", soil="今日の蓄え{a}、灌漑なしで7日後{b}", plan="正味{mm} mm、{m3} m³、ストレス{s}日", solar="、太陽{p}", sun=" kWh/m²"),
}


def _summary(name: str, inp: dict[str, Any], out: dict[str, Any], lang: str = "en") -> str:
    """One line per step, for the page, in the page's language."""
    if "error" in out:
        return out["error"]
    L = STEP_TXT.get(lang, STEP_TXT["en"])
    pct = lambda x: f"{round(x * 100)} %"
    num = lambda v: (f"{v:g}".replace(".", ",") if lang == "fr" else f"{v:g}")
    if name == "get_soil_forecast":
        return L["soil"].format(a=pct(out["days"][0]["reserve"]), b=pct(out["days"][-1]["reserve"]))
    if name in ("optimize_irrigation_plan", "simulate_irrigation_schedule"):
        t = out["totals"]
        s = L["plan"].format(mm=num(round(t["net_mm"], 1)), m3=num(round(t["m3"])), s=t["stress_days"])
        return s + (L["solar"].format(p=pct(t["solar_share"])) if t.get("solar_share") is not None else "")
    if name == "get_farm_record":
        return L["record"].format(p=len(out["saved_plan"]), l=len(out["irrigation_log"]), m=L["on"] if out["monitoring"]["enabled"] else L["off"])
    if name.startswith("propose_"):
        return L["proposed"]
    if name == "get_solar_forecast":
        return ", ".join(f"{d['date'][8:10]}/{d['date'][5:7]} {num(d['kwh_m2'])}" for d in out["days"][:8]) + L["sun"]
    return ""


def has_claude_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.environ.get("ANTHROPIC_PROFILE"))


def first_messages(body: dict[str, Any]) -> list[dict[str, str]]:
    """The conversation so far (memory), then the new question with the parcel context."""
    context = {k: v for k, v in body["parcel"].items() if v is not None}
    history = [{"role": h["role"], "content": str(h["content"])[:4000]} for h in (body.get("history") or [])[-12:]
               if h.get("role") in ("user", "assistant") and h.get("content")]
    while history and history[0]["role"] != "user":          # a conversation must start with the farmer
        history.pop(0)
    return history + [{"role": "user", "content":
        f"<parcel>{json.dumps(context, ensure_ascii=False)}</parcel>\n<lang>{body.get('lang') or 'fr'}</lang>\n"
        f"<question>{str(body.get('question', '')).strip()[:2000]}</question>"}]


async def answer(body: dict[str, Any], client: Any = None) -> dict[str, Any]:
    """Claude when its (paid) key is set, otherwise the free hosted model (Gemini / Groq, GAIA_LLM_API_KEY).
    Actions the model proposes come back in "proposals"; the page applies them only after the farmer confirms."""
    bag: list = []
    token = PROPOSALS.set(bag)
    try:
        if client is not None or ENGINE == "claude" or (ENGINE == "auto" and has_claude_key()):
            out = await answer_claude(body, client)
        else:
            from . import agent_llm
            out = await agent_llm.answer(body)
    finally:
        PROPOSALS.reset(token)
    out["proposals"] = bag
    return out


async def answer_claude(body: dict[str, Any], client: Any = None) -> dict[str, Any]:
    try:
        import anthropic
    except ImportError as e:  # pragma: no cover - depends on the install
        raise AgentUnavailable({"status": "sdk_missing", "message": "pip install anthropic"}) from e
    if client is None:
        if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN") or os.environ.get("ANTHROPIC_PROFILE")):
            raise AgentUnavailable({"status": "no_api_key", "message": "Set ANTHROPIC_API_KEY on the server to enable the agent."})
        client = anthropic.AsyncAnthropic()

    parcel = body["parcel"]
    messages: list[dict[str, Any]] = first_messages(body)
    steps: list[dict[str, Any]] = []

    for _ in range(MAX_TURNS):
        try:
            msg = await client.beta.messages.create(
                model=MODEL, max_tokens=16000, system=SYSTEM, tools=TOOLS, messages=messages,
                output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"], fallbacks="default")
        except anthropic.RateLimitError as e:
            raise AgentUnavailable({"status": "rate_limited", "message": "Claude API rate limit, try again shortly"}) from e
        except anthropic.APIStatusError as e:
            raise AgentUnavailable({"status": "api_error", "message": f"Claude API error {e.status_code}"}) from e
        except anthropic.APIConnectionError as e:
            raise AgentUnavailable({"status": "api_unreachable", "message": "Claude API unreachable"}) from e

        if msg.stop_reason == "refusal":
            return {"text": "", "status": "refusal", "steps": steps, "model": msg.model}
        messages.append({"role": "assistant", "content": msg.content})
        calls = [b for b in msg.content if b.type == "tool_use"]
        if msg.stop_reason != "tool_use" or not calls:
            text = "".join(b.text for b in msg.content if b.type == "text").strip()
            return {"text": text, "status": "ok" if msg.stop_reason == "end_turn" else msg.stop_reason, "steps": steps, "model": msg.model,
                    "engine": "claude"}

        results = []
        for c in calls:
            inp = c.input if isinstance(c.input, dict) else {}
            try:
                out = await run_tool(c.name, inp, parcel)
                results.append({"type": "tool_result", "tool_use_id": c.id, "content": json.dumps(out, ensure_ascii=False)})
            except Exception as e:  # tool failure is reported to the model, which can explain it
                out = {"error": f"{type(e).__name__}: {e}"}
                results.append({"type": "tool_result", "tool_use_id": c.id, "content": out["error"], "is_error": True})
            steps.append({"tool": c.name, "input": inp, "summary": _summary(c.name, inp, out, body.get("lang") or "fr")})
        messages.append({"role": "user", "content": results})

    return {"text": "", "status": "max_turns", "steps": steps, "model": MODEL, "engine": "claude"}
