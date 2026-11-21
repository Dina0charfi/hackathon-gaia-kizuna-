/* Water–Energy Nexus page (M4). Reads GAIA LAND DNA; calculations in nexus-core.js. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, D = window.GAIA_DNA, N = window.GAIA_NEXUS, GG = window.GAIA_GUARD;

  G.addStrings({
    fr: {
      n_title: 'Eau & énergie',
      g_eyebrow: 'Garde-nappe · le nexus, pas une technologie isolée',
      g_t: 'La pompe solaire s’arrête au besoin de la culture',
      g_p: "Un champ solaire dimensionné sur le mois le plus chaud peut pomper bien plus que la culture n’en demande le reste de l’année, et chaque mètre cube en plus est presque gratuit. Le garde-nappe transforme le besoin FAO-56 en plafond de pompage, mois par mois, et plus bas encore si la nappe ou l’autorisation l’exige.",
      g_cap: 'Ce que le soleil permettrait de pomper', g_need: 'Besoin de la culture', g_allowed: 'Plafond du garde-nappe', g_blocked: 'Pompage excessif évité', g_freed: 'Énergie solaire libérée',
      g_peak: 'au plus {v} m³ par jour', g_ratio: 'le besoin', g_pct: 'de ce que la pompe pourrait tirer', g_freed_u: 'kWh/an pour le froid, la transformation ou les voisins',
      g_st_guarded: 'Protégé : le plafond bloque le surpompage', g_st_aquifer_limited: 'Limité par la nappe : le plafond est sous le besoin', g_st_no_surplus: 'Pas de surplus : le champ solaire ne dépasse pas le besoin',
      g_deficit: 'La ressource renouvelable ne couvre que {p} % du besoin. Il manque {v} m³/an : irrigation déficitaire, paillage, ombrage agrivoltaïque ou culture moins exigeante.',
      g_chart: 'Ce que le soleil pourrait pomper, le besoin et le plafond, par mois',
      g_ctl_t: 'Réglages du contrôleur de pompe', g_ctl_p: "À programmer dans le contrôleur avec un compteur d’eau : la pompe coupe dès que le volume du jour est atteint, même s’il reste du soleil.",
      g_th_cap: 'Possible (m³)', g_th_allowed: 'Plafond (m³)', g_th_day: 'Plafond / jour (m³)', g_th_h: 'Heures max / jour', g_th_blocked: 'Évité (m³)',
      g_in_t: 'Garde-nappe', g_in_kwp: 'Champ solaire installé (kWc)', g_in_kwp_h: 'Vide : la taille calculée ci-dessous ({k} kWc).',
      g_in_sy: 'Volume renouvelable autorisé (m³/an)', g_in_sy_h: "Autorisation du CRDA ou part de la recharge de la nappe. Vide : seul le besoin de la culture fixe le plafond.",
      g_in_flow: 'Débit de la pompe (m³/h)', g_in_flow_h: 'Pour limiter les heures de pompage par jour.',
      g_miss: 'Pour activer le garde-nappe : surface, hauteur de pompage et rayonnement solaire.',
      g_method: 'PV = kWc × jours × GHI × PR ; Possible = PV × 367 × ηp / H ; Plafond = min(Besoin × min(1, Renouvelable / ΣBesoin), Possible)',
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
      sim: 'Estimation de modèle, pas une mesure.', summary: 'Résumé'
    },
    ar: {
      n_title: 'الماء والطاقة',
      g_eyebrow: 'حارس المائدة المائية · ترابط الماء والطاقة وليس تقنية معزولة',
      g_t: 'تتوقف المضخة الشمسية عند حاجة الزراعة',
      g_p: 'حقل شمسي محسوب على أحرّ شهر يمكنه أن يضخ أكثر بكثير مما تحتاجه الزراعة بقية السنة، وكل متر مكعب إضافي شبه مجاني. يحوّل حارس المائدة المائية حاجة FAO-56 إلى سقف للضخ شهراً بشهر، وأقل من ذلك إذا فرضته المائدة أو الرخصة.',
      g_cap: 'ما تسمح الشمس بضخه', g_need: 'حاجة الزراعة', g_allowed: 'سقف الحارس', g_blocked: 'ضخ مفرط تم تجنبه', g_freed: 'طاقة شمسية محررة',
      g_peak: 'على الأكثر {v} م³ في اليوم', g_ratio: 'الحاجة', g_pct: 'مما يمكن للمضخة سحبه', g_freed_u: 'ك.و.س/سنة للتبريد أو التحويل أو الجيران',
      g_st_guarded: 'محمي: السقف يمنع الضخ المفرط', g_st_aquifer_limited: 'محدود بالمائدة: السقف أقل من الحاجة', g_st_no_surplus: 'لا فائض: الحقل الشمسي لا يتجاوز الحاجة',
      g_deficit: 'الموارد المتجددة تغطي {p} % فقط من الحاجة. ينقص {v} م³/سنة: ري ناقص، تغطية التربة، ظل الألواح أو زراعة أقل استهلاكاً.',
      g_chart: 'ما يمكن للشمس ضخه، الحاجة والسقف، حسب الشهر',
      g_ctl_t: 'إعدادات وحدة التحكم في المضخة', g_ctl_p: 'تُبرمج في وحدة التحكم مع عداد ماء: تتوقف المضخة حين يبلغ حجم اليوم حتى لو بقيت الشمس.',
      g_th_cap: 'الممكن (م³)', g_th_allowed: 'السقف (م³)', g_th_day: 'السقف / يوم (م³)', g_th_h: 'أقصى ساعات / يوم', g_th_blocked: 'المتجنَّب (م³)',
      g_in_t: 'حارس المائدة المائية', g_in_kwp: 'الحقل الشمسي المركب (ك.و.ذ)', g_in_kwp_h: 'فارغ: الحجم المحسوب أدناه ({k} ك.و.ذ).',
      g_in_sy: 'الحجم المتجدد المرخص (م³/سنة)', g_in_sy_h: 'رخصة المندوبية الجهوية للفلاحة أو حصة تغذية المائدة. فارغ: حاجة الزراعة وحدها تحدد السقف.',
      g_in_flow: 'تدفق المضخة (م³/س)', g_in_flow_h: 'لتحديد ساعات الضخ في اليوم.',
      g_miss: 'لتفعيل الحارس: المساحة، ارتفاع الضخ والإشعاع الشمسي.',
      g_method: 'PV = kWc × jours × GHI × PR ; Possible = PV × 367 × ηp / H ; Plafond = min(Besoin × min(1, Renouvelable / ΣBesoin), Possible)',
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
      sim: 'تقدير نموذجي وليس قياساً.', summary: 'Résumé'
    },
    en: {
      n_title: 'Water & energy',
      g_eyebrow: 'Groundwater guard · the nexus, not a stand-alone technology',
      g_t: 'The solar pump stops at the crop’s need',
      g_p: 'A solar array sized for the hottest month can pump far more than the crop needs the rest of the year, and every extra cubic metre is almost free. The groundwater guard turns the FAO-56 need into a pumping ceiling, month by month, and lower still if the aquifer or the permit requires it.',
      g_cap: 'What the sun could pump', g_need: 'Crop need', g_allowed: 'Guard ceiling', g_blocked: 'Over-pumping avoided', g_freed: 'Solar energy freed',
      g_peak: 'at most {v} m³ per day', g_ratio: 'the need', g_pct: 'of what the pump could draw', g_freed_u: 'kWh/yr for cooling, processing or the neighbours',
      g_st_guarded: 'Protected: the ceiling blocks over-pumping', g_st_aquifer_limited: 'Limited by the aquifer: the ceiling is below the need', g_st_no_surplus: 'No surplus: the solar array does not exceed the need',
      g_deficit: 'The renewable resource covers only {p} % of the need. {v} m³/yr are missing: deficit irrigation, mulching, agrivoltaic shade or a less demanding crop.',
      g_chart: 'What the sun could pump, the need and the ceiling, by month',
      g_ctl_t: 'Pump controller settings', g_ctl_p: 'To programme in the controller with a water meter: the pump cuts out as soon as the day’s volume is reached, even if there is still sun.',
      g_th_cap: 'Possible (m³)', g_th_allowed: 'Ceiling (m³)', g_th_day: 'Ceiling / day (m³)', g_th_h: 'Max hours / day', g_th_blocked: 'Avoided (m³)',
      g_in_t: 'Groundwater guard', g_in_kwp: 'Installed solar array (kWp)', g_in_kwp_h: 'Empty: the size calculated below ({k} kWp).',
      g_in_sy: 'Authorised renewable volume (m³/yr)', g_in_sy_h: 'CRDA permit or share of the aquifer recharge. Empty: only the crop need sets the ceiling.',
      g_in_flow: 'Pump flow rate (m³/h)', g_in_flow_h: 'To limit pumping hours per day.',
      g_miss: 'To turn on the groundwater guard: area, pumping head and solar radiation.',
      g_method: 'PV = kWp × days × GHI × PR ; Possible = PV × 367 × ηp / H ; Ceiling = min(Need × min(1, Renewable / ΣNeed), Possible)',
      n_lead: 'How much water the crop needs, how much energy it takes to pump it, which solar array would supply it, and above all how much not to exceed.',
      principle: 'Clean energy must not become unlimited water extraction.',
      principle_p: 'Once the panels are paid for, pumping one more cubic metre costs almost nothing. So GAIA never proposes a solar array without the water quota that goes with it.',
      in_t: 'Assumptions', in_crop: 'Crop', in_kc: 'Crop coefficient Kc', in_months: 'Irrigated crop months',
      in_area: 'Area (ha)', in_sys: 'Irrigation system', sys_drip: 'Drip', sys_sprinkler: 'Sprinkler', sys_surface: 'Surface (gravity)',
      in_ea: 'Application efficiency', in_head: 'Total dynamic head (m)', in_head_h: 'Well depth + drawdown + operating pressure.',
      in_pump: 'Pumping set efficiency', in_pr: 'Solar performance ratio',
      in_prices: 'Prices (to compare costs)', in_prices_h: 'Enter dated prices. Without prices, GAIA does not compare.',
      p_diesel: 'Diesel (TND/L)', p_dkwh: 'Diesel generator output (kWh/L)', p_grid: 'Grid electricity (TND/kWh)', p_pv: 'Installed solar (TND/kWp)', p_life: 'Solar lifetime (years)',
      assumption: 'Editable assumption', kc_ref: 'Default value:',
      f_need: 'Crop need', f_rain: 'Effective rainfall', f_irr: 'Irrigation needed', f_energy: 'Pumping energy', f_quota: 'Annual quota',
      per_ha: 'per ha', per_year: 'per year',
      c_water_t: 'Water: need, useful rain and irrigation, by month', c_energy_t: 'Pumping energy by month',
      s_etc: 'Need ETc', s_pe: 'Effective rainfall', s_irg: 'Gross irrigation',
      solar_t: 'Solar array needed', solar_p: 'Sized for the most demanding month', solar_none: 'No sizing: the area, pumping head or radiation is missing.',
      cost_t: 'Annual cost compared', cost_none: 'Enter at least one price to compare.',
      cost_diesel: 'Diesel pumping', cost_grid: 'Grid pumping', cost_solar: 'Solar (investment spread over its lifetime)',
      cost_note: 'Energy cost only; maintenance and equipment replacement are not included.',
      quota_t: 'Monthly pumping quota', quota_p: 'The volume not to exceed: it is the calculated agronomic need, not the pump’s capacity. A lower official allocation takes priority.',
      th_month: 'Month', th_vol: 'Volume (m³)', th_kwh: 'Energy (kWh)', th_kwp: 'kWp required',
      miss_t: 'Missing information', miss_area: 'Plot area: volumes are given per hectare.', miss_head: 'Pumping head: no energy calculation.', miss_ghi: 'Solar radiation: no sizing.', miss_kc: 'Crop coefficient: enter a value.', miss_climate: 'Climate data unavailable: rebuild the profile on the Land Intelligence page.',
      method_t: 'Method and sources', src_climate: 'Climate:', src_solar: 'Radiation:', src_om: 'Open-Meteo (shortwave radiation)',
      method_p: 'Effective rainfall: monthly USDA-SCS method, as used in FAO CROPWAT. Default Kc values come from FAO-56 (table 12) and remain to be checked against the publication. Solar sizing assumes radiation on the panel close to horizontal radiation.',
      sim: 'Model estimate, not a measurement.', summary: 'Summary'
    },
    ja: {
      n_title: '水とエネルギー',
      g_eyebrow: '地下水ガード · 単独の技術ではなく、ネクサスとして',
      g_t: '太陽光ポンプは作物の必要量で止まる',
      g_p: '最も暑い月に合わせた太陽光アレイは、それ以外の月には作物の必要量をはるかに超えて揚水でき、余分な1 m³はほぼ無料です。地下水ガードはFAO-56の必要水量を月ごとの揚水上限に変え、帯水層や許可がそれを求めるならさらに低くします。',
      g_cap: '太陽で汲み上げられる量', g_need: '作物の必要量', g_allowed: 'ガードの上限', g_blocked: '防いだ過剰揚水', g_freed: '余った太陽光エネルギー',
      g_peak: '1日あたり最大{v} m³', g_ratio: '必要量', g_pct: '（ポンプが汲める量に対して）', g_freed_u: 'kWh/年を冷蔵、加工、近隣に回せます',
      g_st_guarded: '保護中：上限が過剰揚水を止めています', g_st_aquifer_limited: '帯水層による制限：上限が必要量を下回っています', g_st_no_surplus: '余剰なし：太陽光アレイは必要量を超えません',
      g_deficit: '再生可能な水資源は必要量の{p} %しか満たしません。{v} m³/年が不足：不足灌漑、マルチング、営農型太陽光の日陰、または水を必要としない作物で補います。',
      g_chart: '太陽で汲める量・必要量・上限（月別）',
      g_ctl_t: 'ポンプ制御装置の設定', g_ctl_p: '水量計と合わせて制御装置に設定します。日射が残っていても、その日の量に達した時点でポンプが止まります。',
      g_th_cap: '可能量（m³）', g_th_allowed: '上限（m³）', g_th_day: '1日の上限（m³）', g_th_h: '1日の最大時間', g_th_blocked: '防いだ量（m³）',
      g_in_t: '地下水ガード', g_in_kwp: '設置済み太陽光アレイ（kWp）', g_in_kwp_h: '空欄：下で計算したサイズ（{k} kWp）。',
      g_in_sy: '許可された再生可能水量（m³/年）', g_in_sy_h: 'CRDAの許可、または帯水層の涵養量の一部。空欄：作物の必要量だけで上限を決めます。',
      g_in_flow: 'ポンプ流量（m³/h）', g_in_flow_h: '1日の揚水時間を制限するため。',
      g_miss: '地下水ガードを有効にするには：面積、揚程、日射量。',
      g_method: 'PV = kWp × 日数 × GHI × PR ; 可能量 = PV × 367 × ηp / H ; 上限 = min(必要量 × min(1, 再生可能量 / Σ必要量), 可能量)',
      n_lead: '作物に必要な水の量、それを汲み上げるエネルギー、それをまかなう太陽光アレイ、そして何より超えてはならない量。',
      principle: 'クリーンエネルギーが無制限の取水につながってはならない。',
      principle_p: 'パネルの代金を払い終えると、もう1 m³汲むコストはほぼゼロです。だからGAIAは、水の割当量なしに太陽光アレイを提案することはありません。',
      in_t: '前提条件', in_crop: '作物', in_kc: '作物係数Kc', in_months: '灌漑する月',
      in_area: '面積（ha）', in_sys: '灌漑方式', sys_drip: '点滴', sys_sprinkler: 'スプリンクラー', sys_surface: '地表（重力式）',
      in_ea: '灌水効率', in_head: '全揚程（m）', in_head_h: '井戸の深さ＋水位低下＋使用圧力。',
      in_pump: 'ポンプ設備の効率', in_pr: '太陽光の性能比',
      in_prices: '価格（コスト比較用）', in_prices_h: '日付つきの価格を入力してください。価格がなければGAIAは比較しません。',
      p_diesel: '軽油（TND/L）', p_dkwh: 'ディーゼル発電機の出力（kWh/L）', p_grid: '系統電力（TND/kWh）', p_pv: '太陽光の設置費（TND/kWp）', p_life: '太陽光の寿命（年）',
      assumption: '変更できる前提', kc_ref: '既定値：',
      f_need: '作物の必要量', f_rain: '有効雨量', f_irr: '必要な灌漑量', f_energy: '揚水エネルギー', f_quota: '年間割当量',
      per_ha: 'haあたり', per_year: '年あたり',
      c_water_t: '水：必要量・有効雨量・灌漑量（月別）', c_energy_t: '月別の揚水エネルギー',
      s_etc: '必要量ETc', s_pe: '有効雨量', s_irg: '総灌漑量',
      solar_t: '必要な太陽光アレイ', solar_p: '最も需要の大きい月に合わせて設計', solar_none: '設計できません：面積、揚程、または日射量が不足しています。',
      cost_t: '年間コストの比較', cost_none: '比較するには価格を1つ以上入力してください。',
      cost_diesel: 'ディーゼル揚水', cost_grid: '系統電力揚水', cost_solar: '太陽光（投資を寿命で按分）',
      cost_note: 'エネルギーコストのみ。保守と機器交換は含みません。',
      quota_t: '月ごとの揚水割当量', quota_p: '超えてはならない量です。ポンプの能力ではなく、計算した農学的な必要量です。公式の割当がこれより低い場合はそちらが優先されます。',
      th_month: '月', th_vol: '量（m³）', th_kwh: 'エネルギー（kWh）', th_kwp: '必要kWp',
      miss_t: '欠けている情報', miss_area: '区画の面積：量はヘクタールあたりで表示しています。', miss_head: '揚程：エネルギーを計算できません。', miss_ghi: '日射量：設計できません。', miss_kc: '作物係数：値を入力してください。', miss_climate: '気候データを取得できません。ランド・インテリジェンスでプロファイルを作り直してください。',
      method_t: '方法と出典', src_climate: '気候：', src_solar: '日射：', src_om: 'Open-Meteo（短波放射）',
      method_p: '有効雨量：FAO CROPWATで使われる月別USDA-SCS法。Kcの既定値はFAO-56（表12）によるもので、原典で確認が必要です。太陽光の設計では、パネル面の日射が水平面日射に近いと仮定しています。',
      sim: 'モデルによる推定値で、実測ではありません。', summary: '概要'
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
    diesel_tnd_l: '', diesel_kwh_l: '', grid_tnd_kwh: '', pv_tnd_kwp: '', pv_life_y: 20,
    pv_kwp: '', safe_yield: '', flow: ''
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
      el('div', { class: 'nx-guard-in' }, [
        el('h3', null, [t('g_in_t')]),
        field('nx-g1', 'g_in_kwp', S.pv_kwp, function (v) { S.pv_kwp = num(v); }),
        kwpHint = el('span', { class: 'assump' }),
        field('nx-g2', 'g_in_sy', S.safe_yield, function (v) { S.safe_yield = num(v); }, 'g_in_sy_h'),
        field('nx-g3', 'g_in_flow', S.flow, function (v) { S.flow = num(v); }, 'g_in_flow_h')
      ]),
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

  var out, kwpHint;
  function guardCard(r, months) {
    var g = GG.guard({ ghi: ghi, head_m: num(S.head), pump_eff: num(S.pump_eff), pr: num(S.pr), area_ha: num(S.area),
      pv_kwp: num(S.pv_kwp), safe_yield_m3_year: num(S.safe_yield), flow_m3_h: num(S.flow) }, r);
    if (kwpHint) kwpHint.textContent = t('g_in_kwp_h').replace('{k}', r.solar ? fmt(r.solar.kwp, 1) : '—');
    var head = [el('p', { class: 'eyebrow', style: 'margin:0' }, [t('g_eyebrow')]), el('h2', null, [t('g_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('g_p')])];
    if (g.status === 'incomplete') return el('div', { class: 'gp-card guard' }, head.concat([G.note('info', t('g_miss'))]));
    var T = g.totals;
    var kind = g.status === 'aquifer_limited' ? 'adapt' : 'ok';
    var tiles = [
      ['g_cap', fmt(T.capacity) + ' m³', fmt(T.over_ratio, 1) + ' × ' + t('g_ratio'), 'cap'],
      ['g_need', fmt(T.need) + ' m³', 'FAO-56 · ' + t('per_year'), 'need'],
      ['g_allowed', fmt(T.allowed) + ' m³', t('g_peak').replace('{v}', fmt(T.peak_daily_m3)), 'allowed'],
      ['g_blocked', fmt(T.blocked) + ' m³', fmt(T.blocked_pct * 100) + ' % ' + t('g_pct'), 'blocked'],
      ['g_freed', fmt(T.freed_kwh) + ' kWh', t('g_freed_u'), 'freed']
    ];
    var chart = el('div');
    var body = head.concat([
      el('div', { style: 'margin-top:10px' }, [G.pill(kind, t('g_st_' + g.status))]),
      el('div', { class: 'flow', style: 'margin-top:12px' }, tiles.map(function (k) {
        return el('div', { class: 'fbox g-' + k[3] }, [el('b', null, [t(k[0])]), el('div', { class: 'v' }, [k[1]]), el('span', { class: 'u' }, [k[2]])]);
      })),
      T.share < 1 ? el('div', { style: 'margin-top:12px' }, [G.note('warn', t('g_deficit').replace('{p}', fmt(T.share * 100)).replace('{v}', fmt(T.deficit)))]) : null,
      el('h3', { style: 'margin-top:16px' }, [t('g_chart')]), chart,
      el('h3', { style: 'margin-top:16px' }, [t('g_ctl_t')]),
      el('p', { class: 'small', style: 'margin-top:4px;color:var(--g-ink-2)' }, [t('g_ctl_p')]),
      el('div', { class: 'gp-table-wrap', style: 'margin-top:8px' }, [el('table', { class: 'gp-table' }, [
        el('thead', null, [el('tr', null, [el('th', null, [t('th_month')]), el('th', { class: 'num' }, [t('g_th_cap')]), el('th', { class: 'num' }, [t('g_th_allowed')]),
          el('th', { class: 'num' }, [t('g_th_day')]), el('th', { class: 'num' }, [t('g_th_h')]), el('th', { class: 'num' }, [t('g_th_blocked')])])]),
        el('tbody', null, g.months.map(function (x) {
          return el('tr', null, [el('td', null, [months[x.m]]), el('td', { class: 'num' }, [fmt(x.capacity_m3)]), el('td', { class: 'num' }, [el('b', null, [fmt(x.allowed_m3)])]),
            el('td', { class: 'num' }, [fmt(x.daily_cap_m3, 1)]), el('td', { class: 'num' }, [x.hours_per_day === null ? '—' : fmt(x.hours_per_day, 1)]), el('td', { class: 'num' }, [fmt(x.blocked_m3)])]);
        }))
      ])]),
      el('div', { class: 'formula', style: 'margin-top:10px' }, [t('g_method')]),
      el('p', { class: 'assump', style: 'margin-top:6px' }, [t('sim') + ' · ' + (g.kwp_source === 'installed' ? t('g_in_kwp') : t('solar_t')) + ' : ' + fmt(g.kwp, 1) + ' kWc'])
    ]);
    var card = el('div', { class: 'gp-card guard' }, body);
    setTimeout(function () {
      G.barChart(chart, { labels: months, unit: 'm³', title: t('g_chart'), series: [
        { name: t('g_cap'), color: '#C9B173', values: g.months.map(function (x) { return x.capacity_m3; }) },
        { name: t('g_need'), color: '#7C9455', values: g.months.map(function (x) { return x.need_m3; }) },
        { name: t('g_allowed'), color: '#2F5A75', values: g.months.map(function (x) { return x.allowed_m3; }) }
      ] });
    }, 0);
    return card;
  }

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
    out.appendChild(el('div', { class: 'flow', 'aria-label': t('summary') }, [
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_need')]), el('div', { class: 'v' }, [fmt(T.etc) + ' mm']), el('span', { class: 'u' }, ['ETc · ' + t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_rain')]), el('div', { class: 'v' }, [fmt(T.pe) + ' mm']), el('span', { class: 'u' }, ['Pe · ' + t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_irr')]), el('div', { class: 'v' }, [fmt(T.irg) + ' mm']), el('span', { class: 'u' }, [volTxt + (hasArea ? '' : ' ' + t('per_ha'))])]),
      el('div', { class: 'fbox energy' }, [el('b', null, [t('f_energy')]), el('div', { class: 'v' }, [T.kwh > 0 ? fmt(T.kwh) + ' kWh' : '—']), el('span', { class: 'u' }, [t('per_year')])]),
      el('div', { class: 'fbox quota' }, [el('b', null, [t('f_quota')]), el('div', { class: 'v' }, [volTxt]), el('span', { class: 'u' }, [hasArea ? t('per_year') : t('per_ha') + ' · ' + t('per_year')])])
    ]));
    out.appendChild(el('p', { class: 'assump', style: 'margin-top:6px' }, [t('sim')]));
    out.appendChild(guardCard(r, months));

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
          return el('tr', { class: 'cost-row' }, [el('td', null, [t(c[1])]), el('td', { class: 'num' }, [fmt(r.costs[c[0]]) + ' TND / ' + t('per_year').replace(/^(par|per) /, '').replace('あたり', '')])]);
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
    persist();
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
    },
    en: {
      fc_t: 'Irrigation plan: today and the next 7 days', fc_badge: 'Trained model',
      fc_lead: 'A machine-learning model (LightGBM) forecasts, day by day, the state of the soil in the root zone (7–28 cm), from the last known soil state and the weather forecast.',
      fc_loading: 'Forecasting…',
      fc_off: 'The forecast service is not running. From the project folder, run: python -m uvicorn gaia.main:app --app-dir backend --port 8000',
      fc_err: 'Forecast unavailable:',
      v_irrigate: 'Irrigation advised from {d}.',
      v_soon: 'No irrigation needed for now, but the reserve gets close to the threshold from {d}.',
      v_none: 'No irrigation needed this week: the soil reserve stays sufficient.',
      v_sub: "Estimated soil reserve today: {r} (probably between {lo} and {hi}).",
      b_state: 'Last known soil state', b_state_u: 'ECMWF IFS · {d} (yesterday, last complete day)',
      b_today: 'Today (estimated)', b_today_u: 'probably between {lo} and {hi}',
      b_week: 'Crop water use over 7 days', b_week_u: 'Kc × ET0 · {v} m³ per ha',
      today: 'today',
      th_day: 'Day', th_rain: 'Forecast rain', th_et0: 'Reference evaporation (ET0)', th_etc: 'Crop water use',
      th_res: 'Soil reserve', th_range: 'Probable range', th_dec: 'Advice',
      d_irrigate: 'Irrigate', d_soon: 'Irrigate soon', d_none: 'Reserve sufficient',
      c_res_t: 'Forecast soil reserve (%)',
      how_t: 'How to read this plan',
      how_res: 'Soil reserve: the state of the soil compared with its history in the area since 2020. 0 % = as dry as the driest days, 100 % = as wet as the wettest days. It is not the percentage of water in the soil.',
      how_range: "Probable range: the model's usual error, measured on areas it never saw in training. It widens with the days: the further ahead, the less certain.",
      how_dec: 'Advice: "Irrigate" when the forecast reserve drops below 30 %, "Irrigate soon" between 30 and 35 %, "Reserve sufficient" above. These thresholds are a demonstration assumption, the same for every crop; they will be replaced by each crop\'s thresholds (FAO-56).',
      how_need: '"Reserve sufficient" does not mean the plant is not drinking: the "Crop water use" column shows what it uses each day. It means the water already in the soil covers that need.',
      how_irr: 'The model describes a non-irrigated soil in the area: it does not know whether your plot was watered. A soil moisture sensor will let it correct for that.',
      fc_ref: 'Reference site for the reserve:',
      fc_src: 'Data:',
      fc_sim: 'Trained-model prediction, not a measurement.',
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    },
    ja: {
      fc_t: '灌漑計画：今日と今後7日間', fc_badge: '学習済みモデル',
      fc_lead: '機械学習モデル（LightGBM）が、最後に分かっている土壌の状態と天気予報から、根の層（7〜28 cm）の土壌の状態を日ごとに予測します。',
      fc_loading: '予測中…',
      fc_off: '予測サービスが起動していません。プロジェクトのフォルダで次を実行してください：python -m uvicorn gaia.main:app --app-dir backend --port 8000',
      fc_err: '予測できません：',
      v_irrigate: '{d}から灌漑をおすすめします。',
      v_soon: '今のところ灌漑は不要ですが、{d}から蓄えがしきい値に近づきます。',
      v_none: '今週は灌漑不要です：土壌の蓄えは十分なままです。',
      v_sub: '今日の土壌の蓄え（推定）：{r}（おそらく{lo}〜{hi}）。',
      b_state: '最後に分かっている土壌の状態', b_state_u: 'ECMWF IFS · {d}（昨日、最後の完全な日）',
      b_today: '今日（推定）', b_today_u: 'おそらく{lo}〜{hi}',
      b_week: '7日間の作物の水消費', b_week_u: 'Kc × ET0 · 1 haあたり{v} m³',
      today: '今日',
      th_day: '日', th_rain: '予想降水量', th_et0: '基準蒸発散量（ET0）', th_etc: '作物の水消費',
      th_res: '土壌の蓄え', th_range: '可能性の高い範囲', th_dec: 'アドバイス',
      d_irrigate: '灌漑する', d_soon: 'まもなく灌漑', d_none: '蓄えは十分',
      c_res_t: '土壌の蓄えの予測（%）',
      how_t: 'この計画の読み方',
      how_res: '土壌の蓄え：2020年以降のこの地域の記録と比べた土壌の状態です。0 % = 最も乾いた日と同じくらい乾燥、100 % = 最も湿った日と同じくらい湿潤。土壌中の水の割合ではありません。',
      how_range: '可能性の高い範囲：学習で見ていない地域で測ったモデルの通常の誤差です。日が進むほど広がります：先の予測ほど不確かです。',
      how_dec: 'アドバイス：予測される蓄えが30 %を下回ると「灌漑する」、30〜35 %で「まもなく灌漑」、それ以上で「蓄えは十分」。これらのしきい値はデモ用の仮定で、どの作物でも同じです。今後、作物ごとのしきい値（FAO-56）に置き換えます。',
      how_need: '「蓄えは十分」は植物が水を使っていないという意味ではありません。「作物の水消費」の列に毎日の使用量が出ています。土壌にすでにある水でその分をまかなえる、という意味です。',
      how_irr: 'このモデルは地域の灌漑されていない土壌を表します。あなたの区画に水をまいたかどうかは分かりません。土壌水分センサーで補正できるようになります。',
      fc_ref: '蓄えの基準地点：',
      fc_src: 'データ：',
      fc_sim: '学習済みモデルの予測で、実測ではありません。',
      wd: ['日', '月', '火', '水', '木', '金', '土']
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
    ar: { c_olive: 'زيتون', c_palm: 'نخيل التمر', c_citrus: 'قوارص', c_cereal: 'حبوب', c_veg: 'خضروات', c_other: 'أخرى' },
    en: { c_olive: 'Olive', c_palm: 'Date palm', c_citrus: 'Citrus', c_cereal: 'Cereals', c_veg: 'Vegetables', c_other: 'Other' },
    ja: { c_olive: 'オリーブ', c_palm: 'ナツメヤシ', c_citrus: '柑橘', c_cereal: '穀物', c_veg: '野菜', c_other: 'その他' }
  });
  renderAll();
  G.onLang(renderAll);
}());
