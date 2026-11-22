/* Market page (M7): where to sell the harvest. Calculations in market-core.js, strings in market-i18n.js.
   Reads the plot's Land DNA (crop, area, position) and, when filled, the Water–Energy page (quota). */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, D = window.GAIA_DNA, N = window.GAIA_NEXUS, M = window.GAIA_MARKET;

  G.mountShell('market');
  var app = document.getElementById('app');
  var CROP_IDS = ['olive', 'palm', 'citrus', 'cereal', 'veg'];

  function num(v) { var x = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(x) ? null : x; }
  function fill(s, map) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return map[k] !== undefined ? map[k] : m; }); }

  /* --------------------------------------------- what GAIA already knows about the plot */
  var P = G.getParcel(), dna = P && P.dna;
  function nexusQuota() {
    var saved = G.load('gaia.nexus.inputs', null), CM = dna && dna.climateMonthly;
    if (!dna || !N || !saved || saved.parcelAt !== dna.builtAt || !CM) return null;
    var S = saved.values;
    var r = N.compute({ et0: CM.et0, rain: CM.rain, kc: num(S.kc), months: S.months, area_ha: num(S.area), ea: num(S.ea), head_m: num(S.head), pump_eff: num(S.pump_eff), pr: num(S.pr), prices: {} });
    return r.totals && r.totals.vol > 0 ? r.totals.vol : null;
  }
  var DNA = dna ? {
    crop: D.value(dna, 'crop'), area: D.value(dna, 'area_ha'), water: D.value(dna, 'water.source'), pump: D.value(dna, 'energy.pump'),
    rain: D.value(dna, 'climate.rain_mm'), lat: P.lat, lon: P.lon, name: P.name || null, quota: nexusQuota()
  } : null;

  var S = Object.assign({
    crop: DNA && CROP_IDS.indexOf(DNA.crop) !== -1 ? DNA.crop : '', area: DNA && DNA.area ? DNA.area : '', yield: '', oil: 20,
    transport: '', local_km: '', pack: '', prices: {}, comm: { wholesale: '' },
    tk_hh: '', tk_basket: '', tk_del: '', tk_price: '', tk_adv: 50,
    pool_min: '', members: [{ name: '', t: '' }, { name: '', t: '' }], station: 10
  }, G.load('gaia.market.inputs', null) || {});
  function persist() { G.save('gaia.market.inputs', S); }

  function ctx() {
    var comm = {}; Object.keys(S.comm || {}).forEach(function (k) { var c = num(S.comm[k]); if (c !== null) comm[k] = c / 100; });
    var prices = {}; Object.keys(S.prices || {}).forEach(function (k) { var p = num(S.prices[k]); if (p !== null) prices[k] = p; });
    var c = { crop: S.crop || null, area_ha: num(S.area), yield_t_ha: num(S.yield), oil_yield: (num(S.oil) || 20) / 100,
      lat: DNA ? DNA.lat : null, lon: DNA ? DNA.lon : null, month: new Date().getMonth(), prices: prices,
      costs: { transport_tnd_tkm: num(S.transport), local_km: num(S.local_km), pack_tnd_kg: num(S.pack), commission: comm },
      quota_m3: DNA && DNA.quota, rain_mm: DNA && DNA.rain, pump: DNA && DNA.pump, water: DNA && DNA.water };
    var vol = M.volume(c);
    c.pool_t = (vol ? vol.product_t : 0) + (S.members || []).reduce(function (s, m) { return s + (num(m.t) || 0); }, 0);
    return c;
  }

  /* --------------------------------------------- small builders */
  function input(id, labelKey, value, onInput, hintKey, attrs) {
    return el('div', { class: 'gp-field' }, [
      el('label', { for: id }, [t(labelKey)]),
      el('input', Object.assign({ id: id, type: 'number', step: 'any', inputmode: 'decimal', value: value === null || value === undefined ? '' : value,
        oninput: function (e) { onInput(e.target.value); persist(); draw(); } }, attrs || {})),
      hintKey ? el('span', { class: 'hint' }, [t(hintKey)]) : null
    ]);
  }
  function kpi(label, value, unit, hi) {
    return el('div', { class: 'kpi' + (hi ? ' hi' : '') }, [el('b', null, [label]), el('div', { class: 'v' }, [value]), el('span', { class: 'u' }, [unit || ''])]);
  }
  function placeName(p) { if (!p) return '—'; var k = 'pl_' + p.id, v = t(k); return v === k ? p.name : v; }
  function cropName(c) { return c ? t('mk_c_' + c) : '—'; }
  function verdictPill(v) { return G.pill({ ok: 'ok', adapt: 'adapt', no: 'no', unk: 'unk' }[v] || 'unk', t({ ok: 'verdict_ok', adapt: 'verdict_adapt', no: 'verdict_no', unk: 'verdict_unk' }[v] || 'verdict_unk')); }

  /* --------------------------------------------- inputs */
  function inputsCard() {
    var sel = el('select', { id: 'mk-crop', onchange: function (e) { S.crop = e.target.value; persist(); renderAll(); } },
      [el('option', { value: '' }, [t('crop_none')])].concat(CROP_IDS.map(function (c) { return el('option', { value: c, selected: S.crop === c }, [cropName(c)]); })));
    var fromDna = DNA && DNA.crop && S.crop === DNA.crop;
    return el('div', { class: 'gp-card mk-in' }, [
      el('h2', null, [t('mk_in_t')]),
      el('div', { class: 'gp-field' }, [el('label', { for: 'mk-crop' }, [t('mk_crop')]), sel, fromDna ? el('span', { class: 'hint' }, [t('mk_from_dna')]) : null]),
      input('mk-area', 'mk_area', S.area, function (v) { S.area = v; }, DNA && DNA.area && num(S.area) === DNA.area ? 'mk_from_dna' : null, { min: 0 }),
      input('mk-yield', 'mk_yield', S.yield, function (v) { S.yield = v; }, 'mk_yield_h', { min: 0 }),
      S.crop === 'olive' ? input('mk-oil', 'mk_oil', S.oil, function (v) { S.oil = v; }, 'mk_oil_h', { min: 5, max: 35 }) : null,
      input('mk-tr', 'mk_tr', S.transport, function (v) { S.transport = v; }, 'mk_tr_h', { min: 0 }),
      input('mk-local', 'mk_local', S.local_km, function (v) { S.local_km = v; }, null, { min: 0 }),
      input('mk-pack', 'mk_pack', S.pack, function (v) { S.pack = v; }, 'mk_pack_h', { min: 0 })
    ]);
  }

  /* --------------------------------------------- outputs */
  var kpiOut, calOut, chOut, tkOut, poolOut, planOut, lbOut, lastResults = [], lastTk = null;

  function drawKpis(c) {
    G.clear(kpiOut);
    var vol = M.volume(c), mth = M.monthsToHarvest(c.crop, c.month);
    var city = typeof c.lat === 'number' ? M.nearest(c.lat, c.lon, 'city') : null, wh = typeof c.lat === 'number' ? M.nearest(c.lat, c.lon, 'wholesale') : null;
    kpiOut.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('k_vol'), vol ? fmt(vol.harvest_t, 1) + ' ' + t('u_t') : '—', vol && vol.oil_l ? t('k_oil') + ' ≈ ' + fmt(vol.oil_l) + ' ' + t('u_l') : (vol ? '' : t('r_no_volume')), true),
      kpi(mth === 0 ? t('k_mth_now') : t('k_mth'), mth === null ? '—' : mth === 0 ? '旬' : String(mth), mth ? t('u_months') : ''),
      kpi(t('k_city'), city ? placeName(city) : '—', city ? fmt(city.road_km) + ' ' + t('u_km') : ''),
      kpi(t('k_whole'), wh ? placeName(wh) : '—', wh ? fmt(wh.road_km) + ' ' + t('u_km') : '')
    ]));
  }

  function drawCal(c) {
    G.clear(calOut);
    var cal = M.calendar(c.crop); if (!cal) return;
    var months = t('months'), now = c.month;
    calOut.appendChild(el('div', { class: 'mk-cal', role: 'list' }, cal.cells.map(function (x) {
      var cls = 'mk-m' + (x.harvest ? ' h' : x.keep ? ' k' : '') + (x.sign ? ' s' : '') + (cal.late.indexOf(x.m) !== -1 ? ' l' : '') + (x.m === now ? ' now' : '');
      var what = [x.harvest ? t('cal_h') : null, x.keep ? t('cal_k') : null, x.sign ? t('cal_s') : null, cal.late.indexOf(x.m) !== -1 ? t('cal_late') : null, x.m === now ? t('cal_now') : null].filter(Boolean).join(' · ');
      return el('div', { class: cls, role: 'listitem', title: what, 'aria-label': months[x.m] + (what ? ' : ' + what : '') }, [
        el('span', { class: 'mn' }, [months[x.m]]), el('i', { 'aria-hidden': 'true' }), x.sign ? el('span', { class: 'sg', 'aria-hidden': 'true' }, ['✎']) : null
      ]);
    })));
    calOut.appendChild(el('div', { class: 'gp-legend mk-leg' }, [
      el('span', null, [el('i', { class: 'h' }), t('cal_h')]), el('span', null, [el('i', { class: 'k' }), t('cal_k')]),
      el('span', null, [el('i', { class: 'l' }), t('cal_late')]), el('span', null, ['✎ ', t('cal_s')])
    ]));
    calOut.appendChild(el('p', { class: 'assump', style: 'margin-top:6px' }, [t('cal_note')]));
  }

  function priceKey(id) { return S.crop === 'olive' ? (id === 'mill' ? 'mk_price_olive' : 'mk_price_oil') : 'mk_price'; }

  function channelCard(r) {
    var ch = M.CHANNELS.filter(function (x) { return x.id === r.id; })[0];
    var priceIn = el('input', { id: 'mk-p-' + r.id, type: 'number', step: 'any', min: 0, inputmode: 'decimal', value: S.prices[r.id] === undefined ? '' : S.prices[r.id],
      oninput: function (e) { S.prices[r.id] = e.target.value; persist(); drawLive(); } });
    var commIn = r.id === 'wholesale' || r.id === 'ja_pool' || r.id === 'michinoeki' ? el('div', { class: 'gp-field' }, [el('label', { for: 'mk-c-' + r.id }, [t('mk_comm')]),
      el('input', { id: 'mk-c-' + r.id, type: 'number', step: 'any', min: 0, max: 50, inputmode: 'decimal', value: S.comm[r.id] === undefined ? '' : S.comm[r.id],
        oninput: function (e) { S.comm[r.id] = e.target.value; persist(); drawLive(); } })]) : null;
    var net = r.net_kg === undefined ? null : el('div', { class: 'mk-net' + (r.net_kg <= 0 ? ' neg' : '') }, [
      el('b', null, [t('mk_net')]), ' ', fmt(r.net_kg, 2), ' ', S.crop === 'olive' && r.id === 'mill' ? t('mk_net_oil') : t('mk_net_kg'),
      r.net_raw_kg !== undefined ? el('span', { class: 'assump' }, [' (' + fmt(r.net_raw_kg, 2) + ' ' + t('mk_net_kg') + ')']) : null
    ]);
    var target = r.target ? M.CHANNELS.filter(function (x) { return x.id === r.target; })[0] : null;
    return el('article', { class: 'gp-card mk-ch' + (ch.origin === 'jp' ? ' jp' : '') }, [
      el('div', { class: 'mk-ch-top' }, [
        el('span', { class: 'origin ' + ch.origin }, [el('span', { class: 'dot' }), t(ch.origin === 'jp' ? 'tag_jp' : 'tag_tn')]),
        ch.kanji ? el('span', { class: 'mk-kanji', lang: 'ja', 'aria-hidden': 'true' }, [ch.kanji]) : null,
        verdictPill(r.verdict)
      ]),
      el('h3', null, [t('ch_' + r.id)]),
      el('p', { class: 'mk-desc' }, [t('ch_' + r.id + '_p')]),
      el('ul', { class: 'mk-why' }, r.reasons.map(function (k) { return el('li', null, [t('r_' + k)]); })),
      target ? el('p', { class: 'mk-meta' }, [t('mk_pooled_to') + ' ', el('b', null, [t('ch_' + target.id)])]) : null,
      r.place ? el('p', { class: 'mk-meta' }, [G.icon('pin', 14), ' ', t('mk_place') + ' : ', el('b', null, [placeName(r.place)]), ' · ' + fmt(r.place.road_km) + ' ' + t('u_km')]) : null,
      el('p', { class: 'mk-meta' }, [G.icon('cash', 14), ' ', t('pay_' + r.pay)]),
      el('div', { class: 'mk-price' }, [el('div', { class: 'gp-field' }, [el('label', { for: 'mk-p-' + r.id }, [t(priceKey(r.id))]), priceIn]), commIn]),
      net
    ]);
  }

  function drawChannels(c) {
    G.clear(chOut);
    lastResults = M.evaluateAll(c);
    chOut.appendChild(el('div', { class: 'mk-grid' }, lastResults.map(channelCard)));
  }

  function drawTeikei(c) {
    G.clear(tkOut);
    var vol = M.volume(c), perishable = M.CROPS[c.crop] && M.CROPS[c.crop].perishable;
    var r = lastTk = M.teikei({ product_t: vol ? vol.product_t : null, basket_kg: num(S.tk_basket), deliveries: num(S.tk_del), households: num(S.tk_hh),
      basket_tnd: num(S.tk_price), advance_pct: num(S.tk_adv) === null ? null : num(S.tk_adv) / 100 });
    if (r.missing.length) { tkOut.appendChild(G.note('info', t('tk_need'))); return; }
    tkOut.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('tk_max'), fmt(r.max_households), r.households !== r.max_households ? t('tk_hh') + ' : ' + fmt(r.households) : ''),
      kpi(t('tk_share'), fmt(r.share * 100) + ' %', fmt(r.kg) + ' kg'),
      kpi(t('tk_season'), r.season_tnd === undefined ? '—' : fmt(r.season_tnd) + ' TND', r.per_kg === undefined ? '' : t('tk_perkg') + ' ' + fmt(r.per_kg, 2) + ' TND'),
      kpi(t('tk_advance'), r.advance_tnd === undefined ? '—' : fmt(r.advance_tnd) + ' TND', fmt(num(S.tk_adv) === null ? 50 : num(S.tk_adv)) + ' %', true)
    ]));
    if (r.season_tnd !== undefined) {
      var lb = M.label(c), now = new Date();
      var txt = fill(t('tk_contract'), {
        season: String(now.getFullYear() + (M.monthsToHarvest(c.crop, c.month) > 0 && M.CROPS[c.crop].harvest[0] < c.month ? 1 : 0)),
        farm: (DNA && DNA.name) || t('jp_me'), crop: cropName(c.crop), area: fmt(c.area_ha, 1), deliveries: fmt(num(S.tk_del)), basket: fmt(num(S.tk_basket), 1),
        freq: t(perishable ? 'freq_week' : 'freq_month'), price: fmt(num(S.tk_price), 2), total: fmt(num(S.tk_price) * num(S.tk_del)), adv: fmt(num(S.tk_adv) === null ? 50 : num(S.tk_adv)), lot: lb.lot
      });
      var msg = el('span', { class: 'assump', 'aria-live': 'polite' });
      tkOut.appendChild(el('details', { class: 'gp-more', style: 'margin-top:12px' }, [
        el('summary', null, [t('tk_contract_t')]),
        el('pre', { class: 'mk-contract' }, [txt]),
        el('div', { style: 'display:flex;gap:10px;align-items:center;margin-top:8px' }, [
          el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () {
            var done = function () { msg.textContent = t('tk_copied'); };
            if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {}); else done();
          } }, [t('tk_copy')]), msg])
      ]));
    }
  }

  function teikeiCard() {
    var perishable = M.CROPS[S.crop] && M.CROPS[S.crop].perishable;
    tkOut = el('div', { 'aria-live': 'polite', style: 'margin-top:12px' });
    return el('section', { class: 'gp-card mk-sec jp', 'aria-labelledby': 'h-tk' }, [
      el('div', { class: 'mk-sec-h' }, [el('span', { class: 'mk-kanji big', lang: 'ja', 'aria-hidden': 'true' }, ['提携']), el('div', null, [el('h2', { id: 'h-tk' }, [t('tk_t')]), el('p', { class: 'small' }, [t('tk_p')])])]),
      el('div', { class: 'mk-form' }, [
        input('tk-hh', 'tk_hh', S.tk_hh, function (v) { S.tk_hh = v; }, null, { min: 0, step: 1 }),
        input('tk-basket', 'tk_basket', S.tk_basket, function (v) { S.tk_basket = v; }, null, { min: 0, placeholder: perishable ? '5' : '1' }),
        input('tk-del', 'tk_del', S.tk_del, function (v) { S.tk_del = v; }, 'tk_del_h', { min: 0, step: 1, placeholder: perishable ? '12' : '6' }),
        input('tk-price', 'tk_price', S.tk_price, function (v) { S.tk_price = v; }, null, { min: 0 }),
        input('tk-adv', 'tk_adv', S.tk_adv, function (v) { S.tk_adv = v; }, 'mk_assump', { min: 0, max: 100 })
      ]),
      tkOut,
      el('details', { class: 'gp-more', style: 'margin-top:12px' }, [el('summary', null, [t('tk_principles_t')]),
        el('ol', { class: 'mk-list' }, t('tk_principles').map(function (s) { return el('li', null, [s]); }))])
    ]);
  }

  function drawPool(c) {
    G.clear(poolOut);
    var vol = M.volume(c), me = vol ? vol.product_t : null;
    var target = M.CHANNELS.filter(function (x) { return x.id === M.POOL_TARGETS[c.crop]; })[0];
    var minT = num(S.pool_min) !== null ? num(S.pool_min) : (target && target.min_t) || null;
    var rows = [{ name: t('jp_me'), t: me }].concat((S.members || []).map(function (m, i) { return { name: m.name || '#' + (i + 2), t: num(m.t) }; }));
    var r = M.pool(rows, minT);
    if (!r.total_t) { poolOut.appendChild(G.note('info', t('r_no_volume'))); return; }
    poolOut.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('jp_total'), fmt(r.total_t, 1) + ' ' + t('u_t'), r.members + ' · ' + t('jp_name').toLowerCase(), true),
      kpi(r.reached ? t('jp_reached') : t('jp_missing'), r.min_t === null ? '—' : r.reached ? '✓' : fmt(r.missing_t, 1) + ' ' + t('u_t'), r.min_t ? '≥ ' + fmt(r.min_t, 1) + ' ' + t('u_t') : ''),
      kpi(t('mk_pooled_to'), target ? t('ch_' + target.id) : '—', '')
    ]));
    poolOut.appendChild(el('div', { class: 'gp-table-wrap', style: 'margin-top:10px' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, [el('th', null, [t('jp_name')]), el('th', { class: 'num' }, [t('jp_vol')]), el('th', { class: 'num' }, [t('jp_share')])])]),
      el('tbody', null, r.rows.map(function (m) { return el('tr', null, [el('td', null, [m.name]), el('td', { class: 'num' }, [fmt(m.t, 1)]), el('td', { class: 'num' }, [fmt(m.share * 100) + ' %'])]); }))
    ])]));
  }

  function poolCard() {
    poolOut = el('div', { 'aria-live': 'polite', style: 'margin-top:12px' });
    var list = el('div', { class: 'mk-members' });
    function drawMembers() {
      G.clear(list);
      (S.members || []).forEach(function (m, i) {
        list.appendChild(el('div', { class: 'mk-mrow' }, [
          el('label', null, [el('span', { class: 'lab' }, [t('jp_name')]), el('input', { type: 'text', value: m.name || '', oninput: function (e) { m.name = e.target.value; persist(); drawLive(); } })]),
          el('label', null, [el('span', { class: 'lab' }, [t('jp_vol')]), el('input', { type: 'number', step: 'any', min: 0, inputmode: 'decimal', value: m.t || '', oninput: function (e) { m.t = e.target.value; persist(); drawLive(); } })]),
          el('button', { type: 'button', 'aria-label': t('jp_del'), title: t('jp_del'), onclick: function () { S.members.splice(i, 1); persist(); drawMembers(); drawLive(); } }, ['×'])
        ]));
      });
    }
    drawMembers();
    return el('section', { class: 'gp-card mk-sec jp', 'aria-labelledby': 'h-jp' }, [
      el('div', { class: 'mk-sec-h' }, [el('span', { class: 'mk-kanji big', lang: 'ja', 'aria-hidden': 'true' }, ['共販']), el('div', null, [el('h2', { id: 'h-jp' }, [t('jp_t')]), el('p', { class: 'small' }, [t('jp_p')])])]),
      el('div', { class: 'mk-form' }, [input('jp-min', 'jp_min', S.pool_min, function (v) { S.pool_min = v; }, 'jp_min_h', { min: 0 })]),
      list,
      el('button', { type: 'button', class: 'gp-btn ghost sm', style: 'margin-top:8px', onclick: function () { S.members.push({ name: '', t: '' }); persist(); drawMembers(); } }, ['+ ' + t('jp_add')]),
      poolOut,
      el('div', { class: 'mk-grade' }, [el('h3', null, [t('jp_grade_t')]), el('ul', { class: 'mk-list' }, t('jp_grade').map(function (s) { return el('li', null, [s]); }))])
    ]);
  }

  function stationCard() {
    return el('section', { class: 'gp-card mk-sec jp', 'aria-labelledby': 'h-me' }, [
      el('div', { class: 'mk-sec-h' }, [el('span', { class: 'mk-kanji big', lang: 'ja', 'aria-hidden': 'true' }, ['道の駅']), el('div', null, [el('h2', { id: 'h-me' }, [t('me_t')]), el('p', { class: 'small' }, [t('me_p')])])]),
      el('p', { class: 'mk-meta', style: 'margin-top:10px' }, [el('b', null, [t('me_what') + ' ']), t('me_' + S.crop)]),
      el('div', { class: 'mk-form' }, [input('me-share', 'me_share', S.station, function (v) { S.station = v; }, 'mk_assump', { min: 0, max: 100 })])
    ]);
  }

  function drawPlan(c) {
    G.clear(planOut);
    var pl = M.plan(c, lastResults, lastTk && !lastTk.missing.length ? lastTk : null, (num(S.station) === null ? 10 : num(S.station)) / 100);
    if (!pl) { planOut.appendChild(G.note('info', t('pl_need'))); return; }
    var unit = S.crop === 'olive' ? 'kg ' + t('k_oil').toLowerCase() : 'kg';
    planOut.appendChild(el('div', { class: 'gp-table-wrap' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, [t('pl_ch'), t('pl_kg'), t('pl_net'), t('pl_rev'), t('pl_pay')].map(function (h, i) { return el('th', { class: i && i < 4 ? 'num' : null }, [h]); }))]),
      el('tbody', null, pl.lines.map(function (l) {
        return el('tr', null, [
          el('td', null, [t('ch_' + l.id).split(/[:：]/)[0].trim(), l.via_pool ? el('span', { class: 'assump' }, [' · ' + t('pl_via_pool')]) : null]),
          el('td', { class: 'num' }, [fmt(l.kg) + ' ' + unit]),
          el('td', { class: 'num' }, [l.net_kg === null ? '—' : fmt(l.net_kg, 2) + ' TND']),
          el('td', { class: 'num' }, [l.tnd === null ? '—' : fmt(l.tnd) + ' TND']),
          el('td', null, [l.pay ? t('pay_' + l.pay) : '—'])
        ]);
      }))
    ])]));
    planOut.appendChild(el('div', { class: 'kpis', style: 'margin-top:10px' }, [
      kpi(t('pl_total'), pl.total_tnd === null ? '—' : fmt(pl.total_tnd) + ' TND', pl.total_tnd === null ? t('pl_missing') : '', true),
      kpi(t('pl_before'), pl.before_harvest_tnd ? fmt(pl.before_harvest_tnd) + ' TND' : '—', pl.before_harvest_tnd ? t('ch_teikei').split(/[:：]/)[0] : '')
    ]));
  }

  function drawLabel(c) {
    G.clear(lbOut);
    var lb = M.label(c), months = t('months'), cr = M.CROPS[c.crop];
    function row(k, v) { return el('div', { class: 'mk-lb-row' }, [el('span', { class: 'k' }, [t(k)]), el('span', { class: 'v' }, [v])]); }
    var water = lb.rainfed ? t('lb_water_rf') : lb.water_l_kg ? '≈ ' + fmt(lb.water_l_kg) + ' L/kg' : t('lb_water_none');
    var card = el('div', { class: 'mk-label', id: 'mk-label' }, [
      el('div', { class: 'mk-lb-head' }, [el('span', { class: 'gp-seal', 'aria-hidden': 'true' }, ['顔']), el('div', null, [el('b', null, [(DNA && DNA.name) || t('jp_me')]), el('br'), el('span', null, ['GAIA · Tunisia'])])]),
      row('lb_crop', cropName(c.crop)),
      row('lb_harvest', cr ? cr.harvest.map(function (m) { return months[m]; }).join(' · ') : '—'),
      row('lb_zone', lb.area ? fmt(lb.area.lat, 1) + ' N, ' + fmt(lb.area.lon, 1) + ' E' : '—'),
      row('lb_rain', lb.rain_mm ? fmt(lb.rain_mm) + ' mm' : '—'),
      row('lb_water', water),
      row('lb_solar', lb.solar ? t('mk_yes') : t('mk_no')),
      row('lb_lot', lb.lot),
      el('p', { class: 'mk-lb-src' }, [t('lb_src')])
    ]);
    lbOut.appendChild(card);
    lbOut.appendChild(el('button', { type: 'button', class: 'gp-btn ghost sm', style: 'margin-top:10px', onclick: function () { document.body.classList.add('mk-print'); window.print(); setTimeout(function () { document.body.classList.remove('mk-print'); }, 500); } }, [t('lb_print')]));
  }

  function drawLive() { var c = ctx(); drawChannels(c); drawPool(c); drawPlan(c); }
  function draw() { if (!S.crop) return; var c = ctx(); drawKpis(c); drawCal(c); drawChannels(c); drawTeikei(c); drawPool(c); drawPlan(c); drawLabel(c); }

  function renderAll() {
    G.clear(app);
    if (!DNA) { G.needParcel(app); return; }
    app.appendChild(el('div', { class: 'gp-principle', style: 'margin-bottom:8px' }, [t('mk_principle')]));
    app.appendChild(el('p', { class: 'small', style: 'margin:0 0 14px;color:var(--g-ink-2);max-width:80ch' }, [t('mk_principle_p')]));
    app.appendChild(el('div', { class: 'gp-note', style: 'margin-bottom:14px;align-items:center' }, [G.icon('network'), el('div', null, [t('mk_agent_p') + ' ',
      el('a', { class: 'gp-btn gold sm', style: 'margin-inline-start:6px', href: 'agent.html?goal=' + encodeURIComponent(t('mk_agent_goal')) }, [t('mk_agent_btn')])])]));
    kpiOut = el('div'); calOut = el('div'); chOut = el('div', { 'aria-live': 'polite' }); planOut = el('div', { 'aria-live': 'polite' }); lbOut = el('div');
    var right = el('div', null, S.crop ? [kpiOut,
      el('div', { class: 'gp-card', style: 'margin-top:14px' }, [el('h2', null, [t('cal_t')]), el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [t('cal_p')]), calOut])
    ] : [G.note('info', t('mk_no_crop'))]);
    app.appendChild(el('div', { class: 'mk-top' }, [inputsCard(), right]));
    if (S.crop) {
      app.appendChild(el('section', { class: 'sec-t', 'aria-labelledby': 'h-ch' }, [el('h2', { id: 'h-ch' }, [t('ch_t')]), el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [t('ch_p')]), chOut]));
      app.appendChild(el('div', { class: 'mk-jp' }, [teikeiCard(), poolCard(), stationCard()]));
      app.appendChild(el('section', { class: 'gp-card sec-t', 'aria-labelledby': 'h-pl' }, [el('h2', { id: 'h-pl' }, [t('pl_t')]), el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [t('pl_p')]), planOut]));
      app.appendChild(el('section', { class: 'sec-t mk-lb-sec', 'aria-labelledby': 'h-lb' }, [el('div', null, [el('h2', { id: 'h-lb' }, [t('lb_t')]), el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [t('lb_p')])]), lbOut]));
    }
    app.appendChild(el('details', { class: 'gp-card gp-more', style: 'margin-top:24px' }, [
      el('summary', null, [t('method_t')]),
      el('div', { class: 'formula' }, ['net_kg = price × (1 − commission) − transport_tnd_tkm × road_km / 1000 − packaging ; road_km ≈ 1.3 × great-circle km']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, ['teikei: households = ⌊ product_kg / (basket_kg × deliveries) ⌋ ; advance = households × basket_tnd × deliveries × advance %']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, ['pool: lot = Σ members ; share_i = t_i / lot ; reached ⇔ lot ≥ buyer minimum']),
      el('p', { class: 'small', style: 'margin-top:10px;color:var(--g-ink-2)' }, [t('method_p')])
    ]));
    draw();
  }

  renderAll();
  G.onLang(renderAll);
}());
