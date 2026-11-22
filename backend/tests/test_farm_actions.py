"""Actionable agent: proposals need the farmer's confirmation; confirmed actions change the parcel's record;
reported irrigations feed the next plans; the morning check leaves an alert."""
import asyncio
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from gaia import farm_monitor, farm_state, planner
from gaia import irrigation_agent as agent
from gaia.main import app

LAT, LON = 34.017, 10.011


@pytest.fixture(autouse=True)
def tmp_farm(tmp_path, monkeypatch):
    monkeypatch.setattr(farm_state, "DIR", tmp_path / "farm")
    monkeypatch.setenv("GAIA_USERS_DB", str(tmp_path / "users.db"))


def signed_in(c, ident="amel@example.com", **kw):
    r = c.post("/auth/signup", json={"name": "Amel", "identifier": ident, "password": "olive-2026", **kw})
    assert r.status_code == 201, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_agent_actions_are_only_proposed_until_confirmed():
    token = agent.PROPOSALS.set([])
    try:
        out = asyncio.run(agent.run_tool("propose_log_irrigation", {"mm": 8, "day": "today"}, {"lat": LAT, "lon": LON}))
        bag = agent.PROPOSALS.get()
    finally:
        agent.PROPOSALS.reset(token)
    assert "waiting" in out["status"] and bag[0]["type"] == "log_irrigation" and bag[0]["params"]["mm"] == 8
    assert farm_state.load(LAT, LON)["irrigation_log"] == []          # nothing applied yet


def test_confirmed_actions_change_the_record():
    c = TestClient(app)
    c.headers.update(signed_in(c))
    today = date.today().isoformat()
    r = c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "save_plan", "params": {
        "mode": "solar", "days": [{"date": today, "mm": 6, "m3": 133.3, "hours": [11, 12]}, {"date": today, "mm": 0}]}}}).json()
    assert len(r["plan"]) == 1 and r["plan"][0]["hours"] == [11, 12]
    r = c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "log_irrigation", "params": {"mm": 6, "date": today}}}).json()
    assert r["irrigation_log"][0]["mm"] == 6 and r["plan"][0]["done"] is True
    r = c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "update_settings", "params": {"settings": {"flow_m3h": 10, "bad": 1}}}}).json()
    assert r["settings"] == {"flow_m3h": 10.0}
    r = c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "set_monitoring", "params": {"enabled": True, "hour": 6}}}).json()
    assert r["monitoring"]["enabled"] and r["monitoring"]["hour"] == 6
    assert c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "log_irrigation", "params": {"mm": -3}}}).status_code == 422


def test_reported_irrigation_counts_since_yesterday():
    y, old = (date.today() - timedelta(days=1)).isoformat(), (date.today() - timedelta(days=5)).isoformat()
    for d, mm in [(y, 5), (old, 20), (date.today().isoformat(), 3)]:
        farm_state.apply(LAT, LON, {"type": "log_irrigation", "params": {"mm": mm, "date": d}})
    assert farm_state.recent_irrigation_mm(LAT, LON) == 8


def test_morning_check_leaves_an_alert(monkeypatch):
    today = date.today().isoformat()

    async def fake_plan(lat, lon, **kw):
        assert kw["flow_m3h"] == 8 and kw["mode"] == "solar"
        return {"days": [{"date": today, "is_today": True, "irrigation_net_mm": 6.0, "irrigation_m3": 133.3,
                          "pumping": {"hours": [{"hour": 11}, {"hour": 12}]}}],
                "totals": {"stress_days": 0}, "soil": {"start_reserve": 0.4}}
    monkeypatch.setattr(planner, "plan", fake_plan)
    farm_state.apply(LAT, LON, {"type": "update_settings", "params": {"settings": {"flow_m3h": 8}}})
    a = asyncio.run(farm_monitor.check(LAT, LON))
    assert a["level"] == "warning" and "6.0 mm" in a["text"]["fr"] and "11 h et 13 h" in a["text"]["fr"]
    s = farm_state.load(LAT, LON)
    assert s["alerts"][-1]["read"] is False and s["monitoring"]["last_run"]


def log(mm=6):
    return {"lat": LAT, "lon": LON, "action": {"type": "log_irrigation", "params": {"mm": mm}}}


def test_a_farm_record_needs_an_account_and_stays_private():
    c = TestClient(app)
    at = f"lat={LAT}&lon={LON}"
    for r in (c.get("/farm/state?" + at), c.post("/farm/action", json=log()), c.post("/farm/check?" + at),
              c.get("/farm/state?" + at, headers={"Authorization": "Bearer wrong"})):
        assert r.status_code == 401
    a, b = signed_in(c, "a@example.com"), signed_in(c, "b@example.com")
    assert c.post("/farm/action", json=log(6), headers=a).json()["irrigation_log"][0]["mm"] == 6
    # the stranger knows the coordinates: they get their own empty record and cannot touch the other one
    assert c.get("/farm/state?" + at, headers=b).json()["irrigation_log"] == []
    c.post("/farm/action", json=log(50), headers=b)
    forged = log(99)
    forged["owner"] = 1
    forged["action"]["params"]["owner"] = 1
    c.post("/farm/action", json=forged, headers=b)
    mine = c.get("/farm/state?" + at, headers=a).json()
    assert [e["mm"] for e in mine["irrigation_log"]] == [6] and mine["owner"] == 1


def test_a_plan_only_counts_the_irrigations_of_the_account(monkeypatch):
    seen = []

    async def fake_plan(lat, lon, **kw):
        seen.append(farm_state.recent_irrigation_mm(lat, lon))
        return {"days": []}
    monkeypatch.setattr(planner, "plan", fake_plan)
    c = TestClient(app)
    a, b = signed_in(c, "a@example.com"), signed_in(c, "b@example.com")
    c.post("/farm/action", json=log(6), headers=a)
    for h in (a, b, {}):
        assert c.post("/irrigation/plan", json={"lat": LAT, "lon": LON}, headers=h).status_code == 200
    assert seen == [6, 0, 0]          # the plan itself stays open to everybody


def test_an_old_record_goes_to_the_account_of_the_plot():
    farm_state.apply(LAT, LON, {"type": "log_irrigation", "params": {"mm": 4}})      # kept before accounts
    c = TestClient(app)
    other = signed_in(c, "other@example.com")
    owner = signed_in(c, "owner@example.com", farm={"lat": LAT, "lon": LON})
    at = f"/farm/state?lat={LAT}&lon={LON}"
    assert c.get(at, headers=other).json()["irrigation_log"] == []
    assert c.get(at, headers=owner).json()["irrigation_log"][0]["mm"] == 4
    assert c.get(at, headers=other).json()["irrigation_log"] == []


def test_morning_check_writes_in_the_owner_record(monkeypatch):
    async def fake_plan(lat, lon, **kw):
        return {"days": [], "totals": {"stress_days": 0}, "soil": {"start_reserve": 0.9}}
    monkeypatch.setattr(planner, "plan", fake_plan)
    c = TestClient(app)
    a = signed_in(c, "a@example.com")
    c.post("/farm/action", json={"lat": LAT, "lon": LON, "action": {"type": "set_monitoring", "params": {"enabled": True, "hour": 0}}}, headers=a)

    async def once():
        t = asyncio.create_task(farm_monitor.loop(3600))
        await asyncio.sleep(0.2)
        t.cancel()
    asyncio.run(once())
    assert len(c.get(f"/farm/state?lat={LAT}&lon={LON}", headers=a).json()["alerts"]) == 1
    assert farm_state.load(LAT, LON)["alerts"] == []
