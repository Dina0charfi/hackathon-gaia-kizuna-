/* ==========================================================================
   GAIA WATER–ENERGY NEXUS — calculation core (M4). Pure functions, no DOM.

   Monthly workflow:
     ETc  = Kc × ET0                                    (FAO-56)
     Pe   = USDA-SCS effective rainfall, monthly        (as used in FAO CROPWAT)
     IRn  = max(0, ETc − Pe)        IRg = IRn / Ea
     V    = 10 × IRg[mm] × A[ha]                        (m³)
     E    = V × H / (367 × ηp)                          (kWh, ρg/3.6e6 ≈ 1/367)
     kWp  = E / (days × GHI × PR)                       (peak month sets the size)
     Quota = V, the agronomic need — never more.
   Every assumption is an explicit, editable input.
   ========================================================================== */

(function (root) {
  'use strict';

  var DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Single crop coefficients used as defaults, from FAO-56 Table 12 as recalled
  // by the team. MARKED TO CHECK against the publication before external use.
  var CROPS = {
    olive:  { kc: 0.70, months: [1,1,1,1,1,1,1,1,1,1,1,1], ref: 'FAO-56 Table 12, olives 40–60 % cover, Kc mid (to check)' },
    palm:   { kc: 0.95, months: [1,1,1,1,1,1,1,1,1,1,1,1], ref: 'FAO-56 Table 12, date palms, Kc mid (to check)' },
    citrus: { kc: 0.65, months: [1,1,1,1,1,1,1,1,1,1,1,1], ref: 'FAO-56 Table 12, citrus 70 % canopy, Kc mid (to check)' },
    cereal: { kc: 1.15, months: [1,1,1,1,1,0,0,0,0,0,1,1], ref: 'FAO-56 Table 12, wheat, Kc mid applied to the whole season (to check)' },
    veg:    { kc: 1.05, months: [0,0,1,1,1,1,0,0,0,0,0,0], ref: 'Order of magnitude for vegetables in mid-season (to check)' },
    other:  { kc: null, months: [1,1,1,1,1,1,1,1,1,1,1,1], ref: 'Enter Kc' }
  };

  var EFFICIENCY = { drip: 0.90, sprinkler: 0.75, surface: 0.60 }; // indicative; editable

  function effectiveRain(P) {
    if (P === null || P === undefined || isNaN(P)) return null;
    if (P <= 250) return Math.max(0, P * (125 - 0.2 * P) / 125);
    return 125 + 0.1 * P;
  }

  /**
   * inp: {
   *   et0[12] mm, rain[12] mm, ghi[12] kWh/m²/day (optional),
   *   kc, months[12] 0/1, pe_factor[12] (optional, replaces USDA-SCS), area_ha (optional), ea, head_m (optional), pump_eff, pr,
   *   prices: { diesel_tnd_l, diesel_kwh_l, grid_tnd_kwh, pv_tnd_kwp, pv_life_y } (all optional)
   * }
   */
  function compute(inp) {
    var res = { months: [], totals: {}, missing: [] };
    if (!inp.et0 || !inp.rain) { res.missing.push('climate'); return res; }
    if (!(inp.kc > 0)) res.missing.push('kc');
    var hasArea = inp.area_ha > 0, hasHead = inp.head_m > 0, hasGhi = !!inp.ghi;
    if (!hasArea) res.missing.push('area');
    if (!hasHead) res.missing.push('head');
    if (!hasGhi) res.missing.push('ghi');

    var T = { etc: 0, pe: 0, irn: 0, irg: 0, vol: 0, kwh: 0 };
    var peakKwp = 0, peakMonth = null;
    for (var m = 0; m < 12; m++) {
      var on = inp.months ? !!inp.months[m] : true;
      var et0 = inp.et0[m], P = inp.rain[m];
      var etc = on && inp.kc > 0 && et0 !== null ? inp.kc * et0 : 0;
      // pe_factor[12]: share of the rain that stays in the soil (trained model, ml/); otherwise USDA-SCS
      var pe = inp.pe_factor && inp.pe_factor[m] !== null && inp.pe_factor[m] !== undefined && P !== null && P !== undefined
        ? P * inp.pe_factor[m] : effectiveRain(P);
      var irn = on && pe !== null ? Math.max(0, etc - pe) : 0;
      var irg = inp.ea > 0 ? irn / inp.ea : null;
      var vol = hasArea && irg !== null ? 10 * irg * inp.area_ha : null;          // m³
      var volHa = irg !== null ? 10 * irg : null;                                   // m³/ha
      var kwh = vol !== null && hasHead && inp.pump_eff > 0 ? vol * inp.head_m / (367 * inp.pump_eff) : null;
      var ghi = hasGhi ? inp.ghi[m] : null;
      var kwp = kwh !== null && ghi > 0 && inp.pr > 0 ? kwh / (DAYS[m] * ghi * inp.pr) : null;
      if (kwp !== null && kwp > peakKwp) { peakKwp = kwp; peakMonth = m; }
      res.months.push({ m: m, on: on, et0: et0, rain: P, etc: etc, pe: pe, irn: irn, irg: irg, vol: vol, volHa: volHa, kwh: kwh, ghi: ghi, kwp: kwp });
      T.etc += etc; T.pe += (on ? (pe || 0) : 0); T.irn += irn; T.irg += irg || 0; T.vol += vol || 0; T.kwh += kwh || 0;
    }
    res.totals = T;
    res.totals.volHa = 10 * T.irg;
    res.solar = peakMonth === null ? null : { kwp: peakKwp, peakMonth: peakMonth };

    // costs — only what the user priced
    var p = inp.prices || {}, costs = {};
    if (T.kwh > 0) {
      if (p.diesel_tnd_l > 0 && p.diesel_kwh_l > 0) costs.diesel = T.kwh / p.diesel_kwh_l * p.diesel_tnd_l;
      if (p.grid_tnd_kwh > 0) costs.grid = T.kwh * p.grid_tnd_kwh;
      if (res.solar && p.pv_tnd_kwp > 0 && p.pv_life_y > 0) costs.solar = res.solar.kwp * p.pv_tnd_kwp / p.pv_life_y;
    }
    res.costs = costs;
    return res;
  }

  var api = { compute: compute, effectiveRain: effectiveRain, CROPS: CROPS, EFFICIENCY: EFFICIENCY, DAYS: DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAIA_NEXUS = api;
}(typeof window !== 'undefined' ? window : this));
