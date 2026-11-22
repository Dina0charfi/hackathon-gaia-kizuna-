/* Admin dashboard (admin.html): every farm known by GAIA, read only.
   The server decides who may see it (GET /admin/overview: 403 for any other account). Hiding the link is only comfort.
   Nothing received here is kept in the browser; contacts are hidden until the administrator asks for them. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt;

  G.addStrings({
    fr: { ad_title: 'Administration', ad_lead: 'Toutes les exploitations inscrites sur GAIA. Réservé aux administrateurs, en lecture seule.',
      ad_in: 'Connectez-vous avec un compte administrateur.', ad_go: 'Se connecter', ad_403: 'Cette page est réservée aux administrateurs. Votre compte n’a pas ce droit.', ad_srv: 'Le serveur GAIA ne répond pas. Lancez-le puis réessayez.', ad_retry: 'Réessayer', ad_load: 'Chargement…',
      ad_k_users: 'Comptes', ad_k_new: '{n} ces 30 derniers jours', ad_k_plots: 'Parcelles liées', ad_k_plots_p: '{n} % des comptes', ad_k_share: 'Prêts à partager l’eau', ad_k_match: '{n} partage(s) accepté(s)', ad_k_irr: 'Arrosages notés', ad_k_irr_p: 'sur {n} parcelle(s) suivie(s)', ad_k_al: 'Alertes non lues', ad_k_al_p: 'surveillance active : {n}',
      ad_q: 'Rechercher', ad_q_ph: 'Nom ou gouvernorat', ad_all: 'Tous', ad_role: 'Profil', ad_crop: 'Culture', ad_region: 'Gouvernorat', ad_reset: 'Effacer les filtres', ad_shown: '{n} compte(s) affiché(s) sur {m}',
      ad_map: 'Où sont les parcelles', ad_map_p: 'Un point par parcelle liée à un compte.', ad_map_none: 'Aucune parcelle liée pour ce filtre.', ad_by_crop: 'Parcelles par culture', ad_by_water: 'Parcelles par source d’eau', ad_by_region: 'Comptes par gouvernorat', ad_by_role: 'Comptes par profil', ad_none: 'non précisé', ad_other_n: 'autres',
      ad_table: 'Comptes et parcelles', ad_th_name: 'Nom', ad_th_contact: 'Contact', ad_th_water: 'Eau', ad_th_plot: 'Parcelle', ad_th_share: 'Partage', ad_th_join: 'Inscription', ad_th_last: 'Dernière connexion', ad_th_irr: 'Arrosages', ad_yes: 'oui', ad_no: 'non', ad_show: 'Afficher les contacts', ad_hide: 'Masquer les contacts', ad_csv: 'Exporter (CSV)', ad_csv_p: 'Le fichier contient des données personnelles.', ad_map_link: 'carte',
      ad_rec: 'Suivi d’irrigation', ad_rec_none: 'Aucun suivi enregistré.', ad_th_plan: 'Jours prévus', ad_th_mon: 'Surveillance', ad_th_lastirr: 'Dernier arrosage', ad_th_alert: 'Dernière alerte', ad_th_owner: 'Compte',
      ad_sh: 'Demandes de partage d’eau', ad_sh_none: 'Aucune demande.', ad_th_from: 'De', ad_th_to: 'À', ad_th_state: 'État', ad_th_date: 'Date', ad_s_pending: 'en attente', ad_s_accepted: 'acceptée', ad_s_declined: 'refusée',
      ad_fb: 'Retours des utilisateurs', ad_fb_none: 'Aucun retour reçu par le serveur.', ad_log: 'Consultations de cette page', ad_log_p: 'Chaque ouverture est notée.', ad_updated: 'Mis à jour à {h}', ad_refresh: 'Actualiser',
      r_farmer: 'Agriculteur', r_cooperative: 'Coopérative', r_agronomist: 'Agronome', r_partner: 'Partenaire', c_olive: 'Olivier', c_palm: 'Palmier dattier', c_citrus: 'Agrumes', c_cereal: 'Céréales', c_veg: 'Maraîchage', c_other: 'Autre', w_rainfed: 'Pluie seulement', w_well: 'Puits ou forage', w_network: 'Réseau d’irrigation', w_shared: 'Source partagée' },
    ar: { ad_title: 'الإدارة', ad_lead: 'كل الضيعات المسجلة في GAIA. مخصصة للمشرفين، للقراءة فقط.',
      ad_in: 'سجّل الدخول بحساب مشرف.', ad_go: 'تسجيل الدخول', ad_403: 'هذه الصفحة مخصصة للمشرفين. حسابك لا يملك هذا الحق.', ad_srv: 'خادم GAIA لا يجيب. شغّله ثم أعد المحاولة.', ad_retry: 'إعادة المحاولة', ad_load: 'جارٍ التحميل…',
      ad_k_users: 'الحسابات', ad_k_new: '{n} خلال 30 يوماً', ad_k_plots: 'القطع المرتبطة', ad_k_plots_p: '{n} % من الحسابات', ad_k_share: 'مستعدون لتقاسم الماء', ad_k_match: 'تقاسمات مقبولة: {n}', ad_k_irr: 'عمليات ري مسجلة', ad_k_irr_p: 'قطع متابَعة: {n}', ad_k_al: 'تنبيهات غير مقروءة', ad_k_al_p: 'مراقبة مفعّلة: {n}',
      ad_q: 'بحث', ad_q_ph: 'الاسم أو الولاية', ad_all: 'الكل', ad_role: 'الصفة', ad_crop: 'الزراعة', ad_region: 'الولاية', ad_reset: 'مسح التصفية', ad_shown: 'معروض {n} من {m}',
      ad_map: 'أين توجد القطع', ad_map_p: 'نقطة لكل قطعة مرتبطة بحساب.', ad_map_none: 'لا توجد قطع لهذه التصفية.', ad_by_crop: 'القطع حسب الزراعة', ad_by_water: 'القطع حسب مصدر الماء', ad_by_region: 'الحسابات حسب الولاية', ad_by_role: 'الحسابات حسب الصفة', ad_none: 'غير محدد', ad_other_n: 'أخرى',
      ad_table: 'الحسابات والقطع', ad_th_name: 'الاسم', ad_th_contact: 'الاتصال', ad_th_water: 'الماء', ad_th_plot: 'القطعة', ad_th_share: 'التقاسم', ad_th_join: 'التسجيل', ad_th_last: 'آخر دخول', ad_th_irr: 'الري', ad_yes: 'نعم', ad_no: 'لا', ad_show: 'إظهار جهات الاتصال', ad_hide: 'إخفاء جهات الاتصال', ad_csv: 'تصدير (CSV)', ad_csv_p: 'يحتوي الملف على بيانات شخصية.', ad_map_link: 'خريطة',
      ad_rec: 'متابعة الري', ad_rec_none: 'لا توجد متابعة مسجلة.', ad_th_plan: 'أيام مبرمجة', ad_th_mon: 'المراقبة', ad_th_lastirr: 'آخر ري', ad_th_alert: 'آخر تنبيه', ad_th_owner: 'الحساب',
      ad_sh: 'طلبات تقاسم الماء', ad_sh_none: 'لا توجد طلبات.', ad_th_from: 'من', ad_th_to: 'إلى', ad_th_state: 'الحالة', ad_th_date: 'التاريخ', ad_s_pending: 'قيد الانتظار', ad_s_accepted: 'مقبول', ad_s_declined: 'مرفوض',
      ad_fb: 'ملاحظات المستخدمين', ad_fb_none: 'لم يستقبل الخادم أي ملاحظة.', ad_log: 'الاطلاع على هذه الصفحة', ad_log_p: 'يُسجَّل كل فتح للصفحة.', ad_updated: 'آخر تحديث {h}', ad_refresh: 'تحديث',
      r_farmer: 'فلاح', r_cooperative: 'تعاضدية', r_agronomist: 'مهندس فلاحي', r_partner: 'شريك', c_olive: 'زيتون', c_palm: 'نخيل', c_citrus: 'قوارص', c_cereal: 'حبوب', c_veg: 'خضروات', c_other: 'أخرى', w_rainfed: 'أمطار فقط', w_well: 'بئر', w_network: 'شبكة ري', w_shared: 'مصدر مشترك' },
    en: { ad_title: 'Administration', ad_lead: 'Every farm registered on GAIA. Administrators only, read only.',
      ad_in: 'Sign in with an administrator account.', ad_go: 'Sign in', ad_403: 'This page is for administrators only. Your account does not have this right.', ad_srv: 'The GAIA server does not answer. Start it and try again.', ad_retry: 'Try again', ad_load: 'Loading…',
      ad_k_users: 'Accounts', ad_k_new: '{n} in the last 30 days', ad_k_plots: 'Linked plots', ad_k_plots_p: '{n} % of accounts', ad_k_share: 'Ready to share water', ad_k_match: '{n} accepted share(s)', ad_k_irr: 'Reported irrigations', ad_k_irr_p: 'on {n} followed plot(s)', ad_k_al: 'Unread alerts', ad_k_al_p: 'monitoring on: {n}',
      ad_q: 'Search', ad_q_ph: 'Name or governorate', ad_all: 'All', ad_role: 'Profile', ad_crop: 'Crop', ad_region: 'Governorate', ad_reset: 'Clear filters', ad_shown: '{n} of {m} account(s) shown',
      ad_map: 'Where the plots are', ad_map_p: 'One dot per plot linked to an account.', ad_map_none: 'No linked plot for this filter.', ad_by_crop: 'Plots by crop', ad_by_water: 'Plots by water source', ad_by_region: 'Accounts by governorate', ad_by_role: 'Accounts by profile', ad_none: 'not given', ad_other_n: 'others',
      ad_table: 'Accounts and plots', ad_th_name: 'Name', ad_th_contact: 'Contact', ad_th_water: 'Water', ad_th_plot: 'Plot', ad_th_share: 'Sharing', ad_th_join: 'Joined', ad_th_last: 'Last sign-in', ad_th_irr: 'Irrigations', ad_yes: 'yes', ad_no: 'no', ad_show: 'Show contacts', ad_hide: 'Hide contacts', ad_csv: 'Export (CSV)', ad_csv_p: 'The file contains personal data.', ad_map_link: 'map',
      ad_rec: 'Irrigation records', ad_rec_none: 'No record saved.', ad_th_plan: 'Planned days', ad_th_mon: 'Monitoring', ad_th_lastirr: 'Last irrigation', ad_th_alert: 'Last alert', ad_th_owner: 'Account',
      ad_sh: 'Water sharing requests', ad_sh_none: 'No request.', ad_th_from: 'From', ad_th_to: 'To', ad_th_state: 'State', ad_th_date: 'Date', ad_s_pending: 'pending', ad_s_accepted: 'accepted', ad_s_declined: 'declined',
      ad_fb: 'User feedback', ad_fb_none: 'No feedback received by the server.', ad_log: 'Visits to this page', ad_log_p: 'Each opening is recorded.', ad_updated: 'Updated at {h}', ad_refresh: 'Refresh',
      r_farmer: 'Farmer', r_cooperative: 'Cooperative', r_agronomist: 'Agronomist', r_partner: 'Partner', c_olive: 'Olive', c_palm: 'Date palm', c_citrus: 'Citrus', c_cereal: 'Cereals', c_veg: 'Vegetables', c_other: 'Other', w_rainfed: 'Rain only', w_well: 'Well or borehole', w_network: 'Irrigation network', w_shared: 'Shared source' },
    ja: { ad_title: '管理', ad_lead: 'GAIAに登録されたすべての農場。管理者専用・閲覧のみ。',
      ad_in: '管理者アカウントでログインしてください。', ad_go: 'ログイン', ad_403: 'このページは管理者専用です。あなたのアカウントには権限がありません。', ad_srv: 'GAIAサーバーが応答しません。起動して再試行してください。', ad_retry: '再試行', ad_load: '読み込み中…',
      ad_k_users: 'アカウント', ad_k_new: '直近30日で{n}件', ad_k_plots: '登録区画', ad_k_plots_p: 'アカウントの{n}%', ad_k_share: '水の共有に参加', ad_k_match: '成立した共有：{n}件', ad_k_irr: '記録された灌水', ad_k_irr_p: '対象区画：{n}', ad_k_al: '未読の警報', ad_k_al_p: '監視中：{n}',
      ad_q: '検索', ad_q_ph: '名前または県', ad_all: 'すべて', ad_role: '立場', ad_crop: '作物', ad_region: '県', ad_reset: '絞り込みを解除', ad_shown: '{m}件中{n}件を表示',
      ad_map: '区画の場所', ad_map_p: 'アカウントに登録された区画ごとに1点。', ad_map_none: 'この条件の区画はありません。', ad_by_crop: '作物別の区画', ad_by_water: '水源別の区画', ad_by_region: '県別のアカウント', ad_by_role: '立場別のアカウント', ad_none: '未記入', ad_other_n: 'その他',
      ad_table: 'アカウントと区画', ad_th_name: '名前', ad_th_contact: '連絡先', ad_th_water: '水源', ad_th_plot: '区画', ad_th_share: '共有', ad_th_join: '登録日', ad_th_last: '最終ログイン', ad_th_irr: '灌水', ad_yes: 'はい', ad_no: 'いいえ', ad_show: '連絡先を表示', ad_hide: '連絡先を隠す', ad_csv: 'CSV出力', ad_csv_p: 'ファイルには個人情報が含まれます。', ad_map_link: '地図',
      ad_rec: '灌漑の記録', ad_rec_none: '記録はありません。', ad_th_plan: '予定日数', ad_th_mon: '監視', ad_th_lastirr: '最後の灌水', ad_th_alert: '最新の警報', ad_th_owner: 'アカウント',
      ad_sh: '水の共有リクエスト', ad_sh_none: 'リクエストはありません。', ad_th_from: '送信者', ad_th_to: '受信者', ad_th_state: '状態', ad_th_date: '日付', ad_s_pending: '保留中', ad_s_accepted: '承認', ad_s_declined: '辞退',
      ad_fb: '利用者の声', ad_fb_none: 'サーバーに届いた意見はありません。', ad_log: 'このページの閲覧履歴', ad_log_p: '開くたびに記録されます。', ad_updated: '{h}に更新', ad_refresh: '更新',
      r_farmer: '農家', r_cooperative: '協同組合', r_agronomist: '農業技術者', r_partner: 'パートナー', c_olive: 'オリーブ', c_palm: 'ナツメヤシ', c_citrus: '柑橘', c_cereal: '穀物', c_veg: '野菜', c_other: 'その他', w_rainfed: '雨水のみ', w_well: '井戸', w_network: '灌漑網', w_shared: '共同水源' }
  });

  G.mountShell('admin');
  var app = document.getElementById('app');
  var D = null, st = 'load', F = { q: '', role: '', crop: '', region: '' }, contacts = false;

  function fill(k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, x) { return o[x]; }); }
  function loc() { return { fr: 'fr-FR', ar: 'ar-TN', en: 'en-GB', ja: 'ja-JP' }[G.lang()]; }
  function date(sec) { return sec ? new Date(sec * 1000).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
  function when(sec) { return sec ? new Date(sec * 1000).toLocaleString(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }
  function iso(s) { var d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
  function lab(p, v) { return v ? t(p + v) : t('ad_none'); }
  function masked(x) { x = String(x || ''); if (x.indexOf('@') > 0) return x.charAt(0) + '•••@' + x.split('@')[1]; return '•••••' + x.slice(-2); }
  function fold(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function load() {
    st = 'load'; draw();
    if (!G.auth.enabled()) { st = 'srv'; draw(); return; }
    if (!G.auth.user()) { st = 'in'; draw(); return; }
    G.auth.adminOverview().then(function (d) { D = d; st = 'ok'; draw(); }, function (e) {
      D = null; st = e && e.status === 403 ? '403' : e && e.status === 401 ? 'in' : 'srv'; draw();
    });
  }

  function list() {
    var q = fold(F.q);
    return D.users.filter(function (u) {
      return (!F.role || u.role === F.role) && (!F.crop || (u.lat !== null && (u.crop || '-') === F.crop)) && (!F.region || (u.region || '-') === F.region) &&
        (!q || fold(u.name).indexOf(q) !== -1 || fold(u.region).indexOf(q) !== -1);
    });
  }

  /* ---------------------------------------------------------------- pieces */
  function tile(label, value, sub) { return el('div', { class: 'ad-kpi' }, [el('span', { class: 'l' }, [label]), el('b', null, [fmt(value, 0)]), el('span', { class: 's' }, [sub])]); }
  function select(id, label, key, options) {
    return el('div', { class: 'gp-field' }, [el('label', { for: id }, [label]), el('select', { id: id, onchange: function (e) { F[key] = e.target.value; body(); } },
      [el('option', { value: '' }, [t('ad_all')])].concat(options.map(function (o) { return el('option', { value: o[0], selected: F[key] === o[0] }, [o[1]]); })))]);
  }
  function count(rows, key) { var c = {}; rows.forEach(function (r) { var k = r[key] || '-'; c[k] = (c[k] || 0) + 1; }); return c; }
  // magnitude = one hue, value written beside each bar; more than 8 rows fold into "others"
  function bars(title, counts, name) {
    var rows = Object.keys(counts).map(function (k) { return [k === '-' ? t('ad_none') : name(k), counts[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (rows.length > 8) { var rest = rows.slice(7).reduce(function (s, r) { return s + r[1]; }, 0); rows = rows.slice(0, 7).concat([[t('ad_other_n'), rest]]); }
    var max = rows.reduce(function (m, r) { return Math.max(m, r[1]); }, 0);
    return el('section', { class: 'gp-card' }, [el('h2', null, [title]), rows.length ? el('div', { class: 'ad-bars' }, rows.map(function (r) {
      var i = el('i'); i.style.width = (100 * r[1] / max).toFixed(1) + '%';
      var row = el('div', { class: 'ad-bar' }, [el('span', { class: 'n' }, [r[0]]), el('span', { class: 'b' }, [i]), el('span', { class: 'v' }, [fmt(r[1], 0)])]);
      G.bindTip(row, r[0] + ' : ' + fmt(r[1], 0));
      return row;
    })) : el('p', { class: 'small muted', style: 'margin-top:8px' }, ['—'])]);
  }
  function svg(n, a) { var x = document.createElementNS('http://www.w3.org/2000/svg', n); Object.keys(a || {}).forEach(function (k) { x.setAttribute(k, a[k]); }); return x; }
  function map(rows) {
    var T = window.GAIA_TUNISIA, W = 320, H = 560, x0 = 7.3, x1 = 11.8, y0 = 30.1, y1 = 37.6;
    var X = function (lon) { return (lon - x0) / (x1 - x0) * W; }, Y = function (lat) { return (y1 - lat) / (y1 - y0) * H; };
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('ad_map') + ' : ' + rows.length });
    if (T) T.geometry.coordinates.forEach(function (poly) {
      s.appendChild(svg('path', { d: poly.map(function (ring) { return 'M' + ring.map(function (c) { return X(c[0]).toFixed(1) + ' ' + Y(c[1]).toFixed(1); }).join('L') + 'Z'; }).join(''), class: 'land' }));
    });
    rows.forEach(function (u) {
      var g = svg('g', { class: 'dot' });
      g.appendChild(svg('circle', { cx: X(u.lon), cy: Y(u.lat), r: 14, class: 'hit' }));
      g.appendChild(svg('circle', { cx: X(u.lon), cy: Y(u.lat), r: 6, class: 'pt' }));
      G.bindTip(g, u.name + ' · ' + lab('c_', u.crop) + ' · ' + lab('w_', u.water));
      s.appendChild(g);
    });
    return el('section', { class: 'gp-card ad-map' }, [el('h2', null, [t('ad_map')]), el('p', { class: 'small muted', style: 'margin-top:4px' }, [rows.length ? t('ad_map_p') : t('ad_map_none')]), s]);
  }
  function table(heads, rows) {
    return el('div', { class: 'gp-table-wrap', style: 'margin-top:10px' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, heads.map(function (h) { return el('th', { scope: 'col' }, [h]); }))]),
      el('tbody', null, rows.map(function (r) { return el('tr', null, r.map(function (c) { return el('td', null, [c === null || c === undefined || c === '' ? '—' : c]); })); }))])]);
  }
  function card(title, sub, content) { return el('section', { class: 'gp-card', style: 'margin-top:16px' }, [el('h2', null, [title]), sub ? el('p', { class: 'small muted', style: 'margin-top:4px' }, [sub]) : null, content]); }
  function plot(u) {
    if (u.lat === null) return null;
    return el('a', { dir: 'ltr', style: 'white-space:nowrap', href: 'https://www.openstreetmap.org/?mlat=' + u.lat + '&mlon=' + u.lon + '#map=14/' + u.lat + '/' + u.lon, target: '_blank', rel: 'noopener noreferrer' }, [u.lat.toFixed(3) + ' · ' + u.lon.toFixed(3)]);
  }

  function csv(rows) {
    // a cell starting with = + - @ would run as a formula in a spreadsheet
    function cell(v) { v = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
    var head = ['ad_th_name', 'ad_role', 'ad_region', 'ad_crop', 'ad_th_water', 'lat', 'lon', 'ad_th_share', 'ad_th_join', 'ad_th_last', 'ad_th_irr'].map(function (k) { return /^ad_/.test(k) ? t(k) : k; });
    if (contacts) head.splice(1, 0, t('ad_th_contact'));
    var lines = [head].concat(rows.map(function (u) {
      var r = [u.name, lab('r_', u.role), u.region, u.lat === null ? '' : lab('c_', u.crop), u.lat === null ? '' : lab('w_', u.water), u.lat, u.lon, u.share ? t('ad_yes') : t('ad_no'),
        new Date(u.created_at * 1000).toISOString().slice(0, 10), u.last_sign_in ? new Date(u.last_sign_in * 1000).toISOString().slice(0, 10) : '', u.record ? u.record.irrigations : 0];
      if (contacts) r.splice(1, 0, u.identifier);
      return r;
    }));
    var blob = new Blob(['﻿' + lines.map(function (l) { return l.map(function (v, i) { return typeof v === 'number' ? v : cell(v); }).join(';'); }).join('\r\n')], { type: 'text/csv' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'gaia-admin-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------------------------------------------------------------- page */
  var box = null;
  function body() {
    G.clear(box);
    var rows = list(), plots = rows.filter(function (u) { return u.lat !== null; }), names = {};
    D.users.forEach(function (u) { names[u.id] = u.name; });
    var ids = {}; rows.forEach(function (u) { ids[u.id] = 1; });
    var filtered = rows.length !== D.users.length;
    var recent = rows.filter(function (u) { return D.generated_at - u.created_at < 30 * 86400; }).length;
    // records and requests follow the filter through their account
    var owner = {}; D.users.forEach(function (u) { owner[u.id] = u; });
    var recs = D.records.filter(function (r) { var o = owner[r.owner]; return !filtered || (o && ids[o.id]); });
    var shares = D.shares.filter(function (s) { return ids[s.from_id] || ids[s.to_id]; });
    var sum = function (k) { return recs.reduce(function (s, r) { return s + (+r[k] || 0); }, 0); };

    box.appendChild(el('p', { class: 'small muted', 'aria-live': 'polite', style: 'margin:10px 0 0' }, [fill('ad_shown', { n: rows.length, m: D.users.length })]));
    box.appendChild(el('div', { class: 'ad-kpis' }, [
      tile(t('ad_k_users'), rows.length, fill('ad_k_new', { n: recent })),
      tile(t('ad_k_plots'), plots.length, fill('ad_k_plots_p', { n: rows.length ? Math.round(100 * plots.length / rows.length) : 0 })),
      tile(t('ad_k_share'), rows.filter(function (u) { return u.share; }).length, fill('ad_k_match', { n: shares.filter(function (s) { return s.status === 'accepted'; }).length })),
      tile(t('ad_k_irr'), sum('irrigations'), fill('ad_k_irr_p', { n: recs.length })),
      tile(t('ad_k_al'), sum('unread_alerts'), fill('ad_k_al_p', { n: sum('monitoring') }))
    ]));
    box.appendChild(el('div', { class: 'ad-grid' }, [map(plots), el('div', { class: 'ad-col' }, [
      bars(t('ad_by_crop'), count(plots, 'crop'), function (k) { return t('c_' + k); }), bars(t('ad_by_water'), count(plots, 'water'), function (k) { return t('w_' + k); }),
      bars(t('ad_by_region'), count(rows, 'region'), function (k) { return k; }), bars(t('ad_by_role'), count(rows, 'role'), function (k) { return t('r_' + k); })])]));

    box.appendChild(card(t('ad_table'), null, el('div', null, [
      el('div', { class: 'ad-row' }, [
        el('button', { type: 'button', class: 'gp-btn ghost sm', 'aria-pressed': String(contacts), onclick: function () { contacts = !contacts; body(); } }, [t(contacts ? 'ad_hide' : 'ad_show')]),
        el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () { csv(rows); } }, [t('ad_csv')]), el('span', { class: 'small muted' }, [t('ad_csv_p')])]),
      table([t('ad_th_name'), t('ad_th_contact'), t('ad_role'), t('ad_region'), t('ad_crop'), t('ad_th_water'), t('ad_th_plot'), t('ad_th_share'), t('ad_th_irr'), t('ad_th_join'), t('ad_th_last')], rows.map(function (u) {
        return [el('span', null, [el('b', null, [u.name]), u.is_admin ? el('span', { class: 'ad-tag' }, ['admin']) : null]), el('span', { dir: 'ltr' }, [contacts ? u.identifier : masked(u.identifier)]), lab('r_', u.role), u.region,
          u.lat === null ? null : lab('c_', u.crop), u.lat === null ? null : lab('w_', u.water), plot(u), u.lat === null ? null : t(u.share ? 'ad_yes' : 'ad_no'), u.record ? fmt(u.record.irrigations, 0) : null, date(u.created_at), date(u.last_sign_in)];
      }))])));

    box.appendChild(card(t('ad_rec'), null, recs.length ? table([t('ad_th_owner'), t('ad_th_plot'), t('ad_crop'), t('ad_th_plan'), t('ad_th_irr'), t('ad_th_lastirr'), t('ad_th_mon'), t('ad_th_alert')], recs.map(function (r) {
      var o = owner[r.owner], a = r.last_alert, tx = a && a.text ? (typeof a.text === 'string' ? a.text : a.text[G.lang()] || a.text.fr || a.text.en) : null;
      return [o ? o.name : null, plot(r), r.crop ? lab('c_', r.crop) : null, fmt(r.planned_days, 0), fmt(r.irrigations, 0), iso(r.last_irrigation), t(r.monitoring ? 'ad_yes' : 'ad_no'), tx ? G.noEmoji(tx).slice(0, 140) : null];
    })) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('ad_rec_none')])));

    box.appendChild(card(t('ad_sh'), null, shares.length ? table([t('ad_th_from'), t('ad_th_to'), t('ad_th_state'), t('ad_th_date')], shares.map(function (s) {
      return [names[s.from_id] || '#' + s.from_id, names[s.to_id] || '#' + s.to_id, t('ad_s_' + s.status), date(s.created_at)];
    })) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('ad_sh_none')])));

    box.appendChild(card(t('ad_fb'), null, D.feedback.length ? el('ul', { class: 'ad-fb' }, D.feedback.map(function (f) {
      return el('li', null, [el('span', { class: 'small muted' }, [iso(f.at) + (f.role ? ' · ' + f.role : '') + (f.kind ? ' · ' + f.kind : '')]), el('p', null, [f.text])]);
    })) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('ad_fb_none')])));
    box.appendChild(card(t('ad_log'), t('ad_log_p'), table([t('ad_th_name'), t('ad_th_date')], D.log.map(function (l) { return [l.name, when(l.at)]; }))));
  }

  function draw() {
    G.clear(app); box = null;
    if (st === 'load') { app.appendChild(el('p', { class: 'muted', role: 'status' }, [el('span', { class: 'gp-spin' }), ' ' + t('ad_load')])); return; }
    if (st !== 'ok') {
      app.appendChild(el('div', { class: 'gp-card ad-gate' }, [G.note(st === '403' ? 'err' : 'info', t(st === 'in' ? 'ad_in' : st === '403' ? 'ad_403' : 'ad_srv')),
        el('div', { class: 'ad-row' }, [st === 'in' ? el('a', { class: 'gp-btn primary', href: 'account.html' }, [t('ad_go')]) : st === 'srv' ? el('button', { type: 'button', class: 'gp-btn primary', onclick: load }, [t('ad_retry')]) : null])]));
      return;
    }
    var uniq = function (k) { var s = {}; D.users.forEach(function (u) { if (k !== 'crop' || u.lat !== null) s[u[k] || '-'] = 1; }); return Object.keys(s).sort(); };
    var opt = function (k, p) { return uniq(k).map(function (v) { return [v, v === '-' ? t('ad_none') : p ? t(p + v) : v]; }); };
    app.appendChild(el('div', { class: 'ad-filters' }, [
      el('div', { class: 'gp-field' }, [el('label', { for: 'ad-q' }, [t('ad_q')]), el('input', { id: 'ad-q', type: 'search', value: F.q, placeholder: t('ad_q_ph'), oninput: function (e) { F.q = e.target.value; body(); } })]),
      select('ad-role', t('ad_role'), 'role', opt('role', 'r_')), select('ad-crop', t('ad_crop'), 'crop', opt('crop', 'c_')), select('ad-region', t('ad_region'), 'region', opt('region')),
      el('div', { class: 'ad-row' }, [el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () { F = { q: '', role: '', crop: '', region: '' }; draw(); } }, [t('ad_reset')]),
        el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: load }, [G.iconText('refresh', t('ad_refresh'))]), el('span', { class: 'small muted' }, [fill('ad_updated', { h: new Date(D.generated_at * 1000).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' }) })])])]));
    box = el('div'); app.appendChild(box);
    body();
  }

  var who = null;
  G.auth.onChange(function (u) { var id = u ? u.id : null; if (id !== who) { who = id; D = null; contacts = false; load(); } });   // signed out or another account: nothing stays on screen
  G.onLang(draw);
  who = G.auth.user() ? G.auth.user().id : null;
  load();
}());
