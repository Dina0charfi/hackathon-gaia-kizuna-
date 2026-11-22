"""GAIA API — FastAPI backend.

Run:  uvicorn gaia.main:app --reload   (from the backend/ folder)
Every endpoint returns what it can compute and says what is missing. No endpoint
invents a value: if a model or a source is not available, the answer says so.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

def _load_env_file() -> None:
    """backend/.env (never committed): KEY=value lines, for the free model key. Real environment variables win."""
    f = Path(__file__).resolve().parent.parent / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_env_file()

from . import (agent, assistant, auth, business, engine, farm_monitor, farm_state, guard, irrigation, irrigation_agent, leaf,
               nexus, planner, plantnet, solar, vision)

DATA = Path(__file__).resolve().parent.parent / "data"
KB = json.loads((DATA / "knowledge.json").read_text(encoding="utf-8"))
FEEDBACK = Path(os.environ.get("GAIA_FEEDBACK_FILE", DATA / "feedback.jsonl"))
MODEL_DIR = Path(os.environ.get("GAIA_MODEL_DIR", DATA.parent / "models" / "gaia-vision"))

app = FastAPI(title="GAIA API", version="0.1.0",
              description="Land intelligence for Tunisian farms. Rules, calculations and simulations; no invented outputs.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict:
    llms = assistant.available()
    return {"status": "ok", "records": len(KB["records"]), "vision_model": (MODEL_DIR / "manifest.json").exists(),
            "assistant_llm": bool(llms), "assistant_providers": llms, "plantnet": bool(plantnet.api_key()),
            "irrigation_model": irrigation.available(), "irrigation_agent": bool(os.environ.get("GAIA_LLM_API_KEY") or irrigation_agent.has_claude_key())}


class FarmIn(BaseModel):
    lat: float
    lon: float
    crop: Optional[str] = None
    water: Optional[str] = None
    share: bool = False


class SignupIn(BaseModel):
    name: str = Field(..., max_length=80)
    identifier: str = Field(..., max_length=120, description="email or phone number")
    password: str = Field(..., max_length=200)
    role: str = "farmer"
    region: Optional[str] = Field(None, max_length=80)
    farm: Optional[FarmIn] = None


class LoginIn(BaseModel):
    identifier: str = Field(..., max_length=120)
    password: str = Field(..., max_length=200)


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def _auth_call(fn, *a, **k):
    try:
        return fn(*a, **k)
    except auth.AuthError as e:
        raise HTTPException(e.status, detail={"code": e.code, "message": e.message}) from e


@app.post("/auth/signup", status_code=201)
def auth_signup(body: SignupIn) -> dict:
    return _auth_call(auth.signup, **body.model_dump())


@app.post("/auth/login")
def auth_login(body: LoginIn) -> dict:
    return _auth_call(auth.login, body.identifier, body.password)


@app.get("/auth/me")
def auth_me(authorization: Optional[str] = Header(None)) -> dict:
    user = auth.user_for(_bearer(authorization))
    if not user:
        raise HTTPException(401, detail={"code": "no_session", "message": "Not signed in."})
    return {"user": user}


@app.post("/auth/logout")
def auth_logout(authorization: Optional[str] = Header(None)) -> dict:
    auth.logout(_bearer(authorization))
    return {"signed_out": True}


class ForgotIn(BaseModel):
    identifier: str = Field(..., max_length=120)


class ResetIn(BaseModel):
    identifier: str = Field(..., max_length=120)
    code: str = Field(..., max_length=12)
    password: str = Field(..., max_length=200)


@app.post("/auth/forgot")
def auth_forgot(body: ForgotIn, request: Request) -> dict:
    """Send a 6-digit reset code (email via SMTP, or the server console). Same answer for unknown accounts.
    Local demo only (request from this computer, no SMTP): the code is also returned for the page to show."""
    host = request.client.host if request.client else ""
    return _auth_call(auth.request_reset, body.identifier, host in ("127.0.0.1", "::1", "localhost"))


@app.post("/auth/reset")
def auth_reset(body: ResetIn) -> dict:
    """Code + new password: sets the password, closes every other session, signs in."""
    return _auth_call(auth.confirm_reset, body.identifier, body.code, body.password)


@app.put("/auth/farm")
def auth_farm(body: Optional[FarmIn] = None, authorization: Optional[str] = Header(None)) -> dict:
    """Link, update or (empty body) unlink the plot of the signed-in account."""
    return {"user": _auth_call(auth.set_farm, _bearer(authorization), body.model_dump() if body else None)}


@app.get("/share/neighbours")
def share_neighbours(radius_km: float = 5.0, authorization: Optional[str] = Header(None)) -> dict:
    """Neighbours who agreed to be visible: first name, crop, water source, distance rounded to 0.5 km."""
    return _auth_call(auth.neighbours, _bearer(authorization), radius_km)


class ShareRequestIn(BaseModel):
    to: int


class ShareRespondIn(BaseModel):
    from_id: int
    accept: bool


@app.post("/share/request")
def share_request(body: ShareRequestIn, authorization: Optional[str] = Header(None)) -> dict:
    return _auth_call(auth.request_share, _bearer(authorization), body.to)


@app.post("/share/respond")
def share_respond(body: ShareRespondIn, authorization: Optional[str] = Header(None)) -> dict:
    return _auth_call(auth.respond_share, _bearer(authorization), body.from_id, body.accept)


@app.get("/knowledge/techniques")
def techniques(origin: Optional[str] = None) -> dict:
    recs = [r for r in KB["records"] if origin is None or r["origin"] == origin]
    return {"count": len(recs), "families": KB.get("families"), "records": recs}


@app.get("/parcel/profile")
async def parcel_profile(lat: float, lon: float) -> dict:
    if not (30 <= lat <= 38 and 7 <= lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")
    from . import profile
    return await profile.build(lat, lon)


class AnalyzeIn(BaseModel):
    profile: dict[str, Any] = Field(..., description="GAIA LAND DNA (nested) or flat {'climate.rain_mm': 180, 'crop': 'olive', ...}")
    technique: Optional[str] = None


@app.post("/analyze")
def analyze(body: AnalyzeIn) -> dict:
    recs = KB["records"]
    if body.technique:
        recs = [r for r in recs if r["id"] == body.technique]
        if not recs:
            raise HTTPException(404, f"Unknown technique {body.technique}")
    results = engine.evaluate_all(recs, body.profile)
    return {"method": "explicit rules from the knowledge base (no ML)", "results": results}


class NexusIn(BaseModel):
    et0: list[Optional[float]] = Field(..., min_length=12, max_length=12)
    rain: list[Optional[float]] = Field(..., min_length=12, max_length=12)
    kc: Optional[float] = None
    months: Optional[list[int]] = None
    area_ha: Optional[float] = None
    ea: float = 0.9
    head_m: Optional[float] = None
    pump_eff: float = 0.45
    pr: float = 0.75
    ghi: Optional[list[Optional[float]]] = None
    prices: Optional[dict[str, float]] = None
    pe_factor: Optional[list[Optional[float]]] = Field(None, min_length=12, max_length=12,
        description="share of each month's rain that stays in the soil (ml/models/pluie_efficace_meta.json); default USDA-SCS")


@app.post("/nexus/calculate")
def nexus_calculate(body: NexusIn) -> dict:
    return nexus.compute(**body.model_dump())


class GuardIn(NexusIn):
    pv_kwp: Optional[float] = Field(None, description="installed solar driving the pump; default: the size the nexus computes")
    safe_yield_m3_year: Optional[float] = Field(None, description="permit, or the farm's share of aquifer recharge")
    flow_m3_h: Optional[float] = Field(None, description="pump flow at the working head, for daily run-time limits")


@app.post("/nexus/guard")
def nexus_guard(body: GuardIn) -> dict:
    """Groundwater guard: cap solar pumping at the crop need (and the safe yield when given)."""
    return guard.guard(**body.model_dump())


class PaygIn(BaseModel):
    kit_tnd: Optional[float] = Field(None, description="installed price of the solar pump kit (TND)")
    diesel_tnd_year: Optional[float] = Field(None, description="what the farm spends on pumping diesel per year (TND)")
    deposit_pct: float = 0.10
    term_months: int = 36
    fee_rate: float = 0.08
    share_cap: float = 0.70
    maint_tnd_year: float = 0
    monthly_kwh: Optional[list[Optional[float]]] = Field(None, min_length=12, max_length=12)
    seasonal: bool = False
    start_month: int = Field(0, ge=0, le=11)
    life_y: float = 20


@app.post("/business/payg")
def business_payg(body: PaygIn) -> dict:
    return business.payg(**body.model_dump())


class CoopMember(BaseModel):
    name: Optional[str] = None
    quota_m3: float
    diesel_tnd_year: Optional[float] = None


class CoopIn(BaseModel):
    kit_tnd: Optional[float] = None
    individual_kit_tnd: Optional[float] = None
    members: list[CoopMember] = []
    deposit_pct: float = 0.10
    term_months: int = 36
    fee_rate: float = 0.08
    reserve_pct: float = 0.05


@app.post("/business/coop")
def business_coop(body: CoopIn) -> dict:
    d = body.model_dump()
    return business.coop(**d)


class AdoptionIn(BaseModel):
    ghi_mean: Optional[float] = None
    water_source: Optional[str] = None
    has_quota: bool = False
    payg: Optional[PaygIn] = None
    ease: dict[str, bool] = {}
    partners: dict[str, bool] = {}


@app.post("/business/adoption")
def business_adoption(body: AdoptionIn) -> dict:
    d = body.model_dump()
    d["payg"] = business.payg(**d["payg"]) if d["payg"] else None
    return business.adoption(**d)


class SolarIn(BaseModel):
    lat: float
    lon: float
    ghi: list[Optional[float]] = Field(..., min_length=12, max_length=12, description="monthly mean kWh/m²/day")
    tilt: float = 20
    azimuth: float = 180
    height: float = 4
    width: float = 2
    pitch: float = 8
    area_ha: float = 1
    density_wp_m2: float = 200
    pr: float = 0.8
    albedo: float = 0.2


@app.post("/solar/simulate")
def solar_simulate(body: SolarIn) -> dict:
    if body.pitch <= body.width:
        raise HTTPException(422, "pitch must be larger than panel width")
    return solar.simulate(**body.model_dump())


def _source_error(e: Exception) -> dict:
    if "429" in str(e):
        return {"status": "rate_limited", "message": "Open-Meteo limits requests for a moment (429): try again in a minute."}
    return {"status": "source_unavailable", "message": f"Open-Meteo: {str(e)[:160]}"}


@app.get("/irrigation/forecast")
async def irrigation_forecast(lat: float, lon: float) -> dict:
    """7-day soil moisture and irrigation plan from the trained LightGBM models (ml/)."""
    if not (30 <= lat <= 38 and 7 <= lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")
    try:
        return await irrigation.forecast(lat, lon)
    except irrigation.ModelMissing as e:
        raise HTTPException(503, detail={"status": "model_not_loaded", "message": str(e)})
    except ValueError as e:
        raise HTTPException(422, detail={"status": "no_data", "message": str(e)})
    except Exception as e:  # Open-Meteo unreachable or refusing
        raise HTTPException(502, detail=_source_error(e))


class PlanIn(BaseModel):
    lat: float
    lon: float
    crop: str = Field("olive", description="olive | palm | citrus | cereal | veg | other (FAO-56 rooting depth and depletion fraction)")
    kc: float = Field(0.65, gt=0, le=2)
    area_ha: Optional[float] = Field(None, gt=0)
    ea: float = Field(0.9, gt=0, le=1, description="irrigation efficiency")
    head_m: Optional[float] = Field(None, gt=0)
    pump_eff: float = Field(0.45, gt=0, le=1)
    flow_m3h: Optional[float] = Field(None, gt=0, description="pump flow; limits the water per day and sets the pumping hours")
    pv_kwp: Optional[float] = Field(None, gt=0, description="solar array driving the pump")
    pr: float = Field(0.75, gt=0, le=1)
    mode: str = Field("solar", pattern="^(water|solar)$", description="water = least water; solar = least non-solar energy")
    irrigated_mm: float = Field(0.0, ge=0, le=200, description="net mm irrigated since yesterday (the soil model does not know it)")
    plan_mm: Optional[list[float]] = Field(None, max_length=8, description="simulate this irrigation (net mm per day) instead of optimising")
    months: Optional[list[int]] = Field(None, min_length=12, max_length=12, description="irrigated months, 12 flags (1 = irrigated); no irrigation planned in the others")
    quota_m3_month: Optional[list[Optional[float]]] = Field(None, min_length=12, max_length=12, description="authorised volume per month (m³, whole parcel), e.g. from the CRDA allocation")


@app.post("/irrigation/plan")
async def irrigation_plan(body: PlanIn) -> dict:
    """Optimal 8-day irrigation plan (model predictive control) and solar pumping hours."""
    if not (30 <= body.lat <= 38 and 7 <= body.lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")
    try:
        d = body.model_dump()
        d["plan_override"] = d.pop("plan_mm")
        return await planner.plan(**d)
    except irrigation.ModelMissing as e:
        raise HTTPException(503, detail={"status": "model_not_loaded", "message": str(e)})
    except ValueError as e:
        raise HTTPException(422, detail={"status": "no_data", "message": str(e)})
    except Exception as e:  # Open-Meteo unreachable or refusing
        raise HTTPException(502, detail=_source_error(e))


class ReplayIn(BaseModel):
    lat: float
    lon: float
    start: str = Field("2025-05-01", pattern=r"^\d{4}-\d{2}-\d{2}$")
    end: str = Field("2025-09-30", pattern=r"^\d{4}-\d{2}-\d{2}$")
    crop: str = "olive"
    kc: float = Field(0.65, gt=0, le=2)
    area_ha: Optional[float] = Field(None, gt=0)
    ea: float = Field(0.9, gt=0, le=1)
    head_m: Optional[float] = Field(None, gt=0)
    pump_eff: float = Field(0.45, gt=0, le=1)
    flow_m3h: Optional[float] = Field(None, gt=0)
    pv_kwp: Optional[float] = Field(None, gt=0)
    pr: float = Field(0.75, gt=0, le=1)
    months: Optional[list[int]] = Field(None, min_length=12, max_length=12, description="irrigated months, 12 flags (1 = irrigated); no irrigation planned in the others")
    quota_m3_month: Optional[list[Optional[float]]] = Field(None, min_length=12, max_length=12, description="authorised volume per month (m³, whole parcel), e.g. from the CRDA allocation")


@app.post("/irrigation/replay")
def irrigation_replay(body: ReplayIn) -> dict:
    """Replay a past season on the nearest site's real data: quota method vs classic FAO-56 vs the GAIA planner."""
    if not (30 <= body.lat <= 38 and 7 <= body.lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")
    try:
        return planner.replay_season(**body.model_dump())
    except irrigation.ModelMissing as e:
        raise HTTPException(503, detail={"status": "model_not_loaded", "message": str(e)})
    except ValueError as e:
        raise HTTPException(422, detail={"status": "no_data", "message": str(e)})


def _tunisia(lat: float, lon: float) -> None:
    if not (30 <= lat <= 38 and 7 <= lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")


@app.on_event("startup")
async def _start_morning_check() -> None:
    """Morning check of monitored parcels (gaia/farm_monitor.py), inside the backend process."""
    import asyncio
    if os.environ.get("GAIA_MONITOR", "1") != "0":
        asyncio.get_event_loop().create_task(farm_monitor.loop())


@app.get("/farm/state")
def farm_get(lat: float, lon: float) -> dict:
    """Saved irrigation calendar, reported irrigations, settings, morning check and alerts of a parcel."""
    _tunisia(lat, lon)
    return farm_state.load(lat, lon)


class FarmActionIn(BaseModel):
    lat: float
    lon: float
    action: dict[str, Any] = Field(..., description="{type: save_plan | log_irrigation | update_settings | set_monitoring | mark_alerts_read, params: {...}}")


@app.post("/farm/action")
def farm_action(body: FarmActionIn) -> dict:
    """Apply ONE action the farmer confirmed on the page (the agent only proposes them)."""
    _tunisia(body.lat, body.lon)
    try:
        return farm_state.apply(body.lat, body.lon, body.action)
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(422, detail={"status": "bad_action", "message": str(e)})


@app.post("/farm/check")
async def farm_check(lat: float, lon: float) -> dict:
    """Run the morning check now for this parcel: re-plan and record an alert."""
    _tunisia(lat, lon)
    try:
        await farm_monitor.check(lat, lon)
        return farm_state.load(lat, lon)
    except irrigation.ModelMissing as e:
        raise HTTPException(503, detail={"status": "model_not_loaded", "message": str(e)})
    except Exception as e:
        raise HTTPException(502, detail=_source_error(e))


class IrrigationParcel(BaseModel):
    lat: float
    lon: float
    crop: str = "olive"
    kc: float = Field(0.65, gt=0, le=2)
    area_ha: Optional[float] = Field(None, gt=0)
    ea: float = Field(0.9, gt=0, le=1)
    head_m: Optional[float] = Field(None, gt=0)
    pump_eff: float = Field(0.45, gt=0, le=1)
    flow_m3h: Optional[float] = Field(None, gt=0)
    pv_kwp: Optional[float] = Field(None, gt=0)
    pr: float = Field(0.75, gt=0, le=1)
    months: Optional[list[int]] = Field(None, min_length=12, max_length=12, description="irrigated months, 12 flags (1 = irrigated); no irrigation planned in the others")
    quota_m3_month: Optional[list[Optional[float]]] = Field(None, min_length=12, max_length=12, description="authorised volume per month (m³, whole parcel), e.g. from the CRDA allocation")


class IrrigationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=6000)


class IrrigationAgentIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    lang: str = "fr"
    parcel: IrrigationParcel
    history: list[IrrigationTurn] = Field(default_factory=list, max_length=24, description="previous turns, oldest first")


@app.post("/agent")
async def agent_answer(body: IrrigationAgentIn) -> dict:
    """Smart irrigation agent (free Gemini / Groq model, or Claude): calls the soil forecast, optimal planner, what-if simulator and solar forecast. 503 without a key."""
    if not (30 <= body.parcel.lat <= 38 and 7 <= body.parcel.lon <= 12):
        raise HTTPException(422, "Point outside the Tunisia bounding box.")
    try:
        return await irrigation_agent.answer(body.model_dump())
    except irrigation_agent.AgentUnavailable as e:
        raise HTTPException(503, detail=e.detail) from e


@app.post("/diagnose")
async def diagnose(image: UploadFile = File(...)) -> dict:
    """Two-stage plant-health check. 503 with a clear status when no usable model is installed."""
    try:
        return vision.diagnose(MODEL_DIR, await image.read())
    except vision.VisionUnavailable as e:
        raise HTTPException(503, detail=e.detail) from e
    except vision.BadImage as e:
        raise HTTPException(422, detail={"status": "bad_image", "message": str(e)}) from e


@app.post("/plantnet")
async def plantnet_identify(image: UploadFile = File(...), organ: str = Form("leaf"), lang: str = Form("fr"),
                            diseases: bool = Form(True)) -> dict:
    """Optional external check (Pl@ntNet), called by the page only after the user agrees. Species name + possible disease."""
    data = await image.read()
    if not data or len(data) > 8_000_000:
        raise HTTPException(422, detail={"status": "bad_image", "message": "Image missing or larger than 8 MB."})
    if data[:3] != b"\xff\xd8\xff" and data[:8] != b"\x89PNG\r\n\x1a\n":
        raise HTTPException(422, detail={"status": "bad_image", "message": "Only JPEG or PNG images are accepted."})
    if organ not in {"leaf", "flower", "fruit", "bark", "auto"}:
        organ = "leaf"
    lang = lang if lang.isalpha() and len(lang) == 2 else "en"
    try:
        return await plantnet.identify(data, organ=organ, lang=lang, diseases=diseases)
    except plantnet.PlantnetError as e:
        raise HTTPException(e.http_status, detail=e.detail) from e


class FeedbackIn(BaseModel):
    kind: Literal["recommendation", "diagnosis", "data", "other"] = "other"
    role: Optional[str] = None
    text: str = Field(..., min_length=1, max_length=4000)
    context: dict[str, Any] = {}


@app.post("/feedback", status_code=201)
def feedback(body: FeedbackIn) -> dict:
    item = body.model_dump() | {"at": datetime.now(timezone.utc).isoformat(), "expert_status": "pending"}
    FEEDBACK.parent.mkdir(parents=True, exist_ok=True)
    with FEEDBACK.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")
    return {"stored": True, "expert_status": "pending"}


class AssistantIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    lang: Literal["fr", "ar", "en", "ja"] = "fr"
    answer: dict[str, Any] = {}
    profile: dict[str, Any] = {}
    verdicts: list[dict[str, Any]] = []
    records: list[dict[str, Any]] = Field([], description="records the page retrieved; empty = the whole knowledge base")
    history: list[dict[str, Any]] = Field([], description="last turns of the conversation: [{q, a}]")


@app.post("/assistant")
def assistant_answer(body: AssistantIn) -> dict:
    """AI Lab answer by a language model (Claude, a free OpenAI-compatible service, or local Ollama), grounded in the evidence sent. 503 when none is configured."""
    d = body.model_dump()
    if not d["records"]:
        d["records"] = KB["records"]
    try:
        return assistant.answer(d)
    except assistant.AssistantUnavailable as e:
        raise HTTPException(503, detail=e.detail) from e


class LeafIn(BaseModel):
    evidence: dict[str, Any]
    lang: Literal["fr", "ar", "en", "ja"] = "fr"


@app.post("/leaf/explain")
def leaf_explain(body: LeafIn) -> dict:
    """Plant health: a language model explains the leaf result and gives safe first steps. The photo is not sent. 503 when no model is configured."""
    try:
        return leaf.explain(body.evidence, body.lang)
    except assistant.AssistantUnavailable as e:
        raise HTTPException(503, detail=e.detail) from e


class AgentIn(BaseModel):
    messages: list[dict[str, Any]] = Field(..., min_length=1, max_length=60)
    tools: list[dict[str, Any]] = Field(..., min_length=1, max_length=30)


@app.post("/agent/step")
def agent_step(body: AgentIn) -> dict:
    """One step of the GAIA Farm Agent: the model's next tool calls, or its final plan. The page runs the tools. 503 when no model is configured."""
    try:
        return agent.step(body.messages, body.tools)
    except assistant.AssistantUnavailable as e:
        raise HTTPException(503, detail=e.detail) from e
