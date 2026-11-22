"""Bundled Tunisia fallbacks: Python and JS give the same numbers, and the climate
chain falls back from Open-Meteo (429) to NASA POWER and then to the bundled table."""
import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import httpx
import pytest

from gaia import opendata, profile

ROOT = Path(__file__).resolve().parents[2]
PTS = [(34.42, 8.78), (36.73, 9.18), (34.74, 10.76), (36.85, 10.33), (33.70, 8.97), (37.40, 11.50)]
P = {k: dict(zip(opendata.MONTHS, v)) for k, v in {
    "PRECTOTCORR": [0.62, 0.44, 0.69, 0.65, 0.47, 0.19, 0.07, 0.25, 0.71, 0.57, 0.71, 0.71],
    "T2M": [8.61, 9.74, 13.48, 17.34, 21.6, 26.17, 29.63, 29.23, 25.26, 20.79, 14.22, 9.71],
    "T2M_RANGE": [11.53, 12.48, 13.4, 14.29, 14.93, 15.53, 15.78, 14.53, 12.43, 11.89, 11.03, 10.79],
    "RH2M": [67.88, 61.78, 57.21, 54.89, 49.71, 43.99, 41.24, 45.47, 55.23, 58.82, 62.94, 69.37],
    "WS2M": [2.81, 2.94, 3.07, 3.21, 3.33, 3.21, 2.93, 2.82, 2.8, 2.51, 2.66, 2.81],
    "ALLSKY_SFC_SW_DWN": [3.139, 4.0747, 5.215, 6.3043, 7.1856, 7.842, 7.8593, 7.0104, 5.5754, 4.3987, 3.3427, 2.8152],
    "TOA_SW_DWN": [5.191, 6.5861, 8.3789, 10.0176, 11.0844, 11.4883, 11.2342, 10.3358, 8.8894, 7.1198, 5.5306, 4.758]}.items()}

JS = r"""
const vm = require('vm'), fs = require('fs'), root = process.argv[1];
const box = { Buffer, Math, Object, Uint8Array }; vm.createContext(box);
for (const f of ['js/climate-core.js', 'js/climate-tn.js', 'js/soil-grid-tn.js']) vm.runInContext(fs.readFileSync(root + '/' + f, 'utf8'), box);
const inp = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = { power: box.GAIA_CLIMATE.fromPower(inp.p, 330), table: [], soil: [] };
for (const [la, lo] of inp.pts) { out.table.push(box.GAIA_CLIMATE_TN.lookup(la, lo)); out.soil.push(box.GAIA_SOIL_GRID.lookup(la, lo)); }
console.log(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def js():
    if not shutil.which("node"):
        pytest.skip("node not installed")
    p = subprocess.run(["node", "-e", JS, str(ROOT)], input=json.dumps({"p": P, "pts": PTS}), capture_output=True, text=True, check=True)
    return json.loads(p.stdout)


def test_power_et0_matches_js_and_is_plausible(js):
    py = opendata.from_power(P, 330)
    for k in ("rain_mm", "et0_mm", "tmax_hot", "tmin_cold"):
        assert py[k] == pytest.approx(js["power"][k])
    assert 1500 < py["et0_mm"] < 1900 and 150 < py["rain_mm"] < 220  # Gafsa area


def test_tables_match_js(js):
    for (lat, lon), t, s in zip(PTS, js["table"], js["soil"]):
        pt, ps = opendata.climate_table(lat, lon), opendata.soil_grid(lat, lon)
        for k in ("rain_mm", "et0_mm", "tmax_hot", "tmin_cold", "km"):
            assert pt[k] == pytest.approx(t[k])
        if s is None:
            assert ps is None
        else:
            assert {k: ps[k] for k in ("clay_pct", "sand_pct", "soc", "km")} == {k: s[k] for k in ("clay_pct", "sand_pct", "soc", "km")}


def test_tables_outside_tunisia():
    assert opendata.climate_table(48.8, 2.3) is None and opendata.soil_grid(48.8, 2.3) is None


def _run(handler, monkeypatch):
    async def no_sleep(_):
        return None
    monkeypatch.setattr(profile.asyncio, "sleep", no_sleep)
    profile._CACHE.clear()

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await profile.climate(c, 34.42, 8.78)
    return asyncio.run(go())


def test_climate_falls_back_to_power_on_429(monkeypatch):
    calls = []

    def handler(req):
        calls.append(req.url.host)
        if "open-meteo" in req.url.host:
            return httpx.Response(429)
        return httpx.Response(200, json={"header": {"fill_value": -999}, "geometry": {"coordinates": [8.8, 34.4, 330]}, "properties": {"parameter": P}})
    cl = _run(handler, monkeypatch)
    assert calls.count("archive-api.open-meteo.com") == 3  # first try + 2 retries
    assert cl["rain_mm"]["status"] == "ok" and "NASA POWER" in cl["rain_mm"]["source"] and cl["rain_mm"]["confidence"] == "low"
    assert 1500 < cl["et0_mm"]["value"] < 1900


def test_climate_falls_back_to_table(monkeypatch):
    cl = _run(lambda req: httpx.Response(503), monkeypatch)
    assert cl["rain_mm"]["status"] == "ok" and cl["rain_mm"]["confidence"] == "low"
    assert "bundled table" in cl["rain_mm"]["note"]
