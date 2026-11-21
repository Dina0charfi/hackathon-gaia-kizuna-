/* ==========================================================================
   GAIA SOLAR BRAIN — agrivoltaic intelligence (M3+). Pure functions, no DOM.

   1. Crop response under panels (per month, from solar-core.js light share):
        light factor  fL = min(1, L / Ls) ^ γ        L = light reaching the crop
        heat factor   canopy cooled by ΔT = 4 °C × (1 − L) below the open field;
                      yield loss s × (Tmax − Tcrit) above the crop's threshold
        Yrel = mean over the crop's months of fL × (1 − pen(Tmax − ΔT)) / (1 − pen(Tmax))
      Shade-response classes follow Laub et al. 2022 (Agron. Sustain. Dev. 42:51,
      meta-analysis of crop yields under shade). Parameter values are indicative
      and must be calibrated on trial plots before any decision.
   2. Water: ETc under panels = Kc × ET0 × (1 − β (1 − L)), β = 0.6
      (radiation term of Penman–Monteith in a dry climate; Marrou et al. 2013
      measured 14–29 % less evapotranspiration under panels).
   3. Land Equivalent Ratio  LER = Yrel + E / E_pv-only   (Dupraz et al. 2011)
   4. Optimiser: seeded genetic algorithm over row spacing, panel width, tilt
      and orientation, with the Japanese solar-sharing rule as a constraint:
      the crop must keep at least 80 % of its normal yield (MAFF guideline, 2013).
   4b. Search: NSGA-II multi-objective selection (Deb et al. 2002) over crop yield,
      electricity and the goal score, Japanese rule as a hard constraint.
   5. Weather pilot: hour-by-hour angle of a single-axis tracker (north–south
      axis) that trades light between crop and modules from an hourly weather
      forecast: sun tracking, light for the crop, or heat shield. Default is
      model-predictive control: each forecast day is planned as a whole
      (maximise kWh subject to a daily crop-light target), not hour by hour.
   ========================================================================== */

(function (root) {
  'use strict';

  var S = root.GAIA_SOLAR || (typeof require !== 'undefined' ? require('./solar-core.js') : null);
  var RAD = Math.PI / 180, DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var DT_MAX = 4, BETA = 0.6;

  // Ls: share of full Tunisian sun above which more light adds no yield; γ: curvature;
  // tcrit: daily maximum (°C) above which heat costs yield; s: yield loss per °C above it.
  // kc: FAO-56 Table 12 mid-season value (to check). months: typical Tunisian season.
  // src 'wofost': Ls and g fitted on WOFOST 7.2 (PCSE) runs under shade, NASA POWER weather 2001–2023,
  // Jendouba, Tunis, Kairouan, Sidi Bouzid, 92 seasons (ml/agv-calibration, models/agv-calibration/calibration.json).
  // Literature values they replace: wheat Ls 0.9, g 1.0; potato Ls 0.75, g 0.8. Other crops: literature (Laub et al. 2022).
  var CROPS = {
    lettuce_s: { cls: 'tol', Ls: 0.5, g: 0.5, tcrit: 27, s: 0.05, kc: 1.00, months: [0,0,0,0,1,1,1,1,0,0,0,0] },
    pepper:    { cls: 'mod', Ls: 0.7, g: 0.7, tcrit: 32, s: 0.04, kc: 1.05, months: [0,0,0,1,1,1,1,1,1,0,0,0] },
    tomato:    { cls: 'mod', Ls: 0.8, g: 0.8, tcrit: 32, s: 0.04, kc: 1.15, months: [0,0,1,1,1,1,1,1,0,0,0,0] },
    strawb:    { cls: 'tol', Ls: 0.6, g: 0.6, tcrit: 28, s: 0.04, kc: 0.85, months: [1,1,1,1,1,0,0,0,0,0,1,1] },
    potato:    { cls: 'mod', Ls: 0.74, g: 0.56, tcrit: 28, s: 0.04, kc: 1.15, months: [1,1,1,1,1,0,0,0,0,0,0,0], src: 'wofost' },
    alfalfa:   { cls: 'tol', Ls: 0.65, g: 0.6, tcrit: 35, s: 0.03, kc: 0.95, months: [1,1,1,1,1,1,1,1,1,1,1,1] },
    wheat:     { cls: 'sens', Ls: 0.65, g: 1.7, tcrit: 31, s: 0.05, kc: 1.15, months: [1,1,1,1,1,0,0,0,0,0,1,1], src: 'wofost' }
  };
  var JAPAN_RULE = 0.8;

  function effectiveRain(P) {
    if (P === null || P === undefined || isNaN(P)) return 0;
    return P <= 250 ? Math.max(0, P * (125 - 0.2 * P) / 125) : 125 + 0.1 * P;
  }
  function pen(T, c) { return Math.min(0.6, c.s * Math.max(0, T - c.tcrit)); }

  /**
   * sim: result of GAIA_SOLAR.simulate; clim: { tmax[12], et0[12] mm/month, rain[12] mm/month }
   * → { yrel, months[12] (ratio or null), waterOpen, waterUnder (m³/ha/yr), heatGain }
   */
  function cropResponse(sim, cropKey, clim, lat) {
    var c = CROPS[cropKey], ratios = [], n = 0, sum = 0, wO = 0, wU = 0, heatGain = 0;
    for (var m = 0; m < 12; m++) {
      var mo = sim.months[m];
      if (!c.months[m] || !mo || mo.lightShare === null) { ratios.push(null); continue; }
      var L = Math.max(0, Math.min(1, mo.lightShare));
      var fL = Math.pow(Math.min(1, L / c.Ls), c.g);
      var T = clim && clim.tmax && clim.tmax[m] !== null ? clim.tmax[m] : null;
      var hO = T === null ? 0 : pen(T, c), hU = T === null ? 0 : pen(T - DT_MAX * (1 - L), c);
      var r = fL * (1 - hU) / (1 - hO);
      ratios.push(r); sum += r; n++; heatGain += (1 - hU) / (1 - hO) - 1;
      if (clim && clim.et0 && clim.et0[m] !== null) {
        var etc = c.kc * clim.et0[m], pe = effectiveRain(clim.rain ? clim.rain[m] : 0);
        wO += Math.max(0, etc - pe); wU += Math.max(0, etc * (1 - BETA * (1 - L)) - pe);
      }
    }
    var out = { yrel: n ? sum / n : null, months: ratios, waterOpen: wO * 10, waterUnder: wU * 10, heatGain: n ? heatGain / n : 0, model: 'formula' };
    // GAIA AgriNet (trained neural network) replaces the season yield for the crops it was trained on
    var nn = n ? agriNet(cropKey, sim, clim, lat) : null;
    if (nn) {
      out.formulaYrel = sum / n; out.yrel = nn.yrel; out.model = 'agrinet';
      if (nn.yfull !== undefined) { out.yieldFull = nn.yfull; out.yieldUnder = nn.yrel * nn.yfull; }
    }
    return out;
  }

  /* ---------------------------------------------------------- GAIA AgriNet (neural network) */
  // Weights come from js/agv-net.js (ml/agv-net/02_train.py). Inputs are built from the parcel's
  // monthly climate over the crop's months, the same quantities the network was trained on.
  function NET() { return root.GAIA_AGV_NET || (typeof global !== 'undefined' && global.GAIA_AGV_NET) || null; }
  function mlp(N, x) {
    var h = x.map(function (v, i) { return (v - N.x_mean[i]) / N.x_std[i]; });
    N.layers.forEach(function (L, k) {
      var o = [];
      for (var j = 0; j < L.out; j++) { var s = L.b[j]; for (var i = 0; i < L.in; i++) s += h[i] * L.W[i * L.out + j]; o.push(k < N.layers.length - 1 ? Math.tanh(s) : s); }
      h = o;
    });
    return h.map(function (v, i) { return v * N.y_std[i] + N.y_mean[i]; });
  }
  function agriNet(cropKey, sim, clim, lat) {
    var N = NET(), c = CROPS[cropKey];
    if (!N || (cropKey !== 'wheat' && cropKey !== 'potato') || lat === undefined || lat === null || !clim || !clim.ghi || !clim.tmax || !clim.tmin) return null;
    var Ls = 0, k = 0, rad = 0, tx = 0, tn = 0;
    for (var m = 0; m < 12; m++) {
      if (!c.months[m]) continue;
      var mo = sim.months[m];
      if (!mo || mo.lightShare === null || clim.ghi[m] === null || clim.tmax[m] === null || clim.tmin[m] === null) return null;
      Ls += mo.lightShare; rad += clim.ghi[m] * 3.6 * DAYS[m]; tx += clim.tmax[m]; tn += clim.tmin[m]; k++;
    }
    if (!k) return null;
    var L = Ls / k;
    if (L < 0.3) return null;                       // below the shade levels the network was trained on: keep the formula
    var x = function (l) { return N.features.map(function (f) {
      return { is_wheat: cropKey === 'wheat' ? 1 : 0, is_potato: cropKey === 'potato' ? 1 : 0, L: l, lat: lat, rad_gj: rad / 1000, tmax: tx / k, tmin: tn / k, shift: 0 }[f];
    }); };
    var full = mlp(N, x(1)), under = mlp(N, x(Math.min(1, L)));
    if (!(full[0] > 0.2)) return null;
    // relative to the network's own full-sun answer, so full sun is exactly 100 %
    var out = { yrel: Math.max(0, Math.min(1.1, under[0] / full[0])) };
    if (N.outputs.indexOf('yield_full_t_ha') !== -1) out.yfull = Math.max(0, full[N.outputs.indexOf('yield_full_t_ha')]);
    return out;
  }

  // electricity of a conventional ground-mounted plant on the same land (PV-only reference for LER)
  function pvOnlyKwhPerHa(base) {
    var r = S.simulate(Object.assign({}, base, { height: 1.2, width: 2, pitch: 2 / 0.45, tilt: Math.min(35, Math.round(Math.abs(base.lat) - 5)), azimuth: 180, area_ha: 1 }));
    return r.annual_kwh;
  }

  function evaluate(base, genes, cropKey, clim, refKwhHa) {
    var g = Object.assign({}, base, genes);
    var sim = S.simulate(g), cr = cropResponse(sim, cropKey, clim, g.lat);
    var eRel = refKwhHa > 0 ? sim.annual_kwh / (refKwhHa * (g.area_ha || 1)) : 0;
    return {
      genes: genes, kwh: sim.annual_kwh, kwp: sim.kwp, light: sim.lightShareYear, yrel: cr.yrel, eRel: eRel,
      ler: (cr.yrel || 0) + eRel, waterSaved: (cr.waterOpen - cr.waterUnder) * (g.area_ha || 1),
      waterOpen: cr.waterOpen * (g.area_ha || 1), cropMonths: cr.months, sim: sim,
      model: cr.model, yieldFull: cr.yieldFull, yieldUnder: cr.yieldUnder, formulaYrel: cr.formulaYrel
    };
  }

  /* ---------------------------------------------------------- optimiser */
  function rng(seed) { // mulberry32: same parcel + crop → same answer, so a demo is repeatable
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  var SPACE = { pitch: [3, 16, 0.5], width: [1, 4, 0.1], tilt: [0, 40, 1], azimuth: [150, 210, 5] };
  function snap(k, v) { var s = SPACE[k]; v = Math.max(s[0], Math.min(s[1], v)); return Math.round(v / s[2]) * s[2]; }
  function repair(x) { if (x.pitch < x.width + 1) x.pitch = snap('pitch', x.width + 1); return x; }

  /**
   * Returns a stepper: call next() once per generation (lets the page animate);
   * opts: { base, crop, clim, goal: 'ler'|'energy'|'crop', japan: bool, pop, gens, seed }
   */
  function optimizer(opts) {
    var R = rng(opts.seed || 7), keys = Object.keys(SPACE), ref = pvOnlyKwhPerHa(opts.base);
    var pop = opts.pop || 36, gens = opts.gens || 28, gen = 0, all = [], P = [];
    var minY = opts.japan ? JAPAN_RULE : 0;
    function fitness(e) {
      var y = e.yrel || 0, f = opts.goal === 'energy' ? e.eRel : opts.goal === 'crop' ? y + 0.25 * e.eRel + 0.15 * (e.waterSaved / Math.max(1, e.waterOpen)) : e.ler;
      if (opts.goal === 'crop' && e.eRel < 0.3) f -= 3 * (0.3 - e.eRel);
      if (y < minY) f -= 4 * (minY - y) + 0.5;
      return f;
    }
    function make(x) { var e = evaluate(opts.base, repair(x), opts.crop, opts.clim, ref); e.fit = fitness(e); e.ok = (e.yrel || 0) >= minY; e.gen = gen; all.push(e); return e; }
    function randomGenes() { var x = {}; keys.forEach(function (k) { x[k] = snap(k, SPACE[k][0] + R() * (SPACE[k][1] - SPACE[k][0])); }); return x; }
    function pick() { var b = null; for (var i = 0; i < 3; i++) { var c = P[Math.floor(R() * P.length)]; if (!b || c.fit > b.fit) b = c; } return b; }
    function child(a, b, sigma) {
      var x = {};
      keys.forEach(function (k) {
        var s = SPACE[k], u = R(), v = a.genes[k] * u + b.genes[k] * (1 - u);
        if (R() < 0.35) v += (R() + R() + R() - 1.5) * sigma * (s[1] - s[0]);
        x[k] = snap(k, v);
      });
      return x;
    }
    // seed the population with the farmer's own layout so the answer is never worse than it
    if (opts.start) P.push(make(Object.assign({}, opts.start)));
    while (P.length < pop) P.push(make(randomGenes()));
    function best() { return P.reduce(function (b, e) { return !b || e.fit > b.fit ? e : b; }, null); }

    /* NSGA-II (Deb et al. 2002). Objectives, all maximised: crop yield, electricity, and the
       goal score (so the best layout for the chosen goal is always kept). The Japanese rule is
       a constraint: a layout that respects it always beats one that does not (constrained domination). */
    function objs(e) { return [e.yrel || 0, e.eRel || 0, e.fit]; }
    function viol(e) { return Math.max(0, minY - (e.yrel || 0)); }
    function dominates(a, b) {
      var va = viol(a), vb = viol(b);
      if (va > 0 || vb > 0) return va < vb;
      var oa = objs(a), ob = objs(b), better = false;
      for (var i = 0; i < oa.length; i++) { if (oa[i] < ob[i] - 1e-12) return false; if (oa[i] > ob[i] + 1e-12) better = true; }
      return better;
    }
    function fronts(R) {
      var S = R.map(function () { return []; }), n = R.map(function () { return 0; }), F = [[]];
      for (var p = 0; p < R.length; p++) {
        for (var q = 0; q < R.length; q++) {
          if (p === q) continue;
          if (dominates(R[p], R[q])) S[p].push(q); else if (dominates(R[q], R[p])) n[p]++;
        }
        if (n[p] === 0) { R[p].rank = 0; F[0].push(p); }
      }
      for (var i = 0; F[i].length; i++) {
        var Q = [];
        F[i].forEach(function (p) { S[p].forEach(function (q) { if (--n[q] === 0) { R[q].rank = i + 1; Q.push(q); } }); });
        F.push(Q);
      }
      return F.slice(0, -1).map(function (f) { return f.map(function (k) { return R[k]; }); });
    }
    function crowding(f) {
      f.forEach(function (e) { e.crowd = 0; });
      for (var m = 0; m < 3; m++) {
        f.sort(function (a, b) { return objs(a)[m] - objs(b)[m]; });
        var lo = objs(f[0])[m], hi = objs(f[f.length - 1])[m], span = hi - lo || 1;
        f[0].crowd = f[f.length - 1].crowd = Infinity;
        for (var i = 1; i < f.length - 1; i++) f[i].crowd += (objs(f[i + 1])[m] - objs(f[i - 1])[m]) / span;
      }
    }
    function better(a, b) { return a.rank !== b.rank ? a.rank < b.rank : a.crowd > b.crowd; }
    function tour() { var a = P[Math.floor(R() * P.length)], b = P[Math.floor(R() * P.length)]; return better(a, b) ? a : b; }
    fronts(P).forEach(crowding);

    return {
      ref: ref, all: all, gens: gens, method: 'nsga2',
      done: function () { return gen >= gens; },
      best: best,
      next: function () {
        if (gen >= gens) return best();
        gen++;
        var sigma = 0.25 * (1 - gen / gens) + 0.03, Q = [];
        while (Q.length < pop) Q.push(make(child(tour(), tour(), sigma)));
        var nextP = [];
        fronts(P.concat(Q)).some(function (f) {
          crowding(f);
          if (nextP.length + f.length <= pop) { nextP = nextP.concat(f); return nextP.length === pop; }
          f.sort(function (a, b) { return b.crowd - a.crowd; });
          nextP = nextP.concat(f.slice(0, pop - nextP.length));
          return true;
        });
        P = nextP;
        return best();
      },
      front: function () { // Pareto front crop yield vs energy over every layout evaluated
        var pts = all.slice().sort(function (a, b) { return b.yrel - a.yrel; }), out = [], maxE = -1;
        pts.forEach(function (p) { if (p.kwh > maxE) { out.push(p); maxE = p.kwh; } });
        return out;
      }
    };
  }

  /* ---------------------------------------------------------- weather pilot */
  // Erbs hourly diffuse fraction, used only when the weather source gives GHI alone
  function erbsHourly(kt) { return kt <= 0.22 ? 1 - 0.09 * kt : kt <= 0.8 ? 0.9511 - 0.1604 * kt + 4.388 * kt * kt - 16.638 * Math.pow(kt, 3) + 12.336 * Math.pow(kt, 4) : 0.165; }

  function eotMinutes(doy) { var B = 2 * Math.PI * (doy - 81) / 364; return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); }
  function doyOf(d) { return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5); }

  /**
   * One hour for one panel position.
   * w: { sun{el,az}, ghi, dni, dhi (W/m²), t (°C) }; geo: { tilt, azimuth, width, pitch, height }; kwp, pr
   */
  function hour(w, geo, kwp, pr) {
    if (w.sun.el <= 0 || w.ghi <= 0) return { e: 0, g: 0, poa: 0 };
    var b = geo.tilt * RAD, s = Math.sin(w.sun.el * RAD);
    var cosInc = s * Math.cos(b) + Math.cos(w.sun.el * RAD) * Math.sin(b) * Math.cos((w.sun.az - geo.azimuth) * RAD);
    var beamH = Math.min(w.ghi, w.dni * s), dif = Math.max(0, w.ghi - beamH);
    var poa = w.dni * Math.max(0, cosInc) + dif * (1 + Math.cos(b)) / 2 + w.ghi * 0.2 * (1 - Math.cos(b)) / 2;
    var sh = S.shadeFraction(w.sun, geo), coverH = Math.min(1, geo.width * Math.abs(Math.cos(b)) / geo.pitch);
    var g = beamH * (1 - sh.frac) + dif * (1 - coverH);
    var tcell = w.t + poa / 800 * 25, derate = 1 - 0.004 * (tcell - 25);
    return { e: kwp * poa / 1000 * pr * derate, g: g, poa: poa };
  }

  var ANGLES = []; for (var a = -55; a <= 55; a += 5) ANGLES.push(a);

  /**
   * weather: [{ time (Date, UTC), ghi, dni, dhi, t, et0 (mm/h) }]; lat, lon
   * cfg: { width, pitch, height, kwp, pr, fixedTilt, fixedAz, crop, alpha (0 = crop first, 1 = energy first) }
   */
  function pilot(weather, lat, lon, cfg) {
    var c = CROPS[cfg.crop], Isat = c.Ls * 1000;
    var trk = { azimuth: 90, width: cfg.width, pitch: cfg.pitch, height: cfg.height };
    var fixed = { azimuth: cfg.fixedAz, tilt: cfg.fixedTilt, width: cfg.width, pitch: cfg.pitch, height: cfg.height };
    var strat = { fixed: [], sun: [], gaia: [] }, plan = [];
    // what drove the decision: heat (panels kept across the sun to shade the crop), light for the crop, or energy
    function modeOf(heat, best, bestE) { return heat > 0 && best.g <= bestE.g * 1.02 ? 'shield' : Math.abs(best.ang - bestE.ang) <= 5 ? 'energy' : 'light'; }
    weather.forEach(function (w) {
      var mid = new Date(w.time.getTime() - 30 * 60000), doy = doyOf(mid);
      var solarH = mid.getUTCHours() + mid.getUTCMinutes() / 60 + lon / 15 + eotMinutes(doy) / 60;
      var sun = S.sunPosition(lat, doy, ((solarH % 24) + 24) % 24);
      var dni = w.dni, dhi = w.dhi;
      if (dni === null || dni === undefined) {
        var s = Math.max(0.01, Math.sin(sun.el * RAD)), kt = sun.el > 0 ? Math.min(1, w.ghi / (1367 * s)) : 0, kd = erbsHourly(kt);
        dhi = w.ghi * kd; dni = sun.el > 3 ? w.ghi * (1 - kd) / s : 0;
      }
      var W = { sun: sun, ghi: w.ghi, dni: dni, dhi: dhi, t: w.t };
      var heat = Math.max(0, Math.min(1, (w.t - c.tcrit + 1) / 3));   // 0 two degrees below the threshold → 1 two above
      var open = Math.min(w.ghi, Isat);
      var et = (w.et0 || 0) * c.kc;
      function rec(kind, ang, r) {
        var water = et * (1 - BETA * (1 - (w.ghi > 0 ? r.g / w.ghi : 1)));
        return { time: w.time, t: w.t, ghi: w.ghi, ang: ang, e: r.e, g: r.g, useful: Math.min(r.g, Isat), open: open, mode: kind,
          hot: w.t > c.tcrit, heatLoad: w.t > c.tcrit ? r.g / 1000 : 0, heatOpen: w.t > c.tcrit ? w.ghi / 1000 : 0, et: water, etOpen: et, sunEl: sun.el };
      }
      strat.fixed.push(rec('fixed', cfg.fixedTilt, hour(W, fixed, cfg.kwp, cfg.pr)));
      if (sun.el <= 0 || w.ghi <= 0) {
        var night = { e: 0, g: 0 };
        strat.sun.push(rec('night', 0, night)); strat.gaia.push(rec('night', 0, night)); return;
      }
      var opts = ANGLES.map(function (ang) { var r = hour(W, Object.assign({ tilt: ang }, trk), cfg.kwp, cfg.pr); r.ang = ang; return r; });
      var eMin = Infinity, eMax = 0, uMin = Infinity, uMax = -Infinity;
      opts.forEach(function (r) {
        r.u = Math.min(r.g, Isat) - 1.6 * heat * r.g;            // light the crop can use, minus heat it must absorb
        eMin = Math.min(eMin, r.e); eMax = Math.max(eMax, r.e); uMin = Math.min(uMin, r.u); uMax = Math.max(uMax, r.u);
      });
      var eR = Math.max(eMax - eMin, 0.05 * eMax, 1e-6), uR = Math.max(uMax - uMin, 0.05 * Math.abs(uMax), 1e-6);
      var bestE = opts.reduce(function (b, r) { return r.e > b.e ? r : b; }, opts[0]);
      strat.sun.push(rec('energy', bestE.ang, bestE));
      if (cfg.mpc === false) {
        var best = null, bestS = -1e9;
        opts.forEach(function (r) {
          var score = cfg.alpha * (r.e - eMin) / eR + (1 - cfg.alpha) * (r.u - uMin) / uR;
          if (score > bestS + 1e-9) { bestS = score; best = r; }
        });
        strat.gaia.push(rec(modeOf(heat, best, bestE), best.ang, best));
        return;
      }
      // horizon planning: keep the options, decide the whole day at once below
      var day = Math.floor((w.time.getTime() / 3600e3 + lon / 15) / 24);
      plan.push({ idx: strat.gaia.length, day: day, opts: opts, uMin: uMin, uMax: uMax, bestE: bestE, heat: heat, rec: rec });
      strat.gaia.push(null);
    });

    /* Model-predictive control over each forecast day.
       Maximise the day's electricity subject to: light the crop can use (heat counted against it)
       ≥ τ × the best the crop could get that day, with τ = 1 − priority (0 = crop first, 1 = energy first).
       Solved exactly for the discrete angles by Lagrangian relaxation: for a multiplier λ each hour
       picks argmax e + λ·u; λ is found by bisection as the smallest value that meets the target. */
    if (cfg.mpc !== false) {
      var tau = Math.max(0, Math.min(1, 1 - cfg.alpha)), days = {};
      plan.forEach(function (p) { (days[p.day] = days[p.day] || []).push(p); });
      Object.keys(days).forEach(function (k) {
        var H = days[k], need = 0, eS = 0, uS = 0;
        H.forEach(function (p) { need += tau * (p.uMax - p.uMin); eS = Math.max(eS, p.bestE.e); uS = Math.max(uS, p.uMax - p.uMin); });
        eS = eS || 1; uS = uS || 1;
        function choose(lam) {
          var got = 0, pick = H.map(function (p) {
            var b = null, bs = -Infinity;
            p.opts.forEach(function (r) { var s = r.e / eS + lam * (r.u - p.uMin) / uS; if (s > bs + 1e-12) { bs = s; b = r; } });
            got += b.u - p.uMin; return b;
          });
          return { pick: pick, ok: got >= need - 1e-9 };
        }
        var sol = choose(0);
        if (!sol.ok) {
          var lo = 0, hi = 1;
          while (!choose(hi).ok && hi < 1e6) hi *= 4;
          for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (choose(mid).ok) hi = mid; else lo = mid; }
          sol = choose(hi);
          // the angles are discrete, so the feasible multiplier usually gives the crop more than the target:
          // hand the surplus back to the panels hour by hour, best kWh per unit of light first
          var loPick = choose(lo).pick, got = 0, sw = [];
          H.forEach(function (p, i) {
            got += sol.pick[i].u - p.uMin;
            var de = loPick[i].e - sol.pick[i].e, du = loPick[i].u - sol.pick[i].u;
            if (de > 0 && du < 0) sw.push({ i: i, de: de, du: du, r: de / -du });
          });
          sw.sort(function (a, b) { return b.r - a.r; });
          sw.forEach(function (s) { if (got + s.du >= need - 1e-9) { got += s.du; sol.pick[s.i] = loPick[s.i]; } });
        }
        H.forEach(function (p, i) { var b = sol.pick[i]; strat.gaia[p.idx] = p.rec(modeOf(p.heat, b, p.bestE), b.ang, b); });
      });
    }
    function tot(list) {
      var o = { kwh: 0, useful: 0, open: 0, hot: 0, heatLoad: 0, heatOpen: 0, et: 0, etOpen: 0, modes: { energy: 0, light: 0, shield: 0 } };
      list.forEach(function (h) { o.kwh += h.e; o.useful += h.useful; o.open += h.open; o.hot += h.hot && h.ghi > 0 ? 1 : 0; o.heatLoad += h.heatLoad; o.heatOpen += h.heatOpen; o.et += h.et; o.etOpen += h.etOpen; if (o.modes[h.mode] !== undefined) o.modes[h.mode]++; });
      o.lightPct = o.open > 0 ? o.useful / o.open : null;
      o.heatCut = o.heatOpen > 0 ? 1 - o.heatLoad / o.heatOpen : null;
      o.waterCut = o.etOpen > 0 ? 1 - o.et / o.etOpen : null;
      return o;
    }
    return { hours: strat, totals: { fixed: tot(strat.fixed), sun: tot(strat.sun), gaia: tot(strat.gaia) }, crop: cfg.crop, method: cfg.mpc === false ? 'greedy' : 'mpc' };
  }

  /**
   * Typical week built from the parcel's own monthly climate when no live forecast can be read.
   * clim: { ghi[12] kWh/m²/day, tmax[12], tmin[12], et0[12] mm/month }; heat: extra °C (heat-wave scenario)
   */
  function typicalWeek(lat, lon, month, clim, heat, startUTC) {
    var R = rng(1000 + month), out = [], doy = S.DOY[month];
    var start = startUTC || Date.UTC(2026, month, 12, 0, 0, 0);
    var H = clim.ghi[month];
    var tmax = clim.tmax[month], tmin = clim.tmin[month], et0d = clim.et0[month] / DAYS[month];
    var dTs = [];
    for (var k = 0; k <= 7; k++) dTs.push((R() - 0.5) * 3 + (heat ? heat * Math.min(1, (k + 1) / 3) * (k < 6 ? 1 : 0.5) : 0));
    for (var d = 0; d < 7; d++) {
      var cloud = 0.82 + 0.3 * R();
      var day = [], sinSum = 0;
      for (var h = 1; h <= 24; h++) {
        var t0 = start + (d * 24 + h) * 3600e3, mid = new Date(t0 - 1800e3);
        var solarH = mid.getUTCHours() + mid.getUTCMinutes() / 60 + lon / 15 + eotMinutes(doyOf(mid)) / 60;
        var sun = S.sunPosition(lat, doy, ((solarH % 24) + 24) % 24), s = Math.max(0, Math.sin(sun.el * RAD));
        day.push({ t0: t0, s: s, solarH: solarH, dT: dTs[d] + (dTs[d + 1] - dTs[d]) * h / 24 }); sinSum += s;
      }
      day.forEach(function (x) {
        var ghi = sinSum > 0 ? H * cloud * 1000 * x.s / sinSum : 0; // W/m² averaged over the hour
        var ph = Math.cos((x.solarH - 15) / 24 * 2 * Math.PI);    // warmest at 15 h solar time
        var temp = (tmin + tmax) / 2 + x.dT + (tmax - tmin) / 2 * ph;
        out.push({ time: new Date(x.t0), ghi: ghi, dni: null, dhi: null, t: temp, et0: sinSum > 0 ? et0d * (heat ? 1 + heat / 25 : 1) * x.s / sinSum : 0 });
      });
    }
    return out;
  }

  // Open-Meteo hourly forecast (local times + utc_offset_seconds) → weather rows in UTC
  function parseOpenMeteo(d) {
    var h = d && d.hourly; if (!h || !h.time) return null;
    var off = (d.utc_offset_seconds || 0) * 1000;
    return h.time.map(function (tm, i) {
      return { time: new Date(Date.parse(tm + ':00Z') - off), ghi: h.shortwave_radiation[i] || 0, dni: h.direct_normal_irradiance ? h.direct_normal_irradiance[i] : null,
        dhi: h.diffuse_radiation ? h.diffuse_radiation[i] : null, t: h.temperature_2m[i], et0: h.et0_fao_evapotranspiration ? h.et0_fao_evapotranspiration[i] || 0 : 0 };
    }).filter(function (r) { return r.t !== null && r.t !== undefined; });
  }
  function forecastUrl(lat, lon) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + (+lat).toFixed(4) + '&longitude=' + (+lon).toFixed(4) +
      '&hourly=temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,et0_fao_evapotranspiration&forecast_days=7&timezone=auto';
  }

  var api = { CROPS: CROPS, JAPAN_RULE: JAPAN_RULE, cropResponse: cropResponse, agriNet: agriNet, hasNet: function () { return !!NET(); }, evaluate: evaluate, pvOnlyKwhPerHa: pvOnlyKwhPerHa,
    optimizer: optimizer, pilot: pilot, typicalWeek: typicalWeek, parseOpenMeteo: parseOpenMeteo, forecastUrl: forecastUrl, hour: hour, SPACE: SPACE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAIA_AGV_AI = api;
}(typeof window !== 'undefined' ? window : this));
