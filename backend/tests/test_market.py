"""Market page core (js/market-core.js): channels, Teikei, JA pooled lot and selling plan, run in node."""
import json
import shutil
import subprocess
from pathlib import Path

import pytest

CORE = Path(__file__).resolve().parents[2] / "js" / "market-core.js"

SCRIPT = r"""
const M = require(process.argv[1]);
const ctx = { crop: 'olive', area_ha: 3, yield_t_ha: 2, oil_yield: 0.2, lat: 35.68, lon: 10.05, month: 7, pool_t: 1.2 + 17,
  prices: { mill: 1.4, oil_export: 13, teikei: 22 }, costs: { transport_tnd_tkm: 0.15, local_km: 10, pack_tnd_kg: 0.8, commission: {} } };
const res = M.evaluateAll(ctx);
const tk = M.teikei({ product_t: M.volume(ctx).product_t, basket_kg: 1, deliveries: 6, households: 25, basket_tnd: 24, advance_pct: 0.5 });
console.log(JSON.stringify({
  vol: M.volume(ctx), res, tk, plan: M.plan(ctx, res, tk, 0.1),
  pool: M.pool([{ name: 'me', t: 1.2 }, { name: 'a', t: 8 }, { name: 'b', t: 9 }], 18),
  veg_far: M.evaluate(M.CHANNELS.find(c => c.id === 'teikei'), { crop: 'veg', area_ha: 1, yield_t_ha: 20, lat: 30.9, lon: 10.2, month: 1 }),
  cal: M.calendar('palm'), mth: M.monthsToHarvest('cereal', 7),
  label: M.label(Object.assign({ quota_m3: 9000, pump: 'solar', date: new Date('2026-11-22') }, ctx))
}));
"""


@pytest.fixture(scope="module")
def out():
    if not shutil.which("node"):
        pytest.skip("node not installed")
    p = subprocess.run(["node", "-e", SCRIPT, str(CORE)], capture_output=True, text=True, check=True)
    return json.loads(p.stdout)


def test_volume_converts_olives_to_oil(out):
    assert out["vol"]["harvest_t"] == pytest.approx(6)
    assert out["vol"]["product_t"] == pytest.approx(1.2)


def test_channels_fit_the_crop_and_rank_by_verdict(out):
    ids = [r["id"] for r in out["res"]]
    assert "wholesale" not in ids and "cereal_office" not in ids   # not olive buyers
    assert {"mill", "oil_export", "teikei", "michinoeki", "ja_pool"} <= set(ids)
    order = {"ok": 0, "adapt": 1, "unk": 2, "no": 3}
    assert [order[r["verdict"]] for r in out["res"]] == sorted(order[r["verdict"]] for r in out["res"])
    export = next(r for r in out["res"] if r["id"] == "oil_export")
    assert export["verdict"] == "adapt" and "pool_reaches" in export["reasons"]   # 1.2 t alone, 18.2 t with the group


def test_mill_price_is_compared_per_kg_of_oil(out):
    mill = next(r for r in out["res"] if r["id"] == "mill")
    raw = 1.4 - 0.15 * 10 / 1000
    assert mill["net_raw_kg"] == pytest.approx(raw)
    assert mill["net_kg"] == pytest.approx(raw / 0.2)


def test_teikei_households_and_advance(out):
    tk = out["tk"]
    assert tk["max_households"] == 200          # 1200 kg / (1 kg × 6)
    assert tk["households"] == 25 and tk["kg"] == 150
    assert tk["season_tnd"] == pytest.approx(3600) and tk["advance_tnd"] == pytest.approx(1800)


def test_plan_uses_the_whole_harvest(out):
    pl = out["plan"]
    assert sum(l["kg"] for l in pl["lines"]) == pytest.approx(1200)
    assert pl["lines"][0]["id"] == "teikei" and pl["before_harvest_tnd"] == pytest.approx(1800)


def test_pool_and_fresh_teikei_far_from_cities(out):
    assert out["pool"]["total_t"] == pytest.approx(18.2) and out["pool"]["reached"] is True
    assert out["veg_far"]["verdict"] == "no" and "city_far" in out["veg_far"]["reasons"]


def test_calendar_and_label(out):
    cells = out["cal"]["cells"]
    assert [c["m"] for c in cells if c["harvest"]] == [9, 10, 11]
    assert out["mth"] == 10                      # August → June
    assert out["label"]["water_l_kg"] == pytest.approx(1500)
    assert out["label"]["area"] == {"lat": 35.7, "lon": 10.1}
