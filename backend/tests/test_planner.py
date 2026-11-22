"""Optimal irrigation planner: no stress, least water, solar shifting, no water pumped before rain."""
import math

from gaia import planner

SITE = {"sec": 0.14, "humide": 0.34}                    # 5th / 95th soil-moisture percentiles of a site
SUNNY = [0] * 6 + [100, 300, 500, 700, 850, 900, 900, 850, 700, 500, 300, 100] + [0] * 6
CLOUDY = [g * 0.15 for g in SUNNY]


def summer_week(rain=None, cloudy=()):
    days = []
    for i in range(8):
        d = f"2026-07-{10 + i:02d}"
        days.append(dict(date=d, is_today=i == 0, rain_mm=(rain or {}).get(i, 0.0), et0_mm=7.0))
    sun = {d["date"]: (CLOUDY if i in cloudy else SUNNY) for i, d in enumerate(days)}
    return days, sun


def run(days, sun, mode, theta0=0.24, **kw):
    args = dict(crop="olive", kc=0.7, area_ha=1.0, ea=0.9, head_m=40, pump_eff=0.45, flow_m3h=6, pv_kwp=2.0, pr=0.75)
    args.update(kw)
    return planner.build_plan(days, theta0, SITE, [0.65] * 12, sun=sun, mode=mode, **args)


def test_plan_keeps_the_crop_out_of_stress():
    days, sun = summer_week()
    r = run(days, sun, "water")
    assert r["totals"]["stress_days_without"] > 0
    assert r["totals"]["stress_days"] == 0
    raw_reserve = r["soil"]["stress_threshold"]
    assert all(d["reserve"] >= raw_reserve - 1e-6 for d in r["days"])


def test_least_water_is_just_in_time_and_below_daily_replacement():
    days, sun = summer_week()
    r = run(days, sun, "water")
    # never more than replacing the crop's daily use; the difference is the soil reserve used
    assert r["totals"]["m3"] <= r["baseline"]["m3"] + 1e-6
    first = next(i for i, d in enumerate(r["days"]) if d["irrigation_net_mm"] > 0)
    assert first > 0                                     # the soil reserve is used first


def test_no_water_pumped_just_before_a_big_rain():
    days, sun = summer_week(rain={4: 40.0})
    r = run(days, sun, "water", theta0=0.22)
    assert r["days"][4]["effective_rain_mm"] == 26.0
    assert all(d["drainage_mm"] == 0 for d in r["days"])  # no pumped water drains away


def test_solar_mode_moves_pumping_off_cloudy_days():
    days, sun = summer_week(cloudy={4, 5})
    w = run(days, sun, "water", theta0=0.22)
    s = run(days, sun, "solar", theta0=0.22)
    assert s["totals"]["stress_days"] == 0
    assert s["totals"]["other_kwh"] < w["totals"]["other_kwh"]
    assert math.isclose(sum(d["irrigation_net_mm"] for d in s["days"][4:6]), 0.0) or \
        sum(d["irrigation_net_mm"] for d in s["days"][4:6]) < sum(d["irrigation_net_mm"] for d in w["days"][4:6])


def test_pumping_hours_follow_the_sun():
    sched = planner.pumping_schedule(12, SUNNY, flow_m3h=6, head_m=40, pump_eff=0.45, pv_kwp=3.0, pr=0.75)
    assert [h["hour"] for h in sched["hours"]] == [11, 12]
    assert sched["solar_share"] == 1.0


def test_safety_margin_keeps_the_plan_above_the_threshold():
    days, sun = summer_week()
    r = run(days, sun, "water", margin=0.05)
    assert all(d["reserve"] >= r["soil"]["target_reserve"] - 1e-6 for d in r["days"])
    assert r["totals"]["m3"] > run(days, sun, "water")["totals"]["m3"]


def test_custom_plan_is_simulated_as_given():
    days, sun = summer_week()
    r = run(days, sun, "water", plan_override=[0, 0, 10, 0, 0, 0, 0, 0])
    assert r["mode"] == "custom"
    assert r["days"][2]["irrigation_net_mm"] == 10


def test_season_replay_on_real_data():
    r = planner.replay_season(35.73, 10.58, "2025-06-01", "2025-07-31", crop="olive", kc=0.7, area_ha=1,
                              head_m=40, flow_m3h=8, pv_kwp=3)
    s = r["strategies"]
    assert r["site"]["id"] == "msaken" and r["days"] == 61
    assert s["mpc_water"]["stress_days"] == 0 and s["mpc_solar"]["stress_days"] == 0
    assert s["mpc_water"]["m3"] <= s["quota"]["m3"]
    # small daily doses fit the solar output better than large refills
    assert s["mpc_solar"]["solar_share"] > s["fao_refill"]["solar_share"]


def test_no_irrigation_in_months_marked_off():
    days, sun = summer_week()
    months = [1] * 12
    months[6] = 0                                        # July not irrigated
    r = run(days, sun, "water", months=months)
    assert all(d["irrigation_net_mm"] == 0 for d in r["days"])
    assert r["limits"]["months_off"] == [7] and r["totals"]["stress_days"] > 0


def test_plan_never_pumps_more_than_the_monthly_quota():
    days, sun = summer_week()
    free = run(days, sun, "water")
    quota = [None] * 12
    quota[6] = 31 * free["totals"]["m3"] / 8 / 2          # half of what the free plan pumps over these 8 days
    r = run(days, sun, "water", quota_m3_month=quota)
    assert r["totals"]["m3"] <= r["limits"]["quota_m3"] + 1.0
    assert r["totals"]["m3"] < free["totals"]["m3"] and r["limits"]["quota_reached"]
    assert r["totals"]["stress_days"] >= free["totals"]["stress_days"]
