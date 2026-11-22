/* ==========================================================================
   GAIA — what to irrigate in the next days, from the irrigation planner of the
   server (backend/gaia/planner.py), which knows the water already in the soil.

   Shared by the Farm Agent and the dashboard, so that they give one advice.
   Same settings as the Water & energy page when they were saved for this plot
   and this crop. Resolves to null when the server does not answer: each page
   then falls back on its own simple daily calculation, and says so.
   ========================================================================== */
(function (global) {
  'use strict';
  var G = global.GAIA, N = global.GAIA_NEXUS, cache = {};

  function n(v) { var x = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return x > 0 ? x : null; }
  function round(x, d) { if (x === null || x === undefined || isNaN(x)) return null; var k = Math.pow(10, d || 0); return Math.round(x * k) / k; }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

  /* opts: { crop (key of GAIA_NEXUS.CROPS), kc, months[12], area_ha, ea, head_m, pump_eff, pr, pv_kwp, own }
     own = true when kc, ea, pump_eff, pr and pv_kwp were set by the farmer on the calling page: they win over the saved ones. */
  function get(p, opts) {
    if (!p || !G.CONFIG.planEndpoint || !G.apiReady) return Promise.resolve(null);
    var saved = G.load('gaia.nexus.inputs', null);
    var S = saved && p.dna && saved.parcelAt === p.dna.builtAt && saved.values && saved.values.crop === opts.crop ? saved.values : {};
    function pick(own, savedValue, dflt) { return opts.own ? (n(own) || n(savedValue) || dflt) : (n(savedValue) || n(own) || dflt); }
    var months = S.months || opts.months, kc = pick(opts.kc, S.kc, 0.65);
    var body = { lat: p.lat, lon: p.lon, crop: opts.crop, kc: kc, area_ha: n(opts.area_ha), ea: pick(opts.ea, S.ea, 0.9), head_m: n(opts.head_m),
      pump_eff: pick(opts.pump_eff, S.pump_eff, 0.45), flow_m3h: n(S.flow), pv_kwp: pick(opts.pv_kwp, S.pv_kwp, null), pr: pick(opts.pr, S.pr, 0.75),
      mode: S.plan_mode === 'water' ? 'water' : 'solar', irrigated_mm: n(S.irrigated_mm) || 0, months: months ? months.map(function (x) { return x ? 1 : 0; }) : null };
    // authorised volume (Water & energy page), spread over the year like the crop need
    var sy = n(S.safe_yield), CM = p.dna && p.dna.climateMonthly;
    if (N && CM && months && body.area_ha) {
      var ghi = (p.dna.solarMonthly && p.dna.solarMonthly.ghi) || CM.ghi || null;
      var r = N.compute({ et0: CM.et0, rain: CM.rain, ghi: ghi, kc: kc, months: months, area_ha: body.area_ha, ea: body.ea, head_m: body.head_m, pump_eff: body.pump_eff, pr: body.pr, prices: {} });
      var need = r.months ? r.months.reduce(function (s, m) { return s + (m.vol || 0); }, 0) : 0;
      if (sy && need > sy) body.quota_m3_month = r.months.map(function (m) { return Math.round((m.vol || 0) * sy / need * 10) / 10; });
      if (!body.pv_kwp && r.solar) body.pv_kwp = Math.round(r.solar.kwp * 10) / 10;
    }
    var key = JSON.stringify(body) + today();
    if (cache[key]) return cache[key];
    var ctl = global.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    cache[key] = G.apiReady.then(function () {
      return fetch(G.CONFIG.planEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined });
    }).then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); }).then(function (d) {
      clearTimeout(timer);
      var days = d.days || [], first = days[0] || {};
      return { soil_reserve_pct: round(100 * (first.reserve_without !== undefined ? first.reserve_without : d.soil.start_reserve), 0), keep_above_pct: round(100 * d.soil.target_reserve, 0),
        from: first.date, to: (days[days.length - 1] || {}).date, total_m3: round((d.totals && d.totals.m3) || 0, 0), per_ha: !!d.per_ha, stress_days: d.totals.stress_days,
        irrigate: days.filter(function (x) { return x.irrigation_net_mm > 0; }).map(function (x) {
          var h = ((x.pumping && x.pumping.hours) || []).map(function (y) { return y.hour; });
          return { date: x.date, mm: round(x.irrigation_net_mm, 1), m3: round(x.irrigation_m3, 0), from_h: h.length ? h[0] : null, to_h: h.length ? h[h.length - 1] + 1 : null };
        }),
        spared_m3: round(d.baseline && d.baseline.saved_m3, 0), out_of_season: !!(d.limits && d.limits.months_off && d.limits.months_off.length), quota_reached: !!(d.limits && d.limits.quota_reached),
        reported_irrigation_mm: d.reported_irrigation_mm || 0 };
    }).catch(function () { clearTimeout(timer); delete cache[key]; return null; });
    return cache[key];
  }

  // the farmer reported an irrigation or saved a plan: ask the planner again
  global.GAIA_SOILPLAN = { get: get, clear: function () { cache = {}; } };
}(window));
