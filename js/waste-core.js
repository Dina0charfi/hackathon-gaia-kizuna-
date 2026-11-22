/* GAIA waste-to-energy: farm waste → biogas (anaerobic digester) → cooking gas, electricity and fertiliser.
   Pure functions, no DOM: used by waste.js and testable with node.

   Yields are typical literature values for fresh matter (FAO / GIZ biogas guides), to be checked against a local
   test of the farm's own waste. The digester is a small buried, unheated one: its gas output follows the
   temperature of the season (a cold digester makes much less gas).
*/
(function (root) {
  'use strict';

  // per source: how it is counted, gas yield, nitrogen share, water added at feeding, months it is available
  var SOURCES = {
    cow:      { unit: 'head', kg_day: 10,  m3_per_kg: 0.040, n: 0.005, water: 1, months: null },  // fresh dung per head and day
    small:    { unit: 'head', kg_day: 1.5, m3_per_kg: 0.050, n: 0.010, water: 1, months: null },  // sheep or goat
    poultry:  { unit: 'head', kg_day: 0.1, m3_per_kg: 0.070, n: 0.015, water: 1, months: null },
    pomace:   { unit: 't_year',  m3_per_kg: 0.090, n: 0.005, water: 3, months: [10, 11, 0, 1, 2] },  // olive grignons, Nov–Mar
    margines: { unit: 'm3_year', m3_per_kg: 0.020, n: 0.001, water: 0, months: [10, 11, 0, 1, 2] },  // olive mill wastewater (1 m³ ≈ 1 t)
    residues: { unit: 't_year',  m3_per_kg: 0.070, n: 0.004, water: 3, months: [5, 6, 7, 8, 9] },    // green crop residues, Jun–Oct
    food:     { unit: 'kg_day',  m3_per_kg: 0.100, n: 0.008, water: 1, months: null }                // kitchen and market waste
  };
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var KWH_PER_M3 = 6.0;          // biogas at ~60 % methane
  var ELEC_EFF = 0.25;           // small gas generator
  var M3_PER_BOTTLE = 29;        // one 13 kg butane bottle ≈ 29 m³ of biogas for cooking (stove efficiencies included)
  var CO2_BUTANE_KG = 13 * 3.0;  // kg CO2 per bottle burnt
  var CO2_GRID = 0.46;           // kg CO2 per kWh of the Tunisian grid (mostly natural gas)
  var HRT_DAYS = 40;             // time the waste stays in the digester
  var UREA_N_PER_BAG = 23;       // a 50 kg bag of urea holds 23 kg of nitrogen

  /** Gas output of an unheated buried digester relative to a warm one, from the mean air temperature (°C). */
  function tempFactor(t) {
    var d = t + 3;                                              // buried: a little warmer than the air
    var pts = [[10, 0.15], [15, 0.35], [20, 0.6], [25, 0.8], [30, 0.95], [35, 1]];
    if (d <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (d <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (d - a[0]) / (b[0] - a[0]); }
    }
    return 1;
  }

  /** Fresh kg fed in month m (0–11) from one source. */
  function kgInMonth(key, qty, m) {
    var s = SOURCES[key];
    if (!(qty > 0)) return 0;
    if (s.unit === 'head') return qty * s.kg_day * DAYS[m];
    if (s.unit === 'kg_day') return qty * DAYS[m];
    var total = qty * 1000;                                     // t or m³ per year → kg
    if (!s.months) return total * DAYS[m] / 365;
    return s.months.indexOf(m) === -1 ? 0 : total / s.months.length;
  }

  /**
   * inp = {
   *   cow, small, poultry (heads; share_stable 0–1 = share of the dung that can be collected),
   *   pomace (t/yr), margines (m³/yr), residues (t/yr), food (kg/day),
   *   temp[12] (mean air °C, optional), bottles_month (butane bottles the household uses),
   *   generator (bool: surplus gas → electricity), prices { bottle, kwh, digester_m3, generator_kw }
   * }
   */
  function compute(inp) {
    var share = inp.share_stable >= 0 && inp.share_stable <= 1 ? inp.share_stable : 1;
    var temp = inp.temp && inp.temp.length === 12 ? inp.temp : [12, 13, 15, 18, 22, 26, 29, 29, 26, 22, 17, 13];
    var months = [], tot = { kg: 0, gas: 0, gas_ideal: 0, n: 0, slurry_day_max: 0 };
    var bySource = {};
    for (var m = 0; m < 12; m++) {
      var f = tempFactor(temp[m]), row = { m: m, factor: f, gas: 0, kg: 0, src: {} };
      var slurry = 0;
      Object.keys(SOURCES).forEach(function (k) {
        var s = SOURCES[k], q = inp[k];
        var kg = kgInMonth(k, q, m) * (s.unit === 'head' ? share : 1);
        if (!kg) return;
        var g = kg * s.m3_per_kg * f;
        row.src[k] = g; row.gas += g; row.kg += kg;
        bySource[k] = (bySource[k] || 0) + g;
        tot.gas_ideal += kg * s.m3_per_kg;
        tot.n += kg * s.n;
        slurry += kg * (1 + s.water) / 1000;                    // m³ of mix fed this month
      });
      row.slurry_day = slurry / DAYS[m];
      tot.slurry_day_max = Math.max(tot.slurry_day_max, row.slurry_day);
      tot.kg += row.kg; tot.gas += row.gas;
      months.push(row);
    }

    // uses: cooking first, then electricity (if a generator is chosen); what is left is burnt off
    var need = (inp.bottles_month > 0 ? inp.bottles_month : 0) * M3_PER_BOTTLE * 12 / 365;   // m³ per day
    var bottles = 0, kwh = 0, flared = 0;
    months.forEach(function (r) {
      var perDay = r.gas / DAYS[r.m];
      var cook = Math.min(perDay, need) * DAYS[r.m];
      var rest = r.gas - cook;
      r.cook_m3 = cook; r.bottles = cook / M3_PER_BOTTLE;
      r.kwh = inp.generator ? rest * KWH_PER_M3 * ELEC_EFF : 0;
      r.flared = inp.generator ? 0 : rest;
      bottles += r.bottles; kwh += r.kwh; flared += r.flared;
    });

    var vol = Math.max(2, Math.ceil(tot.slurry_day_max * HRT_DAYS * 1.2));                  // digester (m³)
    var genKw = inp.generator && kwh > 0 ? Math.max(1, Math.round(Math.max.apply(null, months.map(function (r) { return r.kwh / DAYS[r.m]; })) / 8 * 10) / 10) : 0;
    var p = inp.prices || {};
    var cost = vol * (p.digester_m3 || 0) + genKw * (p.generator_kw || 0);
    var saved = bottles * (p.bottle || 0) + kwh * (p.kwh || 0);

    return {
      months: months, by_source: bySource,
      totals: {
        waste_t: tot.kg / 1000, gas_m3: tot.gas, gas_ideal_m3: tot.gas_ideal, energy_kwh: tot.gas * KWH_PER_M3,
        bottles: bottles, need_bottles: (inp.bottles_month > 0 ? inp.bottles_month : 0) * 12,
        kwh_elec: kwh, flared_m3: flared, n_kg: tot.n, urea_bags: tot.n / UREA_N_PER_BAG,
        digestate_t: tot.kg * 0.95 / 1000,
        co2_t: (bottles * CO2_BUTANE_KG + kwh * CO2_GRID) / 1000,
        digester_m3: tot.gas > 0 ? vol : 0, generator_kw: genKw,
        cost_tnd: tot.gas > 0 ? cost : 0, saved_tnd_year: saved,
        payback_years: saved > 0 && cost > 0 ? cost / saved : null
      }
    };
  }

  /**
   * Day-by-day year for the animation: gas made each day, cooking use, gas bag level, electricity.
   * The gas bag holds about one day of average production.
   */
  function daily(inp, res) {
    var avg = res.totals.gas_m3 / 365, cap = Math.max(1, avg), need = (inp.bottles_month > 0 ? inp.bottles_month : 0) * M3_PER_BOTTLE * 12 / 365;
    var out = [], bag = cap / 2, d = 0;
    res.months.forEach(function (r) {
      var perDay = r.gas / DAYS[r.m];
      for (var i = 0; i < DAYS[r.m]; i++, d++) {
        var wobble = 1 + 0.08 * Math.sin(d * 0.9) ;               // day-to-day variation of feeding and weather
        var made = perDay * wobble;
        bag += made;
        var cook = Math.min(bag, need); bag -= cook;
        var extra = Math.max(0, bag - cap);
        var kwh = inp.generator ? extra * KWH_PER_M3 * ELEC_EFF : 0;
        bag = Math.min(bag, cap);
        out.push({ day: d, m: r.m, made: made, cook: cook, short: Math.max(0, need - cook), kwh: kwh, flared: inp.generator ? 0 : extra, bag: bag / cap });
      }
    });
    return out;
  }

  // ---------------------------------------------------------------- carbon footprint
  // kg CO2-equivalent (GWP100, IPCC AR5: CH4 = 28, N2O = 265). Typical factors, to be checked.
  var EF = {
    diesel_l: 2.68,                 // burning one litre of diesel
    diesel_kwh_l: 3,                // a diesel pump set lifts about 3 kWh of pumping work per litre
    grid_kwh: CO2_GRID,             // Tunisian grid
    solar_kwh: 0.04,                // solar panels over their life (manufacturing)
    bottle: CO2_BUTANE_KG,          // one 13 kg butane bottle
    urea_bag: 230,                  // 50 kg urea: manufacturing (~100) + CO2 released in the field (~37) + N2O from its nitrogen (~96)
    enteric: { cow: 35 * 28, small: 5 * 28, poultry: 0 },          // digestion of the animals (IPCC Tier 1, warm region)
    manure: { cow: 1.5 * 28, small: 0.2 * 28, poultry: 0.02 * 28 }  // methane of manure left in heaps; captured by a digester
  };

  /**
   * Footprint today and with GAIA, per source, and the carbon tax at a given price.
   * inp = { pump_kwh, energy: 'diesel'|'grid'|'solar', urea_bags, bottles_year, cow, small, poultry, share_stable,
   *         gaia: { solar: bool, bottles_saved, urea_saved, kwh_biogas }, tax_tnd_t }
   */
  function carbon(inp) {
    var share = inp.share_stable >= 0 && inp.share_stable <= 1 ? inp.share_stable : 1;
    var kwh = inp.pump_kwh > 0 ? inp.pump_kwh : 0;
    var pumpEf = function (src) { return src === 'diesel' ? EF.diesel_l / EF.diesel_kwh_l : src === 'grid' ? EF.grid_kwh : EF.solar_kwh; };
    var animals = function (table, collectedOnly) {
      return ['cow', 'small', 'poultry'].reduce(function (a, k) { return a + (inp[k] > 0 ? inp[k] * table[k] * (collectedOnly ? share : 1) : 0); }, 0);
    };
    var g = inp.gaia || {};
    var today = {
      pumping: kwh * pumpEf(inp.energy),
      cooking: (inp.bottles_year || 0) * EF.bottle,
      fertiliser: (inp.urea_bags || 0) * EF.urea_bag,
      animals: animals(EF.enteric),
      manure: animals(EF.manure)
    };
    var pumpGaia = g.solar ? kwh * EF.solar_kwh : today.pumping;
    var withGaia = {
      pumping: Math.max(0, pumpGaia - (g.kwh_biogas || 0) * pumpEf(g.solar ? 'solar' : inp.energy)),   // biogas electricity can run the pump too
      cooking: Math.max(0, (inp.bottles_year || 0) - (g.bottles_saved || 0)) * EF.bottle,
      fertiliser: Math.max(0, (inp.urea_bags || 0) - (g.urea_saved || 0)) * EF.urea_bag,
      animals: today.animals,                                             // the digester does not change what the animals breathe out
      manure: today.manure - animals(EF.manure, true)                     // collected manure goes into the digester: its methane is burnt
    };
    var sum = function (o) { return Object.keys(o).reduce(function (a, k) { return a + o[k]; }, 0) / 1000; };
    var t0 = sum(today), t1 = sum(withGaia), price = inp.tax_tnd_t > 0 ? inp.tax_tnd_t : 0;
    return { today: today, gaia: withGaia, t_today: t0, t_gaia: t1, cut: t0 > 0 ? (t0 - t1) / t0 : 0,
             tax_today: t0 * price, tax_gaia: t1 * price, tax_saved: (t0 - t1) * price };
  }

  var api = { SOURCES: SOURCES, compute: compute, daily: daily, carbon: carbon, EF: EF, tempFactor: tempFactor, M3_PER_BOTTLE: M3_PER_BOTTLE, DAYS: DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAIA_WASTE = api;
}(typeof window !== 'undefined' ? window : this));
