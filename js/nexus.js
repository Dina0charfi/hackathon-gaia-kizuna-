/* Water–Energy Nexus page (M4). Reads GAIA LAND DNA; calculations in nexus-core.js. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, D = window.GAIA_DNA, N = window.GAIA_NEXUS;

  G.addStrings({
    fr: {
      n_title: 'Eau & énergie',
      n_lead: "Combien d'eau la culture demande, combien d'énergie il faut pour la pomper, quel champ solaire la fournirait, et surtout combien ne pas dépasser.",
      principle: "Une énergie propre ne doit pas devenir une extraction d'eau illimitée.",
      principle_p: "Quand les panneaux sont payés, pomper un mètre cube de plus ne coûte presque rien. GAIA ne propose donc jamais un champ solaire sans le quota d'eau qui va avec.",
      in_t: 'Hypothèses', in_crop: 'Culture', in_kc: 'Coefficient cultural Kc', in_months: 'Mois de culture irrigués',
      in_area: 'Surface (ha)', in_sys: "Système d'irrigation", sys_drip: 'Goutte-à-goutte', sys_sprinkler: 'Aspersion', sys_surface: 'Gravitaire',
      in_ea: "Efficience d'application", in_head: 'Hauteur manométrique totale (m)', in_head_h: 'Profondeur du puits + rabattement + pression de service.',
      in_pump: 'Rendement du groupe de pompage', in_pr: 'Ratio de performance solaire',
      in_prices: 'Prix (pour comparer les coûts)', in_prices_h: 'Saisissez des prix datés. Sans prix, GAIA ne compare pas.',
      p_diesel: 'Gazole (TND/L)', p_dkwh: 'Production du groupe diesel (kWh/L)', p_grid: 'Électricité réseau (TND/kWh)', p_pv: 'Solaire installé (TND/kWc)', p_life: 'Durée de vie solaire (ans)',
      assumption: 'Hypothèse modifiable', kc_ref: 'Valeur par défaut :',
      f_need: 'Besoin de la culture', f_rain: 'Pluie efficace', f_irr: "Irrigation nécessaire", f_energy: 'Énergie de pompage', f_quota: 'Quota annuel',
      per_ha: 'par ha', per_year: 'par an',
      c_water_t: "Eau : besoin, pluie utile et irrigation, par mois", c_energy_t: 'Énergie de pompage par mois',
      s_etc: 'Besoin ETc', s_pe: 'Pluie efficace', s_irg: 'Irrigation brute',
      solar_t: 'Champ solaire nécessaire', solar_p: 'Dimensionné sur le mois le plus exigeant', solar_none: 'Pas de dimensionnement : il manque la surface, la hauteur de pompage ou le rayonnement.',
      cost_t: 'Coût annuel comparé', cost_none: 'Saisissez au moins un prix pour comparer.',
      cost_diesel: 'Pompage diesel', cost_grid: 'Pompage sur réseau', cost_solar: 'Solaire (investissement réparti sur la durée de vie)',
      cost_note: "Coût de l'énergie seulement ; l'entretien et le remplacement des équipements ne sont pas inclus.",
      quota_t: 'Quota mensuel de pompage', quota_p: "Volume à ne pas dépasser : c'est le besoin agronomique calculé, pas la capacité de la pompe. Une allocation officielle plus basse s'applique en priorité.",
      th_month: 'Mois', th_vol: 'Volume (m³)', th_kwh: 'Énergie (kWh)', th_kwp: 'kWc requis',
      miss_t: 'Informations manquantes', miss_area: 'Surface de la parcelle : les volumes sont donnés par hectare.', miss_head: 'Hauteur de pompage : pas de calcul d’énergie.', miss_ghi: 'Rayonnement solaire : pas de dimensionnement.', miss_kc: 'Coefficient cultural : saisissez une valeur.', miss_climate: 'Données climatiques indisponibles : reconstruisez le profil sur la page Land Intelligence.',
      method_t: 'Méthode et sources', src_climate: 'Climat :', src_solar: 'Rayonnement :', src_om: 'Open-Meteo (rayonnement de courte longueur d’onde)',
      method_p: 'Pluie efficace : méthode USDA-SCS mensuelle, utilisée dans FAO CROPWAT. Les valeurs Kc par défaut sont tirées de FAO-56 (tableau 12) et restent à vérifier sur la publication. Le dimensionnement solaire suppose un rayonnement sur panneau proche du rayonnement horizontal.',
      sim: 'Estimation de modèle, pas une mesure.'
    },
    ar: {
      n_title: 'الماء والطاقة',
      n_lead: 'كم تحتاج الزراعة من الماء، وكم يلزم من الطاقة لضخه، وأي حقل شمسي يمكن أن يوفرها، والأهم: ما الكمية التي لا يجب تجاوزها.',
      principle: 'لا يجب أن تتحول الطاقة النظيفة إلى استخراج غير محدود للماء.',
      principle_p: 'حين تُسدَّد كلفة الألواح، يصبح ضخ متر مكعب إضافي شبه مجاني. لذلك لا تقترح غايا أبداً حقلاً شمسياً دون حصة الماء المرافقة له.',
      in_t: 'الفرضيات', in_crop: 'الزراعة', in_kc: 'المعامل الزراعي Kc', in_months: 'أشهر الري',
      in_area: 'المساحة (هك)', in_sys: 'نظام الري', sys_drip: 'تقطير', sys_sprinkler: 'رش', sys_surface: 'سطحي',
      in_ea: 'كفاءة الري', in_head: 'الارتفاع المانومتري الكلي (م)', in_head_h: 'عمق البئر + الانخفاض + ضغط التشغيل.',
      in_pump: 'مردود مجموعة الضخ', in_pr: 'نسبة الأداء الشمسي',
      in_prices: 'الأسعار (لمقارنة التكاليف)', in_prices_h: 'أدخل أسعاراً مؤرخة. دون أسعار لا تقارن غايا.',
      p_diesel: 'الغازوال (د.ت/ل)', p_dkwh: 'إنتاج مولد الديزل (ك.و.س/ل)', p_grid: 'كهرباء الشبكة (د.ت/ك.و.س)', p_pv: 'الطاقة الشمسية المركبة (د.ت/ك.و.ذ)', p_life: 'عمر المنظومة الشمسية (سنوات)',
      assumption: 'فرضية قابلة للتعديل', kc_ref: 'القيمة الافتراضية:',
      f_need: 'حاجة الزراعة', f_rain: 'المطر الفعّال', f_irr: 'الري اللازم', f_energy: 'طاقة الضخ', f_quota: 'الحصة السنوية',
      per_ha: 'للهكتار', per_year: 'في السنة',
      c_water_t: 'الماء: الحاجة، المطر المفيد والري، حسب الشهر', c_energy_t: 'طاقة الضخ حسب الشهر',
      s_etc: 'الحاجة ETc', s_pe: 'المطر الفعّال', s_irg: 'الري الإجمالي',
      solar_t: 'الحقل الشمسي اللازم', solar_p: 'محسوب على الشهر الأكثر طلباً', solar_none: 'لا يمكن الحساب: تنقص المساحة أو ارتفاع الضخ أو الإشعاع.',
      cost_t: 'مقارنة الكلفة السنوية', cost_none: 'أدخل سعراً واحداً على الأقل للمقارنة.',
      cost_diesel: 'ضخ بالديزل', cost_grid: 'ضخ على الشبكة', cost_solar: 'طاقة شمسية (الاستثمار موزع على العمر)',
      cost_note: 'كلفة الطاقة فقط؛ لا تشمل صيانة المعدات وتعويضها.',
      quota_t: 'الحصة الشهرية للضخ', quota_p: 'الحجم الذي لا يجب تجاوزه: هو الحاجة الزراعية المحسوبة وليس قدرة المضخة. وإذا كانت الحصة الرسمية أقل فهي الأولى.',
      th_month: 'الشهر', th_vol: 'الحجم (م³)', th_kwh: 'الطاقة (ك.و.س)', th_kwp: 'ك.و.ذ اللازمة',
      miss_t: 'معلومات ناقصة', miss_area: 'مساحة القطعة: تُعطى الأحجام للهكتار.', miss_head: 'ارتفاع الضخ: لا حساب للطاقة.', miss_ghi: 'الإشعاع الشمسي: لا حساب للحقل الشمسي.', miss_kc: 'المعامل الزراعي: أدخل قيمة.', miss_climate: 'البيانات المناخية غير متاحة: أعد بناء الملف في صفحة ذكاء الأرض.',
      method_t: 'المنهجية والمصادر', src_climate: 'المناخ:', src_solar: 'الإشعاع:', src_om: 'Open-Meteo (إشعاع الموجة القصيرة)',
      method_p: 'المطر الفعّال: طريقة USDA-SCS الشهرية المستعملة في FAO CROPWAT. قيم Kc الافتراضية مأخوذة من FAO-56 (الجدول 12) ويجب التحقق منها. يفترض حساب الحقل الشمسي أن الإشعاع على اللوح قريب من الإشعاع الأفقي.',
      sim: 'تقدير نموذجي وليس قياساً.'
    }
  });

  G.mountShell('nexus');
  var app = document.getElementById('app');
  var p = G.getParcel();
  if (!p || !p.dna) { G.needParcel(app); return; }
  var dna = p.dna, V = function (k) { return D.value(dna, k); };

  var cropKey = V('crop') && N.CROPS[V('crop')] ? V('crop') : 'other';
  var saved = G.load('gaia.nexus.inputs', null);
  var S = Object.assign({
    crop: cropKey, kc: N.CROPS[cropKey].kc, months: N.CROPS[cropKey].months.slice(),
    area: V('area_ha') || '', sys: 'drip', ea: N.EFFICIENCY.drip,
    head: V('water.well_depth_m') ? Math.round(V('water.well_depth_m') + 10) : '', pump_eff: 0.45, pr: 0.75,
    diesel_tnd_l: '', diesel_kwh_l: '', grid_tnd_kwh: '', pv_tnd_kwp: '', pv_life_y: 20
  }, saved && saved.parcelAt === dna.builtAt ? saved.values : {});

  var CM = dna.climateMonthly, SM = dna.solarMonthly;
  var ghi = SM && SM.ghi ? SM.ghi : (CM && CM.ghi ? CM.ghi : null);
  var ghiSrc = SM && SM.ghi ? SM.source : (CM && CM.ghi ? t('src_om') : null);

  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; }
  function persist() { G.save('gaia.nexus.inputs', { parcelAt: dna.builtAt, values: S }); }

  function field(id, labelKey, value, onInput, hintKey, attrs) {
    return el('div', { class: 'gp-field' }, [
      el('label', { for: id }, [t(labelKey)]),
      el('input', Object.assign({ id: id, type: 'number', step: 'any', inputmode: 'decimal', value: value === null ? '' : value, oninput: function (e) { onInput(e.target.value); persist(); draw(); } }, attrs || {})),
      hintKey ? el('span', { class: 'hint' }, [t(hintKey)]) : null
    ]);
  }

  function inputs() {
    var months = G.t('months');
    var monthBtns = el('div', { class: 'months', role: 'group', 'aria-label': t('in_months') }, months.map(function (m, i) {
      return el('button', { type: 'button', 'aria-pressed': String(!!S.months[i]), onclick: function (e) {
        S.months[i] = S.months[i] ? 0 : 1; e.currentTarget.setAttribute('aria-pressed', String(!!S.months[i])); persist(); draw();
      } }, [m]);
    }));
    var cropSel = el('select', { id: 'nx-crop', onchange: function (e) {
      S.crop = e.target.value; S.kc = N.CROPS[S.crop].kc; S.months = N.CROPS[S.crop].months.slice(); persist(); renderAll();
    } }, ['olive', 'palm', 'citrus', 'cereal', 'veg', 'other'].map(function (k) {
      var lab = { olive: 'c_olive', palm: 'c_palm', citrus: 'c_citrus', cereal: 'c_cereal', veg: 'c_veg', other: 'c_other' }[k];
      return el('option', { value: k, selected: S.crop === k }, [t(lab) === lab ? k : t(lab)]);
    }));
    var sysSel = el('select', { id: 'nx-sys', onchange: function (e) { S.sys = e.target.value; S.ea = N.EFFICIENCY[S.sys]; persist(); renderAll(); } },
      ['drip', 'sprinkler', 'surface'].map(function (k) { return el('option', { value: k, selected: S.sys === k }, [t('sys_' + k)]); }));

    return el('div', { class: 'gp-card nx-in' }, [
      el('h2', null, [t('in_t')]),
      el('div', { class: 'gp-field' }, [el('label', { for: 'nx-crop' }, [t('in_crop')]), cropSel]),
      field('nx-kc', 'in_kc', S.kc, function (v) { S.kc = num(v); }),
      el('span', { class: 'assump' }, [t('kc_ref') + ' ' + N.CROPS[S.crop].ref]),
      el('div', { class: 'gp-field' }, [el('span', { class: 'lab' }, [t('in_months')]), monthBtns]),
      field('nx-area', 'in_area', S.area, function (v) { S.area = num(v); }),
      el('div', { class: 'gp-field' }, [el('label', { for: 'nx-sys' }, [t('in_sys')]), sysSel]),
      field('nx-ea', 'in_ea', S.ea, function (v) { S.ea = num(v); }, 'assumption', { min: 0.3, max: 1 }),
      field('nx-head', 'in_head', S.head, function (v) { S.head = num(v); }, 'in_head_h'),
      field('nx-pe', 'in_pump', S.pump_eff, function (v) { S.pump_eff = num(v); }, 'assumption', { min: 0.1, max: 0.9 }),
      field('nx-pr', 'in_pr', S.pr, function (v) { S.pr = num(v); }, 'assumption', { min: 0.3, max: 1 }),
      el('details', { class: 'gp-more' }, [
        el('summary', null, [t('in_prices')]),
        el('p', { class: 'hint small muted' }, [t('in_prices_h')]),
        field('nx-p1', 'p_diesel', S.diesel_tnd_l, function (v) { S.diesel_tnd_l = num(v); }),
        field('nx-p2', 'p_dkwh', S.diesel_kwh_l, function (v) { S.diesel_kwh_l = num(v); }),
        field('nx-p3', 'p_grid', S.grid_tnd_kwh, function (v) { S.grid_tnd_kwh = num(v); }),
        field('nx-p4', 'p_pv', S.pv_tnd_kwp, function (v) { S.pv_tnd_kwp = num(v); }),
        field('nx-p5', 'p_life', S.pv_life_y, function (v) { S.pv_life_y = num(v); })
      ])
    ]);
  }

  var out;
  function draw() {
    if (!out) return;
    G.clear(out);
    var r = N.compute({
      et0: CM ? CM.et0 : null, rain: CM ? CM.rain : null, ghi: ghi,
      kc: num(S.kc), months: S.months, area_ha: num(S.area), ea: num(S.ea), head_m: num(S.head), pump_eff: num(S.pump_eff), pr: num(S.pr),
      prices: { diesel_tnd_l: num(S.diesel_tnd_l), diesel_kwh_l: num(S.diesel_kwh_l), grid_tnd_kwh: num(S.grid_tnd_kwh), pv_tnd_kwp: num(S.pv_tnd_kwp), pv_life_y: num(S.pv_life_y) }
    });
    if (r.missing.indexOf('climate') !== -1) { out.appendChild(G.note('err', t('miss_climate'))); return; }
    var T = r.totals, hasArea = r.missing.indexOf('area') === -1, months = G.t('months');

    // headline flow
    var volTxt = hasArea ? fmt(T.vol) + ' m³' : fmt(T.volHa) + ' m³';
    out.appendChild(el('div', { class: 'flow', 'aria-label': 'Résumé' }, [
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_need')]), el('div', { class: 'v' }, [fmt(T.etc) + ' mm']), el('span', { class: 'u' }, ['ETc · ' + t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_rain')]), el('div', { class: 'v' }, [fmt(T.pe) + ' mm']), el('span', { class: 'u' }, ['Pe · ' + t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_irr')]), el('div', { class: 'v' }, [fmt(T.irg) + ' mm']), el('span', { class: 'u' }, [volTxt + (hasArea ? '' : ' ' + t('per_ha'))])]),
      el('div', { class: 'fbox energy' }, [el('b', null, [t('f_energy')]), el('div', { class: 'v' }, [T.kwh > 0 ? fmt(T.kwh) + ' kWh' : '—']), el('span', { class: 'u' }, [t('per_year')])]),
      el('div', { class: 'fbox quota' }, [el('b', null, [t('f_quota')]), el('div', { class: 'v' }, [volTxt]), el('span', { class: 'u' }, [hasArea ? t('per_year') : t('per_ha') + ' · ' + t('per_year')])])
    ]));
    out.appendChild(el('p', { class: 'assump', style: 'margin-top:6px' }, [t('sim')]));

    if (r.missing.length) {
      out.appendChild(el('div', { class: 'gp-note', style: 'margin-top:14px' }, [G.icon('info'), el('div', null, [el('b', null, [t('miss_t')]),
        el('ul', { style: 'margin:4px 0 0;padding-inline-start:18px' }, r.missing.map(function (k) { return el('li', null, [t('miss_' + k)]); }))])]));
    }

    out.appendChild(forecastCard());

    var c1 = el('div'), c2 = el('div');
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [el('h2', null, [t('c_water_t')]), c1]));
    G.barChart(c1, { labels: months, unit: 'mm', title: t('c_water_t'), series: [
      { name: t('s_etc'), color: '#7C9455', values: r.months.map(function (x) { return x.etc; }) },
      { name: t('s_pe'), color: '#9CB7C9', values: r.months.map(function (x) { return x.pe; }) },
      { name: t('s_irg'), color: '#2F5A75', values: r.months.map(function (x) { return x.irg; }) }
    ] });
    if (T.kwh > 0) {
      out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [el('h2', null, [t('c_energy_t')]), c2]));
      G.barChart(c2, { labels: months, unit: 'kWh', title: t('c_energy_t'), series: [{ name: t('f_energy'), color: '#A88746', values: r.months.map(function (x) { return x.kwh || 0; }) }] });
    }

    // solar + costs
    var costRows = [['diesel', 'cost_diesel'], ['grid', 'cost_grid'], ['solar', 'cost_solar']].filter(function (c) { return r.costs[c[0]] !== undefined; });
    out.appendChild(el('div', { class: 'gp-grid gp-cols-2', style: 'margin-top:16px' }, [
      el('div', { class: 'gp-card' }, [
        el('h2', null, [t('solar_t')]),
        r.solar ? el('div', null, [
          el('p', { style: 'font-family:var(--g-display);font-size:34px;font-weight:600;color:var(--g-forest);margin-top:6px' }, [fmt(r.solar.kwp, 1) + ' kWc']),
          el('p', { class: 'small muted' }, [t('solar_p') + ' : ' + months[r.solar.peakMonth]]),
          el('p', { class: 'assump', style: 'margin-top:6px' }, [t('src_solar') + ' ' + (ghiSrc || '—')])
        ]) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('solar_none')])
      ]),
      el('div', { class: 'gp-card' }, [
        el('h2', null, [t('cost_t')]),
        costRows.length ? el('div', { class: 'gp-table-wrap' }, [el('table', { class: 'gp-table', style: 'margin-top:8px' }, [el('tbody', null, costRows.map(function (c) {
          return el('tr', { class: 'cost-row' }, [el('td', null, [t(c[1])]), el('td', { class: 'num' }, [fmt(r.costs[c[0]]) + ' TND / ' + t('per_year').replace('par ', '')])]);
        }))]), el('p', { class: 'assump', style: 'margin-top:8px' }, [t('cost_note')])]) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('cost_none')])
      ])
    ]));

    // quota table
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('h2', null, [t('quota_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('quota_p')]),
      el('div', { class: 'gp-table-wrap', style: 'margin-top:10px' }, [el('table', { class: 'gp-table' }, [
        el('thead', null, [el('tr', null, [el('th', null, [t('th_month')]), el('th', { class: 'num' }, [t('th_vol') + (hasArea ? '' : ' / ha')]), el('th', { class: 'num' }, [t('th_kwh')]), el('th', { class: 'num' }, [t('th_kwp')])])]),
        el('tbody', null, r.months.map(function (x) {
          return el('tr', null, [el('td', null, [months[x.m]]), el('td', { class: 'num' }, [fmt(hasArea ? x.vol : x.volHa)]), el('td', { class: 'num' }, [x.kwh === null ? '—' : fmt(x.kwh)]), el('td', { class: 'num' }, [x.kwp === null ? '—' : fmt(x.kwp, 1)])]);
        }))
      ])])
    ]));

    // method
    out.appendChild(el('details', { class: 'gp-card gp-more', style: 'margin-top:16px' }, [
      el('summary', null, [t('method_t')]),
      el('div', { class: 'formula' }, ['ETc = Kc × ET0']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, ['Pe = P(125 − 0.2P)/125 if P ≤ 250 mm ; Pe = 125 + 0.1P otherwise']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, ['IRn = max(0, ETc − Pe) ; IRg = IRn / Ea ; V[m³] = 10 × IRg[mm] × A[ha]']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, ['E[kWh] = V × H / (367 × ηp) ; kWp = E / (days × GHI × PR)']),
      el('p', { class: 'small', style: 'margin-top:10px;color:var(--g-ink-2)' }, [t('method_p')]),
      el('p', { class: 'assump', style: 'margin-top:8px' }, [t('src_climate') + ' ' + (CM ? CM.source + ' · ' + CM.period : '—')])
    ]));
  }

  function renderAll() {
    G.clear(app);
    app.appendChild(el('div', { class: 'gp-principle', style: 'margin-bottom:8px' }, [t('principle')]));
    app.appendChild(el('p', { class: 'small', style: 'margin:0 0 18px;color:var(--g-ink-2);max-width:80ch' }, [t('principle_p')]));
    out = el('div', { 'aria-live': 'polite' });
    app.appendChild(el('div', { class: 'nx' }, [inputs(), out]));
    draw();
  }

  /* ---------------------------------------------------- 7-day plan (trained model) */
  G.addStrings({
    fr: {
      fc_t: "Plan d'irrigation : aujourd'hui et les 7 prochains jours", fc_badge: 'Modèle entraîné',
      fc_lead: "Un modèle d'apprentissage automatique (LightGBM) prévoit, jour par jour, l'état du sol dans la zone des racines (7–28 cm), à partir du dernier état connu du sol et de la météo prévue.",
      fc_loading: 'Prévision en cours…',
      fc_off: "Le service de prévision n'est pas démarré. Depuis le dossier du projet, lancez : python -m uvicorn gaia.main:app --app-dir backend --port 8000",
      fc_err: 'Prévision indisponible :',
      v_irrigate: 'Irrigation conseillée à partir de {d}.',
      v_soon: "Pas d'irrigation nécessaire pour l'instant, mais la réserve approche du seuil à partir de {d}.",
      v_none: "Pas d'irrigation nécessaire cette semaine : la réserve du sol reste suffisante.",
      v_sub: "Réserve du sol estimée aujourd'hui : {r} (probablement entre {lo} et {hi}).",
      b_state: 'Dernier état connu du sol', b_state_u: 'ECMWF IFS · {d} (hier, dernier jour complet)',
      b_today: "Aujourd'hui (estimé)", b_today_u: 'probablement entre {lo} et {hi}',
      b_week: 'Consommation de la culture sur 7 jours', b_week_u: 'Kc × ET0 · {v} m³ par ha',
      today: "aujourd'hui",
      th_day: 'Jour', th_rain: 'Pluie prévue', th_et0: 'Évaporation de référence (ET0)', th_etc: 'Consommation de la culture',
      th_res: 'Réserve du sol', th_range: 'Fourchette probable', th_dec: 'Conseil',
      d_irrigate: 'Irriguer', d_soon: 'Irriguer bientôt', d_none: 'Réserve suffisante',
      c_res_t: 'Réserve du sol prévue (%)',
      how_t: 'Comment lire ce plan',
      how_res: "Réserve du sol : l'état du sol comparé à son historique dans la région depuis 2020. 0 % = aussi sec que les jours les plus secs, 100 % = aussi humide que les jours les plus humides. Ce n'est pas le pourcentage d'eau dans le sol.",
      how_range: "Fourchette probable : l'erreur habituelle du modèle, mesurée sur des régions qu'il n'a jamais vues. Elle s'élargit avec les jours : plus on prévoit loin, moins c'est sûr.",
      how_dec: "Conseil : « Irriguer » quand la réserve prévue passe sous 30 %, « Irriguer bientôt » entre 30 et 35 %, « Réserve suffisante » au-dessus. Ces seuils sont une hypothèse de démonstration, les mêmes pour toutes les cultures ; ils seront remplacés par ceux de la culture (FAO-56).",
      how_need: "« Réserve suffisante » ne veut pas dire que la plante ne boit pas : la colonne « Consommation de la culture » montre ce qu'elle utilise chaque jour. Cela veut dire que l'eau déjà dans le sol couvre ce besoin.",
      how_irr: "Le modèle décrit un sol non irrigué de la région : il ne sait pas si votre parcelle a été arrosée. Un capteur d'humidité du sol permettra de le corriger.",
      fc_ref: 'Site de référence pour la réserve :',
      fc_src: 'Données :',
      fc_sim: 'Prédiction de modèle entraîné, pas une mesure.',
      wd: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
    },
    ar: {
      fc_t: 'خطة الري: اليوم والأيام السبعة القادمة', fc_badge: 'نموذج مُدرَّب',
      fc_lead: 'يتنبأ نموذج تعلّم آلي (LightGBM)، يوماً بيوم، بحالة التربة في منطقة الجذور (7–28 سم)، انطلاقاً من آخر حالة معروفة للتربة والطقس المتوقع.',
      fc_loading: 'جارٍ التنبؤ…',
      fc_off: 'خدمة التنبؤ غير مشغّلة. من مجلد المشروع، شغّل: python -m uvicorn gaia.main:app --app-dir backend --port 8000',
      fc_err: 'التنبؤ غير متاح:',
      v_irrigate: 'يُنصح بالري ابتداءً من {d}.',
      v_soon: 'لا حاجة للري حالياً، لكن المخزون يقترب من العتبة ابتداءً من {d}.',
      v_none: 'لا حاجة للري هذا الأسبوع: مخزون التربة يبقى كافياً.',
      v_sub: 'مخزون التربة المقدّر اليوم: {r} (على الأرجح بين {lo} و{hi}).',
      b_state: 'آخر حالة معروفة للتربة', b_state_u: 'ECMWF IFS · {d} (أمس، آخر يوم كامل)',
      b_today: 'اليوم (تقدير)', b_today_u: 'على الأرجح بين {lo} و{hi}',
      b_week: 'استهلاك الزراعة خلال 7 أيام', b_week_u: 'Kc × ET0 · {v} م³ للهكتار',
      today: 'اليوم',
      th_day: 'اليوم', th_rain: 'المطر المتوقع', th_et0: 'التبخر المرجعي (ET0)', th_etc: 'استهلاك الزراعة',
      th_res: 'مخزون التربة', th_range: 'المجال المرجّح', th_dec: 'النصيحة',
      d_irrigate: 'اسقِ', d_soon: 'اسقِ قريباً', d_none: 'المخزون كافٍ',
      c_res_t: 'مخزون التربة المتوقع (%)',
      how_t: 'كيف تقرأ هذه الخطة',
      how_res: 'مخزون التربة: حالة التربة مقارنة بتاريخها في المنطقة منذ 2020. 0 % = جافة مثل أجفّ الأيام، 100 % = رطبة مثل أرطب الأيام. ليست نسبة الماء في التربة.',
      how_range: 'المجال المرجّح: الخطأ المعتاد للنموذج، مقيساً في مناطق لم يرها أثناء التدريب. يتّسع مع الأيام: كلما ابتعد التنبؤ قلّ اليقين.',
      how_dec: 'النصيحة: «اسقِ» عندما ينزل المخزون المتوقع تحت 30 %، «اسقِ قريباً» بين 30 و35 %، «المخزون كافٍ» فوق ذلك. هذه العتبات فرضية للعرض، واحدة لكل الزراعات، وستُعوَّض بعتبات كل زراعة (FAO-56).',
      how_need: '«المخزون كافٍ» لا يعني أن النبتة لا تشرب: عمود «استهلاك الزراعة» يبيّن ما تستعمله كل يوم. المعنى أن الماء الموجود في التربة يغطي هذه الحاجة.',
      how_irr: 'يصف النموذج تربة غير مسقية في المنطقة: لا يعرف إن كانت قطعتك قد سُقيت. سيسمح مستشعر رطوبة التربة بتصحيح ذلك.',
      fc_ref: 'الموقع المرجعي للمخزون:',
      fc_src: 'البيانات:',
      fc_sim: 'تنبؤ نموذج مُدرَّب وليس قياساً.',
      wd: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    }
  });

  var FC = { status: 'off', data: null, error: null };
  var loc = dna.location || {}, fLat = p.lat != null ? p.lat : loc.lat, fLon = p.lon != null ? p.lon : loc.lon;
  if (G.CONFIG.irrigationEndpoint && fLat != null && fLon != null) {
    FC.status = 'loading';
    fetch(G.CONFIG.irrigationEndpoint.replace('{lat}', fLat).replace('{lon}', fLon))
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j.detail && (j.detail.message || j.detail)) || r.status);
          return j;
        });
      })
      .then(function (j) { FC = { status: 'ok', data: j, error: null }; draw(); })
      .catch(function (e) {
        // a network failure means the local service is not running; anything else is reported as is
        FC = e instanceof TypeError ? { status: 'off', data: null, error: null } : { status: 'error', data: null, error: String(e.message || e) };
        draw();
      });
  }

  function dayLabel(iso, isToday) {
    var d = new Date(iso + 'T12:00:00');
    var s = t('wd')[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    return isToday ? t('today') + ' · ' + s : s;
  }
  function fill(key, vals) {
    return t(key).replace(/\{(\w+)\}/g, function (_, k) { return vals[k]; });
  }

  function forecastCard() {
    var head = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('fc_t')]), G.pill('live', t('fc_badge'))]);
    var card = el('div', { class: 'gp-card', style: 'margin-top:16px' }, [head,
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('fc_lead')])]);
    if (FC.status === 'loading') { card.appendChild(el('p', { class: 'muted small', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' ' + t('fc_loading')])); return card; }
    if (FC.status === 'off') { card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('info', t('fc_off'))])); return card; }
    if (FC.status === 'error') { card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('err', t('fc_err') + ' ' + FC.error)])); return card; }

    var d = FC.data, kc = num(S.kc), pct = function (x) { return fmt(x * 100) + ' %'; };
    var today = d.days.filter(function (x) { return x.is_today; })[0] || d.days[0];
    var week = d.days.filter(function (x) { return !x.is_today; }).slice(0, 7);
    var etc = d.days.map(function (x) { return kc !== null && x.et0_mm !== null ? kc * x.et0_mm : null; });
    var etcWeek = week.map(function (x) { return kc !== null && x.et0_mm !== null ? kc * x.et0_mm : null; });
    var weekSum = etcWeek.every(function (v) { return v !== null; }) ? etcWeek.reduce(function (a, b) { return a + b; }, 0) : null;
    var decision = { irrigate: ['no', 'd_irrigate'], soon: ['adapt', 'd_soon'], none: ['ok', 'd_none'] };

    // 1. the verdict, in one sentence
    var first = function (kind) { return d.days.filter(function (x) { return x.decision === kind; })[0]; };
    var irr = first('irrigate'), soon = first('soon');
    var verdict = irr ? ['err', fill('v_irrigate', { d: dayLabel(irr.date, irr.is_today) })]
      : soon ? ['info', fill('v_soon', { d: dayLabel(soon.date, soon.is_today) })]
      : ['ok', t('v_none')];
    card.appendChild(el('div', { style: 'margin-top:12px' }, [G.note(verdict[0], verdict[1])]));
    card.appendChild(el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [
      fill('v_sub', { r: pct(today.reserve), lo: pct(today.reserve_low), hi: pct(today.reserve_high) })]));

    // 2. last known state, today, crop use over the week
    card.appendChild(el('div', { class: 'flow', style: 'margin-top:12px' }, [
      el('div', { class: 'fbox water' }, [el('b', null, [t('b_state')]), el('div', { class: 'v' }, [pct(d.state.reserve)]),
        el('span', { class: 'u' }, [fill('b_state_u', { d: dayLabel(d.state.date), n: d.state.lag_days })])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('b_today')]), el('div', { class: 'v' }, [pct(today.reserve)]),
        el('span', { class: 'u' }, [fill('b_today_u', { lo: pct(today.reserve_low), hi: pct(today.reserve_high) })])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('b_week')]), el('div', { class: 'v' }, [weekSum === null ? '—' : fmt(weekSum, 1) + ' mm']),
        el('span', { class: 'u' }, [weekSum === null ? '' : fill('b_week_u', { v: fmt(weekSum * 10) })])])
    ]));

    // 3. chart and table
    var chart = el('div', { style: 'margin-top:12px' });
    card.appendChild(chart);
    G.barChart(chart, { labels: d.days.map(function (x) { return x.is_today ? t('today') : dayLabel(x.date); }), unit: '%', title: t('c_res_t'),
      series: [{ name: t('c_res_t'), color: '#2F5A75', values: d.days.map(function (x) { return x.reserve * 100; }) }] });

    card.appendChild(el('div', { class: 'gp-table-wrap', style: 'margin-top:10px' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, [el('th', null, [t('th_day')]), el('th', { class: 'num' }, [t('th_rain')]), el('th', { class: 'num' }, [t('th_et0')]),
        el('th', { class: 'num' }, [t('th_etc')]), el('th', { class: 'num' }, [t('th_res')]), el('th', { class: 'num' }, [t('th_range')]), el('th', null, [t('th_dec')])])]),
      el('tbody', null, d.days.map(function (x, i) {
        var dec = decision[x.decision];
        return el('tr', x.is_today ? { style: 'font-weight:600' } : null, [
          el('td', null, [dayLabel(x.date, x.is_today)]),
          el('td', { class: 'num' }, [x.rain_mm === null ? '—' : fmt(x.rain_mm, 1) + ' mm']),
          el('td', { class: 'num' }, [x.et0_mm === null ? '—' : fmt(x.et0_mm, 1) + ' mm']),
          el('td', { class: 'num' }, [etc[i] === null ? '—' : fmt(etc[i], 1) + ' mm']),
          el('td', { class: 'num' }, [pct(x.reserve)]),
          el('td', { class: 'num muted' }, [fmt(x.reserve_low * 100) + '–' + pct(x.reserve_high)]),
          el('td', null, [G.pill(dec[0], t(dec[1]))])
        ]);
      }))
    ])]));
    card.appendChild(el('p', { class: 'assump', style: 'margin-top:8px' }, [t('fc_sim')]));

    // 4. how to read it, always visible
    card.appendChild(el('div', { class: 'gp-note', style: 'margin-top:12px' }, [G.icon('info'), el('div', null, [el('b', null, [t('how_t')]),
      el('ul', { style: 'margin:6px 0 0;padding-inline-start:18px;display:grid;gap:4px' },
        ['how_res', 'how_range', 'how_dec', 'how_need', 'how_irr'].map(function (k) { return el('li', null, [t(k)]); }))])]));

    // 5. sources
    var ref = d.reference_site;
    card.appendChild(el('details', { class: 'gp-more', style: 'margin-top:8px' }, [
      el('summary', null, [t('method_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('fc_ref') + ' ' + ref.nom + ' (' + fmt(ref.distance_km) + ' km).']),
      el('p', { class: 'assump', style: 'margin-top:6px' }, [t('fc_src') + ' ' + d.model.source + ' · ' + d.model.period.join(' → ') + ' · ' + d.model.trained_on])
    ]));
    return card;
  }

  // crop labels live in land.js; provide them here too
  G.addStrings({
    fr: { c_olive: 'Olivier', c_palm: 'Palmier dattier', c_citrus: 'Agrumes', c_cereal: 'Céréales', c_veg: 'Maraîchage', c_other: 'Autre' },
    ar: { c_olive: 'زيتون', c_palm: 'نخيل التمر', c_citrus: 'قوارص', c_cereal: 'حبوب', c_veg: 'خضروات', c_other: 'أخرى' }
  });
  renderAll();
  G.onLang(renderAll);
}());
