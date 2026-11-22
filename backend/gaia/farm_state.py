"""What the agent can change, kept on the server for each parcel (backend/data/farm/, never committed).

  settings        crop, Kc, area, pump flow, pumping head, solar power… (used by the morning check)
  plan            the irrigation calendar the farmer confirmed (date, net mm, m³, pumping hours)
  irrigation_log  irrigations the farmer reported; plans subtract what was applied since yesterday
  monitoring      the morning check: on/off, hour, last run
  alerts          what the morning check found (shown on the page, read / unread)

The agent never writes here by itself: its action tools only PROPOSE (gaia.agent), and an action is
applied when the farmer presses "Confirm" on the page (POST /farm/action).
"""
from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

DIR = Path(os.environ.get("GAIA_FARM_DIR", Path(__file__).resolve().parent.parent / "data" / "farm"))
def _months(v):
    v = [1 if x else 0 for x in v]
    if len(v) != 12:
        raise ValueError("months must have 12 flags")
    return v


def _quota(v):
    v = [None if x is None else max(0.0, float(x)) for x in v]
    if len(v) != 12:
        raise ValueError("quota_m3_month must have 12 values")
    return v


SETTING_KEYS = {"crop": str, "kc": float, "area_ha": float, "ea": float, "head_m": float, "pump_eff": float,
                "flow_m3h": float, "pv_kwp": float, "pr": float, "months": _months, "quota_m3_month": _quota}
_lock = threading.Lock()


def key(lat: float, lon: float) -> str:
    return f"{round(lat, 3):.3f}_{round(lon, 3):.3f}"


def _file(lat: float, lon: float) -> Path:
    return DIR / f"{key(lat, lon)}.json"


def load(lat: float, lon: float) -> dict[str, Any]:
    f = _file(lat, lon)
    base = {"lat": lat, "lon": lon, "settings": {}, "plan": [], "irrigation_log": [],
            "monitoring": {"enabled": False, "hour": 7, "last_run": None}, "alerts": []}
    if f.exists():
        base.update(json.loads(f.read_text(encoding="utf-8")))
    return base


def save(state: dict[str, Any]) -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    f = _file(state["lat"], state["lon"])
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(f)


def all_parcels() -> list[dict[str, Any]]:
    if not DIR.exists():
        return []
    return [json.loads(f.read_text(encoding="utf-8")) for f in DIR.glob("*.json")]


def recent_irrigation_mm(lat: float, lon: float) -> float:
    """Net mm reported since yesterday: the soil model, started from yesterday's analysis, does not know them."""
    since = (date.today() - timedelta(days=1)).isoformat()
    return round(sum(e["mm"] for e in load(lat, lon)["irrigation_log"] if e["date"] >= since), 1)


# ---------------------------------------------------------------- confirmed actions
def apply(lat: float, lon: float, action: dict[str, Any]) -> dict[str, Any]:
    """Apply one action the farmer confirmed. Returns the new state."""
    kind, p = action.get("type"), action.get("params") or {}
    with _lock:
        s = load(lat, lon)
        now = datetime.now().isoformat(timespec="seconds")
        if kind == "save_plan":
            days = [d for d in p.get("days", []) if float(d.get("mm", 0)) > 0]
            keep = [d for d in s["plan"] if d["date"] < date.today().isoformat()]          # past entries stay
            s["plan"] = keep + [dict(date=str(d["date"]), mm=round(float(d["mm"]), 1), m3=round(float(d.get("m3", 0)), 1),
                                     hours=[int(h) for h in d.get("hours", [])][:24], done=False) for d in days]
            s["plan_saved_at"] = now
            s["plan_mode"] = p.get("mode")
        elif kind == "log_irrigation":
            mm = float(p["mm"])
            if not 0 < mm <= 200:
                raise ValueError("irrigation must be between 0 and 200 mm")
            d = str(p.get("date") or date.today().isoformat())
            s["irrigation_log"].append(dict(date=d, mm=round(mm, 1), at=now, note=str(p.get("note", ""))[:200]))
            s["irrigation_log"] = s["irrigation_log"][-200:]
            for e in s["plan"]:                                                           # tick the planned day
                if e["date"] == d:
                    e["done"] = True
        elif kind == "update_settings":
            for k, v in (p.get("settings") or {}).items():
                if k in SETTING_KEYS and v is not None:
                    s["settings"][k] = SETTING_KEYS[k](v)
        elif kind == "set_monitoring":
            s["monitoring"]["enabled"] = bool(p.get("enabled", True))
            if p.get("hour") is not None:
                s["monitoring"]["hour"] = int(min(23, max(0, int(p["hour"]))))
        elif kind == "mark_alerts_read":
            for a in s["alerts"]:
                a["read"] = True
        else:
            raise ValueError(f"unknown action {kind}")
        save(s)
        return s


def add_alert(s: dict[str, Any], level: str, text: dict[str, str], data: Optional[dict] = None) -> dict[str, Any]:
    a = dict(id=uuid.uuid4().hex[:10], date=date.today().isoformat(), at=datetime.now().isoformat(timespec="seconds"),
             level=level, text=text, data=data or {}, read=False)
    s["alerts"] = (s["alerts"] + [a])[-50:]
    return a
