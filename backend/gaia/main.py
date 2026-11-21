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

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import assistant, business, engine, guard, nexus, plantnet, solar, vision

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
            "assistant_llm": bool(llms), "assistant_providers": llms, "plantnet": bool(plantnet.api_key())}


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
