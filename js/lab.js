/* ==========================================================================
   GAIA AI Lab — contextual assistant.

   Answers are assembled from three things only: the parcel's LAND DNA, the
   compatibility engine's verdicts, and the knowledge records. Without a
   configured LLM endpoint the wording comes from templates; with one, the LLM
   receives only that evidence and its numbers are checked before display.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, E = window.GAIA_ENGINE, KB = window.GAIA_KB, D = window.GAIA_DNA;

  G.addStrings({
    fr: {
      lab_title: "Le centre d'intelligence", lab_lead: 'Posez une question sur votre parcelle. Chaque réponse montre la recommandation, la fiche qui la justifie, les données utilisées, la confiance et ce qui manque.',
      ctx: 'Contexte de la parcelle', ask: 'Questions possibles', ph: 'Posez votre question sur cette parcelle…', send: 'Envoyer',
      mode_rules: 'Réponses composées à partir des fiches et du profil de la parcelle (questions libres en français, arabe ou anglais). Aucun modèle de langage n’est connecté : voir backend/README.md pour activer Claude.',
      mode_llm: 'Formulation par modèle de langage, à partir des seules fiches récupérées ; chiffres vérifiés.',
      s_reco: 'Recommandation', s_expl: 'Explication', s_rec: 'Fiche technique', s_data: 'Données utilisées', s_conf: 'Confiance',
      s_miss: 'Informations manquantes', s_act: 'Actions', s_llm: 'Formulation (modèle de langage)',
      q1: 'Quelles techniques japonaises pourraient marcher ici ?', q2: 'Comment adapter les jessour à cette parcelle ?', q3: "Quelles sont les contraintes en eau ?",
      q4: "L'agrivoltaïsme peut-il convenir ici ?", q5: 'Pourquoi GAIA a-t-il écarté les terrasses japonaises ?', q6: 'Explique la recommandation en arabe.', q7: 'Quelles informations manquent ?',
      k_rain: 'Pluie', k_slope: 'Pente', k_water: 'Eau', k_crop: 'Culture', k_ghi: 'Soleil',
      insufficient: 'Preuves insuffisantes', insufficient_p: "Je n'ai pas de fiche ni de donnée qui permette de répondre à cette question sans inventer. Essayez une des questions proposées, ou ajoutez la technique à la bibliothèque.",
      none_missing: 'Aucune information essentielle ne manque.',
      llm_block: 'La formulation du modèle contenait un chiffre absent des données fournies ; elle a été bloquée.',
      llm_err: 'Le service de modèle de langage ne répond pas ; la réponse ci-dessus reste valable.'
    },
    ar: {
      lab_title: 'مركز الذكاء', lab_lead: 'اطرح سؤالاً عن قطعتك. تعرض كل إجابة التوصية والبطاقة التي تبررها والبيانات المستعملة ودرجة الثقة وما ينقص.',
      ctx: 'سياق القطعة', ask: 'أسئلة مقترحة', ph: 'اطرح سؤالك عن هذه القطعة…', send: 'إرسال',
      mode_rules: 'الإجابات مركّبة من البطاقات وملف القطعة (أسئلة حرة بالعربية أو الفرنسية أو الإنجليزية). لا يوجد نموذج لغوي متصل.',
      mode_llm: 'صياغة بنموذج لغوي اعتماداً على البطاقات المسترجعة فقط، مع التحقق من الأرقام.',
      s_reco: 'التوصية', s_expl: 'الشرح', s_rec: 'البطاقة التقنية', s_data: 'البيانات المستعملة', s_conf: 'درجة الثقة',
      s_miss: 'معلومات ناقصة', s_act: 'الخطوات', s_llm: 'الصياغة (نموذج لغوي)',
      q1: 'ما التقنيات اليابانية التي قد تنجح هنا؟', q2: 'كيف أكيّف الجسور مع هذه القطعة؟', q3: 'ما هي قيود الماء؟',
      q4: 'هل تناسب الزراعة الضوئية هذه القطعة؟', q5: 'لماذا استبعدت غايا المدرجات اليابانية؟', q6: 'اشرح التوصية بالعربية.', q7: 'ما المعلومات الناقصة؟',
      k_rain: 'الأمطار', k_slope: 'الانحدار', k_water: 'الماء', k_crop: 'الزراعة', k_ghi: 'الشمس',
      insufficient: 'أدلة غير كافية', insufficient_p: 'لا توجد بطاقة ولا بيانات تسمح بالإجابة عن هذا السؤال دون اختلاق. جرّب أحد الأسئلة المقترحة.',
      none_missing: 'لا تنقص أي معلومة أساسية.',
      llm_block: 'تضمنت صياغة النموذج رقماً غير موجود في البيانات، فتم حجبها.',
      llm_err: 'خدمة النموذج اللغوي لا تستجيب؛ الإجابة أعلاه تبقى صالحة.'
    }
  });
  G.mountShell('lab');

  var app = document.getElementById('app');
  var thread = [];        // [{ q, intent, lang }]
  var lastIntent = null;

  /* ---------------------------------------------------------- intents */
  var NAMES = [
    ['tn-jessour', /jessour|جسور/i], ['tn-tabia', /tabia|طابية/i], ['tn-meskat', /meskat|مسقاة/i],
    ['tn-dry-stone-basins', /cuvette|basin|pierre s[eè]che|أحواض/i], ['tn-oasis', /oasis|واحة/i], ['tn-cistern', /citerne|cistern|majel|fesguia|خزان/i],
    ['x-mulch', /paill|mulch|تغطية/i], ['jp-tanada', /terrasse|tanada|terrace|棚田|مدرج/i], ['jp-canal-turn', /tour d.eau|canal|okuizumo|دور الماء/i],
    ['jp-solar-sharing', /solar sharing|agrivolta|panneau|ضوئي|شمسي/i], ['jp-satoyama-layers', /satoyama|ساتوياما|里山/i]
  ];
  var R = window.GAIA_RETRIEVAL;
  function namedRecord(q) { for (var i = 0; i < NAMES.length; i++) if (NAMES[i][1].test(q)) return NAMES[i][0]; return null; }
  function detect(q0) {
    var q = q0 + ' ' + R.norm(q0);
    var an = R.analyse(q0, KB.records);
    var rec = namedRecord(q) || an.named[0] || null;
    if (/arabe|arabic|عرب/i.test(q)) return { kind: 'arabic' };
    if (/manqu|missing|ناقص|نقص/i.test(q)) return { kind: 'missing' };
    if (/pourquoi|why|rejet|écart|ecart|refus|لماذا|استبعد/i.test(q)) return { kind: 'why', rec: rec };
    if (an.facets.length) return { kind: 'facet', facets: an.facets, rec: rec, an: an };
    if (/agrivolta|solar sharing|panneau|ضوئي/i.test(q)) return { kind: 'record', rec: 'jp-solar-sharing' };
    if (/adapt|كيّف|كيف أكيف|تكييف/i.test(q) && rec) return { kind: 'record', rec: rec };
    if (rec) return { kind: 'record', rec: rec };
    if (/japon|japan|ياب/i.test(q)) return { kind: 'origin', origin: 'jp' };
    if (/tunisi|تونس/i.test(q)) return { kind: 'origin', origin: 'tn' };
    if (/recommand|conseil|quoi faire|meilleur|best|suggest|توصي|أفضل|انصح/i.test(q)) return { kind: 'best' };
    if (/\b(eau|water|irrigation)\b|ماء|مياه|سقي|\bالري\b/i.test(q) && !an.parcelTopics.filter(function (k) { return k !== 'water' && k !== 'et0' && k !== 'rain'; }).length) return { kind: 'water' };
    if (an.parcelTopics.length) return { kind: 'facts', an: an };
    if (an.hits.length && an.hits[0].score >= 2) return { kind: 'search', an: an };
    return { kind: 'unknown', an: an };
  }

  /* ---------------------------------------------------------- evidence helpers */
  var AR_VERDICT = { feasible: 'ممكنة', adapt: 'ممكنة مع التكييف', insufficient: 'أدلة غير كافية', rejected: 'غير موصى بها' };
  function verdictText(v, L) { return L === 'ar' ? AR_VERDICT[v] : t(v === 'feasible' ? 'verdict_ok' : v === 'adapt' ? 'verdict_adapt' : v === 'insufficient' ? 'verdict_unk' : 'verdict_no'); }
  function nameOf(r, L) { return L === 'ar' && r.name_ar ? r.name_ar : r.name; }
  function dataUsed(dna, paths) {
    var out = [], seen = {};
    paths.forEach(function (p) {
      var f = D.fieldAt(dna, p); if (!f || !f.source || seen[f.source]) return;
      seen[f.source] = 1; out.push({ label: f.source + (f.period ? ' (' + f.period + ')' : ''), url: f.url || null });
    });
    return out;
  }
  function confidence(dna, results, L) {
    var lowData = dna.quality.coreMissing.length > 0;
    var prov = results.some(function (r) { return r.provisional; });
    var draft = results.some(function (r) { return r.record.review.status !== 'validated'; });
    var level = lowData || prov ? 'low' : 'medium';
    var why = L === 'ar'
      ? [lowData ? 'بيانات أساسية ناقصة' : 'بيانات مناخية جهوية (إعادة تحليل)', prov ? 'عتبات مؤقتة' : null, draft ? 'بطاقة غير مصادق عليها' : null]
      : [lowData ? 'données essentielles manquantes' : 'climat issu de réanalyse régionale', prov ? 'seuils provisoires' : null, draft ? 'fiche non validée par un expert' : null];
    return { level: level, why: why.filter(Boolean).join(' · ') };
  }
  function missingFor(dna, results) {
    var paths = {};
    results.forEach(function (r) { r.unknown.forEach(function (x) { paths[x.cond.field] = 1; }); });
    return Object.keys(paths).map(function (p) { var f = D.fieldAt(dna, p); return p + (f && f.note ? ' — ' + f.note : ''); });
  }

  /* ---------------------------------------------------------- answer builders */
  function answer(intent, dna, L) {
    var all = E.evaluateAll(dna);
    var ar = L === 'ar';
    var get = function (id) { return all.filter(function (r) { return r.record.id === id; })[0]; };
    var a = { records: [], data: [], actions: [], missing: [], expl: [] };

    if (intent.kind === 'arabic') {
      return answer(lastIntent && lastIntent.kind !== 'arabic' ? lastIntent : { kind: 'best' }, dna, 'ar');
    }

    if (intent.kind === 'best' || intent.kind === 'origin') {
      var pool = all.filter(function (r) { return r.verdict !== 'rejected' && (!intent.origin || r.record.origin === intent.origin); });
      if (!pool.length) {
        a.title = ar ? 'لا توجد تقنية مناسبة' : 'Aucune technique retenue';
        a.reco = ar ? 'لم تُستوفَ شروط أي تقنية من هذا الأصل لهذه القطعة.' : "Aucune technique de cette origine ne remplit ses conditions obligatoires sur cette parcelle.";
        a.expl = all.filter(function (r) { return !intent.origin || r.record.origin === intent.origin; }).map(function (r) {
          return nameOf(r.record, L) + ' : ' + r.hardFails.map(E.describe).join(' ; ');
        });
        a.records = [];
      } else {
        var top = pool[0];
        a.title = intent.origin === 'jp' ? (ar ? 'تقنيات يابانية ممكنة هنا' : 'Techniques japonaises possibles ici') : (ar ? 'أفضل تقنية لهذه القطعة' : 'Technique la mieux adaptée');
        a.reco = nameOf(top.record, L) + ' — ' + verdictText(top.verdict, L) + (top.score !== null ? ' (' + fmt(top.score * 100) + ' %)' : '');
        a.expl = pool.map(function (r) {
          return nameOf(r.record, L) + ' : ' + verdictText(r.verdict, L) + (r.adaptation ? (ar ? ' — تكييف: ' : ' — adaptation : ') + r.adaptation.text : '');
        });
        a.records = pool.slice(0, 3).map(function (r) { return r.record; });
        a.actions = top.record.actions.slice();
      }
      a.results = intent.origin ? all.filter(function (r) { return r.record.origin === intent.origin; }) : all;
      a.data = dataUsed(dna, ['climate.rain_mm', 'terrain.slope_pct', 'water.source', 'crop']);
    }

    else if (intent.kind === 'record' || intent.kind === 'why') {
      var id = intent.rec || (intent.kind === 'why' ? (all.filter(function (r) { return r.verdict === 'rejected'; })[0] || {}).record && all.filter(function (r) { return r.verdict === 'rejected'; })[0].record.id : null);
      var r = id ? get(id) : null;
      if (!r) return insufficient(L);
      a.title = nameOf(r.record, L) + ' — ' + verdictText(r.verdict, L);
      a.records = [r.record];
      a.results = [r];
      if (r.verdict === 'rejected') {
        a.reco = ar ? 'لا يُنصح بهذه التقنية على هذه القطعة.' : 'Technique non recommandée sur cette parcelle.';
        a.expl = r.hardFails.map(function (x) { return E.describe(x) + ' — ' + x.cond.why; });
        var alt = all.filter(function (x) { return x.verdict !== 'rejected' && x.record.families.some(function (f) { return r.record.families.indexOf(f) !== -1; }); })[0];
        if (alt) { a.expl.push((ar ? 'بديل ممكن: ' : 'Alternative possible : ') + nameOf(alt.record, L) + ' (' + verdictText(alt.verdict, L) + ').'); a.actions = alt.record.actions.slice(); a.records.push(alt.record); }
      } else {
        a.reco = r.adaptation ? r.adaptation.text : (ar ? 'ممكنة كما هي.' : 'Faisable telle quelle.');
        a.expl = r.checks.filter(function (x) { return x.result === 'pass'; }).map(E.describe);
        if (r.provisional) a.expl.push(ar ? 'تحتوي البطاقة على عتبة مؤقتة.' : 'La fiche contient au moins un seuil provisoire.');
        a.actions = r.record.actions.slice();
      }
      if (id === 'jp-solar-sharing') {
        var ghi = D.value(dna, 'solar.ghi_kwh');
        a.expl.push((ar ? 'الإشعاع الشمسي السنوي: ' : 'Rayonnement annuel moyen : ') + (ghi === null ? (ar ? 'غير متاح' : 'indisponible') : fmt(ghi, 2) + ' kWh/m²/j') + '.');
        a.expl.push(ar ? 'بلا حصة ماء، يشجع الضخ الشمسي على الإفراط في الضخ.' : 'Sans quota d’eau, le pompage solaire encourage le surpompage : voir Eau & énergie.');
        a.data = dataUsed(dna, ['solar.ghi_kwh', 'energy.pump']);
      } else {
        a.data = dataUsed(dna, r.checks.map(function (x) { return x.cond.field; }));
      }
    }

    else if (intent.kind === 'water') {
      var rain = D.value(dna, 'climate.rain_mm'), et0 = D.value(dna, 'climate.et0_mm'), src = D.value(dna, 'water.source');
      a.title = ar ? 'قيود الماء' : 'Contraintes en eau';
      if (rain === null || et0 === null) { a.reco = ar ? 'تعذّر حساب العجز المائي: البيانات المناخية غير متاحة.' : "Déficit non calculable : données climatiques indisponibles."; }
      else {
        var deficit = et0 - rain;
        a.reco = (ar ? 'الطلب المناخي يفوق الأمطار بـ ' : 'La demande climatique dépasse la pluie de ') + fmt(deficit) + ' mm/an' + (ar ? ' تقريباً.' : ' environ.');
        a.expl.push((ar ? 'الأمطار: ' : 'Pluie : ') + fmt(rain) + ' mm/an ; ET0 : ' + fmt(et0) + ' mm/an.');
        a.expl.push(ar ? 'ET0 هو تبخر مرجعي؛ حاجة الشجرة الفعلية تُحسب بمعامل الزراعة في صفحة الماء والطاقة.' : "ET0 est une référence : le besoin réel de la culture se calcule avec son coefficient Kc (page Eau & énergie).");
      }
      a.expl.push((ar ? 'مصدر الماء: ' : "Source d'eau : ") + (src ? E.valueLabel(src) : (ar ? 'غير مصرّح به' : 'non renseignée')) + '.');
      a.expl.push(ar ? 'في تونس يأتي جزء كبير من مياه الري من المائدة المائية؛ أي ضخ إضافي يجب أن يبقى ضمن حصة.' : "En Tunisie, l'irrigation dépend largement des nappes : tout pompage supplémentaire doit rester dans un quota.");
      a.records = ['tn-jessour', 'tn-meskat', 'x-mulch'].map(KB.get);
      a.actions = ar ? ['احسب الحاجة الشهرية في صفحة الماء والطاقة.', 'حدّد حصة ضخ شهرية.', 'قلّل التبخر بالتغطية.'] : ['Calculer le besoin mensuel dans Eau & énergie.', 'Fixer un quota de pompage mensuel.', "Réduire l'évaporation par le paillage."];
      a.data = dataUsed(dna, ['climate.rain_mm', 'climate.et0_mm', 'water.source']);
      a.results = all.filter(function (r) { return ['tn-jessour', 'tn-meskat', 'x-mulch'].indexOf(r.record.id) !== -1; });
    }

    else if (intent.kind === 'missing') {
      a.title = ar ? 'المعلومات الناقصة' : 'Informations manquantes';
      var m = dna.quality.missing;
      a.reco = m.length ? (ar ? m.length + ' حقول ناقصة. الأهم: ' : m.length + ' champs manquants. Les plus importants : ') + (dna.quality.coreMissing.join(', ') || (ar ? 'لا شيء أساسي' : 'aucun champ essentiel')) : t('none_missing');
      a.expl = m.map(function (p) { var f = D.fieldAt(dna, p); return p + (f && f.note ? ' — ' + f.note : ''); });
      a.actions = ar ? ['أكمل الحقول في صفحة ذكاء الأرض.', 'اطلب من مهندس فلاحي قياس التربة.', 'أعد بناء الملف.'] : ['Compléter les champs dans Land Intelligence.', 'Faire mesurer le sol (texture, profondeur) par un technicien.', 'Reconstruire le profil.'];
      a.results = [];
    }

    else if (intent.kind === 'facet') {
      var ids = intent.rec ? [intent.rec] : intent.an.hits.filter(function (h) { return h.score >= 1.5; }).slice(0, 3).map(function (h) { return h.id; });
      if (!ids.length) ids = all.filter(function (r) { return r.verdict === 'feasible' || r.verdict === 'adapt'; }).slice(0, 3).map(function (r) { return r.record.id; });
      if (!ids.length) return insufficient(L);
      var FACET_KEY = { cost: 'cost', risk: 'risks', materials: 'materials', actors: 'actors', regulation: 'regulation' };
      var FACET_LABEL = ar ? { cost: 'التكلفة', risk: 'المخاطر', materials: 'المواد', actors: 'الفاعلون', regulation: 'التنظيمات', actions: 'الخطوات', sources: 'المصادر' }
        : { cost: 'Coût', risk: 'Risques', materials: 'Matériaux', actors: 'Acteurs et appuis', regulation: 'Réglementation', actions: 'Étapes', sources: 'Sources' };
      var facetText = function (rec, f) {
        if (f === 'actions') return (rec.actions || []).join(' ; ');
        if (f === 'sources') return rec.sources.map(function (x) { return x.label + (x.verified ? '' : (ar ? ' (رابط للتحقق)' : ' (lien à vérifier)')); }).join(' ; ');
        return rec[FACET_KEY[f]] || '';
      };
      var fs = intent.facets;
      var rs = ids.map(get).filter(Boolean);
      a.title = fs.map(function (f) { return FACET_LABEL[f]; }).join(' · ') + ' — ' + rs.map(function (r) { return nameOf(r.record, L); }).join(', ');
      a.reco = facetText(rs[0].record, fs[0]) || (ar ? 'البطاقة لا تذكر هذه المعلومة.' : 'La fiche ne donne pas cette information.');
      rs.forEach(function (r, i) {
        fs.forEach(function (f, j) {
          if (i === 0 && j === 0) return;
          a.expl.push(nameOf(r.record, L) + ' — ' + FACET_LABEL[f] + ' : ' + (facetText(r.record, f) || (ar ? 'غير مذكور في البطاقة' : 'non précisé dans la fiche')));
        });
        a.expl.push(nameOf(r.record, L) + ' — ' + (ar ? 'لهذه القطعة: ' : 'pour cette parcelle : ') + verdictText(r.verdict, L) + '.');
      });
      a.records = rs.map(function (r) { return r.record; });
      a.results = rs;
      a.actions = fs.indexOf('actions') !== -1 ? [] : rs[0].record.actions.slice();
      a.data = dataUsed(dna, rs[0].checks.map(function (x) { return x.cond.field; }));
    }

    else if (intent.kind === 'facts') {
      var FL = ar ? { 'soil.texture': 'قوام التربة', 'soil.clay_pct': 'الطين 0–30 سم', 'soil.soc': 'الكربون العضوي', 'climate.rain_mm': 'الأمطار السنوية', 'climate.tmax_hot': 'أقصى حرارة صيفية', 'climate.tmin_cold': 'أدنى حرارة شتوية', 'climate.et0_mm': 'التبخر النتحي المرجعي', 'terrain.slope_pct': 'الانحدار', 'terrain.elev_m': 'الارتفاع', 'terrain.aspect_deg': 'الاتجاه', 'solar.ghi_kwh': 'الإشعاع الشمسي', 'energy.pump': 'الضخ', 'water.source': 'مصدر الماء', 'water.well_depth_m': 'عمق البئر', 'crop': 'الزراعة', 'area_ha': 'المساحة' }
        : { 'soil.texture': 'Texture du sol', 'soil.clay_pct': 'Argile 0–30 cm', 'soil.soc': 'Carbone organique', 'climate.rain_mm': 'Pluie annuelle', 'climate.tmax_hot': 'Max. du mois le plus chaud', 'climate.tmin_cold': 'Min. du mois le plus froid', 'climate.et0_mm': 'Évapotranspiration de référence', 'terrain.slope_pct': 'Pente', 'terrain.elev_m': 'Altitude', 'terrain.aspect_deg': 'Orientation', 'solar.ghi_kwh': 'Rayonnement solaire', 'energy.pump': 'Pompage', 'water.source': "Source d'eau", 'water.well_depth_m': 'Profondeur du puits', 'crop': 'Culture', 'area_ha': 'Surface' };
      var TX = ar ? { sandy: 'رملية', loamy: 'طميية', clayey: 'طينية' } : { sandy: 'sableux', loamy: 'limoneux', clayey: 'argileux' };
      var show = function (p) {
        var f = D.fieldAt(dna, p);
        if (!f || f.status !== 'ok' || f.value === null) return { p: p, ok: false, text: FL[p] + ' : ' + (ar ? 'غير متاح' : 'indisponible') + (f && f.note ? ' — ' + f.note : '') };
        var v = f.value;
        var txt = typeof v === 'number' ? fmt(v, p === 'terrain.slope_pct' || p === 'solar.ghi_kwh' ? (p === 'solar.ghi_kwh' ? 2 : 1) : 0) + (f.unit ? ' ' + f.unit : '')
          : Array.isArray(v) ? v.join(', ') : (TX[v] || E.valueLabel(v));
        return { p: p, ok: true, text: FL[p] + ' : ' + txt + ' (' + f.source + (f.confidence ? ', ' + (ar ? 'ثقة ' : 'confiance ') + t('conf_' + f.confidence) : '') + ')' };
      };
      var rows = intent.an.fields.map(show);
      var okRows = rows.filter(function (x) { return x.ok; });
      a.title = ar ? 'ما تقوله بيانات قطعتك' : 'Ce que disent les données de votre parcelle';
      a.reco = okRows.length ? okRows[0].text : rows[0].text;
      a.expl = rows.slice(1).map(function (x) { return x.text; });
      var lowSoil = intent.an.fields.some(function (p) { var f = D.fieldAt(dna, p); return p.indexOf('soil.') === 0 && f && f.confidence === 'low'; });
      if (lowSoil) a.expl.push(ar ? 'قيم التربة جهوية تقريبية وليست قياساً للقطعة: يُنصح بتحليل التربة.' : "Les valeurs de sol sont régionales et approximatives, pas une mesure de la parcelle : une analyse de sol est conseillée.");
      var fam = intent.an.families;
      var rel = all.filter(function (r) { return r.verdict !== 'rejected' && (!fam.length || r.record.families.some(function (f) { return fam.indexOf(f) !== -1; })); }).slice(0, 3);
      if (rel.length) a.expl.push((ar ? 'تقنيات ذات صلة ممكنة هنا: ' : 'Techniques liées possibles ici : ') + rel.map(function (r) { return nameOf(r.record, L) + ' (' + verdictText(r.verdict, L) + ')'; }).join(', ') + '.');
      a.records = rel.map(function (r) { return r.record; });
      a.results = rel;
      a.actions = rel.length ? rel[0].record.actions.slice() : [];
      a.data = dataUsed(dna, intent.an.fields);
      a.missing = rows.filter(function (x) { return !x.ok; }).map(function (x) { return x.p; });
    }

    else if (intent.kind === 'search') {
      var top3 = intent.an.hits.filter(function (h, i) { return h.score >= 2 || i === 0; }).slice(0, 3).map(function (h) { return get(h.id); }).filter(Boolean);
      a.title = ar ? 'ما تقوله البطاقات' : 'Ce que disent les fiches';
      a.reco = nameOf(top3[0].record, L) + ' — ' + top3[0].record.summary;
      a.expl = top3.map(function (r) { return nameOf(r.record, L) + ' : ' + verdictText(r.verdict, L) + (ar ? ' لهذه القطعة' : ' pour cette parcelle') + (r.adaptation ? ' — ' + r.adaptation.text : '') + '.'; });
      top3.slice(1).forEach(function (r) { a.expl.push(nameOf(r.record, L) + ' — ' + r.record.summary); });
      a.records = top3.map(function (r) { return r.record; });
      a.results = top3;
      a.actions = top3[0].record.actions.slice();
      a.data = dataUsed(dna, top3[0].checks.map(function (x) { return x.cond.field; }));
    }

    else return insufficient(L);

    var res = a.results || [];
    a.conf = confidence(dna, res.length ? res : all, L);
    a.missing = (a.missing && a.missing.length ? a.missing.map(function (p) { var f = D.fieldAt(dna, p); return p + (f && f.note ? ' — ' + f.note : ''); }) : []).concat(missingFor(dna, res)).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    a.lang = L;
    return a;
  }
  function insufficient(L) {
    var ar = L === 'ar';
    return { title: ar ? 'أدلة غير كافية' : 'Preuves insuffisantes', reco: ar ? 'لا أستطيع الإجابة دون اختلاق.' : 'GAIA ne peut pas répondre sans inventer.',
      expl: [ar ? 'لا توجد بطاقة ولا بيانات تخص هذا السؤال. يمكنك السؤال عن: التربة، الأمطار، الانحدار، الشمس، الضخ، تكلفة أو مخاطر تقنية (الجسور، الطابية، المسقاة، الواحة…).' : "Aucune fiche ni donnée de la parcelle ne couvre cette question. GAIA sait répondre sur : le sol, la pluie, la pente, le soleil, le pompage, la surface, et le coût, les risques, les acteurs ou les étapes d'une technique (jessour, tabia, meskat, oasis, citerne, paillage, tanada, solar sharing…)."],
      records: [], data: [], actions: [], missing: [], conf: { level: 'low', why: ar ? 'لا توجد أدلة' : 'aucune preuve' }, lang: L, insufficient: true };
  }

  /* ---------------------------------------------------------- render */
  function sec(title, body) { return el('div', { class: 'sec' }, [el('h4', null, [title])].concat(body)); }
  function renderAnswer(a) {
    var L = a.lang, T = function (k) { var prev = G.lang(); return L === 'ar' ? ({ s_reco: 'التوصية', s_expl: 'الشرح', s_rec: 'البطاقة التقنية', s_data: 'البيانات المستعملة', s_conf: 'درجة الثقة', s_miss: 'معلومات ناقصة', s_act: 'الخطوات' })[k] : ({ s_reco: 'Recommandation', s_expl: 'Explication', s_rec: 'Fiche technique', s_data: 'Données utilisées', s_conf: 'Confiance', s_miss: 'Informations manquantes', s_act: 'Actions' })[k]; };
    var box = el('article', { class: 'ans', dir: L === 'ar' ? 'rtl' : 'ltr', lang: L }, [
      el('h3', null, [a.title]),
      sec(T('s_reco'), [el('p', { class: 'reco' }, [a.reco])]),
      a.expl.length ? sec(T('s_expl'), [el('ul', null, a.expl.map(function (x) { return el('li', null, [x]); }))]) : null,
      a.records.length ? sec(T('s_rec'), [el('ul', null, a.records.filter(Boolean).map(function (r) {
        return el('li', null, [el('a', { href: 'library.html#' + r.id }, [nameOf(r, L)]), ' — ', r.sources.map(function (s) { return s.label; }).join(' ; ')]);
      }))]) : null,
      a.data.length ? sec(T('s_data'), [el('ul', null, a.data.map(function (d) { return el('li', null, [d.url ? el('a', { href: d.url, target: '_blank', rel: 'noopener' }, [d.label]) : d.label]); }))]) : null,
      sec(T('s_conf'), [el('p', null, [G.confBadge(a.conf.level), ' ', a.conf.why])]),
      a.missing.length ? sec(T('s_miss'), [el('ul', null, a.missing.map(function (m) { return el('li', null, [m]); }))]) : null,
      a.actions.length ? sec(T('s_act'), [el('ol', null, a.actions.map(function (x) { return el('li', null, [x]); }))]) : null,
      L === 'ar' && a.records.length ? el('p', { class: 'small muted', style: 'margin-top:10px' }, ['تفاصيل البطاقات مكتوبة بالفرنسية؛ الترجمة الكاملة في انتظار المصادقة.']) : null
    ]);
    return box;
  }

  /* ---------------------------------------------------------- optional LLM */
  function withLLM(q, a, dna, holder) {
    var ep = G.CONFIG.assistantEndpoint; if (!ep) return;
    var prof = {};
    D.walk(dna).forEach(function (x) { if (x.f && x.f.status === 'ok' && x.f.value !== null && typeof x.f.value !== 'object') prof[x.path] = { value: x.f.value, unit: x.f.unit || null, source: x.f.source || null, confidence: x.f.confidence || null }; });
    var recs = a.records.length ? a.records : KB.records; // nothing retrieved: let the model look at every record, and say so if none applies
    var verdicts = E.evaluateAll(dna).map(function (r) { return { id: r.record.id, verdict: r.verdict, score: r.score }; });
    var payload = { question: q, lang: R.lang(q) === 'en' ? 'en' : a.lang, answer: { title: a.title, reco: a.reco, expl: a.expl, actions: a.actions, missing: a.missing, insufficient: !!a.insufficient }, profile: prof, verdicts: verdicts, records: recs };
    var wait = el('p', { class: 'small muted', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' …']);
    holder.appendChild(wait);
    fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (res) {
        wait.remove();
        var text = String(res.text || '');
        if (!text) { holder.appendChild(G.note('info', t('llm_err'))); return; }
        var evidence = JSON.stringify(payload);
        var nums = text.match(/\d+(?:[.,]\d+)?/g) || [];
        var bad = nums.filter(function (n) { return evidence.indexOf(n.replace(',', '.')) === -1 && evidence.indexOf(n) === -1; });
        holder.appendChild(bad.length ? G.note('err', t('llm_block')) : el('div', { class: 'sec' }, [el('h4', null, [t('s_llm')]), el('p', null, [text])]));
      })
      .catch(function () { wait.remove(); holder.appendChild(G.note('info', t('llm_err'))); });
  }

  /* ---------------------------------------------------------- page */
  function ask(q) {
    var p = G.getParcel(); if (!p || !p.dna) return;
    var intent = detect(q);
    var L = intent.kind === 'arabic' || R.lang(q) === 'ar' ? 'ar' : G.lang();
    var a = answer(intent, p.dna, L);
    if (intent.kind !== 'arabic') lastIntent = intent;
    var threadBox = document.getElementById('thread');
    threadBox.appendChild(el('div', { class: 'q' }, [q]));
    var card = renderAnswer(a);
    threadBox.appendChild(card);
    withLLM(q, a, p.dna, card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render() {
    var p = G.getParcel();
    if (!p || !p.dna) { G.needParcel(app); return; }
    var dna = p.dna, V = function (k) { return D.value(dna, k); };
    G.clear(app);
    var ctx = el('aside', { class: 'ctx' }, [
      el('div', { class: 'gp-card' }, [
        el('p', { class: 'eyebrow' }, [t('ctx')]),
        el('p', { style: 'font-weight:600;margin-top:4px' }, [p.name || (fmt(p.lat, 4) + ', ' + fmt(p.lon, 4))]),
        el('div', { class: 'kvs' }, [
          el('div', null, [t('k_rain'), el('b', null, [V('climate.rain_mm') === null ? '—' : fmt(V('climate.rain_mm')) + ' mm/an'])]),
          el('div', null, [t('k_slope'), el('b', null, [V('terrain.slope_pct') === null ? '—' : fmt(V('terrain.slope_pct'), 1) + ' %'])]),
          el('div', null, [t('k_water'), el('b', null, [V('water.source') ? E.valueLabel(V('water.source')) : '—'])]),
          el('div', null, [t('k_crop'), el('b', null, [V('crop') ? E.valueLabel(V('crop')) : '—'])]),
          el('div', null, [t('k_ghi'), el('b', null, [V('solar.ghi_kwh') === null ? '—' : fmt(V('solar.ghi_kwh'), 2) + ' kWh/m²/j'])])
        ]),
        el('a', { class: 'small', href: 'land.html', style: 'display:inline-block;margin-top:10px' }, [t('nav_land') + ' →'])
      ]),
      el('div', { class: 'gp-card' }, [el('p', { class: 'eyebrow' }, [t('ask')]),
        el('div', { class: 'qs', style: 'margin-top:8px' }, ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].map(function (k) {
          return el('button', { type: 'button', onclick: function () { ask(t(k)); } }, [t(k)]);
        }))])
    ]);
    var main = el('section', { 'aria-label': 'Conversation' }, [
      el('div', { id: 'thread', class: 'thread', 'aria-live': 'polite' }),
      el('div', { class: 'composer' }, [
        el('form', { onsubmit: function (e) { e.preventDefault(); var i = document.getElementById('qin'); var v = i.value.trim(); if (v) { ask(v); i.value = ''; } } }, [
          el('label', { for: 'qin', class: 'sr' }, [t('ph')]),
          el('input', { id: 'qin', type: 'text', placeholder: t('ph'), autocomplete: 'off' }),
          el('button', { class: 'gp-btn primary', type: 'submit' }, [t('send')])
        ]),
        el('p', { class: 'mode' }, [G.pill(G.CONFIG.assistantEndpoint ? 'live' : 'plan', G.CONFIG.assistantEndpoint ? 'LLM' : 'LLM —'), G.CONFIG.assistantEndpoint ? t('mode_llm') : t('mode_rules')])
      ])
    ]);
    app.appendChild(el('div', { class: 'lab' }, [ctx, main]));
  }

  render();
  G.onLang(render);
}());
