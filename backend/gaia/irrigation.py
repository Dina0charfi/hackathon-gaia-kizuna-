"""GAIA 7-day irrigation plan — trained model (LightGBM), not a rule.

The models are trained in ml/prevision_humidite_sol.ipynb on Open-Meteo data from 2020 to
yesterday for 26 sites covering the 24 Tunisian governorates. Soil moisture and weather come
from the ECMWF IFS model (what the Open-Meteo archive serves since 2017); live, the same
model is read from the Open-Meteo forecast API, up to yesterday and with the coming days.
Each model h (1..8) predicts the change of root-zone soil moisture (7–28 cm) between
yesterday (the last complete day) and day J+h: today and the 7 following days.
build_features() must stay identical to the notebook's construire_variables();
tests/test_irrigation.py checks it against the reference prediction stored in meta.json.

The reserve is relative to the nearest training site's own history (0 % = its 5th
percentile, 100 % = its 95th). The irrigation thresholds are demonstration assumptions,
to be replaced by the crop's FAO-56 thresholds.
"""
from __future__ import annotations

import json
import math
import os
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = Path(os.environ.get("GAIA_IRRIGATION_MODELS", ROOT / "ml" / "models"))
TARGET = "sm_7_28"
IRRIGATE, SOON = 0.30, 0.35          # demonstration thresholds on the relative reserve
FORECAST = "https://api.open-meteo.com/v1/forecast"
DAILY = ["et0_fao_evapotranspiration", "precipitation_sum", "temperature_2m_max",
         "temperature_2m_min", "shortwave_radiation_sum", "wind_speed_10m_max"]
HOURLY = ["soil_moisture_0_to_7cm", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm"]
RENAME = {"et0_fao_evapotranspiration": "et0", "precipitation_sum": "pluie",
          "temperature_2m_max": "tmax", "temperature_2m_min": "tmin",
          "shortwave_radiation_sum": "rayonnement", "wind_speed_10m_max": "vent",
          "soil_moisture_0_to_7cm": "sm_0_7", "soil_moisture_7_to_28cm": "sm_7_28",
          "soil_moisture_28_to_100cm": "sm_28_100"}

DISK_CACHE = Path(os.environ.get("GAIA_FORECAST_CACHE", ROOT / "backend" / "data" / "cache"))

_models: dict[str, Any] | None = None
_cache: dict[tuple, tuple[float, dict]] = {}
CACHE_S = 3600


class ModelMissing(RuntimeError):
    pass


def load() -> dict[str, Any]:
    """Load the 7 boosters and meta.json once."""
    global _models
    if _models is None:
        meta_file = MODEL_DIR / "meta.json"
        if not meta_file.exists():
            raise ModelMissing(f"{meta_file} not found: run ml/prevision_humidite_sol.ipynb first")
        import lightgbm as lgb
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        boosters = {h: lgb.Booster(model_file=str(MODEL_DIR / f"humidite_sol_J{h}.txt")) for h in meta["horizons"]}
        _models = {"meta": meta, "boosters": boosters}
    return _models


def available() -> bool:
    try:
        load()
        return True
    except Exception:
        return False


def build_features(df: pd.DataFrame, horizons=None) -> pd.DataFrame:
    """Same variables as construire_variables() in the notebook (one set of future-weather columns per model)."""
    if horizons is None:
        horizons = range(1, max(load()["boosters"]) + 1)
    g = df.sort_values("date").copy()
    s = g[TARGET]
    for lag in [1, 2, 3, 7]:
        g[f"sm_lag{lag}"] = s.shift(lag)
    g["sm_diff1"] = s - s.shift(1)
    for w in [1, 3, 7, 30]:
        g[f"pluie_{w}j"] = g.pluie.rolling(w).sum()
    for w in [3, 7, 30]:
        g[f"et0_{w}j"] = g.et0.rolling(w).sum()
    doy = g.date.dt.day_of_year
    g["saison_sin"], g["saison_cos"] = np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)
    for h in horizons:
        fut_rain = pd.concat([g.pluie.shift(-k) for k in range(1, h + 1)], axis=1)
        fut_et0 = pd.concat([g.et0.shift(-k) for k in range(1, h + 1)], axis=1)
        g[f"pluie_fut_{h}"] = fut_rain.sum(axis=1, min_count=h)
        g[f"pluie_max_fut_{h}"] = fut_rain.max(axis=1)
        g[f"et0_fut_{h}"] = fut_et0.sum(axis=1, min_count=h)
    return g


def predict_row(row: pd.DataFrame) -> dict[int, float]:
    """Soil moisture (m³/m³) predicted at J+h for a one-row feature frame."""
    m = load()
    today = float(row[TARGET].iloc[0])
    return {h: today + float(b.predict(row[m["meta"]["variables"][str(h)]])[0]) for h, b in m["boosters"].items()}


def nearest_site(lat: float, lon: float) -> dict[str, Any]:
    sites = load()["meta"]["sites"]
    def km(s):
        dy = (s["lat"] - lat) * 111.32
        dx = (s["lon"] - lon) * 111.32 * math.cos(math.radians(lat))
        return math.hypot(dx, dy)
    best = min(sites, key=km)
    return best | {"distance_km": round(km(best), 1)}


def _weather_table(j: dict) -> pd.DataFrame:
    d = pd.DataFrame(j["daily"]).rename(columns=RENAME)
    d["date"] = pd.to_datetime(d.pop("time"))
    return d


def _soil_table(j: dict) -> pd.DataFrame:
    h = pd.DataFrame(j["hourly"]).rename(columns=RENAME)
    h["date"] = pd.to_datetime(h.pop("time")).dt.floor("D")
    return h.groupby("date").mean().reset_index()


async def get_json(params: dict[str, Any], tag: str) -> dict[str, Any]:
    """GET the Open-Meteo forecast API with a disk cache valid for today, so a server restart does not
    query it again (it limits requests per minute and per day). On 429 or a network error, today's cached copy is used."""
    import hashlib
    import httpx
    DISK_CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha1(json.dumps(params, sort_keys=True).encode()).hexdigest()[:16]
    f = DISK_CACHE / f"{tag}_{date.today()}_{key}.json"
    if f.exists() and time.time() - f.stat().st_mtime < CACHE_S:
        return json.loads(f.read_text(encoding="utf-8"))
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.get(FORECAST, params=params)
            r.raise_for_status()
    except Exception:
        if f.exists():                                         # stale but from today: better than nothing
            return json.loads(f.read_text(encoding="utf-8"))
        raise
    j = r.json()
    f.write_text(json.dumps(j), encoding="utf-8")
    for old in DISK_CACHE.glob(f"{tag}_*.json"):              # keep only today's files
        if str(date.today()) not in old.name:
            old.unlink(missing_ok=True)
    return j


async def _fetch(lat: float, lon: float) -> tuple[pd.DataFrame, pd.DataFrame, float]:
    """Last 60 days and next 10 days from the Open-Meteo forecast API, ECMWF IFS model:
    the same source as the training data (the archive serves ECMWF IFS since 2017), with no publication delay."""
    j = await get_json(dict(latitude=lat, longitude=lon, timezone="Africa/Tunis", models="ecmwf_ifs",
                            past_days=60, forecast_days=10, daily=",".join(DAILY), hourly=",".join(HOURLY)), "soil")
    t = _weather_table(j).merge(_soil_table(j), on="date", how="left")
    yesterday = pd.Timestamp(date.today()) - pd.Timedelta(days=1)       # last complete day
    return t[t.date <= yesterday], t[t.date > yesterday], float(j["elevation"])


async def forecast(lat: float, lon: float) -> dict[str, Any]:
    key = (round(lat, 3), round(lon, 3), str(date.today()))
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_S:
        return hit[1]
    m = load()
    meta, max_h = m["meta"], max(m["boosters"])
    hist, fut, elevation = await _fetch(lat, lon)
    complete = hist.dropna(subset=[TARGET, "et0", "pluie"])
    if len(complete) < 40:
        raise ValueError("Not enough recent soil moisture data for this point (sea or missing model cell).")
    state_day = complete.date.max()
    today = pd.Timestamp(date.today())
    lag = (today - state_day).days
    if lag + 7 > max_h:
        raise ValueError(f"The last soil state is {lag} days old; the models reach J+{max_h} only.")
    hist = complete.assign(lat=lat, lon=lon, altitude=elevation)
    future = fut[fut.date > state_day].head(max_h)
    if len(future) < lag + 7:
        raise ValueError("Weather for the coming days is not available.")
    feats = build_features(pd.concat([hist, future], ignore_index=True))
    preds = predict_row(feats[feats.date == state_day])

    site = nearest_site(lat, lon)
    th = meta["seuils_sites"][site["id"]]
    span = th["humide"] - th["sec"]
    reserve = lambda v: float(min(1.0, max(0.0, (v - th["sec"]) / span)))
    rmse = {r["horizon"]: r["rmse_modele"] for r in meta["resultats"] if r["test"] == "lieux jamais vus"}

    def day(h: int, theta: float) -> dict[str, Any]:
        w = future.iloc[h - 1]
        r, err = reserve(theta), rmse[h] / span
        return dict(date=w.date.strftime("%Y-%m-%d"), horizon=h, is_today=bool(w.date == today),
                    rain_mm=None if pd.isna(w.pluie) else round(float(w.pluie), 1),
                    et0_mm=None if pd.isna(w.et0) else round(float(w.et0), 2),
                    soil_moisture=round(theta, 4), reserve=round(r, 3), reserve_error=round(err, 3),
                    reserve_low=round(max(0.0, r - err), 3), reserve_high=round(min(1.0, r + err), 3),
                    decision="irrigate" if r < IRRIGATE else ("soon" if r < SOON else "none"))

    # today (estimated, unless the soil state is from today) and the 7 following days
    days = [day(h, preds[h]) for h in range(max(lag, 1), lag + 8)]
    state_theta = float(complete[complete.date == state_day][TARGET].iloc[0])
    out = dict(
        method="trained model (LightGBM), one model per horizon",
        model=dict(trained_on=f"{len(meta['sites'])} sites, 24 Tunisian governorates"
                   + (f", final models trained on {meta['modele_final']['entraine_sur']}" if meta.get("modele_final") else ""),
                   period=meta["periode"], final=meta.get("modele_final"),
                   split=meta.get("decoupage"), source=meta["source"], target="soil moisture 7–28 cm (m³/m³)",
                   error_unseen_sites_m3m3={h: round(v, 4) for h, v in rmse.items()}),
        location=dict(lat=lat, lon=lon, elevation_m=elevation),
        state=dict(date=state_day.strftime("%Y-%m-%d"), lag_days=lag, soil_moisture=round(state_theta, 4),
                   reserve=round(reserve(state_theta), 3),
                   note="Last complete day (yesterday), ECMWF IFS analysis via the Open-Meteo forecast API; the following days use forecast weather."),
        reference_site=site,
        thresholds=dict(irrigate=IRRIGATE, soon=SOON, note="Demonstration assumption, to be replaced by the crop's FAO-56 thresholds."),
        days=days,
    )
    _cache[key] = (time.time(), out)
    return out
