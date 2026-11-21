"""GAIA LAND DNA — server-side profile builder.

Fetches the same public sources as js/landdna.js. Every field carries
{value, unit, source, resolution, period, confidence, status}. When a source
fails, the field is returned with status "error" — never a substituted value.
Climate: Open-Meteo archive (ERA5, retried on 429), then the NASA POWER climatology with
FAO-56 ET0 (gaia/opendata.py, same maths as js/climate-core.js), then the bundled NASA POWER
normals table (data/climate_tn.json). Results are cached in memory for 24 h per ~1 km.
Soil: the SoilGrids REST API is paused by ISRIC; set GAIA_SOIL_RASTER to a local
SoilGrids GeoTIFF (e.g. clay 0–30 cm) to read it with rasterio, otherwise soil comes from the
bundled 5 km SoilGrids grid (data/soil_grid_tn.json), then the regional reference table
(data/soil_tn.json, exported from js/soil-tn.js) with confidence "low".
"""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from pathlib import Path
from statistics import mean

import httpx

from . import opendata

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


_CACHE: dict = {}
CACHE_S = 24 * 3600


def _cached(kind: str, lat: float, lon: float):
    hit = _CACHE.get((kind, round(lat, 2), round(lon, 2)))
    return hit[1] if hit and time.time() - hit[0] < CACHE_S else None


def _store(kind: str, lat: float, lon: float, value):
    _CACHE[(kind, round(lat, 2), round(lon, 2))] = (time.time(), value)
    return value


async def _get(c: httpx.AsyncClient, url: str, params: dict, waits=(1.5, 4.0)) -> dict:
    """GET with retries on 429 / 5xx / network errors (Retry-After honoured when short)."""
    for i in range(len(waits) + 1):
        try:
            r = await c.get(url, params=params)
            if r.status_code == 429 or r.status_code >= 500:
                if i < len(waits) and "daily" not in r.text.lower():  # a daily quota will not clear with a retry
                    ra = r.headers.get("Retry-After", "")
                    await asyncio.sleep(float(ra) if ra.isdigit() and int(ra) <= 10 else waits[i])
                    continue
            r.raise_for_status()
            return r.json()
        except httpx.TransportError:
            if i >= len(waits):
                raise
            await asyncio.sleep(waits[i])
    raise RuntimeError("unreachable")


async def _power(c: httpx.AsyncClient, lat: float, lon: float) -> dict:
    hit = _cached("power", lat, lon)
    if hit:
        return hit
    d = await _get(c, POWER, {"parameters": ",".join(opendata.PARAMS), "community": "RE", "latitude": lat, "longitude": lon, "format": "JSON"})
    return _store("power", lat, lon, {"p": d["properties"]["parameter"], "fill": d.get("header", {}).get("fill_value", -999),
                                      "z": (d.get("geometry") or {}).get("coordinates", [None, None, None])[2]})


def _climate_fields(v: dict, src: str, res: str, period: str, conf: dict, note: str | None = None) -> dict:
    out = {}
    for k, unit, cf in (("rain_mm", "mm/yr", conf["rain"]), ("et0_mm", "mm/yr", conf["et0"]), ("tmax_hot", "°C", conf["t"]), ("tmin_cold", "°C", conf["t"])):
        val = v.get(k)
        out[k] = field(None if val is None else round(val, 1 if unit == "°C" else 0), unit, src, res, period, cf, "ok" if val is not None else "missing", note)
    return out


async def climate(c: httpx.AsyncClient, lat: float, lon: float) -> dict:
    """Open-Meteo ERA5 (10 years) → NASA POWER climatology (FAO-56 ET0) → bundled table."""
    hit = _cached("climate", lat, lon)
    if hit:
        return hit
    try:
        d = (await _get(c, OPEN_METEO, {"latitude": round(lat, 3), "longitude": round(lon, 3), "start_date": "2015-01-01",
                                        "end_date": "2024-12-31", "timezone": "UTC",
                                        "daily": "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min"}))["daily"]
        years: dict = {}
        tmax: dict = {}
        tmin: dict = {}
        for t, p, e, hi, lo in zip(d["time"], d["precipitation_sum"], d["et0_fao_evapotranspiration"], d["temperature_2m_max"], d["temperature_2m_min"]):
            y = years.setdefault(t[:4], [0.0, 0.0])
            y[0] += p or 0
            y[1] += e or 0
            m = int(t[5:7])
            if hi is not None:
                tmax.setdefault(m, []).append(hi)
            if lo is not None:
                tmin.setdefault(m, []).append(lo)
        v = {"rain_mm": mean(y[0] for y in years.values()), "et0_mm": mean(y[1] for y in years.values()),
             "tmax_hot": max(mean(x) for x in tmax.values()), "tmin_cold": min(mean(x) for x in tmin.values())}
        return _store("climate", lat, lon, _climate_fields(v, "ERA5 reanalysis via Open-Meteo", "~11–25 km", "2015–2024",
                                                           {"rain": "medium", "et0": "medium", "t": "medium"}))
    except Exception as e:  # noqa: BLE001
        reason = f"Open-Meteo unavailable ({str(e)[:80]})"
    try:
        pw = await _power(c, lat, lon)
        v = opendata.from_power(pw["p"], pw["z"], pw["fill"])
        if not v or v["rain_mm"] is None:
            raise ValueError("parameter missing")
        return _store("climate", lat, lon, _climate_fields(v, "NASA POWER climatology 2001–2025 (MERRA-2), ET0 FAO-56 computed by GAIA",
                                                           "~50 km (0.5° × 0.625°)", "2001–2025", {"rain": "low", "et0": "medium", "t": "medium"},
                                                           reason + ": using NASA POWER instead."))
    except Exception as e:  # noqa: BLE001
        reason += f"; NASA POWER unavailable ({str(e)[:80]})"
    v = opendata.climate_table(lat, lon)
    if not v:
        return {k: field(source="Open-Meteo / NASA POWER", status="error", confidence="error", note=reason) for k in ("rain_mm", "et0_mm", "tmax_hot", "tmin_cold")}
    return _climate_fields(v, v["source"], "interpolated 0.5° grid", "2001–2025", {"rain": "low", "et0": "low", "t": "low"},
                           f"{reason}. Values interpolated from the bundled table (nearest point ~{v['km']} km).")


async def build(lat: float, lon: float, timeout: float = 20.0) -> dict:
    dna = {"location": {"lat": lat, "lon": lon}, "climate": {}, "terrain": {}, "soil": {}, "energy": {}}
    async with httpx.AsyncClient(timeout=timeout) as c:
        dna["climate"] = await climate(c, lat, lon)
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
        # energy — NASA POWER climatology (same cached request as the climate fallback), monthly GHI
        try:
            p = (await _power(c, lat, lon))["p"]["ALLSKY_SFC_SW_DWN"]
            dna["energy"]["ghi_monthly"] = field([p[k] for k in opendata.MONTHS], "kWh/m²/day", "NASA POWER climatology", "0.5°", "2001–2025", "medium", "ok")
            dna["energy"]["ghi_year"] = field(p.get("ANN"), "kWh/m²/day", "NASA POWER climatology", "0.5°", "2001–2025", "medium", "ok")
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
    elif (g := opendata.soil_grid(lat, lon)):
        where = f"the neighbouring 5 km cell (~{g['km']} km, coast or unmapped area)" if g["km"] else "the 5 km cell containing the parcel"
        note = f"SoilGrids 2.0 mean of {where}, not a measurement of the parcel."
        res, cc = "~5 km cell (16 samples at 250 m)", "low" if g["km"] else "medium"
        dna["soil"]["texture"] = field(opendata.texture_of(g["sand_pct"], g["clay_pct"]), None, g["source"], res, None, cc, "ok", note)
        dna["soil"]["clay_pct"] = field(g["clay_pct"], "%", g["source"], res, None, cc, "ok", "0-30 cm. " + note)
        dna["soil"]["soc"] = field(g["soc"], "g/kg", g["source"], res, None, "low", "ok", "0-30 cm. " + note)
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
