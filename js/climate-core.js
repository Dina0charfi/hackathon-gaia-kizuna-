/* ==========================================================================
   GAIA CLIMATE CORE — pure functions, no DOM, no network.

   Turns a NASA POWER monthly climatology (community RE, 2001–2025) into the
   four Land DNA climate values and their monthly series:
     rain   = Σ PRECTOTCORR (mm/day) × days in month
     tmax   = T2M + T2M_RANGE / 2   (mean daily maximum of the month)
     tmin   = T2M − T2M_RANGE / 2   (mean daily minimum of the month)
     et0    = FAO-56 Penman–Monteith on monthly means (Allen et al. 1998,
              eq. 6, 7, 11–13, 37–40; G from eq. 43), × days in month
   Used as the fallback when the Open-Meteo archive is rate-limited, and to
   build the bundled table in js/climate-tn.js (same code, same numbers).
   ========================================================================== */
(function (root) {
  'use strict';

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var PARAMS = ['PRECTOTCORR', 'T2M', 'T2M_RANGE', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'TOA_SW_DWN'];

  function esat(t) { return 0.6108 * Math.exp(17.27 * t / (t + 237.3)); }

  // one month; rs, ra in MJ/m²/day; returns mm/day
  function et0Day(t, range, rh, u2, rs, ra, z, tPrev, tNext) {
    var tmax = t + range / 2, tmin = t - range / 2;
    var P = 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26);
    var gamma = 0.000665 * P;
    var delta = 4098 * esat(t) / Math.pow(t + 237.3, 2);
    var es = (esat(tmax) + esat(tmin)) / 2;
    var ea = Math.max(0, Math.min(1, rh / 100)) * es;
    var rso = (0.75 + 2e-5 * z) * ra;
    var ratio = rso > 0 ? Math.min(1, rs / rso) : 0.5;
    var rnl = 4.903e-9 * (Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2 * (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * ratio - 0.35);
    var rn = 0.77 * rs - rnl;
    var G = 0.07 * (tNext - tPrev);
    var v = (0.408 * delta * (rn - G) + gamma * 900 / (t + 273) * u2 * (es - ea)) / (delta + gamma * (1 + 0.34 * u2));
    return Math.max(0, v);
  }

  // p: { PRECTOTCORR: {JAN..DEC}, ... } with radiation in kWh/m²/day (community RE)
  // z: elevation in m (POWER geometry), fill: fill value
  function fromPower(p, z, fill) {
    fill = fill === undefined ? -999 : fill;
    var get = function (k, m) { var v = p[k] && p[k][MONTHS[m]]; return (v === undefined || v === null || v === fill) ? null : +v; };
    for (var i = 0; i < PARAMS.length; i++) if (!p[PARAMS[i]]) return null;
    var rain = [], et0 = [], tmax = [], tmin = [], ghi = [];
    for (var m = 0; m < 12; m++) {
      var pr = get('PRECTOTCORR', m), t = get('T2M', m), r = get('T2M_RANGE', m), rh = get('RH2M', m), u = get('WS2M', m),
        rs = get('ALLSKY_SFC_SW_DWN', m), ra = get('TOA_SW_DWN', m);
      var tp = get('T2M', (m + 11) % 12), tn = get('T2M', (m + 1) % 12);
      rain.push(pr === null ? null : pr * DAYS[m]);
      tmax.push(t === null || r === null ? null : t + r / 2);
      tmin.push(t === null || r === null ? null : t - r / 2);
      ghi.push(rs);
      et0.push([t, r, rh, u, rs, ra, tp, tn].some(function (v) { return v === null; }) ? null
        : et0Day(t, r, rh, u, rs * 3.6, ra * 3.6, z || 0, tp, tn) * DAYS[m]);
    }
    var sum = function (a) { return a.some(function (v) { return v === null; }) ? null : a.reduce(function (s, v) { return s + v; }, 0); };
    var ok = function (a) { return a.filter(function (v) { return v !== null; }); };
    return {
      rain_mm: sum(rain), et0_mm: sum(et0),
      tmax_hot: ok(tmax).length ? Math.max.apply(null, ok(tmax)) : null,
      tmin_cold: ok(tmin).length ? Math.min.apply(null, ok(tmin)) : null,
      monthly: { rain: rain, et0: et0, tmax: tmax, tmin: tmin, ghi: ghi }
    };
  }

  var api = { MONTHS: MONTHS, DAYS: DAYS, PARAMS: PARAMS, et0Day: et0Day, fromPower: fromPower };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAIA_CLIMATE = api;
}(typeof window !== 'undefined' ? window : this));
