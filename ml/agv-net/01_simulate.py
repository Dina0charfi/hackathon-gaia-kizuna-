"""
GAIA AgriNet, step 1: build a training set with the WOFOST crop model.

For a grid of farming sites across northern and central Tunisia, every season
2001-2023, two crops (wheat, potato), a randomly shifted sowing date and eight
light shares under panels (L = 1.0 ... 0.3), WOFOST 7.2 (PCSE, potential
production) is run on NASA POWER daily weather. Under the panels, radiation is
multiplied by L and the daily maximum temperature lowered by 4 °C x (1 - L),
the same assumption as the browser model.

One row per (site, season, crop, L):
  site, lat, lon, year, crop, sow_shift, L,
  rad   (MJ/m², season sum of full-sun radiation),
  tmax, tmin (°C, season means), hot (days with Tmax > 30 °C),
  yield (kg/ha of storage organs, WOFOST TWSO), yield_full (same season in full sun),
  yrel = yield / yield_full

Output: ml/agv-net/data/wofost_tunisia.csv
Run:    python ml/agv-net/01_simulate.py      (internet once for NASA POWER; ~20-30 min)
"""
import csv
import datetime as dt
import os
import random
import sys
import warnings
from multiprocessing import Pool

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "agv-calibration"))
OUT = os.path.join(HERE, "data", "wofost_tunisia.csv")

# farming sites, north (Bizerte, Béja, Jendouba) to centre (Kairouan, Sidi Bouzid, Kasserine) and coast (Sousse, Mahdia, Sfax)
SITES = {
    "Bizerte": (37.27, 9.87), "Béja": (36.73, 9.18), "Jendouba": (36.50, 8.78), "Le Kef": (36.18, 8.71),
    "Siliana": (36.08, 9.37), "Zaghouan": (36.40, 10.14), "Tunis": (36.80, 10.18), "Nabeul": (36.45, 10.73),
    "Sousse": (35.83, 10.60), "Kairouan": (35.68, 10.10), "Mahdia": (35.50, 11.06), "Kasserine": (35.17, 8.83),
    "Sidi Bouzid": (35.04, 9.48), "Sfax": (34.74, 10.76),
}
YEARS = list(range(2001, 2023))
LIGHT = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3]
FIELDS = ["site", "lat", "lon", "year", "crop", "sow_shift", "L", "rad", "tmax", "tmin", "hot", "yield", "yield_full", "yrel"]


def season_stats(wdp, start, end):
    rad = tx = tn = hot = n = 0
    d = start
    while d <= end:
        w = wdp(d)
        rad += w.IRRAD / 1e6
        tx += w.TMAX
        tn += w.TMIN
        hot += 1 if w.TMAX > 30 else 0
        n += 1
        d += dt.timedelta(days=1)
    return rad, tx / n, tn / n, hot


def one_site(name):
    import calibrate as C
    from pcse.input import NASAPowerWeatherDataProvider, YAMLCropDataProvider, WOFOST72SiteDataProvider, DummySoilDataProvider
    from pcse.base import ParameterProvider
    from pcse.models import Wofost72_PP

    import logging
    logging.disable(logging.CRITICAL)   # PCSE's rotating log file breaks when 4 processes share it

    part = os.path.join(os.path.dirname(OUT), "parts", name + ".csv")
    if os.path.exists(part):            # already simulated: reuse
        with open(part, encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
        print(f"{name}: {len(rows)} rows (cached)", flush=True)
        return rows

    lat, lon = SITES[name]
    rnd = random.Random(sum(map(ord, name)))   # stable across runs (hash() is salted per process)
    try:
        wdp = NASAPowerWeatherDataProvider(latitude=lat, longitude=lon)
    except Exception as e:                      # e.g. a NASA POWER value outside PCSE's allowed range
        print(f"{name}: skipped, weather not usable ({str(e)[:120]})", flush=True)
        return []
    shaded = {L: (wdp if L == 1.0 else C.ShadedWeather(wdp, L)) for L in LIGHT}
    cropd = YAMLCropDataProvider()
    rows = []
    for key, c in C.CROPS.items():
        cropd.set_active_crop(c["crop"], c["variety"])
        params = ParameterProvider(cropdata=cropd, soildata=DummySoilDataProvider(), sitedata=WOFOST72SiteDataProvider(WAV=100))
        for y in YEARS:
            shift = rnd.randint(-20, 20)
            sow = dt.date(y, *c["sow"]) + dt.timedelta(days=shift)
            end = dt.date(y + c["end"][2], c["end"][0], c["end"][1]) + dt.timedelta(days=shift)
            cc = dict(c, sow=(sow.month, sow.day), end=(end.month, end.day, end.year - sow.year))
            ys = {}
            for L in LIGHT:
                try:
                    m = Wofost72_PP(params, shaded[L], C.agro(cc, sow.year))
                    m.run_till_terminate()
                    ys[L] = m.get_summary_output()[0].get("TWSO")
                except Exception:
                    ys[L] = None
            full = ys.get(1.0)
            if not full:
                continue
            rad, tx, tn, hot = season_stats(wdp, sow, end)
            for L in LIGHT:
                if ys[L] is None:
                    continue
                rows.append({"site": name, "lat": lat, "lon": lon, "year": y, "crop": key, "sow_shift": shift, "L": L,
                             "rad": round(rad, 1), "tmax": round(tx, 2), "tmin": round(tn, 2), "hot": hot,
                             "yield": round(ys[L], 1), "yield_full": round(full, 1), "yrel": round(ys[L] / full, 4)})
    os.makedirs(os.path.dirname(part), exist_ok=True)
    with open(part, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"{name}: {len(rows)} rows", flush=True)
    return rows


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with Pool(4) as pool:
        parts = pool.map(one_site, list(SITES))
    rows = [r for p in parts for r in p]
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print("wrote", len(rows), "rows to", OUT)


if __name__ == "__main__":
    main()
