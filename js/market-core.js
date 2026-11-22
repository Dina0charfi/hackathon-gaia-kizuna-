/* ==========================================================================
   GAIA MARKET — where to sell the harvest (M7). Pure functions, no DOM.

   Tunisian channels (weekly souk, wholesale markets, olive mills and oil
   export, the Office des Céréales collection centres, date packing stations,
   Maltaise export) are checked against the plot, its crop, its volume and
   the harvest calendar, next to three Japanese methods adapted to them:

   - Teikei 提携: a direct contract between a farm and city households,
     paid partly before the harvest (the Japanese root of CSA, 1970s).
     → cash before the season, a price agreed in advance, no middleman.
   - JA 共同販売 (kyōdō hanbai), the pooled selling of Japan's farm
     cooperatives: members grade to one standard and sell as one lot.
     → done through a Tunisian GDA or SMSA, it opens export and wholesale
       contracts that one small farm cannot reach alone.
   - Michi-no-eki 道の駅 roadside stations: a shared shop on a main road
     where local farmers set their own prices and each lot carries the
     producer's name (顔が見える, "you see the producer's face").
     → a GDA stall on the national road, fresh and processed products.

   Every price is the farmer's own input. Volumes, minimum lots, storage
   times and harvest months are orders of magnitude marked "to check".
   ========================================================================== */

(function (root) {
  'use strict';

  /* ------------------------------------------------ places (city position, approximate) */
  var PLACES = {
    min_tunis:  { lat: 36.73, lon: 10.23, kind: 'wholesale', name: 'Marché de gros de Bir El Kassaa (Tunis)' },
    min_sfax:   { lat: 34.76, lon: 10.73, kind: 'wholesale', name: 'Marché de gros de Sfax' },
    min_sousse: { lat: 35.81, lon: 10.60, kind: 'wholesale', name: 'Marché de gros de Sousse' },
    dates_kebili:  { lat: 33.70, lon: 8.97, kind: 'dates', name: 'Kébili (stations de conditionnement des dattes)' },
    dates_tozeur:  { lat: 33.92, lon: 8.13, kind: 'dates', name: 'Tozeur (stations de conditionnement des dattes)' },
    citrus_capbon: { lat: 36.68, lon: 10.58, kind: 'citrus', name: 'Cap Bon, Menzel Bouzelfa (stations agrumes, export Maltaise)' },
    oil_sfax:   { lat: 34.74, lon: 10.76, kind: 'oil', name: 'Sfax (huileries, exportateurs d’huile)' },
    port_rades: { lat: 36.80, lon: 10.27, kind: 'port', name: 'Port de Radès' },
    port_sfax:  { lat: 34.73, lon: 10.77, kind: 'port', name: 'Port de Sfax' },
    city_tunis:    { lat: 36.80, lon: 10.18, kind: 'city', name: 'Grand Tunis' },
    city_sfax:     { lat: 34.74, lon: 10.76, kind: 'city', name: 'Sfax' },
    city_sousse:   { lat: 35.83, lon: 10.64, kind: 'city', name: 'Sousse' },
    city_monastir: { lat: 35.77, lon: 10.83, kind: 'city', name: 'Monastir' },
    city_nabeul:   { lat: 36.45, lon: 10.73, kind: 'city', name: 'Nabeul' },
    city_bizerte:  { lat: 37.27, lon: 9.87, kind: 'city', name: 'Bizerte' },
    city_kairouan: { lat: 35.68, lon: 10.10, kind: 'city', name: 'Kairouan' },
    city_gabes:    { lat: 33.88, lon: 10.10, kind: 'city', name: 'Gabès' },
    city_gafsa:    { lat: 34.42, lon: 8.78, kind: 'city', name: 'Gafsa' },
    city_beja:     { lat: 36.73, lon: 9.18, kind: 'city', name: 'Béja' }
  };

  /* ------------------------------------------------ crops: harvest months, keeping, product
     harvest: month indices (0 = January), same as js/season-data.js where the crop exists there.
     keep_m: months the product keeps once harvested (or processed: olive → oil).
     All indicative, to check with the CRDA. */
  var CROPS = {
    olive:  { harvest: [10, 11, 0], keep_m: 12, product: 'oil', perishable: false },
    palm:   { harvest: [9, 10, 11], keep_m: 6, product: 'fruit', perishable: false },
    citrus: { harvest: [0, 1, 2, 3], keep_m: 2, product: 'fruit', perishable: true },
    cereal: { harvest: [5], keep_m: 12, product: 'grain', perishable: false },
    veg:    { harvest: [4, 5, 6, 7], keep_m: 0, product: 'fresh', perishable: true }
  };

  /* ------------------------------------------------ channels
     crops: crops the channel buys. min_t: smallest lot the buyer usually takes (order of magnitude).
     max_t: what the channel can absorb from one farm in a season. near: place kinds whose distance matters.
     pay: when the farmer is paid. jp: the Japanese method behind it, if any. */
  var CHANNELS = [
    { id: 'souk', crops: ['olive', 'palm', 'citrus', 'veg', 'cereal'], min_t: 0, max_t: 3, near: null, pay: 'cash', origin: 'tn' },
    { id: 'wholesale', crops: ['palm', 'citrus', 'veg'], min_t: 0.5, max_t: null, near: 'wholesale', pay: 'sale', origin: 'tn', fresh_km: 250 },
    { id: 'mill', crops: ['olive'], raw: true, min_t: 0.1, max_t: null, near: null, pay: 'sale', origin: 'tn' },
    { id: 'oil_export', crops: ['olive'], min_t: 18, max_t: null, near: 'oil', pay: 'later', origin: 'tn' },
    { id: 'cereal_office', crops: ['cereal'], min_t: 0, max_t: null, near: null, pay: 'later', origin: 'tn' },
    { id: 'dates_station', crops: ['palm'], min_t: 1, max_t: null, near: 'dates', pay: 'sale', origin: 'tn' },
    { id: 'citrus_export', crops: ['citrus'], min_t: 20, max_t: null, near: 'citrus', pay: 'later', origin: 'tn' },
    { id: 'teikei', crops: ['olive', 'palm', 'citrus', 'veg', 'cereal'], min_t: 0, max_t: null, near: 'city', pay: 'advance', origin: 'jp', kanji: '提携' },
    { id: 'michinoeki', crops: ['olive', 'palm', 'citrus', 'veg', 'cereal'], min_t: 0, max_t: 5, near: 'city', pay: 'weekly', origin: 'jp', kanji: '道の駅' },
    { id: 'ja_pool', crops: ['olive', 'palm', 'citrus', 'veg', 'cereal'], min_t: 0, max_t: null, near: null, pay: 'later', origin: 'jp', kanji: '共同販売' }
  ];
  // the pooled lot is sold to these channels
  var POOL_TARGETS = { olive: 'oil_export', palm: 'dates_station', citrus: 'citrus_export', veg: 'wholesale', cereal: 'cereal_office' };

  function num(x) { return typeof x === 'number' && !isNaN(x) ? x : null; }
  function pos(x) { return typeof x === 'number' && !isNaN(x) && x > 0; }

  function km(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // nearest place of a kind; road distance ≈ 1.3 × straight line (rule of thumb, shown as approximate)
  function nearest(lat, lon, kind) {
    var best = null;
    Object.keys(PLACES).forEach(function (id) {
      var p = PLACES[id]; if (p.kind !== kind) return;
      var d = km({ lat: lat, lon: lon }, p);
      if (!best || d < best.km) best = { id: id, name: p.name, km: d, road_km: d * 1.3 };
    });
    return best;
  }

  /** product volume: harvest t, and for olives the oil (kg) at the farmer's oil yield */
  function volume(ctx) {
    var c = CROPS[ctx.crop];
    if (!c || !pos(ctx.area_ha) || !pos(ctx.yield_t_ha)) return null;
    var t = ctx.area_ha * ctx.yield_t_ha, out = { harvest_t: t, product_t: t };
    if (c.product === 'oil') { var y = pos(ctx.oil_yield) ? ctx.oil_yield : 0.20; out.oil_yield = y; out.product_t = t * y; out.oil_l = t * y * 1000 / 0.916; }
    return out;
  }

  /** months from `month` to the first harvest month (0 = harvest is now) */
  function monthsToHarvest(crop, month) {
    var c = CROPS[crop]; if (!c) return null;
    if (c.harvest.indexOf(month) !== -1) return 0;
    var best = 12;
    c.harvest.forEach(function (h) { var d = (h - month + 12) % 12; if (d < best) best = d; });
    return best;
  }

  /** 12-month selling calendar (旬 shun): harvest, keep (sell later), sign (contract window), and the best months to sell */
  function calendar(crop) {
    var c = CROPS[crop]; if (!c) return null;
    var cells = [], i, first = c.harvest[0], last = c.harvest[c.harvest.length - 1];
    for (i = 0; i < 12; i++) cells.push({ m: i, harvest: c.harvest.indexOf(i) !== -1, keep: false, sign: false });
    for (i = 1; i <= c.keep_m && i < 12; i++) { var k = (last + i) % 12; if (!cells[k].harvest) cells[k].keep = true; }
    for (i = 2; i <= 3; i++) { var s = (first - i + 12) % 12; if (!cells[s].harvest) cells[s].sign = true; }   // a month can be both 'keep' and 'sign'
    // off-season months still covered by storage sell above the harvest glut: the first half of the keeping time
    var late = [];
    for (i = Math.ceil(c.keep_m / 2) + 1; i <= c.keep_m && i < 12; i++) { var q = (last + i) % 12; if (cells[q].keep) late.push(q); }
    return { cells: cells, late: late, keep_m: c.keep_m };
  }

  /**
   * One channel against the plot.
   * ctx: { crop, area_ha, yield_t_ha, oil_yield, lat, lon, month, pool_t (sum of the members' volumes, incl. me),
   *        prices: { [channel id]: TND per kg of product }, costs: { transport_tnd_tkm, commission: { [id]: share }, pack_tnd_kg } }
   */
  function evaluate(ch, ctx) {
    var c = CROPS[ctx.crop], reasons = [], verdict = 'ok';
    function down(v) { var o = { ok: 0, adapt: 1, unk: 2, no: 3 }; if (o[v] > o[verdict]) verdict = v; }
    if (!c) return { id: ch.id, verdict: 'unk', reasons: ['no_crop'] };
    if (ch.crops.indexOf(ctx.crop) === -1) return { id: ch.id, verdict: 'na', reasons: ['not_for_crop'] };
    var vol = volume(ctx), t = vol ? (ch.raw ? vol.harvest_t : vol.product_t) : null, mth = monthsToHarvest(ctx.crop, ctx.month);
    var out = { id: ch.id, origin: ch.origin, pay: ch.pay, reasons: reasons };
    var hasLoc = typeof ctx.lat === 'number' && typeof ctx.lon === 'number';

    // where
    if (ch.near && hasLoc) {
      out.place = nearest(ctx.lat, ctx.lon, ch.near);
      if (ch.id === 'wholesale' && c.perishable && out.place.road_km > (ch.fresh_km || 250)) { reasons.push('far_fresh'); down('adapt'); }
      if (ch.id === 'teikei') {
        if (out.place.road_km <= 60) reasons.push('city_near');
        else if (out.place.road_km <= 150 || !c.perishable) { reasons.push(c.perishable ? 'city_mid' : 'city_ship'); down('adapt'); }
        else { reasons.push('city_far'); down('no'); }
      }
      if (ch.id === 'michinoeki') { if (out.place.road_km <= 80) reasons.push('road_traffic'); else { reasons.push('road_quiet'); down('adapt'); } }
    } else if (ch.near && !hasLoc) { reasons.push('no_location'); down('unk'); }

    // how much
    if (t === null) { reasons.push('no_volume'); if (ch.min_t > 0 || ch.max_t) down('unk'); }
    else {
      out.volume_t = t;
      if (ch.min_t > 0 && t < ch.min_t) {
        if (pos(ctx.pool_t) && ctx.pool_t >= ch.min_t) { reasons.push('pool_reaches'); down('adapt'); }
        else { reasons.push('below_lot'); down('adapt'); out.needs_pool = true; }
      }
      if (ch.max_t && t > ch.max_t) { reasons.push('above_capacity'); down('adapt'); }
    }
    if (ch.id === 'ja_pool') {
      out.target = POOL_TARGETS[ctx.crop];
      if (pos(ctx.pool_t) && t !== null && ctx.pool_t > t) reasons.push('pool_members'); else { reasons.push('pool_alone'); down('adapt'); }
    }
    if (ch.id === 'cereal_office') reasons.push('state_price');
    if (ch.id === 'mill') reasons.push('mill_fast');

    // when
    if (mth !== null) {
      out.months_to_harvest = mth;
      if (ch.id === 'teikei') {
        if (mth >= 2) reasons.push('sign_now');
        else if (!c.perishable) reasons.push('sign_stored');
        else { reasons.push('sign_late'); down('adapt'); }
      }
    }

    // money: net per kg of product
    var price = ctx.prices && num(ctx.prices[ch.id]);
    if (pos(price)) {
      var co = ctx.costs || {}, comm = co.commission && num(co.commission[ch.id]) || 0;
      var tr = pos(co.transport_tnd_tkm) && out.place ? co.transport_tnd_tkm * out.place.road_km / 1000 : 0;
      if (ch.id === 'souk' || ch.id === 'mill' || ch.id === 'cereal_office') tr = pos(co.transport_tnd_tkm) && pos(co.local_km) ? co.transport_tnd_tkm * co.local_km / 1000 : 0;
      var pack = pos(co.pack_tnd_kg) && (ch.id === 'teikei' || ch.id === 'michinoeki' || ch.id === 'citrus_export' || ch.id === 'dates_station') ? co.pack_tnd_kg : 0;
      out.price = price; out.net_kg = price * (1 - comm) - tr - pack;
      // the mill buys olives: compare it per kg of oil, the product every other olive channel sells
      if (ch.raw && vol && vol.oil_yield) { out.net_raw_kg = out.net_kg; out.net_kg = out.net_kg / vol.oil_yield; }
      out.cost_kg = { commission: price * comm, transport: tr, pack: pack };
      if (out.net_kg <= 0) { reasons.push('net_negative'); down('no'); }
    } else reasons.push('no_price');

    out.verdict = verdict;
    return out;
  }

  function evaluateAll(ctx) {
    var order = { ok: 0, adapt: 1, unk: 2, no: 3, na: 4 };
    return CHANNELS.map(function (ch) { return evaluate(ch, ctx); })
      .filter(function (r) { return r.verdict !== 'na'; })
      .sort(function (a, b) {
        if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
        var na = a.net_kg === undefined ? -Infinity : a.net_kg, nb = b.net_kg === undefined ? -Infinity : b.net_kg;
        return nb - na;
      });
  }

  /**
   * Teikei 提携 contract: how many households the harvest can serve and the cash paid before the harvest.
   * inp: { product_t, basket_kg, deliveries (in the season), households (wanted), basket_tnd (per delivery), advance_pct }
   */
  function teikei(inp) {
    var res = { missing: [] };
    if (!pos(inp.product_t)) res.missing.push('volume');
    if (!pos(inp.basket_kg)) res.missing.push('basket');
    if (!pos(inp.deliveries)) res.missing.push('deliveries');
    if (res.missing.length) return res;
    var perHh = inp.basket_kg * inp.deliveries;                      // kg per household and season
    res.max_households = Math.floor(inp.product_t * 1000 / perHh);
    res.households = pos(inp.households) ? Math.min(Math.round(inp.households), res.max_households) : res.max_households;
    res.kg = res.households * perHh;
    res.share = res.kg / (inp.product_t * 1000);
    if (pos(inp.basket_tnd)) {
      var adv = num(inp.advance_pct); adv = adv === null ? 0.5 : Math.max(0, Math.min(1, adv));
      res.season_tnd = res.households * inp.basket_tnd * inp.deliveries;
      res.advance_tnd = res.season_tnd * adv;
      res.per_kg = inp.basket_tnd / inp.basket_kg;
    }
    return res;
  }

  /**
   * JA-style pooled lot through a GDA / SMSA.
   * members: [{ name, t }], min_t: the buyer's smallest lot. Each member's share and whether the lot is reached.
   */
  function pool(members, min_t) {
    var rows = (members || []).filter(function (m) { return pos(m.t); });
    var total = rows.reduce(function (s, m) { return s + m.t; }, 0);
    return {
      total_t: total, members: rows.length,
      rows: rows.map(function (m) { return { name: m.name, t: m.t, share: total > 0 ? m.t / total : 0 }; }),
      min_t: pos(min_t) ? min_t : null,
      reached: pos(min_t) ? total >= min_t : null,
      missing_t: pos(min_t) && total < min_t ? min_t - total : 0
    };
  }

  /**
   * Selling plan: Teikei households first, a share at the roadside station, the rest to the best bulk channel.
   * results: evaluateAll(ctx); tk: teikei(); station_pct: share of what is left (0–1).
   */
  function plan(ctx, results, tk, station_pct) {
    var vol = volume(ctx); if (!vol) return null;
    var left = vol.product_t * 1000, lines = [];
    var byId = {}; results.forEach(function (r) { byId[r.id] = r; });
    function add(id, kg, priceKg) {
      if (!(kg > 0)) return;
      var r = byId[id], net = priceKg !== undefined ? priceKg : (r && r.net_kg);
      lines.push({ id: id, kg: kg, net_kg: net === undefined ? null : net, tnd: net === undefined || net === null ? null : net * kg, pay: r ? r.pay : null });
      left -= kg;
    }
    if (tk && tk.kg > 0 && byId.teikei && byId.teikei.verdict !== 'no') add('teikei', Math.min(tk.kg, left), tk.per_kg !== undefined ? tk.per_kg - ((ctx.costs && pos(ctx.costs.pack_tnd_kg)) ? ctx.costs.pack_tnd_kg : 0) : undefined);
    var sp = num(station_pct); if (sp === null) sp = 0.1;
    if (byId.michinoeki && byId.michinoeki.verdict !== 'no' && sp > 0) add('michinoeki', Math.min(left * sp, 5000), undefined);
    var bulk = results.filter(function (r) { return r.id !== 'teikei' && r.id !== 'michinoeki' && r.id !== 'ja_pool' && r.id !== 'souk' && r.verdict !== 'no'; })
      .sort(function (a, b) {
        var o = { ok: 0, adapt: 1, unk: 2 }, ha = a.net_kg !== undefined, hb = b.net_kg !== undefined;
        if (ha && hb && a.net_kg !== b.net_kg) return b.net_kg - a.net_kg;   // both priced: the better net wins
        if (ha !== hb) return ha ? -1 : 1;                                  // a priced channel before an unpriced one
        return o[a.verdict] - o[b.verdict];
      });
    var best = bulk[0];
    if (best && best.needs_pool && byId.ja_pool) best = Object.assign({}, best, { via_pool: true });
    if (best) { add(best.id, left, undefined); if (best.via_pool) lines[lines.length - 1].via_pool = true; }
    else if (byId.souk) add('souk', left, undefined);
    var known = lines.filter(function (l) { return l.tnd !== null; });
    return {
      lines: lines, product_t: vol.product_t,
      total_tnd: known.length === lines.length && lines.length ? known.reduce(function (s, l) { return s + l.tnd; }, 0) : null,
      before_harvest_tnd: tk && tk.advance_tnd ? tk.advance_tnd : 0
    };
  }

  /** producer's-face label (顔が見える): what the Land DNA can tell the buyer, nothing more */
  function label(ctx) {
    var vol = volume(ctx), out = { crop: ctx.crop };
    if (typeof ctx.lat === 'number') out.area = { lat: Math.round(ctx.lat * 10) / 10, lon: Math.round(ctx.lon * 10) / 10 };
    if (pos(ctx.quota_m3) && vol) out.water_l_kg = ctx.quota_m3 * 1000 / (vol.harvest_t * 1000);
    if (pos(ctx.rain_mm)) out.rain_mm = ctx.rain_mm;
    out.solar = ctx.pump === 'solar';
    out.rainfed = ctx.water === 'rainfed';
    var d = ctx.date || new Date(), c = CROPS[ctx.crop];
    var hm = c ? c.harvest[0] : d.getMonth(), y = d.getFullYear() + (c && hm < d.getMonth() && c.harvest.indexOf(d.getMonth()) === -1 ? 1 : 0);
    out.lot = 'GAIA-TN-' + (ctx.crop || 'x').toUpperCase().slice(0, 3) + '-' + (out.area ? String(Math.round(Math.abs(out.area.lat) * 10)) + String(Math.round(Math.abs(out.area.lon) * 10)) : '0000') + '-' + y + String(hm + 1).padStart(2, '0');
    return out;
  }

  var api = { PLACES: PLACES, CROPS: CROPS, CHANNELS: CHANNELS, POOL_TARGETS: POOL_TARGETS, km: km, nearest: nearest, volume: volume, monthsToHarvest: monthsToHarvest,
    calendar: calendar, evaluate: evaluate, evaluateAll: evaluateAll, teikei: teikei, pool: pool, plan: plan, label: label };
  root.GAIA_MARKET = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : this));
