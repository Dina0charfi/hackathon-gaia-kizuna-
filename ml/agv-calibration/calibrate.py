"""
GAIA Solar Brain: calibrate the crop shade response on a real crop model.

The browser model (js/agv-ai-core.js) uses, for each crop,
    light factor  fL = min(1, L / Ls) ** g        L = share of full sun reaching the crop
with Ls and g set from the literature as "indicative" values.

This script replaces that guess with numbers from WOFOST (the crop model of
Wageningen University, used by the EU MARS crop-yield forecasts), run through
PCSE on 20+ years of NASA POWER weather at Tunisian sites:

  1. download daily weather for each site from NASA POWER (free, no key);
  2. run WOFOST in potential production (water and nutrients unlimited, so only
     light and temperature act) for every season and for light shares
     L = 1.0, 0.9, ..., 0.3. Under the panels, radiation is multiplied by L and
     the daily maximum temperature lowered by 4 °C x (1 - L), the same
     assumption as the browser model;
  3. yrel(L) = mean yield at L / mean yield in full sun;
  4. fit Ls and g of the browser formula to yrel(L) by least squares.

Output: models/agv-calibration/calibration.json (fitted values, fit error, the
raw yrel curve, sites, seasons, and the literature values it replaces).

WOFOST has parameters for wheat and potato among GAIA's crops; the other GAIA
crops (tomato, pepper, lettuce, strawberry, alfalfa) keep their literature
values until field trial data exist.

Run:  python -m pip install pcse
      python ml/agv-calibration/calibrate.py            (needs internet once)
"""
import copy
import datetime as dt
import json
import math
import os
import sys
import warnings

warnings.filterwarnings("ignore")

from pcse.input import NASAPowerWeatherDataProvider, YAMLCropDataProvider, WOFOST72SiteDataProvider, DummySoilDataProvider
from pcse.base import ParameterProvider, WeatherDataProvider
from pcse.models import Wofost72_PP

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "models", "agv-calibration", "calibration.json")

# Tunisian sites across the north-south gradient (lat, lon)
SITES = {
    "Jendouba": (36.50, 8.78),
    "Tunis": (36.80, 10.18),
    "Kairouan": (35.68, 10.10),
    "Sidi Bouzid": (35.04, 9.48),
}
YEARS = list(range(2001, 2024))
LIGHT = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]
DT_MAX = 4.0  # same as js/agv-ai-core.js

# GAIA crop key -> WOFOST crop, variety, sowing (month, day), harvest (month, day, +years)
CROPS = {
    "wheat": dict(crop="wheat", variety="Winter_wheat_101", sow=(11, 20), end=(6, 30, 1)),
    "potato": dict(crop="potato", variety="Potato_701", sow=(1, 20), end=(6, 15, 0)),
}
LITERATURE = {"wheat": {"Ls": 0.9, "g": 1.0}, "potato": {"Ls": 0.75, "g": 0.8}}


class ShadedWeather(WeatherDataProvider):
    """Copy of a PCSE weather provider as seen under the panels: radiation x L, Tmax lowered."""

    def __init__(self, wdp, L):
        WeatherDataProvider.__init__(self)
        self.description = list(wdp.description) + ["shaded, light share %.2f" % L]
        for k in ("latitude", "longitude", "elevation", "ETmodel", "angstA", "angstB"):
            if hasattr(wdp, k):
                setattr(self, k, getattr(wdp, k))
        dT = DT_MAX * (1 - L)
        for (day, _mid), w in wdp.store.items():
            n = copy.copy(w)
            n.IRRAD = w.IRRAD * L
            n.TMAX = max(w.TMIN, w.TMAX - dT)
            n.TEMP = (n.TMAX + n.TMIN) / 2
            n.DTEMP = (n.TMAX + n.TEMP) / 2
            self._store_WeatherDataContainer(n, day)


def agro(c, year):
    sow = dt.date(year, *c["sow"])
    end = dt.date(year + c["end"][2], c["end"][0], c["end"][1])
    return [{sow: {"CropCalendar": {
        "crop_name": c["crop"], "variety_name": c["variety"], "crop_start_date": sow,
        "crop_start_type": "sowing", "crop_end_date": end, "crop_end_type": "harvest", "max_duration": 300},
        "TimedEvents": None, "StateEvents": None}}]


def run(params, wdp, c, year):
    try:
        m = Wofost72_PP(params, wdp, agro(c, year))
        m.run_till_terminate()
        tw = m.get_summary_output()[0].get("TWSO")
        return float(tw) if tw is not None else None
    except Exception:
        return None


def fit(curve):
    """Least squares on min(1, L/Ls)^g over a grid (the formula is not smooth at L = Ls)."""
    best = None
    for Ls in [x / 100 for x in range(30, 101)]:
        for g in [x / 100 for x in range(20, 201, 2)]:
            err = sum((min(1.0, L / Ls) ** g - y) ** 2 for L, y in curve)
            if best is None or err < best[0]:
                best = (err, Ls, g)
    rmse = math.sqrt(best[0] / len(curve))
    return {"Ls": best[1], "g": best[2], "rmse": round(rmse, 4)}


def main():
    cropd = YAMLCropDataProvider()
    soil = DummySoilDataProvider()
    site = WOFOST72SiteDataProvider(WAV=100)
    weather = {}
    for name, (lat, lon) in SITES.items():
        print("NASA POWER:", name, flush=True)
        weather[name] = NASAPowerWeatherDataProvider(latitude=lat, longitude=lon)

    result = {"generated": dt.date.today().isoformat(), "model": "WOFOST 7.2 potential production (PCSE)",
              "weather": "NASA POWER daily", "sites": SITES, "years": [YEARS[0], YEARS[-1]],
              "assumption": "under panels: radiation x L, Tmax - 4 °C x (1 - L)", "crops": {}}
    for key, c in CROPS.items():
        cropd.set_active_crop(c["crop"], c["variety"])
        params = ParameterProvider(cropdata=cropd, soildata=soil, sitedata=site)
        sums = {L: 0.0 for L in LIGHT}
        n = 0
        for name, wdp in weather.items():
            shaded = {L: ShadedWeather(wdp, L) for L in LIGHT}
            for y in YEARS:
                ys = {L: run(params, shaded[L], c, y) for L in LIGHT}
                if any(v is None for v in ys.values()) or not ys[1.0]:
                    continue
                for L in LIGHT:
                    sums[L] += ys[L] / ys[1.0]
                n += 1
            print(f"  {key} {name}: {n} seasons so far", flush=True)
        if not n:
            print("  no season ran for", key)
            continue
        curve = [(L, sums[L] / n) for L in LIGHT]
        f = fit(curve)
        result["crops"][key] = {"wofost": c["crop"] + " / " + c["variety"], "seasons": n,
                                "yrel": [[L, round(y, 4)] for L, y in curve], "fit": f,
                                "literature": LITERATURE[key]}
        print(f"  {key}: Ls={f['Ls']} g={f['g']} rmse={f['rmse']}  curve={[round(y, 3) for _, y in curve]}")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    print("wrote", OUT)


if __name__ == "__main__":
    sys.exit(main())
