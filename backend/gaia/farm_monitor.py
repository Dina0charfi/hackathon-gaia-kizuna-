"""Morning check: every day at the chosen hour, GAIA re-plans each monitored parcel on its own
and leaves an alert saying whether and when to irrigate (shown on the page, with a browser notification).
Runs inside the backend (asyncio task started with the app); POST /farm/check runs it at once.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime
from typing import Any

from . import farm_state, planner

log = logging.getLogger("gaia.monitor")
WD = {"fr": ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"], "en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "ar": ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"], "ja": ["月", "火", "水", "木", "金", "土", "日"]}
TXT = {
    "fr": dict(today="Irriguer aujourd'hui : {mm} mm nets ({m3} m³){h}.", next="Prochaine irrigation : {d}, {mm} mm nets ({m3} m³){h}.",
               none="Pas besoin d'arroser ces 8 jours (réserve du sol : {r}).",
               stress="Attention : {n} jour(s) où la plante manquera d'eau.", hours=", entre {a} h et {b} h"),
    "en": dict(today="Irrigate today: {mm} net mm ({m3} m³){h}.", next="Next irrigation: {d}, {mm} net mm ({m3} m³){h}.",
               none="No need to water for 8 days (soil reserve: {r}).",
               stress="Careful: even with the plan, {n} stress day(s) expected (pump too small?).", hours=", between {a}:00 and {b}:00"),
    "ar": dict(today="اسقِ اليوم: {mm} مم صافية ({m3} م³){h}.", next="الري القادم: {d}، {mm} مم صافية ({m3} م³){h}.",
               none="لا حاجة للسقي خلال 8 أيام (مخزون التربة: {r}).",
               stress="انتبه: حتى مع الخطة، {n} يوم إجهاد متوقع (مضخة صغيرة؟).", hours="، بين الساعة {a} و{b}"),
    "ja": dict(today="今日灌漑：正味{mm} mm（{m3} m³）{h}。", next="次の灌漑：{d}、正味{mm} mm（{m3} m³）{h}。",
               none="8日間は水やり不要（土の蓄え：{r}）。",
               stress="注意：計画どおりでもストレスが{n}日予想されます（ポンプが小さい？）。", hours="、{a}時〜{b}時"),
}


def _settings(s: dict[str, Any]) -> dict[str, Any]:
    st = dict(s.get("settings") or {})
    out = {k: st[k] for k in ("crop", "kc", "area_ha", "ea", "head_m", "pump_eff", "flow_m3h", "pv_kwp", "pr", "months", "quota_m3_month")
           if st.get(k) is not None}
    out.setdefault("crop", "olive")
    out.setdefault("kc", 0.65)
    return out


async def check(lat: float, lon: float) -> dict[str, Any]:
    """Re-plan the parcel now and record an alert. Returns the alert."""
    s = farm_state.load(lat, lon)
    p = await planner.plan(lat, lon, mode="solar", **_settings(s))
    days = [d for d in p["days"] if d["irrigation_net_mm"] > 0]
    pct = lambda x: f"{round(x * 100)} %"
    text = {}
    for lang, L in TXT.items():
        if days:
            d = days[0]
            hs = d["pumping"].get("hours") or []
            h = L["hours"].format(a=hs[0]["hour"], b=hs[-1]["hour"] + 1) if hs else ""
            dd = date.fromisoformat(d["date"])
            key = "today" if d["is_today"] else "next"
            text[lang] = L[key].format(mm=d["irrigation_net_mm"], m3=round(d["irrigation_m3"]), h=h,
                                       d=f"{WD[lang][dd.weekday()]} {dd.day:02d}/{dd.month:02d}")
        else:
            text[lang] = L["none"].format(r=pct(p["soil"]["start_reserve"]))
        if p["totals"]["stress_days"]:
            text[lang] += " " + L["stress"].format(n=p["totals"]["stress_days"])
    level = "critical" if p["totals"]["stress_days"] else ("warning" if days and days[0]["is_today"] else ("info" if days else "good"))
    plan_days = [dict(date=d["date"], mm=d["irrigation_net_mm"], m3=d["irrigation_m3"],
                      hours=[h["hour"] for h in d["pumping"].get("hours", [])]) for d in days]
    with farm_state._lock:
        s = farm_state.load(lat, lon)
        a = farm_state.add_alert(s, level, text, {"plan": plan_days, "mode": "solar"})
        s["monitoring"]["last_run"] = datetime.now().isoformat(timespec="seconds")
        farm_state.save(s)
    return a


async def loop(every_s: int = 600) -> None:
    """Background task: run each monitored parcel's check once a day, at or after its hour."""
    while True:
        try:
            now = datetime.now()
            for s in farm_state.all_parcels():
                m = s.get("monitoring") or {}
                last = (m.get("last_run") or "")[:10]
                if m.get("enabled") and last != now.date().isoformat() and now.hour >= int(m.get("hour", 7)):
                    try:
                        with farm_state.as_user(s.get("owner")):
                            await check(s["lat"], s["lon"])
                    except Exception as e:  # Open-Meteo down: try again at the next round
                        log.warning("morning check failed for %s: %s", farm_state.key(s["lat"], s["lon"]), e)
        except Exception as e:
            log.warning("monitor loop: %s", e)
        await asyncio.sleep(every_s)
