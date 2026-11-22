/* ==========================================================================
   GAIA Farm Agent — the loop and the page.

   The farmer states a goal. The agent plans, calls GAIA's own tools
   (agent-tools.js), reads the results, and writes a dated action plan.

   Three ways to think, best first:
     1. a language model with native tool calling, through the GAIA server
        (POST /agent/step: Claude, Groq, OpenRouter, Ollama...). The model
        decides which tools to call and when to stop.
     2. GAIA's planner runs the tools, then the free in-browser model
        (Qwen2.5 1.5B, WebLLM) writes the plan from the results.
     3. GAIA's planner alone: offline, deterministic, every line traced to a
        tool result. Always available.
   Each tool call is shown live with its arguments, result and timing.
   ========================================================================== */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, T = window.GAIA_AGENT_TOOLS, LLM = window.GAIA_LLM;

  G.addStrings({
    fr: {
      ag_title: 'Agent agricole', ag_lead: "Donnez un objectif. L'agent planifie, appelle les outils de GAIA (Land DNA, eau, nappe, Solar Brain, météo, risques de maladie, santé des plantes) et vous rend un plan d'action daté, chaque ligne reliée à la mesure qui la justifie.",
      ag_goal: 'Votre objectif', ag_ph: 'Ex. : Préparer mes 3 ha d\'oliviers près de Kairouan pour l\'été, puits de 60 m', ag_go: 'Lancer l\'agent', ag_stop: 'Arrêter',
      ag_ex: 'Exemples', ag_trace: 'Raisonnement et outils', ag_plan: 'Plan d\'action', ag_mode: 'Cerveau', ag_running: 'en cours…', ag_done: 'terminé', ag_err: 'erreur',
      ag_m_server: 'modèle de langage avec appel d\'outils', ag_m_browser: 'planificateur GAIA + modèle gratuit dans le navigateur', ag_m_planner: 'planificateur GAIA (hors ligne, sans clé)',
      ag_no_plot: "Aucune parcelle enregistrée : l'agent utilise une parcelle de démonstration (oliviers, Sidi Bouzid, 2 ha, puits de 50 m). Nommez votre ville dans l'objectif pour utiliser la vôtre.",
      ag_ics: 'Ajouter au calendrier (.ics)', ag_copy: 'Copier le plan', ag_copied: 'Copié', ag_raw: 'résultat brut', ag_think: 'Pensée',
      ag_fallback: 'Le modèle de langage ne répond pas : le planificateur GAIA prend le relais.', ag_turn_on: 'Activer le modèle gratuit du navigateur',
      ag_honest: 'Chaque chiffre vient d\'un outil. Les règles de risque de maladie sont indicatives : confirmez sur le terrain avant tout traitement.',
      ag_steps: 'étapes', ag_tools: 'appels d\'outils', ag_ms: 'ms'
    },
    ar: {
      ag_title: 'الوكيل الفلاحي', ag_lead: 'حدّد هدفاً. يخطط الوكيل ويستدعي أدوات غايا (حمض الأرض، الماء، المائدة المائية، العقل الشمسي، الطقس، أخطار الأمراض، صحة النبات) ويعطيك خطة عمل مؤرخة، كل سطر فيها مربوط بالقياس الذي يبرره.',
      ag_goal: 'هدفك', ag_ph: 'مثال: جهّز 3 هكتارات زيتون قرب القيروان للصيف، بئر 60 م', ag_go: 'شغّل الوكيل', ag_stop: 'أوقف',
      ag_ex: 'أمثلة', ag_trace: 'التفكير والأدوات', ag_plan: 'خطة العمل', ag_mode: 'العقل', ag_running: 'جارٍ…', ag_done: 'تم', ag_err: 'خطأ',
      ag_m_server: 'نموذج لغوي يستدعي الأدوات', ag_m_browser: 'مخطط غايا + نموذج مجاني في المتصفح', ag_m_planner: 'مخطط غايا (دون اتصال، دون مفتاح)',
      ag_no_plot: 'لا توجد قطعة محفوظة: يستعمل الوكيل قطعة تجريبية (زيتون، سيدي بوزيد، 2 هكتار، بئر 50 م). اذكر مدينتك في الهدف لاستعمال قطعتك.',
      ag_ics: 'أضف إلى الرزنامة (.ics)', ag_copy: 'انسخ الخطة', ag_copied: 'تم النسخ', ag_raw: 'النتيجة الخام', ag_think: 'تفكير',
      ag_fallback: 'النموذج اللغوي لا يجيب: يتولى مخطط غايا المهمة.', ag_turn_on: 'شغّل النموذج المجاني في المتصفح',
      ag_honest: 'كل رقم يأتي من أداة. قواعد خطر الأمراض تقريبية: تحقّق في الحقل قبل أي معالجة.',
      ag_steps: 'خطوات', ag_tools: 'استدعاءات أدوات', ag_ms: 'مللي ثانية'
    },
    en: {
      ag_title: 'Farm Agent', ag_lead: 'Give it a goal. The agent plans, calls GAIA\'s own tools (Land DNA, water, groundwater, Solar Brain, weather, disease risk, plant health) and returns a dated action plan, each line linked to the measurement behind it.',
      ag_goal: 'Your goal', ag_ph: 'E.g. Get my 3 ha of olives near Kairouan ready for summer, 60 m well', ag_go: 'Run the agent', ag_stop: 'Stop',
      ag_ex: 'Examples', ag_trace: 'Reasoning and tools', ag_plan: 'Action plan', ag_mode: 'Brain', ag_running: 'running…', ag_done: 'done', ag_err: 'error',
      ag_m_server: 'language model with tool calling', ag_m_browser: 'GAIA planner + free in-browser model', ag_m_planner: 'GAIA planner (offline, no key)',
      ag_no_plot: 'No saved plot: the agent uses a demo plot (olives, Sidi Bouzid, 2 ha, 50 m well). Name your town in the goal to use yours.',
      ag_ics: 'Add to calendar (.ics)', ag_copy: 'Copy the plan', ag_copied: 'Copied', ag_raw: 'raw result', ag_think: 'Thought',
      ag_fallback: 'The language model does not answer: GAIA\'s planner takes over.', ag_turn_on: 'Turn on the free in-browser model',
      ag_honest: 'Every number comes from a tool. Disease-risk rules are indicative: confirm in the field before any treatment.',
      ag_steps: 'steps', ag_tools: 'tool calls', ag_ms: 'ms'
    },
    ja: {
      ag_title: '農場エージェント', ag_lead: '目標を伝えてください。エージェントが計画を立て、GAIAのツール（ランドDNA、水、地下水、ソーラーブレイン、天気、病害リスク、植物の健康）を呼び出し、日付つきの行動計画を返します。各行は根拠となる測定に結びついています。',
      ag_goal: 'あなたの目標', ag_ph: '例：カイルアン近くのオリーブ3haを夏に備えたい、井戸60m', ag_go: 'エージェントを実行', ag_stop: '停止',
      ag_ex: '例', ag_trace: '推論とツール', ag_plan: '行動計画', ag_mode: '頭脳', ag_running: '実行中…', ag_done: '完了', ag_err: 'エラー',
      ag_m_server: 'ツール呼び出し対応の言語モデル', ag_m_browser: 'GAIAプランナー＋ブラウザ内の無料モデル', ag_m_planner: 'GAIAプランナー（オフライン・キー不要）',
      ag_no_plot: '保存された区画がありません。デモ区画（オリーブ、シディ・ブジッド、2ha、井戸50m）を使います。目標に町の名前を書くと、その場所を使います。',
      ag_ics: 'カレンダーに追加（.ics）', ag_copy: '計画をコピー', ag_copied: 'コピーしました', ag_raw: '生データ', ag_think: '思考',
      ag_fallback: '言語モデルが応答しません。GAIAプランナーが引き継ぎます。', ag_turn_on: 'ブラウザ内の無料モデルを有効にする',
      ag_honest: 'すべての数値はツールから得たものです。病害リスクのルールは目安です。処置の前に圃場で確認してください。',
      ag_steps: 'ステップ', ag_tools: 'ツール呼び出し', ag_ms: 'ms'
    }
  });
  var t = G.t;
  function L() { return G.lang(); }
  function W(o) { var l = L(); return o[l] !== undefined ? o[l] : o.en; }

  var EXAMPLES = {
    fr: ["Préparer mes oliviers pour l'été : eau, chaleur, maladies", "J'ai 3 ha d'oliviers près de Kairouan, puits de 60 m. Plan pour les 2 prochaines semaines", "Je veux installer des panneaux solaires au-dessus de tomates à Gabès sans perdre ma récolte", "Mon pompage solaire épuise-t-il la nappe ?", "Un kit solaire pay-as-you-go est-il rentable ? Kit 30 000 TND, gazole 7 000 TND/an"],
    ar: ['جهّز زيتوني للصيف: الماء، الحرارة، الأمراض', 'عندي 3 هكتارات زيتون قرب القيروان، بئر 60 م. خطة للأسبوعين القادمين', 'أريد تركيب ألواح شمسية فوق الطماطم في قابس دون خسارة المحصول', 'هل يستنزف الضخ الشمسي المائدة المائية؟', 'هل منظومة شمسية بالأقساط مربحة؟ منظومة 30000 د.ت، غازوال 7000 د.ت في السنة'],
    en: ['Get my olives ready for summer: water, heat, diseases', 'I have 3 ha of olives near Kairouan, 60 m well. Plan for the next 2 weeks', 'I want solar panels over tomatoes in Gabes without losing my harvest', 'Is my solar pumping draining the aquifer?', 'Is a pay-as-you-go solar kit profitable? Kit 30,000 TND, diesel 7,000 TND/year'],
    ja: ['オリーブを夏に備えたい：水・暑さ・病気', 'カイルアン近くにオリーブ3ha、井戸60m。今後2週間の計画', 'ガベスでトマトの上に太陽光パネルを設置したいが収穫は減らしたくない', '太陽光ポンプで地下水を使いすぎていない？', '従量課金の太陽光キットは採算が合う？キット 30000 TND、軽油 7000 TND/年']
  };

  /* ------------------------------------------------------------------ state */
  var S = { running: false, stop: false, steps: [], plan: null, mode: null, goal: '', started: 0, provider: null, note: null };

  /* ------------------------------------------------------------------ goal parsing (planner) */
  function parseGoal(g) {
    var f = g.toLowerCase(), o = { text: g };
    o.place = T.placeIn(g);
    o.crop = T.cropKey(g);
    var m = f.match(/(\d+(?:[.,]\d+)?)\s*(?:ha\b|hect|هكتار|ヘクタール)/); if (m) o.area = +m[1].replace(',', '.');
    m = f.match(/(?:puits|forage|well|بئر|井戸)[^\d]{0,15}(\d{1,3})\s*(?:m|م)|(\d{1,3})\s*(?:m|م)(?:\s*(?:de\s*)?(?:puits|well|deep|profond)|\s*بئر)/); if (m) o.well = +(m[1] || m[2]);
    // "rentable", "possible"... contain "ble" (wheat) and any other sentence falls into "other": keep only a real crop word
    o.bizCrop = T.cropKey(f.replace(/[a-z]+ble[a-z]*/g, ' ').replace(/\bdat(?:e|a)\b/g, ' ')); if (o.bizCrop === 'other') o.bizCrop = null;
    o.solar = /solai|solar|panneau|panel|شمس|ألواح|ソーラー|太陽|agrivolt|photovolt/.test(f);
    o.nappe = /nappe|aquif|groundwater|over.?pump|épuis|المائدة|استنزاف|地下水/.test(f);
    if (o.solar && !o.crop && /tomat|طماطم|トマト/.test(f)) o.crop = 'tomato';
    // money questions: pay-as-you-go kit, installments, cooperative, profitability
    o.biz = /pay.?as|payg|mensualit|paiement|payer|financ|cr[ée]dit|rentab|mod[eè]le [ée]conom|business|co[uû]t|\bcosts?\b|\bprices?\b|prix|tnd|dinar|\bdt\b|investi|coop|amorti|retour sur|roi\b|budget|argent|money|install?ment|loan|profit|قسط|أقساط|تمويل|ربح|كلفة|سعر|دينار|تعاونية|コスト|分割|ビジネス|費用|価格|採算|組合/.test(f);
    function amt(re) {
      var x = f.match(re); if (!x) return null;
      var s = x[1], v = /^\d{1,3}(?:[\s.,]\d{3})+$/.test(s) ? +s.replace(/\D/g, '') : +s.replace(/\s/g, '').replace(',', '.');
      return v > 0 ? v : null;
    }
    var NUM = '(\\d{1,3}(?:[\\s.,]\\d{3})+|\\d+(?:[.,]\\d+)?)';
    o.kit = amt(new RegExp('(?:kit|منظومة|キット)[^\\d]{0,20}' + NUM + '\\s*(?:tnd|dt|dinar|د)'));
    o.diesel_year = amt(new RegExp('(?:gazole|gasoil|diesel|غازوال|軽油)[^\\d]{0,25}' + NUM + '\\s*(?:tnd|dt|dinar|د)[^\\d]{0,12}?(?:an\\b|year|yr|سن|年)'));
    o.diesel_l = amt(new RegExp(NUM + '\\s*(?:tnd|dt|dinar|د)[^\\d]{0,6}(?:/|le|per|par|للتر)\\s*(?:l\\b|litre|liter|لتر|ℓ)'));
    m = f.match(/(\d{1,2})\s*(?:mois|months?|شهر|か月|ヶ月)/); if (m) o.term = +m[1];
    return o;
  }

  /* ------------------------------------------------------------------ running a tool, with its trace */
  function call(name, args, why) {
    var step = { kind: 'tool', name: name, args: args || {}, status: 'running', t0: performance.now(), why: why || null };
    S.steps.push(step); draw();
    return T.run(name, args).then(function (res) {
      step.ms = Math.round(performance.now() - step.t0);
      if (res && res.error) { step.status = 'error'; step.error = res.error; step.result = res; }
      else { step.status = 'done'; step.result = res; }
      draw();
      return res;
    });
  }
  function thought(text) { if (text && text.trim()) { S.steps.push({ kind: 'thought', text: text.trim() }); draw(); } }

  /* ------------------------------------------------------------------ 1. planner (offline) */
  function planner(goal) {
    var P = parseGoal(goal), have = G.getParcel(), res = {};
    var chain = Promise.resolve();
    var newPlace = P.place && (!have || Math.abs(have.lat - P.place.lat) > 0.05 || Math.abs(have.lon - P.place.lon) > 0.05);
    if (newPlace || !have) {
      var demo = !P.place;
      if (demo) S.note = t('ag_no_plot');
      var place = P.place ? P.place.name : 'Sidi Bouzid';
      chain = chain.then(function () { return call('find_place', { name: place }, W({ fr: 'Localiser la parcelle', en: 'Locate the plot', ar: 'تحديد موقع القطعة', ja: '区画の位置を特定' })); })
        .then(function (r) {
          if (r.error) throw new Error(r.error);
          var a = { lat: r.data.lat, lon: r.data.lon, name: r.data.name + (demo ? ' (démo)' : ''), crop: P.crop ? (['tomato', 'potato', 'pepper'].indexOf(P.crop) !== -1 ? 'veg' : P.crop) : (demo ? 'olive' : null),
            area_ha: P.area || (demo ? 2 : undefined), water: P.well || demo ? 'well' : undefined, well_depth_m: P.well || (demo ? 50 : undefined), pump: P.solar ? 'solar' : (demo ? 'diesel' : undefined) };
          return call('build_land_dna', a, W({ fr: 'Construire le Land DNA à partir des données ouvertes', en: 'Build the Land DNA from open data', ar: 'بناء حمض الأرض من البيانات المفتوحة', ja: 'オープンデータからランドDNAを作成' }));
        });
    }
    function step(name, args, why) { chain = chain.then(function () { if (S.stop) return; return call(name, args, why).then(function (r) { res[name] = r; }); }); }
    step('plot_profile', {}, W({ fr: 'Lire le profil de la parcelle', en: 'Read the plot profile', ar: 'قراءة ملف القطعة', ja: '区画プロファイルを読む' }));
    if (P.biz) {
      // a money question: measure the water and energy first, then price the kit from them
      P.crop = P.bizCrop;
      var ba = {};
      if (P.crop) ba.crop = P.crop;
      if (P.kit) ba.kit_tnd = P.kit;
      if (P.diesel_year) ba.diesel_tnd_year = P.diesel_year;
      if (P.diesel_l) ba.diesel_tnd_l = P.diesel_l;
      if (P.term) ba.term_months = P.term;
      step('water_need', P.crop ? { crop: P.crop } : {}, W({ fr: 'Besoin en eau FAO-56 : le quota que le kit aura le droit de pomper', en: 'FAO-56 water need: the quota the kit will be allowed to pump', ar: 'حاجة الماء حسب الفاو: الحصة المسموح بضخها', ja: 'FAO-56の水需要：キットが汲める割当量' }));
      step('groundwater_guard', {}, W({ fr: 'Vérifier que le kit ne pompera pas plus que la nappe ne le permet', en: 'Check the kit will not pump more than the aquifer allows', ar: 'التحقق من أن المنظومة لن تضخ أكثر مما تسمح به المائدة', ja: 'キットが帯水層の許容量を超えて汲まないか確認' }));
      step('business_model', ba, W({ fr: 'Chiffrer le kit pay-as-you-go : apport, mensualités, part des économies de gazole', en: 'Price the pay-as-you-go kit: deposit, installments, share of the diesel savings', ar: 'تسعير المنظومة بالدفع حسب الاستعمال: الدفعة الأولى، الأقساط، نسبة الوفر', ja: '従量課金キットの試算：頭金・割賦・軽油節約に占める割合' }));
      if (/agrivolt|au.dessus|above|\bover\b|sharing|sous les panneaux|فوق|ソーラーシェアリング|営農/.test(P.text.toLowerCase())) {
        chain = chain.then(function () {
          if (S.stop) return;
          var map = { tomato: 'tomato', potato: 'potato', pepper: 'pepper', cereal: 'wheat', veg: 'tomato' };
          return call('solar_brain', { crop: map[P.crop] || 'tomato', goal: 'ler' }, W({ fr: 'Revenu de l\'électricité en plus de la récolte (agrivoltaïsme)', en: 'Electricity income on top of the harvest (agrivoltaics)', ar: 'دخل الكهرباء إضافة إلى المحصول', ja: '収穫に加えた発電収入（営農型太陽光）' })).then(function (r) { res.solar_brain = r; });
        });
      }
      return chain.then(function () { return res; });
    }
    step('weather_forecast', { days: 14 }, W({ fr: 'Météo des 14 prochains jours', en: 'Weather for the next 14 days', ar: 'طقس الأيام الأربعة عشر القادمة', ja: '今後14日間の天気' }));
    step('water_need', P.crop ? { crop: P.crop } : {}, W({ fr: 'Besoin en eau FAO-56 et calendrier d\'irrigation', en: 'FAO-56 water need and irrigation schedule', ar: 'حاجة الماء حسب الفاو وجدول الري', ja: 'FAO-56の水需要と灌漑スケジュール' }));
    step('groundwater_guard', {}, W({ fr: 'Vérifier le risque de surpompage', en: 'Check the over-pumping risk', ar: 'التحقق من خطر الضخ المفرط', ja: '過剰揚水のリスクを確認' }));
    step('disease_risk', P.crop ? { crop: P.crop } : {}, W({ fr: 'Risque de maladie selon la météo', en: 'Weather-driven disease risk', ar: 'خطر الأمراض حسب الطقس', ja: '天気による病害リスク' }));
    step('satellite_ndvi', {}, W({ fr: 'Vigueur de la culture vue par satellite (Sentinel-2)', en: 'Crop vigour from satellite (Sentinel-2)', ar: 'قوة الزراعة من القمر الصناعي (Sentinel-2)', ja: '衛星で見る作物の活力（Sentinel-2）' }));
    step('plant_health_last', {}, W({ fr: 'Dernière photo analysée', en: 'Last photo check', ar: 'آخر صورة محللة', ja: '最新の写真診断' }));
    step('check_practices', {}, W({ fr: 'Pratiques tunisiennes et japonaises compatibles', en: 'Compatible Tunisian and Japanese practices', ar: 'الممارسات التونسية واليابانية الملائمة', ja: '適合するチュニジアと日本の技術' }));
    if (P.solar || ['tomato', 'potato', 'pepper', 'veg', 'cereal'].indexOf(P.crop) !== -1) {
      chain = chain.then(function () {
        if (S.stop) return;
        var map = { tomato: 'tomato', potato: 'potato', pepper: 'pepper', cereal: 'wheat', veg: 'tomato' };
        return call('solar_brain', { crop: map[P.crop] || 'tomato', goal: 'crop' }, W({ fr: 'Optimiser des panneaux au-dessus de la culture', en: 'Optimise panels above the crop', ar: 'تحسين الألواح فوق الزراعة', ja: '作物の上のパネル配置を最適化' })).then(function (r) { res.solar_brain = r; });
      });
    }
    return chain.then(function () { return res; });
  }

  /* ------------------------------------------------------------------ planner: writing the plan from the results */
  function day(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString(L() === 'ar' ? 'ar-TN' : L() === 'ja' ? 'ja-JP' : L() === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return d; } }
  function n0(x) { return G.fmt(x, 0); }
  function synth(res) {
    var acts = [], watch = [], pr = res.plot_profile && res.plot_profile.data, wx = res.weather_forecast && res.weather_forecast.data,
      wn = res.water_need && res.water_need.data, gd = res.groundwater_guard && res.groundwater_guard.data, dr = res.disease_risk && res.disease_risk.data,
      ph = res.plant_health_last && res.plant_health_last.data, cp = res.check_practices && res.check_practices.data, sb = res.solar_brain && res.solar_brain.data;
    function add(when, date, text, tool, prio) { acts.push({ when: when, date: date || null, text: text, tool: tool, prio: prio || 5 }); }

    // weather alerts
    var heatSeen = 0;
    (wx && wx.alerts || []).forEach(function (a) {
      if (a.kind === 'heat' && heatSeen++) return;     // one action for a run of hot days
      if (a.kind === 'heat') add(W({ fr: 'avant le ', en: 'before ', ar: 'قبل ', ja: '' }) + day(a.date) + (L() === 'ja' ? 'まで' : ''), a.date, W({
        fr: 'Vague de chaleur (' + n0(a.value) + ' °C) : arroser à l\'aube la veille et le jour même (+20 % de la dose), aucune taille ni traitement ce jour-là, pailler le sol',
        en: 'Heat wave (' + n0(a.value) + ' °C): irrigate at dawn the day before and on the day (+20 % of the dose), no pruning or spraying that day, mulch the soil',
        ar: 'موجة حر (' + n0(a.value) + ' °م): اسقِ فجراً في اليوم السابق وفي اليوم نفسه (+20 % من الجرعة)، لا تقليم ولا رش ذلك اليوم، غطِّ أحواض الأشجار',
        ja: '熱波（' + n0(a.value) + ' °C）：前日と当日の夜明けに灌水（量を20%増）、その日は剪定・散布をしない、土をマルチング' }), 'weather_forecast', 1);
      if (a.kind === 'sirocco') add(day(a.date), a.date, W({ fr: 'Sirocco (' + n0(a.value) + ' °C, vent ' + n0(a.wind) + ' km/h) : irriguer de nuit, pas de pulvérisation', en: 'Sirocco (' + n0(a.value) + ' °C, wind ' + n0(a.wind) + ' km/h): irrigate at night, no spraying', ar: 'شهيلي (' + n0(a.value) + ' °م، رياح ' + n0(a.wind) + ' كم/س): اسقِ ليلاً ولا ترش', ja: 'シロッコ（' + n0(a.value) + ' °C、風' + n0(a.wind) + ' km/h）：夜に灌水、散布しない' }), 'weather_forecast', 2);
      if (a.kind === 'frost') add(day(a.date), a.date, W({ fr: 'Gel (' + n0(a.value) + ' °C) : irriguer la veille au soir (un sol humide garde la chaleur), protéger les jeunes plants', en: 'Frost (' + n0(a.value) + ' °C): irrigate the evening before (moist soil holds heat), cover young plants', ar: 'صقيع (' + n0(a.value) + ' °م): اسقِ مساء اليوم السابق وغطِّ الشتلات', ja: '霜（' + n0(a.value) + ' °C）：前日の夕方に灌水し、苗を覆う' }), 'weather_forecast', 1);
      if (a.kind === 'heavy_rain') add(day(a.date), a.date, W({ fr: 'Forte pluie (' + n0(a.value) + ' mm) : sauter l\'irrigation ce jour et le lendemain, vérifier les déversoirs des jessour / tabias pour capter le ruissellement', en: 'Heavy rain (' + n0(a.value) + ' mm): skip irrigation that day and the next, check the jessour / tabia spillways to catch the runoff', ar: 'أمطار غزيرة (' + n0(a.value) + ' مم): أوقف الري يومين وتفقّد مفيضات الجسور والطوابي', ja: '大雨（' + n0(a.value) + ' mm）：当日と翌日は灌水を止め、ジェスール／タビアの余水吐を点検' }), 'weather_forecast', 2);
      if (a.kind === 'dry_spell') watch.push(W({ fr: 'Période sèche : ' + n0(a.past30_mm) + ' mm sur 30 jours et presque rien de prévu. Toute l\'eau viendra de l\'irrigation.', en: 'Dry spell: ' + n0(a.past30_mm) + ' mm in 30 days and almost nothing forecast. All water will come from irrigation.', ar: 'فترة جفاف: ' + n0(a.past30_mm) + ' مم في 30 يوماً ولا أمطار متوقعة.', ja: '乾燥期：30日で' + n0(a.past30_mm) + ' mm、予報もほぼ雨なし。水はすべて灌漑から。' }));
    });

    // water schedule
    if (wn && wn.next_14_days) {
      var d14 = wn.next_14_days, w1 = d14.slice(0, 7), w2 = d14.slice(7, 14);
      var s1 = w1.reduce(function (s, d) { return s + (d.m3 || 0); }, 0), s2 = w2.reduce(function (s, d) { return s + (d.m3 || 0); }, 0),
        mm1 = w1.reduce(function (s, d) { return s + (d.irrigate_mm || 0); }, 0);
      if (wn.area_ha && s1 > 0) {
        add(W({ fr: 'cette semaine', en: 'this week', ar: 'هذا الأسبوع', ja: '今週' }), w1[0].date, W({
          fr: 'Irriguer ' + n0(s1) + ' m³ au total (≈ ' + G.fmt(s1 / 7, 1) + ' m³/jour, ' + G.fmt(mm1, 1) + ' mm en goutte-à-goutte), en 2 à 3 apports tôt le matin',
          en: 'Irrigate ' + n0(s1) + ' m³ in total (≈ ' + G.fmt(s1 / 7, 1) + ' m³/day, ' + G.fmt(mm1, 1) + ' mm by drip), in 2–3 early-morning sessions',
          ar: 'اسقِ ' + n0(s1) + ' م³ في المجموع (≈ ' + G.fmt(s1 / 7, 1) + ' م³/يوم)، على 2 إلى 3 دفعات صباحاً',
          ja: '合計' + n0(s1) + ' m³を灌水（約' + G.fmt(s1 / 7, 1) + ' m³/日、点滴で' + G.fmt(mm1, 1) + ' mm）、早朝に2〜3回に分ける' }), 'water_need', 3);
        if (w2.length) add(W({ fr: 'semaine suivante', en: 'next week', ar: 'الأسبوع المقبل', ja: '来週' }), w2[0].date, W({ fr: 'Prévoir ' + n0(s2) + ' m³ (ajusté chaque jour avec la météo réelle)', en: 'Plan ' + n0(s2) + ' m³ (adjusted daily with the real weather)', ar: 'خطط لـ ' + n0(s2) + ' م³ (تُعدّل يومياً حسب الطقس)', ja: n0(s2) + ' m³を予定（実際の天気で毎日調整）' }), 'water_need', 6);
      } else if (s1 === 0 && w1.length) add(W({ fr: 'cette semaine', en: 'this week', ar: 'هذا الأسبوع', ja: '今週' }), w1[0].date, W({ fr: 'Pas d\'irrigation nécessaire (hors saison pour cette culture ou pluie suffisante)', en: 'No irrigation needed (off season for this crop or enough rain)', ar: 'لا حاجة للري (خارج موسم هذه الزراعة أو أمطار كافية)', ja: '灌水不要（この作物の時期外、または十分な雨）' }), 'water_need', 6);
      if (!wn.area_ha) watch.push(W({ fr: 'Surface inconnue : les volumes sont donnés par hectare. Indiquez la surface dans Land Intelligence.', en: 'Area unknown: volumes are per hectare. Enter the area in Land Intelligence.', ar: 'المساحة غير معروفة: الأحجام لكل هكتار.', ja: '面積不明：量はヘクタール当たり。ランド・インテリジェンスで面積を入力。' }));
    }
    if (wn && wn.year && wn.year.m3) add(W({ fr: 'cette saison', en: 'this season', ar: 'هذا الموسم', ja: '今シーズン' }), null, W({
      fr: 'Quota annuel : ' + n0(wn.year.m3) + ' m³ (' + n0(wn.year.irrigation_mm) + ' mm, FAO-56). C\'est le besoin agronomique, ne pas pomper plus',
      en: 'Yearly quota: ' + n0(wn.year.m3) + ' m³ (' + n0(wn.year.irrigation_mm) + ' mm, FAO-56). This is the crop need; do not pump more',
      ar: 'الحصة السنوية: ' + n0(wn.year.m3) + ' م³ (' + n0(wn.year.irrigation_mm) + ' مم). هذه حاجة الزراعة، لا تضخ أكثر',
      ja: '年間割当：' + n0(wn.year.m3) + ' m³（' + n0(wn.year.irrigation_mm) + ' mm、FAO-56）。作物の必要量であり、これ以上汲まない' }), 'water_need', 7);

    // groundwater guard
    if (gd && gd.totals && gd.months) {
      var m = new Date().getMonth(), mo = gd.months[m];
      var solarPump = pr && pr.pump === 'solar';
      if (gd.totals.blocked > 0 && mo) add(solarPump ? W({ fr: 'ce mois-ci', en: 'this month', ar: 'هذا الشهر', ja: '今月' }) : W({ fr: 'si pompe solaire', en: 'if solar pump', ar: 'عند الضخ الشمسي', ja: '太陽光ポンプなら' }), null, W({
        fr: 'Régler le contrôleur de pompe à ' + G.fmt(mo.daily_cap_m3, 1) + ' m³/jour en moyenne (quota FAO-56 du mois) : les panneaux pourraient remonter ' + G.fmt(gd.over_ratio, 1) + '× le besoin de la culture sur l\'année (' + n0(gd.totals.blocked) + ' m³ bloqués pour la nappe)',
        en: 'Set the pump controller to ' + G.fmt(mo.daily_cap_m3, 1) + ' m³/day on average (this month\'s FAO-56 quota): the panels could lift ' + G.fmt(gd.over_ratio, 1) + '× the crop need over the year (' + n0(gd.totals.blocked) + ' m³ kept in the aquifer)',
        ar: 'اضبط وحدة التحكم في المضخة على ' + G.fmt(mo.daily_cap_m3, 1) + ' م³/يوم: الألواح قادرة على رفع ' + G.fmt(gd.over_ratio, 1) + ' مرة حاجة الزراعة (' + n0(gd.totals.blocked) + ' م³ تبقى في المائدة)',
        ja: 'ポンプ制御を' + G.fmt(mo.daily_cap_m3, 1) + ' m³/日に設定：パネルは年間で作物需要の' + G.fmt(gd.over_ratio, 1) + '倍を汲み上げられる（' + n0(gd.totals.blocked) + ' m³を帯水層に残す）' }), 'groundwater_guard', 2);
      if (gd.totals.freed_kwh > 0) add(W({ fr: 'cette saison', en: 'this season', ar: 'هذا الموسم', ja: '今シーズン' }), null, W({ fr: 'Valoriser les ' + n0(gd.totals.freed_kwh) + ' kWh solaires libérés (froid pour la récolte, broyage, recharge) au lieu de pomper plus', en: 'Use the ' + n0(gd.totals.freed_kwh) + ' kWh of freed solar energy (cooling the harvest, milling, charging) instead of pumping more', ar: 'استعمل ' + n0(gd.totals.freed_kwh) + ' ك.و.س المحررة (تبريد المحصول، الطحن) بدل الضخ أكثر', ja: '余剰の' + n0(gd.totals.freed_kwh) + ' kWhを（収穫物の冷却、製粉、充電に）活用し、余計に汲まない' }), 'groundwater_guard', 8);
    } else if (gd && gd.missing) watch.push(W({ fr: 'Garde-nappe incomplet, il manque : ', en: 'Groundwater guard incomplete, missing: ', ar: 'حارس المائدة غير مكتمل، ينقص: ', ja: '地下水ガード不完全、不足：' }) + gd.missing.join(', '));

    // disease risk
    (dr && dr.results || []).forEach(function (r) {
      if (r.level === 'low') return;
      var dts = r.risk_days.slice(0, 3).map(day).join(', ');
      add(r.risk_days[0] ? day(r.risk_days[0]) : W({ fr: 'cette semaine', en: 'this week', ar: 'هذا الأسبوع', ja: '今週' }), r.risk_days[0], W({
        fr: r.disease + ' : risque ' + (r.level === 'high' ? 'élevé' : 'modéré') + ' (' + dts + '). ' + r.scout + ' ; traitement seulement s\'il est confirmé et validé par le CRDA',
        en: r.disease + ': ' + r.level + ' risk (' + dts + '). ' + r.scout.charAt(0).toUpperCase() + r.scout.slice(1) + '; treat only if confirmed and approved by your extension officer',
        ar: r.disease + ': خطر ' + (r.level === 'high' ? 'مرتفع' : 'متوسط') + ' (' + dts + '). ' + r.scout + '؛ لا معالجة إلا بعد التأكيد وموافقة المندوبية',
        ja: r.disease + '：リスク' + (r.level === 'high' ? '高' : '中') + '（' + dts + '）。' + r.scout + '。確認され普及員が認めた場合のみ処置' }), 'disease_risk', r.level === 'high' ? 2 : 4);
    });
    if (ph && ph.disease && ph.disease !== 'healthy') add(W({ fr: 'maintenant', en: 'now', ar: 'الآن', ja: '今すぐ' }), null, W({ fr: 'Dernière photo : ' + ph.disease.replace(/_/g, ' ') + ' (' + n0(100 * ph.confidence) + ' %). La montrer à un technicien pour confirmation', en: 'Last photo: ' + ph.disease.replace(/_/g, ' ') + ' (' + n0(100 * ph.confidence) + ' %). Show it to a technician to confirm', ar: 'آخر صورة: ' + ph.disease.replace(/_/g, ' ') + ' (' + n0(100 * ph.confidence) + ' %). اعرضها على تقني للتأكيد', ja: '最新の写真：' + ph.disease.replace(/_/g, ' ') + '（' + n0(100 * ph.confidence) + '%）。技術者に確認してもらう' }), 'plant_health_last', 3);

    // satellite vigour
    var nd = res.satellite_ndvi && res.satellite_ndvi.data;
    if (nd && nd.latest) {
      if (nd.status === 'drop' || nd.status === 'declining') add(W({ fr: 'cette semaine', en: 'this week', ar: 'هذا الأسبوع', ja: '今週' }), null, W({
        fr: 'Le satellite voit la végétation baisser (NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' le ' + day(nd.latest.date) + ', ' + (nd.change_vs_previous_3 !== null ? G.fmt(nd.change_vs_previous_3, 2) + ' par rapport aux 3 images précédentes' : 'tendance ' + G.fmt(nd.trend_per_month_90d, 2) + '/mois') + ') : vérifier sur place l\'irrigation, les fuites et les ravageurs',
        en: 'The satellite sees vegetation falling (NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' on ' + day(nd.latest.date) + ', ' + (nd.change_vs_previous_3 !== null ? G.fmt(nd.change_vs_previous_3, 2) + ' vs the 3 previous images' : 'trend ' + G.fmt(nd.trend_per_month_90d, 2) + '/month') + '): check irrigation, leaks and pests on the ground',
        ar: 'يرى القمر الصناعي تراجع الغطاء النباتي (NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' في ' + day(nd.latest.date) + '): تفقّد الري والتسربات والآفات في الحقل',
        ja: '衛星が植生の低下を検出（' + day(nd.latest.date) + 'のNDVI ' + G.fmt(nd.latest.ndvi, 2) + '）：現地で灌漑・漏水・害虫を確認' }), 'satellite_ndvi', 2);
      else watch.push(W({ fr: 'Satellite : NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' le ' + day(nd.latest.date) + ' (médiane 12 mois ' + G.fmt(nd.median_12m, 2) + ', ' + nd.n_scenes + ' images claires), végétation ' + (nd.status === 'greening' ? 'en hausse' : 'stable') + '.',
        en: 'Satellite: NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' on ' + day(nd.latest.date) + ' (12-month median ' + G.fmt(nd.median_12m, 2) + ', ' + nd.n_scenes + ' clear images), vegetation ' + (nd.status === 'greening' ? 'greening' : 'stable') + '.',
        ar: 'القمر الصناعي: NDVI ' + G.fmt(nd.latest.ndvi, 2) + ' في ' + day(nd.latest.date) + ' (الوسيط ' + G.fmt(nd.median_12m, 2) + ')، الغطاء النباتي ' + (nd.status === 'greening' ? 'في تحسن' : 'مستقر') + '.',
        ja: '衛星：' + day(nd.latest.date) + 'のNDVI ' + G.fmt(nd.latest.ndvi, 2) + '（12か月中央値' + G.fmt(nd.median_12m, 2) + '、晴天画像' + nd.n_scenes + '枚）、植生は' + (nd.status === 'greening' ? '増加' : '安定') + '。' }));
    }

    // practices
    if (cp && cp.results) {
      var ok = cp.results.filter(function (r) { return r.verdict === 'feasible'; }), ad = cp.results.filter(function (r) { return r.verdict === 'adapt'; });
      var pick = ok.slice(0, 2).concat(ok.length < 2 ? ad.slice(0, 2 - ok.length) : []);
      pick.forEach(function (r) {
        add(W({ fr: 'cette saison', en: 'this season', ar: 'هذا الموسم', ja: '今シーズン' }), null, W({ fr: 'Mettre en place : ', en: 'Set up: ', ar: 'طبّق: ', ja: '導入：' }) + r.name + (r.origin === 'jp' ? ' 🇯🇵' : r.origin === 'tn' ? ' 🇹🇳' : '') +
          (r.verdict === 'adapt' && r.adaptation ? ' — ' + r.adaptation : (r.why && r.why[0] ? ' — ' + r.why[0] : '')), 'check_practices', 7);
      });
    }

    // solar brain
    if (sb && sb.layout) add(W({ fr: 'avant d\'investir', en: 'before investing', ar: 'قبل الاستثمار', ja: '投資の前に' }), null, W({
      fr: 'Solar sharing : rangs tous les ' + sb.layout.row_pitch_m + ' m, panneaux de ' + sb.layout.panel_width_m + ' m inclinés à ' + sb.layout.tilt_deg + '° → la culture garde ' + sb.crop_yield_pct + ' % de son rendement (règle japonaise ≥ 80 % ' + (sb.japan_rule_ok ? 'respectée' : 'NON respectée') + '), ' + n0(sb.kwh_year / 1000) + ' MWh/an, LER ' + G.fmt(sb.ler, 2) + '. À tester d\'abord sur une parcelle d\'essai',
      en: 'Solar sharing: rows every ' + sb.layout.row_pitch_m + ' m, ' + sb.layout.panel_width_m + ' m panels tilted ' + sb.layout.tilt_deg + '° → the crop keeps ' + sb.crop_yield_pct + ' % of its yield (Japanese ≥ 80 % rule ' + (sb.japan_rule_ok ? 'met' : 'NOT met') + '), ' + n0(sb.kwh_year / 1000) + ' MWh/yr, LER ' + G.fmt(sb.ler, 2) + '. Test on a trial plot first',
      ar: 'التقاسم الشمسي: صفوف كل ' + sb.layout.row_pitch_m + ' م، ألواح ' + sb.layout.panel_width_m + ' م بميل ' + sb.layout.tilt_deg + '° ← تحتفظ الزراعة بـ ' + sb.crop_yield_pct + ' % من مردودها، ' + n0(sb.kwh_year / 1000) + ' م.و.س/سنة، LER ' + G.fmt(sb.ler, 2) + '. جرّب أولاً على قطعة صغيرة',
      ja: 'ソーラーシェアリング：列間' + sb.layout.row_pitch_m + ' m、幅' + sb.layout.panel_width_m + ' mのパネルを' + sb.layout.tilt_deg + '°傾斜 → 作物は収量の' + sb.crop_yield_pct + '%を維持（日本の80%ルール' + (sb.japan_rule_ok ? '適合' : '不適合') + '）、年' + n0(sb.kwh_year / 1000) + ' MWh、LER ' + G.fmt(sb.ler, 2) + '。まず試験区で確認' }), 'solar_brain', 6);

    // business model: pay-as-you-go kit
    var bm = res.business_model && res.business_model.data;
    if (bm) {
      var tnd = function (x) { return n0(x) + ' TND'; };
      var VERD = { ok: { fr: 'abordable', en: 'affordable', ar: 'في المتناول', ja: '支払い可能' }, adapt: { fr: 'possible mais serré', en: 'possible but tight', ar: 'ممكن لكن ضيق', ja: '可能だが厳しい' },
        no: { fr: 'trop cher sous cette forme', en: 'too expensive in this form', ar: 'مكلف جداً بهذه الصيغة', ja: 'この条件では高すぎる' }, unk: { fr: 'à vérifier', en: 'to check', ar: 'للتحقق', ja: '要確認' } };
      if (bm.status === 'ok') {
        add(W({ fr: 'avant de signer', en: 'before signing', ar: 'قبل التوقيع', ja: '契約の前に' }), null, W({
          fr: 'Kit solaire pay-as-you-go (' + tnd(bm.kit_tnd) + ') : apport ' + tnd(bm.deposit_tnd) + ', puis ' + tnd(bm.avg_installment_tnd) + '/mois pendant ' + bm.term_months + ' mois' + (bm.seasonal ? ' (calé sur la saison de pompage, max ' + tnd(bm.max_installment_tnd) + ')' : '') + '. Les mensualités = ' + bm.installments_over_savings_pct + ' % des économies (' + tnd(bm.diesel_tnd_year) + '/an de gazole' + (bm.maintenance_tnd_year ? ' − ' + tnd(bm.maintenance_tnd_year) + ' d\'entretien' : '') + ') : ' + W(VERD[bm.verdict]),
          en: 'Pay-as-you-go solar kit (' + tnd(bm.kit_tnd) + '): deposit ' + tnd(bm.deposit_tnd) + ', then ' + tnd(bm.avg_installment_tnd) + '/month for ' + bm.term_months + ' months' + (bm.seasonal ? ' (following the pumping season, max ' + tnd(bm.max_installment_tnd) + ')' : '') + '. Installments = ' + bm.installments_over_savings_pct + ' % of the savings (' + tnd(bm.diesel_tnd_year) + '/yr of diesel' + (bm.maintenance_tnd_year ? ' − ' + tnd(bm.maintenance_tnd_year) + ' maintenance' : '') + '): ' + W(VERD[bm.verdict]),
          ar: 'منظومة شمسية بالدفع حسب الاستعمال (' + tnd(bm.kit_tnd) + '): دفعة أولى ' + tnd(bm.deposit_tnd) + '، ثم ' + tnd(bm.avg_installment_tnd) + ' شهرياً لمدة ' + bm.term_months + ' شهراً. الأقساط = ' + bm.installments_over_savings_pct + ' % من الوفر (' + tnd(bm.diesel_tnd_year) + ' غازوال سنوياً' + (bm.maintenance_tnd_year ? ' − ' + tnd(bm.maintenance_tnd_year) + ' صيانة' : '') + '): ' + W(VERD[bm.verdict]),
          ja: '従量課金の太陽光キット（' + tnd(bm.kit_tnd) + '）：頭金' + tnd(bm.deposit_tnd) + '、その後' + bm.term_months + 'か月間 月' + tnd(bm.avg_installment_tnd) + (bm.seasonal ? '（揚水の季節に合わせ、最大' + tnd(bm.max_installment_tnd) + '）' : '') + '。割賦は節約額（軽油 年' + tnd(bm.diesel_tnd_year) + (bm.maintenance_tnd_year ? ' − 保守' + tnd(bm.maintenance_tnd_year) : '') + '）の' + bm.installments_over_savings_pct + '%：' + W(VERD[bm.verdict]) }), 'business_model', 1);
        if (bm.verdict !== 'ok') add(W({ fr: 'avant de signer', en: 'before signing', ar: 'قبل التوقيع', ja: '契約の前に' }), null, bm.suggested_term_months ? W({
          fr: 'Demander ' + bm.suggested_term_months + ' mensualités au lieu de ' + bm.term_months + ' : les paiements restent sous ' + bm.share_cap_pct + ' % des économies',
          en: 'Ask for ' + bm.suggested_term_months + ' installments instead of ' + bm.term_months + ': payments stay under ' + bm.share_cap_pct + ' % of the savings',
          ar: 'اطلب ' + bm.suggested_term_months + ' قسطاً بدل ' + bm.term_months + ': تبقى الأقساط تحت ' + bm.share_cap_pct + ' % من الوفر',
          ja: '割賦を' + bm.term_months + '回ではなく' + bm.suggested_term_months + '回にする：支払いは節約額の' + bm.share_cap_pct + '%以下に収まる' }) : W({
          fr: 'Aucune durée jusqu\'à 7 ans ne garde les paiements sous ' + bm.share_cap_pct + ' % des économies : négocier le prix du kit, chercher une subvention ou partager le kit en coopérative avec des voisins',
          en: 'No term up to 7 years keeps payments under ' + bm.share_cap_pct + ' % of the savings: negotiate the kit price, look for a grant or share the kit in a cooperative with neighbours',
          ar: 'لا مدة حتى 7 سنوات تُبقي الأقساط تحت ' + bm.share_cap_pct + ' % من الوفر: فاوض على السعر، ابحث عن منحة أو تقاسم المنظومة مع الجيران في تعاونية',
          ja: '7年までのどの期間でも支払いが節約額の' + bm.share_cap_pct + '%以下にならない：価格交渉、補助金、または近隣と協同組合でキットを共有' }), 'business_model', 2);
        add(W({ fr: 'après le dernier paiement', en: 'after the last payment', ar: 'بعد آخر قسط', ja: '最終支払いの後' }), null, W({
          fr: 'Le kit vous appartient : +' + tnd(bm.yearly_gain_after_tnd) + '/an d\'économie nette' + (bm.break_even_month ? ', trésorerie positive dès le mois ' + bm.break_even_month : '') + ', gain total ≈ ' + tnd(bm.gain_over_life_tnd) + ' sur la durée de vie du kit (retour simple ' + G.fmt(bm.simple_payback_years, 1) + ' ans)',
          en: 'The kit is yours: +' + tnd(bm.yearly_gain_after_tnd) + '/yr net saving' + (bm.break_even_month ? ', cash positive from month ' + bm.break_even_month : '') + ', total gain ≈ ' + tnd(bm.gain_over_life_tnd) + ' over the kit life (simple payback ' + G.fmt(bm.simple_payback_years, 1) + ' yr)',
          ar: 'المنظومة ملكك: +' + tnd(bm.yearly_gain_after_tnd) + ' سنوياً وفر صافٍ، ربح إجمالي ≈ ' + tnd(bm.gain_over_life_tnd) + ' على عمر المنظومة',
          ja: 'キットはあなたのもの：年' + tnd(bm.yearly_gain_after_tnd) + 'の純節約' + (bm.break_even_month ? '、' + bm.break_even_month + 'か月目から資金収支がプラス' : '') + '、キットの寿命で約' + tnd(bm.gain_over_life_tnd) + 'の利益（単純回収' + G.fmt(bm.simple_payback_years, 1) + '年）' }), 'business_model', 4);
      } else if (bm.ask_farmer) {
        add(W({ fr: 'maintenant', en: 'now', ar: 'الآن', ja: '今すぐ' }), null, W({ fr: 'Pour chiffrer le kit, répondez : ', en: 'To price the kit, answer: ', ar: 'لتسعير المنظومة، أجب: ', ja: 'キットを試算するため回答してください：' }) + bm.ask_farmer.join(' ') +
          W({ fr: ' (dans votre question, ex. « kit 30 000 TND, gazole 7 000 TND/an », ou dans la page Modèle économique)', en: ' (in your question, e.g. "kit 30,000 TND, diesel 7,000 TND/yr", or in the Business model page)', ar: ' (في سؤالك، مثلاً «منظومة 30000 د.ت، غازوال 7000 د.ت في السنة»، أو في صفحة النموذج الاقتصادي)', ja: '（質問の中で、例「キット 30000 TND、軽油 7000 TND/年」、またはビジネスモデルのページで）' }), 'business_model', 1);
      }
      if (bm.plot && bm.plot.solar_kwp) add(W({ fr: 'avant de demander un devis', en: 'before asking for a quote', ar: 'قبل طلب عرض سعر', ja: '見積もりを依頼する前に' }), null, W({
        fr: 'Taille du kit pour cette parcelle : ' + G.fmt(bm.plot.solar_kwp, 1) + ' kWc, ' + n0(bm.plot.pump_kwh_year) + ' kWh/an de pompage (≈ ' + n0(bm.plot.diesel_litres_year) + ' L de gazole remplacés), quota ' + n0(bm.plot.quota_m3_year) + ' m³/an inscrit dans le contrat',
        en: 'Kit size for this plot: ' + G.fmt(bm.plot.solar_kwp, 1) + ' kWp, ' + n0(bm.plot.pump_kwh_year) + ' kWh/yr of pumping (≈ ' + n0(bm.plot.diesel_litres_year) + ' L of diesel replaced), quota ' + n0(bm.plot.quota_m3_year) + ' m³/yr written into the contract',
        ar: 'حجم المنظومة لهذه القطعة: ' + G.fmt(bm.plot.solar_kwp, 1) + ' ك.و ذروة، ' + n0(bm.plot.pump_kwh_year) + ' ك.و.س سنوياً للضخ (≈ ' + n0(bm.plot.diesel_litres_year) + ' لتر غازوال)، حصة ' + n0(bm.plot.quota_m3_year) + ' م³ سنوياً في العقد',
        ja: 'この区画のキット容量：' + G.fmt(bm.plot.solar_kwp, 1) + ' kWp、揚水' + n0(bm.plot.pump_kwh_year) + ' kWh/年（軽油約' + n0(bm.plot.diesel_litres_year) + ' L分）、契約に年' + n0(bm.plot.quota_m3_year) + ' m³の割当を明記' }), 'business_model', 3);
      if (bm.status === 'ok') watch.push(W({
        fr: 'Hypothèses à vérifier (modifiables dans Modèle économique) : frais ' + G.fmt(bm.fee_rate_pct, 1) + ' %/an, limite ' + bm.share_cap_pct + ' % des économies, kit de ' + bm.kit_life_years + ' ans, entretien ' + tnd(bm.maintenance_tnd_year) + '/an' + (bm.plot ? ', 3 kWh par litre de gazole' : '') + '.',
        en: 'Assumptions to check (editable in Business model): fee ' + G.fmt(bm.fee_rate_pct, 1) + ' %/yr, limit ' + bm.share_cap_pct + ' % of the savings, ' + bm.kit_life_years + '-year kit, maintenance ' + tnd(bm.maintenance_tnd_year) + '/yr' + (bm.plot ? ', 3 kWh per litre of diesel' : '') + '.',
        ar: 'فرضيات للتحقق (قابلة للتعديل في النموذج الاقتصادي): كلفة ' + G.fmt(bm.fee_rate_pct, 1) + ' % سنوياً، سقف ' + bm.share_cap_pct + ' % من الوفر، عمر المنظومة ' + bm.kit_life_years + ' سنة، صيانة ' + tnd(bm.maintenance_tnd_year) + ' سنوياً' + (bm.plot ? '، 3 ك.و.س للتر' : '') + '.',
        ja: '要確認の前提（ビジネスモデルで変更可）：手数料 年' + G.fmt(bm.fee_rate_pct, 1) + '%、上限は節約額の' + bm.share_cap_pct + '%、寿命' + bm.kit_life_years + '年、保守 年' + tnd(bm.maintenance_tnd_year) + (bm.plot ? '、軽油1Lあたり3 kWh' : '') + '。' }));
      if (bm.coop) watch.push(W({ fr: 'Coopérative : ' + bm.coop.members.length + ' fermes partagent le kit, fonds de réserve ' + tnd(bm.coop.reserve_at_term_tnd) + ' à la fin' + (bm.coop.capex_saved_tnd ? ', ' + tnd(bm.coop.capex_saved_tnd) + ' économisés par rapport à des kits individuels' : '') + '.',
        en: 'Cooperative: ' + bm.coop.members.length + ' farms share the kit, reserve fund ' + tnd(bm.coop.reserve_at_term_tnd) + ' at the end' + (bm.coop.capex_saved_tnd ? ', ' + tnd(bm.coop.capex_saved_tnd) + ' saved vs individual kits' : '') + '.',
        ar: 'تعاونية: ' + bm.coop.members.length + ' مزارع تتقاسم المنظومة، صندوق احتياط ' + tnd(bm.coop.reserve_at_term_tnd) + ' في النهاية.',
        ja: '協同組合：' + bm.coop.members.length + '農場でキットを共有、最終的な積立金' + tnd(bm.coop.reserve_at_term_tnd) + '。' }));
      else watch.push(W({ fr: 'Partager le kit avec des voisins réduit l\'apport de chacun : voir les voisins dans Mon compte, puis la pompe partagée dans Modèle économique.', en: 'Sharing the kit with neighbours lowers each deposit: find neighbours in My account, then the shared pump in Business model.', ar: 'تقاسم المنظومة مع الجيران يخفض دفعة كل واحد: ابحث عن الجيران في حسابي.', ja: '近隣とキットを共有すれば各自の頭金が下がる：「マイアカウント」で近隣を探し、ビジネスモデルで共同ポンプを試算。' }));
      var weak = bm.adoption && bm.adoption.tests.filter(function (x) { return x.verdict === 'unk'; }).map(function (x) { return x.test; });
      var TEST = { climate: { fr: 'climat', en: 'climate', ar: 'المناخ', ja: '気候' }, economic: { fr: 'économie', en: 'economics', ar: 'الاقتصاد', ja: '経済性' },
        ease: { fr: 'facilité d\'usage', en: 'ease of use', ar: 'سهولة الاستعمال', ja: '使いやすさ' }, partners: { fr: 'partenaires', en: 'partners', ar: 'الشركاء', ja: 'パートナー' } };
      if (weak && weak.length) watch.push(W({ fr: 'Tests d\'adoption à compléter : ', en: 'Adoption tests to complete: ', ar: 'اختبارات التبني الواجب إكمالها: ', ja: '未完了の普及テスト：' }) + weak.map(function (k) { return TEST[k] ? W(TEST[k]) : k; }).join(', ') + W({ fr: ' (page Modèle économique).', en: ' (Business model page).', ar: ' (صفحة النموذج الاقتصادي).', ja: '（ビジネスモデルのページ）。' }));
      // a money question: keep the irrigation calendar out of the plan, keep the quota
      acts = acts.filter(function (a) { return a.tool !== 'water_need' || a.prio === 7; });
    }

    // watch: data quality
    if (pr) {
      if (pr.missing && pr.missing.length) watch.push(W({ fr: 'Données manquantes : ', en: 'Missing data: ', ar: 'بيانات ناقصة: ', ja: '不足データ：' }) + pr.missing.slice(0, 5).map(G.fieldLabel).join(', '));
      if (pr.soil && pr.soil.confidence === 'low') watch.push(W({ fr: 'Sol estimé à l\'échelle régionale (confiance faible) : une analyse de sol rendrait le plan plus précis.', en: 'Soil is a regional estimate (low confidence): a soil test would sharpen the plan.', ar: 'التربة تقدير إقليمي (ثقة ضعيفة): تحليل التربة يجعل الخطة أدق.', ja: '土壌は地域推定（信頼度低）：土壌分析で計画が精密になる。' }));
      if (pr.demo_values && pr.demo_values.length) watch.push(W({ fr: 'Valeurs de démonstration utilisées : ', en: 'Demonstration values used: ', ar: 'قيم تجريبية مستعملة: ', ja: 'デモ値を使用：' }) + pr.demo_values.join(', '));
    }
    if (!bm && (!ph || ph.status === 'none')) watch.push(W({ fr: 'Aucune photo de feuille : une photo dans Santé des plantes confirmerait les risques de maladie.', en: 'No leaf photo yet: a photo in Plant health would confirm the disease risks.', ar: 'لا صورة ورقة بعد: صورة في صحة النبات تؤكد أخطار الأمراض.', ja: '葉の写真がまだありません：「植物の健康」で撮影すると病害リスクを確認できます。' }));

    acts.sort(function (a, b) { return a.prio - b.prio || ((a.date || '9') < (b.date || '9') ? -1 : 1); });
    var situation = pr ? W({
      fr: (pr.name || 'Parcelle') + ' : ' + (pr.crop || 'culture ?') + ', ' + (pr.area_ha ? pr.area_ha + ' ha' : 'surface ?') + ', ' + n0(pr.climate.rain_mm) + ' mm de pluie par an pour une ET0 de ' + n0(pr.climate.et0_mm) + ' mm' + (wx ? ' ; 14 prochains jours : ' + n0(wx.rain_next_mm) + ' mm de pluie, ET0 ' + n0(wx.et0_next_mm) + ' mm.' : '.'),
      en: (pr.name || 'Plot') + ': ' + (pr.crop || 'crop ?') + ', ' + (pr.area_ha ? pr.area_ha + ' ha' : 'area ?') + ', ' + n0(pr.climate.rain_mm) + ' mm of rain a year against an ET0 of ' + n0(pr.climate.et0_mm) + ' mm' + (wx ? '; next 14 days: ' + n0(wx.rain_next_mm) + ' mm rain, ET0 ' + n0(wx.et0_next_mm) + ' mm.' : '.'),
      ar: (pr.name || 'القطعة') + ': ' + (pr.crop || '?') + '، ' + (pr.area_ha ? pr.area_ha + ' هكتار' : '?') + '، ' + n0(pr.climate.rain_mm) + ' مم أمطار سنوياً مقابل تبخر ' + n0(pr.climate.et0_mm) + ' مم' + (wx ? '؛ الأيام الـ14 القادمة: ' + n0(wx.rain_next_mm) + ' مم أمطار.' : '.'),
      ja: (pr.name || '区画') + '：' + (pr.crop || '作物?') + '、' + (pr.area_ha ? pr.area_ha + ' ha' : '面積?') + '、年間降水' + n0(pr.climate.rain_mm) + ' mmに対しET0 ' + n0(pr.climate.et0_mm) + ' mm' + (wx ? '。今後14日：降水' + n0(wx.rain_next_mm) + ' mm、ET0 ' + n0(wx.et0_next_mm) + ' mm。' : '。')
    }) : '';
    return { situation: situation, actions: acts.slice(0, 8), watch: watch.slice(0, 5), source: 'planner' };
  }

  /* ------------------------------------------------------------------ 2. language model with tool calling (server) */
  var LANG_NAME = { fr: 'French', ar: 'Arabic', en: 'English', ja: 'Japanese' };
  function serverUrl() { var s = LLM && LLM.state(); return s && s.server ? s.server.replace(/\/assistant$/, '/agent/step') : null; }
  function llmAgent(goal) {
    var url = serverUrl(), have = G.getParcel();
    var ctxLine = have ? 'A plot is saved: ' + JSON.stringify(T.profileData(have)).slice(0, 900) : 'No plot is saved yet: use find_place and build_land_dna (ask nothing, use the place in the goal, or Sidi Bouzid olives 2 ha well 50 m as a labelled demo).';
    var msgs = [{ role: 'user', content: 'GOAL: ' + goal + '\nLANG: ' + LANG_NAME[L()] + '\nTODAY: ' + new Date().toISOString().slice(0, 10) + '\n' + ctxLine }];
    var tools = T.schemas(), rounds = 0;
    function post() {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, tools: tools }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error((j.detail && j.detail.message) || r.status); return j; }); });
    }
    function loop() {
      if (S.stop) return Promise.resolve(null);
      rounds++;
      var th = { kind: 'thinking' }; S.steps.push(th); draw();
      return post().then(function (j) {
        S.steps.splice(S.steps.indexOf(th), 1);
        S.provider = (j.provider || '') + (j.model ? ' · ' + j.model : '');
        if (j.type === 'tool_calls' && j.calls && j.calls.length && rounds <= 9) {
          thought(j.text);
          msgs.push({ role: 'assistant', content: j.text || '', tool_calls: j.calls });
          return Promise.all(j.calls.map(function (c) {
            return call(c.name, c.args).then(function (r) { return { role: 'tool', tool_call_id: c.id, name: c.name, content: JSON.stringify(r.error ? { error: r.error, hint: r.hint } : r.data) }; });
          })).then(function (outs) { outs.forEach(function (o) { msgs.push(o); }); return loop(); });
        }
        return { text: j.text, source: 'llm' };
      }, function (e) { S.steps.splice(S.steps.indexOf(th), 1); throw e; });
    }
    return loop();
  }

  /* ------------------------------------------------------------------ 3. planner + in-browser model */
  function browserWrite(goal, res, plan) {
    var eng = LLM && LLM.state().engine;
    if (!eng) return Promise.resolve(null);
    var ev = {}; Object.keys(res).forEach(function (k) { if (res[k] && res[k].data) ev[k] = res[k].summary; });
    var sys = 'You are the GAIA Farm Agent. Rewrite the draft action plan for the farmer in ' + LANG_NAME[L()] + ', clearer and shorter. Keep every number and date exactly as in the draft; add no new number. ' +
      'Shape: one sentence of situation, then "## Actions" with "- [when] action — why", then "## Watch" with 1–3 lines.';
    var draft = plan.situation + '\n## Actions\n' + plan.actions.map(function (a) { return '- [' + a.when + '] ' + a.text + ' (' + a.tool + ')'; }).join('\n') + '\n## Watch\n' + plan.watch.map(function (w) { return '- ' + w; }).join('\n');
    var th = { kind: 'thinking' }; S.steps.push(th); draw();
    return eng.chat.completions.create({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'GOAL: ' + goal + '\nTOOL RESULTS: ' + JSON.stringify(ev) + '\nDRAFT:\n' + draft }], temperature: 0.2, max_tokens: 700 })
      .then(function (r) { S.steps.splice(S.steps.indexOf(th), 1); return { text: (r.choices[0].message.content || '').trim(), source: 'browser' }; },
        function () { S.steps.splice(S.steps.indexOf(th), 1); return null; });
  }

  /* ------------------------------------------------------------------ run */
  function run(goal) {
    if (S.running || !goal.trim()) return;
    S = { running: true, stop: false, steps: [], plan: null, goal: goal, started: performance.now(), provider: null, note: null, mode: null };
    var ls = LLM && LLM.state(), useServer = !!(ls && ls.mode === 'server' && serverUrl());
    S.mode = useServer ? 'server' : (ls && ls.engine ? 'browser' : 'planner');
    draw();
    var p;
    if (useServer) {
      p = llmAgent(goal).catch(function (e) {
        thought(t('ag_fallback') + ' (' + e.message + ')');
        S.mode = 'planner';
        return planner(goal).then(function (res) { return { plan: synth(res) }; });
      });
    } else {
      p = planner(goal).then(function (res) {
        var plan = synth(res);
        if (S.mode === 'browser') return browserWrite(goal, res, plan).then(function (txt) { return txt ? { plan: plan, text: txt.text } : { plan: plan }; });
        return { plan: plan };
      });
    }
    p.then(function (out) {
      if (!out) out = {};
      if (out.source === 'llm') S.plan = { text: out.text, actions: actionsFromText(out.text) };
      else S.plan = out.text ? { text: out.text, struct: out.plan, actions: out.plan.actions } : { struct: out.plan, actions: out.plan.actions };
    }).catch(function (e) { S.error = e.message; })
      .then(function () { S.running = false; S.ms = Math.round(performance.now() - S.started); draw(); });
  }
  // dated lines of an LLM plan, for the calendar export: "- [before 15 June] ..."
  function actionsFromText(text) {
    return (text || '').split('\n').map(function (l) { var m = l.match(/^\s*[-*•]\s*\[([^\]]+)\]\s*(.+)$/); return m ? { when: m[1], text: m[2], date: null } : null; }).filter(Boolean);
  }

  /* ------------------------------------------------------------------ calendar export */
  function ics(actions) {
    var now = new Date(), stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GAIA//Farm Agent//EN'];
    actions.forEach(function (a, i) {
      var d = a.date ? a.date.replace(/-/g, '') : new Date(now.getTime() + (i + 1) * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
      var txt = String(a.text).replace(/[,;]/g, function (c) { return '\\' + c; }).replace(/\n/g, ' ');
      lines.push('BEGIN:VEVENT', 'UID:gaia-' + stamp + '-' + i + '@gaia', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'SUMMARY:GAIA — ' + txt.slice(0, 70), 'DESCRIPTION:' + txt, 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'gaia-plan.ics'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ------------------------------------------------------------------ page */
  G.mountShell('agent');
  var app = document.getElementById('app'), traceBox, planBox, modeBox, form, input, goBtn;
  var ICON = { satellite_ndvi: '🛰️', find_place: '📍', build_land_dna: '🧬', plot_profile: '🗺️', weather_forecast: '🌦️', water_need: '💧', groundwater_guard: '🛡️', check_practices: '⚖️', solar_brain: '☀️', disease_risk: '🦠', plant_health_last: '🌿', search_knowledge: '📚' };

  function modeLine() {
    G.clear(modeBox);
    var ls = LLM && LLM.state(), m = S.running || S.plan ? S.mode : (ls && ls.mode === 'server' ? 'server' : ls && ls.engine ? 'browser' : 'planner');
    modeBox.appendChild(el('span', { class: 'ag-chip ' + m }, [t('ag_mode') + ' : ' + t('ag_m_' + m) + (m === 'server' && LLM ? ' (' + (S.provider || LLM.label()) + ')' : '')]));
    if (m === 'planner' && LLM && LLM.webgpu() && !(ls && ls.loading)) modeBox.appendChild(el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () { LLM.loadBrowser(); } }, [t('ag_turn_on')]));
    if (ls && ls.loading) modeBox.appendChild(el('span', { class: 'small muted' }, ['Qwen2.5 · ' + Math.round(100 * (ls.loading.p || 0)) + ' %']));
  }

  function argText(a) { var k = Object.keys(a || {}).filter(function (x) { return a[x] !== undefined && a[x] !== null && a[x] !== ''; }); return k.length ? k.map(function (x) { return x + '=' + (typeof a[x] === 'string' ? a[x] : JSON.stringify(a[x])); }).join(', ') : ''; }
  function drawTrace() {
    G.clear(traceBox);
    var tools = S.steps.filter(function (s) { return s.kind === 'tool'; });
    if (!S.steps.length) { traceBox.appendChild(el('p', { class: 'muted small' }, ['—'])); return; }
    if (S.note) traceBox.appendChild(G.note('info', S.note));
    var ol = el('ol', { class: 'ag-steps' });
    S.steps.forEach(function (s, i) {
      if (s.kind === 'thinking') { ol.appendChild(el('li', { class: 'ag-step thinking' }, [el('span', { class: 'ag-ico' }, ['🧠']), el('span', { class: 'ag-dots' }, [t('ag_running')])])); return; }
      if (s.kind === 'thought') { ol.appendChild(el('li', { class: 'ag-step thought' }, [el('span', { class: 'ag-ico' }, ['💭']), el('div', null, [el('b', null, [t('ag_think') + ' · ']), s.text])])); return; }
      var res = s.result || {}, raw = res.data || res;
      ol.appendChild(el('li', { class: 'ag-step ' + s.status }, [
        el('span', { class: 'ag-ico' }, [s.name === 'business_model' ? G.icon('cash', 16) : (ICON[s.name] || '🔧')]),
        el('div', { class: 'ag-body' }, [
          el('div', { class: 'ag-head' }, [el('code', null, [s.name + '(' + argText(s.args) + ')']),
            el('span', { class: 'ag-st' }, [s.status === 'running' ? t('ag_running') : s.status === 'error' ? t('ag_err') : (s.ms + ' ' + t('ag_ms'))])]),
          s.why ? el('div', { class: 'ag-why' }, [s.why]) : null,
          s.status === 'done' ? el('div', { class: 'ag-sum' }, [res.summary || '']) : s.status === 'error' ? el('div', { class: 'ag-sum err' }, [s.error]) : null,
          s.status !== 'running' ? el('details', null, [el('summary', null, [t('ag_raw')]), el('pre', null, [JSON.stringify(raw, null, 1).slice(0, 4000)])]) : null
        ])
      ]));
    });
    traceBox.appendChild(ol);
    if (!S.running && S.ms) traceBox.appendChild(el('p', { class: 'small muted' }, [tools.length + ' ' + t('ag_tools') + ' · ' + G.fmt(S.ms / 1000, 1) + ' s']));
  }

  function drawPlan() {
    G.clear(planBox);
    if (S.error) { planBox.appendChild(G.note('err', S.error)); return; }
    if (!S.plan) { if (S.running) planBox.appendChild(el('p', { class: 'muted' }, [t('ag_running')])); return; }
    var P = S.plan, body = el('div', { class: 'ag-plan' });
    if (P.text) {
      var evidence = JSON.stringify(S.steps.filter(function (s) { return s.result; }).map(function (s) { return s.result.data; })) + ' ' + S.goal;
      body.appendChild(LLM.render(P.text, LLM.unverified(P.text, evidence)));
    } else {
      var st = P.struct;
      body.appendChild(el('p', { class: 'ag-sit' }, [st.situation]));
      body.appendChild(el('ol', { class: 'ag-acts' }, st.actions.map(function (a) {
        return el('li', null, [el('span', { class: 'ag-when' }, [a.when]), el('span', { class: 'ag-txt' }, [a.text]), el('span', { class: 'ag-src' }, [(ICON[a.tool] || '') + ' ' + a.tool])]);
      })));
      if (st.watch.length) body.appendChild(el('div', { class: 'ag-watch' }, [el('h4', null, [W({ fr: 'À surveiller', en: 'Watch', ar: 'للمتابعة', ja: '注意点' })]), el('ul', null, st.watch.map(function (w) { return el('li', null, [w]); }))]));
    }
    body.appendChild(el('p', { class: 'assump', style: 'margin-top:10px' }, [t('ag_honest')]));
    var copyBtn = el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () {
      var txt = P.text || (P.struct.situation + '\n' + P.struct.actions.map(function (a) { return '- [' + a.when + '] ' + a.text; }).join('\n') + '\n' + P.struct.watch.map(function (w) { return '- ' + w; }).join('\n'));
      try { navigator.clipboard.writeText(txt).then(function () { copyBtn.textContent = t('ag_copied'); }); } catch (e) { /* no clipboard */ }
    } }, [t('ag_copy')]);
    body.appendChild(el('div', { class: 'ag-tools' }, [
      P.actions && P.actions.length ? el('button', { type: 'button', class: 'gp-btn primary sm', onclick: function () { ics(P.actions); } }, [t('ag_ics')]) : null, copyBtn,
      el('a', { class: 'gp-btn ghost sm', href: 'season.html' }, [W({ fr: 'Ma saison', en: 'My season', ar: 'موسمي', ja: 'マイシーズン' })]),
      el('a', { class: 'gp-btn ghost sm', href: 'health.html' }, [W({ fr: 'Photo d\'une feuille', en: 'Leaf photo', ar: 'صورة ورقة', ja: '葉を撮影' })])
    ]));
    planBox.appendChild(body);
  }

  function draw() {
    if (!traceBox) return;
    modeLine(); drawTrace(); drawPlan();
    goBtn.textContent = S.running ? t('ag_stop') : t('ag_go');
    goBtn.className = 'gp-btn ' + (S.running ? 'ghost' : 'primary');
  }

  function mount() {
    G.clear(app);
    input = el('textarea', { id: 'ag-goal', rows: 2, placeholder: t('ag_ph'), 'aria-label': t('ag_goal') }, []);
    input.value = S.goal || '';
    goBtn = el('button', { type: 'submit', class: 'gp-btn primary' }, [t('ag_go')]);
    form = el('form', { class: 'ag-form', onsubmit: function (e) { e.preventDefault(); if (S.running) { S.stop = true; return; } run(input.value); } }, [
      el('label', { for: 'ag-goal', class: 'ag-lab' }, [t('ag_goal')]), input, el('div', { class: 'ag-row' }, [goBtn])
    ]);
    var ex = el('div', { class: 'ag-ex' }, [el('span', { class: 'small muted' }, [t('ag_ex') + ' :'])].concat((EXAMPLES[L()] || EXAMPLES.en).map(function (q) {
      return el('button', { type: 'button', onclick: function () { input.value = q; run(q); } }, [q]);
    })));
    modeBox = el('div', { class: 'ag-mode' });
    traceBox = el('div', { class: 'ag-trace', 'aria-live': 'polite' });
    planBox = el('div', { 'aria-live': 'polite' });
    app.appendChild(el('section', { class: 'gp-card ag-top' }, [form, ex, modeBox]));
    app.appendChild(el('div', { class: 'ag-grid' }, [
      el('section', { class: 'gp-card' }, [el('h2', { class: 'ag-h' }, [t('ag_trace')]), traceBox]),
      el('section', { class: 'gp-card' }, [el('h2', { class: 'ag-h' }, [t('ag_plan')]), planBox])
    ]));
    draw();
  }

  if (LLM) { LLM.on(function () { if (modeBox) modeLine(); }); LLM.start(); }
  G.onLang(mount);
  mount();
  // ?goal=... runs the agent at once (used by the demo link on the home page)
  var q = new URLSearchParams(location.search).get('goal');
  if (q) { input.value = q; run(q); }
}());
