"""GAIA WATER–ENERGY NEXUS (M4). Python port of js/nexus-core.js.

ETc = Kc × ET0 (FAO-56) · Pe = USDA-SCS monthly (as in FAO CROPWAT), or P × pe_factor[m] from the trained model
IRn = max(0, ETc − Pe) · IRg = IRn / Ea · V[m³] = 10 × IRg[mm] × A[ha]
E[kWh] = V × H / (367 × ηp) · kWp = E / (days × GHI × PR) on the peak month
The monthly quota is V: the agronomic need, never the pump's capacity.
"""
from __future__ import annotations

from typing import Optional, Sequence

DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def effective_rain(p: Optional[float]) -> Optional[float]:
    if p is None:
        return None
    if p <= 250:
        return max(0.0, p * (125 - 0.2 * p) / 125)
    return 125 + 0.1 * p


def compute(et0: Sequence[Optional[float]], rain: Sequence[Optional[float]], kc: Optional[float],
            months: Sequence[int] | None = None, area_ha: Optional[float] = None, ea: Optional[float] = 0.9,
            head_m: Optional[float] = None, pump_eff: Optional[float] = 0.45, pr: Optional[float] = 0.75,
            ghi: Sequence[Optional[float]] | None = None, prices: dict | None = None,
            pe_factor: Sequence[Optional[float]] | None = None) -> dict:
    months = list(months) if months is not None else [1] * 12
    missing = []
    if not (kc and kc > 0):
        missing.append("kc")
    if not (area_ha and area_ha > 0):
        missing.append("area")
    if not (head_m and head_m > 0):
        missing.append("head")
    if not ghi:
        missing.append("ghi")

    rows, tot = [], {"etc": 0.0, "pe": 0.0, "irn": 0.0, "irg": 0.0, "vol": 0.0, "kwh": 0.0}
    peak_kwp, peak_month = 0.0, None
    for m in range(12):
        on = bool(months[m])
        e0, p = et0[m], rain[m]
        etc = kc * e0 if (on and kc and e0 is not None) else 0.0
        # pe_factor: share of the rain that stays in the soil (trained model, ml/); otherwise USDA-SCS
        pe = p * pe_factor[m] if (pe_factor and pe_factor[m] is not None and p is not None) else effective_rain(p)
        irn = max(0.0, etc - pe) if (on and pe is not None) else 0.0
        irg = irn / ea if ea and ea > 0 else None
        vol = 10 * irg * area_ha if (irg is not None and area_ha and area_ha > 0) else None
        kwh = vol * head_m / (367 * pump_eff) if (vol is not None and head_m and pump_eff) else None
        g = ghi[m] if ghi else None
        kwp = kwh / (DAYS[m] * g * pr) if (kwh is not None and g and pr) else None
        if kwp is not None and kwp > peak_kwp:
            peak_kwp, peak_month = kwp, m
        rows.append({"month": m, "irrigated": on, "et0": e0, "rain": p, "etc": etc, "pe": pe, "irn": irn, "irg": irg,
                     "volume_m3": vol, "volume_m3_per_ha": 10 * irg if irg is not None else None,
                     "pump_kwh": kwh, "kwp": kwp, "quota_m3": vol})
        tot["etc"] += etc
        tot["pe"] += (pe or 0.0) if on else 0.0
        tot["irn"] += irn
        tot["irg"] += irg or 0.0
        tot["vol"] += vol or 0.0
        tot["kwh"] += kwh or 0.0

    costs = {}
    pr_ = prices or {}
    if tot["kwh"] > 0:
        if pr_.get("diesel_tnd_l") and pr_.get("diesel_kwh_l"):
            costs["diesel_tnd_year"] = tot["kwh"] / pr_["diesel_kwh_l"] * pr_["diesel_tnd_l"]
        if pr_.get("grid_tnd_kwh"):
            costs["grid_tnd_year"] = tot["kwh"] * pr_["grid_tnd_kwh"]
        if peak_month is not None and pr_.get("pv_tnd_kwp") and pr_.get("pv_life_y"):
            costs["solar_tnd_year"] = peak_kwp * pr_["pv_tnd_kwp"] / pr_["pv_life_y"]

    return {
        "months": rows, "totals": {**tot, "volume_m3_per_ha": 10 * tot["irg"]},
        "solar": {"kwp": peak_kwp, "peak_month": peak_month} if peak_month is not None else None,
        "costs": costs, "missing": missing,
        "principle": "Clean energy must not become unlimited water extraction: the quota is the agronomic need.",
    }
