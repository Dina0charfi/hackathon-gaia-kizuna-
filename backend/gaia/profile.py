"""GAIA LAND DNA — server-side profile builder.

Fetches the same public sources as js/landdna.js. Every field carries
{value, unit, source, resolution, period, confidence, status}. When a source
fails, the field is returned with status "error" — never a substituted value.
Soil: the SoilGrids REST API is paused by ISRIC; set GAIA_SOIL_RASTER to a local
SoilGrids GeoTIFF (e.g. clay 0–30 cm) to read it with rasterio, otherwise soil comes from the
regional reference table (data/soil_tn.json, exported from js/soil-tn.js) with confidence "low".
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
from statistics import mean

import httpx

OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive"
ELEVATION = "https://api.open-meteo.com/v1/elevation"
POWER = "https://power.larc.nasa.gov/api/temporal/climatology/point"


def field(value=None, unit=None, source=None, resolution=None, period=None, confidence="missing", status="missing", note=None):
    return {"value": value, "unit": unit, "source": source, "resolution": resolution, "period": period,
            "confidence": confidence, "status": status, "note": note}


SOIL_TN = Path(__file__).resolve().parent.parent / "data" / "soil_tn.json"


def regional_soil(lat: float, lon: float, max_km: float = 120) -> dict | None:
    """Nearest zone of the regional topsoil reference (same table as js/soil-tn.js)."""
    if not SOIL_TN.exists():
        return None
    best = None
    for zone, plat, plon, texture, clay, soc in json.loads(SOIL_TN.read_text(encoding="utf-8"))["points"]:
        r = math.pi / 180
        h = math.sin((plat - lat) * r / 2) ** 2 + math.cos(lat * r) * math.cos(plat * r) * math.sin((plon - lon) * r / 2) ** 2
        km = 12742 * math.asin(math.sqrt(h))
        if best is None or km < best["km"]:
            best = {"zone": zone, "texture": texture, "clay_pct": clay, "soc": soc, "km": km}
    if best is None or best["km"] > max_km:
        return None
    best["km"] = round(best["km"])
    return best


async def build(lat: float, lon: float, timeout: float = 20.0) -> dict:
    dna = {"location": {"lat": lat, "lon": lon}, "climate": {}, "terrain": {}, "soil": {}, "energy": {}}
    async with httpx.AsyncClient(timeout=timeout) as c:
        # climate — ERA5 via Open-Meteo archive, 10 full years
        try:
            r = await c.get(OPEN_METEO, params={"latitude": lat, "longitude": lon, "start_date": "2014-01-01",
                                                "end_date": "2023-12-31", "timezone": "UTC",
                                                "daily": "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max"})
            r.raise_for_status()
            d = r.json()["daily"]
            years = {}
            for t, p, e in zip(d["time"], d["precipitation_sum"], d["et0_fao_evapotranspiration"]):
                y = years.setdefault(t[:4], [0.0, 0.0])
                y[0] += p or 0
                y[1] += e or 0
            src = "ERA5 reanalysis via Open-Meteo"
            dna["climate"]["rain_mm"] = field(round(mean(v[0] for v in years.values())), "mm/yr", src, "~25 km", "2014–2023", "medium", "ok")
            dna["climate"]["et0_mm"] = field(round(mean(v[1] for v in years.values())), "mm/yr", src, "~25 km", "2014–2023", "medium", "ok")
            summer = [x for t, x in zip(d["time"], d["temperature_2m_max"]) if t[5:7] in ("07", "08") and x is not None]
            dna["climate"]["tmax_hot"] = field(round(mean(summer), 1), "°C", src, "~25 km", "Jul–Aug 2014–2023", "medium", "ok")
        except Exception as e:  # noqa: BLE001
            for k in ("rain_mm", "et0_mm", "tmax_hot"):
                dna["climate"][k] = field(source="Open-Meteo", status="error", confidence="error", note=str(e)[:200])
        # terrain — Copernicus DEM 90 m via Open-Meteo elevation, slope from 4 neighbours (~90 m)
        try:
            dlat, dlon = 0.0008, 0.0008
            lats = [lat, lat + dlat, lat - dlat, lat, lat]
            lons = [lon, lon, lon, lon + dlon, lon - dlon]
            r = await c.get(ELEVATION, params={"latitude": ",".join(map(str, lats)), "longitude": ",".join(map(str, lons))})
            r.raise_for_status()
            z = r.json()["elevation"]
            import math
            dy = 111320 * dlat * 2
            dx = 111320 * math.cos(math.radians(lat)) * dlon * 2
            slope = math.hypot((z[1] - z[2]) / dy, (z[3] - z[4]) / dx) * 100
            dna["terrain"]["elevation_m"] = field(round(z[0]), "m", "Copernicus DEM GLO-90 via Open-Meteo", "90 m", None, "medium", "ok")
            dna["terrain"]["slope_pct"] = field(round(slope, 1), "%", "derived from Copernicus DEM GLO-90", "~180 m", None, "low", "ok",
                                                "Slope over ~180 m: a terrace-scale slope must be measured on site.")
        except Exception as e:  # noqa: BLE001
            for k in ("elevation_m", "slope_pct"):
                dna["terrain"][k] = field(source="Open-Meteo elevation", status="error", confidence="error", note=str(e)[:200])
        # energy — NASA POWER climatology, monthly GHI
        try:
            r = await c.get(POWER, params={"parameters": "ALLSKY_SFC_SW_DWN", "community": "AG", "latitude": lat,
                                           "longitude": lon, "format": "JSON"})
            r.raise_for_status()
            p = r.json()["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
            keys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
            dna["energy"]["ghi_monthly"] = field([p[k] for k in keys], "kWh/m²/day", "NASA POWER climatology", "0.5°", "long-term", "medium", "ok")
            dna["energy"]["ghi_year"] = field(p.get("ANN"), "kWh/m²/day", "NASA POWER climatology", "0.5°", "long-term", "medium", "ok")
        except Exception as e:  # noqa: BLE001
            dna["energy"]["ghi_monthly"] = field(source="NASA POWER", status="error", confidence="error", note=str(e)[:200])
    # soil — local raster only
    raster = os.environ.get("GAIA_SOIL_RASTER")
    if raster and os.path.exists(raster):
        try:
            import rasterio
            with rasterio.open(raster) as ds:
                from rasterio.warp import transform
                xs, ys = transform("EPSG:4326", ds.crs, [lon], [lat])
                v = next(ds.sample([(xs[0], ys[0])]))[0]
            dna["soil"]["clay"] = field(float(v), os.environ.get("GAIA_SOIL_UNIT", "g/kg"), "SoilGrids 2.0 (local raster)", "250 m", None, "low", "ok")
        except Exception as e:  # noqa: BLE001
            dna["soil"]["clay"] = field(source="SoilGrids local raster", status="error", confidence="error", note=str(e)[:200])
    else:
        hit = regional_soil(lat, lon)
        if hit:
            note = f"Typical value for the zone '{hit['zone']}' (~{hit['km']} km), not a measurement of the parcel. SoilGrids REST API paused; no local raster (GAIA_SOIL_RASTER)."
            src = "GAIA regional reference (orders of magnitude from HWSD v2 FAO/IIASA and SoilGrids 2.0)"
            dna["soil"]["texture"] = field(hit["texture"], None, src, "agro-ecological zone", None, "low", "ok") | {"note": note}
            dna["soil"]["clay_pct"] = field(hit["clay_pct"], "%", src, "agro-ecological zone", None, "low", "ok") | {"note": "0-30 cm. " + note}
            dna["soil"]["soc"] = field(hit["soc"], "g/kg", src, "agro-ecological zone", None, "low", "ok") | {"note": "0-30 cm. " + note}
        else:
            dna["soil"]["clay"] = field(source="SoilGrids 2.0", note="REST API paused by ISRIC; no local raster configured (GAIA_SOIL_RASTER) and no regional reference within 120 km.")
    return dna
