/* ==========================================================================
   GAIA AI Lab — contextual assistant.

   Every question first gets a rule-based answer assembled from the parcel's
   LAND DNA, the compatibility engine's verdicts and the knowledge records.
   When a language model is reachable (js/lab-llm.js: GAIA server with Claude,
   Groq, Hugging Face or Ollama, or a free model inside the browser), it writes
   the answer from that evidence and the conversation so far; the rule-based
   sections stay underneath, and figures not found in the evidence are marked.
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
      mode_none: 'Aucun modèle de langage connecté : réponses composées à partir des fiches et du profil de la parcelle.',
      mode_srv: 'Réponses rédigées par un modèle de langage ({m}) via le serveur GAIA, à partir des fiches et de votre parcelle ; chiffres vérifiés.',
      mode_br: 'Réponses rédigées par un modèle gratuit qui tourne dans votre navigateur ({m}) ; aucune donnée ne quitte l’appareil ; chiffres vérifiés.',
      btn_load: 'Activer le modèle gratuit (dans le navigateur, ≈1 Go, une seule fois)', loading: 'Téléchargement du modèle…',
      no_webgpu: 'Ce navigateur ne prend pas en charge WebGPU (essayez Chrome ou Edge récents). Autres options gratuites : Ollama sur cet ordinateur, ou une clé Groq gratuite (voir backend/README.md).',
      load_fail: 'Le modèle n’a pas pu être chargé (mémoire graphique insuffisante ou hors ligne). Les réponses par fiches restent disponibles.',
      checking: 'Recherche d’un modèle de langage…', recheck: 'Vérifier à nouveau',
      unv_note: 'Les chiffres surlignés ne figurent pas dans les données GAIA : à vérifier.', details: 'Sources, données et confiance', thinking: 'GAIA réfléchit…',
      s_reco: 'Recommandation', s_expl: 'Explication', s_rec: 'Fiche technique', s_data: 'Données utilisées', s_conf: 'Confiance',
      s_miss: 'Informations manquantes', s_act: 'Actions', s_llm: 'Formulation (modèle de langage)',
      q1: 'Quelles techniques japonaises pourraient marcher ici ?', q2: 'Comment adapter les jessour à cette parcelle ?', q3: "Quelles sont les contraintes en eau ?",
      q4: "L'agrivoltaïsme peut-il convenir ici ?", q5: 'Pourquoi GAIA a-t-il écarté les terrasses japonaises ?', q6: 'Explique la recommandation en arabe.', q7: 'Quelles informations manquent ?', q0: 'Comment gagner plus avec cette parcelle ?',
      k_rain: 'Pluie', k_slope: 'Pente', k_water: 'Eau', k_crop: 'Culture', k_ghi: 'Soleil',
      insufficient: 'Preuves insuffisantes', insufficient_p: "Je n'ai pas de fiche ni de donnée qui permette de répondre à cette question sans inventer. Essayez une des questions proposées, ou ajoutez la technique à la bibliothèque.",
      none_missing: 'Aucune information essentielle ne manque.',
      llm_block: 'La formulation du modèle contenait un chiffre absent des données fournies ; elle a été bloquée.',
      llm_err: 'Le service de modèle de langage ne répond pas ; la réponse ci-dessus reste valable.', conv: 'Conversation'
    },
    ar: {
      lab_title: 'مركز الذكاء', lab_lead: 'اطرح سؤالاً عن قطعتك. تعرض كل إجابة التوصية والبطاقة التي تبررها والبيانات المستعملة ودرجة الثقة وما ينقص.',
      ctx: 'سياق القطعة', ask: 'أسئلة مقترحة', ph: 'اطرح سؤالك عن هذه القطعة…', send: 'إرسال',
      mode_rules: 'الإجابات مركّبة من البطاقات وملف القطعة (أسئلة حرة بالعربية أو الفرنسية أو الإنجليزية). لا يوجد نموذج لغوي متصل.',
      mode_llm: 'صياغة بنموذج لغوي اعتماداً على البطاقات المسترجعة فقط، مع التحقق من الأرقام.',
      mode_none: 'لا يوجد نموذج لغوي متصل: الإجابات مركّبة من البطاقات وملف القطعة.',
      mode_srv: 'إجابات يكتبها نموذج لغوي ({m}) عبر خادم غايا، اعتماداً على البطاقات وقطعتك، مع التحقق من الأرقام.',
      mode_br: 'إجابات يكتبها نموذج مجاني يعمل داخل متصفحك ({m})؛ لا تغادر أي بيانات جهازك؛ مع التحقق من الأرقام.',
      btn_load: 'تفعيل النموذج المجاني (داخل المتصفح، حوالي 1 جيغا، مرة واحدة)', loading: 'جارٍ تنزيل النموذج…',
      no_webgpu: 'هذا المتصفح لا يدعم WebGPU (جرّب Chrome أو Edge حديثاً). خيارات مجانية أخرى: Ollama على هذا الحاسوب أو مفتاح Groq مجاني (انظر backend/README.md).',
      load_fail: 'تعذر تحميل النموذج (ذاكرة الرسوميات غير كافية أو لا يوجد اتصال). الإجابات من البطاقات تبقى متاحة.',
      checking: 'البحث عن نموذج لغوي…', recheck: 'تحقق مجدداً',
      unv_note: 'الأرقام المظللة غير موجودة في بيانات غايا: يجب التحقق منها.', details: 'المصادر والبيانات ودرجة الثقة', thinking: 'غايا يفكر…',
      s_reco: 'التوصية', s_expl: 'الشرح', s_rec: 'البطاقة التقنية', s_data: 'البيانات المستعملة', s_conf: 'درجة الثقة',
      s_miss: 'معلومات ناقصة', s_act: 'الخطوات', s_llm: 'الصياغة (نموذج لغوي)',
      q1: 'ما التقنيات اليابانية التي قد تنجح هنا؟', q2: 'كيف أكيّف الجسور مع هذه القطعة؟', q3: 'ما هي قيود الماء؟',
      q4: 'هل تناسب الزراعة الضوئية هذه القطعة؟', q5: 'لماذا استبعدت غايا المدرجات اليابانية؟', q6: 'اشرح التوصية بالعربية.', q7: 'ما المعلومات الناقصة؟', q0: 'كيف أربح أكثر من هذه القطعة؟',
      k_rain: 'الأمطار', k_slope: 'الانحدار', k_water: 'الماء', k_crop: 'الزراعة', k_ghi: 'الشمس',
      insufficient: 'أدلة غير كافية', insufficient_p: 'لا توجد بطاقة ولا بيانات تسمح بالإجابة عن هذا السؤال دون اختلاق. جرّب أحد الأسئلة المقترحة.',
      none_missing: 'لا تنقص أي معلومة أساسية.',
      llm_block: 'تضمنت صياغة النموذج رقماً غير موجود في البيانات، فتم حجبها.',
      llm_err: 'خدمة النموذج اللغوي لا تستجيب؛ الإجابة أعلاه تبقى صالحة.', conv: 'المحادثة'
    },
    en: {
      lab_title: 'The intelligence centre', lab_lead: 'Ask a question about your plot. Each answer shows the recommendation, the record that supports it, the data used, the confidence and what is missing.',
      ctx: 'Plot context', ask: 'Suggested questions', ph: 'Ask your question about this plot…', send: 'Send',
      mode_rules: 'Answers composed from the records and the plot profile (free questions in English, French, Arabic or Japanese). No language model is connected: see backend/README.md to enable Claude.',
      mode_llm: 'Wording by a language model, from the retrieved records only; figures checked.',
      mode_none: 'No language model connected: answers composed from the records and the plot profile.',
      mode_srv: 'Answers written by a language model ({m}) through the GAIA server, from the records and your plot; figures checked.',
      mode_br: 'Answers written by a free model running in your browser ({m}); no data leaves your device; figures checked.',
      btn_load: 'Turn on the free model (in the browser, about 1 GB, once)', loading: 'Downloading the model…',
      no_webgpu: 'This browser does not support WebGPU (try a recent Chrome or Edge). Other free options: Ollama on this computer, or a free Groq key (see backend/README.md).',
      load_fail: 'The model could not be loaded (not enough graphics memory, or offline). Record-based answers still work.',
      checking: 'Looking for a language model…', recheck: 'Check again',
      unv_note: 'Highlighted figures are not in GAIA’s data: check them.', details: 'Sources, data and confidence', thinking: 'GAIA is thinking…',
      s_reco: 'Recommendation', s_expl: 'Explanation', s_rec: 'Technical record', s_data: 'Data used', s_conf: 'Confidence',
      s_miss: 'Missing information', s_act: 'Actions', s_llm: 'Wording (language model)',
      q1: 'Which Japanese practices could work here?', q2: 'How can jessour be adapted to this plot?', q3: 'What are the water constraints?',
      q4: 'Could agrivoltaics fit here?', q5: 'Why did GAIA rule out the Japanese terraces?', q6: 'Explain the recommendation in Arabic.', q7: 'What information is missing?', q0: 'How can I earn more from this plot?',
      k_rain: 'Rainfall', k_slope: 'Slope', k_water: 'Water', k_crop: 'Crop', k_ghi: 'Sun',
      insufficient: 'Not enough evidence', insufficient_p: 'I have no record or data that lets me answer this question without inventing. Try one of the suggested questions, or add the practice to the library.',
      none_missing: 'No essential information is missing.',
      llm_block: 'The model’s wording contained a figure that is not in the data provided; it was blocked.',
      llm_err: 'The language model service is not responding; the answer above still stands.', conv: 'Conversation'
    },
    ja: {
      lab_title: 'インテリジェンス・センター', lab_lead: '区画について質問してください。各回答には、推奨、その根拠となる記録、使用したデータ、信頼度、欠けている情報を示します。',
      ctx: '区画の状況', ask: '質問の例', ph: 'この区画について質問してください…', send: '送信',
      mode_rules: '回答は記録と区画プロファイルから構成します（日本語・英語・フランス語・アラビア語で自由に質問できます）。言語モデルは接続されていません。Claudeを有効にするにはbackend/README.mdを参照してください。',
      mode_llm: '取得した記録のみをもとに言語モデルが文章化。数値は検証済み。',
      mode_none: '言語モデルは接続されていません。記録と区画プロファイルから回答を構成します。',
      mode_srv: 'GAIAサーバー経由で言語モデル（{m}）が記録とあなたの区画をもとに回答します。数値は検証済み。',
      mode_br: 'ブラウザ内で動く無料モデル（{m}）が回答します。データは端末の外に出ません。数値は検証済み。',
      btn_load: '無料モデルを有効にする（ブラウザ内、約1GB、初回のみ）', loading: 'モデルをダウンロード中…',
      no_webgpu: 'このブラウザはWebGPUに対応していません（最新のChromeかEdgeをお試しください）。他の無料の方法：このPCでOllama、または無料のGroqキー（backend/README.md参照）。',
      load_fail: 'モデルを読み込めませんでした（GPUメモリ不足またはオフライン）。記録による回答は引き続き使えます。',
      checking: '言語モデルを探しています…', recheck: '再確認',
      unv_note: '強調表示の数値はGAIAのデータにありません。確認してください。', details: '出典・データ・信頼度', thinking: 'GAIAが考えています…',
      s_reco: '推奨', s_expl: '説明', s_rec: '技術記録', s_data: '使用したデータ', s_conf: '信頼度',
      s_miss: '欠けている情報', s_act: '行動', s_llm: '文章化（言語モデル）',
      q1: 'ここで使えそうな日本の技術は？', q2: 'ジェスールをこの区画に合わせるには？', q3: 'この区画の水の制約は？',
      q4: '営農型太陽光はここに向いていますか？', q5: 'GAIAはなぜ日本の棚田を除外したのですか？', q6: 'おすすめをアラビア語で説明して。', q7: '足りない情報は？', q0: 'この区画でもっと稼ぐには？',
      k_rain: '降水量', k_slope: '傾斜', k_water: '水', k_crop: '作物', k_ghi: '日射',
      insufficient: '根拠不足', insufficient_p: '推測せずにこの質問に答えられる記録やデータがありません。質問の例を試すか、ライブラリに技術を追加してください。',
      none_missing: '欠けている重要な情報はありません。',
      llm_block: 'モデルの文章に、提供したデータにない数値が含まれていたため表示を止めました。',
      llm_err: '言語モデルのサービスが応答しません。上の回答はそのまま有効です。', conv: '会話'
    }
  });
  G.mountShell('lab');

  var app = document.getElementById('app');
  var thread = [];        // [{ q, intent, lang }]
  var lastIntent = null;

  /* ---------------------------------------------------------- intents */
  var NAMES = [
    ['tn-jessour', /jessour|جسور|ジェスール/i], ['tn-tabia', /tabia|طابية|タビア/i], ['tn-meskat', /meskat|مسقاة|メスカット/i],
    ['tn-dry-stone-basins', /cuvette|basin|pierre s[eè]che|أحواض|水受け|石垣/i], ['tn-oasis', /oasis|واحة|オアシス/i], ['tn-cistern', /citerne|cistern|majel|fesguia|خزان|貯水槽|タンク/i],
    ['x-mulch', /paill|mulch|تغطية|マルチ|剪定/i], ['jp-tanada', /terrasse|tanada|terrace|棚田|مدرج|テラス/i], ['jp-canal-turn', /tour d.eau|canal|okuizumo|دور الماء|水番|水路|奥出雲/i],
    ['jp-solar-sharing', /solar sharing|agrivolta|panneau|ضوئي|شمسي|ソーラーシェアリング|営農型|太陽光パネル/i], ['jp-satoyama-layers', /satoyama|ساتوياما|里山/i]
  ];
  var R = window.GAIA_RETRIEVAL;
  function namedRecord(q) { for (var i = 0; i < NAMES.length; i++) if (NAMES[i][1].test(q)) return NAMES[i][0]; return null; }
  function detect(q0) {
    var q = q0 + ' ' + R.norm(q0);
    var an = R.analyse(q0, KB.records);
    var rec = namedRecord(q) || an.named[0] || null;
    if (/arabe|arabic|عرب|アラビア/i.test(q)) return { kind: 'arabic' };
    if (/manqu|missing|ناقص|نقص|足りな|不足|欠け/i.test(q)) return { kind: 'missing' };
    if (/pourquoi|why|rejet|écart|ecart|refus|ruled out|لماذا|استبعد|なぜ|どうして|理由|除外/i.test(q)) return { kind: 'why', rec: rec };
    var crop = cropIn(q);
    if (!namedRecord(q) && HEALTH.test(q)) return { kind: 'health', crop: crop, q: q0 };
    // a short follow-up that only names another crop ("not olives but peach") keeps the previous question
    if (crop && lastIntent && an.tokens.length <= 5 && !GOAL.test(q) && ['health', 'goal'].indexOf(lastIntent.kind) !== -1)
      return Object.assign({}, lastIntent, { crop: crop, followUp: true });
    if (!rec && GOAL.test(q)) return { kind: 'goal', an: an, crop: crop };
    if (an.facets.length) return { kind: 'facet', facets: an.facets, rec: rec, an: an };
    if (/agrivolta|solar sharing|panneau|ضوئي|営農型|ソーラー/i.test(q)) return { kind: 'record', rec: 'jp-solar-sharing' };
    if (/adapt|كيّف|كيف أكيف|تكييف|合わせ|調整/i.test(q) && rec) return { kind: 'record', rec: rec };
    if (rec) return { kind: 'record', rec: rec };
    if (/japon|japan|ياب|日本/i.test(q)) return { kind: 'origin', origin: 'jp' };
    if (/tunisi|تونس|チュニジア/i.test(q)) return { kind: 'origin', origin: 'tn' };
    if (/recommand|conseil|quoi faire|meilleur|best|suggest|توصي|أفضل|انصح|おすすめ|推奨|最適|何をすべき/i.test(q)) return { kind: 'best' };
    if (/\b(eau|water|irrigation)\b|ماء|مياه|سقي|\bالري\b|水|灌漑/i.test(q) && !an.parcelTopics.filter(function (k) { return k !== 'water' && k !== 'et0' && k !== 'rain'; }).length) return { kind: 'water' };
    if (an.parcelTopics.length) return { kind: 'facts', an: an };
    if (an.hits.length && an.hits[0].score >= 2) return { kind: 'search', an: an };
    // a greeting, a test or a one- or two-word message is not off-topic: show the plot overview and what to ask
    if (an.tokens.length <= 2 || /^\s*(test|hi|hello|hey|salut|bonjour|merci|thanks|مرحبا|سلام|السلام|こんにちは|テスト)\b/i.test(q0)) return { kind: 'overview' };
    return { kind: 'unknown', an: an };
  }
  // plant health and disease prevention
  var HEALTH = new RegExp(['health', 'healthy', 'disease', 'sick', 'pest', 'insect', 'fung', 'mildew', 'blight', 'rot\\b', 'infect', 'leaf spot', '\\bspots?\\b', 'spotted', 'lesion', 'yellow', 'wilt', 'blotch', 'scab', 'canker', 'mould', 'mold', 'rust\\b', 'leaves? (are|turn|have|show)', 'leafs?\\b.*(dark|brown|black|spot|hole|curl|dry)',
    'sant[eé]', 'maladi', 'malade', 'ravageur', 'insecte', 'champignon', 'parasite', 'jaunis', 'traitement', 'tache', 'l[eé]sion', 'pourri', 'rouille', 'feuilles? (qui|sont|ont|se)',
    'صحة', 'صحه', 'مرض', 'أمراض', 'امراض', 'آفة', 'آفات', 'افات', 'حشر', 'فطر', 'اصفرار', 'بقع', 'تبقع', 'تعفن', 'ذبول',
    '病気', '病害', '害虫', '健康', 'カビ', '害', '斑点', '枯れ', 'しおれ'].join('|'), 'i');
  // crops a farmer may name, in the profile's keys where GAIA has them (others keep their own key)
  var CROP_WORDS = [
    ['olive', /olive|olivier|زيتون|オリーブ/i], ['palm', /date palm|palm|dattier|palmier|datte|نخيل|نخل|تمر|ナツメヤシ/i],
    ['citrus', /citrus|orange|lemon|mandarin|agrume|citron|قوارص|برتقال|ليمون|柑橘|みかん|オレンジ|レモン/i],
    ['potato', /potato|pomme de terre|patate|بطاطا|بطاطس|ジャガイモ|じゃがいも/i], ['tomato', /tomato|tomate|طماطم|بندورة|トマト/i],
    ['pepper', /pepper|poivron|piment|فلفل|ピーマン|唐辛子/i], ['grape', /grape|vine|vigne|raisin|عنب|كرم|ブドウ|葡萄/i],
    ['peach', /peach|p[eê]che|pêcher|خوخ|دراق|モモ|桃/i], ['apple', /apple|pommier|\bpommes?\b(?! de terre)|تفاح|リンゴ|りんご/i],
    ['almond', /almond|amande|لوز|アーモンド/i], ['fig', /\bfigs?\b|figue|figuier|تين|イチジク/i], ['pomegranate', /pomegranate|grenad|رمان|ザクロ/i],
    ['cereal', /cereal|wheat|barley|c[eé]r[eé]ale|bl[eé]\b|orge|حبوب|قمح|شعير|小麦|大麦|穀物/i], ['veg', /vegetable|l[eé]gume|maraîch|خضر|野菜/i]
  ];
  // the crop named last wins: "not olives but peach" → peach
  function cropIn(q) {
    var best = null, at = -1;
    CROP_WORDS.forEach(function (c) { var m = q.search(c[1]); if (m > at) { at = m; best = c[0]; } });
    return best;
  }
  var CROP_NAME = {
    fr: { olive: 'olivier', palm: 'palmier dattier', citrus: 'agrumes', potato: 'pomme de terre', tomato: 'tomate', pepper: 'poivron', grape: 'vigne', peach: 'pêcher', apple: 'pommier', almond: 'amandier', fig: 'figuier', pomegranate: 'grenadier', cereal: 'céréales', veg: 'maraîchage', other: 'autre culture' },
    ar: { olive: 'الزيتون', palm: 'النخيل', citrus: 'القوارص', potato: 'البطاطا', tomato: 'الطماطم', pepper: 'الفلفل', grape: 'العنب', peach: 'الخوخ', apple: 'التفاح', almond: 'اللوز', fig: 'التين', pomegranate: 'الرمان', cereal: 'الحبوب', veg: 'الخضر', other: 'زراعة أخرى' },
    en: { olive: 'olive', palm: 'date palm', citrus: 'citrus', potato: 'potato', tomato: 'tomato', pepper: 'pepper', grape: 'grape', peach: 'peach', apple: 'apple', almond: 'almond', fig: 'fig', pomegranate: 'pomegranate', cereal: 'cereals', veg: 'vegetables', other: 'other crop' },
    ja: { olive: 'オリーブ', palm: 'ナツメヤシ', citrus: '柑橘', potato: 'ジャガイモ', tomato: 'トマト', pepper: 'ピーマン', grape: 'ブドウ', peach: 'モモ', apple: 'リンゴ', almond: 'アーモンド', fig: 'イチジク', pomegranate: 'ザクロ', cereal: '穀物', veg: '野菜', other: 'その他の作物' }
  };
  // the plant-health model's plants and diseases, read from its manifest (no fixed list)
  var VISION = null;
  try { fetch(G.CONFIG.visionManifest, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) { VISION = m; }).catch(function () {}); } catch (e) { /* no model */ }

  // broad goal questions: earn more, produce more, improve the farm, what to do
  var GOAL = new RegExp(['gain', 'income', 'revenue', 'profit', 'earn', 'money', 'yield', 'productiv', 'improve', 'increase', 'boost', 'make more', 'more from',
    'what (should|can|could) i do', 'advice', 'help me', 'grow more', 'better harvest',
    'revenu', 'gagner', 'b[eé]n[eé]fice', 'rendement', 'am[eé]liorer', 'augmenter', 'rentab', 'que (dois|puis|peux)[- ]je faire', 'produire plus', 'récolte', 'recolte',
    'ربح', 'أرباح', 'ارباح', 'دخل', 'مدخول', 'مردود', 'إنتاج', 'انتاج', 'تحسين', 'زيادة', 'زياده', 'ماذا (أفعل|افعل)', 'نصيحة', 'نصيحه',
    '収入', '収益', '利益', '収量', '増や', '改善', '儲', '何をすれば', '生産性', 'もうけ'].join('|'), 'i');

  /* ---------------------------------------------------------- evidence helpers */
  // W(L, { fr, ar, en, ja }): the answer's wording in its language (French when missing)
  function W(L, o) { return o[L] !== undefined ? o[L] : o.fr; }
  var VERDICT = {
    ar: { feasible: 'ممكنة', adapt: 'ممكنة مع التكييف', insufficient: 'أدلة غير كافية', rejected: 'غير موصى بها' },
    en: { feasible: 'Feasible', adapt: 'Feasible with adaptation', insufficient: 'Not enough evidence', rejected: 'Not recommended' },
    ja: { feasible: '実施可能', adapt: '調整すれば実施可能', insufficient: '根拠不足', rejected: '推奨しない' }
  };
  function verdictText(v, L) { return VERDICT[L] ? VERDICT[L][v] : t(v === 'feasible' ? 'verdict_ok' : v === 'adapt' ? 'verdict_adapt' : v === 'insufficient' ? 'verdict_unk' : 'verdict_no'); }
  function nameOf(r, L) { return L === 'ar' && r.name_ar ? r.name_ar : r.name; }
  function sep(L) { return L === 'ja' ? '：' : L === 'fr' ? ' : ' : ': '; }
  function dataUsed(dna, paths) {
    var out = [], seen = {};
    paths.forEach(function (p) {
      var f = D.fieldAt(dna, p); if (!f || !f.source || seen[f.source]) return;
      seen[f.source] = 1; out.push({ label: G.tr(f.source) + (f.period ? ' (' + f.period + ')' : ''), url: f.url || null });
    });
    return out;
  }
  function confidence(dna, results, L) {
    var lowData = dna.quality.coreMissing.length > 0;
    var prov = results.some(function (r) { return r.provisional; });
    var draft = results.some(function (r) { return r.record.review.status !== 'validated'; });
    var level = lowData || prov ? 'low' : 'medium';
    var why = [
      lowData ? W(L, { fr: 'données essentielles manquantes', ar: 'بيانات أساسية ناقصة', en: 'essential data missing', ja: '重要なデータが不足' })
        : W(L, { fr: 'climat issu de réanalyse régionale', ar: 'بيانات مناخية جهوية (إعادة تحليل)', en: 'climate from regional reanalysis', ja: '気候は地域再解析データ' }),
      prov ? W(L, { fr: 'seuils provisoires', ar: 'عتبات مؤقتة', en: 'provisional thresholds', ja: '暫定的なしきい値' }) : null,
      draft ? W(L, { fr: 'fiche non validée par un expert', ar: 'بطاقة غير مصادق عليها', en: 'record not validated by an expert', ja: '専門家未検証の記録' }) : null
    ];
    return { level: level, why: why.filter(Boolean).join(' · ') };
  }
  function noteOf(dna, p) { var f = D.fieldAt(dna, p); return G.fieldLabel(p) + (f && f.note ? ' — ' + G.tr(f.note) : ''); }
  function missingFor(dna, results) {
    var paths = {};
    results.forEach(function (r) { r.unknown.forEach(function (x) { paths[x.cond.field] = 1; }); });
    return Object.keys(paths).map(function (p) { return noteOf(dna, p); });
  }

  // annual rain, ET0 and the crop's net irrigation need (FAO-56 Kc, USDA-SCS effective rain), from the plot's monthly climate
  var NEXUS_CROP = { tomato: 'veg', potato: 'veg', pepper: 'veg' };
  function waterBalance(dna, cropOver) {
    var rain = D.value(dna, 'climate.rain_mm'), et0 = D.value(dna, 'climate.et0_mm');
    if (rain === null || et0 === null) return null;
    var out = { rain: rain, et0: et0, irn: null }, N = window.GAIA_NEXUS, CM = dna.climateMonthly, crop = cropOver ? (NEXUS_CROP[cropOver] || cropOver) : D.value(dna, 'crop');
    if (N && CM && CM.et0 && CM.rain && crop && N.CROPS[crop] && N.CROPS[crop].kc) {
      var r = N.compute({ et0: CM.et0, rain: CM.rain, kc: N.CROPS[crop].kc, months: N.CROPS[crop].months, ea: 1, pump_eff: 0.45, pr: 0.75 });
      if (r.totals && typeof r.totals.irn === 'number') out.irn = r.totals.irn;
    }
    return out;
  }

  /* ---------------------------------------------------------- answer builders */
  function answer(intent, dna, L) {
    var all = E.evaluateAll(dna);
    var S = sep(L);
    var get = function (id) { return all.filter(function (r) { return r.record.id === id; })[0]; };
    var a = { records: [], data: [], actions: [], missing: [], expl: [] };

    if (intent.kind === 'arabic') {
      return answer(lastIntent && lastIntent.kind !== 'arabic' ? lastIntent : { kind: 'best' }, dna, 'ar');
    }

    if (intent.kind === 'best' || intent.kind === 'origin') {
      var pool = all.filter(function (r) { return r.verdict !== 'rejected' && (!intent.origin || r.record.origin === intent.origin); });
      if (!pool.length) {
        a.title = W(L, { fr: 'Aucune technique retenue', ar: 'لا توجد تقنية مناسبة', en: 'No practice retained', ja: '該当する技術はありません' });
        a.reco = W(L, { fr: 'Aucune technique de cette origine ne remplit ses conditions obligatoires sur cette parcelle.', ar: 'لم تُستوفَ شروط أي تقنية من هذا الأصل لهذه القطعة.', en: 'No practice of this origin meets its mandatory conditions on this plot.', ja: 'この区画では、この出自の技術はどれも必須条件を満たしていません。' });
        a.expl = all.filter(function (r) { return !intent.origin || r.record.origin === intent.origin; }).map(function (r) {
          return nameOf(r.record, L) + S + r.hardFails.map(E.describe).join(L === 'ja' ? '、' : ' ; ');
        });
        a.records = [];
      } else {
        var top = pool[0];
        a.title = intent.origin === 'jp'
          ? W(L, { fr: 'Techniques japonaises possibles ici', ar: 'تقنيات يابانية ممكنة هنا', en: 'Japanese practices possible here', ja: 'ここで使えそうな日本の技術' })
          : W(L, { fr: 'Technique la mieux adaptée', ar: 'أفضل تقنية لهذه القطعة', en: 'Best-suited practice', ja: '最も適した技術' });
        a.reco = nameOf(top.record, L) + ' — ' + verdictText(top.verdict, L) + (top.score !== null ? ' (' + fmt(top.score * 100) + ' %)' : '');
        a.expl = pool.map(function (r) {
          return nameOf(r.record, L) + S + verdictText(r.verdict, L) + (r.adaptation ? W(L, { fr: ' — adaptation : ', ar: ' — تكييف: ', en: ' — adaptation: ', ja: ' — 調整：' }) + r.adaptation.text : '');
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
        a.reco = W(L, { fr: 'Technique non recommandée sur cette parcelle.', ar: 'لا يُنصح بهذه التقنية على هذه القطعة.', en: 'Practice not recommended on this plot.', ja: 'この区画ではこの技術を推奨しません。' });
        a.expl = r.hardFails.map(function (x) { return E.describe(x) + ' — ' + x.cond.why; });
        var alt = all.filter(function (x) { return x.verdict !== 'rejected' && x.record.families.some(function (f) { return r.record.families.indexOf(f) !== -1; }); })[0];
        if (alt) { a.expl.push(W(L, { fr: 'Alternative possible : ', ar: 'بديل ممكن: ', en: 'Possible alternative: ', ja: '代わりの候補：' }) + nameOf(alt.record, L) + (L === 'ja' ? '（' + verdictText(alt.verdict, L) + '）。' : ' (' + verdictText(alt.verdict, L) + ').')); a.actions = alt.record.actions.slice(); a.records.push(alt.record); }
      } else {
        a.reco = r.adaptation ? r.adaptation.text : W(L, { fr: 'Faisable telle quelle.', ar: 'ممكنة كما هي.', en: 'Feasible as it is.', ja: 'そのまま実施できます。' });
        a.expl = r.checks.filter(function (x) { return x.result === 'pass'; }).map(E.describe);
        if (r.provisional) a.expl.push(W(L, { fr: 'La fiche contient au moins un seuil provisoire.', ar: 'تحتوي البطاقة على عتبة مؤقتة.', en: 'The record contains at least one provisional threshold.', ja: 'この記録には暫定的なしきい値が含まれます。' }));
        a.actions = r.record.actions.slice();
      }
      if (id === 'jp-solar-sharing') {
        var ghi = D.value(dna, 'solar.ghi_kwh');
        a.expl.push(W(L, { fr: 'Rayonnement annuel moyen : ', ar: 'الإشعاع الشمسي السنوي: ', en: 'Mean annual radiation: ', ja: '年平均日射量：' }) + (ghi === null ? W(L, { fr: 'indisponible', ar: 'غير متاح', en: 'unavailable', ja: '取得不可' }) : fmt(ghi, 2) + ' ' + W(L, { fr: 'kWh/m²/j', ar: 'kWh/m²/j', en: 'kWh/m²/day', ja: 'kWh/m²/日' })) + (L === 'ja' ? '。' : '.'));
        a.expl.push(W(L, { fr: 'Sans quota d’eau, le pompage solaire encourage le surpompage : voir Eau & énergie.', ar: 'بلا حصة ماء، يشجع الضخ الشمسي على الإفراط في الضخ.', en: 'Without a water quota, solar pumping encourages over-pumping: see Water & energy.', ja: '水の割当量がないと、太陽光揚水は過剰揚水を招きます。「水とエネルギー」を参照してください。' }));
        a.data = dataUsed(dna, ['solar.ghi_kwh', 'energy.pump']);
      } else {
        a.data = dataUsed(dna, r.checks.map(function (x) { return x.cond.field; }));
      }
    }

    else if (intent.kind === 'water') {
      var rain = D.value(dna, 'climate.rain_mm'), et0 = D.value(dna, 'climate.et0_mm'), src = D.value(dna, 'water.source');
      var mmy = W(L, { fr: ' mm/an', ar: ' mm/an', en: ' mm/yr', ja: ' mm/年' });
      a.title = W(L, { fr: 'Contraintes en eau', ar: 'قيود الماء', en: 'Water constraints', ja: '水の制約' });
      if (rain === null || et0 === null) { a.reco = W(L, { fr: 'Déficit non calculable : données climatiques indisponibles.', ar: 'تعذّر حساب العجز المائي: البيانات المناخية غير متاحة.', en: 'Deficit cannot be calculated: climate data unavailable.', ja: '気候データがないため、水の不足量を計算できません。' }); }
      else {
        var deficit = fmt(et0 - rain);
        a.reco = W(L, { fr: 'La demande climatique dépasse la pluie de ' + deficit + mmy + ' environ.', ar: 'الطلب المناخي يفوق الأمطار بـ ' + deficit + mmy + ' تقريباً.', en: 'Climatic demand exceeds rainfall by about ' + deficit + mmy + '.', ja: '気候による水の需要が降水量を約' + deficit + mmy + '上回っています。' });
        a.expl.push(W(L, { fr: 'Pluie : ', ar: 'الأمطار: ', en: 'Rainfall: ', ja: '降水量：' }) + fmt(rain) + mmy + (L === 'ja' ? '、' : ' ; ') + 'ET0' + S + fmt(et0) + mmy + (L === 'ja' ? '。' : '.'));
        a.expl.push(W(L, { fr: 'ET0 est une référence : le besoin réel de la culture se calcule avec son coefficient Kc (page Eau & énergie).', ar: 'ET0 هو تبخر مرجعي؛ حاجة الشجرة الفعلية تُحسب بمعامل الزراعة في صفحة الماء والطاقة.', en: 'ET0 is a reference: the crop’s real need is calculated with its coefficient Kc (Water & energy page).', ja: 'ET0は基準値です。作物の実際の必要水量は作物係数Kcで計算します（「水とエネルギー」ページ）。' }));
      }
      a.expl.push(W(L, { fr: "Source d'eau : ", ar: 'مصدر الماء: ', en: 'Water source: ', ja: '水源：' }) + (src ? E.valueLabel(src) : W(L, { fr: 'non renseignée', ar: 'غير مصرّح به', en: 'not entered', ja: '未入力' })) + (L === 'ja' ? '。' : '.'));
      a.expl.push(W(L, { fr: "En Tunisie, l'irrigation dépend largement des nappes : tout pompage supplémentaire doit rester dans un quota.", ar: 'في تونس يأتي جزء كبير من مياه الري من المائدة المائية؛ أي ضخ إضافي يجب أن يبقى ضمن حصة.', en: 'In Tunisia irrigation depends largely on groundwater: any extra pumping must stay within a quota.', ja: 'チュニジアの灌漑は地下水に大きく依存しています。追加の揚水はすべて割当量の範囲内に収める必要があります。' }));
      a.records = ['tn-jessour', 'tn-meskat', 'x-mulch'].map(KB.get);
      a.actions = W(L, {
        fr: ['Calculer le besoin mensuel dans Eau & énergie.', 'Fixer un quota de pompage mensuel.', "Réduire l'évaporation par le paillage."],
        ar: ['احسب الحاجة الشهرية في صفحة الماء والطاقة.', 'حدّد حصة ضخ شهرية.', 'قلّل التبخر بالتغطية.'],
        en: ['Calculate the monthly need in Water & energy.', 'Set a monthly pumping quota.', 'Cut evaporation with mulch.'],
        ja: ['「水とエネルギー」で月ごとの必要水量を計算する。', '月ごとの揚水割当量を決める。', 'マルチングで蒸発を減らす。']
      });
      a.data = dataUsed(dna, ['climate.rain_mm', 'climate.et0_mm', 'water.source']);
      a.results = all.filter(function (r) { return ['tn-jessour', 'tn-meskat', 'x-mulch'].indexOf(r.record.id) !== -1; });
    }

    else if (intent.kind === 'missing') {
      a.title = W(L, { fr: 'Informations manquantes', ar: 'المعلومات الناقصة', en: 'Missing information', ja: '欠けている情報' });
      var m = dna.quality.missing;
      var core = dna.quality.coreMissing.map(G.fieldLabel).join(', ');
      a.reco = m.length ? W(L, {
        fr: m.length + ' champs manquants. Les plus importants : ' + (core || 'aucun champ essentiel'),
        ar: m.length + ' حقول ناقصة. الأهم: ' + (core || 'لا شيء أساسي'),
        en: m.length + ' fields missing. The most important: ' + (core || 'no essential field'),
        ja: m.length + '項目が不足しています。最も重要なもの：' + (core || '重要な項目はありません')
      }) : t('none_missing');
      a.expl = m.map(function (p) { return noteOf(dna, p); });
      a.actions = W(L, {
        fr: ['Compléter les champs dans Land Intelligence.', 'Faire mesurer le sol (texture, profondeur) par un technicien.', 'Reconstruire le profil.'],
        ar: ['أكمل الحقول في صفحة ذكاء الأرض.', 'اطلب من مهندس فلاحي قياس التربة.', 'أعد بناء الملف.'],
        en: ['Fill in the fields in Land Intelligence.', 'Have a technician measure the soil (texture, depth).', 'Rebuild the profile.'],
        ja: ['ランド・インテリジェンスで項目を入力する。', '技術者に土壌（土性、深さ）を測ってもらう。', 'プロファイルを作り直す。']
      });
      a.results = [];
    }

    else if (intent.kind === 'facet') {
      var ids = intent.rec ? [intent.rec] : intent.an.hits.filter(function (h) { return h.score >= 1.5; }).slice(0, 3).map(function (h) { return h.id; });
      if (!ids.length) ids = all.filter(function (r) { return r.verdict === 'feasible' || r.verdict === 'adapt'; }).slice(0, 3).map(function (r) { return r.record.id; });
      if (!ids.length) return insufficient(L);
      var FACET_KEY = { cost: 'cost', risk: 'risks', materials: 'materials', actors: 'actors', regulation: 'regulation' };
      var FACET_LABEL = W(L, {
        fr: { cost: 'Coût', risk: 'Risques', materials: 'Matériaux', actors: 'Acteurs et appuis', regulation: 'Réglementation', actions: 'Étapes', sources: 'Sources' },
        ar: { cost: 'التكلفة', risk: 'المخاطر', materials: 'المواد', actors: 'الفاعلون', regulation: 'التنظيمات', actions: 'الخطوات', sources: 'المصادر' },
        en: { cost: 'Cost', risk: 'Risks', materials: 'Materials', actors: 'Actors and support', regulation: 'Regulation', actions: 'Steps', sources: 'Sources' },
        ja: { cost: 'コスト', risk: 'リスク', materials: '資材', actors: '関係者と支援', regulation: '規制', actions: '手順', sources: '出典' }
      });
      var facetText = function (rec, f) {
        if (f === 'actions') return (rec.actions || []).join(L === 'ja' ? ' ' : ' ; ');
        if (f === 'sources') return rec.sources.map(function (x) { return x.label + (x.verified ? '' : W(L, { fr: ' (lien à vérifier)', ar: ' (رابط للتحقق)', en: ' (link to check)', ja: '（リンク要確認）' })); }).join(' ; ');
        return rec[FACET_KEY[f]] || '';
      };
      var fs = intent.facets;
      var rs = ids.map(get).filter(Boolean);
      a.title = fs.map(function (f) { return FACET_LABEL[f]; }).join(' · ') + ' — ' + rs.map(function (r) { return nameOf(r.record, L); }).join(', ');
      a.reco = facetText(rs[0].record, fs[0]) || W(L, { fr: 'La fiche ne donne pas cette information.', ar: 'البطاقة لا تذكر هذه المعلومة.', en: 'The record does not give this information.', ja: '記録にこの情報はありません。' });
      rs.forEach(function (r, i) {
        fs.forEach(function (f, j) {
          if (i === 0 && j === 0) return;
          a.expl.push(nameOf(r.record, L) + ' — ' + FACET_LABEL[f] + S + (facetText(r.record, f) || W(L, { fr: 'non précisé dans la fiche', ar: 'غير مذكور في البطاقة', en: 'not given in the record', ja: '記録に記載なし' })));
        });
        a.expl.push(nameOf(r.record, L) + ' — ' + W(L, { fr: 'pour cette parcelle : ', ar: 'لهذه القطعة: ', en: 'for this plot: ', ja: 'この区画では：' }) + verdictText(r.verdict, L) + (L === 'ja' ? '。' : '.'));
      });
      a.records = rs.map(function (r) { return r.record; });
      a.results = rs;
      a.actions = fs.indexOf('actions') !== -1 ? [] : rs[0].record.actions.slice();
      a.data = dataUsed(dna, rs[0].checks.map(function (x) { return x.cond.field; }));
    }

    else if (intent.kind === 'facts') {
      var FL = W(L, {
        fr: { 'soil.texture': 'Texture du sol', 'soil.clay_pct': 'Argile 0–30 cm', 'soil.soc': 'Carbone organique', 'climate.rain_mm': 'Pluie annuelle', 'climate.tmax_hot': 'Max. du mois le plus chaud', 'climate.tmin_cold': 'Min. du mois le plus froid', 'climate.et0_mm': 'Évapotranspiration de référence', 'terrain.slope_pct': 'Pente', 'terrain.elev_m': 'Altitude', 'terrain.aspect_deg': 'Orientation', 'solar.ghi_kwh': 'Rayonnement solaire', 'energy.pump': 'Pompage', 'water.source': "Source d'eau", 'water.well_depth_m': 'Profondeur du puits', 'crop': 'Culture', 'area_ha': 'Surface' },
        ar: { 'soil.texture': 'قوام التربة', 'soil.clay_pct': 'الطين 0–30 سم', 'soil.soc': 'الكربون العضوي', 'climate.rain_mm': 'الأمطار السنوية', 'climate.tmax_hot': 'أقصى حرارة صيفية', 'climate.tmin_cold': 'أدنى حرارة شتوية', 'climate.et0_mm': 'التبخر النتحي المرجعي', 'terrain.slope_pct': 'الانحدار', 'terrain.elev_m': 'الارتفاع', 'terrain.aspect_deg': 'الاتجاه', 'solar.ghi_kwh': 'الإشعاع الشمسي', 'energy.pump': 'الضخ', 'water.source': 'مصدر الماء', 'water.well_depth_m': 'عمق البئر', 'crop': 'الزراعة', 'area_ha': 'المساحة' },
        en: { 'soil.texture': 'Soil texture', 'soil.clay_pct': 'Clay 0–30 cm', 'soil.soc': 'Organic carbon', 'climate.rain_mm': 'Annual rainfall', 'climate.tmax_hot': 'Max. of the hottest month', 'climate.tmin_cold': 'Min. of the coldest month', 'climate.et0_mm': 'Reference evapotranspiration', 'terrain.slope_pct': 'Slope', 'terrain.elev_m': 'Elevation', 'terrain.aspect_deg': 'Aspect', 'solar.ghi_kwh': 'Solar radiation', 'energy.pump': 'Pumping', 'water.source': 'Water source', 'water.well_depth_m': 'Well depth', 'crop': 'Crop', 'area_ha': 'Area' },
        ja: { 'soil.texture': '土性', 'soil.clay_pct': '粘土 0–30 cm', 'soil.soc': '有機炭素', 'climate.rain_mm': '年間降水量', 'climate.tmax_hot': '最暑月の最高気温', 'climate.tmin_cold': '最寒月の最低気温', 'climate.et0_mm': '基準蒸発散量', 'terrain.slope_pct': '傾斜', 'terrain.elev_m': '標高', 'terrain.aspect_deg': '斜面の向き', 'solar.ghi_kwh': '日射量', 'energy.pump': '揚水', 'water.source': '水源', 'water.well_depth_m': '井戸の深さ', 'crop': '作物', 'area_ha': '面積' }
      });
      var TX = W(L, { fr: { sandy: 'sableux', loamy: 'limoneux', clayey: 'argileux' }, ar: { sandy: 'رملية', loamy: 'طميية', clayey: 'طينية' }, en: { sandy: 'sandy', loamy: 'loamy', clayey: 'clayey' }, ja: { sandy: '砂質', loamy: 'ローム質', clayey: '粘土質' } });
      var confW = W(L, { fr: 'confiance ', ar: 'ثقة ', en: 'confidence ', ja: '信頼度 ' });
      var show = function (p) {
        var f = D.fieldAt(dna, p);
        if (!f || f.status !== 'ok' || f.value === null) return { p: p, ok: false, text: FL[p] + S + W(L, { fr: 'indisponible', ar: 'غير متاح', en: 'unavailable', ja: '取得不可' }) + (f && f.note ? ' — ' + G.tr(f.note) : '') };
        var v = f.value;
        var txt = typeof v === 'number' ? fmt(v, p === 'terrain.slope_pct' || p === 'solar.ghi_kwh' ? (p === 'solar.ghi_kwh' ? 2 : 1) : 0) + (f.unit ? ' ' + G.tr(f.unit) : '')
          : Array.isArray(v) ? v.join(', ') : (TX[v] || E.valueLabel(v));
        return { p: p, ok: true, text: FL[p] + S + txt + ' (' + G.tr(f.source) + (f.confidence ? ', ' + confW + t('conf_' + f.confidence) : '') + ')' };
      };
      var rows = intent.an.fields.map(show);
      var okRows = rows.filter(function (x) { return x.ok; });
      a.title = W(L, { fr: 'Ce que disent les données de votre parcelle', ar: 'ما تقوله بيانات قطعتك', en: 'What your plot’s data says', ja: '区画のデータからわかること' });
      a.reco = okRows.length ? okRows[0].text : rows[0].text;
      a.expl = rows.slice(1).map(function (x) { return x.text; });
      var lowSoil = intent.an.fields.some(function (p) { var f = D.fieldAt(dna, p); return p.indexOf('soil.') === 0 && f && f.confidence === 'low'; });
      if (lowSoil) a.expl.push(W(L, { fr: 'Les valeurs de sol sont régionales et approximatives, pas une mesure de la parcelle : une analyse de sol est conseillée.', ar: 'قيم التربة جهوية تقريبية وليست قياساً للقطعة: يُنصح بتحليل التربة.', en: 'The soil values are regional and approximate, not a measurement of the plot: a soil analysis is advised.', ja: '土壌の値は地域のおおよその値で、区画の実測ではありません。土壌分析をおすすめします。' }));
      var fam = intent.an.families;
      var rel = all.filter(function (r) { return r.verdict !== 'rejected' && (!fam.length || r.record.families.some(function (f) { return fam.indexOf(f) !== -1; })); }).slice(0, 3);
      if (rel.length) a.expl.push(W(L, { fr: 'Techniques liées possibles ici : ', ar: 'تقنيات ذات صلة ممكنة هنا: ', en: 'Related practices possible here: ', ja: 'ここで可能な関連技術：' }) + rel.map(function (r) { return nameOf(r.record, L) + ' (' + verdictText(r.verdict, L) + ')'; }).join(', ') + (L === 'ja' ? '。' : '.'));
      a.records = rel.map(function (r) { return r.record; });
      a.results = rel;
      a.actions = rel.length ? rel[0].record.actions.slice() : [];
      a.data = dataUsed(dna, intent.an.fields);
      a.missing = rows.filter(function (x) { return !x.ok; }).map(function (x) { return x.p; });
    }

    else if (intent.kind === 'search') {
      var top3 = intent.an.hits.filter(function (h, i) { return h.score >= 2 || i === 0; }).slice(0, 3).map(function (h) { return get(h.id); }).filter(Boolean);
      a.title = W(L, { fr: 'Ce que disent les fiches', ar: 'ما تقوله البطاقات', en: 'What the records say', ja: '記録からわかること' });
      a.reco = nameOf(top3[0].record, L) + ' — ' + top3[0].record.summary;
      a.expl = top3.map(function (r) { return nameOf(r.record, L) + S + verdictText(r.verdict, L) + W(L, { fr: ' pour cette parcelle', ar: ' لهذه القطعة', en: ' for this plot', ja: '（この区画）' }) + (r.adaptation ? ' — ' + r.adaptation.text : '') + (L === 'ja' ? '。' : '.'); });
      top3.slice(1).forEach(function (r) { a.expl.push(nameOf(r.record, L) + ' — ' + r.record.summary); });
      a.records = top3.map(function (r) { return r.record; });
      a.results = top3;
      a.actions = top3[0].record.actions.slice();
      a.data = dataUsed(dna, top3[0].checks.map(function (x) { return x.cond.field; }));
    }

    else if (intent.kind === 'health') {
      var hc = intent.crop || D.value(dna, 'crop'), cn = (CROP_NAME[L] || CROP_NAME.fr)[hc] || hc, dt = L === 'ja' ? '。' : '.';
      var known = VISION && VISION.stage2 && hc && VISION.stage2[hc] ? VISION.stage2[hc].classes.filter(function (c) { return c !== 'healthy'; }) : null;
      a.title = W(L, { fr: 'Garder les arbres et les cultures en bonne santé', ar: 'الحفاظ على صحة الأشجار والزراعات', en: 'Keeping trees and crops healthy', ja: '木と作物を健康に保つには' }) + (hc ? ' — ' + cn : '');
      a.reco = W(L, {
        fr: 'Prévenir plutôt que traiter : observer souvent, garder un feuillage aéré et sec, éviter le stress hydrique, et faire confirmer tout symptôme par un technicien avant un traitement.',
        ar: 'الوقاية خير من العلاج: راقب باستمرار، حافظ على أوراق مهوّاة وجافة، تجنّب العطش، واطلب من تقني تأكيد أي عرض قبل أي معالجة.',
        en: 'Prevent rather than treat: inspect often, keep the foliage airy and dry, avoid water stress, and have any symptom confirmed by a technician before any treatment.',
        ja: '治療より予防：こまめに観察し、葉の風通しを良く乾いた状態に保ち、水ストレスを避け、症状は処置の前に技術者に確認してもらいましょう。'
      });
      a.expl = W(L, {
        fr: ['Observer chaque semaine au printemps et après les pluies : dessus et dessous des feuilles, rameaux, fruits. Photographier une feuille douteuse dans Santé des plantes.',
          'Tailler pour aérer le centre de l’arbre ; enlever et détruire bois mort, feuilles et fruits malades (hygiène du verger).',
          'Arroser au pied (goutte-à-goutte), sans mouiller le feuillage ; ni manque ni excès d’eau : un arbre stressé tombe plus vite malade.',
          'Nourrir le sol : paillage et matière organique, fumure équilibrée, sans excès d’azote qui attire pucerons et maladies.',
          'Favoriser les auxiliaires : haies et bandes fleuries (inspiration satoyama), pièges de surveillance plutôt que traitements systématiques (lutte intégrée).'],
        ar: ['راقب كل أسبوع في الربيع وبعد الأمطار: وجه الأوراق وظهرها، الأغصان، الثمار. صوّر أي ورقة مشكوك فيها في صفحة صحة النباتات.',
          'قلّم لتهوية وسط الشجرة؛ أزل وأتلف الخشب الميت والأوراق والثمار المصابة (نظافة البستان).',
          'اسقِ عند الجذع (بالتقطير) دون ترطيب الأوراق؛ لا عطش ولا إفراط: الشجرة المجهدة تمرض أسرع.',
          'غذِّ التربة: تغطية ومادة عضوية وتسميد متوازن دون إفراط في الآزوت الذي يجذب المنّ والأمراض.',
          'شجّع الحشرات النافعة: سياجات وأشرطة مزهرة، ومصائد للمراقبة بدل المعالجة المنهجية (المكافحة المتكاملة).'],
        en: ['Inspect every week in spring and after rain: both sides of the leaves, shoots, fruit. Photograph a doubtful leaf in Plant health.',
          'Prune to open the centre of the tree; remove and destroy dead wood, diseased leaves and fruit (orchard hygiene).',
          'Water at the foot (drip), without wetting the foliage; neither too little nor too much: a stressed tree gets sick faster.',
          'Feed the soil: mulch and organic matter, balanced fertiliser, no excess nitrogen (it attracts aphids and disease).',
          'Encourage natural enemies: hedges and flower strips (satoyama-inspired), monitoring traps rather than routine spraying (integrated pest management).'],
        ja: ['春と雨の後は毎週観察する：葉の表と裏、新梢、果実。気になる葉は「植物の健康」で撮影する。',
          '剪定して樹冠の中心に風を通す。枯れ枝や病気の葉・果実は取り除いて処分する（園地の衛生）。',
          '株元に点滴で水やりし、葉をぬらさない。水不足も過剰も避ける：ストレスを受けた木は病気になりやすい。',
          '土を養う：マルチングと有機物、バランスのよい施肥。窒素のやりすぎはアブラムシや病気を招く。',
          '天敵を増やす：生け垣や花の帯（里山の考え方）、定期散布ではなく監視用トラップ（総合的病害虫管理）。']
      }).slice();
      var tmx = D.value(dna, 'climate.tmax_hot'), soc = D.value(dna, 'soil.soc');
      if (tmx !== null && tmx >= 35) a.expl.push(W(L, { fr: 'Sur cette parcelle, l’été est chaud (' + fmt(tmx, 1) + ' °C de max. moyen) : le stress thermique et hydrique affaiblit les arbres en juillet–août.', ar: 'في هذه القطعة الصيف حار (' + fmt(tmx, 1) + ' °م كمعدل أقصى): الإجهاد الحراري والمائي يضعف الأشجار في جويلية وأوت.', en: 'On this plot summers are hot (' + fmt(tmx, 1) + ' °C mean max.): heat and water stress weaken trees in July–August.', ja: 'この区画の夏は暑く（平均最高' + fmt(tmx, 1) + ' °C）、7〜8月の高温と水ストレスが木を弱らせます。' }));
      if (soc !== null && soc < 15) a.expl.push(W(L, { fr: 'Carbone organique du sol faible (' + fmt(soc) + ' g/kg, valeur régionale) : le paillage et le compost aident le sol et les racines.', ar: 'الكربون العضوي في التربة ضعيف (' + fmt(soc) + ' غ/كغ، قيمة جهوية): التغطية والسماد العضوي يساعدان التربة والجذور.', en: 'Low soil organic carbon (' + fmt(soc) + ' g/kg, regional value): mulch and compost help the soil and roots.', ja: '土壌有機炭素が少ない（' + fmt(soc) + ' g/kg、地域の値）：マルチングと堆肥が土と根を助けます。' }));
      if (hc) {
        if (known && known.length) a.expl.push(W(L, { fr: 'Pour ' + cn + ', le modèle de Santé des plantes reconnaît : ', ar: 'بالنسبة لـ' + cn + '، يتعرف نموذج صحة النباتات على: ', en: 'For ' + cn + ', the Plant health model recognises: ', ja: cn + 'について「植物の健康」のモデルが認識できるのは：' }) + known.map(function (c) { return c.replace(/_/g, ' '); }).join(', ') + dt);
        else a.expl.push(W(L, { fr: 'Culture « ' + cn + ' » : pas encore dans le modèle de Santé des plantes ; la page propose alors l’identification Pl@ntNet, et un technicien doit confirmer.', ar: cn + ' ليس بعد في نموذج صحة النباتات: تقترح الصفحة حينها التعرف عبر Pl@ntNet، ويجب أن يؤكد تقني النتيجة.', en: 'Crop “' + cn + '”: not in the Plant health model yet; the page then offers Pl@ntNet identification, and a technician must confirm.', ja: cn + 'はまだ「植物の健康」のモデルに含まれていません。ページではPl@ntNetによる同定を提案します。結果は技術者に確認してもらってください。' }));
      }
      if (/spot|tache|بقع|斑点/i.test(intent.q || '') && ['peach', 'almond', 'apricot', 'cherry', 'plum'].indexOf(hc) !== -1) a.expl.unshift(W(L, {
        fr: 'Connaissance générale (pas une fiche GAIA) : sur pêcher et amandier, des petites taches sombres qui se dessèchent et laissent des trous évoquent la criblure (Wilsonomyces) ou la bactériose (Xanthomonas arboricola pv. pruni), favorisées par les pluies d’automne et de printemps. À confirmer par un technicien.',
        ar: 'معرفة عامة (ليست بطاقة غايا): على الخوخ واللوز، البقع الداكنة الصغيرة التي تجف وتترك ثقوباً تشير إلى مرض التثقب (Wilsonomyces) أو التبقع البكتيري (Xanthomonas arboricola pv. pruni)، وتشجعهما أمطار الخريف والربيع. يجب أن يؤكدها تقني.',
        en: 'General knowledge (not a GAIA record): on peach and almond, small dark spots that dry out and leave holes point to shot-hole disease (Wilsonomyces) or bacterial spot (Xanthomonas arboricola pv. pruni), both favoured by autumn and spring rain. Have a technician confirm.',
        ja: '一般知識（GAIAの記録ではありません）：モモやアーモンドで、小さな黒い斑点が乾いて穴になる場合は、せん孔病（Wilsonomyces）や細菌性せん孔病（Xanthomonas arboricola pv. pruni）が疑われ、秋と春の雨で広がります。技術者に確認してください。' }));
      if (intent.followUp) a.expl.unshift(W(L, { fr: 'Réponse reprise pour : ', ar: 'الإجابة معدّلة لـ: ', en: 'Answer adjusted for: ', ja: '次の作物について回答：' }) + cn + dt);
      a.expl.push(W(L, { fr: 'GAIA ne prescrit aucun produit chimique : pour un traitement, voir le CRDA ou un technicien en protection des végétaux.', ar: 'لا تصف غايا أي مبيد كيميائي: للمعالجة، اتصل بالمندوبية الجهوية للفلاحة أو بتقني في وقاية النباتات.', en: 'GAIA prescribes no chemical product: for a treatment, ask the CRDA or a plant-protection technician.', ja: 'GAIAは化学薬剤を処方しません。処置は地域の農業局（CRDA）や植物防疫の技術者に相談してください。' }));
      a.actions = W(L, {
        fr: ['Photographier une feuille suspecte dans Santé des plantes.', 'Tailler et nettoyer le verger avant la saison des pluies.', 'Pailler au pied des arbres (voir la fiche Paillage).'],
        ar: ['صوّر ورقة مشكوكاً فيها في صفحة صحة النباتات.', 'قلّم ونظّف البستان قبل موسم الأمطار.', 'غطِّ التربة عند جذوع الأشجار (انظر بطاقة التغطية).'],
        en: ['Photograph a suspicious leaf in Plant health.', 'Prune and clean the orchard before the rainy season.', 'Mulch at the foot of the trees (see the Mulching record).'],
        ja: ['気になる葉を「植物の健康」で撮影する。', '雨季の前に剪定し、園地をきれいにする。', '木の株元をマルチングする（マルチングの記録を参照）。']
      });
      var mrec = get('x-mulch'), srec = get('jp-satoyama-layers');
      a.records = [mrec, srec].filter(Boolean).map(function (r) { return r.record; });
      a.results = [mrec, srec].filter(Boolean);
      a.data = dataUsed(dna, ['climate.tmax_hot', 'soil.soc', 'crop']);
    }

    else if (intent.kind === 'goal' || intent.kind === 'overview') {
      var mm = W(L, { fr: ' mm/an', ar: ' mm/سنة', en: ' mm/yr', ja: ' mm/年' }), dot = L === 'ja' ? '。' : '.';
      var ok = all.filter(function (r) { return r.verdict === 'feasible' || r.verdict === 'adapt'; });
      var byFam = function (f) { return ok.filter(function (r) { return r.record.families.indexOf(f) !== -1; })[0] || null; };
      var lbl = function (r) { return nameOf(r.record, L) + ' (' + verdictText(r.verdict, L) + (r.score !== null ? ', ' + fmt(r.score * 100) + ' %' : '') + ')'; };
      var wb = waterBalance(dna, intent.crop);
      var crop = intent.crop || D.value(dna, 'crop'), src2 = D.value(dna, 'water.source'), pump = D.value(dna, 'energy.pump'), ghi2 = D.value(dna, 'solar.ghi_kwh'), area = D.value(dna, 'area_ha');
      var waterRec = ok.filter(function (r) { return r.record.families.indexOf('water') !== -1 && r.verdict === 'feasible'; })[0] || byFam('water');
      var mulch = ok.filter(function (r) { return r.record.id === 'x-mulch'; })[0] || null;
      var layers = ok.filter(function (r) { return r.record.id === 'jp-satoyama-layers'; })[0] || null;
      var solarR = all.filter(function (r) { return r.record.id === 'jp-solar-sharing'; })[0];

      if (intent.kind === 'goal') {
        a.title = W(L, { fr: 'Comment tirer plus de cette parcelle', ar: 'كيف تحصل على مردود أكبر من هذه القطعة', en: 'How to get more from this plot', ja: 'この区画からもっと収益を上げるには' }) + (intent.crop ? ' — ' + ((CROP_NAME[L] || CROP_NAME.fr)[intent.crop] || intent.crop) : '');
        var levers = [];
        if (waterRec) levers.push(W(L, { fr: 'capter plus d’eau de pluie avec ', ar: 'جمع مزيد من مياه الأمطار بـ', en: 'capture more rainwater with ', ja: '雨水をより多く集める（' }) + nameOf(waterRec.record, L) + (L === 'ja' ? '）' : ''));
        if (mulch) levers.push(W(L, { fr: 'réduire l’évaporation par le paillage', ar: 'تقليل التبخر بالتغطية', en: 'cut evaporation with mulch', ja: 'マルチングで蒸発を減らす' }));
        if (pump && pump !== 'solar' && ghi2 !== null && ghi2 >= 4.5) levers.push(W(L, { fr: 'remplacer le diesel par le solaire, dans un quota d’eau', ar: 'استبدال الديزل بالطاقة الشمسية ضمن حصة ماء', en: 'replace diesel with solar, within a water quota', ja: '水の割当量の範囲でディーゼルを太陽光に置き換える' }));
        if (layers) levers.push(W(L, { fr: 'diversifier avec des cultures en étages', ar: 'التنويع بزراعات متعددة الطبقات', en: 'diversify with layered crops', ja: '多層の作付けで多角化する' }));
        a.reco = levers.length
          ? W(L, { fr: 'Sur cette parcelle, les leviers appuyés par les données sont : ', ar: 'في هذه القطعة، الروافع المدعومة بالبيانات هي: ', en: 'On this plot, the levers backed by the data are: ', ja: 'この区画でデータに裏付けられた手段は：' }) + levers.join(L === 'ja' ? '、' : L === 'ar' ? '، ' : ', ') + dot
          : W(L, { fr: 'Aucune technique de la bibliothèque ne remplit ses conditions ici : commencez par compléter le profil de la parcelle.', ar: 'لا توجد تقنية في المكتبة تستوفي شروطها هنا: ابدأ بإكمال ملف القطعة.', en: 'No practice in the library meets its conditions here: start by completing the plot profile.', ja: 'ライブラリのどの技術もここでは条件を満たしません。まず区画プロファイルを補ってください。' });
        // 1. water: the first limit on yield in a dry climate
        if (wb) {
          a.expl.push(W(L, { fr: 'Eau, premier facteur limitant : ', ar: 'الماء، العامل المحدِّد الأول: ', en: 'Water is the first limit: ', ja: '最大の制約は水：' }) +
            W(L, { fr: 'pluie ', ar: 'الأمطار ', en: 'rainfall ', ja: '降水量 ' }) + fmt(wb.rain) + mm + ', ET0 ' + fmt(wb.et0) + mm +
            (wb.irn !== null ? W(L, { fr: ' ; besoin net non couvert par la pluie pour ', ar: '؛ الحاجة الصافية غير المغطاة بالمطر لـ', en: '; net need not covered by rain for ', ja: '。雨で賄えない正味の必要水量（' }) + ((CROP_NAME[L] || CROP_NAME.fr)[crop] || E.valueLabel(crop)) + (L === 'ja' ? '）：' : S) + fmt(wb.irn) + ' mm ' + W(L, { fr: '(≈ ' + fmt(wb.irn * 10) + ' m³/ha, FAO-56)', ar: '(≈ ' + fmt(wb.irn * 10) + ' م³/هكتار، FAO-56)', en: '(≈ ' + fmt(wb.irn * 10) + ' m³/ha, FAO-56)', ja: '（約' + fmt(wb.irn * 10) + ' m³/ha、FAO-56）' }) : '') + dot);
          a.expl.push(W(L, { fr: 'Chaque millimètre capté compte : 1 mm sur 1 ha = 10 m³. La pluie qui tombe sur 1 ha ici représente ' + fmt(wb.rain * 10) + ' m³/an.', ar: 'كل مليمتر يُجمع مهم: 1 مم على هكتار واحد = 10 م³. الأمطار على هكتار واحد هنا تعادل ' + fmt(wb.rain * 10) + ' م³ في السنة.', en: 'Every millimetre captured counts: 1 mm on 1 ha = 10 m³. The rain falling on 1 ha here is ' + fmt(wb.rain * 10) + ' m³/yr.', ja: '集めた1 mmが大切です。1 haで1 mm = 10 m³。ここで1 haに降る雨は年' + fmt(wb.rain * 10) + ' m³です。' }));
        }
        if (waterRec) a.expl.push(W(L, { fr: 'Collecte de l’eau : ', ar: 'جمع الماء: ', en: 'Water harvesting: ', ja: '集水：' }) + ok.filter(function (r) { return r.record.families.indexOf('water') !== -1; }).slice(0, 3).map(lbl).join(L === 'ja' ? '、' : ', ') + dot);
        if (mulch) a.expl.push(W(L, { fr: 'Moins de pertes : ', ar: 'خسائر أقل: ', en: 'Fewer losses: ', ja: '損失を減らす：' }) + lbl(mulch) + W(L, { fr: ' — le paillage réduit l’évaporation du sol nu (FAO-56, chap. 11).', ar: ' — التغطية تقلل تبخر التربة العارية (FAO-56، الفصل 11).', en: ' — mulch reduces bare-soil evaporation (FAO-56, ch. 11).', ja: ' — マルチングは裸地からの蒸発を減らします（FAO-56 第11章）。' }));
        // 2. energy: the cost line a solar pump can remove
        if (pump === 'diesel' || pump === 'grid') {
          a.expl.push(W(L, { fr: 'Énergie : pompage déclaré ', ar: 'الطاقة: الضخ المصرّح به ', en: 'Energy: declared pumping ', ja: 'エネルギー：申告された揚水 ' }) + E.valueLabel(pump) + (ghi2 !== null ? W(L, { fr: ', soleil ' + fmt(ghi2, 1) + ' kWh/m²/j', ar: '، الإشعاع ' + fmt(ghi2, 1) + ' kWh/m²/يوم', en: ', sun ' + fmt(ghi2, 1) + ' kWh/m²/day', ja: '、日射 ' + fmt(ghi2, 1) + ' kWh/m²/日' }) : '') +
            W(L, { fr: '. Une pompe solaire dimensionnée sur le quota d’eau de la culture supprime la facture de carburant sans pousser au surpompage (page Eau & énergie).', ar: '. مضخة شمسية محسوبة على حصة ماء الزراعة تلغي فاتورة الوقود دون تشجيع الإفراط في الضخ (صفحة الماء والطاقة).', en: '. A solar pump sized to the crop’s water quota removes the fuel bill without encouraging over-pumping (Water & energy page).', ja: '。作物の水割当量に合わせた太陽光ポンプなら、過剰揚水を招かずに燃料費をなくせます（「水とエネルギー」ページ）。' }));
          if (src2 === 'rainfed') a.expl.push(W(L, { fr: 'Attention : la parcelle est déclarée pluviale ; sans puits ni réseau, une pompe n’a pas d’eau à pomper. Vérifiez ces deux champs.', ar: 'تنبيه: القطعة مصرّح بها بعلية؛ بلا بئر ولا شبكة لا تجد المضخة ماءً. تحقق من هذين الحقلين.', en: 'Note: the plot is declared rainfed; without a well or network a pump has no water to lift. Check these two fields.', ja: '注意：区画は天水と申告されています。井戸も灌漑網もなければポンプでくみ上げる水がありません。この2項目を確認してください。' }));
        }
        if (solarR && solarR.verdict !== 'rejected') a.expl.push(W(L, { fr: 'Revenu en plus : ', ar: 'دخل إضافي: ', en: 'Extra income: ', ja: '追加の収入：' }) + lbl(solarR) + W(L, { fr: ' — l’électricité des panneaux au-dessus de la culture, voir Agrivoltaïsme.', ar: ' — كهرباء الألواح فوق الزراعة، انظر صفحة الزراعة الضوئية.', en: ' — electricity from panels above the crop, see Agrivoltaics.', ja: ' — 作物の上のパネルによる電力。「営農型太陽光」を参照。' }));
        if (layers) a.expl.push(W(L, { fr: 'Diversifier : ', ar: 'التنويع: ', en: 'Diversify: ', ja: '多角化：' }) + lbl(layers) + W(L, { fr: ' — plusieurs productions sur la même surface répartissent le risque d’une mauvaise année.', ar: ' — عدة منتوجات على نفس المساحة توزّع خطر السنة السيئة.', en: ' — several products on the same area spread the risk of a bad year.', ja: ' — 同じ面積で複数の生産を行うと、不作の年のリスクが分散されます。' }));
        // 3. business model: no price is invented
        a.expl.push(W(L, { fr: 'Argent : la page Modèle économique calcule si un kit solaire payé à l’usage (PAYG) se rembourse par les économies de carburant, avec vos prix ; GAIA n’invente aucun prix ni rendement.', ar: 'المال: صفحة النموذج الاقتصادي تحسب إن كان طقم شمسي بالدفع حسب الاستعمال يسدَّد من توفير الوقود، بأسعارك أنت؛ غايا لا تخترع أي سعر أو مردود.', en: 'Money: the Business model page calculates whether a pay-as-you-go solar kit pays for itself from fuel savings, with your prices; GAIA does not invent any price or yield.', ja: 'お金：「ビジネスモデル」ページでは、従量課金（PAYG）の太陽光キットが燃料費の節約で回収できるかを、あなたの価格で計算します。GAIAは価格や収量を推測しません。' }));
        var demo = ['crop', 'area_ha', 'water.source', 'energy.pump'].filter(function (p) { var f = D.fieldAt(dna, p); return f && f.source === 'Valeur de démonstration'; });
        if (demo.length) a.expl.push(W(L, { fr: 'Valeurs de démonstration à remplacer : ', ar: 'قيم تجريبية يجب تعويضها: ', en: 'Demo values to replace: ', ja: '置き換えるべきデモ値：' }) + demo.map(G.fieldLabel).join(', ') + dot);
        a.actions = [];
        if (waterRec && waterRec.record.actions[0]) a.actions.push(nameOf(waterRec.record, L) + S + waterRec.record.actions[0]);
        a.actions = a.actions.concat(W(L, {
          fr: ['Calculer le besoin en eau mensuel et le quota dans Eau & énergie.', 'Saisir votre facture de carburant et le prix d’un kit dans Modèle économique.'],
          ar: ['احسب الحاجة الشهرية للماء والحصة في صفحة الماء والطاقة.', 'أدخل فاتورة الوقود وسعر الطقم في صفحة النموذج الاقتصادي.'],
          en: ['Calculate the monthly water need and quota in Water & energy.', 'Enter your fuel bill and a kit price in Business model.'],
          ja: ['「水とエネルギー」で月ごとの必要水量と割当量を計算する。', '「ビジネスモデル」に燃料費とキット価格を入力する。']
        }));
        a.records = [waterRec, mulch, solarR && solarR.verdict !== 'rejected' ? solarR : null, layers].filter(Boolean).map(function (r) { return r.record; });
        a.results = [waterRec, mulch, layers].filter(Boolean);
        a.data = dataUsed(dna, ['climate.rain_mm', 'climate.et0_mm', 'terrain.slope_pct', 'solar.ghi_kwh', 'crop', 'water.source', 'energy.pump']);
      } else {
        var count = function (v) { return all.filter(function (r) { return r.verdict === v; }).length; };
        a.title = W(L, { fr: 'Votre parcelle en bref', ar: 'قطعتك باختصار', en: 'Your plot at a glance', ja: '区画の概要' });
        a.reco = ok.length ? W(L, { fr: 'Technique la mieux adaptée : ', ar: 'أنسب تقنية: ', en: 'Best-suited practice: ', ja: '最も適した技術：' }) + lbl(ok[0]) + dot
          : W(L, { fr: 'Aucune technique retenue pour l’instant.', ar: 'لا توجد تقنية مناسبة حالياً.', en: 'No practice retained for now.', ja: '現時点で該当する技術はありません。' });
        a.expl.push(W(L, { fr: count('feasible') + ' faisables, ' + count('adapt') + ' avec adaptation, ' + count('rejected') + ' non recommandées.', ar: count('feasible') + ' ممكنة، ' + count('adapt') + ' مع التكييف، ' + count('rejected') + ' غير موصى بها.', en: count('feasible') + ' feasible, ' + count('adapt') + ' with adaptation, ' + count('rejected') + ' not recommended.', ja: '実施可能 ' + count('feasible') + '、調整すれば可能 ' + count('adapt') + '、推奨しない ' + count('rejected') + '。' }));
        if (wb) a.expl.push(W(L, { fr: 'Pluie ', ar: 'الأمطار ', en: 'Rainfall ', ja: '降水量 ' }) + fmt(wb.rain) + mm + ', ET0 ' + fmt(wb.et0) + mm + (wb.irn !== null ? W(L, { fr: ', besoin net non couvert ', ar: '، حاجة صافية غير مغطاة ', en: ', net need not covered ', ja: '、雨で賄えない正味の必要水量 ' }) + fmt(wb.irn) + ' mm' : '') + dot);
        a.expl.push(W(L, { fr: 'Vous pouvez demander par exemple : « Comment gagner plus avec cette parcelle ? », « Quelles sont les contraintes en eau ? », « Combien coûtent les jessour ? », « Quelles informations manquent ? »', ar: 'يمكنك أن تسأل مثلاً: «كيف أربح أكثر من هذه القطعة؟»، «ما هي قيود الماء؟»، «كم تكلف الجسور؟»، «ما المعلومات الناقصة؟»', en: 'You can ask, for example: “How can I earn more from this plot?”, “What are the water constraints?”, “How much do jessour cost?”, “What information is missing?”', ja: '例えば次のように質問できます：「この区画でもっと稼ぐには？」「水の制約は？」「ジェスールの費用は？」「足りない情報は？」' }));
        a.records = ok.slice(0, 3).map(function (r) { return r.record; });
        a.results = ok.slice(0, 3);
        a.actions = ok.length ? ok[0].record.actions.slice() : [];
        a.data = dataUsed(dna, ['climate.rain_mm', 'climate.et0_mm', 'terrain.slope_pct', 'water.source', 'crop']);
      }
    }

    else return insufficient(L);

    var res = a.results || [];
    a.conf = confidence(dna, res.length ? res : all, L);
    a.missing = (a.missing && a.missing.length ? a.missing.map(function (p) { return noteOf(dna, p); }) : []).concat(missingFor(dna, res)).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    a.lang = L;
    return a;
  }
  function insufficient(L) {
    return {
      title: W(L, { fr: 'Preuves insuffisantes', ar: 'أدلة غير كافية', en: 'Not enough evidence', ja: '根拠不足' }),
      reco: W(L, { fr: 'GAIA ne peut pas répondre sans inventer.', ar: 'لا أستطيع الإجابة دون اختلاق.', en: 'GAIA cannot answer without inventing.', ja: 'GAIAは推測で答えることはしません。' }),
      expl: [W(L, {
        fr: "Aucune fiche ni donnée de la parcelle ne couvre cette question. GAIA sait répondre sur : comment gagner plus ou quoi faire sur la parcelle, le sol, la pluie, la pente, le soleil, le pompage, la surface, et le coût, les risques, les acteurs ou les étapes d'une technique (jessour, tabia, meskat, oasis, citerne, paillage, tanada, solar sharing…).",
        ar: 'لا توجد بطاقة ولا بيانات تخص هذا السؤال. يمكنك السؤال عن: كيف تربح أكثر أو ماذا تفعل في القطعة، التربة، الأمطار، الانحدار، الشمس، الضخ، تكلفة أو مخاطر تقنية (الجسور، الطابية، المسقاة، الواحة…).',
        en: 'No record and no plot data cover this question. GAIA can answer about: how to earn more or what to do on the plot, soil, rainfall, slope, sun, pumping, area, and the cost, risks, actors or steps of a practice (jessour, tabia, meskat, oasis, cistern, mulching, tanada, solar sharing…).',
        ja: 'この質問に対応する記録も区画データもありません。GAIAが答えられるのは、収益を上げる方法や区画でやるべきこと、土壌・降水量・傾斜・日射・揚水・面積と、各技術（ジェスール、タビア、メスカット、オアシス、貯水槽、マルチング、棚田、ソーラーシェアリングなど）のコスト・リスク・関係者・手順です。'
      })],
      records: [], data: [], actions: [], missing: [], conf: { level: 'low', why: W(L, { fr: 'aucune preuve', ar: 'لا توجد أدلة', en: 'no evidence', ja: '根拠なし' }) }, lang: L, insufficient: true };
  }

  /* ---------------------------------------------------------- render */
  var SEC = {
    fr: { s_reco: 'Recommandation', s_expl: 'Explication', s_rec: 'Fiche technique', s_data: 'Données utilisées', s_conf: 'Confiance', s_miss: 'Informations manquantes', s_act: 'Actions' },
    ar: { s_reco: 'التوصية', s_expl: 'الشرح', s_rec: 'البطاقة التقنية', s_data: 'البيانات المستعملة', s_conf: 'درجة الثقة', s_miss: 'معلومات ناقصة', s_act: 'الخطوات' },
    en: { s_reco: 'Recommendation', s_expl: 'Explanation', s_rec: 'Technical record', s_data: 'Data used', s_conf: 'Confidence', s_miss: 'Missing information', s_act: 'Actions' },
    ja: { s_reco: '推奨', s_expl: '説明', s_rec: '技術記録', s_data: '使用したデータ', s_conf: '信頼度', s_miss: '欠けている情報', s_act: '行動' }
  };
  function sec(title, body) { return el('div', { class: 'sec' }, [el('h4', null, [title])].concat(body)); }
  function renderAnswer(a) {
    var L = a.lang, T = function (k) { return (SEC[L] || SEC.fr)[k]; };
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

  /* ---------------------------------------------------------- language model (js/lab-llm.js) */
  var LLM = window.GAIA_LLM, history = [];
  function llmOn() { var m = LLM && LLM.state().mode; return m === 'server' || m === 'browser'; }
  function withLLM(q, a, dna, card, details) {
    var prof = {};
    D.walk(dna).forEach(function (x) { if (x.f && x.f.status === 'ok' && x.f.value !== null && typeof x.f.value !== 'object') prof[x.path] = { value: x.f.value, unit: x.f.unit || null, source: x.f.source || null, confidence: x.f.confidence || null }; });
    var recs = a.records.length ? a.records : KB.records; // nothing retrieved: let the model look at every record, and say so if none applies
    var verdicts = E.evaluateAll(dna).map(function (r) { return { id: r.record.id, verdict: r.verdict, score: r.score }; });
    var lang = R.lang(q) === 'en' ? 'en' : a.lang;
    var payload = { question: q, lang: lang, answer: { title: a.title, reco: a.reco, expl: a.expl, actions: a.actions, missing: a.missing, insufficient: !!a.insufficient }, profile: prof, verdicts: verdicts, records: recs, history: history.slice(-4) };
    var turn = { q: q, a: a.reco + ' ' + a.expl.slice(0, 3).join(' ') };
    history.push(turn);
    var box = el('div', { class: 'llm' }, [el('p', { class: 'small muted' }, [el('span', { class: 'gp-spin' }), ' ', t('thinking')])]);
    card.insertBefore(box, card.firstChild);
    var evidence = JSON.stringify(Object.assign({}, payload, { history: [] })); // a figure the model said earlier is not evidence
    function show(text, final, who) {
      G.clear(box);
      var bad = final ? LLM.unverified(text, evidence) : [];
      box.appendChild(LLM.render(text, bad));
      if (final) {
        box.appendChild(el('p', { class: 'small muted', style: 'margin-top:6px' }, [G.pill('live', 'LLM'), ' ', who]));
        if (bad.length) box.appendChild(G.note('info', t('unv_note')));
      }
    }
    LLM.ask(payload, function (partial) { show(partial, false); })
      .then(function (res) {
        var text = String(res.text || '').trim();
        if (!text) throw new Error('empty');
        show(text, true, res.provider === 'browser' ? 'Qwen2.5 1.5B · WebGPU' : (res.provider || '') + (res.model ? ' · ' + res.model : ''));
        turn.a = text;
      })
      .catch(function () { G.clear(box); box.appendChild(G.note('info', t('llm_err'))); details.open = true; });
  }

  function modeLine() {
    var st = LLM ? LLM.state() : { mode: 'none' }, kids;
    var fill = function (k) { return t(k).replace('{m}', LLM.label()); };
    if (st.mode === 'server') kids = [G.pill('live', 'LLM · ' + LLM.label()), fill('mode_srv')];
    else if (st.mode === 'browser') kids = [G.pill('live', 'LLM · ' + LLM.label()), fill('mode_br')];
    else if (st.loading) {
      var bar = el('progress', { max: '1', value: String(st.loading.p || 0), style: 'width:140px' });
      kids = [G.pill('plan', 'LLM'), t('loading') + ' ' + fmt((st.loading.p || 0) * 100) + ' %', bar];
    } else if (st.checking) kids = [el('span', { class: 'gp-spin' }), t('checking')];
    else {
      kids = [G.pill('plan', 'LLM · off'), t('mode_none')];
      if (st.error === 'no_webgpu') kids.push(el('span', null, [t('no_webgpu')]));
      else if (st.error === 'load_failed') kids.push(el('span', null, [t('load_fail')]));
      if (LLM && LLM.webgpu() && st.error !== 'load_failed') kids.push(el('button', { type: 'button', class: 'gp-btn', onclick: function () { LLM.loadBrowser(); } }, [t('btn_load')]));
      else if (LLM && !LLM.webgpu() && st.error !== 'no_webgpu') kids.push(el('span', null, [t('no_webgpu')]));
      if (LLM) kids.push(el('button', { type: 'button', class: 'gp-btn ghost', onclick: function () { LLM.recheck(); } }, [t('recheck')]));
    }
    return el('div', { class: 'mode', id: 'llm-mode' }, kids);
  }
  if (LLM) {
    LLM.on(function () { var m = document.getElementById('llm-mode'); if (m) m.replaceWith(modeLine()); });
    LLM.start();
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
    if (llmOn()) {
      // the model's answer goes first; the rule-based sections stay one click away
      var details = el('details', { class: 'rules' }, [el('summary', null, [t('details')])]);
      while (card.firstChild) details.appendChild(card.firstChild);
      card.appendChild(details);
      threadBox.appendChild(card);
      withLLM(q, a, p.dna, card, details);
    } else {
      threadBox.appendChild(card);
      history.push({ q: q, a: a.reco });
    }
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
          el('div', null, [t('k_rain'), el('b', null, [V('climate.rain_mm') === null ? '—' : fmt(V('climate.rain_mm')) + ' ' + t('u_mm_yr')])]),
          el('div', null, [t('k_slope'), el('b', null, [V('terrain.slope_pct') === null ? '—' : fmt(V('terrain.slope_pct'), 1) + ' %'])]),
          el('div', null, [t('k_water'), el('b', null, [V('water.source') ? E.valueLabel(V('water.source')) : '—'])]),
          el('div', null, [t('k_crop'), el('b', null, [V('crop') ? E.valueLabel(V('crop')) : '—'])]),
          el('div', null, [t('k_ghi'), el('b', null, [V('solar.ghi_kwh') === null ? '—' : fmt(V('solar.ghi_kwh'), 2) + ' ' + t('u_kwh_day')])])
        ]),
        el('a', { class: 'small', href: 'land.html', style: 'display:inline-block;margin-top:10px' }, [t('nav_land') + ' →'])
      ]),
      el('div', { class: 'gp-card' }, [el('p', { class: 'eyebrow' }, [t('ask')]),
        el('div', { class: 'qs', style: 'margin-top:8px' }, ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'].map(function (k) {
          return el('button', { type: 'button', onclick: function () { ask(t(k)); } }, [t(k)]);
        }))])
    ]);
    var main = el('section', { 'aria-label': t('conv') }, [
      el('div', { id: 'thread', class: 'thread', 'aria-live': 'polite' }),
      el('div', { class: 'composer' }, [
        el('form', { onsubmit: function (e) { e.preventDefault(); var i = document.getElementById('qin'); var v = i.value.trim(); if (v) { ask(v); i.value = ''; } } }, [
          el('label', { for: 'qin', class: 'sr' }, [t('ph')]),
          el('input', { id: 'qin', type: 'text', placeholder: t('ph'), autocomplete: 'off' }),
          el('button', { class: 'gp-btn primary', type: 'submit' }, [t('send')])
        ]),
        modeLine()
      ])
    ]);
    app.appendChild(el('div', { class: 'lab' }, [ctx, main]));
  }

  render();
  G.onLang(render);
}());
