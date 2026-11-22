/* GAIA account page: sign in, create an account, see the profile, sign out. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t;

  G.addStrings({
    fr: { ac_title: 'Mon compte', ac_lead: 'Un compte pour retrouver votre exploitation : agriculteur, coopérative, agronome ou partenaire.',
      ac_in: 'Se connecter', ac_up: 'Créer un compte', ac_name: 'Votre nom', ac_id: 'E-mail ou numéro de téléphone', ac_id_h: 'Par exemple 98 123 456 ou nom@exemple.tn',
      ac_pw: 'Mot de passe', ac_pw_h: 'Au moins 8 caractères.', ac_show: 'Afficher', ac_hide: 'Masquer', ac_role: 'Je suis', ac_region: 'Gouvernorat',
      r_farmer: 'Agriculteur', r_cooperative: 'Coopérative (GDA, SMSA)', r_agronomist: 'Agronome', r_partner: 'Partenaire ou chercheur',
      ac_go_in: 'Se connecter', ac_go_up: 'Créer mon compte', ac_wait: 'Un instant…', ac_guest: 'Continuer sans compte',
      ac_hello: 'Bonjour {n}', ac_since: 'Membre depuis', ac_out: 'Se déconnecter', ac_out_done: 'Vous êtes déconnecté sur cet appareil.',
      ac_open: 'Ouvrir mon tableau de bord', ac_device: 'Votre parcelle et vos saisies restent enregistrées sur cet appareil.',
      ac_why_t: 'Pourquoi un compte ?', ac_why: ['Retrouver votre exploitation et votre contrat de pompage solaire.', 'Rejoindre la coopérative de votre zone et partager une pompe.', 'Suivre vos mensualités et votre quota d’eau.'],
      ac_safe_t: 'Vos données', ac_safe: 'Le mot de passe n’est jamais conservé en clair : le serveur ne garde qu’une empreinte (PBKDF2). Après 5 essais faux, le compte est bloqué 15 minutes.',
      e_no_server: 'Le serveur des comptes n’est pas joignable. Lancez le backend GAIA (port 8765), ou continuez sans compte.',
      e_bad_credentials: 'E-mail, téléphone ou mot de passe incorrect.', e_exists: 'Un compte utilise déjà cet e-mail ou ce numéro. Connectez-vous.',
      e_weak_password: 'Le mot de passe doit contenir au moins 8 caractères.', e_bad_identifier: 'Entrez un e-mail ou un numéro de téléphone valide.',
      e_bad_name: 'Entrez votre nom.', e_locked: 'Trop d’essais. Réessayez dans 15 minutes.', e_other: 'Une erreur est survenue. Réessayez.',
      ac_disabled: 'Les comptes ne sont pas activés sur ce site. Vous pouvez utiliser GAIA sans compte.' },
    ar: { ac_title: 'حسابي', ac_lead: 'حساب لتجد ضيعتك من جديد: فلاح، تعاضدية، مهندس فلاحي أو شريك.',
      ac_in: 'تسجيل الدخول', ac_up: 'إنشاء حساب', ac_name: 'الاسم', ac_id: 'البريد الإلكتروني أو رقم الهاتف', ac_id_h: 'مثلاً 98 123 456 أو name@example.tn',
      ac_pw: 'كلمة السر', ac_pw_h: '8 أحرف على الأقل.', ac_show: 'إظهار', ac_hide: 'إخفاء', ac_role: 'أنا', ac_region: 'الولاية',
      r_farmer: 'فلاح', r_cooperative: 'تعاضدية (مجمع تنمية، شركة تعاونية)', r_agronomist: 'مهندس فلاحي', r_partner: 'شريك أو باحث',
      ac_go_in: 'دخول', ac_go_up: 'إنشاء حسابي', ac_wait: 'لحظة…', ac_guest: 'المواصلة بدون حساب',
      ac_hello: 'مرحباً {n}', ac_since: 'عضو منذ', ac_out: 'تسجيل الخروج', ac_out_done: 'تم تسجيل خروجك على هذا الجهاز.',
      ac_open: 'فتح لوحة المتابعة', ac_device: 'تبقى قطعتك ومدخلاتك محفوظة على هذا الجهاز.',
      ac_why_t: 'لماذا حساب؟', ac_why: ['تجد ضيعتك وعقد الضخ الشمسي.', 'تنضم إلى تعاضدية منطقتك وتتقاسم مضخة.', 'تتابع أقساطك وحصتك من الماء.'],
      ac_safe_t: 'بياناتك', ac_safe: 'لا تُحفظ كلمة السر أبداً كما هي: يحتفظ الخادم ببصمة فقط (PBKDF2). بعد 5 محاولات خاطئة يُغلق الحساب 15 دقيقة.',
      e_no_server: 'خادم الحسابات غير متاح. شغّل خادم GAIA (المنفذ 8765) أو واصل بدون حساب.',
      e_bad_credentials: 'البريد أو الهاتف أو كلمة السر غير صحيحة.', e_exists: 'هذا البريد أو الرقم مستعمل في حساب آخر. سجّل الدخول.',
      e_weak_password: 'يجب أن تحتوي كلمة السر على 8 أحرف على الأقل.', e_bad_identifier: 'أدخل بريداً إلكترونياً أو رقم هاتف صحيحاً.',
      e_bad_name: 'أدخل اسمك.', e_locked: 'محاولات كثيرة. أعد المحاولة بعد 15 دقيقة.', e_other: 'حدث خطأ. أعد المحاولة.',
      ac_disabled: 'الحسابات غير مفعّلة في هذا الموقع. يمكنك استعمال GAIA بدون حساب.' },
    en: { ac_title: 'My account', ac_lead: 'An account to find your farm again: farmer, cooperative, agronomist or partner.',
      ac_in: 'Sign in', ac_up: 'Create an account', ac_name: 'Your name', ac_id: 'Email or phone number', ac_id_h: 'For example 98 123 456 or name@example.tn',
      ac_pw: 'Password', ac_pw_h: 'At least 8 characters.', ac_show: 'Show', ac_hide: 'Hide', ac_role: 'I am', ac_region: 'Governorate',
      r_farmer: 'Farmer', r_cooperative: 'Cooperative (GDA, SMSA)', r_agronomist: 'Agronomist', r_partner: 'Partner or researcher',
      ac_go_in: 'Sign in', ac_go_up: 'Create my account', ac_wait: 'One moment…', ac_guest: 'Continue without an account',
      ac_hello: 'Hello {n}', ac_since: 'Member since', ac_out: 'Sign out', ac_out_done: 'You are signed out on this device.',
      ac_open: 'Open my dashboard', ac_device: 'Your plot and your entries stay saved on this device.',
      ac_why_t: 'Why an account?', ac_why: ['Find your farm and your solar pumping contract again.', 'Join the cooperative of your area and share a pump.', 'Follow your instalments and your water quota.'],
      ac_safe_t: 'Your data', ac_safe: 'The password is never kept in clear: the server stores only a fingerprint (PBKDF2). After 5 wrong attempts the account is locked for 15 minutes.',
      e_no_server: 'The account server cannot be reached. Start the GAIA backend (port 8765), or continue without an account.',
      e_bad_credentials: 'Wrong email, phone or password.', e_exists: 'An account already uses this email or number. Sign in instead.',
      e_weak_password: 'The password needs at least 8 characters.', e_bad_identifier: 'Enter a valid email or phone number.',
      e_bad_name: 'Enter your name.', e_locked: 'Too many attempts. Try again in 15 minutes.', e_other: 'Something went wrong. Try again.',
      ac_disabled: 'Accounts are not enabled on this site. You can use GAIA without an account.' },
    ja: { ac_title: 'マイアカウント', ac_lead: '農家、協同組合、農業技術者、パートナーのためのアカウントで、あなたの農場をいつでも確認できます。',
      ac_in: 'ログイン', ac_up: 'アカウント作成', ac_name: 'お名前', ac_id: 'メールアドレスまたは電話番号', ac_id_h: '例：98 123 456 または name@example.tn',
      ac_pw: 'パスワード', ac_pw_h: '8文字以上。', ac_show: '表示', ac_hide: '隠す', ac_role: '立場', ac_region: '県（ウィラーヤ）',
      r_farmer: '農家', r_cooperative: '協同組合（GDA、SMSA）', r_agronomist: '農業技術者', r_partner: 'パートナー・研究者',
      ac_go_in: 'ログイン', ac_go_up: 'アカウントを作成', ac_wait: 'お待ちください…', ac_guest: 'アカウントなしで続ける',
      ac_hello: 'こんにちは、{n}さん', ac_since: '登録日', ac_out: 'ログアウト', ac_out_done: 'この端末からログアウトしました。',
      ac_open: 'ダッシュボードを開く', ac_device: '区画と入力内容はこの端末に保存されたままです。',
      ac_why_t: 'アカウントのメリット', ac_why: ['農場と太陽光揚水の契約をいつでも確認できます。', '地域の協同組合に参加してポンプを共有できます。', '月々の支払いと水の割当量を確認できます。'],
      ac_safe_t: 'あなたのデータ', ac_safe: 'パスワードはそのままでは保存されず、サーバーには指紋（PBKDF2）だけが残ります。5回間違えると15分間ロックされます。',
      e_no_server: 'アカウントサーバーに接続できません。GAIAバックエンド（ポート8765）を起動するか、アカウントなしで続けてください。',
      e_bad_credentials: 'メール・電話番号またはパスワードが違います。', e_exists: 'このメールまたは番号はすでに使われています。ログインしてください。',
      e_weak_password: 'パスワードは8文字以上にしてください。', e_bad_identifier: '正しいメールアドレスまたは電話番号を入力してください。',
      e_bad_name: 'お名前を入力してください。', e_locked: '試行回数が多すぎます。15分後にもう一度お試しください。', e_other: 'エラーが発生しました。もう一度お試しください。',
      ac_disabled: 'このサイトではアカウントが有効になっていません。アカウントなしでGAIAを使えます。' }
  });

  G.addStrings({
    fr: { fm_t: 'Ma parcelle', fm_from: 'Parcelle choisie sur cet appareil', fm_link: 'Lier cette parcelle à mon compte',
      fm_none: 'Aucune parcelle choisie sur cet appareil. Choisissez-la sur la carte pour trouver vos voisins.', fm_pick: 'Choisir ma parcelle sur la carte',
      fm_crop: 'Culture principale', fm_water: 'Source d’eau', fm_share: 'Me proposer à mes voisins pour partager l’eau',
      fm_share_h: 'Vos voisins voient votre prénom, votre culture, votre source d’eau et une distance arrondie, jamais votre position exacte. Votre contact n’est donné qu’après votre accord.',
      fm_save: 'Enregistrer', fm_saved: 'Parcelle enregistrée.', fm_use_device: 'Lier la parcelle choisie sur cet appareil', fm_visible: 'Visible par les voisins', fm_hidden: 'Non visible',
      c_olive: 'Olivier', c_palm: 'Palmier dattier', c_citrus: 'Agrumes', c_cereal: 'Céréales', c_veg: 'Maraîchage', c_other: 'Autre',
      w_rainfed: 'Pluie seulement', w_well: 'Puits ou forage', w_network: 'Réseau d’irrigation', w_shared: 'Source partagée (GDA)',
      nb_t: 'Voisins pour partager l’eau', nb_p: 'Des agriculteurs proches qui veulent, eux aussi, partager une source ou une pompe solaire. Des calendriers d’irrigation complémentaires rendent le partage facile.',
      nb_within: 'Dans un rayon de', nb_none: 'Aucun voisin visible dans ce rayon pour l’instant. Élargissez la zone, ou invitez vos voisins à créer leur compte.',
      nb_hidden: 'Vous n’êtes pas visible. Cochez « Me proposer à mes voisins » dans Ma parcelle pour envoyer et recevoir des demandes.',
      nb_nofarm: 'Liez d’abord votre parcelle pour voir vos voisins.', nb_km: '≈ {d} km',
      nb_fit_good: 'Calendriers complémentaires : {n} mois de besoin en commun', nb_fit_same: 'Besoin d’eau aux mêmes mois ({n}) : un tour d’eau sera à organiser', nb_fit_unk: 'Culture non renseignée',
      nb_ask: 'Proposer de partager', nb_sent: 'Demande envoyée', nb_accept: 'Accepter', nb_decline: 'Refuser', nb_declined: 'Demande refusée',
      nb_recv: 'veut partager l’eau avec vous', nb_match: 'Partage accepté', nb_contact: 'Contact :', nb_compare: 'Comparer nos besoins en eau', nb_err: 'Impossible de charger vos voisins.' },
    ar: { fm_t: 'قطعتي', fm_from: 'القطعة المختارة على هذا الجهاز', fm_link: 'ربط هذه القطعة بحسابي',
      fm_none: 'لم تختر قطعة على هذا الجهاز. اخترها على الخريطة لتجد جيرانك.', fm_pick: 'اختيار قطعتي على الخريطة',
      fm_crop: 'الزراعة الرئيسية', fm_water: 'مصدر الماء', fm_share: 'اقترحني على جيراني لتقاسم الماء',
      fm_share_h: 'يرى جيرانك اسمك الأول وزراعتك ومصدر مائك ومسافة تقريبية، ولا يرون موقعك الدقيق أبداً. لا يُعطى رقمك إلا بعد موافقتك.',
      fm_save: 'حفظ', fm_saved: 'تم حفظ القطعة.', fm_use_device: 'ربط القطعة المختارة على هذا الجهاز', fm_visible: 'ظاهر للجيران', fm_hidden: 'غير ظاهر',
      c_olive: 'زيتون', c_palm: 'نخيل', c_citrus: 'قوارص', c_cereal: 'حبوب', c_veg: 'خضروات', c_other: 'أخرى',
      w_rainfed: 'أمطار فقط', w_well: 'بئر', w_network: 'شبكة ري', w_shared: 'مصدر مشترك (مجمع تنمية فلاحية)',
      nb_t: 'جيران لتقاسم الماء', nb_p: 'فلاحون قريبون يريدون أيضاً تقاسم مصدر أو مضخة شمسية. رزنامات ري متكاملة تجعل التقاسم سهلاً.',
      nb_within: 'في دائرة', nb_none: 'لا يوجد جار ظاهر في هذه الدائرة حالياً. وسّع المنطقة أو ادعُ جيرانك لإنشاء حساب.',
      nb_hidden: 'أنت غير ظاهر. فعّل «اقترحني على جيراني» في قطعتي لإرسال الطلبات واستقبالها.',
      nb_nofarm: 'اربط قطعتك أولاً لترى جيرانك.', nb_km: '≈ {d} كم',
      nb_fit_good: 'رزنامات متكاملة: {n} أشهر حاجة مشتركة', nb_fit_same: 'حاجة للماء في نفس الأشهر ({n}): يجب تنظيم دور السقي', nb_fit_unk: 'الزراعة غير محددة',
      nb_ask: 'اقتراح التقاسم', nb_sent: 'تم إرسال الطلب', nb_accept: 'قبول', nb_decline: 'رفض', nb_declined: 'تم رفض الطلب',
      nb_recv: 'يريد تقاسم الماء معك', nb_match: 'تم قبول التقاسم', nb_contact: 'الاتصال:', nb_compare: 'مقارنة حاجتنا من الماء', nb_err: 'تعذر تحميل الجيران.' },
    en: { fm_t: 'My plot', fm_from: 'Plot chosen on this device', fm_link: 'Link this plot to my account',
      fm_none: 'No plot chosen on this device yet. Pick it on the map to find your neighbours.', fm_pick: 'Pick my plot on the map',
      fm_crop: 'Main crop', fm_water: 'Water source', fm_share: 'Offer me to my neighbours to share water',
      fm_share_h: 'Your neighbours see your first name, crop, water source and a rounded distance, never your exact position. Your contact is given only after you agree.',
      fm_save: 'Save', fm_saved: 'Plot saved.', fm_use_device: 'Link the plot chosen on this device', fm_visible: 'Visible to neighbours', fm_hidden: 'Not visible',
      c_olive: 'Olive', c_palm: 'Date palm', c_citrus: 'Citrus', c_cereal: 'Cereals', c_veg: 'Vegetables', c_other: 'Other',
      w_rainfed: 'Rain only', w_well: 'Well or borehole', w_network: 'Irrigation network', w_shared: 'Shared source (GDA)',
      nb_t: 'Neighbours to share water', nb_p: 'Nearby farmers who also want to share a source or a solar pump. Complementary irrigation calendars make sharing easy.',
      nb_within: 'Within', nb_none: 'No visible neighbour within this radius yet. Widen the area, or invite your neighbours to create an account.',
      nb_hidden: 'You are not visible. Tick “Offer me to my neighbours” in My plot to send and receive requests.',
      nb_nofarm: 'Link your plot first to see your neighbours.', nb_km: '≈ {d} km',
      nb_fit_good: 'Complementary calendars: {n} months of shared need', nb_fit_same: 'Water needed in the same months ({n}): an irrigation turn to organise', nb_fit_unk: 'Crop not given',
      nb_ask: 'Offer to share', nb_sent: 'Request sent', nb_accept: 'Accept', nb_decline: 'Decline', nb_declined: 'Request declined',
      nb_recv: 'wants to share water with you', nb_match: 'Sharing agreed', nb_contact: 'Contact:', nb_compare: 'Compare our water needs', nb_err: 'Could not load your neighbours.' },
    ja: { fm_t: 'わたしの区画', fm_from: 'この端末で選んだ区画', fm_link: 'この区画をアカウントに登録する',
      fm_none: 'この端末ではまだ区画が選ばれていません。地図で選ぶと近くの農家が見つかります。', fm_pick: '地図で区画を選ぶ',
      fm_crop: '主な作物', fm_water: '水源', fm_share: '近くの農家に水の共有を提案する',
      fm_share_h: '近くの農家に見えるのは、名前（名）、作物、水源、おおよその距離だけで、正確な位置は見えません。連絡先はあなたが同意したときだけ伝わります。',
      fm_save: '保存', fm_saved: '区画を保存しました。', fm_use_device: 'この端末で選んだ区画を登録する', fm_visible: '近くの農家に表示', fm_hidden: '非表示',
      c_olive: 'オリーブ', c_palm: 'ナツメヤシ', c_citrus: '柑橘', c_cereal: '穀物', c_veg: '野菜', c_other: 'その他',
      w_rainfed: '雨水のみ', w_well: '井戸・ボーリング井', w_network: '灌漑網', w_shared: '共同水源（GDA）',
      nb_t: '水を共有できる近くの農家', nb_p: '水源や太陽光ポンプを共有したい近くの農家です。灌漑の時期がずれていると共有しやすくなります。',
      nb_within: '半径', nb_none: 'この範囲にはまだ表示されている農家がいません。範囲を広げるか、近くの農家にアカウント作成を勧めてください。',
      nb_hidden: 'あなたは表示されていません。「わたしの区画」で「近くの農家に提案する」をオンにすると、依頼を送受信できます。',
      nb_nofarm: '先に区画を登録してください。', nb_km: '約 {d} km',
      nb_fit_good: '時期がずれている：必要な月の重なりは{n}か月', nb_fit_same: '同じ月に水が必要（{n}か月）：水の順番を決める必要があります', nb_fit_unk: '作物が未入力',
      nb_ask: '共有を提案', nb_sent: '依頼を送りました', nb_accept: '承認', nb_decline: '断る', nb_declined: '依頼は断られました',
      nb_recv: 'があなたと水を共有したいと言っています', nb_match: '共有が成立', nb_contact: '連絡先：', nb_compare: '水の必要量を比べる', nb_err: '近くの農家を読み込めませんでした。' }
  });
  G.addStrings({
    fr: { fg_link: 'Mot de passe oublié ?', fg_t: 'Mot de passe oublié', fg_p: 'Entrez l’e-mail ou le numéro de votre compte. Nous vous envoyons un code à 6 chiffres, valable 15 minutes.',
      fg_send: 'Recevoir un code', fg_sent: 'Si un compte existe pour {id}, un code à 6 chiffres vient d’être envoyé (par e-mail ; en démonstration, il s’affiche dans la console du serveur GAIA).',
      fg_code: 'Code à 6 chiffres', fg_new: 'Nouveau mot de passe', fg_save: 'Changer le mot de passe', fg_again: 'Renvoyer un code', fg_back: '← Retour à la connexion',
      e_bad_code: 'Code incorrect ou expiré. Demandez-en un nouveau.', fg_sent_mail: 'Si un compte existe pour {id}, un code à 6 chiffres vient d’être envoyé par e-mail. Regardez aussi dans les courriers indésirables.', fg_sent_wa: 'Si un compte existe pour {id}, un code à 6 chiffres vient d’être envoyé sur WhatsApp.', fg_demo: 'Mode démo', fg_demo_p: 'Aucun service d’e-mail n’est branché : en démonstration locale, votre code s’affiche ici. Il est déjà rempli ci-dessous.' },
    ar: { fg_link: 'نسيت كلمة السر؟', fg_t: 'نسيت كلمة السر', fg_p: 'أدخل البريد أو الرقم المرتبط بحسابك. نرسل لك رمزاً من 6 أرقام صالحاً 15 دقيقة.',
      fg_send: 'استلام رمز', fg_sent: 'إن وُجد حساب لـ {id}، فقد أُرسل رمز من 6 أرقام (بالبريد؛ في العرض التجريبي يظهر في وحدة تحكم خادم GAIA).',
      fg_code: 'رمز من 6 أرقام', fg_new: 'كلمة سر جديدة', fg_save: 'تغيير كلمة السر', fg_again: 'إعادة إرسال رمز', fg_back: '→ الرجوع إلى تسجيل الدخول',
      e_bad_code: 'الرمز غير صحيح أو منتهي الصلاحية. اطلب رمزاً جديداً.', fg_sent_mail: 'إن وُجد حساب لـ {id}، فقد أُرسل رمز من 6 أرقام بالبريد الإلكتروني. تحقق أيضاً من البريد غير المرغوب فيه.', fg_sent_wa: 'إن وُجد حساب لـ {id}، فقد أُرسل رمز من 6 أرقام على واتساب.', fg_demo: 'وضع العرض', fg_demo_p: 'لا توجد خدمة بريد موصولة: في العرض المحلي يظهر رمزك هنا، وقد مُلئ أدناه.' },
    en: { fg_link: 'Forgot your password?', fg_t: 'Forgot your password', fg_p: 'Enter the email or phone number of your account. We send you a 6-digit code, valid for 15 minutes.',
      fg_send: 'Get a code', fg_sent: 'If an account exists for {id}, a 6-digit code has just been sent (by email; in the demo it appears in the GAIA server console).',
      fg_code: '6-digit code', fg_new: 'New password', fg_save: 'Change the password', fg_again: 'Send a new code', fg_back: '← Back to sign in',
      e_bad_code: 'Wrong or expired code. Ask for a new one.', fg_sent_mail: 'If an account exists for {id}, a 6-digit code has just been sent by email. Check your spam folder too.', fg_sent_wa: 'If an account exists for {id}, a 6-digit code has just been sent on WhatsApp.', fg_demo: 'Demo mode', fg_demo_p: 'No email service is connected: in the local demo your code is shown here. It is already filled in below.' },
    ja: { fg_link: 'パスワードをお忘れですか？', fg_t: 'パスワードの再設定', fg_p: 'アカウントのメールアドレスまたは電話番号を入力してください。15分間有効な6桁のコードを送ります。',
      fg_send: 'コードを受け取る', fg_sent: '{id} のアカウントがあれば、6桁のコードを送りました（メールで送信。デモではGAIAサーバーのコンソールに表示されます）。',
      fg_code: '6桁のコード', fg_new: '新しいパスワード', fg_save: 'パスワードを変更', fg_again: 'コードを再送する', fg_back: '← ログインに戻る',
      e_bad_code: 'コードが違うか期限切れです。新しいコードを請求してください。', fg_sent_mail: '{id} のアカウントがあれば、6桁のコードをメールで送りました。迷惑メールフォルダも確認してください。', fg_sent_wa: '{id} のアカウントがあれば、6桁のコードをWhatsAppで送りました。', fg_demo: 'デモモード', fg_demo_p: 'メール送信サービスが未接続のため、ローカルのデモではコードをここに表示します。下の欄にすでに入力済みです。' }
  });
  var CROPS = ['olive', 'palm', 'citrus', 'cereal', 'veg', 'other'], WATERS = ['rainfed', 'well', 'network', 'shared'];
  var N = window.GAIA_NEXUS;
  // the plot chosen on this device (Land Intelligence), and what its LAND DNA already knows
  function devicePlot() {
    var p = G.getParcel();
    if (!p || typeof p.lat !== 'number') return null;
    var ok = function (f) { return f && f.status === 'ok' ? f.value : null; };
    var dna = p.dna || {};
    return { lat: p.lat, lon: p.lon, crop: ok(dna.crop), water: ok(dna.water && dna.water.source) };
  }
  function selectOf(id, keys, prefix, val, onchange) {
    return el('select', { id: id, onchange: function (e) { onchange(e.target.value || null); } },
      [el('option', { value: '' }, ['—'])].concat(keys.map(function (k) { return el('option', { value: k, selected: val === k }, [t(prefix + k)]); })));
  }
  function check(id, label, val, onchange, hint) {
    return el('label', { class: 'acc-check', for: id }, [
      el('input', { id: id, type: 'checkbox', checked: val ? true : null, onchange: function (e) { onchange(e.target.checked); } }),
      el('span', null, [label, hint ? el('span', { class: 'hint', style: 'display:block;margin-top:2px' }, [hint]) : null])
    ]);
  }
  function farmFields(F, prefix) {
    return el('div', { class: 'acc-2' }, [
      el('div', { class: 'gp-field' }, [el('label', { for: prefix + '-crop' }, [t('fm_crop')]), selectOf(prefix + '-crop', CROPS, 'c_', F.crop, function (v) { F.crop = v; })]),
      el('div', { class: 'gp-field' }, [el('label', { for: prefix + '-water' }, [t('fm_water')]), selectOf(prefix + '-water', WATERS, 'w_', F.water, function (v) { F.water = v; })])
    ]);
  }
  var DP = devicePlot();
  var SF = { link: !!DP, crop: DP && DP.crop, water: DP && DP.water, share: false };   // sign-up farm choices

  var REGIONS = ['Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba',
    'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'];
  var ROLES = ['farmer', 'cooperative', 'agronomist', 'partner'];

  G.mountShell('account');
  var app = document.getElementById('app');
  var S = { mode: 'in', role: 'farmer', busy: false, msg: null, msgKind: 'err', form: { name: '', id: '', pw: '', region: '' }, show: false };

  function errText(e) { return t('e_' + (e && e.code && t('e_' + e.code) !== 'e_' + e.code ? e.code : 'other')); }

  function field(id, label, input, hint) {
    return el('div', { class: 'gp-field' }, [el('label', { for: id }, [label]), input, hint ? el('span', { class: 'hint' }, [hint]) : null]);
  }

  function forgotCard() {
    var f = S.form;
    var go = function (p, next) {
      if (S.busy) return;
      S.busy = true; S.msg = null; render();
      p().then(function () { S.busy = false; next(); render(); }, function (err) { S.busy = false; S.msg = errText(err); S.msgKind = 'err'; render(); });
    };
    var body;
    if (S.fstep !== 2) {
      body = el('form', { class: 'acc-form', novalidate: true, onsubmit: function (e) {
        e.preventDefault();
        go(function () { return G.auth.forgot(f.id).then(function (r) { S.fdemo = r && r.demo_code ? r.demo_code : null; S.fchannel = r && r.channel; }); },
          function () { S.fstep = 2; if (S.fdemo) f.code = S.fdemo; });
      } }, [
        el('p', { class: 'small', style: 'color:var(--g-ink-2)' }, [t('fg_p')]),
        field('ac-id', t('ac_id'), el('input', { id: 'ac-id', type: 'text', autocomplete: 'username', value: f.id, oninput: function (e) { f.id = e.target.value; } }), t('ac_id_h')),
        S.msg ? G.note(S.msgKind, S.msg) : null,
        el('button', { type: 'submit', class: 'gp-btn primary', disabled: S.busy ? true : null }, [S.busy ? t('ac_wait') : t('fg_send')])
      ]);
    } else {
      body = el('form', { class: 'acc-form', novalidate: true, onsubmit: function (e) {
        e.preventDefault();
        go(function () { return G.auth.reset(f.id, f.code || '', f.pw); }, function () { f.pw = ''; f.code = ''; S.mode = 'in'; S.fstep = 1; });
      } }, [
        S.fdemo ? el('div', { class: 'acc-demo-code', role: 'status' }, [el('span', { class: 'pay-sim' }, [t('fg_demo')]), el('span', null, [t('fg_demo_p')]), el('b', null, [S.fdemo])])
          : G.note('info', t(S.fchannel === 'email' ? 'fg_sent_mail' : S.fchannel === 'whatsapp' ? 'fg_sent_wa' : 'fg_sent').replace('{id}', f.id)),
        field('ac-code', t('fg_code'), el('input', { id: 'ac-code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, value: f.code || '',
          oninput: function (e) { f.code = e.target.value.replace(/\D/g, ''); } })),
        field('ac-pw', t('fg_new'), el('input', { id: 'ac-pw', type: S.show ? 'text' : 'password', autocomplete: 'new-password', minlength: 8, value: f.pw,
          oninput: function (e) { f.pw = e.target.value; } }), t('ac_pw_h')),
        S.msg ? G.note(S.msgKind, S.msg) : null,
        el('button', { type: 'submit', class: 'gp-btn primary', disabled: S.busy ? true : null }, [S.busy ? t('ac_wait') : t('fg_save')]),
        el('button', { type: 'button', class: 'gp-btn ghost', onclick: function () { S.fstep = 1; S.msg = null; render(); } }, [t('fg_again')])
      ]);
    }
    return el('section', { class: 'gp-card' }, [
      el('h2', null, [t('fg_t')]),
      el('div', { style: 'margin-top:10px' }, [body]),
      el('button', { type: 'button', class: 'acc-link', onclick: function () { S.mode = 'in'; S.fstep = 1; S.msg = null; render(); } }, [t('fg_back')])
    ]);
  }

  function formCard() {
    if (S.mode === 'forgot') return forgotCard();
    var up = S.mode === 'up', f = S.form;
    var inp = function (id, key, type, auto) {
      return el('input', { id: id, type: type, autocomplete: auto, value: f[key], required: true,
        oninput: function (e) { f[key] = e.target.value; } });
    };
    var pw = inp('ac-pw', 'pw', S.show ? 'text' : 'password', up ? 'new-password' : 'current-password');
    pw.setAttribute('minlength', '8');
    var form = el('form', { class: 'acc-form', novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      if (S.busy) return;
      S.busy = true; S.msg = null; render();
      var farm = up && DP && SF.link ? { lat: DP.lat, lon: DP.lon, crop: SF.crop, water: SF.water, share: SF.share } : null;
      var p = up ? G.auth.signup({ name: f.name, identifier: f.id, password: f.pw, role: S.role, region: f.region || null, farm: farm }) : G.auth.login(f.id, f.pw);
      p.then(function () { f.pw = ''; S.busy = false; render(); }, function (err) { S.busy = false; S.msg = errText(err); S.msgKind = 'err'; f.pw = ''; render(); });
    } }, [
      up ? field('ac-name', t('ac_name'), inp('ac-name', 'name', 'text', 'name')) : null,
      field('ac-id', t('ac_id'), inp('ac-id', 'id', 'text', 'username'), t('ac_id_h')),
      field('ac-pw', t('ac_pw'), el('div', { class: 'acc-pw' }, [pw,
        el('button', { type: 'button', 'aria-controls': 'ac-pw', onclick: function () { S.show = !S.show; render(); document.getElementById('ac-pw').focus(); } }, [S.show ? t('ac_hide') : t('ac_show')])]),
        up ? t('ac_pw_h') : null),
      up ? null : el('button', { type: 'button', class: 'acc-link', style: 'justify-self:start', onclick: function () { S.mode = 'forgot'; S.fstep = 1; S.msg = null; render(); } }, [t('fg_link')]),
      up ? el('div', { class: 'gp-field' }, [el('span', { class: 'lab' }, [t('ac_role')]),
        el('div', { class: 'acc-roles', role: 'group', 'aria-label': t('ac_role') }, ROLES.map(function (r) {
          return el('button', { type: 'button', 'aria-pressed': String(S.role === r), onclick: function () { S.role = r; render(); } }, [t('r_' + r)]);
        }))]) : null,
      up ? field('ac-region', t('ac_region'), el('select', { id: 'ac-region', onchange: function (e) { f.region = e.target.value; } },
        [el('option', { value: '' }, ['—'])].concat(REGIONS.map(function (r) { return el('option', { value: r, selected: f.region === r }, [r]); })))) : null,
      up ? signupFarm() : null,
      S.msg ? G.note(S.msgKind, S.msg) : null,
      el('button', { type: 'submit', class: 'gp-btn primary', disabled: S.busy ? true : null }, [S.busy ? t('ac_wait') : up ? t('ac_go_up') : t('ac_go_in')]),
      el('a', { class: 'gp-btn ghost', href: 'home.html' }, [t('ac_guest')])
    ]);
    return el('section', { class: 'gp-card' }, [
      el('div', { class: 'acc-tabs', role: 'tablist' }, [['in', 'ac_in'], ['up', 'ac_up']].map(function (m) {
        return el('button', { type: 'button', role: 'tab', 'aria-selected': String(S.mode === m[0]), onclick: function () { S.mode = m[0]; S.msg = null; render(); } }, [t(m[1])]);
      })),
      form
    ]);
  }

  function plotLine(p) { return G.fmt(p.lat, 3) + ', ' + G.fmt(p.lon, 3); }

  function signupFarm() {
    if (!DP) return el('div', { class: 'acc-farm' }, [el('h3', null, [t('fm_t')]), el('p', { class: 'small muted' }, [t('fm_none')]),
      el('a', { class: 'gp-btn ghost sm', href: 'land.html' }, [G.icon('pin', 15), t('fm_pick')])]);
    return el('div', { class: 'acc-farm' }, [
      el('h3', null, [t('fm_t')]),
      el('p', { class: 'small muted', style: 'display:flex;align-items:center;gap:6px' }, [G.icon('pin', 15), t('fm_from') + ' · ' + plotLine(DP)]),
      check('ac-link', t('fm_link'), SF.link, function (v) { SF.link = v; render(); }),
      SF.link ? farmFields(SF, 'su') : null,
      SF.link ? check('ac-share', t('fm_share'), SF.share, function (v) { SF.share = v; }, t('fm_share_h')) : null
    ]);
  }

  /* ---------------------------------------------------------- my plot + neighbours (signed in) */
  var NBS = { radius: 5, data: null, err: null, busy: false, msg: null };
  function farmCard(u) {
    var F = u.farm ? { crop: u.farm.crop, water: u.farm.water, share: u.farm.share } : { crop: DP && DP.crop, water: DP && DP.water, share: false };
    var save = function (pos) {
      G.auth.setFarm({ lat: pos.lat, lon: pos.lon, crop: F.crop, water: F.water, share: F.share }).then(function () { NBS.msg = t('fm_saved'); NBS.data = null; render(); loadNb(); },
        function (e) { NBS.msg = errText(e); render(); });
    };
    var body = [el('h2', null, [t('fm_t')])];
    if (!u.farm && !DP) {
      body.push(el('p', { class: 'small muted', style: 'margin-top:6px' }, [t('fm_none')]), el('a', { class: 'gp-btn ghost sm', style: 'margin-top:10px', href: 'land.html' }, [G.icon('pin', 15), t('fm_pick')]));
      return el('section', { class: 'gp-card' }, body);
    }
    var pos = u.farm || DP;
    body.push(
      el('p', { class: 'small muted', style: 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px' }, [G.icon('pin', 15), plotLine(pos),
        u.farm ? G.pill(u.farm.share ? 'ok' : 'unk', u.farm.share ? t('fm_visible') : t('fm_hidden')) : null]),
      el('div', { style: 'margin-top:10px' }, [farmFields(F, 'pf')]),
      el('div', { style: 'margin-top:10px' }, [check('pf-share', t('fm_share'), F.share, function (v) { F.share = v; }, t('fm_share_h'))]),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px' }, [
        el('button', { type: 'button', class: 'gp-btn primary sm', onclick: function () { save(pos); } }, [u.farm ? t('fm_save') : t('fm_link')]),
        u.farm && DP && (Math.abs(DP.lat - u.farm.lat) > 1e-4 || Math.abs(DP.lon - u.farm.lon) > 1e-4)
          ? el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () { save(DP); } }, [t('fm_use_device')]) : null
      ]),
      NBS.msg ? el('div', { style: 'margin-top:10px' }, [G.note('ok', NBS.msg)]) : null
    );
    return el('section', { class: 'gp-card' }, body);
  }

  function months(crop) { return N && N.CROPS && N.CROPS[crop] && crop !== 'other' ? N.CROPS[crop].months : null; }
  function fitText(me, them) {
    var a = months(me), b = months(them);
    if (!a || !b) return t('nb_fit_unk');
    var n = a.reduce(function (s, x, i) { return s + (x && b[i] ? 1 : 0); }, 0);
    return (n <= 4 ? t('nb_fit_good') : t('nb_fit_same')).replace('{n}', n);
  }
  function loadNb() {
    var u = G.auth.user();
    if (!u || !u.farm) return;
    NBS.busy = true;
    G.auth.neighbours(NBS.radius).then(function (r) { NBS.data = r; NBS.err = null; NBS.busy = false; render(); },
      function (e) { NBS.err = e && e.code === 'no_server' ? t('e_no_server') : t('nb_err'); NBS.busy = false; render(); });
  }
  function act(p) { p.then(loadNb, function (e) { NBS.err = errText(e); render(); }); }

  function neighbourCard(u) {
    var body = [el('h2', null, [t('nb_t')]), el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:70ch' }, [t('nb_p')])];
    if (!u.farm) { body.push(el('div', { style: 'margin-top:10px' }, [G.note('info', t('nb_nofarm'))])); return el('section', { class: 'gp-card' }, body); }
    if (!u.farm.share) body.push(el('div', { style: 'margin-top:10px' }, [G.note('info', t('nb_hidden'))]));
    body.push(el('div', { class: 'nb-radius', role: 'group', 'aria-label': t('nb_within') }, [el('span', { class: 'small muted', style: 'align-self:center' }, [t('nb_within')])].concat([2, 5, 10, 20].map(function (r) {
      return el('button', { type: 'button', 'aria-pressed': String(NBS.radius === r), onclick: function () { NBS.radius = r; loadNb(); render(); } }, [r + ' km']);
    }))));
    if (NBS.err) body.push(el('div', { style: 'margin-top:10px' }, [G.note('err', NBS.err)]));
    else if (!NBS.data) body.push(el('p', { class: 'small muted', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' …']));
    else if (!NBS.data.neighbours.length) body.push(el('p', { class: 'small muted', style: 'margin-top:12px' }, [t('nb_none')]));
    else body.push(el('ul', { class: 'nb-list' }, NBS.data.neighbours.map(function (n) {
      var acts = [];
      if (n.status === 'none' || n.status === 'declined') {
        if (n.status === 'declined') acts.push(el('span', { class: 'small muted' }, [t('nb_declined')]));
        acts.push(el('button', { type: 'button', class: 'gp-btn gold sm', disabled: u.farm.share ? null : true, onclick: function () { act(G.auth.requestShare(n.id)); } }, [t('nb_ask')]));
      } else if (n.status === 'sent') acts.push(G.pill('unk', t('nb_sent')));
      else if (n.status === 'received') {
        acts.push(el('button', { type: 'button', class: 'gp-btn primary sm', onclick: function () { act(G.auth.respondShare(n.id, true)); } }, [t('nb_accept')]));
        acts.push(el('button', { type: 'button', class: 'gp-btn ghost sm', onclick: function () { act(G.auth.respondShare(n.id, false)); } }, [t('nb_decline')]));
      } else if (n.status === 'matched') {
        acts.push(G.pill('ok', t('nb_match')));
        acts.push(el('span', { class: 'small' }, [t('nb_contact') + ' ', el('span', { class: 'nb-contact' }, [n.contact])]));
        if (months(n.crop)) acts.push(el('a', { class: 'gp-btn ghost sm', href: 'nexus.html', onclick: function () { G.save('gaia.nexus.neighbour', { crop: n.crop, area: '' }); } }, [t('nb_compare')]));
      }
      return el('li', { class: 'nb-item ' + n.status }, [
        el('div', { class: 'nb-av', 'aria-hidden': 'true' }, [n.name.charAt(0).toUpperCase()]),
        el('div', null, [
          el('div', { class: 'nb-top' }, [el('b', null, [n.name]), el('span', { class: 'nb-meta' }, [
            [t('r_' + n.role), n.crop ? t('c_' + n.crop) : null, n.water ? t('w_' + n.water) : null, t('nb_km').replace('{d}', G.fmt(n.distance_km, 1))].filter(Boolean).join(' · ')]),
            n.status === 'received' ? el('span', { class: 'small', style: 'color:var(--g-gold-ink);font-weight:700' }, [t('nb_recv')]) : null]),
          el('div', { class: 'nb-fit' }, [fitText(u.farm.crop, n.crop)])
        ]),
        el('div', { class: 'nb-act' }, acts)
      ]);
    })));
    return el('section', { class: 'gp-card' }, body);
  }

  function side() {
    return el('aside', { class: 'acc-side' }, [
      el('section', { class: 'gp-card' }, [el('h2', null, [t('ac_why_t')]),
        el('ul', { class: 'acc-why', style: 'margin:8px 0 0;padding-inline-start:18px;color:var(--g-ink-2)' }, G.t('ac_why').map(function (s) { return el('li', null, [s]); }))]),
      el('section', { class: 'gp-card' }, [el('h2', null, [t('ac_safe_t')]), el('p', { style: 'margin-top:8px;color:var(--g-ink-2)' }, [t('ac_safe')])])
    ]);
  }

  function profile(u) {
    var since = new Date(u.created_at * 1000).toLocaleDateString(G.lang());
    return el('section', { class: 'gp-card' }, [
      el('div', { class: 'acc-profile' }, [
        el('div', { class: 'acc-av', 'aria-hidden': 'true' }, [u.name.trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('')]),
        el('div', null, [el('h2', null, [t('ac_hello').replace('{n}', u.name)]), el('p', { class: 'muted' }, [t('r_' + u.role)])])
      ]),
      el('div', { class: 'acc-kv' }, [
        el('div', null, [el('b', null, [t('ac_id')]), u.identifier]),
        el('div', null, [el('b', null, [t('ac_region')]), u.region || '—']),
        el('div', null, [el('b', null, [t('ac_since')]), since])
      ]),
      el('p', { class: 'small muted', style: 'margin-top:12px' }, [t('ac_device')]),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;margin-top:14px' }, [
        el('a', { class: 'gp-btn primary', href: 'farm.html' }, [t('ac_open')]),
        el('button', { type: 'button', class: 'gp-btn ghost', onclick: function () {
          G.auth.logout().then(function () { S.mode = 'in'; S.msg = t('ac_out_done'); S.msgKind = 'ok'; render(); });
        } }, [t('ac_out')])
      ])
    ]);
  }

  function render() {
    var active = document.activeElement && document.activeElement.id;
    G.clear(app);
    if (!G.auth.enabled()) { app.appendChild(G.note('info', t('ac_disabled'))); return; }
    var u = G.auth.user();
    app.appendChild(el('div', { class: 'acc' }, [u ? el('div', { class: 'acc-main' }, [profile(u), farmCard(u), neighbourCard(u)]) : formCard(), side()]));
    if (active && document.getElementById(active)) document.getElementById(active).focus();
    if (u && u.farm && !NBS.data && !NBS.busy && !NBS.err) loadNb();
  }

  G.auth.onChange(function (u) { if (!u) NBS = { radius: 5, data: null, err: null, busy: false, msg: null }; render(); });
  G.onLang(render);
  render();
}());
