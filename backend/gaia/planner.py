"""GAIA optimal irrigation planner (model predictive control) and solar pumping schedule.

Each day the planner looks 8 days ahead (today + 7) and decides how many mm to irrigate each day
and at what hours to pump, then is run again the next day with the new soil state (receding horizon).

Inputs, all live:
  - today's root-zone soil state: the trained LightGBM soil-moisture model (irrigation.forecast);
  - rain and ET0 forecast: Open-Meteo, ECMWF IFS (same source as the training data);
  - the share of rain that stays in the soil: the trained effective-rain model (ml/ section 11);
  - hourly solar radiation forecast, for the pumping hours.

Simulator: the FAO-56 root-zone water balance (chapter 8), with the crop's Kc:
  Dr[d] = Dr[d-1] + Ks·Kc·ET0[d] − Pe[d] − I[d]   (Dr = root-zone depletion, mm; 0 = full)
  TAW = 1000 · (θ_wet − θ_dry) · Zr ; RAW = p · TAW ; Ks = 1 while Dr ≤ RAW
θ_wet / θ_dry are the nearest training site's 95th / 5th soil-moisture percentiles, used as
proxies of field capacity and wilting point. Zr and p: FAO-56 table 22 (low values, to check).

Objective: no crop stress (Dr ≤ RAW every day) with the least water ("water" mode), or with the
least energy that is not solar ("solar" mode: the soil stores the water pumped on sunny days,
like a battery, for the cloudy days that follow).
"""
from __future__ import annotations

import json
import math
import time
from datetime import date
from typing import Any, Optional

from . import irrigation

# FAO-56 table 22: rooting depth Zr (m, low end) and depletion fraction p (to check)
CROPS = {
    "olive":  dict(zr=1.2, p=0.65),
    "palm":   dict(zr=1.5, p=0.50),
    "citrus": dict(zr=1.2, p=0.50),
    "cereal": dict(zr=1.0, p=0.55),
    "veg":    dict(zr=0.7, p=0.40),
    "other":  dict(zr=1.0, p=0.50),
}
STEP_MM = 1.0          # irrigation decided in steps of 1 mm net
SOLAR_WINDOW = 3       # solar mode may irrigate up to 3 days before the day the water is needed
PUMP_HOURS_MAX = 12    # hours a pump may run in one day

_pe_meta: Optional[dict] = None
_sun_cache: dict[tuple, tuple[float, dict]] = {}


# ---------------------------------------------------------------- inputs
def effective_rain_share(lat: float, lon: float) -> dict[str, Any]:
    """Monthly share of rain kept by the soil at the nearest training site (trained model, ml/ section 11)."""
    global _pe_meta
    if _pe_meta is None:
        f = irrigation.MODEL_DIR / "pluie_efficace_meta.json"
        _pe_meta = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    sites = (_pe_meta or {}).get("sites") or {}
    if not sites:
        return {"monthly": None, "site": None}

    def km(s):
        return math.hypot((s["lat"] - lat) * 111.32, (s["lon"] - lon) * 111.32 * math.cos(math.radians(lat)))
    sid = min(sites, key=lambda k: km(sites[k]))
    s = sites[sid]
    return {"monthly": s["part_mensuelle"], "site": {"id": sid, "nom": s["nom"], "distance_km": round(km(s), 1)}}


async def solar_hours(lat: float, lon: float) -> dict[str, list[float]]:
    """Hourly global horizontal irradiance forecast (W/m²) per day 'YYYY-MM-DD' → 24 values."""
    key = (round(lat, 3), round(lon, 3), str(date.today()))
    hit = _sun_cache.get(key)
    if hit and time.time() - hit[0] < irrigation.CACHE_S:
        return hit[1]
    j = (await irrigation.get_json(dict(latitude=lat, longitude=lon, timezone="Africa/Tunis", models="ecmwf_ifs",
                                        forecast_days=9, hourly="shortwave_radiation"), "sun"))["hourly"]
    out: dict[str, list[float]] = {}
    for t, g in zip(j["time"], j["shortwave_radiation"]):
        out.setdefault(t[:10], []).append(float(g or 0.0))
    _sun_cache[key] = (time.time(), out)
    return out


# ---------------------------------------------------------------- simulator
def simulate(dr0: float, etc: list[float], pe: list[float], irr: list[float], taw: float, raw: float) -> dict[str, list[float]]:
    """FAO-56 daily root-zone water balance. Returns depletion at the end of each day, actual ET and drainage."""
    dr, out_dr, out_et, out_drain = dr0, [], [], []
    for e, p, i in zip(etc, pe, irr):
        ks = 1.0 if dr <= raw else max(0.0, (taw - dr) / ((1 - (raw / taw)) * taw)) if taw > 0 else 0.0
        et = ks * e
        dr = dr + et - p - i
        drain = max(0.0, -dr)
        dr = min(taw, max(0.0, dr))
        out_dr.append(dr); out_et.append(et); out_drain.append(drain)
    return {"dr": out_dr, "et": out_et, "drain": out_drain}


# ---------------------------------------------------------------- optimiser
def optimise(dr0: float, etc: list[float], pe: list[float], taw: float, raw: float, max_mm_day: list[float],
             solar_mm_day: Optional[list[float]] = None, mode: str = "water",
             budget_mm: Optional[float] = None) -> list[float]:
    """Smallest irrigation (net mm per day) that keeps Dr ≤ RAW on every day of the horizon.

    Greedy search: find the first day d with stress, add water on a day k ≤ d, re-simulate, repeat.
    Water added on day k only helps day d if the soil does not fill up in between (it would drain away):
    room[k] = smallest depletion between k and d.
      "water": k = the latest possible day (just in time: never pump before a rain that makes it useless).
      "solar": k = the day, among the SOLAR_WINDOW days before d, with the most solar-pumped water still free
               (the soil stores it like a battery); the latest possible day when no sun is left.
    Stops when the pump cannot supply more, or when the water budget (budget_mm: the authorised volume left,
    as net mm) is spent: the remaining stress days are then reported.
    """
    n = len(etc)
    irr = [0.0] * n
    for _ in range(1000):
        s = simulate(dr0, etc, pe, irr, taw, raw)
        d = next((i for i, v in enumerate(s["dr"]) if v > raw + 1e-6), None)
        if d is None:
            break
        need = s["dr"][d] - raw
        left_budget = float("inf") if budget_mm is None else budget_mm - sum(irr)
        if left_budget <= 1e-6:
            break                                             # authorised volume spent
        room = {k: min(s["dr"][k:d + 1]) for k in range(0, d + 1)}
        pump_left = {k: max_mm_day[k] - irr[k] for k in room}
        ok = [k for k in room if room[k] > 1e-6 and pump_left[k] > 1e-6]
        if not ok:
            break                                             # pump too small: stress cannot be avoided
        k, cap = max(ok), None
        if mode == "solar" and solar_mm_day is not None:
            sunny = [k_ for k_ in ok if k_ >= d - SOLAR_WINDOW and solar_mm_day[k_] - irr[k_] > 1e-6]
            if sunny:
                k = max(sunny, key=lambda k_: (solar_mm_day[k_] - irr[k_], k_))
                cap = solar_mm_day[k] - irr[k]
        limit = min(room[k], pump_left[k], cap if cap is not None else float("inf"), left_budget)
        add = min(need, limit)
        stepped = math.ceil(add / STEP_MM - 1e-9) * STEP_MM    # whole mm, unless the limit is below that
        irr[k] += stepped if stepped <= limit + 1e-9 else add
    return irr


# ---------------------------------------------------------------- pumping hours
def pumping_schedule(volume_m3: float, ghi: list[float], flow_m3h: Optional[float], head_m: Optional[float],
                     pump_eff: float, pv_kwp: Optional[float], pr: float) -> dict[str, Any]:
    """Put a day's volume into the sunniest hours first; what the solar array cannot lift is pumped on other power."""
    kwh_m3 = head_m / (367 * pump_eff) if head_m and pump_eff else None
    if volume_m3 <= 0:
        return dict(hours=[], solar_kwh=0.0, other_kwh=0.0, solar_share=None)
    if not (flow_m3h and flow_m3h > 0):
        return dict(hours=[], solar_kwh=None, other_kwh=None, solar_share=None, note="pump flow unknown")
    order = sorted(range(len(ghi)), key=lambda h: -ghi[h])
    left, hours, solar_kwh, other_kwh = volume_m3, [], 0.0, 0.0
    for h in order:
        if left <= 1e-6 or len(hours) >= PUMP_HOURS_MAX:
            break
        pv = pv_kwp * ghi[h] / 1000 * pr if pv_kwp else 0.0                 # kW available this hour
        q_solar = min(flow_m3h, pv / kwh_m3) if kwh_m3 and pv > 0 else 0.0  # m³ the sun can lift this hour
        q = min(flow_m3h, left)
        s = min(q, q_solar)
        hours.append(dict(hour=h, m3=round(q, 2), solar_m3=round(s, 2)))
        if kwh_m3:
            solar_kwh += s * kwh_m3
            other_kwh += (q - s) * kwh_m3
        left -= q
    hours.sort(key=lambda x: x["hour"])
    tot = solar_kwh + other_kwh
    return dict(hours=hours, solar_kwh=round(solar_kwh, 2) if kwh_m3 else None, other_kwh=round(other_kwh, 2) if kwh_m3 else None,
                solar_share=round(solar_kwh / tot, 3) if tot > 0 else None, unmet_m3=round(max(0.0, left), 2))


def solar_capacity_m3(ghi: list[float], flow_m3h: Optional[float], head_m: Optional[float], pump_eff: float,
                      pv_kwp: Optional[float], pr: float) -> Optional[float]:
    """Water the solar array alone can lift in a day (m³), within the pump's flow and running hours."""
    if not (flow_m3h and head_m and pv_kwp and pump_eff):
        return None
    kwh_m3 = head_m / (367 * pump_eff)
    per_h = sorted((min(flow_m3h, pv_kwp * g / 1000 * pr / kwh_m3) for g in ghi), reverse=True)
    return sum(per_h[:PUMP_HOURS_MAX])


def month_allowed(months: Optional[list[int]], month: int) -> bool:
    """months: 12 flags (1 = irrigated month) from the page; None = every month."""
    return not months or len(months) != 12 or bool(months[month - 1])


def quota_budget_m3(dates: list[str], quota_m3_month: Optional[list[float]], used_m3: Optional[dict[str, float]] = None) -> Optional[float]:
    """Authorised volume for these days: each day gets its month's quota spread evenly over the month."""
    if not quota_m3_month or len(quota_m3_month) != 12:
        return None
    import calendar
    tot = 0.0
    for d in dates:
        y, m = int(d[:4]), int(d[5:7])
        q = quota_m3_month[m - 1]
        if q is None:
            return None
        tot += max(0.0, float(q)) / calendar.monthrange(y, m)[1]
    return tot


# ---------------------------------------------------------------- full plan
def build_plan(days: list[dict], theta0: float, site_th: dict, monthly_pe: Optional[list[float]], crop: str, kc: float,
               area_ha: Optional[float], ea: float, head_m: Optional[float], pump_eff: float, flow_m3h: Optional[float],
               pv_kwp: Optional[float], pr: float, sun: dict[str, list[float]], mode: str = "solar",
               irrigated_mm: float = 0.0, plan_override: Optional[list[float]] = None, margin: float = 0.0,
               months: Optional[list[int]] = None, quota_m3_month: Optional[list[float]] = None) -> dict[str, Any]:
    """days: the soil forecast's days (date, rain_mm, et0_mm). theta0: today's root-zone soil moisture (m³/m³).
    margin: safety margin as a share of TAW (the soil model's usual error): the plan aims at Dr ≤ RAW − margin·TAW.
    months: irrigated months (no irrigation planned in the others). quota_m3_month: authorised volume per month (m³,
    whole parcel): the plan never pumps more than the quota of these days."""
    c = CROPS.get(crop, CROPS["other"])
    span = site_th["humide"] - site_th["sec"]
    taw = 1000 * span * c["zr"]
    raw = c["p"] * taw
    dr0 = min(taw, max(0.0, (site_th["humide"] - theta0) * 1000 * c["zr"] - irrigated_mm))
    area = area_ha if area_ha and area_ha > 0 else 1.0
    n = len(days)
    etc = [kc * (d["et0_mm"] or 0.0) for d in days]
    share = [monthly_pe[int(d["date"][5:7]) - 1] if monthly_pe else None for d in days]
    from .nexus import effective_rain as usda
    pe = [(d["rain_mm"] or 0.0) * s if s is not None else min(d["rain_mm"] or 0.0, usda(d["rain_mm"] or 0.0)) for d, s in zip(days, share)]
    ghi = [sun.get(d["date"], [0.0] * 24) for d in days]

    to_net = lambda m3: m3 * ea / (10 * area)          # m³ pumped → net mm in the root zone
    max_mm = [(to_net(flow_m3h * PUMP_HOURS_MAX) if flow_m3h else 1e9) if month_allowed(months, int(d["date"][5:7])) else 0.0
              for d in days]
    q_m3 = quota_budget_m3([d["date"] for d in days], quota_m3_month)
    budget = to_net(q_m3) if q_m3 is not None else None
    sol_m3 = [solar_capacity_m3(g, flow_m3h, head_m, pump_eff, pv_kwp, pr) for g in ghi]
    sol_mm = [to_net(v) for v in sol_m3] if all(v is not None for v in sol_m3) else None

    if plan_override is not None:
        irr = [float(x) for x in plan_override][:n] + [0.0] * max(0, n - len(plan_override))
        mode_used = "custom"
    else:
        mode_used = mode if (mode != "solar" or sol_mm is not None) else "water"
        irr = optimise(dr0, etc, pe, taw, max(0.0, raw - margin * taw), max_mm, sol_mm, mode_used, budget)
    with_plan = simulate(dr0, etc, pe, irr, taw, raw)
    without = simulate(dr0, etc, pe, [0.0] * n, taw, raw)
    replace = [max(0.0, e - p) for e, p in zip(etc, pe)]                # "replace each day what the crop used" (quota method)

    out_days, tot = [], dict(net_mm=0.0, m3=0.0, solar_kwh=0.0, other_kwh=0.0, drain_mm=0.0)
    for i, d in enumerate(days):
        m3 = 10 * irr[i] / ea * area
        sched = pumping_schedule(m3, ghi[i], flow_m3h, head_m, pump_eff, pv_kwp, pr)
        out_days.append(dict(
            date=d["date"], is_today=d.get("is_today", False), rain_mm=d["rain_mm"], et0_mm=d["et0_mm"],
            etc_mm=round(etc[i], 2), effective_rain_mm=round(pe[i], 2), irrigation_net_mm=round(irr[i], 1),
            irrigation_m3=round(m3, 1), reserve=round(1 - with_plan["dr"][i] / taw, 3) if taw else None,
            reserve_without=round(1 - without["dr"][i] / taw, 3) if taw else None,
            stress_without=without["dr"][i] > raw + 1e-6, drainage_mm=round(with_plan["drain"][i], 2),
            solar_irradiance_kwh_m2=round(sum(ghi[i]) / 1000, 2), pumping=sched))
        tot["net_mm"] += irr[i]; tot["m3"] += m3; tot["drain_mm"] += with_plan["drain"][i]
        tot["solar_kwh"] += sched.get("solar_kwh") or 0.0; tot["other_kwh"] += sched.get("other_kwh") or 0.0
    kwh = tot["solar_kwh"] + tot["other_kwh"]
    base_m3 = sum(10 * r / ea * area for r in replace)
    return dict(
        mode=mode_used, crop=crop, kc=kc, area_ha=area, per_ha=not (area_ha and area_ha > 0),
        limits=dict(months_off=[m for m in range(1, 13) if not month_allowed(months, m)],
                    quota_m3=round(q_m3, 1) if q_m3 is not None else None,
                    quota_reached=bool(q_m3 is not None and plan_override is None and sum(irr) >= budget - 0.05 and budget > 0)),
        soil=dict(taw_mm=round(taw, 1), raw_mm=round(raw, 1), zr_m=c["zr"], p=c["p"], start_reserve=round(1 - dr0 / taw, 3),
                  stress_threshold=round(1 - c["p"], 3), safety_margin=round(margin, 3), target_reserve=round(1 - c["p"] + margin, 3), end_reserve=out_days[-1]["reserve"], end_reserve_without=out_days[-1]["reserve_without"]),
        days=out_days,
        totals=dict(net_mm=round(tot["net_mm"], 1), m3=round(tot["m3"], 1), drainage_mm=round(tot["drain_mm"], 1),
                    solar_kwh=round(tot["solar_kwh"], 1) if head_m else None, other_kwh=round(tot["other_kwh"], 1) if head_m else None,
                    solar_share=round(tot["solar_kwh"] / kwh, 3) if kwh > 0 else None,
                    stress_days=sum(1 for v in with_plan["dr"] if v > raw + 1e-6),
                    stress_days_without=sum(1 for v in without["dr"] if v > raw + 1e-6)),
        baseline=dict(name="replace each day the crop's use (Kc × ET0 − effective rain), as the monthly quota does",
                      m3=round(base_m3, 1), net_mm=round(sum(replace), 1),
                      saved_m3=round(base_m3 - tot["m3"], 1),
                      soil_borrowed_mm=round(with_plan["dr"][-1] - dr0, 1)),
    )


async def plan(lat: float, lon: float, crop: str = "olive", kc: float = 0.65, area_ha: Optional[float] = None, ea: float = 0.9,
               head_m: Optional[float] = None, pump_eff: float = 0.45, flow_m3h: Optional[float] = None,
               pv_kwp: Optional[float] = None, pr: float = 0.75, mode: str = "solar", irrigated_mm: float = 0.0,
               plan_override: Optional[list[float]] = None, months: Optional[list[int]] = None,
               quota_m3_month: Optional[list[float]] = None) -> dict[str, Any]:
    fc = await irrigation.forecast(lat, lon)
    th = irrigation.load()["meta"]["seuils_sites"][fc["reference_site"]["id"]]
    from . import farm_state
    reported = farm_state.recent_irrigation_mm(lat, lon)              # irrigations the farmer reported since yesterday
    irrigated_mm = (irrigated_mm or 0.0) + reported
    pe = effective_rain_share(lat, lon)
    try:
        sun = await solar_hours(lat, lon)
    except Exception:
        sun = {}
    days = fc["days"]
    theta0 = days[0]["soil_moisture"] if days and days[0]["is_today"] else fc["state"]["soil_moisture"]
    margin = days[0]["reserve_error"] if days else 0.0                 # the soil model's usual error today
    out = build_plan(days, theta0, th, pe["monthly"], crop, kc, area_ha, ea, head_m, pump_eff, flow_m3h, pv_kwp, pr,
                     sun, mode, irrigated_mm, plan_override, margin, months, quota_m3_month)
    out["sources"] = dict(
        soil_state=f"trained LightGBM soil model, today's estimate from {fc['state']['date']} (ECMWF IFS)",
        effective_rain=("trained effective-rain model, nearest site " + pe["site"]["nom"]) if pe["site"] else "USDA-SCS (model missing)",
        weather="Open-Meteo forecast, ECMWF IFS", solar="hourly shortwave radiation forecast, ECMWF IFS" if sun else None,
        soil_limits=f"nearest training site {fc['reference_site']['nom']} (5th / 95th soil-moisture percentiles)",
        crop="FAO-56 table 22 (Zr, p), low values, to check")
    out["reference_site"] = fc["reference_site"]
    out["reported_irrigation_mm"] = reported
    return out


# ---------------------------------------------------------------- season replay (evaluation on real past data)
def _hourly_profile(kwh_m2_day: float, doy: int, lat: float) -> list[float]:
    """Spread a daily irradiation (kWh/m²) over the daylight hours with a sine shape (W/m² per hour)."""
    decl = 0.409 * math.sin(2 * math.pi * doy / 365 - 1.39)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(math.radians(lat)) * math.tan(decl))))
    n = 24 * ws / math.pi                                     # day length (h), FAO-56 eq. 34
    rise = 12.5 - n / 2                                       # solar noon ≈ 12:30 in Tunisia (UTC+1)
    w = [max(0.0, math.sin(math.pi * (h + 0.5 - rise) / n)) for h in range(24)]
    s = sum(w) or 1.0
    return [kwh_m2_day * 1000 * x / s for x in w]


def replay_season(lat: float, lon: float, start: str = "2025-05-01", end: str = "2025-09-30", crop: str = "olive",
                  kc: float = 0.65, area_ha: Optional[float] = None, ea: float = 0.9, head_m: Optional[float] = None,
                  pump_eff: float = 0.45, flow_m3h: Optional[float] = None, pv_kwp: Optional[float] = None, pr: float = 0.75,
                  margin: float = 0.05, months: Optional[list[int]] = None,
                  quota_m3_month: Optional[list[float]] = None) -> dict[str, Any]:
    """Replay a past season day by day on the nearest training site's real data (ml/data).

    Weather is what actually happened (a perfect forecast: an upper bound for the planner). The soil is the
    FAO-56 water balance, started from the real soil moisture on the first day. Strategies compared:
      quota       replace every day the crop's use (Kc·ET0 − effective rain): what the monthly quota assumes
      fao_refill  classic FAO-56 schedule: when the reserve reaches the stress threshold, refill to field capacity
      mpc_water   GAIA planner, least water, re-planned every morning over 8 days, only day 1 applied
      mpc_solar   GAIA planner, sun first (the soil stores water pumped on sunny days)
    """
    import pandas as pd
    site = irrigation.nearest_site(lat, lon)
    f = irrigation.ROOT / "ml" / "data" / f"{site['id']}.csv"
    if not f.exists():
        raise ValueError(f"No data file for {site['nom']}")
    df = pd.read_csv(f, parse_dates=["date"])
    t0, t1 = pd.Timestamp(start), pd.Timestamp(end)
    df = df[(df.date >= t0 - pd.Timedelta(days=1)) & (df.date <= t1 + pd.Timedelta(days=8))].reset_index(drop=True)
    if len(df) < 10 or df.date.min() > t0 - pd.Timedelta(days=1):
        raise ValueError("Not enough data for this period")
    th = irrigation.load()["meta"]["seuils_sites"][site["id"]]
    c = CROPS.get(crop, CROPS["other"])
    taw = 1000 * (th["humide"] - th["sec"]) * c["zr"]
    raw = c["p"] * taw
    target = max(0.0, raw - margin * taw)
    share = effective_rain_share(lat, lon)["monthly"]
    area = area_ha if area_ha and area_ha > 0 else 1.0
    rows = df.iloc[1:].reset_index(drop=True)                 # day 0 = start
    etc = [kc * float(e) for e in rows.et0]
    pe = [float(p) * (share[d.month - 1] if share else 0.65) for p, d in zip(rows.pluie, rows.date)]
    ghi = [_hourly_profile(float(r.rayonnement) / 3.6, r.date.dayofyear, lat) for r in rows.itertuples()]
    to_net = lambda m3: m3 * ea / (10 * area)
    max_mm = [(to_net(flow_m3h * PUMP_HOURS_MAX) if flow_m3h else 1e9) if month_allowed(months, d.month) else 0.0
              for d in rows.date]
    has_quota = bool(quota_m3_month and len(quota_m3_month) == 12 and all(q is not None for q in quota_m3_month))
    sol = [solar_capacity_m3(g, flow_m3h, head_m, pump_eff, pv_kwp, pr) for g in ghi]
    sol_mm = [to_net(v) for v in sol] if all(v is not None for v in sol) else None
    n_days = int((rows.date <= t1).sum())
    dr_start = min(taw, max(0.0, (th["humide"] - float(df.sm_7_28.iloc[0])) * 1000 * c["zr"]))

    def run(strategy: str) -> dict[str, Any]:
        dr, tot = dr_start, dict(net_mm=0.0, m3=0.0, stress_days=0, drain_mm=0.0, solar_kwh=0.0, other_kwh=0.0, pump_days=0)
        used = {}                                             # m³ pumped per month, against the monthly quota
        for d in range(n_days):
            mk = rows.date.iloc[d].strftime("%Y-%m")
            left = to_net(max(0.0, float(quota_m3_month[rows.date.iloc[d].month - 1]) - used.get(mk, 0.0))) if has_quota else None
            if strategy == "quota":
                i = max(0.0, etc[d] - pe[d])
            elif strategy == "fao_refill":
                i = dr + etc[d] - pe[d] if dr + etc[d] - pe[d] > raw else 0.0
            else:
                w = slice(d, min(d + 8, len(rows)))
                qb = quota_budget_m3([x.strftime("%Y-%m-%d") for x in rows.date.iloc[w]], quota_m3_month) if has_quota else None
                plan = optimise(dr, etc[w], pe[w], taw, target, max_mm[w], sol_mm[w] if sol_mm else None,
                                "solar" if strategy == "mpc_solar" and sol_mm else "water",
                                to_net(qb) if qb is not None else None)
                i = plan[0]
            i = min(i, max_mm[d])
            if left is not None:
                i = min(i, left)                              # every strategy stops at the monthly quota
            ks = 1.0 if dr <= raw else max(0.0, (taw - dr) / ((1 - c["p"]) * taw))
            dr = dr + ks * etc[d] - pe[d] - i
            tot["drain_mm"] += max(0.0, -dr)
            dr = min(taw, max(0.0, dr))
            tot["stress_days"] += dr > raw + 1e-6
            m3 = 10 * i / ea * area
            used[mk] = used.get(mk, 0.0) + m3
            tot["net_mm"] += i; tot["m3"] += m3; tot["pump_days"] += i > 0
            sch = pumping_schedule(m3, ghi[d], flow_m3h, head_m, pump_eff, pv_kwp, pr)
            tot["solar_kwh"] += sch.get("solar_kwh") or 0.0; tot["other_kwh"] += sch.get("other_kwh") or 0.0
        kwh = tot["solar_kwh"] + tot["other_kwh"]
        return dict(net_mm=round(tot["net_mm"], 1), m3=round(tot["m3"]), stress_days=tot["stress_days"],
                    drainage_mm=round(tot["drain_mm"], 1), pump_days=tot["pump_days"],
                    solar_kwh=round(tot["solar_kwh"]) if head_m else None, other_kwh=round(tot["other_kwh"]) if head_m else None,
                    solar_share=round(tot["solar_kwh"] / kwh, 3) if kwh > 0 else None,
                    end_reserve=round(1 - dr / taw, 3))

    res = {s: run(s) for s in ("quota", "fao_refill", "mpc_water", "mpc_solar")}
    q = res["quota"]["m3"]
    for s in res:
        res[s]["saved_vs_quota"] = round(1 - res[s]["m3"] / q, 3) if q else None
    return dict(site=site, period=[start, rows.date.iloc[n_days - 1].strftime("%Y-%m-%d")], days=n_days, crop=crop, kc=kc,
                area_ha=area, per_ha=not (area_ha and area_ha > 0), start_reserve=round(1 - dr_start / taw, 3),
                stress_threshold=round(1 - c["p"], 3), strategies=res,
                limits=dict(months_off=[m for m in range(1, 13) if not month_allowed(months, m)], quota=has_quota),
                note="Real weather of the period used as a perfect forecast; soil simulated with the FAO-56 water balance "
                     "from the real soil moisture of the first day; hourly sun rebuilt from the daily total.")
