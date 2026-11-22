/* Farm dashboard page (M5): measure to manage. Calculations in farm-core.js.
   Meter readings are simulated and labelled as such; weather is the live
   Open-Meteo forecast when reachable, a labelled simulation otherwise. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, F = window.GAIA_FARM, D = window.GAIA_DNA;

  G.addStrings({
    fr: {
      fd_title: 'Tableau de bord de la ferme',
      fd_lead: "Mesurer pour gérer : l'eau pompée face au quota de la culture, l'énergie du soleil, ce que cela fait économiser, et ce qui arrive cette semaine.",
      fd_farm: 'Ferme', fd_demo_farm: 'Ferme de démonstration · oliveraie près de Kairouan', fd_your_parcel: 'Votre parcelle',
      fd_src_meter_real: 'Compteur d’eau : vos relevés ({n} jours mesurés)', s_pumped_real: 'Eau pompée (compteur)',
      rd_t: 'Relevés du compteur', rd_p: 'Le tableau de bord utilise vos relevés d’index (m³), saisis dans « Ma saison » ou importés ici depuis un compteur ou un enregistreur (CSV : date,index ; heures possibles, ex. 2026-11-18T23:00). Deux relevés de nuit (22 h–5 h) qui montent signalent une fuite.',
      rd_none: 'Aucun relevé pour cette parcelle : les volumes ci-dessus sont une démonstration simulée. Ajoutez au moins deux relevés pour voir vos vrais chiffres.',
      rd_import: 'Importer un CSV', rd_added: '{n} relevés importés.', rd_bad: 'Aucune ligne lisible (format attendu : date,index).', rd_season: 'Saisir un relevé dans Ma saison', rd_count: '{n} relevés enregistrés pour cette parcelle.',
      method_real: 'Volumes pompés calculés à partir de vos relevés d’index, interpolés jour par jour. Les jours sans relevé autour restent vides ; le quota est comparé sur les mêmes jours.',
      fd_src_meter: 'Compteur d’eau et onduleur : simulés pour la démo', fd_src_wx_live: 'Météo : prévision Open-Meteo en direct', fd_src_wx_sim: 'Météo : simulée (prévision injoignable)',
      fd_loading: 'Lecture de la prévision météo…',
      fd_today: "Aujourd'hui",
      fd_today_irr: 'Irriguer {v} m³', fd_today_irr_p: 'Environ {h} h de pompage solaire, en milieu de journée quand le soleil est fort. Ne pas dépasser : c’est le besoin de la culture.',
      fd_today_skip: "Pas d'irrigation aujourd'hui", fd_today_skip_p: '{r} mm de pluie utile couvrent le besoin de la culture. La pompe peut rester arrêtée.',
      fd_today_sun: 'Soleil insuffisant pour tout pomper : complétez avec la réserve ou décalez à demain.',
      k_water: 'Eau pompée ce mois', k_water_of: 'pour un besoin de {q} m³ depuis le 1er', k_solar: 'Énergie solaire ce mois', k_solar_p: '{u} kWh utilisés par la pompe',
      k_money: 'Économie ce mois', k_money_p: '{l} L de gazole évités', k_co2: 'CO₂ évité ce mois', k_co2_p: 'par rapport à une motopompe diesel',
      k_spared: 'Nappe épargnée ce mois', k_spared_p: "eau qu'une pompe solaire sans plafond aurait pu tirer en plus",
      al_t: 'Alertes', lvl_critical: 'Urgent', lvl_warning: 'Attention', lvl_info: 'À savoir', lvl_good: 'Tout va bien',
      al_mtd_over: 'Depuis le début du mois, {pct} % de plus que le besoin de la culture ({v} m³ de trop). Réduisez les prochains arrosages.',
      al_night_flow: "Débit la nuit du {d} ({v} m³) alors que la pompe solaire est à l'arrêt : fuite probable. Vérifiez vannes et goutteurs.",
      al_days_over: '{n} jours au-dessus du besoin entre le {a} et le {b} : {v} m³ pompés en trop.',
      al_rain_skip: 'Pluie prévue {d} ({r} mm) : inutile d’irriguer ce jour-là.',
      al_heat: 'Chaleur forte prévue {d} ({tx} °C) : le besoin augmente, le quota du jour en tient compte.',
      al_low_sun: 'Ciel couvert {d} : le soleil ne suffira pas à pomper tout le besoin. Remplissez le bassin la veille.',
      al_all_good: 'Pompage dans le quota, pas d’anomalie sur le compteur.',
      fc_t: 'Les 7 prochains jours', fc_p: 'Irrigation conseillée chaque jour, calculée sur la prévision (FAO-56), et ce que le soleil peut pomper.',
      fc_rain: 'pluie', fc_need: 'à irriguer', fc_none: 'pas d’irrigation', fc_solar: 'solaire',
      fc_chart_t: 'Besoin d’irrigation et capacité de la pompe solaire (m³/jour)', s_need: 'Besoin de la culture', s_cap: 'Ce que le soleil peut pomper',
      h_t: '30 derniers jours', h_p: "Chaque barre compare l'eau réellement pompée au besoin de la culture ce jour-là.",
      h_chart_t: 'Eau pompée et quota (m³/jour)', s_pumped: 'Eau pompée (simulée)', s_quota: 'Quota (besoin de la culture)',
      h_solar_t: 'Énergie solaire produite et utilisée par la pompe (kWh/jour)', s_solar: 'Production solaire', s_used: 'Utilisée par la pompe',
      h_table: 'Voir les valeurs en tableau', th_date: 'Date', th_quota: 'Quota (m³)', th_pumped: 'Pompé (m³)', th_solar: 'Solaire (kWh)', th_rain: 'Pluie (mm)', th_et0: 'ET0 (mm)',
      set_t: 'Réglages de la ferme', set_p: 'Valeurs modifiables. Les prix sont indicatifs : saisissez les vôtres.',
      set_area: 'Surface (ha)', set_kc: 'Coefficient cultural Kc', set_ea: "Efficience d'irrigation", set_head: 'Hauteur de pompage (m)', set_eff: 'Rendement de la pompe',
      set_kwp: 'Puissance solaire (kWc)', set_kwp_h: 'Laissé vide : GAIA dimensionne sur le jour le plus exigeant.', set_price: 'Prix du gazole (TND/L)', set_dkwh: 'Groupe diesel (kWh/L)', set_reset: 'Revenir aux valeurs par défaut',
      method_t: 'Méthode et sources',
      method_p: "Quota journalier = (Kc × ET0 − pluie utile) / efficience × surface, d'après FAO-56. Pluie utile = 80 % des pluies de 5 mm ou plus. Énergie = volume × hauteur / (367 × rendement). Solaire = kWc × rayonnement × 0,75. CO₂ : 2,68 kg par litre de gazole. Nappe épargnée = ce que la pompe solaire aurait pu lifter ce jour-là moins ce qui a été pompé : c'est l'eau que le plafond GAIA laisse dans le sol.",
      method_sim: "Les relevés du compteur et de l'onduleur sont simulés (reproductibles) avec deux événements ajoutés pour la démonstration : trois jours de surpompage et un débit de nuit. Branchez un vrai compteur pour remplacer la simulation.",
      src_wx: 'Météo :', partial: "(journée en cours)", demo: 'Démo', live: 'En direct', sim: 'Simulé',
      to_nexus: 'Calcul annuel détaillé', to_land: 'Utiliser ma parcelle', days: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
    },
    ar: {
      fd_title: 'لوحة متابعة الضيعة',
      fd_lead: 'نقيس لنُحسن التصرّف: الماء المضخوخ مقارنة بحصة الزراعة، طاقة الشمس، ما توفّره، وما ينتظرنا هذا الأسبوع.',
      fd_farm: 'الضيعة', fd_demo_farm: 'ضيعة تجريبية · غابة زيتون قرب القيروان', fd_your_parcel: 'قطعتك',
      fd_src_meter_real: 'عدّاد الماء: قراءاتك ({n} أيام مقيسة)', s_pumped_real: 'الماء المضخوخ (العدّاد)',
      rd_t: 'قراءات العدّاد', rd_p: 'تستعمل لوحة القيادة قراءات المؤشر (م³) التي تدخلها في «موسمي» أو تستوردها هنا من عدّاد أو مسجّل بيانات (CSV: التاريخ,المؤشر؛ يمكن إضافة الساعة). قراءتان ليليتان (22–5) مرتفعتان تدلان على تسرّب.',
      rd_none: 'لا توجد قراءات لهذه القطعة: الأحجام أعلاه محاكاة للعرض. أضف قراءتين على الأقل لترى أرقامك الحقيقية.',
      rd_import: 'استيراد CSV', rd_added: 'تم استيراد {n} قراءة.', rd_bad: 'لا يوجد سطر مقروء (الصيغة: التاريخ,المؤشر).', rd_season: 'إدخال قراءة في موسمي', rd_count: '{n} قراءة مسجلة لهذه القطعة.',
      method_real: 'الأحجام المضخوخة محسوبة من قراءات المؤشر، موزّعة يوماً بيوم. الأيام بلا قراءات تبقى فارغة، وتُقارن الحصة على الأيام نفسها.',
      fd_src_meter: 'عدّاد الماء والمموّج: محاكاة للعرض', fd_src_wx_live: 'الطقس: توقعات Open-Meteo مباشرة', fd_src_wx_sim: 'الطقس: محاكاة (التوقعات غير متاحة)',
      fd_loading: 'قراءة توقعات الطقس…',
      fd_today: 'اليوم',
      fd_today_irr: 'اسقِ {v} م³', fd_today_irr_p: 'حوالي {h} ساعة من الضخ الشمسي، في وسط النهار حين تكون الشمس قوية. لا تتجاوز: هذه حاجة الزراعة.',
      fd_today_skip: 'لا ري اليوم', fd_today_skip_p: '{r} مم من المطر الفعّال تغطي حاجة الزراعة. يمكن إبقاء المضخة متوقفة.',
      fd_today_sun: 'الشمس لا تكفي لضخ كل الحاجة: أكمل من الخزان أو أجّل إلى الغد.',
      k_water: 'الماء المضخوخ هذا الشهر', k_water_of: 'مقابل حاجة {q} م³ منذ بداية الشهر', k_solar: 'الطاقة الشمسية هذا الشهر', k_solar_p: '{u} ك.و.س استعملتها المضخة',
      k_money: 'التوفير هذا الشهر', k_money_p: '{l} ل من الغازوال لم تُستهلك', k_co2: 'CO₂ المتجنَّب هذا الشهر', k_co2_p: 'مقارنة بمضخة ديزل',
      k_spared: 'الماء المحفوظ في المائدة', k_spared_p: 'ماء كانت مضخة شمسية بلا سقف ستسحبه زيادة',
      al_t: 'التنبيهات', lvl_critical: 'عاجل', lvl_warning: 'انتباه', lvl_info: 'للعلم', lvl_good: 'كل شيء جيد',
      al_mtd_over: 'منذ بداية الشهر، {pct} % أكثر من حاجة الزراعة ({v} م³ زيادة). قلّل الريّات القادمة.',
      al_night_flow: 'تدفق ليلة {d} ({v} م³) والمضخة الشمسية متوقفة: تسرّب محتمل. افحص الصمامات والقطّارات.',
      al_days_over: '{n} أيام فوق الحاجة بين {a} و{b}: {v} م³ زيادة.',
      al_rain_skip: 'مطر متوقع {d} ({r} مم): لا داعي للري ذلك اليوم.',
      al_heat: 'حرارة شديدة متوقعة {d} ({tx} °م): ترتفع الحاجة، وحصة اليوم تأخذ ذلك بالحسبان.',
      al_low_sun: 'سماء غائمة {d}: الشمس لن تكفي لضخ كل الحاجة. املأ الحوض في اليوم السابق.',
      al_all_good: 'الضخ داخل الحصة، ولا خلل في العدّاد.',
      fc_t: 'الأيام السبعة القادمة', fc_p: 'الري المنصوح به كل يوم، محسوب على التوقعات (FAO-56)، وما يمكن للشمس ضخه.',
      fc_rain: 'مطر', fc_need: 'للري', fc_none: 'لا ري', fc_solar: 'شمسي',
      fc_chart_t: 'حاجة الري وقدرة المضخة الشمسية (م³/يوم)', s_need: 'حاجة الزراعة', s_cap: 'ما يمكن للشمس ضخه',
      h_t: 'آخر 30 يوماً', h_p: 'كل عمود يقارن الماء المضخوخ فعلاً بحاجة الزراعة ذلك اليوم.',
      h_chart_t: 'الماء المضخوخ والحصة (م³/يوم)', s_pumped: 'الماء المضخوخ (محاكاة)', s_quota: 'الحصة (حاجة الزراعة)',
      h_solar_t: 'الطاقة الشمسية المنتجة والمستعملة للضخ (ك.و.س/يوم)', s_solar: 'الإنتاج الشمسي', s_used: 'استعملتها المضخة',
      h_table: 'عرض القيم في جدول', th_date: 'التاريخ', th_quota: 'الحصة (م³)', th_pumped: 'المضخوخ (م³)', th_solar: 'شمسي (ك.و.س)', th_rain: 'مطر (مم)', th_et0: 'ET0 (مم)',
      set_t: 'إعدادات الضيعة', set_p: 'قيم قابلة للتعديل. الأسعار تقريبية: أدخل أسعارك.',
      set_area: 'المساحة (هك)', set_kc: 'المعامل الزراعي Kc', set_ea: 'كفاءة الري', set_head: 'ارتفاع الضخ (م)', set_eff: 'مردود المضخة',
      set_kwp: 'القدرة الشمسية (ك.و.ذ)', set_kwp_h: 'إن تُرك فارغاً تحسبها غايا على أكثر الأيام طلباً.', set_price: 'سعر الغازوال (د.ت/ل)', set_dkwh: 'مولد الديزل (ك.و.س/ل)', set_reset: 'العودة إلى القيم الافتراضية',
      method_t: 'المنهجية والمصادر',
      method_p: 'الحصة اليومية = (Kc × ET0 − المطر الفعّال) / الكفاءة × المساحة، حسب FAO-56. المطر الفعّال = 80 % من الأمطار التي تبلغ 5 مم أو أكثر. الطاقة = الحجم × الارتفاع / (367 × المردود). الشمسي = ك.و.ذ × الإشعاع × 0,75. CO₂: 2,68 كغ لكل لتر غازوال. الماء المحفوظ = ما كان يمكن للمضخة الشمسية رفعه ناقص ما ضُخّ فعلاً.',
      method_sim: 'قراءات العدّاد والمموّج محاكاة قابلة للإعادة، مع حدثين مضافين للعرض: ثلاثة أيام ضخ زائد وتدفق ليلي. اربط عدّاداً حقيقياً لتعويض المحاكاة.',
      src_wx: 'الطقس:', partial: '(اليوم جارٍ)', demo: 'عرض', live: 'مباشر', sim: 'محاكاة',
      to_nexus: 'الحساب السنوي المفصّل', to_land: 'استعمل قطعتي', days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    },
    en: {
      fd_title: 'Farm dashboard',
      fd_lead: 'Measure to manage: water pumped against the crop’s quota, energy from the sun, what it saves, and what is coming this week.',
      fd_farm: 'Farm', fd_demo_farm: 'Demo farm · olive grove near Kairouan', fd_your_parcel: 'Your plot',
      fd_src_meter_real: 'Water meter: your readings ({n} days measured)', s_pumped_real: 'Water pumped (meter)',
      rd_t: 'Meter readings', rd_p: 'The dashboard uses your meter index readings (m³), typed in My season or imported here from a meter or data logger (CSV: date,index; times allowed, e.g. 2026-11-18T23:00). Two night readings (22:00–05:00) that rise flag a leak.',
      rd_none: 'No readings for this plot: the volumes above are a simulated demo. Add at least two readings to see your real figures.',
      rd_import: 'Import a CSV', rd_added: '{n} readings imported.', rd_bad: 'No readable line (expected: date,index).', rd_season: 'Add a reading in My season', rd_count: '{n} readings saved for this plot.',
      method_real: 'Volumes pumped are computed from your index readings, interpolated day by day. Days not between two readings stay empty; the quota is compared over the same days.',
      fd_src_meter: 'Water meter and inverter: simulated for the demo', fd_src_wx_live: 'Weather: live Open-Meteo forecast', fd_src_wx_sim: 'Weather: simulated (forecast unreachable)',
      fd_loading: 'Reading the weather forecast…',
      fd_today: 'Today',
      fd_today_irr: 'Irrigate {v} m³', fd_today_irr_p: 'About {h} h of solar pumping, around midday when the sun is strong. Do not exceed it: this is the crop’s need.',
      fd_today_skip: 'No irrigation today', fd_today_skip_p: '{r} mm of useful rain covers the crop’s need. The pump can stay off.',
      fd_today_sun: 'Not enough sun to pump it all: top up from the reservoir or move it to tomorrow.',
      k_water: 'Water pumped this month', k_water_of: 'for a need of {q} m³ since the 1st', k_solar: 'Solar energy this month', k_solar_p: '{u} kWh used by the pump',
      k_money: 'Savings this month', k_money_p: '{l} L of diesel avoided', k_co2: 'CO₂ avoided this month', k_co2_p: 'compared with a diesel pump',
      k_spared: 'Groundwater spared this month', k_spared_p: 'water that a solar pump without a ceiling could have drawn on top',
      al_t: 'Alerts', lvl_critical: 'Urgent', lvl_warning: 'Warning', lvl_info: 'Good to know', lvl_good: 'All good',
      al_mtd_over: 'Since the start of the month, {pct} % more than the crop’s need ({v} m³ too much). Reduce the next waterings.',
      al_night_flow: 'Flow on the night of {d} ({v} m³) while the solar pump is off: probably a leak. Check valves and drippers.',
      al_days_over: '{n} days above the need between {a} and {b}: {v} m³ pumped too much.',
      al_rain_skip: 'Rain forecast {d} ({r} mm): no need to irrigate that day.',
      al_heat: 'Strong heat forecast {d} ({tx} °C): the need goes up, and the day’s quota takes it into account.',
      al_low_sun: 'Overcast {d}: the sun will not be enough to pump the whole need. Fill the reservoir the day before.',
      al_all_good: 'Pumping within the quota, no anomaly on the meter.',
      fc_t: 'The next 7 days', fc_p: 'Advised irrigation for each day, calculated from the forecast (FAO-56), and what the sun can pump.',
      fc_rain: 'rain', fc_need: 'to irrigate', fc_none: 'no irrigation', fc_solar: 'solar',
      fc_chart_t: 'Irrigation need and solar pump capacity (m³/day)', s_need: 'Crop need', s_cap: 'What the sun can pump',
      h_t: 'Last 30 days', h_p: 'Each bar compares the water actually pumped with the crop’s need that day.',
      h_chart_t: 'Water pumped and quota (m³/day)', s_pumped: 'Water pumped (simulated)', s_quota: 'Quota (crop need)',
      h_solar_t: 'Solar energy produced and used by the pump (kWh/day)', s_solar: 'Solar production', s_used: 'Used by the pump',
      h_table: 'See the values as a table', th_date: 'Date', th_quota: 'Quota (m³)', th_pumped: 'Pumped (m³)', th_solar: 'Solar (kWh)', th_rain: 'Rain (mm)', th_et0: 'ET0 (mm)',
      set_t: 'Farm settings', set_p: 'Editable values. Prices are indicative: enter your own.',
      set_area: 'Area (ha)', set_kc: 'Crop coefficient Kc', set_ea: 'Irrigation efficiency', set_head: 'Pumping head (m)', set_eff: 'Pump efficiency',
      set_kwp: 'Solar power (kWp)', set_kwp_h: 'Left empty: GAIA sizes it for the most demanding day.', set_price: 'Diesel price (TND/L)', set_dkwh: 'Diesel generator (kWh/L)', set_reset: 'Back to default values',
      method_t: 'Method and sources',
      method_p: 'Daily quota = (Kc × ET0 − useful rain) / efficiency × area, after FAO-56. Useful rain = 80 % of rainfall events of 5 mm or more. Energy = volume × head / (367 × efficiency). Solar = kWp × radiation × 0.75. CO₂: 2.68 kg per litre of diesel. Groundwater spared = what the solar pump could have lifted that day minus what was pumped: it is the water the GAIA ceiling leaves in the ground.',
      method_sim: 'The meter and inverter readings are simulated (reproducible), with two events added for the demo: three days of over-pumping and a night-time flow. Connect a real meter to replace the simulation.',
      src_wx: 'Weather:', partial: '(day in progress)', demo: 'Demo', live: 'Live', sim: 'Simulated',
      to_nexus: 'Detailed annual calculation', to_land: 'Use my plot', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    ja: {
      fd_title: '農場ダッシュボード',
      fd_lead: '測ることで管理する：作物の割当量に対する揚水量、太陽のエネルギー、その節約額、そして今週の見通し。',
      fd_farm: '農場', fd_demo_farm: 'デモ農場 · カイルアン近郊のオリーブ園', fd_your_parcel: 'あなたの区画',
      fd_src_meter_real: '水量計：あなたの記録（計測{n}日）', s_pumped_real: '揚水量（メーター）',
      rd_t: 'メーター記録', rd_p: 'ダッシュボードは「マイシーズン」で入力した、またはここでメーターやデータロガーから取り込んだ積算値（m³）を使います（CSV：日付,積算値。時刻も可、例 2026-11-18T23:00）。夜間（22時–5時）の2つの記録で値が増えていれば漏水の疑いです。',
      rd_none: 'この区画の記録はありません。上の量はデモ用のシミュレーションです。実際の数値を見るには記録を2つ以上追加してください。',
      rd_import: 'CSVを取り込む', rd_added: '{n}件の記録を取り込みました。', rd_bad: '読み取れる行がありません（形式：日付,積算値）。', rd_season: 'マイシーズンで記録を入力', rd_count: 'この区画の記録：{n}件。',
      method_real: '揚水量は積算値の記録から日ごとに補間して計算します。記録に挟まれていない日は空欄のまま、割当量も同じ日で比較します。',
      fd_src_meter: '水量計とインバーター：デモ用のシミュレーション', fd_src_wx_live: '天気：Open-Meteoのリアルタイム予報', fd_src_wx_sim: '天気：シミュレーション（予報に接続できません）',
      fd_loading: '天気予報を読み込み中…',
      fd_today: '今日',
      fd_today_irr: '{v} m³を灌漑', fd_today_irr_p: '日射の強い昼ごろに、太陽光で約{h}時間揚水します。これが作物の必要量なので、超えないでください。',
      fd_today_skip: '今日は灌漑不要', fd_today_skip_p: '{r} mmの有効雨量で作物の必要量をまかなえます。ポンプは止めたままで大丈夫です。',
      fd_today_sun: 'すべてを汲み上げるには日射が足りません。貯水池から補うか、明日に回してください。',
      k_water: '今月の揚水量', k_water_of: '1日からの必要量 {q} m³ に対して', k_solar: '今月の太陽光エネルギー', k_solar_p: 'ポンプが使用 {u} kWh',
      k_money: '今月の節約額', k_money_p: '軽油 {l} L を節約', k_co2: '今月削減したCO₂', k_co2_p: 'ディーゼルポンプと比べて',
      k_spared: '今月守った地下水', k_spared_p: '上限のない太陽光ポンプなら余分に汲み上げていた水',
      al_t: 'アラート', lvl_critical: '緊急', lvl_warning: '注意', lvl_info: 'お知らせ', lvl_good: '問題なし',
      al_mtd_over: '月初から作物の必要量より{pct} %多く汲み上げています（{v} m³の超過）。次回以降の水やりを減らしてください。',
      al_night_flow: '{d}の夜、太陽光ポンプが止まっているのに流量があります（{v} m³）。漏水の可能性があります。バルブと点滴チューブを確認してください。',
      al_days_over: '{a}から{b}までの{n}日間、必要量を超えています：{v} m³の汲み過ぎ。',
      al_rain_skip: '{d}に雨の予報（{r} mm）：その日の灌漑は不要です。',
      al_heat: '{d}に強い暑さの予報（{tx} °C）：必要量が増えるため、その日の割当量に反映しています。',
      al_low_sun: '{d}は曇り：日射だけでは必要量をすべて汲み上げられません。前日に貯水池を満たしてください。',
      al_all_good: '揚水は割当量の範囲内で、水量計に異常はありません。',
      fc_t: '今後7日間', fc_p: '予報（FAO-56）から計算した毎日の推奨灌漑量と、太陽で汲める量。',
      fc_rain: '雨', fc_need: '灌漑', fc_none: '灌漑不要', fc_solar: '太陽光',
      fc_chart_t: '灌漑の必要量と太陽光ポンプの能力（m³/日）', s_need: '作物の必要量', s_cap: '太陽で汲める量',
      h_t: '過去30日間', h_p: '各棒は、実際に汲み上げた水とその日の作物の必要量を比べています。',
      h_chart_t: '揚水量と割当量（m³/日）', s_pumped: '揚水量（シミュレーション）', s_quota: '割当量（作物の必要量）',
      h_solar_t: '太陽光の発電量とポンプの使用量（kWh/日）', s_solar: '太陽光発電量', s_used: 'ポンプの使用量',
      h_table: '表で値を見る', th_date: '日付', th_quota: '割当量（m³）', th_pumped: '揚水量（m³）', th_solar: '太陽光（kWh）', th_rain: '雨（mm）', th_et0: 'ET0（mm）',
      set_t: '農場の設定', set_p: '値は変更できます。価格は目安なので、ご自身の価格を入力してください。',
      set_area: '面積（ha）', set_kc: '作物係数Kc', set_ea: '灌漑効率', set_head: '揚程（m）', set_eff: 'ポンプ効率',
      set_kwp: '太陽光の出力（kWp）', set_kwp_h: '空欄の場合：最も需要の大きい日に合わせてGAIAが設計します。', set_price: '軽油価格（TND/L）', set_dkwh: 'ディーゼル発電機（kWh/L）', set_reset: '既定値に戻す',
      method_t: '方法と出典',
      method_p: '1日の割当量 = (Kc × ET0 − 有効雨量) / 効率 × 面積（FAO-56による）。有効雨量 = 5 mm以上の降雨の80 %。エネルギー = 水量 × 揚程 / (367 × 効率)。太陽光 = kWp × 日射量 × 0.75。CO₂：軽油1 Lあたり2.68 kg。守った地下水 = その日に太陽光ポンプが汲めた量 − 実際の揚水量。GAIAの上限によって地中に残った水です。',
      method_sim: '水量計とインバーターの値はシミュレーション（再現可能）で、デモ用に2つの出来事を加えています：3日間の過剰揚水と夜間の流量。シミュレーションを置き換えるには実際の水量計を接続してください。',
      src_wx: '天気：', partial: '（本日分・途中）', demo: 'デモ', live: 'リアルタイム', sim: 'シミュレーション',
      to_nexus: '年間の詳細計算', to_land: '自分の区画を使う', days: ['日', '月', '火', '水', '木', '金', '土']
    }
  });

  G.mountShell('farm');
  var app = document.getElementById('app'), tabs = document.getElementById('tabs');
  function drawTabs() { if (tabs && window.GAIA_SEASON) G.clear(tabs).appendChild(window.GAIA_SEASON.subnav('farm')); }
  drawTabs();

  /* ------------------------------------------------ farm & settings */
  var DEMO = { name: null, lat: 35.678, lon: 10.096, crop: 'olive', area: 2, head: 60, kc: 0.70 };
  var KC = { olive: 0.70, palm: 0.95, citrus: 0.65, cereal: 1.15, veg: 1.05 };
  var p = G.getParcel();
  var hasParcel = !!(p && p.dna && p.lat !== undefined);
  var V = function (k) { return hasParcel && D ? D.value(p.dna, k) : null; };
  var farm = hasParcel ? { name: p.name, lat: p.lat, lon: p.lon } : DEMO;
  var farmKey = hasParcel ? (p.dna.builtAt || p.lat + ',' + p.lon) : 'demo';

  // Start from the Water–energy page's inputs when they exist for this parcel.
  var nx = G.load('gaia.nexus.inputs', null);
  var nxv = nx && hasParcel && nx.parcelAt === p.dna.builtAt ? nx.values : {};
  function base() {
    var crop = V('crop');
    return {
      area_ha: +nxv.area || +V('area_ha') || DEMO.area,
      kc: +nxv.kc || KC[crop] || DEMO.kc,
      ea: +nxv.ea || F.DEFAULTS.ea,
      head_m: +nxv.head || (V('water.well_depth_m') ? Math.round(V('water.well_depth_m') + 10) : DEMO.head),
      pump_eff: +nxv.pump_eff || F.DEFAULTS.pump_eff,
      pr: +nxv.pr || F.DEFAULTS.pr,
      kwp: '',
      diesel_tnd_l: F.DEFAULTS.diesel_tnd_l,
      diesel_kwh_l: F.DEFAULTS.diesel_kwh_l
    };
  }
  var savedS = G.load('gaia.farm.inputs', null);
  var S = Object.assign(base(), savedS && savedS.key === farmKey ? savedS.values : {});
  function persist() { G.save('gaia.farm.inputs', { key: farmKey, values: S }); }
  function settings() {
    var s = {};
    Object.keys(S).forEach(function (k) { s[k] = S[k] === '' || S[k] === null ? null : +S[k]; });
    return s;
  }

  /* ------------------------------------------------ meter readings (shared with My season) */
  var MKEY = 'gaia.season.meter', pkey = hasParcel ? (p.lat.toFixed(4) + ',' + p.lon.toFixed(4)) : '';
  function readings() { return hasParcel ? (G.load(MKEY, {})[pkey] || []) : []; }
  function addReadings(list) {
    var all = G.load(MKEY, {}), cur = all[pkey] || [], byDate = {};
    cur.concat(list).forEach(function (r) { byDate[r.date] = r; });
    all[pkey] = Object.keys(byDate).sort().map(function (d) { return byDate[d]; }); G.save(MKEY, all);
  }
  var importMsg = null;

  /* ------------------------------------------------ weather */
  var WX = null, wxLive = false;
  function todayStr() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

  function fetchWeather() {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + farm.lat.toFixed(3) + '&longitude=' + farm.lon.toFixed(3) +
      '&daily=et0_fao_evapotranspiration,precipitation_sum,shortwave_radiation_sum,temperature_2m_max&past_days=30&forecast_days=8&timezone=auto';
    var timer = null;
    return window.GAIA_DNA.forecastJSON(url, 60, 12000).then(function (j) {
      var d = j.daily, rows = d.time.map(function (date, i) {
        return { date: date, et0: d.et0_fao_evapotranspiration[i], rain: d.precipitation_sum[i] || 0,
          ghi: d.shortwave_radiation_sum[i] !== null ? d.shortwave_radiation_sum[i] / 3.6 : null, tmax: d.temperature_2m_max[i] };
      }).filter(function (r) { return r.et0 !== null && r.ghi !== null; });
      var today = todayStr(), idx = rows.findIndex(function (r) { return r.date === today; });
      if (idx < 0) idx = Math.min(30, rows.length - 1);
      if (idx < 7 || rows.length - idx < 4) throw new Error('short series');
      wxLive = true;
      return { past: rows.slice(0, idx + 1), next: rows.slice(idx + 1, idx + 8), today: rows[idx].date };
    }).catch(function () {
      clearTimeout(timer);
      wxLive = false;
      var today = todayStr(), start = new Date(new Date(today + 'T12:00:00Z').getTime() - 30 * 86400000).toISOString().slice(0, 10);
      var monthly = null;
      var CM = hasParcel ? p.dna.climateMonthly : null;
      if (CM && CM.et0 && CM.rain) monthly = { et0: CM.et0, rain: CM.rain, ghi: (p.dna.solarMonthly && p.dna.solarMonthly.ghi) || CM.ghi || F.NORMALS.ghi, tmax: F.NORMALS.tmax };
      var rows = F.syntheticWeather(start, 38, farm.lat, farm.lon, monthly);
      return { past: rows.slice(0, 31), next: rows.slice(31, 38), today: rows[30].date };
    });
  }

  /* ------------------------------------------------ irrigation planner (the water already in the soil) */
  G.addStrings({
    fr: { sp_load: 'Lecture de l’eau du sol…', sp_none_t: 'Pas d’irrigation aujourd’hui', sp_none_p: 'Le sol garde assez d’eau : réserve estimée à {r} %, il faut rester au-dessus de {k} %.', sp_next: 'Prochaine irrigation prévue : {d}, {v}.', sp_no_next: 'Aucune irrigation prévue jusqu’au {d}.',
      sp_spared: 'Arroser par habitude aurait utilisé {v} sur la période.', sp_do_p: 'Le sol est estimé à {r} % de sa réserve.', sp_hours: 'Pomper de {a} h à {b} h, quand le soleil est fort.', sp_season: 'C’est hors saison pour cette culture.', sp_quota: 'Le quota d’eau du mois est atteint.',
      sp_off: 'Calcul simple, sans l’eau déjà dans le sol : le planificateur n’est pas connecté.', sp_fc_p: 'Irrigation prévue par le planificateur GAIA, qui tient compte de l’eau du sol, et ce que le soleil peut pomper.', sp_need: 'Irrigation prévue' },
    ar: { sp_load: 'قراءة ماء التربة…', sp_none_t: 'لا ري اليوم', sp_none_p: 'في التربة ماء كافٍ: المخزون المقدّر {r} %، يجب البقاء فوق {k} %.', sp_next: 'الري القادم المتوقع: {d}، {v}.', sp_no_next: 'لا ري متوقع حتى {d}.',
      sp_spared: 'السقي المعتاد كان سيستهلك {v} خلال هذه المدة.', sp_do_p: 'مخزون التربة مقدّر بـ {r} %.', sp_hours: 'شغّل المضخة من {a} إلى {b} حين تكون الشمس قوية.', sp_season: 'خارج موسم هذه الزراعة.', sp_quota: 'بلغت حصة الماء لهذا الشهر.',
      sp_off: 'حساب بسيط دون احتساب ماء التربة: المخطط غير متصل.', sp_fc_p: 'الري الذي يتوقعه مخطط GAIA مع احتساب ماء التربة، وما تستطيع الشمس ضخه.', sp_need: 'الري المتوقع' },
    en: { sp_load: 'Reading the soil water…', sp_none_t: 'No irrigation today', sp_none_p: 'The soil holds enough water: estimated reserve {r} %, keep it above {k} %.', sp_next: 'Next irrigation planned: {d}, {v}.', sp_no_next: 'No irrigation planned until {d}.',
      sp_spared: 'Watering by habit would have used {v} over the period.', sp_do_p: 'The soil is estimated at {r} % of its reserve.', sp_hours: 'Pump from {a} h to {b} h, when the sun is strong.', sp_season: 'It is off season for this crop.', sp_quota: 'This month’s water quota is reached.',
      sp_off: 'Simple calculation, without the water already in the soil: the planner is not connected.', sp_fc_p: 'Irrigation planned by the GAIA planner, which counts the soil water, and what the sun can pump.', sp_need: 'Planned irrigation' },
    ja: { sp_load: '土の水分を読み込み中…', sp_none_t: '今日は灌水不要', sp_none_p: '土に十分な水があります：推定貯水{r}%、{k}%を下回らないこと。', sp_next: '次の灌水予定：{d}、{v}。', sp_no_next: '{d}まで灌水の予定はありません。',
      sp_spared: '習慣で灌水すると、この期間に{v}使っていました。', sp_do_p: '土壌の貯水は推定{r}%です。', sp_hours: '日射の強い{a}時から{b}時に揚水します。', sp_season: 'この作物の時期外です。', sp_quota: '今月の水の割当に達しました。',
      sp_off: '簡易計算です（土の水分は含みません）：プランナーに接続していません。', sp_fc_p: '土の水分を考慮したGAIAプランナーの灌水予定と、太陽光で揚水できる量。', sp_need: '灌水予定' }
  });
  var SP = { key: null, status: 'off', data: null };
  function cropKey() {
    var CR = (window.GAIA_NEXUS && GAIA_NEXUS.CROPS) || {}, k = nxv.crop || V('crop');
    if (['tomato', 'potato', 'pepper'].indexOf(k) !== -1) k = 'veg';
    return CR[k] ? k : 'other';
  }
  function loadPlan(s) {
    if (!hasParcel || !wxLive || !window.GAIA_SOILPLAN) { SP.status = 'off'; return; }
    var k = cropKey(), CR = (window.GAIA_NEXUS && GAIA_NEXUS.CROPS) || {};
    var o = { crop: k, kc: s.kc, months: CR[k] ? CR[k].months : null, area_ha: s.area_ha, ea: s.ea, head_m: s.head_m, pump_eff: s.pump_eff, pr: s.pr, pv_kwp: S.kwp > 0 ? s.kwp : null, own: true };
    var key = JSON.stringify(o);
    if (SP.key === key) return;
    SP.key = key; SP.status = 'loading'; SP.data = null;
    GAIA_SOILPLAN.get(p, o).then(function (d) {
      if (SP.key !== key) return;
      SP.data = d; SP.status = d ? 'ok' : 'off'; redraw();
    });
  }
  function planOf(date) { return SP.data ? SP.data.irrigate.filter(function (x) { return x.date === date; })[0] || null : null; }

  /* ------------------------------------------------ helpers */
  function fill(str, map) { return String(str).replace(/\{(\w+)\}/g, function (_, k) { return map[k] !== undefined ? map[k] : ''; }); }
  function dayName(date) { return t('days')[new Date(date + 'T12:00:00Z').getUTCDay()]; }
  function shortDate(date) { var d = new Date(date + 'T12:00:00Z'); return G.lang() === 'ja' ? t('months')[d.getUTCMonth()] + d.getUTCDate() + '日' : d.getUTCDate() + ' ' + t('months')[d.getUTCMonth()]; }
  function whenLabel(date, i) { return (i === 0 ? '' : '') + dayName(date) + ' ' + shortDate(date); }
  var LV_ICON = { critical: 'warn', warning: 'warn', info: 'info', good: 'ok' };

  /* ------------------------------------------------ render */
  function header() {
    var chips = el('div', { class: 'fd-src' }, [
      REAL ? el('span', { class: 'fd-chip live' }, [G.icon('ok', 14), fill(t('fd_src_meter_real'), { n: REAL })]) : el('span', { class: 'fd-chip demo' }, [G.icon('info', 14), t('fd_src_meter')]),
      WX ? el('span', { class: 'fd-chip ' + (wxLive ? 'live' : 'demo') }, [G.icon(wxLive ? 'ok' : 'info', 14), t(wxLive ? 'fd_src_wx_live' : 'fd_src_wx_sim')]) : null
    ]);
    return el('div', { class: 'fd-farm' }, [
      el('div', null, [
        el('span', { class: 'small muted' }, [t('fd_farm')]),
        el('strong', null, [hasParcel ? (farm.name || t('fd_your_parcel')) + ' · ' + fmt(farm.lat, 3) + ', ' + fmt(farm.lon, 3) : t('fd_demo_farm')])
      ]),
      chips,
      hasParcel ? null : el('a', { class: 'gp-btn ghost sm', href: 'land.html' }, [t('to_land')])
    ]);
  }

  function kpi(cls, label, value, sub, meter) {
    return el('div', { class: 'fd-kpi ' + cls }, [
      el('span', { class: 'lab' }, [label]),
      el('span', { class: 'v' }, [value]),
      meter || null,
      el('span', { class: 'sub' }, [sub])
    ]);
  }

  function meterBar(used, quota) {
    var pct = quota > 0 ? used / quota : 0;
    var fillN = el('span', { class: 'fill' + (pct > 1.05 ? ' over' : pct > 0.95 ? ' near' : '') });
    fillN.style.width = Math.min(100, pct * 100) + '%';
    return el('span', { class: 'fd-meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': String(Math.round(quota)), 'aria-valuenow': String(Math.round(used)), 'aria-label': t('k_water') }, [
      fillN, el('span', { class: 'cap' })
    ]);
  }

  function alertText(a) {
    var d = a.data;
    var map = {
      pct: fmt(d.pct), v: fmt(d.extra !== undefined ? d.extra : d.vol, 0), d: d.date ? (d.i === 0 ? t('days')[new Date(d.date + 'T12:00:00Z').getUTCDay()] + ' ' + shortDate(d.date) : dayName(d.date) + ' ' + shortDate(d.date)) : '',
      n: d.n, a: d.from ? shortDate(d.from) : '', b: d.to ? shortDate(d.to) : '', r: fmt(d.rain, 0), tx: fmt(d.tmax, 0)
    };
    return fill(t('al_' + a.code), map);
  }

  var REAL = 0;
  function draw() {
    G.clear(app);
    app.appendChild(header());
    if (!WX) { app.appendChild(el('p', { class: 'muted', style: 'margin-top:16px' }, [el('span', { class: 'gp-spin', 'aria-hidden': 'true' }), ' ', t('fd_loading')])); return; }

    var s = settings();
    var all = WX.past.concat(WX.next);
    var autoKwp = !(s.kwp > 0);
    if (autoKwp) s.kwp = F.sizeKwp(all, s);
    var rd = readings(), real = rd.length >= 2 ? F.fromReadings(WX.past, s, rd) : null;
    REAL = real && real.some(function (h) { return h.measured; }) ? real.filter(function (h) { return h.measured; }).length : 0;
    var hist = REAL ? real : F.simulateMeter(WX.past, s, farm.lat, farm.lon);
    G.clear(app); app.appendChild(header());
    loadPlan(s);
    var fc = F.forecast(WX.next, s);
    // the planner answered: its volumes replace the simple daily need, in the cards, the chart and the alerts
    if (SP.status === 'ok') fc = fc.map(function (f) {
      if (f.date < SP.data.from || f.date > SP.data.to) return f;
      var x = planOf(f.date), m3 = x ? x.m3 * (SP.data.per_ha ? s.area_ha : 1) : 0;
      return Object.assign({}, f, { need: m3, skip: m3 < 0.5, kwh: F.pumpKwh(m3, s), enoughSun: f.capacity >= m3 });
    });
    var sum = F.summary(hist, s, WX.today);
    var al = F.alerts(hist, fc, sum);
    var today = hist[hist.length - 1];
    var tq = F.quotaDay(WX.past[WX.past.length - 1], s);
    var tfc = F.forecast([WX.past[WX.past.length - 1]], s)[0];

    /* today */
    var skip = tq.vol < 0.5, title, lines = [], sunWarn = false, vol = function (v) { return fmt(v, 0) + ' m³'; };
    if (SP.status === 'loading') { title = t('sp_load'); }
    else if (SP.status === 'ok') {
      var D = SP.data, k = D.per_ha ? s.area_ha : 1, now = planOf(today.date), next = D.irrigate.filter(function (x) { return x.date > today.date; })[0];
      var dl = function (d) { return dayName(d) + ' ' + shortDate(d); };
      if (now) {
        title = fill(t('fd_today_irr'), { v: fmt(now.m3 * k, 0) });
        lines.push(fill(t('sp_do_p'), { r: D.soil_reserve_pct }));
        if (now.from_h !== null) lines.push(fill(t('sp_hours'), { a: now.from_h, b: now.to_h }));
      } else {
        title = t('sp_none_t');
        lines.push(D.out_of_season ? t('sp_season') : D.quota_reached ? t('sp_quota') : fill(t('sp_none_p'), { r: D.soil_reserve_pct, k: D.keep_above_pct }));
        lines.push(next ? fill(t('sp_next'), { d: dl(next.date), v: vol(next.m3 * k) }) : fill(t('sp_no_next'), { d: dl(D.to) }));
        if (!D.out_of_season && D.spared_m3 > 0) lines.push(fill(t('sp_spared'), { v: vol(D.spared_m3 * k) }));
      }
    } else {
      title = skip ? t('fd_today_skip') : fill(t('fd_today_irr'), { v: fmt(tq.vol, 0) });
      lines.push(skip ? fill(t('fd_today_skip_p'), { r: fmt(tq.pe, 0) }) : fill(t('fd_today_irr_p'), { h: fmt(tfc.hours, 1) }));
      if (hasParcel) lines.push(t('sp_off'));
      sunWarn = !skip && !tfc.enoughSun;
    }
    app.appendChild(el('section', { class: 'fd-today', 'aria-labelledby': 'fd-h-today' }, [
      el('p', { class: 'eyebrow', id: 'fd-h-today' }, [t('fd_today') + ' · ' + dayName(today.date) + ' ' + shortDate(today.date)]),
      el('h2', null, SP.status === 'loading' ? [el('span', { class: 'gp-spin', 'aria-hidden': 'true' }), ' ', title] : [title]),
      lines.length ? el('p', null, [lines.join(' ')]) : null,
      sunWarn ? el('p', { class: 'warn' }, [G.icon('warn', 16), ' ', t('fd_today_sun')]) : null
    ]));

    /* KPIs */
    app.appendChild(el('section', { class: 'fd-kpis', 'aria-label': 'Indicateurs' }, [
      kpi('water', t('k_water'), fmt(sum.pumped) + ' m³', fill(t('k_water_of'), { q: fmt(sum.quota) }), meterBar(sum.pumped, sum.quota)),
      kpi('energy', t('k_solar'), fmt(sum.solar) + ' kWh', fill(t('k_solar_p'), { u: fmt(sum.solarUsed) })),
      kpi('money', t('k_money'), fmt(sum.tnd, 0) + ' TND', fill(t('k_money_p'), { l: fmt(sum.litres) })),
      kpi('co2', t('k_co2'), fmt(sum.co2) + ' kg', t('k_co2_p')),
      kpi('spared', t('k_spared'), fmt(sum.spared) + ' m³', t('k_spared_p'))
    ]));

    /* alerts */
    app.appendChild(el('section', { class: 'gp-card fd-alerts', 'aria-labelledby': 'fd-h-al' }, [
      el('h2', { id: 'fd-h-al' }, [t('al_t')]),
      el('ul', null, al.map(function (a) {
        return el('li', { class: 'fd-al ' + a.level }, [
          el('span', { class: 'tag' }, [G.icon(LV_ICON[a.level], 15), t('lvl_' + a.level)]),
          el('span', { class: 'txt' }, [alertText(a)])
        ]);
      }))
    ]));

    if (window.GAIA_FARMREC && hasParcel) app.appendChild(GAIA_FARMREC.card());

    /* forecast */
    var fcChart = el('div', { class: 'fd-chart' });
    app.appendChild(el('section', { class: 'gp-card', 'aria-labelledby': 'fd-h-fc', style: 'margin-top:16px' }, [
      el('h2', { id: 'fd-h-fc' }, [t('fc_t')]),
      el('p', { class: 'small muted', style: 'margin-top:4px' }, [t(SP.status === 'ok' ? 'sp_fc_p' : 'fc_p')]),
      el('div', { class: 'fd-days' }, fc.map(function (f) {
        return el('div', { class: 'fd-day' + (f.skip ? ' skip' : '') }, [
          el('b', null, [dayName(f.date)]), el('span', { class: 'dt' }, [shortDate(f.date)]),
          el('span', { class: 'need' }, [f.skip ? t('fc_none') : fmt(f.need, 0) + ' m³']),
          el('span', { class: 'meta' }, [fmt(f.rain, 0) + ' mm ' + t('fc_rain')]),
          el('span', { class: 'meta' }, [fmt(f.solar, 0) + ' kWh ' + t('fc_solar')]),
          f.tmax !== null && f.tmax !== undefined ? el('span', { class: 'meta' }, [fmt(f.tmax, 0) + ' °C']) : null
        ]);
      })),
      el('h3', { style: 'margin-top:16px;font-size:16px' }, [t('fc_chart_t')]),
      fcChart
    ]));
    G.barChart(fcChart, { labels: fc.map(function (f) { return dayName(f.date); }), unit: 'm³', title: t('fc_chart_t'), digits: 0, series: [
      { name: t(SP.status === 'ok' ? 'sp_need' : 's_need'), color: '#2F5A75', values: fc.map(function (f) { return f.need; }) },
      { name: t('s_cap'), color: '#A88746', values: fc.map(function (f) { return f.capacity; }) }
    ] });

    /* history */
    var hChart = el('div', { class: 'fd-chart' }), sChart = el('div', { class: 'fd-chart' });
    var labs = hist.map(function (h, i) { var d = new Date(h.date + 'T12:00:00Z').getUTCDate(); return i % 3 === (hist.length - 1) % 3 ? String(d) : ''; });
    var rows = hist.slice().reverse().map(function (h) {
      return el('tr', null, [el('td', null, [shortDate(h.date) + (h.partial ? ' ' + t('partial') : '')]), el('td', null, [fmt(h.quota, 1)]), el('td', null, [h.pumped === null ? '—' : fmt(h.pumped, 1)]),
        el('td', null, [fmt(h.solar, 1)]), el('td', null, [fmt(h.rain, 1)]), el('td', null, [fmt(h.et0, 1)])]);
    });
    app.appendChild(el('section', { class: 'gp-card', 'aria-labelledby': 'fd-h-h', style: 'margin-top:16px' }, [
      el('h2', { id: 'fd-h-h' }, [t('h_t')]),
      el('p', { class: 'small muted', style: 'margin-top:4px' }, [t('h_p')]),
      el('h3', { style: 'margin-top:12px;font-size:16px' }, [t('h_chart_t')]), hChart,
      el('h3', { style: 'margin-top:16px;font-size:16px' }, [t('h_solar_t')]), sChart,
      el('details', { class: 'gp-more', style: 'margin-top:12px' }, [
        el('summary', null, [t('h_table')]),
        el('div', { class: 'gp-table-wrap' }, [el('table', { class: 'gp-table' }, [
          el('thead', null, [el('tr', null, ['th_date', 'th_quota', 'th_pumped', 'th_solar', 'th_rain', 'th_et0'].map(function (k) { return el('th', { scope: 'col' }, [t(k)]); }))]),
          el('tbody', null, rows)
        ])])
      ])
    ]));
    G.barChart(hChart, { labels: labs, unit: 'm³', title: t('h_chart_t'), digits: 1, series: [
      { name: t('s_quota'), color: '#9CB7C9', values: hist.map(function (h) { return h.quota; }) },
      { name: t(REAL ? 's_pumped_real' : 's_pumped'), color: '#2F5A75', values: hist.map(function (h) { return h.pumped; }) }
    ] });
    G.barChart(sChart, { labels: labs, unit: 'kWh', title: t('h_solar_t'), digits: 1, series: [
      { name: t('s_solar'), color: '#D8BE7E', values: hist.map(function (h) { return h.solar; }) },
      { name: t('s_used'), color: '#A88746', values: hist.map(function (h) { return h.solarUsed; }) }
    ] });

    /* meter readings: import */
    if (hasParcel) {
      var fileIn = el('input', { type: 'file', accept: '.csv,.txt,text/csv', id: 'fd-csv', class: 'sr', onchange: function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () { var l = F.parseReadings(fr.result); if (l.length) addReadings(l); importMsg = l.length ? ['ok', fill(t('rd_added'), { n: l.length })] : ['err', t('rd_bad')]; draw(); };
        fr.readAsText(f);
      } });
      app.appendChild(el('section', { class: 'gp-card', style: 'margin-top:16px' }, [
        el('h2', null, [t('rd_t')]), el('p', { class: 'small muted', style: 'margin-top:4px' }, [t('rd_p')]),
        REAL ? null : G.note('info', t('rd_none')),
        importMsg ? G.note(importMsg[0], importMsg[1]) : null,
        el('p', { class: 'small', style: 'margin-top:8px' }, [fill(t('rd_count'), { n: rd.length })]),
        el('p', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' }, [
          fileIn, el('label', { for: 'fd-csv', class: 'gp-btn sm', style: 'cursor:pointer' }, [t('rd_import')]),
          el('a', { class: 'gp-btn ghost sm', href: 'season.html' }, [t('rd_season')])
        ])
      ]));
    }

    /* settings + method */
    function field(id, key, label, hint, attrs) {
      var inp = el('input', Object.assign({ id: id, type: 'number', inputmode: 'decimal', step: 'any', value: S[key] === null ? '' : S[key],
        placeholder: key === 'kwp' && autoKwp ? fmt(s.kwp, 1) : null,
        onchange: function (e) { S[key] = e.target.value === '' ? '' : +e.target.value; persist(); draw(); } }, attrs || {}));
      return el('div', { class: 'gp-field' }, [el('label', { for: id }, [label]), inp, hint ? el('span', { class: 'hint' }, [hint]) : null]);
    }
    app.appendChild(el('div', { class: 'gp-grid gp-cols-2', style: 'margin-top:16px' }, [
      el('section', { class: 'gp-card' }, [
        el('h2', null, [t('set_t')]), el('p', { class: 'small muted' }, [t('set_p')]),
        el('div', { class: 'fd-set' }, [
          field('fd-area', 'area_ha', t('set_area'), null, { min: 0.1 }),
          field('fd-kc', 'kc', t('set_kc'), null, { min: 0.1, max: 1.4 }),
          field('fd-ea', 'ea', t('set_ea'), null, { min: 0.3, max: 1 }),
          field('fd-head', 'head_m', t('set_head'), null, { min: 1 }),
          field('fd-eff', 'pump_eff', t('set_eff'), null, { min: 0.1, max: 0.9 }),
          field('fd-kwp', 'kwp', t('set_kwp'), t('set_kwp_h'), { min: 0.5 }),
          field('fd-pr', 'diesel_tnd_l', t('set_price'), null, { min: 0 }),
          field('fd-dk', 'diesel_kwh_l', t('set_dkwh'), null, { min: 0.5 })
        ]),
        el('button', { type: 'button', class: 'gp-btn ghost sm', style: 'margin-top:12px', onclick: function () { S = base(); persist(); draw(); } }, [t('set_reset')])
      ]),
      el('section', { class: 'gp-card' }, [
        el('h2', null, [t('method_t')]),
        el('p', { class: 'small', style: 'margin-top:6px' }, [t('method_p')]),
        REAL ? el('p', { class: 'small', style: 'margin-top:8px' }, [G.pill('live', t('live')), ' ', t('method_real')])
          : el('p', { class: 'small', style: 'margin-top:8px' }, [G.pill('demo', t('demo')), ' ', t('method_sim')]),
        el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('src_wx') + ' ' + (wxLive ? 'Open-Meteo Forecast API (ECMWF / DWD ICON / Météo-France), ET0 FAO-56 Penman-Monteith' : t('fd_src_wx_sim'))]),
        el('p', { style: 'margin-top:12px;display:flex;gap:8px;flex-wrap:wrap' }, [
          el('a', { class: 'gp-btn ghost sm', href: 'nexus.html' }, [t('to_nexus')]),
          G.kaizenButton({ page: 'farm', lat: farm.lat, lon: farm.lon })
        ])
      ])
    ]));
  }

  draw();
  fetchWeather().then(function (w) { WX = w; draw(); });
  function jumpTo(y) { try { window.scrollTo({ top: y, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); } }
  // redraw without moving the page
  function redraw() {
    if (!WX) return;
    var se = document.scrollingElement || document.documentElement, y = se.scrollTop;
    app.style.minHeight = app.offsetHeight + 'px';
    draw();
    jumpTo(y);
    setTimeout(function () { app.style.minHeight = ''; if (Math.abs(se.scrollTop - y) > 2) jumpTo(y); }, 80);
  }
  // a reported irrigation or a saved calendar changes the plan: ask the planner again
  var seen = null;
  if (window.GAIA_FARMREC) GAIA_FARMREC.onChange(function () {
    var st = GAIA_FARMREC.state ? GAIA_FARMREC.state() : null, mark = st ? JSON.stringify([st.irrigation_log, st.settings]) : null;
    if (seen !== null && mark !== seen && window.GAIA_SOILPLAN) { GAIA_SOILPLAN.clear(); SP.key = null; }
    if (mark !== null) seen = mark;
    redraw();
  });
  G.onLang(function () { drawTabs(); draw(); });
}());
