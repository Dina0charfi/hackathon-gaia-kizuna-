"""Bundled open-data fallbacks for Tunisia, shared with the static site.

- from_power(): same FAO-56 computation as js/climate-core.js (NASA POWER monthly
  climatology → rain, ET0, hottest-month Tmax, coldest-month Tmin, monthly series).
- climate_table(): bilinear lookup in data/climate_tn.json (NASA POWER 2001–2025 normals
  on the 0.5° × 0.625° grid), same numbers as js/climate-tn.js.
- soil_grid(): 5 km cell of data/soil_grid_tn.json (SoilGrids 2.0, 0–30 cm), same
  numbers as js/soil-grid-tn.js.
Both tables are built by tools/tn-grids/pack.py.
"""
from __future__ import annotations

import base64
import json
import math
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
PARAMS = ["PRECTOTCORR", "T2M", "T2M_RANGE", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "TOA_SW_DWN"]


def _esat(t: float) -> float:
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def et0_day(t, rng, rh, u2, rs, ra, z, t_prev, t_next) -> float:
    """FAO-56 Penman–Monteith on monthly means; rs, ra in MJ/m²/day → mm/day."""
    tmax, tmin = t + rng / 2, t - rng / 2
    p = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26
    gamma = 0.000665 * p
    delta = 4098 * _esat(t) / (t + 237.3) ** 2
    es = (_esat(tmax) + _esat(tmin)) / 2
    ea = max(0.0, min(1.0, rh / 100)) * es
    rso = (0.75 + 2e-5 * z) * ra
    ratio = min(1.0, rs / rso) if rso > 0 else 0.5
    rnl = 4.903e-9 * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2 * (0.34 - 0.14 * math.sqrt(ea)) * (1.35 * ratio - 0.35)
    rn = 0.77 * rs - rnl
    g = 0.07 * (t_next - t_prev)
    v = (0.408 * delta * (rn - g) + gamma * 900 / (t + 273) * u2 * (es - ea)) / (delta + gamma * (1 + 0.34 * u2))
    return max(0.0, v)


def from_power(p: dict, z: float | None, fill: float = -999) -> dict | None:
    if any(k not in p for k in PARAMS):
        return None

    def get(k, m):
        v = p[k].get(MONTHS[m])
        return None if v is None or v == fill else float(v)

    rain, et0, tmax, tmin = [], [], [], []
    for m in range(12):
        pr, t, r, rh, u, rs, ra = (get(k, m) for k in PARAMS)
        tp, tn = get("T2M", (m + 11) % 12), get("T2M", (m + 1) % 12)
        rain.append(None if pr is None else pr * DAYS[m])
        tmax.append(None if t is None or r is None else t + r / 2)
        tmin.append(None if t is None or r is None else t - r / 2)
        vals = [t, r, rh, u, rs, ra, tp, tn]
        et0.append(None if any(v is None for v in vals) else et0_day(t, r, rh, u, rs * 3.6, ra * 3.6, z or 0, tp, tn) * DAYS[m])
    total = lambda a: None if any(v is None for v in a) else sum(a)
    ok = lambda a: [v for v in a if v is not None]
    return {"rain_mm": total(rain), "et0_mm": total(et0),
            "tmax_hot": max(ok(tmax)) if ok(tmax) else None, "tmin_cold": min(ok(tmin)) if ok(tmin) else None,
            "monthly": {"rain": rain, "et0": et0, "tmax": tmax, "tmin": tmin}}


def _km(a_lat, a_lon, b_lat, b_lon) -> float:
    r = math.pi / 180
    h = math.sin((b_lat - a_lat) * r / 2) ** 2 + math.cos(a_lat * r) * math.cos(b_lat * r) * math.sin((b_lon - a_lon) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


@lru_cache(maxsize=None)
def _load(name: str):
    meta = json.loads((DATA / name).read_text(encoding="utf-8"))
    return meta, base64.b64decode(meta["data"])


def climate_table(lat: float, lon: float) -> dict | None:
    meta, u = _load("climate_tn.json")
    la, lo = meta["lats"], meta["lons"]
    fy, fx = (lat - la[0]) / (la[1] - la[0]), (lon - lo[0]) / (lo[1] - lo[0])
    if fy < -0.5 or fx < -0.5 or fy > len(la) - 0.5 or fx > len(lo) - 0.5:
        return None
    fy, fx = max(0, min(len(la) - 1.0001, fy)), max(0, min(len(lo) - 1.0001, fx))
    y, x = int(fy), int(fx)
    ty, tx = fy - y, fx - x
    w = [(y, x, (1 - ty) * (1 - tx)), (y, x + 1, (1 - ty) * tx), (y + 1, x, ty * (1 - tx)), (y + 1, x + 1, ty * tx)]

    def point(i):
        o = i * 48
        return {"rain": [u[o + m] for m in range(12)], "et0": [u[o + 12 + m] * 2 for m in range(12)],
                "tmax": [u[o + 24 + m] / 4 - 20 for m in range(12)], "tmin": [u[o + 36 + m] / 4 - 20 for m in range(12)]}

    pts = [(point(a * len(lo) + b), wt) for a, b, wt in w]
    out = {k: [sum(p[k][m] * wt for p, wt in pts) for m in range(12)] for k in ("rain", "et0", "tmax", "tmin")}
    near = min(_km(lat, lon, la[a], lo[b]) for a, b, _ in w)
    return {"rain_mm": sum(out["rain"]), "et0_mm": sum(out["et0"]), "tmax_hot": max(out["tmax"]), "tmin_cold": min(out["tmin"]),
            "monthly": out, "km": round(near), "source": meta["source"], "url": meta["url"]}


def soil_grid(lat: float, lon: float) -> dict | None:
    meta, u = _load("soil_grid_tn.json")
    n_lat, n_lon, step, lat0, lon0 = meta["nLat"], meta["nLon"], meta["step"], meta["lat0"], meta["lon0"]
    n = n_lat * n_lon
    r0, c0 = math.floor((lat - lat0) / step), math.floor((lon - lon0) / step)
    best = None
    for dr in range(-2, 3):
        for dc in range(-2, 3):
            r, c = r0 + dr, c0 + dc
            if not (0 <= r < n_lat and 0 <= c < n_lon):
                continue
            k = r * n_lon + c
            if u[k] == 255:
                continue
            c_lat, c_lon = lat0 + (r + 0.5) * step, lon0 + (c + 0.5) * step
            d = 0 if dr == 0 and dc == 0 else _km(lat, lon, c_lat, c_lon)
            if best is None or d < best["km"]:
                best = {"clay_pct": u[k], "sand_pct": u[n + k], "soc": round(u[2 * n + k] * 2) / 10, "km": d}
    if best:
        best.update(km=round(best["km"]), source=meta["source"], url=meta["url"])
    return best


def texture_of(sand, clay):
    if clay is None:
        return None
    if clay >= 35:
        return "clayey"
    if sand is not None and sand >= 65 and clay < 15:
        return "sandy"
    return "loamy"
