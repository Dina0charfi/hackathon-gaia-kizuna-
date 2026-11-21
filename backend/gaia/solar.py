"""GAIA AGRIVOLTAIC (M3) — backend version using pvlib.

Same structure as js/solar-core.js, with pvlib for the physics:
- sun position: pvlib.solarposition.get_solarposition (SPA), real times at the site
- hourly profile: monthly mean daily GHI spread over the representative day in
  proportion to cos(zenith), then split into DNI / DHI with pvlib.irradiance.erbs
- plane of array: pvlib.irradiance.get_total_irradiance, isotropic sky
- ground shading: 2-D cross-section of infinitely long rows (GAIA's own model)
This is a SIMULATION. It is not a measurement and it is not a crop-yield model.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence

import numpy as np
import pandas as pd
import pvlib

DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def shade_fraction(el: float, az: float, tilt: float, azimuth: float, height: float, width: float, pitch: float) -> float:
    if el <= 0:
        return 1.0
    c = math.cos(math.radians(az - azimuth))
    cot = 1 / math.tan(math.radians(el))
    b, half = math.radians(tilt), width / 2
    x1, z1 = half * math.cos(b), height - half * math.sin(b)
    x2, z2 = -half * math.cos(b), height + half * math.sin(b)
    s1, s2 = x1 - z1 * c * cot, x2 - z2 * c * cot
    return min(1.0, abs(s1 - s2) / pitch)


def simulate(lat: float, lon: float, ghi: Sequence[Optional[float]], tilt: float = 20, azimuth: float = 180,
             height: float = 4, width: float = 2, pitch: float = 8, area_ha: float = 1,
             density_wp_m2: float = 200, pr: float = 0.8, albedo: float = 0.2, year: int = 2023) -> dict:
    gcr = width / pitch
    cover_h = min(1.0, width * math.cos(math.radians(tilt)) / pitch)
    kwp = area_ha * 10000 * gcr * density_wp_m2 / 1000
    months = []
    for m in range(12):
        H = ghi[m] if ghi else None
        if H is None:
            months.append(None)
            continue
        # 15-minute steps in UTC around the representative day (15th)
        times = pd.date_range(f"{year}-{m + 1:02d}-15 00:07:30", periods=96, freq="15min", tz="UTC")
        times = times + pd.Timedelta(hours=-lon / 15)  # roughly centre the day on local solar noon
        sp = pvlib.solarposition.get_solarposition(times, lat, lon)
        cosz = np.clip(np.cos(np.radians(sp["apparent_zenith"].values)), 0, None)
        if cosz.sum() == 0:
            months.append(None)
            continue
        ghi_w = H * 1000 * cosz / (cosz.sum() * 0.25)  # W/m², integrates to H kWh/m² over the day
        dec = pvlib.irradiance.erbs(ghi_w, sp["zenith"].values, times)
        dni = np.where(sp["apparent_elevation"].values > 3, dec["dni"], 0)
        dhi = np.asarray(dec["dhi"])
        tot = pvlib.irradiance.get_total_irradiance(tilt, azimuth, sp["apparent_zenith"].values, sp["azimuth"].values,
                                                    dni, ghi_w, dhi, albedo=albedo, model="isotropic")
        poa = float(np.nansum(tot["poa_global"]) * 0.25 / 1000)
        beam_h = ghi_w - dhi
        sh = np.array([shade_fraction(e, a, tilt, azimuth, height, width, pitch)
                       for e, a in zip(sp["apparent_elevation"].values, sp["azimuth"].values)])
        ground = float(np.sum((beam_h * (1 - sh) + dhi * (1 - cover_h)) * 0.25) / 1000)
        months.append({"month": m, "ghi": H, "poa": poa, "ground": ground, "light_share": ground / H if H else None,
                       "energy_kwh": kwp * poa * DAYS[m] * pr})
    ok = [x for x in months if x]
    summer = [x for x in ok if 5 <= x["month"] <= 7]
    share = lambda xs: (sum(x["ground"] * DAYS[x["month"]] for x in xs) / sum(x["ghi"] * DAYS[x["month"]] for x in xs)) if xs else None
    return {
        "label": "simulation", "model": f"pvlib {pvlib.__version__} (SPA, Erbs, isotropic) + GAIA 2-D row shading",
        "months": months, "kwp": kwp, "gcr": gcr, "cover_h": cover_h,
        "annual_kwh": sum(x["energy_kwh"] for x in ok), "light_share_year": share(ok), "light_share_summer": share(summer),
        "limits": ["representative day per month", "no temperature model (folded into PR)",
                   "infinite rows, no edge effects", "light share is not a crop-yield prediction"],
    }
