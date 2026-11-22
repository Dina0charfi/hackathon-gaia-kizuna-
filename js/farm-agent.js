/* GAIA farm record (actionable agent): the irrigation calendar the farmer confirmed, the irrigations
   reported, the morning check and its alerts, kept by the backend (gaia/farm_state.py, /farm/*).
   Shared by nexus.html (Eau & énergie) and farm.html (Tableau de bord).
   The agent only PROPOSES actions; GAIA_FARMREC.apply() runs one after the farmer confirms. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt;

  G.addStrings({
    fr: {
      fa_wd: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
      fr_t: 'Calendrier d’irrigation GAIA', fr_badge: 'Agent actif',
      fr_lead: "Ce que vous avez validé : le plan d’irrigation enregistré, les arrosages notés (les plans suivants en tiennent compte), et la vérification automatique de chaque matin.",
      fr_off: 'Le service GAIA (backend) n’est pas lancé : le calendrier n’est pas disponible.',
      fr_alerts: 'Alertes', fr_no_alert: 'Aucune alerte pour l’instant.', fr_read: 'Marquer comme lues',
      fr_plan: 'Plan enregistré', fr_no_plan: 'Aucun plan enregistré pour l’instant.', fr_save: 'Enregistrer le plan des 8 prochains jours', fr_resave: 'Mettre à jour le plan', fr_saving: 'Calcul du plan…', fr_log_mm: 'J’ai arrosé (mm nets)', fr_when: 'Quand ?', fr_log_btn: 'Noter cet arrosage', fr_today: 'aujourd’hui', fr_yest: 'hier', fr_err: 'Impossible :',
      fr_plan_none: 'Plan enregistré : aucune irrigation nécessaire sur la période.', fr_saved_at: 'enregistré le {d}',
      fr_done: 'Fait', fr_mark_done: 'C’est fait', fr_log: 'Arrosages notés', fr_no_log: 'Aucun arrosage noté.',
      fr_mon: 'Vérification automatique chaque matin', fr_mon_on: 'Activée à {h} h', fr_mon_off: 'Désactivée',
      fr_mon_enable: 'Activer (7 h)', fr_mon_disable: 'Désactiver', fr_check_now: 'Vérifier maintenant', fr_checking: 'Vérification…',
      fr_last: 'dernière vérification : {d}', fr_notif: 'Recevoir les alertes en notification', fr_notif_on: 'Notifications activées',
      fr_mon_note: 'La vérification tourne dans le service GAIA : il doit être lancé à l’heure choisie.',
      fr_hours: '{a} h–{b} h',
      act_t: 'Action proposée par l’agent', act_confirm: 'Confirmer', act_cancel: 'Annuler', act_done: 'Appliqué', act_cancelled: 'Annulé',
      act_log_irrigation: 'Noter un arrosage : {mm} mm nets le {d}', act_update_settings: 'Modifier les réglages : {s}',
      act_set_monitoring_on: 'Activer la vérification automatique chaque matin à {h} h', act_set_monitoring_off: 'Désactiver la vérification automatique',
      act_save_plan: 'Enregistrer le plan ({m}) : {n} jour(s) d’irrigation, {mm} mm, {m3} m³', act_save_plan_none: 'Enregistrer le plan ({m}) : aucune irrigation nécessaire',
      act_err: 'Action impossible :', m_solar: 'soleil d’abord', m_water: 'le moins d’eau',
      set_flow_m3h: 'débit {v} m³/h', set_head_m: 'hauteur {v} m', set_pv_kwp: 'solaire {v} kWc', set_area_ha: 'surface {v} ha', set_kc: 'Kc {v}', set_crop: 'culture {v}',
      lv_critical: 'Urgent', lv_warning: 'Aujourd’hui', lv_info: 'À venir', lv_good: 'Tout va bien'
    },
    ar: {
      fa_wd: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      fr_t: 'رزنامة الري GAIA', fr_badge: 'وكيل نشط',
      fr_lead: 'ما صادقت عليه: خطة الري المسجّلة، والسقي المسجَّل (تأخذه الخطط التالية بعين الاعتبار)، والتحقق الآلي كل صباح.',
      fr_off: 'خدمة GAIA (الخادم) غير مشغّلة: الرزنامة غير متاحة.',
      fr_alerts: 'التنبيهات', fr_no_alert: 'لا توجد تنبيهات حاليًا.', fr_read: 'تعليم كمقروءة',
      fr_plan: 'الخطة المسجّلة', fr_no_plan: 'لا توجد خطة مسجّلة حاليًا.', fr_save: 'حفظ خطة الأيام الثمانية القادمة', fr_resave: 'تحديث الخطة', fr_saving: 'جارٍ حساب الخطة…', fr_log_mm: 'سقيت (مم صافية)', fr_when: 'متى؟', fr_log_btn: 'تسجيل هذا السقي', fr_today: 'اليوم', fr_yest: 'أمس', fr_err: 'تعذّر:',
      fr_plan_none: 'الخطة المسجّلة: لا حاجة للري خلال الفترة.', fr_saved_at: 'سُجّلت يوم {d}',
      fr_done: 'تم', fr_mark_done: 'تم السقي', fr_log: 'السقي المسجَّل', fr_no_log: 'لا يوجد سقي مسجَّل.',
      fr_mon: 'التحقق الآلي كل صباح', fr_mon_on: 'مفعّل على الساعة {h}', fr_mon_off: 'متوقف',
      fr_mon_enable: 'تفعيل (7 صباحًا)', fr_mon_disable: 'إيقاف', fr_check_now: 'تحقق الآن', fr_checking: 'جارٍ التحقق…',
      fr_last: 'آخر تحقق: {d}', fr_notif: 'تلقي التنبيهات كإشعارات', fr_notif_on: 'الإشعارات مفعّلة',
      fr_mon_note: 'يعمل التحقق داخل خدمة GAIA: يجب أن تكون مشغّلة في الساعة المختارة.',
      fr_hours: '{a}–{b}',
      act_t: 'إجراء يقترحه الوكيل', act_confirm: 'تأكيد', act_cancel: 'إلغاء', act_done: 'تم التطبيق', act_cancelled: 'أُلغي',
      act_log_irrigation: 'تسجيل سقي: {mm} مم صافية يوم {d}', act_update_settings: 'تعديل الإعدادات: {s}',
      act_set_monitoring_on: 'تفعيل التحقق الآلي كل صباح على الساعة {h}', act_set_monitoring_off: 'إيقاف التحقق الآلي',
      act_save_plan: 'حفظ الخطة ({m}): {n} يوم ري، {mm} مم، {m3} م³', act_save_plan_none: 'حفظ الخطة ({m}): لا حاجة للري',
      act_err: 'تعذّر الإجراء:', m_solar: 'الشمس أولًا', m_water: 'أقل ماء',
      set_flow_m3h: 'التدفق {v} م³/س', set_head_m: 'الارتفاع {v} م', set_pv_kwp: 'الشمسي {v} ك.و.ذ', set_area_ha: 'المساحة {v} هك', set_kc: 'Kc {v}', set_crop: 'الزراعة {v}',
      lv_critical: 'عاجل', lv_warning: 'اليوم', lv_info: 'قادم', lv_good: 'كل شيء على ما يرام'
    },
    en: {
      fa_wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      fr_t: 'GAIA irrigation calendar', fr_badge: 'Active agent',
      fr_lead: 'What you approved: the saved irrigation plan, the irrigations you reported (the next plans take them into account), and the automatic check every morning.',
      fr_off: 'The GAIA service (backend) is not running: the calendar is not available.',
      fr_alerts: 'Alerts', fr_no_alert: 'No alert yet.', fr_read: 'Mark as read',
      fr_plan: 'Saved plan', fr_no_plan: 'No plan saved yet.', fr_save: 'Save the plan for the next 8 days', fr_resave: 'Update the plan', fr_saving: 'Computing the plan…', fr_log_mm: 'I watered (net mm)', fr_when: 'When?', fr_log_btn: 'Record this irrigation', fr_today: 'today', fr_yest: 'yesterday', fr_err: 'Failed:',
      fr_plan_none: 'Saved plan: no irrigation needed over the period.', fr_saved_at: 'saved on {d}',
      fr_done: 'Done', fr_mark_done: 'Done it', fr_log: 'Irrigations reported', fr_no_log: 'No irrigation reported.',
      fr_mon: 'Automatic check every morning', fr_mon_on: 'On at {h}:00', fr_mon_off: 'Off',
      fr_mon_enable: 'Turn on (7:00)', fr_mon_disable: 'Turn off', fr_check_now: 'Check now', fr_checking: 'Checking…',
      fr_last: 'last check: {d}', fr_notif: 'Get alerts as notifications', fr_notif_on: 'Notifications on',
      fr_mon_note: 'The check runs inside the GAIA service: it must be running at the chosen hour.',
      fr_hours: '{a}:00–{b}:00',
      act_t: 'Action proposed by the agent', act_confirm: 'Confirm', act_cancel: 'Cancel', act_done: 'Applied', act_cancelled: 'Cancelled',
      act_log_irrigation: 'Record an irrigation: {mm} net mm on {d}', act_update_settings: 'Change settings: {s}',
      act_set_monitoring_on: 'Turn on the automatic check every morning at {h}:00', act_set_monitoring_off: 'Turn off the automatic check',
      act_save_plan: 'Save the plan ({m}): {n} irrigation day(s), {mm} mm, {m3} m³', act_save_plan_none: 'Save the plan ({m}): no irrigation needed',
      act_err: 'Action failed:', m_solar: 'sun first', m_water: 'least water',
      set_flow_m3h: 'flow {v} m³/h', set_head_m: 'head {v} m', set_pv_kwp: 'solar {v} kWp', set_area_ha: 'area {v} ha', set_kc: 'Kc {v}', set_crop: 'crop {v}',
      lv_critical: 'Urgent', lv_warning: 'Today', lv_info: 'Coming', lv_good: 'All good'
    },
    ja: {
      fa_wd: ['日', '月', '火', '水', '木', '金', '土'],
      fr_t: 'GAIA灌漑カレンダー', fr_badge: '実行するエージェント',
      fr_lead: '承認した内容：保存した灌漑計画、記録した灌漑（次の計画に反映）、毎朝の自動チェック。',
      fr_off: 'GAIAサービス（バックエンド）が起動していないため、カレンダーを利用できません。',
      fr_alerts: 'アラート', fr_no_alert: 'まだアラートはありません。', fr_read: '既読にする',
      fr_plan: '保存した計画', fr_no_plan: 'まだ計画は保存されていません。', fr_save: '今後8日間の計画を保存', fr_resave: '計画を更新', fr_saving: '計画を計算中…', fr_log_mm: '灌漑した量（正味mm）', fr_when: 'いつ？', fr_log_btn: 'この灌漑を記録', fr_today: '今日', fr_yest: '昨日', fr_err: '失敗：',
      fr_plan_none: '保存した計画：期間中の灌漑は不要です。', fr_saved_at: '{d}に保存',
      fr_done: '完了', fr_mark_done: '実施した', fr_log: '記録した灌漑', fr_no_log: '記録した灌漑はありません。',
      fr_mon: '毎朝の自動チェック', fr_mon_on: '{h}時にオン', fr_mon_off: 'オフ',
      fr_mon_enable: 'オンにする（7時）', fr_mon_disable: 'オフにする', fr_check_now: '今すぐチェック', fr_checking: 'チェック中…',
      fr_last: '最終チェック：{d}', fr_notif: 'アラートを通知で受け取る', fr_notif_on: '通知オン',
      fr_mon_note: 'チェックはGAIAサービス内で動きます：指定時刻に起動している必要があります。',
      fr_hours: '{a}時〜{b}時',
      act_t: 'エージェントが提案する操作', act_confirm: '確認', act_cancel: '取り消す', act_done: '適用済み', act_cancelled: '取り消し',
      act_log_irrigation: '灌漑を記録：{d}に正味{mm} mm', act_update_settings: '設定を変更：{s}',
      act_set_monitoring_on: '毎朝{h}時の自動チェックをオンにする', act_set_monitoring_off: '自動チェックをオフにする',
      act_save_plan: '計画を保存（{m}）：灌漑{n}日、{mm} mm、{m3} m³', act_save_plan_none: '計画を保存（{m}）：灌漑不要',
      act_err: '操作できません：', m_solar: '太陽を優先', m_water: '水を最少に',
      set_flow_m3h: '流量 {v} m³/h', set_head_m: '揚程 {v} m', set_pv_kwp: '太陽光 {v} kWp', set_area_ha: '面積 {v} ha', set_kc: 'Kc {v}', set_crop: '作物 {v}',
      lv_critical: '緊急', lv_warning: '今日', lv_info: '予定', lv_good: '問題なし'
    }
  });

  function base() {
    var u = G.CONFIG.farmEndpoint || (G.CONFIG.planEndpoint ? G.CONFIG.planEndpoint.replace(/\/irrigation\/plan.*$/, '/farm') : null);
    return u;
  }
  function where() {
    var p = G.getParcel(); if (!p) return null;
    var loc = (p.dna && p.dna.location) || {};
    var lat = p.lat != null ? p.lat : loc.lat, lon = p.lon != null ? p.lon : loc.lon;
    return lat == null || lon == null ? null : { lat: +lat, lon: +lon };
  }
  function fill(key, vals) { return t(key).replace(/\{(\w+)\}/g, function (_, k) { return vals[k] !== undefined ? vals[k] : ''; }); }
  function day(iso) {
    var d = new Date(iso.slice(0, 10) + 'T12:00:00');
    return t('fa_wd')[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function hoursText(hs) {
    if (!hs || !hs.length) return '';
    return fill('fr_hours', { a: hs[0], b: hs[hs.length - 1] + 1 });
  }

  var R = { status: 'idle', data: null, busy: false, listeners: [], seen: null };
  function emit() { R.listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }

  function post(path, body) {
    return (G.apiReady || Promise.resolve()).then(function () { return fetch(base() + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.detail && (j.detail.message || j.detail)) || r.status); return j; }); });
  }
  function refresh() {
    var w = where(); if (!base() || !w) return Promise.resolve(null);
    return (G.apiReady || Promise.resolve()).then(function () { return fetch(base() + '/state?lat=' + w.lat + '&lon=' + w.lon); }).then(function (r) { return r.json(); })
      .then(function (j) { R.status = 'ok'; R.data = j; notifyNew(j); emit(); return j; })
      .catch(function () { R.status = 'off'; emit(); return null; });
  }

  // browser notifications for new unread alerts (free, no external service)
  function notifyNew(s) {
    var unread = (s.alerts || []).filter(function (a) { return !a.read; });
    var ids = unread.map(function (a) { return a.id; });
    if (R.seen === null) { R.seen = ids; return; }                     // first load: no burst of old alerts
    unread.forEach(function (a) {
      if (R.seen.indexOf(a.id) !== -1) return;
      if (window.Notification && Notification.permission === 'granted') {
        try { new Notification('GAIA', { body: a.text[G.lang()] || a.text.fr || '' }); } catch (e) { /* ignore */ }
      }
    });
    R.seen = ids;
  }

  /** Apply one confirmed action. Returns a promise of the new farm state. */
  function apply(action) {
    var w = where();
    if (!w || !base()) return Promise.reject(new Error('backend'));
    var a = { type: action.type, params: action.params };
    return post('/action', { lat: w.lat, lon: w.lon, action: a }).then(function (s) { R.data = s; R.status = 'ok'; emit(); return s; });
  }

  /** One line describing a proposal, in the page's language. */
  function describe(p) {
    var x = p.params || {};
    if (p.type === 'log_irrigation') return fill('act_log_irrigation', { mm: fmt(x.mm, 1), d: day(x.date) });
    if (p.type === 'update_settings') return fill('act_update_settings', { s: Object.keys(x.settings || {}).map(function (k) { return fill('set_' + k, { v: x.settings[k] }); }).join(', ') });
    if (p.type === 'set_monitoring') return x.enabled ? fill('act_set_monitoring_on', { h: x.hour }) : t('act_set_monitoring_off');
    if (p.type === 'save_plan') {
      var m = t(x.mode === 'water' ? 'm_water' : 'm_solar');
      return (x.days || []).length ? fill('act_save_plan', { m: m, n: x.days.length, mm: fmt(x.total_mm, 1), m3: fmt(x.total_m3) }) : fill('act_save_plan_none', { m: m });
    }
    return p.type;
  }

  // plain words for farmers: technical details stay in the "Method" sections
  G.addStrings({
    fr: { "fr_badge": "Suivi", "fr_mon_note": "GAIA doit être allumé à cette heure-là pour faire la vérification.", "fr_lead": "Votre suivi : le plan que vous avez gardé, les arrosages faits, et une vérification automatique chaque matin." },
    en: { "fr_badge": "Follow-up", "fr_mon_note": "GAIA must be running at that time to do the check.", "fr_lead": "Your follow-up: the plan you kept, the waterings done, and an automatic check every morning." },
    ar: { "fr_badge": "متابعة", "fr_mon_note": "يجب أن يكون GAIA مشغّلًا في تلك الساعة للقيام بالتحقق.", "fr_lead": "متابعتك: الخطة التي احتفظت بها، والسقي الذي قمت به، وتحقق آلي كل صباح." },
    ja: { "fr_badge": "見守り", "fr_mon_note": "チェックにはその時刻にGAIAが起動している必要があります。", "fr_lead": "あなたの見守り：保存した計画、行った灌漑、毎朝の自動チェック。" }
  });

  // one short line each
  G.addStrings({
    fr: { "fr_lead": "Votre plan, vos arrosages et vos alertes.", "fr_mon_note": "GAIA doit être allumé à cette heure-là." },
    en: { "fr_lead": "Your plan, your waterings and your alerts.", "fr_mon_note": "GAIA must be running at that time." },
    ar: { "fr_lead": "خطتك، وسقيك، وتنبيهاتك.", "fr_mon_note": "يجب أن يكون GAIA مشغّلًا في تلك الساعة." },
    ja: { "fr_lead": "あなたの計画、灌漑、アラート。", "fr_mon_note": "その時刻にGAIAが起動している必要があります。" }
  });

  /** Save the next 8 days' plan: the plan shown on the page (opts.plan()) or a fresh one computed with the saved settings. */
  function savePlan(opts) {
    var w = where(); if (!w || R.busy) return;
    R.busy = true; R.saving = true; R.err = null; emit();
    var shown = opts.plan ? opts.plan() : null;
    var got = shown ? Promise.resolve(shown) : (function () {
      var st = (R.data && R.data.settings) || {}, b = { lat: w.lat, lon: w.lon, mode: 'solar', crop: st.crop || 'olive', kc: st.kc > 0 ? st.kc : 0.65 };
      ['area_ha', 'ea', 'head_m', 'pump_eff', 'flow_m3h', 'pv_kwp', 'pr'].forEach(function (k) { if (st[k] > 0) b[k] = st[k]; });
      return fetch(G.CONFIG.planEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.detail && (j.detail.message || j.detail)) || r.status); return { data: j, mode: b.mode }; }); });
    }());
    got.then(function (x) {
      var days = x.data.days.filter(function (d) { return d.irrigation_net_mm > 0; }).map(function (d) {
        return { date: d.date, mm: d.irrigation_net_mm, m3: d.irrigation_m3 || 0, hours: ((d.pumping && d.pumping.hours) || []).map(function (h) { return h.hour; }) };
      });
      return apply({ type: 'save_plan', params: { mode: x.mode, days: days } });
    }).catch(function (e) { R.err = String(e.message || e); })
      .then(function () { R.busy = false; R.saving = false; emit(); });
  }

  /** The farm record card. opts.settings(): current page settings, sent along when the morning check is turned on. */
  function card(opts) {
    opts = opts || {};
    var head = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('fr_t')]), G.pill('live', t('fr_badge'))]);
    var c = el('div', { class: 'gp-card', style: 'margin-top:16px' }, [head, el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('fr_lead')])]);
    if (!base() || !where()) return c;
    if (R.status === 'idle') { R.status = 'loading'; refresh(); }
    if (R.status === 'off') { c.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('info', t('fr_off'))])); return c; }
    if (!R.data) { c.appendChild(el('p', { class: 'muted small', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' })])); return c; }
    var s = R.data;
    var act = function (a) { if (R.busy) return; R.busy = true; R.err = null; emit(); apply(a).catch(function (e) { R.err = String(e.message || e); }).then(function () { R.busy = false; emit(); }); };

    var busy = R.busy ? 'disabled' : null;
    function box(title, sub, kids) {
      return el('section', { style: 'margin-top:14px;padding:14px 16px;border:1px solid var(--g-line-2);border-radius:14px;background:var(--g-paper,#fff)' },
        [el('div', { style: 'display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap' },
          [el('h3', { style: 'font-size:16px;margin:0' }, [title]), sub ? el('span', { class: 'small muted' }, [sub]) : null])].concat(kids));
    }
    function btn(label, kind, onclick, dis) {
      return el('button', { type: 'button', class: 'gp-btn sm ' + (kind || 'ghost'), disabled: dis || busy, onclick: onclick }, [label]);
    }
    function row(kids) { return el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px' }, kids); }
    function empty(txt) { return el('p', { class: 'small muted', style: 'margin:6px 0 0' }, [txt]); }

    // alerts
    var unread = s.alerts.filter(function (a) { return !a.read; }), last = s.alerts.slice(-4).reverse();
    var alKids = [];
    if (!last.length) alKids.push(empty(t('fr_no_alert')));
    last.forEach(function (a) {
      var kind = a.level === 'critical' ? 'err' : a.level === 'warning' ? 'warn' : a.level === 'good' ? 'ok' : 'info';
      var n = G.note(kind, t('lv_' + a.level) + ' · ' + day(a.date) + ' — ' + (a.text[G.lang()] || a.text.fr));
      if (a.read) n.style.opacity = '.65';
      n.style.marginTop = '8px';
      alKids.push(n);
    });
    var alBtns = [];
    if (unread.length) alBtns.push(btn(t('fr_read'), 'ghost', function () { act({ type: 'mark_alerts_read' }); }));
    if (window.Notification) alBtns.push(Notification.permission === 'granted' ? btn(G.iconText('bell', t('fr_notif_on')), 'ghost', null, 'disabled')
      : btn(G.iconText('bell', t('fr_notif')), 'ghost', function () { Notification.requestPermission().then(emit); }));
    if (alBtns.length) alKids.push(row(alBtns));
    c.appendChild(box(t('fr_alerts') + (unread.length ? ' (' + unread.length + ')' : ''), null, alKids));

    // morning check
    var m = s.monitoring;
    var state = el('span', { style: 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:600;' +
      (m.enabled ? 'background:#e3f0e6;color:var(--g-forest)' : 'background:#efeae0;color:var(--g-ink-2)') },
      [m.enabled ? '● ' + fill('fr_mon_on', { h: m.hour }) : '○ ' + t('fr_mon_off')]);
    c.appendChild(box(t('fr_mon'), m.last_run ? fill('fr_last', { d: day(m.last_run) + ' ' + m.last_run.slice(11, 16) }) : null, [
      el('div', { style: 'margin-top:8px' }, [state]),
      row([
        btn(m.enabled ? t('fr_mon_disable') : t('fr_mon_enable'), m.enabled ? 'ghost' : 'primary', function () {
          if (m.enabled) return act({ type: 'set_monitoring', params: { enabled: false } });
          var st = opts.settings ? opts.settings() : null;
          R.busy = true; emit();
          (st ? apply({ type: 'update_settings', params: { settings: st } }) : Promise.resolve())
            .then(function () { return apply({ type: 'set_monitoring', params: { enabled: true, hour: 7 } }); })
            .catch(function () {}).then(function () { R.busy = false; emit(); });
        }),
        btn(R.busy ? t('fr_checking') : t('fr_check_now'), 'ghost', function () {
          var w = where(), st = opts.settings ? opts.settings() : null;
          R.busy = true; emit();
          (st ? apply({ type: 'update_settings', params: { settings: st } }) : Promise.resolve())
            .then(function () { return post('/check?lat=' + w.lat + '&lon=' + w.lon); })
            .then(function (j) { R.data = j; }).catch(function () {}).then(function () { R.busy = false; emit(); });
        })
      ]),
      el('p', { class: 'assump', style: 'margin-top:8px' }, [t('fr_mon_note')])
    ]));

    // saved plan
    var today = new Date(); today = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    var upcoming = s.plan.filter(function (d) { return d.date >= today; });
    var plKids = [];
    if (!s.plan_saved_at) plKids.push(empty(t('fr_no_plan')));
    else if (!upcoming.length) { var ok = G.note('ok', t('fr_plan_none')); ok.style.marginTop = '8px'; plKids.push(ok); }
    else plKids.push(el('div', { class: 'gp-table-wrap', style: 'margin-top:8px' }, [el('table', { class: 'gp-table' }, [el('tbody', null, upcoming.map(function (d) {
      return el('tr', null, [el('td', null, [el('b', null, [day(d.date)])]), el('td', { class: 'num' }, [fmt(d.mm, 1) + ' mm · ' + fmt(d.m3) + ' m³']),
        el('td', null, [hoursText(d.hours)]),
        el('td', { style: 'text-align:end' }, [d.done ? el('b', { style: 'color:var(--g-forest)' }, [G.iconText('ok', t('fr_done'))])
          : btn(t('fr_mark_done'), 'ghost', function () { act({ type: 'log_irrigation', params: { mm: d.mm, date: d.date } }); })])]);
    }))])]));
    plKids.push(row([btn(R.saving ? t('fr_saving') : (s.plan_saved_at ? G.iconText('refresh', t('fr_resave')) : G.iconText('calendar', t('fr_save'))),
      s.plan_saved_at ? 'ghost' : 'primary', function () { savePlan(opts); })]));
    c.appendChild(box(t('fr_plan'), s.plan_saved_at ? fill('fr_saved_at', { d: day(s.plan_saved_at) }) : null, plKids));

    // reported irrigations
    var mmIn = el('input', { id: 'fr-log-mm', type: 'number', min: '0', max: '200', step: 'any', inputmode: 'decimal', placeholder: '8' });
    var dayIn = el('select', { id: 'fr-log-day' }, [el('option', { value: '0' }, [t('fr_today')]), el('option', { value: '1' }, [t('fr_yest')])]);
    var lg = s.irrigation_log.slice(-5).reverse();
    c.appendChild(box(t('fr_log'), null, [
      lg.length ? el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px' }, lg.map(function (e) {
        return el('span', { style: 'padding:4px 10px;border-radius:999px;background:#e8f0f5;color:#24506b;font-size:13px;font-weight:600' },
          [G.iconText('drop', day(e.date) + ' · ' + fmt(e.mm, 1) + ' mm', 14)]);
      })) : empty(t('fr_no_log')),
      el('div', { style: 'display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:12px' }, [
        el('div', { class: 'gp-field', style: 'width:160px' }, [el('label', { for: 'fr-log-mm' }, [t('fr_log_mm')]), mmIn]),
        el('div', { class: 'gp-field', style: 'width:160px' }, [el('label', { for: 'fr-log-day' }, [t('fr_when')]), dayIn]),
        (function (b) { b.style.minHeight = '42px'; return b; })(btn(t('fr_log_btn'), 'primary', function () {
          var mm = parseFloat(String(mmIn.value).replace(',', '.'));
          if (!(mm > 0 && mm <= 200)) { mmIn.focus(); return; }
          var d = new Date(Date.now() - (+dayIn.value) * 864e5);
          d = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          act({ type: 'log_irrigation', params: { mm: mm, date: d } });
        }))
      ])
    ]));
    if (R.err) c.appendChild(el('div', { style: 'margin-top:8px' }, [G.note('err', t('fr_err') + ' ' + R.err)]));
    return c;
  }

  // keep the record fresh while the page is open (new morning alerts → notification)
  setInterval(function () { if (R.status === 'ok') refresh(); }, 5 * 60 * 1000);

  window.GAIA_FARMREC = { card: card, apply: apply, describe: describe, refresh: refresh, state: function () { return R.data; }, onChange: function (f) { R.listeners.push(f); } };
}());
