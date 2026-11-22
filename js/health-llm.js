/* ==========================================================================
   Plant health: "what is it, what can I do?" explained by a language model.

   The model does not see the photo. It reads the evidence of the page (GAIA's
   vision result, the two Pl@ntNet results, their confidence), a short fact
   sheet and what the farmer describes. How sure we are is computed here, never
   by the model. Lines with a product dose are removed before display.

   Connection: the same as the AI Lab (lab-llm.js): the GAIA server
   (POST /leaf/explain) or the free model in the browser.
   ========================================================================== */
(function (global) {
  'use strict';
  var G = global.GAIA, LLM = global.GAIA_LLM, el = G.el, t = G.t;

  G.addStrings({
    fr: { lx_t: "C'est quoi, et que faire ?", lx_p: "Une IA explique le résultat en mots simples et propose des premiers gestes sûrs. Elle ne voit pas la photo : elle lit les résultats ci-dessus et ce que vous décrivez.",
      lx_see: 'Ce que vous voyez (facultatif)', lx_see_ph: 'Ex. : taches brunes, feuilles collantes, petits insectes dessous…', lx_btn: 'Expliquer et proposer une solution', lx_again: 'Redemander', lx_load: "L'IA lit les résultats…",
      lx_anom: 'Anomalies possibles (Pl@ntNet)', lx_need_pn: 'Pour une solution par anomalie, envoyez d’abord la photo à Pl@ntNet (bouton plus haut).', lx_what: "C'est quoi", lx_do: 'Que faire maintenant', lx_check: 'À vérifier', lx_conf: 'Certitude', lx_c_good: 'bonne', lx_c_medium: 'moyenne', lx_c_low: 'faible', lx_c_unknown: 'inconnue',
      lx_c_unknown_p: "GAIA n'a pas reconnu de maladie sur cette photo : les conseils restent généraux.", lx_cut: 'Une ligne contenant une dose a été retirée.',
      lx_none: "Aucun modèle de langage n'est connecté.", lx_o1: 'Gratuit, rapide : créez une clé sur console.groq.com/keys, écrivez GAIA_LLM_PROVIDER=groq et GAIA_LLM_API_KEY=votre_clé dans backend/.env (jamais dans .env.example), puis « Vérifier ».',
      lx_o2: 'Gratuit, sans clé : un petit modèle dans ce navigateur (environ 1 Go à télécharger une fois).', lx_o2b: 'Télécharger le modèle (1 Go)', lx_recheck: 'Vérifier', lx_dl: 'Téléchargement du modèle', lx_nogpu: "Ce navigateur ne peut pas faire tourner le modèle (WebGPU absent).", lx_err: "L'IA n'a pas répondu : " },
    ar: { lx_t: 'ما هذا، وماذا أفعل؟', lx_p: 'يشرح الذكاء الاصطناعي النتيجة بكلمات بسيطة ويقترح خطوات أولى آمنة. هو لا يرى الصورة: يقرأ النتائج أعلاه وما تصفه.',
      lx_see: 'ما الذي تراه (اختياري)', lx_see_ph: 'مثال: بقع بنية، أوراق لزجة، حشرات صغيرة تحت الورقة…', lx_btn: 'اشرح واقترح حلاً', lx_again: 'اسأل مجدداً', lx_load: 'الذكاء الاصطناعي يقرأ النتائج…',
      lx_anom: 'تشوهات محتملة (Pl@ntNet)', lx_need_pn: 'للحصول على حل لكل حالة، أرسل الصورة أولاً إلى Pl@ntNet (الزر أعلاه).', lx_what: 'ما هذا', lx_do: 'ماذا أفعل الآن', lx_check: 'للتحقق', lx_conf: 'درجة اليقين', lx_c_good: 'جيدة', lx_c_medium: 'متوسطة', lx_c_low: 'ضعيفة', lx_c_unknown: 'غير معروفة',
      lx_c_unknown_p: 'لم يتعرف GAIA على مرض في هذه الصورة: تبقى النصائح عامة.', lx_cut: 'حُذف سطر يحتوي على جرعة.',
      lx_none: 'لا يوجد نموذج لغوي متصل.', lx_o1: 'مجاني وسريع: أنشئ مفتاحاً في console.groq.com/keys، واكتب GAIA_LLM_PROVIDER=groq و GAIA_LLM_API_KEY=مفتاحك في backend/.env (وليس في .env.example)، ثم «تحقق».',
      lx_o2: 'مجاني بلا مفتاح: نموذج صغير داخل هذا المتصفح (حوالي 1 غيغابايت مرة واحدة).', lx_o2b: 'تنزيل النموذج (1 غيغابايت)', lx_recheck: 'تحقق', lx_dl: 'تنزيل النموذج', lx_nogpu: 'هذا المتصفح لا يستطيع تشغيل النموذج (لا يوجد WebGPU).', lx_err: 'لم يُجب الذكاء الاصطناعي: ' },
    en: { lx_t: 'What is it, and what can I do?', lx_p: 'An AI explains the result in plain words and suggests safe first steps. It does not see the photo: it reads the results above and what you describe.',
      lx_see: 'What you see (optional)', lx_see_ph: 'E.g. brown spots, sticky leaves, small insects underneath…', lx_btn: 'Explain and suggest a solution', lx_again: 'Ask again', lx_load: 'The AI is reading the results…',
      lx_anom: 'Possible anomalies (Pl@ntNet)', lx_need_pn: 'For a solution per anomaly, first send the photo to Pl@ntNet (button above).', lx_what: 'What it is', lx_do: 'What to do now', lx_check: 'To check', lx_conf: 'Certainty', lx_c_good: 'good', lx_c_medium: 'medium', lx_c_low: 'low', lx_c_unknown: 'unknown',
      lx_c_unknown_p: 'GAIA did not recognise a disease on this photo: the advice stays general.', lx_cut: 'A line containing a dose was removed.',
      lx_none: 'No language model is connected.', lx_o1: 'Free and fast: create a key at console.groq.com/keys, write GAIA_LLM_PROVIDER=groq and GAIA_LLM_API_KEY=your_key in backend/.env (never in .env.example), then "Check".',
      lx_o2: 'Free, no key: a small model in this browser (about 1 GB, downloaded once).', lx_o2b: 'Download the model (1 GB)', lx_recheck: 'Check', lx_dl: 'Downloading the model', lx_nogpu: 'This browser cannot run the model (no WebGPU).', lx_err: 'The AI did not answer: ' },
    ja: { lx_t: 'これは何？どうすればいい？', lx_p: 'AIが結果をわかりやすく説明し、安全な最初の対応を提案します。AIは写真を見ません。上の結果とあなたの説明を読みます。',
      lx_see: '見えている症状（任意）', lx_see_ph: '例：茶色い斑点、べたつく葉、葉裏の小さな虫…', lx_btn: '説明と対策を見る', lx_again: 'もう一度聞く', lx_load: 'AIが結果を読んでいます…',
      lx_anom: '考えられる異常（Pl@ntNet）', lx_need_pn: '異常ごとの対策を見るには、先に上のボタンで写真をPl@ntNetに送ってください。', lx_what: 'これは何か', lx_do: '今すること', lx_check: '確認すること', lx_conf: '確かさ', lx_c_good: '良い', lx_c_medium: '中程度', lx_c_low: '低い', lx_c_unknown: '不明',
      lx_c_unknown_p: 'この写真では病気を認識できませんでした。助言は一般的な内容です。', lx_cut: '用量を含む行を削除しました。',
      lx_none: '言語モデルが接続されていません。', lx_o1: '無料で高速：console.groq.com/keys でキーを作成し、backend/.env に GAIA_LLM_PROVIDER=groq と GAIA_LLM_API_KEY=キー を書き（.env.example には書かない）、「確認」を押します。',
      lx_o2: '無料・キー不要：このブラウザ内の小型モデル（初回のみ約1 GB）。', lx_o2b: 'モデルをダウンロード（1 GB）', lx_recheck: '確認', lx_dl: 'モデルをダウンロード中', lx_nogpu: 'このブラウザではモデルを実行できません（WebGPUなし）。', lx_err: 'AIが応答しませんでした：' }
  });

  /* Draft fact sheets: [what it is, safe first steps, regulated?]. General agronomy, no product, not validated by an agronomist. */
  var F = {
    'citrus/black_spot': ['Fungal disease of citrus; spots on fruit and leaves, spread by fallen leaves and rain.', 'Collect and remove fallen leaves and fruit; avoid wetting leaves; open the canopy.', 1],
    'citrus/canker': ['Bacterial disease; raised corky spots with a yellow halo, spread by rain, wind, tools.', 'Do not prune when wet; disinfect tools; do not move leaves, fruit or plants.', 1],
    'citrus/die_back': ['Twigs drying from the tip; several possible causes (drought, salt, root or wood problems).', 'Cut dry wood back to healthy wood with clean tools; check watering, salinity and drainage.'],
    'citrus/greening': ['Bacterial disease spread by psyllid insects and infected plants; no cure.', 'Do not move plants or graft wood; have it confirmed by a laboratory.', 1],
    'citrus/mealybugs': ['White cottony sap-sucking insects; sticky honeydew and black sooty mould.', 'Remove heavily infested twigs; wash with water; keep ants off the trunk; protect natural enemies.'],
    'citrus/powdery_mildew': ['Fungus forming a white powder on young leaves.', 'Remove affected shoots; let air and light in; avoid too much nitrogen.'],
    'citrus/shot_hole': ['Small round holes in the leaves; several possible causes.', 'Remove fallen leaves; avoid wetting the leaves; look for insects.'],
    'citrus/spiny_whitefly': ['Small black spiny sap-sucking insects under the leaves; honeydew and sooty mould.', 'Remove infested leaves; keep the canopy open; do not move infested plants.', 1],
    'grape/bacterial_leaf_spot': ['Bacterial leaf spots, favoured by wet weather.', 'Avoid working when wet; remove spotted leaves; disinfect tools.'],
    'grape/black_rot': ['Fungus; brown leaf spots and shrivelled black berries.', 'Remove mummified berries and infected leaves; open the canopy.'],
    'grape/downy_mildew': ['Water mould; oily yellow spots above and white down below the leaf, after warm wet weather.', 'Remove infected leaves; open the canopy; avoid overhead watering.'],
    'grape/esca': ['Fungal disease of the wood; tiger-striped leaves; no cure.', 'Mark the vine; prune it last with clean tools, in dry weather; remove and destroy dead wood.'],
    'grape/isariopsis_leaf_spot': ['Fungal leaf spot, often late in the season on lower leaves.', 'Remove fallen leaves; open the canopy.'],
    'grape/powdery_mildew': ['Fungus; grey-white powder on leaves and berries, favoured by warm shade.', 'Open the canopy; remove affected shoots; avoid too much nitrogen.'],
    'olive/aculus_olearius': ['Microscopic mites deforming young leaves and fruit; often minor.', 'Look with a magnifier on young shoots; protect natural enemies; avoid too much nitrogen.'],
    'olive/peacock_spot': ['Fungus; round spots with a halo on the leaves, then leaf fall; favoured by wet cool weather.', 'Prune to let air in; avoid wetting leaves; remove fallen leaves.'],
    'palm/black_scorch': ['Fungal disease; black burnt-looking tissue on leaves and bud.', 'Remove and destroy affected parts with clean tools; avoid wounds; call a technician quickly.'],
    'palm/dubas': ['Dubas bug: sap-sucking insect producing a lot of sticky honeydew.', 'Remove old fronds; wash honeydew; avoid too dense planting.'],
    'palm/fusarium_wilt': ['Soil fungus wilting the palm one frond side first (the bayoud form is very serious); no cure.', 'Do not move offshoots, soil or water from the plot; mark the palm.', 1],
    'palm/honeydew': ['Sticky liquid left by sap-sucking insects; it feeds black sooty mould.', 'Look for insects under the leaflets; wash the leaves.'],
    'palm/leaf_spots': ['Leaf spots, often fungal, favoured by humidity.', 'Cut and remove the most affected fronds; improve air flow.'],
    'palm/magnesium_deficiency': ['Possible lack of magnesium: yellow edges on old fronds.', 'Have a soil and leaf analysis done before adding anything.'],
    'palm/manganese_deficiency': ['Possible lack of manganese: weak, pale new fronds; frequent in alkaline soil.', 'Have a soil and leaf analysis done before adding anything.'],
    'palm/potassium_deficiency': ['Possible lack of potassium: spots and burnt tips on old fronds.', 'Have a soil and leaf analysis done before adding anything; do not cut all old fronds.'],
    'palm/parlatoria_blanchardi': ['White scale: small grey-white insects stuck on the fronds.', 'Remove and destroy the most infested fronds; protect natural enemies; do not move infested offshoots.'],
    'palm/rachis_blight': ['Fungal disease of the frond midrib; fronds dry out.', 'Cut and remove affected fronds with clean tools; avoid wounds.'],
    'pepper/bacterial_spot': ['Bacterial leaf and fruit spots, spread by water splashes, seed and hands.', 'Do not touch wet plants; water at the foot; remove affected plants; rotate crops.'],
    'potato/bacterial': ['Bacterial disease (wilt or rot); spread by tubers, water and tools.', 'Remove sick plants; do not keep tubers as seed; clean tools; rotate crops; have it confirmed.', 1],
    'potato/fungal_leaf_spot': ['Fungal leaf spots such as early blight; brown spots with rings.', 'Water at the foot in the morning; remove lower spotted leaves; rotate crops.'],
    'potato/late_blight': ['Water mould; dark wet spots spreading very fast in cool wet weather.', 'Remove and destroy sick plants at once; stop overhead watering; warn neighbours; call a technician today.'],
    'potato/nematode': ['Microscopic worms of the roots; weak, yellow patches in the field.', 'Dig a root to look; rotate crops; do not move soil; have the soil analysed.', 1],
    'potato/pest_damage': ['Insect damage on the leaves.', 'Look under the leaves in the early morning; pick off insects and eggs by hand; protect natural enemies.'],
    'potato/virus': ['Virus; mosaic, rolled or stunted leaves; no cure; spread by insects and seed tubers.', 'Remove sick plants; use healthy certified seed; control weeds.'],
    'tomato/bacterial_spot': ['Bacterial spots spread by water splashes, seed and hands.', 'Do not touch wet plants; water at the foot; remove sick leaves; rotate crops.'],
    'tomato/early_blight': ['Fungus; brown spots with rings, starting on old leaves.', 'Remove lower spotted leaves; mulch; water at the foot in the morning; rotate crops.'],
    'tomato/late_blight': ['Water mould; dark wet spots spreading very fast in cool wet weather.', 'Remove and destroy sick plants at once; stop overhead watering; ventilate the greenhouse; call a technician today.'],
    'tomato/leaf_miner': ['Insect larvae digging pale tunnels in the leaf.', 'Remove mined leaves; use insect traps and nets; protect natural enemies.'],
    'tomato/leaf_mold': ['Fungus of humid greenhouses; yellow spots above, olive mould below.', 'Ventilate; reduce humidity; remove sick leaves; water in the morning.'],
    'tomato/magnesium_deficiency': ['Possible lack of magnesium: yellow between the veins of old leaves.', 'Have a soil analysis done before adding anything; check watering.'],
    'tomato/mosaic_virus': ['Virus spread by hands, tools and seed; no cure.', 'Remove sick plants; wash hands and tools; do not keep the seeds.'],
    'tomato/nitrogen_deficiency': ['Possible lack of nitrogen: old leaves pale yellow, slow growth.', 'Have a soil analysis done; add mature compost; check watering.'],
    'tomato/septoria_leaf_spot': ['Fungus; many small spots with a grey centre on lower leaves.', 'Remove lower leaves; mulch; water at the foot; rotate crops.'],
    'tomato/spider_mites': ['Tiny mites under the leaf; pale dots and fine webs, in hot dry weather.', 'Look under the leaves with a magnifier; rinse with water; remove very infested leaves; avoid drought stress.'],
    'tomato/spotted_wilt_virus': ['Virus spread by thrips; bronze leaves and rings; no cure.', 'Remove sick plants; control weeds; use insect nets.'],
    'tomato/target_spot': ['Fungus; brown spots with rings like a target.', 'Remove sick leaves; improve air flow; water at the foot.'],
    'tomato/yellow_leaf_curl_virus': ['Virus spread by whiteflies; small curled yellow leaves; no cure.', 'Remove sick plants; use insect nets and healthy plants; control weeds.']
  };
  F['palm/dubas_bug'] = F['palm/dubas'];

  function pc(x) { return x === null || x === undefined ? null : Math.round(100 * x) + ' %'; }

  /* What the models found, and how sure: computed here, never by the language model. */
  function evidence(state, PL, label) {
    var r = state.result, ok = r && !r.error, plantKnown = ok && (r.manual || (!r.doubt && (r.routed || !r.stage1.abstain))) && r.tree !== 'other', s2 = plantKnown ? r.stage2 : null;
    var pn = state.pn && state.pn.status === 'done' && state.pn.data && !state.pn.data.not_a_plant ? state.pn.data : null;
    var dis = s2 && !s2.abstain ? s2.top : null, sure = 'unknown', fact = dis ? F[r.tree + '/' + dis.label] : null;
    if (dis) {
      var pp = r.manual ? 1 : r.routed ? r.routed.p : r.stage1.top.p, m = Math.min(pp, dis.p);
      sure = m >= 0.8 ? 'good' : m >= 0.5 ? 'medium' : 'low';
      if (sure === 'good' && (r.manual || (state.quality && state.quality.overall !== 'pass'))) sure = 'medium';
    }
    var ev = { certainty: sure,
      gaia_plant: plantKnown ? r.tree : 'not recognised', gaia_plant_confidence: plantKnown && r.manual ? 'chosen by the farmer' : plantKnown ? pc(r.routed ? r.routed.p : r.stage1.top.p) : null,
      gaia_result: dis ? dis.label.replace(/_/g, ' ') : 'no disease recognised', gaia_result_confidence: dis ? pc(dis.p) : null,
      photo_quality: state.quality ? state.quality.overall : null,
      species_on_device: PL.status === 'done' && PL.top ? PL.top.slice(0, 3).filter(function (s) { return s.p >= 0.3; }).map(function (s) { return { species: s.species, family: s.family, confidence: pc(s.p) }; }) : null };
    if (pn) {
      ev.species_online_plantnet = (pn.species || []).slice(0, 2).map(function (s) { return { species: s.scientific_name, common: (s.common_names || [])[0] || null, confidence: pc(s.score) }; });
      // every suggested anomaly, with its score: the server replaces Pl@ntNet's codes by their names
      var d = (pn.diseases || []).slice(0, 3);
      if (d.length) ev.possible_anomalies = d.map(function (x) { return { code: x.label, confidence: pc(x.score) }; });
    }
    // the names of the page, already translated: the model must not translate a disease name itself
    if (ok && r.doubt && !r.manual) ev.plant_doubt = 'GAIA and Pl@ntNet disagree on the plant: the plant is not known';
    if (label && plantKnown) ev.names_to_use = { plant: label(r.tree), result: dis ? label(dis.label) : null };
    if (fact) { ev.fact_sheet_draft = { what: fact[0], safe_first_steps: fact[1], regulated: !!fact[2] }; }
    return ev;
  }

  /* ---------------------------------------------------------- safety: no product dose on screen */
  var DOSE = /\d+(?:[.,]\d+)?\s*(?:ml|cl|cc|mg|g|gr|kg|l|lt|litres?|liters?|grammes?|grams?|مل|غ|غرام|كغ|لتر|グラム|リットル|キロ)\s*(?:\/|par|per|for|pour|of|de|dans|in|لكل|في|من|につき)\s*\S*/i;
  function safe(text) {
    var cut = false;
    var out = text.split('\n').filter(function (l) { if (DOSE.test(l)) { cut = true; return false; } return true; }).join('\n');
    return { text: out, cut: cut };
  }
  function sections(text) {
    var o = {}, cur = null, rest = [];
    text.split('\n').forEach(function (l) {
      var m = l.match(/^\s*[#*\s]*\b(WHAT|DO|CHECK)\b[\s*:]*$/);
      if (m) { cur = m[1]; o[cur] = o[cur] || []; return; }
      if (cur) o[cur].push(l); else rest.push(l);
    });
    return { what: (o.WHAT || rest).join('\n').trim(), act: (o.DO || []).join('\n').trim(), check: (o.CHECK || []).join('\n').trim() };
  }

  /* ---------------------------------------------------------- asking */
  var BROWSER_SYSTEM = "You are GAIA's plant health assistant for small farms in Tunisia. You do not see the photo: use only EVIDENCE. " +
    'Write three parts with these markers alone on a line: "## WHAT" (1-3 sentences: what it probably is and how sure), "## DO" (3-5 "- " lines, safest first), "## CHECK" (1-3 "- " lines). ' +
    'If certainty is unknown or low: say it is not certain, state no disease as a fact, give only general safe steps. If healthy: only monitoring. If regulated: do not move plants, call the CRDA. ' +
    'Write the plant and the problem exactly as in names_to_use. Never give a pesticide name, dose or price; for treatment say ask the CRDA technician. Keep markers in English, write the rest ONLY in LANG, at most 150 words.';
  var LANG_NAME = { fr: 'French', ar: 'Arabic', en: 'English', ja: 'Japanese' };
  function serverAsk(ev) {
    return fetch(LLM.state().server.replace(/\/assistant$/, '/leaf/explain'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evidence: ev, lang: G.lang() }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error((j.detail && j.detail.message) || ('HTTP ' + r.status)); return j; }); });
  }
  function browserAsk(ev) {
    return LLM.state().engine.chat.completions.create({ temperature: 0.2, max_tokens: 500, messages: [{ role: 'system', content: BROWSER_SYSTEM },
      { role: 'user', content: 'EVIDENCE:\n' + JSON.stringify(ev) + '\n\nLANG: ' + (LANG_NAME[G.lang()] || 'French') }] })
      .then(function (r) { return { text: (r.choices[0].message.content || '').trim(), model: LLM.BROWSER_MODEL }; });
  }
  function ask(ev) {
    var st = LLM.state();
    if (st.mode === 'server' && st.server) return serverAsk(ev).catch(function (e) { if (st.engine) return browserAsk(ev); throw e; });
    if (st.engine) return browserAsk(ev);
    return Promise.reject(new Error('no model'));
  }

  /* ---------------------------------------------------------- card */
  var S = { key: null, img: null, see: '', status: 'idle', out: null, ev: null, err: null }, run = 0, box = null, args = null, listening = false;

  function draw() {
    if (!box || !args) return;
    var state = args[0], PL = args[1], st = LLM.state(), ev = evidence(state, PL, args[2]), ready = (st.mode === 'server' && st.server) || st.engine;
    G.clear(box);
    function add(n) { if (n) box.appendChild(n); }
    add(el('h3', null, [t('lx_t')]));
    add(el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('lx_p')]));
    var kind = { good: 'ok', medium: 'adapt', low: 'unk', unknown: 'unk' }[ev.certainty];
    add(el('p', { style: 'margin-top:10px' }, [G.pill(kind, t('lx_conf') + ' : ' + t('lx_c_' + ev.certainty))]));
    if (ev.certainty === 'unknown') add(el('p', { class: 'small muted', style: 'margin-top:4px' }, [ev.possible_anomalies ? t('lx_c_unknown_p').split(/[:：]/)[0].trim() + '.' : t('lx_need_pn')]));
    if (st.checking) { add(el('p', { class: 'small muted', style: 'margin-top:8px' }, [el('span', { class: 'gp-spin' }), ' …'])); return; }
    if (!ready) {
      add(el('div', { style: 'margin-top:10px' }, [G.note('info', t('lx_none'))]));
      add(el('p', { class: 'small', style: 'margin-top:8px' }, [t('lx_o1')]));
      add(el('button', { type: 'button', class: 'gp-btn ghost sm', style: 'margin-top:6px', onclick: function () { LLM.recheck(); } }, [t('lx_recheck')]));
      add(el('p', { class: 'small', style: 'margin-top:12px' }, [LLM.webgpu() ? t('lx_o2') : t('lx_nogpu')]));
      if (st.loading) add(el('p', { class: 'small', role: 'status', style: 'margin-top:6px' }, [el('span', { class: 'gp-spin' }), ' ' + t('lx_dl') + ' ' + Math.round(100 * st.loading.p) + ' %']));
      else if (LLM.webgpu()) add(el('button', { type: 'button', class: 'gp-btn ghost sm', style: 'margin-top:6px', onclick: function () { LLM.loadBrowser(); } }, [t('lx_o2b')]));
      if (st.error === 'load_failed') add(G.note('err', t('lx_err') + (st.errorText || '')));
      return;
    }
    add(el('div', { class: 'gp-field', style: 'margin-top:10px' }, [el('label', { for: 'lx-see' }, [t('lx_see')]),
      el('textarea', { id: 'lx-see', rows: 2, maxlength: 300, placeholder: t('lx_see_ph'), oninput: function (e) { S.see = e.target.value; } }, [S.see])]));
    if (S.status === 'loading') add(el('p', { role: 'status', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' ' + t('lx_load')]));
    else add(el('button', { type: 'button', class: 'gp-btn primary', style: 'margin-top:10px', onclick: go }, [t(S.status === 'done' ? 'lx_again' : 'lx_btn')]));
    if (S.status === 'error') add(el('div', { style: 'margin-top:10px' }, [G.note('err', t('lx_err') + S.err)]));
    if (S.status === 'done') {
      var f = safe(S.out.text), s = sections(f.text), known = JSON.stringify(S.ev);
      if (S.out.anomalies && S.out.anomalies.length) {
        add(el('p', { class: 'eyebrow', style: 'margin-top:14px' }, [t('lx_anom')]));
        S.out.anomalies.forEach(function (a) {
          add(el('p', { style: 'margin-top:2px' }, [el('b', null, [a.name]), a.latin && a.latin !== a.name ? el('i', { class: 'small muted' }, [' ' + a.latin]) : '', el('span', { class: 'small muted' }, [a.confidence ? ' · ' + a.confidence : ''])]));
        });
        known += JSON.stringify(S.out.anomalies);
      }
      [['lx_what', s.what], ['lx_do', s.act], ['lx_check', s.check]].forEach(function (x) {
        if (!x[1]) return;
        add(el('p', { class: 'eyebrow', style: 'margin-top:14px' }, [t(x[0])]));
        add(LLM.render(x[1], LLM.unverified(x[1], known)));
      });
      if (f.cut) add(el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('lx_cut')]));
    }
  }
  function go() {
    var ev = evidence(args[0], args[1], args[2]), id = ++run;
    if (S.see.trim()) ev.farmer_sees = S.see.trim().slice(0, 300);
    S.ev = ev; S.status = 'loading'; S.err = null; draw();
    ask(ev).then(function (o) {
      if (id !== run) return;
      if (!o.text) throw new Error('empty');
      S.out = o; S.status = 'done'; draw();
    }).catch(function (e) { if (id !== run) return; S.status = 'error'; S.err = e.message || String(e); draw(); });
  }
  /* Called at each render of the page: an answer is dropped as soon as the photo, the results or the language change. */
  function card(state, PL, label) {
    if (!listening) { listening = true; LLM.on(function () { draw(); }); LLM.start(); }
    if (S.img !== state.img) { S.img = state.img; S.see = ''; S.key = null; }
    var key = G.lang() + JSON.stringify(evidence(state, PL, label));
    if (S.key !== key) { S.key = key; S.status = 'idle'; S.out = null; run++; }
    args = [state, PL, label]; box = el('div', { class: 'gp-card', id: 'lx-card', 'aria-live': 'polite' });
    draw();
    return box;
  }

  global.GAIA_LEAF = { card: card, evidence: evidence, safe: safe, sections: sections, FACTS: F };
}(window));
