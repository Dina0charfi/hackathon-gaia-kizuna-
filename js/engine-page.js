/* Compatibility engine page. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, E = window.GAIA_ENGINE;

  G.addStrings({
    fr: {
      e_title: 'Moteur de compatibilité',
      e_lead: 'Chaque technique est testée sur six dimensions. Une condition obligatoire non remplie écarte la technique, sauf si sa fiche prévoit une adaptation.',
      e_parcel: 'Parcelle évaluée', e_change: 'Changer de parcelle',
      e_n_ok: 'faisables', e_n_adapt: 'avec adaptation', e_n_no: 'non recommandées',
      f_all: 'Toutes', f_jp: 'Origine Japon', f_tn: 'Origine Tunisie',
      why_ok: 'Pourquoi elle convient', what_adapt: 'Ce qui doit être adapté', why_no: 'Pourquoi elle est écartée', actions: 'Trois actions',
      sources: 'Sources', not_eval: 'Non évalué faute de donnée', score: 'Correspondance',
      score_m: 'Part pondérée des conditions secondaires remplies. Affichée seulement si toutes ont pu être évaluées.',
      no_score: 'Pas de score : une condition secondaire n’a pas pu être évaluée.',
      provisional: 'Au moins un seuil de cette fiche est provisoire et doit être validé par un agronome.',
      draft: 'Fiche en brouillon, non validée par un expert', rejected_list: 'Techniques écartées pour cette parcelle',
      to_check: 'À vérifier', mat_cost: 'Coût', mat: 'Matériaux', actors: 'Acteurs locaux', reg: 'Réglementation',
      open_rec: 'Ouvrir la fiche', none_dim: '—',
      e_note: "Ces verdicts viennent de règles explicites appliquées au profil de la parcelle. Ils ne remplacent pas l'avis d'un agronome."
    },
    ar: {
      e_title: 'محرك التوافق',
      e_lead: 'تُختبر كل تقنية على ستة أبعاد. إذا لم يُستوفَ شرط إلزامي تُستبعد التقنية، إلا إذا نصّت بطاقتها على تكييف.',
      e_parcel: 'القطعة المقيّمة', e_change: 'تغيير القطعة',
      e_n_ok: 'ممكنة', e_n_adapt: 'مع التكييف', e_n_no: 'غير موصى بها',
      f_all: 'الكل', f_jp: 'من اليابان', f_tn: 'من تونس',
      why_ok: 'لماذا تناسب', what_adapt: 'ما يجب تكييفه', why_no: 'سبب الاستبعاد', actions: 'ثلاث خطوات',
      sources: 'المصادر', not_eval: 'لم يُقيَّم لنقص البيانات', score: 'نسبة التوافق',
      score_m: 'النسبة الموزونة للشروط الثانوية المستوفاة، تُعرض فقط إذا أمكن تقييمها كلها.',
      no_score: 'لا توجد نسبة: تعذّر تقييم أحد الشروط الثانوية.',
      provisional: 'عتبة واحدة على الأقل في هذه البطاقة مؤقتة ويجب أن يصادق عليها مهندس فلاحي.',
      draft: 'بطاقة مسودة غير مصادق عليها', rejected_list: 'التقنيات المستبعدة لهذه القطعة',
      to_check: 'للتحقق', mat_cost: 'التكلفة', mat: 'المواد', actors: 'الفاعلون المحليون', reg: 'التنظيمات',
      open_rec: 'فتح البطاقة', none_dim: '—',
      e_note: 'هذه الأحكام ناتجة عن قواعد صريحة مطبّقة على ملف القطعة، ولا تعوّض رأي مهندس فلاحي.'
    }
  });
  G.addStrings({
    fr: { e_missing: 'Ce qui manque pour décider', e_complete: 'Compléter le profil de la parcelle', no_cond: 'Sans contrainte',
      no_cond_tip: 'La fiche ne fixe aucune condition sur cette dimension.', none_passed: 'Aucune condition confirmée pour l’instant : les données de la parcelle manquent pour les vérifier.',
      missing_soft: 'Aucune condition obligatoire ne manque ; les conditions secondaires ci-dessous restent à vérifier.', unknown_tip: 'Donnée manquante : ' },
    ar: { e_missing: 'ما ينقص لاتخاذ القرار', e_complete: 'أكمل ملف القطعة', no_cond: 'بلا قيد',
      no_cond_tip: 'لا تحدد البطاقة أي شرط في هذا البعد.', none_passed: 'لا يوجد شرط مؤكد بعد: تنقص بيانات القطعة للتحقق منها.',
      missing_soft: 'لا ينقص أي شرط إلزامي؛ الشروط الثانوية أدناه تبقى للتحقق.', unknown_tip: 'بيانات ناقصة: ' }
  });
  G.mountShell('engine');

  var app = document.getElementById('app');
  var filter = 'all';

  function vLabel(v) { return t(v === 'feasible' ? 'verdict_ok' : v === 'adapt' ? 'verdict_adapt' : v === 'insufficient' ? 'verdict_unk' : 'verdict_no'); }
  function dimLabel(d) { return t({ climate: 'dim_climate', terrain: 'dim_terrain', water: 'dim_water', materials: 'dim_materials', org: 'dim_org', reg: 'dim_reg' }[d]); }

  function dimBox(d, info, rec) {
    var st = info.status, txt, ic;
    var notes = (rec && rec.dimNotes) || {};
    if (st === 'pass') { txt = t('pass'); ic = 'ok'; }
    else if (st === 'fail') { txt = t('fail'); ic = 'no'; }
    else if (st === 'partial') { txt = t('pass') + ' / ' + t('fail'); ic = 'adapt'; }
    else if (st === 'unknown') { txt = t('unknown'); ic = 'unk'; }
    else if (st === 'info') { txt = t('to_check'); ic = 'info'; }
    else { txt = t('no_cond'); ic = 'info'; }
    var box = el('div', { class: 'dim ' + st }, [el('b', null, [dimLabel(d)]), el('span', null, [G.icon(ic), txt])]);
    var tip = info.checks.map(function (x) { return (x.result === 'unknown' ? t('unknown_tip') : '') + E.describe(x); }).join(' · ');
    if (!tip && st === 'info' && rec) tip = { materials: rec.materials + ' — ' + rec.cost, org: rec.actors, reg: rec.regulation }[d] || '';
    if (!tip) tip = notes[d] || t('no_cond_tip');
    else if (notes[d]) tip += ' · ' + notes[d];
    if (tip) G.bindTip(box, tip);
    return box;
  }

  function card(r) {
    var rec = r.record, ar = G.lang() === 'ar';
    var name = ar && rec.name_ar ? rec.name_ar : rec.name;
    var head = el('div', { class: 'thead' }, [
      el('span', { class: 'origin ' + rec.origin }, [el('i', { class: 'dot' }), t(rec.origin === 'jp' ? 'origin_jp' : 'origin_tn')]),
      el('h3', null, [name, rec.jp ? el('span', { class: 'jp', lang: 'ja' }, [rec.jp]) : null]),
      G.pill(r.verdict === 'feasible' ? 'ok' : r.verdict === 'adapt' ? 'adapt' : r.verdict === 'insufficient' ? 'unk' : 'no', vLabel(r.verdict))
    ]);

    var scoreBox = null;
    if (r.verdict !== 'rejected') {
      scoreBox = r.score !== null
        ? el('p', { class: 'small', style: 'margin-top:8px' }, [t('score') + ' : ', el('span', { class: 'score' }, [fmt(r.score * 100) + ' %'])])
        : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('no_score')]);
      if (r.score !== null) G.bindTip(scoreBox, t('score_m'));
    }

    var dims = el('div', { class: 'dims' }, E.DIMS.map(function (d) { return dimBox(d, r.dims[d], rec); }));

    var passed = r.checks.filter(function (x) { return x.result === 'pass'; });
    var cols = [];
    if (r.verdict === 'rejected') {
      cols.push(el('div', null, [el('h4', null, [t('why_no')]), el('ul', null, r.hardFails.map(function (x) {
        return el('li', null, [E.describe(x) + ' — ' + x.cond.why]);
      }))]));
    } else {
      cols.push(el('div', null, [el('h4', null, [t('why_ok')]), passed.length ? el('ul', null, passed.map(function (x) {
        return el('li', null, [E.describe(x)]);
      })) : el('p', { class: 'small muted' }, [t('none_passed')])]));
      if (r.verdict === 'insufficient') {
        var need = r.unknown.filter(function (x) { return x.cond.hard; });
        if (!need.length) need = r.unknown;
        cols.push(el('div', null, [el('h4', null, [t('e_missing')]), el('ul', null, need.map(function (x) {
          return el('li', null, [E.describe(x) + ' — ' + x.cond.why]);
        })), el('a', { class: 'small', href: 'land.html' }, [t('e_complete') + ' →'])]));
      }
      if (r.adaptation) cols.push(el('div', null, [el('h4', null, [t('what_adapt')]), el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [r.adaptation.text])]));
      if (rec.actions && rec.actions.length) cols.push(el('div', null, [el('h4', null, [t('actions')]), el('ol', null, rec.actions.map(function (a) { return el('li', null, [a]); }))]));
    }
    if (r.unknown.length) cols.push(el('div', null, [el('h4', null, [t('not_eval')]), el('ul', null, r.unknown.map(function (x) { return el('li', null, [E.describe(x)]); }))]));

    var more = el('details', { class: 'gp-more' }, [
      el('summary', null, [t('to_check') + ' : ' + t('dim_materials') + ', ' + t('dim_org') + ', ' + t('dim_reg')]),
      el('div', { class: 'tcols', style: 'margin-top:4px' }, [
        el('div', null, [el('h4', null, [t('mat')]), el('p', { class: 'small' }, [rec.materials || '—']), el('h4', { style: 'margin-top:10px' }, [t('mat_cost')]), el('p', { class: 'small' }, [rec.cost || '—'])]),
        el('div', null, [el('h4', null, [t('actors')]), el('p', { class: 'small' }, [rec.actors || '—'])].concat(rec.dimNotes && rec.dimNotes.org ? [el('p', { class: 'small muted' }, [rec.dimNotes.org])] : [])),
        el('div', null, [el('h4', null, [t('reg')]), el('p', { class: 'small' }, [rec.regulation || '—'])])
      ])
    ]);

    var src = el('div', { style: 'margin-top:14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px' }, [
      el('span', { class: 'muted' }, [t('sources') + ' :'])
    ].concat(rec.sources.map(function (s) {
      return s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener' }, [s.label]) : el('span', { class: 'muted' }, [s.label]);
    })).concat([
      G.pill('demo', t('draft')),
      el('a', { href: 'library.html#' + rec.id }, [t('open_rec') + ' →']),
      G.kaizenButton({ kind: 'recommendation', record: rec.id, verdict: r.verdict, parcel: G.getParcel() ? { lat: G.getParcel().lat, lon: G.getParcel().lon } : null })
    ]));

    return el('article', { class: 'tcard v-' + r.verdict, 'data-origin': rec.origin }, [
      head, scoreBox, r.provisional ? el('p', { class: 'small', style: 'margin-top:8px;color:var(--s-adapt)' }, [t('provisional')]) : null,
      dims, el('div', { class: 'tcols' }, cols), more, src
    ]);
  }

  function render() {
    var p = G.getParcel();
    if (!p || !p.dna) { G.needParcel(app); return; }
    var results = E.evaluateAll(p.dna);
    G.clear(app);

    var count = function (v) { return results.filter(function (r) { return r.verdict === v; }).length; };
    app.appendChild(el('div', { class: 'sum' }, [
      el('div', { class: 'gp-card' }, [el('p', { class: 'eyebrow' }, [t('e_parcel')]),
        el('p', { style: 'font-weight:600;margin-top:4px' }, [p.name || (fmt(p.lat, 4) + ', ' + fmt(p.lon, 4))]),
        el('a', { class: 'small', href: 'land.html' }, [t('e_change')])]),
      el('div', { class: 'gp-card' }, [el('span', { class: 'n' }, [String(count('feasible'))]), ' ', G.pill('ok', t('e_n_ok'))]),
      el('div', { class: 'gp-card' }, [el('span', { class: 'n' }, [String(count('adapt'))]), ' ', G.pill('adapt', t('e_n_adapt'))]),
      el('div', { class: 'gp-card' }, [el('span', { class: 'n' }, [String(count('insufficient'))]), ' ', G.pill('unk', t('verdict_unk'))]),
      el('div', { class: 'gp-card' }, [el('span', { class: 'n' }, [String(count('rejected'))]), ' ', G.pill('no', t('e_n_no'))])
    ]));
    app.appendChild(el('div', { style: 'margin-top:14px' }, [G.note('info', t('e_note'))]));
    if (p.dna.quality.coreMissing.length) {
      app.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('warn', 'Données essentielles manquantes : ' + p.dna.quality.coreMissing.join(', ') + '. Les verdicts qui en dépendent restent « non évalué ».')]));
    }

    var fbar = el('div', { class: 'filters', role: 'group', 'aria-label': 'Filtre' });
    [['all', 'f_all'], ['jp', 'f_jp'], ['tn', 'f_tn']].forEach(function (f) {
      fbar.appendChild(el('button', { type: 'button', 'aria-pressed': String(filter === f[0]), onclick: function () { filter = f[0]; render(); } }, [t(f[1])]));
    });
    app.appendChild(fbar);

    var list = el('div', { class: 'tech' });
    results.filter(function (r) { return filter === 'all' || r.record.origin === filter; }).forEach(function (r) { list.appendChild(card(r)); });
    app.appendChild(list);
  }

  render();
  G.onLang(render);
}());
