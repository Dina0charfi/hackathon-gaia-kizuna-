"""GAIA LAND DNA — server-side profile builder.

Fetches the same public sources as js/landdna.js. Every field carries
{value, unit, source, resolution, period, confidence, status}. When a source
fails, the field is returned with status "error" — never a substituted value.
Soil: the SoilGrids REST API is paused by ISRIC; set GAIA_SOIL_RASTER to a local
SoilGrids GeoTIFF (e.g. clay 0–30 cm) to read it with rasterio, otherwise soil is "missing".
"""
from __future__ import annotations

import os
from statistics import mean

import httpx

OPEN_METEO = "https://archive-api.open-meteo.com/v1/archive"
ELEVATION = "https://api.open-meteo.com/v1/elevation"
POWER = "https://power.larc.nasa.gov/api/temporal/climatology/point"


def field(value=None, unit=None, source=None, resolution=None, period=None, confidence="missing", status="missing", note=None):
    return {"value": value, "unit": unit, "source": source, "resolution": resolution, "period": period,
            "confidence": confidence, "status": status, "note": note}


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
        dna["soil"]["clay"] = field(source="SoilGrids 2.0", note="REST API paused by ISRIC; no local raster configured (GAIA_SOIL_RASTER).")
    return dna
