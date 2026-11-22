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
      n_lead: "L'eau dont votre culture a besoin, l'énergie pour la pomper, et la limite à ne pas dépasser.",
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
      cost_ref: "Prix non saisis : GAIA utilise des prix de référence tunisiens à vérifier (gasoil 2,205 TND/L, groupe diesel 3 kWh/L, électricité agricole 0,25 TND/kWh, solaire 3 000 TND/kWc). Saisissez vos prix dans « Hypothèses » : le tableau se recalcule aussitôt.",
      cost_note: "Coût de l'énergie seulement ; l'entretien et le remplacement des équipements ne sont pas inclus.",
      quota_t: 'Quota mensuel de pompage', quota_p: "Volume à ne pas dépasser : c'est le besoin agronomique calculé, pas la capacité de la pompe. Une allocation officielle plus basse s'applique en priorité.",
      th_month: 'Mois', th_vol: 'Volume (m³)', th_kwh: 'Énergie (kWh)', th_kwp: 'kWc requis',
      head_est: "Hauteur de pompage non renseignée : l'énergie et les kWc sont calculés avec une estimation de {h} m (puits d'environ 30 m + 10 m de pression du goutte-à-goutte). Saisissez la vraie hauteur dans « Hypothèses » : tous les chiffres se recalculent aussitôt.",
      miss_t: 'Informations manquantes', miss_area: 'Surface de la parcelle : volumes, énergie et kWc sont donnés par hectare.', miss_head: 'Hauteur de pompage : pas de calcul d’énergie.', miss_ghi: 'Rayonnement solaire : pas de dimensionnement.', miss_kc: 'Coefficient cultural : saisissez une valeur.', miss_climate: 'Données climatiques indisponibles : reconstruisez le profil sur la page Land Intelligence.',
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
      n_lead: "الماء الذي تحتاجه زراعتك، والطاقة لضخه، والحد الذي لا يجب تجاوزه.",
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
      cost_ref: 'أسعار غير مُدخلة: يستعمل GAIA أسعارًا مرجعية تونسية يجب التحقق منها (المازوط 2,205 د/ل، مولّد ديزل 3 ك.و.س/ل، كهرباء فلاحية 0,25 د/ك.و.س، الطاقة الشمسية 3000 د/ك.و.ذ). أدخل أسعارك في «الفرضيات»: يُعاد الحساب فورًا.',
      cost_note: 'كلفة الطاقة فقط؛ لا تشمل صيانة المعدات وتعويضها.',
      quota_t: 'الحصة الشهرية للضخ', quota_p: 'الحجم الذي لا يجب تجاوزه: هو الحاجة الزراعية المحسوبة وليس قدرة المضخة. وإذا كانت الحصة الرسمية أقل فهي الأولى.',
      th_month: 'الشهر', th_vol: 'الحجم (م³)', th_kwh: 'الطاقة (ك.و.س)', th_kwp: 'ك.و.ذ اللازمة',
      head_est: "ارتفاع الضخ غير مُدخل: تُحسب الطاقة والكيلوواط الذروي بتقدير {h} م (بئر بعمق 30 م تقريبًا + 10 م ضغط الري بالتنقيط). أدخل الارتفاع الحقيقي في «الفرضيات»: تُعاد كل الأرقام فورًا.",
      miss_t: 'معلومات ناقصة', miss_area: 'مساحة القطعة: تُعطى الأحجام والطاقة والقدرة الشمسية للهكتار.', miss_head: 'ارتفاع الضخ: لا حساب للطاقة.', miss_ghi: 'الإشعاع الشمسي: لا حساب للحقل الشمسي.', miss_kc: 'المعامل الزراعي: أدخل قيمة.', miss_climate: 'البيانات المناخية غير متاحة: أعد بناء الملف في صفحة ذكاء الأرض.',
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
      n_lead: "The water your crop needs, the energy to pump it, and the limit not to exceed.",
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
      cost_ref: 'Prices not entered: GAIA uses Tunisian reference prices to be checked (diesel 2.205 TND/L, diesel set 3 kWh/L, farm electricity 0.25 TND/kWh, solar 3,000 TND/kWp). Enter your prices under "Assumptions": the table updates at once.',
      cost_note: 'Energy cost only; maintenance and equipment replacement are not included.',
      quota_t: 'Monthly pumping quota', quota_p: 'The volume not to exceed: it is the calculated agronomic need, not the pump’s capacity. A lower official allocation takes priority.',
      th_month: 'Month', th_vol: 'Volume (m³)', th_kwh: 'Energy (kWh)', th_kwp: 'kWp required',
      head_est: "Pumping head not entered: energy and kWp are computed with an estimate of {h} m (a well of about 30 m + 10 m of drip pressure). Enter the real head under \"Assumptions\": every figure updates at once.",
      miss_t: 'Missing information', miss_area: 'Plot area: volumes, energy and kWp are given per hectare.', miss_head: 'Pumping head: no energy calculation.', miss_ghi: 'Solar radiation: no sizing.', miss_kc: 'Crop coefficient: enter a value.', miss_climate: 'Climate data unavailable: rebuild the profile on the Land Intelligence page.',
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
      n_lead: "作物に必要な水、それを汲むエネルギー、そして超えてはいけない上限。",
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
      cost_ref: '価格が未入力です：確認が必要なチュニジアの参考価格を使用しています（軽油 2.205 TND/L、ディーゼル発電機 3 kWh/L、農業用電力 0.25 TND/kWh、太陽光 3,000 TND/kWp）。「前提条件」に価格を入力するとすぐに再計算されます。',
      cost_note: 'エネルギーコストのみ。保守と機器交換は含みません。',
      quota_t: '月ごとの揚水割当量', quota_p: '超えてはならない量です。ポンプの能力ではなく、計算した農学的な必要量です。公式の割当がこれより低い場合はそちらが優先されます。',
      th_month: '月', th_vol: '量（m³）', th_kwh: 'エネルギー（kWh）', th_kwp: '必要kWp',
      head_est: "揚程が未入力です：エネルギーとkWpは推定値{h} m（深さ約30 mの井戸＋点滴の圧力10 m）で計算しています。「前提条件」に実際の揚程を入力すると、すべての数値がすぐに再計算されます。",
      miss_t: '欠けている情報', miss_area: '区画の面積：水量・エネルギー・kWpはヘクタールあたりで表示しています。', miss_head: '揚程：エネルギーを計算できません。', miss_ghi: '日射量：設計できません。', miss_kc: '作物係数：値を入力してください。', miss_climate: '気候データを取得できません。ランド・インテリジェンスでプロファイルを作り直してください。',
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
    pv_kwp: '', safe_yield: '', flow: '', pe_mode: 'gaia', plan_mode: 'solar', irrigated_mm: ''
  }, saved && saved.parcelAt === dna.builtAt ? saved.values : {});
  // a saved value that cannot be right (negative or zero) falls back to the reference value
  if (!(num(S.kc) > 0)) S.kc = N.CROPS[N.CROPS[S.crop] ? S.crop : 'other'].kc;
  ['diesel_tnd_l', 'grid_tnd_kwh', 'pv_tnd_kwp', 'safe_yield', 'pv_kwp', 'flow', 'area', 'head'].forEach(function (k) { if (num(S[k]) < 0) S[k] = ''; });

  var CM = dna.climateMonthly, SM = dna.solarMonthly;
  var ghi = SM && SM.ghi ? SM.ghi : (CM && CM.ghi ? CM.ghi : null);
  var ghiSrc = SM && SM.ghi ? SM.source : (CM && CM.ghi ? t('src_om') : null);

  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; }
  function persist() { G.save('gaia.nexus.inputs', { parcelAt: dna.builtAt, values: S }); }

  // pumping head not given yet: typical Tunisian well (~30 m) + drip pressure (~10 m), shown as an estimate
  var EST_HEAD = 40;
  function headM() { return num(S.head) > 0 ? num(S.head) : EST_HEAD; }
  function headIsEst() { return !(num(S.head) > 0); }
  // prices not given yet: typical Tunisian reference values, shown as estimates the farmer can overwrite
  var REF_PRICE = { diesel_tnd_l: 2.205, diesel_kwh_l: 3, grid_tnd_kwh: 0.25, pv_tnd_kwp: 3000 };
  function price(k) { return num(S[k]) > 0 ? num(S[k]) : REF_PRICE[k]; }
  function pricesEst() { return Object.keys(REF_PRICE).filter(function (k) { return !(num(S[k]) > 0); }); }

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
      el('span', { class: 'assump' }, [t('kc_ref')]),
      el('div', { class: 'gp-field' }, [el('span', { class: 'lab' }, [t('in_months')]), monthBtns]),
      field('nx-area', 'in_area', S.area, function (v) { S.area = num(v); }),
      el('div', { class: 'gp-field' }, [el('label', { for: 'nx-sys' }, [t('in_sys')]), sysSel]),
      field('nx-ea', 'in_ea', S.ea, function (v) { S.ea = num(v); }, 'assumption', { min: 0.3, max: 1 }),
      field('nx-head', 'in_head', S.head, function (v) { S.head = num(v); }, 'in_head_h', { placeholder: EST_HEAD + ' (estimation)' }),
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
        field('nx-p1', 'p_diesel', S.diesel_tnd_l, function (v) { S.diesel_tnd_l = num(v); }, null, { placeholder: REF_PRICE.diesel_tnd_l + ' (réf.)' }),
        field('nx-p2', 'p_dkwh', S.diesel_kwh_l, function (v) { S.diesel_kwh_l = num(v); }, null, { placeholder: REF_PRICE.diesel_kwh_l + ' (réf.)' }),
        field('nx-p3', 'p_grid', S.grid_tnd_kwh, function (v) { S.grid_tnd_kwh = num(v); }, null, { placeholder: REF_PRICE.grid_tnd_kwh + ' (réf.)' }),
        field('nx-p4', 'p_pv', S.pv_tnd_kwp, function (v) { S.pv_tnd_kwp = num(v); }, null, { placeholder: REF_PRICE.pv_tnd_kwp + ' (réf.)' }),
        field('nx-p5', 'p_life', S.pv_life_y, function (v) { S.pv_life_y = num(v); })
      ])
    ]);
  }

  var out, kwpHint;
  function guardCard(r, months) {
    var hasA = num(S.area) > 0;
    var g = GG.guard({ ghi: ghi, head_m: headM(), pump_eff: num(S.pump_eff), pr: num(S.pr), area_ha: hasA ? num(S.area) : 1,
      pv_kwp: num(S.pv_kwp), safe_yield_m3_year: hasA && num(S.safe_yield) > 0 ? num(S.safe_yield) : null, flow_m3_h: num(S.flow) }, r);
    var gha = hasA ? '' : ' / ha';
    if (kwpHint) kwpHint.textContent = t('g_in_kwp_h').replace('{k}', r.solar ? fmt(r.solar.kwp, 1) : '—');
    var head = [el('p', { class: 'eyebrow', style: 'margin:0' }, [t('g_eyebrow')]), el('h2', null, [t('g_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('g_p')])];
    if (g.status === 'incomplete') return el('div', { class: 'gp-card guard' }, head.concat([G.note('info', t('g_miss'))]));
    var T = g.totals;
    var kind = g.status === 'aquifer_limited' ? 'adapt' : 'ok';
    var tiles = [
      ['g_cap', fmt(T.capacity) + ' m³', fmt(T.over_ratio, 1) + ' × ' + t('g_ratio'), 'cap'],
      ['g_need', fmt(T.need) + ' m³', t('per_year'), 'need'],
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
        el('thead', null, [el('tr', null, [el('th', null, [t('th_month')]), el('th', { class: 'num' }, [t('g_th_cap') + gha]), el('th', { class: 'num' }, [t('g_th_allowed') + gha]),
          el('th', { class: 'num' }, [t('g_th_day') + gha]), el('th', { class: 'num' }, [t('g_th_h') + gha]), el('th', { class: 'num' }, [t('g_th_blocked') + gha])])]),
        el('tbody', null, g.months.map(function (x) {
          return el('tr', null, [el('td', null, [months[x.m]]), el('td', { class: 'num' }, [fmt(x.capacity_m3)]), el('td', { class: 'num' }, [el('b', null, [fmt(x.allowed_m3)])]),
            el('td', { class: 'num' }, [fmt(x.daily_cap_m3, 1)]), el('td', { class: 'num' }, [x.hours_per_day === null ? t('g_need_flow') : fmt(x.hours_per_day, 1) + ' h']), el('td', { class: 'num' }, [fmt(x.blocked_m3)])]);
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
    var base = {
      et0: CM ? CM.et0 : null, rain: CM ? CM.rain : null, ghi: ghi,
      kc: num(S.kc), months: S.months, area_ha: num(S.area) > 0 ? num(S.area) : 1, ea: num(S.ea), head_m: headM(), pump_eff: num(S.pump_eff), pr: num(S.pr),
      prices: { diesel_tnd_l: price('diesel_tnd_l'), diesel_kwh_l: price('diesel_kwh_l'), grid_tnd_kwh: price('grid_tnd_kwh'), pv_tnd_kwp: price('pv_tnd_kwp'), pv_life_y: num(S.pv_life_y) > 0 ? num(S.pv_life_y) : 20 }
    };
    var rUsda = N.compute(base);
    var rGaia = PE.status === 'ok' ? N.compute(Object.assign({}, base, { pe_factor: PE.site.part_mensuelle })) : null;
    var useGaia = !!rGaia;                                   // the trained model when available
    var r = useGaia ? rGaia : rUsda;
    if (r.missing.indexOf('climate') !== -1) { out.appendChild(G.note('err', t('miss_climate'))); return; }
    var hasArea = num(S.area) > 0, months = G.t('months'), T = r.totals, ha = hasArea ? '' : ' / ha';
    if (!hasArea && r.missing.indexOf('area') === -1) r.missing.unshift('area');

    // headline flow
    var volTxt = hasArea ? fmt(T.vol) + ' m³' : fmt(T.volHa) + ' m³';
    out.appendChild(el('div', { class: 'flow', 'aria-label': t('summary') }, [
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_need')]), el('div', { class: 'v' }, [fmt(T.etc) + ' mm']), el('span', { class: 'u' }, [t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_rain')]), el('div', { class: 'v' }, [fmt(T.pe) + ' mm']), el('span', { class: 'u' }, [t('per_year') + ' · ' + (useGaia ? t('pe_by_gaia') : t('pe_classic'))])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('f_irr')]), el('div', { class: 'v' }, [fmt(T.irg) + ' mm']), el('span', { class: 'u' }, [volTxt + (hasArea ? '' : ' ' + t('per_ha'))])]),
      el('div', { class: 'fbox energy' }, [el('b', null, [t('f_energy')]), el('div', { class: 'v' }, [T.kwh > 0 ? fmt(T.kwh) + ' kWh' : '—']), el('span', { class: 'u' }, [(hasArea ? '' : t('per_ha') + ' · ') + t('per_year')])]),
      el('div', { class: 'fbox quota' }, [el('b', null, [t('f_quota')]), el('div', { class: 'v' }, [volTxt]), el('span', { class: 'u' }, [hasArea ? t('per_year') : t('per_ha') + ' · ' + t('per_year')])])
    ]));
    out.appendChild(el('p', { class: 'assump', style: 'margin-top:6px' }, [t('sim')]));
    out.appendChild(peCard(rUsda, rGaia, months));
    out.appendChild(guardCard(r, months));

    if (headIsEst()) out.appendChild(el('div', { style: 'margin-top:14px' }, [G.note('warn', t('head_est').replace('{h}', EST_HEAD))]));
    if (r.missing.length) {
      out.appendChild(el('div', { class: 'gp-note', style: 'margin-top:14px' }, [G.icon('info'), el('div', null, [el('b', null, [t('miss_t')]),
        el('ul', { style: 'margin:4px 0 0;padding-inline-start:18px' }, r.missing.map(function (k) { return el('li', null, [t('miss_' + k)]); }))])]));
    }

    out.appendChild(forecastCard());
    out.appendChild(plannerCard(r));
    out.appendChild(agentCard(r));
    if (window.GAIA_FARMREC) out.appendChild(GAIA_FARMREC.card({ settings: function () { return pageSettings(r); },
      plan: function () { return PL.data && PL.status !== 'error' && PL.status !== 'loading' ? { data: PL.data, mode: planBody(r).mode } : null; } }));

    var c1 = el('div'), c2 = el('div');
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [el('h2', null, [t('c_water_t')]), c1]));
    G.barChart(c1, { labels: months, unit: 'mm', title: t('c_water_t'), series: [
      { name: t('s_etc'), color: '#7C9455', values: r.months.map(function (x) { return x.etc; }) },
      { name: t('s_pe'), color: '#9CB7C9', values: r.months.map(function (x) { return x.pe; }) },
      { name: t('s_irg'), color: '#2F5A75', values: r.months.map(function (x) { return x.irg; }) }
    ] });
    if (T.kwh > 0) {
      out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [el('h2', null, [t('c_energy_t')]), c2]));
      G.barChart(c2, { labels: months, unit: 'kWh' + ha, title: t('c_energy_t'), series: [{ name: t('f_energy'), color: '#A88746', values: r.months.map(function (x) { return x.kwh || 0; }) }] });
    }

    // solar + costs
    var costRows = [['diesel', 'cost_diesel'], ['grid', 'cost_grid'], ['solar', 'cost_solar']].filter(function (c) { return r.costs[c[0]] !== undefined; });
    out.appendChild(el('div', { class: 'gp-grid gp-cols-2', style: 'margin-top:16px' }, [
      el('div', { class: 'gp-card' }, [
        el('h2', null, [t('solar_t')]),
        r.solar ? el('div', null, [
          el('p', { style: 'font-family:var(--g-display);font-size:34px;font-weight:600;color:var(--g-forest);margin-top:6px' }, [fmt(r.solar.kwp, 1) + ' kWc' + ha]),
          el('p', { class: 'small muted' }, [t('solar_p') + ' : ' + months[r.solar.peakMonth]]),
          el('p', { class: 'assump', style: 'margin-top:6px' }, [t('src_solar_plain')])
        ]) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('solar_none')])
      ]),
      el('div', { class: 'gp-card' }, [
        el('h2', null, [t('cost_t')]),
        costRows.length ? el('div', { class: 'gp-table-wrap' }, [el('table', { class: 'gp-table', style: 'margin-top:8px' }, [el('tbody', null, costRows.map(function (c) {
          return el('tr', { class: 'cost-row' }, [el('td', null, [t(c[1])]), el('td', { class: 'num' }, [fmt(r.costs[c[0]]) + ' TND' + ha + ' / ' + t('per_year').replace(/^(par|per) /, '').replace('あたり', '')])]);
        }))]), el('p', { class: 'assump', style: 'margin-top:8px' }, [t('cost_note')]),
          pricesEst().length ? el('p', { class: 'assump', style: 'margin-top:4px;color:#8a5a12' }, [t('cost_ref')]) : null]) : el('p', { class: 'small muted', style: 'margin-top:8px' }, [t('cost_none')])
      ])
    ]));

    // quota table
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('h2', null, [t('quota_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('quota_p')]),
      el('div', { class: 'gp-table-wrap', style: 'margin-top:10px' }, [el('table', { class: 'gp-table' }, [
        el('thead', null, [el('tr', null, [el('th', null, [t('th_month')]), el('th', { class: 'num' }, [t('th_vol') + (hasArea ? '' : ' / ha')]), el('th', { class: 'num' }, [t('th_kwh') + ha]), el('th', { class: 'num' }, [t('th_kwp') + ha])])]),
        el('tbody', null, r.months.map(function (x) {
          return el('tr', null, [el('td', null, [months[x.m]]), el('td', { class: 'num' }, [fmt(hasArea ? x.vol : x.volHa)]), el('td', { class: 'num' }, [x.kwh === null ? '—' : fmt(x.kwh)]), el('td', { class: 'num' }, [x.kwp === null ? '—' : fmt(x.kwp, 1)])]);
        }))
      ])])
    ]));

    // method
    out.appendChild(el('details', { class: 'gp-card gp-more', style: 'margin-top:16px' }, [
      el('summary', null, [t('method_t')]),
      el('div', { class: 'formula' }, ['ETc = Kc × ET0']),
      el('div', { class: 'formula', style: 'margin-top:6px' }, [useGaia ? 'Pe = P × part efficace(mois, site) — GAIA model, ml/ section 11'
        : 'Pe = P(125 − 0.2P)/125 if P ≤ 250 mm ; Pe = 125 + 0.1P otherwise']),
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

    // 4. how to read it, folded: one click for those who want the details
    card.appendChild(el('details', { class: 'gp-more', style: 'margin-top:12px' }, [el('summary', null, [t('how_t')]),
      el('ul', { style: 'margin:6px 0 0;padding-inline-start:18px;display:grid;gap:4px' },
        ['how_res', 'how_range', 'how_dec', 'how_need', 'how_irr'].map(function (k) { return el('li', { class: 'small' }, [t(k)]); }))]));

    // 5. sources
    var ref = d.reference_site;
    card.appendChild(el('details', { class: 'gp-more', style: 'margin-top:8px' }, [
      el('summary', null, [t('method_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('fc_ref') + ' ' + ref.nom + ' (' + fmt(ref.distance_km) + ' km).']),
      el('p', { class: 'assump', style: 'margin-top:6px' }, [t('fc_src') + ' ' + d.model.source + ' · ' + d.model.period.join(' → ') + ' · ' + d.model.trained_on])
    ]));
    return card;
  }

  /* ---------------------------------------------------- learned effective rainfall (trained model, ml/ section 11) */
  G.addStrings({
    fr: {
      pe_t: "Pluie efficace : ce que le sol garde vraiment",
      pe_badge: "Modèle entraîné",
      pe_lead: "La formule USDA-SCS (années 1970) compte presque toute la pluie comme utile, quel que soit le sol. Le modèle GAIA a appris, sur 6 ans de données et 26 sites tunisiens, quelle part de chaque pluie reste vraiment dans le sol selon le sol, la saison et l'humidité de départ.",
      pe_use: "Pluie efficace utilisée dans le calcul :",
      pe_opt_gaia: "Modèle GAIA (appris)",
      pe_opt_usda: "Formule USDA-SCS",
      pe_by_gaia: "modèle GAIA",
      pe_b_gaia: "Modèle GAIA",
      pe_b_usda: "Formule USDA-SCS",
      pe_b_diff: "Irrigation en plus à prévoir",
      pe_share: "{v} de la pluie comptée comme efficace",
      pe_diff_u: "par ha et par an, par rapport à la formule",
      pe_diff_none: "aucun écart sur les mois irrigués",
      pe_c_t: "Pluie efficace par mois (mm)",
      pe_s_rain: "Pluie",
      pe_s_usda: "USDA-SCS",
      pe_s_gaia: "Modèle GAIA",
      pe_how_t: "Comment le modèle a appris",
      pe_how_1: "Pour chaque pluie de 2020 à hier, on a mesuré l'eau gagnée par le sol (0 à 100 cm) entre la veille et le lendemain, plus le séchage qui aurait eu lieu de toute façon. Le reste est parti en ruissellement ou en profondeur.",
      pe_how_2: "Le modèle (LightGBM) prédit cette quantité à partir de la pluie, de l'humidité de départ, de la chaleur, de la saison et de la signature du sol du site (sec / humide à chaque profondeur), qui sert d'indice du type de sol.",
      pe_how_3: "Testé sur 2025–2026 et sur des lieux jamais vus : erreur moyenne de {g} mm par mois (années jamais vues / lieux jamais vus), contre {u} mm pour la formule USDA-SCS. Le sol garde en réalité {m} de la pluie ; la formule en compte {f}.",
      pe_how_4: "Données : analyses ECMWF IFS (Open-Meteo), un modèle et non une mesure de terrain. Une parcelle irriguée, paillée ou en terrasse peut garder plus d'eau.",
      pe_ref: "Site de référence : {n} ({d} km). Part efficace appliquée à la pluie mensuelle de votre profil.",
      pe_off: "Coefficients du modèle indisponibles : calcul avec la formule USDA-SCS."
    },
    ar: {
      pe_t: "المطر الفعّال: ما تحتفظ به التربة فعلاً",
      pe_badge: "نموذج مُدرَّب",
      pe_lead: "تعتبر صيغة USDA-SCS (السبعينيات) أن كل المطر تقريبًا مفيد، مهما كانت التربة. تعلّم نموذج GAIA من 6 سنوات من البيانات و26 موقعًا تونسيًا كم يبقى فعلاً في التربة من كل مطرة، حسب التربة والموسم والرطوبة الأولية.",
      pe_use: "المطر الفعّال المستعمل في الحساب:",
      pe_opt_gaia: "نموذج GAIA (مُتعلَّم)",
      pe_opt_usda: "صيغة USDA-SCS",
      pe_by_gaia: "نموذج GAIA",
      pe_b_gaia: "نموذج GAIA",
      pe_b_usda: "صيغة USDA-SCS",
      pe_b_diff: "ري إضافي يجب توقعه",
      pe_share: "{v} من المطر يُحسب فعّالاً",
      pe_diff_u: "للهكتار في السنة مقارنة بالصيغة",
      pe_diff_none: "لا فرق في الأشهر المسقية",
      pe_c_t: "المطر الفعّال حسب الشهر (مم)",
      pe_s_rain: "المطر",
      pe_s_usda: "USDA-SCS",
      pe_s_gaia: "نموذج GAIA",
      pe_how_t: "كيف تعلّم النموذج",
      pe_how_1: "لكل مطرة من 2020 إلى الأمس، قسنا الماء الذي ربحته التربة (0 إلى 100 سم) بين اليوم السابق واليوم التالي، مع الجفاف الذي كان سيحدث على أي حال. الباقي ذهب سيلانًا أو إلى العمق.",
      pe_how_2: "يتوقع النموذج (LightGBM) هذه الكمية انطلاقًا من المطر والرطوبة الأولية والحرارة والموسم وبصمة تربة الموقع (جاف / رطب في كل عمق)، التي تُستعمل مؤشرًا لنوع التربة.",
      pe_how_3: "اختُبر على 2025–2026 وعلى مواقع لم يرها: خطأ متوسط {g} مم في الشهر (سنوات لم يرها / مواقع لم يرها) مقابل {u} مم لصيغة USDA-SCS. تحتفظ التربة فعلاً بـ{m} من المطر، والصيغة تحسب {f}.",
      pe_how_4: "البيانات: تحاليل ECMWF IFS (Open-Meteo)، نموذج وليست قياسًا ميدانيًا. قد تحتفظ قطعة مسقية أو مغطاة أو مدرّجة بماء أكثر.",
      pe_ref: "الموقع المرجعي: {n} ({d} كم). تُطبَّق النسبة الفعّالة على المطر الشهري في ملفك.",
      pe_off: "معاملات النموذج غير متاحة: الحساب بصيغة USDA-SCS."
    },
    en: {
      pe_t: "Effective rainfall: what the soil really keeps",
      pe_badge: "Trained model",
      pe_lead: "The USDA-SCS formula (1970s) counts almost all rain as useful, whatever the soil. The GAIA model learned, from 6 years of data at 26 Tunisian sites, how much of each rain really stays in the soil depending on the soil, the season and the starting moisture.",
      pe_use: "Effective rainfall used in the calculation:",
      pe_opt_gaia: "GAIA model (learned)",
      pe_opt_usda: "USDA-SCS formula",
      pe_by_gaia: "GAIA model",
      pe_b_gaia: "GAIA model",
      pe_b_usda: "USDA-SCS formula",
      pe_b_diff: "Extra irrigation to plan",
      pe_share: "{v} of the rain counted as effective",
      pe_diff_u: "per ha per year, compared with the formula",
      pe_diff_none: "no difference over the irrigated months",
      pe_c_t: "Effective rainfall per month (mm)",
      pe_s_rain: "Rain",
      pe_s_usda: "USDA-SCS",
      pe_s_gaia: "GAIA model",
      pe_how_t: "How the model learned",
      pe_how_1: "For every rain from 2020 to yesterday, we measured the water gained by the soil (0 to 100 cm) between the day before and the day after, plus the drying that would have happened anyway. The rest ran off or drained deeper.",
      pe_how_2: "The model (LightGBM) predicts that amount from the rain, the starting moisture, the heat, the season and the site's soil signature (dry / wet levels at each depth), used as a proxy for the soil type.",
      pe_how_3: "Tested on 2025–2026 and on places it never saw: average error of {g} mm per month (unseen years / unseen places), against {u} mm for the USDA-SCS formula. The soil actually keeps {m} of the rain; the formula counts {f}.",
      pe_how_4: "Data: ECMWF IFS analyses (Open-Meteo), a model and not a field measurement. An irrigated, mulched or terraced plot can keep more water.",
      pe_ref: "Reference site: {n} ({d} km). Effective share applied to your profile's monthly rain.",
      pe_off: "Model coefficients unavailable: calculation uses the USDA-SCS formula."
    },
    ja: {
      pe_t: "有効雨量：土壌が実際に保つ水",
      pe_badge: "学習済みモデル",
      pe_lead: "USDA-SCS式（1970年代）は、土壌に関係なく雨のほとんどを有効とみなします。GAIAモデルは、チュニジアの26地点・6年分のデータから、土壌・季節・降雨前の水分に応じて、雨のうち実際に土壌に残る割合を学習しました。",
      pe_use: "計算に使う有効雨量：",
      pe_opt_gaia: "GAIAモデル（学習）",
      pe_opt_usda: "USDA-SCS式",
      pe_by_gaia: "GAIAモデル",
      pe_b_gaia: "GAIAモデル",
      pe_b_usda: "USDA-SCS式",
      pe_b_diff: "追加で必要な灌漑",
      pe_share: "雨の{v}を有効とみなす",
      pe_diff_u: "式と比べて、1 haあたり・年あたり",
      pe_diff_none: "灌漑する月では差なし",
      pe_c_t: "月別の有効雨量（mm）",
      pe_s_rain: "降水量",
      pe_s_usda: "USDA-SCS",
      pe_s_gaia: "GAIAモデル",
      pe_how_t: "モデルの学習方法",
      pe_how_1: "2020年から昨日までの各降雨について、前日から翌日までに土壌（0〜100 cm）が得た水を測り、どのみち起きていた乾燥分を加えました。残りは流出したか深く浸透しました。",
      pe_how_2: "モデル（LightGBM）は、降水量、降雨前の水分、気温、季節、地点の土壌の特徴（各深さの乾燥・湿潤の水準）からこの量を予測します。土壌の特徴は土壌タイプの代わりに使います。",
      pe_how_3: "2025〜2026年と未学習の地点で検証：月平均誤差は{g} mm（未学習の年／未学習の地点）、USDA-SCS式は{u} mm。土壌が実際に保つのは雨の{m}で、式は{f}とみなします。",
      pe_how_4: "データ：ECMWF IFSの解析値（Open-Meteo）で、現地での実測ではありません。灌漑・マルチング・段々畑の区画はより多くの水を保つことがあります。",
      pe_ref: "基準地点：{n}（{d} km）。有効割合をプロファイルの月別降水量に適用。",
      pe_off: "モデルの係数が利用できないため、USDA-SCS式で計算しています。"
    }
  });

  var PE = { status: 'off', site: null, meta: null, km: null };
  function kmBetween(a, b, c, d) {
    var R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2);
    return 2 * R * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y));
  }
  if (G.CONFIG.effectiveRainTable && fLat != null && fLon != null) {
    PE.status = 'loading';
    fetch(G.CONFIG.effectiveRainTable)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var best = null;
        Object.keys(j.sites).forEach(function (id) {
          var s = j.sites[id], km = kmBetween(fLat, fLon, s.lat, s.lon);
          if (!best || km < best.km) best = { site: s, km: km };
        });
        PE = best ? { status: 'ok', site: best.site, meta: j, km: best.km } : { status: 'off', site: null, meta: null, km: null };
        draw();
      })
      .catch(function () { PE = { status: 'off', site: null, meta: null, km: null }; draw(); });
  }

  function peCard(rU, rG, months) {
    var head = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('pe_t')]), G.pill('live', t('pe_badge'))]);
    var card = el('div', { class: 'gp-card', style: 'margin-top:16px' }, [head,
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('pe_lead')])]);
    if (PE.status === 'loading') { card.appendChild(el('p', { class: 'muted small', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' })])); return card; }
    if (!rG) { card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('info', t('pe_off'))])); return card; }

    // 2. the three numbers
    var rain = 0, peU = 0, peG = 0;
    rU.months.forEach(function (x, i) { rain += x.rain || 0; peU += x.pe || 0; peG += rG.months[i].pe || 0; });
    var share = function (v) { return rain > 0 ? fmt(100 * v / rain) + ' %' : '—'; };
    var dVol = rG.totals.volHa - rU.totals.volHa;   // m³/ha/year, irrigated months only
    card.appendChild(el('div', { class: 'flow', style: 'margin-top:12px' }, [
      el('div', { class: 'fbox water' }, [el('b', null, [t('pe_s_rain')]), el('div', { class: 'v' }, [fmt(rain) + ' mm']), el('span', { class: 'u' }, [t('per_year')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('pe_kept')]), el('div', { class: 'v' }, [fmt(peG) + ' mm']), el('span', { class: 'u' }, [fill('pe_share', { v: share(peG) })])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('pe_b_usda')]), el('div', { class: 'v' }, [fmt(peU) + ' mm']), el('span', { class: 'u' }, [fill('pe_share', { v: share(peU) })])]),
      el('div', { class: 'fbox quota' }, [el('b', null, [t('pe_b_diff')]), el('div', { class: 'v' }, [(dVol > 0.5 ? '+' : '') + fmt(dVol) + ' m³']),
        el('span', { class: 'u' }, [Math.abs(dVol) < 0.5 ? t('pe_diff_none') : fill('pe_diff_u', { v: (dVol > 0 ? '+' : '') + fmt(dVol) })])])
    ]));

    // 3. month by month
    var chart = el('div', { style: 'margin-top:12px' });
    card.appendChild(chart);
    setTimeout(function () {
      G.barChart(chart, { labels: months, unit: 'mm', title: t('pe_c_t'), series: [
        { name: t('pe_s_rain'), color: '#C9D6DF', values: rU.months.map(function (x) { return x.rain; }) },
        { name: t('pe_s_usda'), color: '#9CB7C9', values: rU.months.map(function (x) { return x.pe; }) },
        { name: t('pe_s_gaia'), color: '#2F5A75', values: rG.months.map(function (x) { return x.pe; }) }
      ] });
    }, 0);

    // 4. how it learned, with the test numbers
    var res = PE.meta.resultats, a = res['années jamais vues'], b = res['lieux jamais vus'];
    var pc = function (v) { return fmt(v * 100) + ' %'; };
    card.appendChild(el('details', { class: 'gp-more', style: 'margin-top:10px' }, [
      el('summary', null, [t('pe_how_t')]),
      el('ul', { style: 'margin:6px 0 0;padding-inline-start:18px;display:grid;gap:4px', class: 'small' }, [
        el('li', null, [t('pe_how_1')]), el('li', null, [t('pe_how_2')]),
        el('li', null, [fill('pe_how_3', { g: fmt(a.mae_mois_gaia, 1) + ' / ' + fmt(b.mae_mois_gaia, 1), u: fmt(a.mae_mois_usda, 1) + ' / ' + fmt(b.mae_mois_usda, 1),
          m: pc(a.part_mesuree) + ' / ' + pc(b.part_mesuree), f: pc(a.part_usda) + ' / ' + pc(b.part_usda) })]),
        el('li', null, [t('pe_how_4')])
      ]),
      el('p', { class: 'assump', style: 'margin-top:6px' }, [fill('pe_ref', { n: PE.site.nom, d: fmt(PE.km) }) + ' · ' + PE.meta.source + ' · ' + (PE.meta.modele_final ? PE.meta.modele_final.entraine_sur : PE.meta.periode)])
    ]));
    return card;
  }

  /* ---------------------------------------------------- optimal planner (MPC) + solar pumping + agent */
  G.addStrings({
    fr: {
      pl_t: "Planificateur optimal : combien pomper, quel jour, à quelle heure",
      pl_badge: "Optimisation",
      pl_lead: "Chaque jour, GAIA simule le sol de votre parcelle sur 8 jours et cherche le plan d'irrigation qui évite tout stress à la culture avec le moins d'eau, ou avec le moins d'énergie non solaire. Il repart chaque matin du nouvel état du sol (contrôle prédictif).",
      pl_lim_off: "Mois non irrigué (réglage « Mois de culture irrigués ») : aucune irrigation prévue en {m}.",
      pl_lim_quota: "Volume autorisé (Garde-nappe) respecté : au plus {q} m³ sur ces 8 jours.",
      pl_lim_quota_hit: "Volume autorisé (Garde-nappe) atteint : le plan s'arrête à {q} m³ sur ces 8 jours, même si la culture manque d'eau.",
      pl_mode: "Que voulez-vous économiser ?",
      pl_m_water: "💧 L'eau",
      pl_m_water_d: "GAIA donne le minimum d'eau possible, au jour le plus tardif sans stress. Idéal si l'eau ou le quota sont limités.",
      pl_m_solar: "☀️ L'électricité (pomper au soleil)",
      pl_m_solar_d: "GAIA fait pomper aux heures de plein soleil (panneaux solaires, énergie gratuite) et arrose un peu en avance les jours ensoleillés : le sol garde l'eau pour les jours nuageux. Idéal si vous avez des panneaux solaires.",
      pl_irr: "Irrigué depuis hier (mm nets, si vous avez arrosé)",
      pl_off: "Le service de planification n'est pas lancé. Dans le dossier du projet : python -m uvicorn gaia.main:app --app-dir backend --port 8000",
      pl_err: "Plan indisponible :",
      pl_loading: "Optimisation du plan…",
      pl_v_none: "Pas besoin d'arroser ces 8 jours, mais la culture boit quand même : elle va consommer environ {use} mm d'eau.{src} l'eau déjà stockée dans le sol autour des racines ({taw} mm utiles sur {zr} m de profondeur). Cette réserve passe de {a} à {b}, toujours au-dessus du seuil où la plante souffre ({s}). Dès qu'elle s'en approche, GAIA programme une irrigation.",
      pl_v_none_rain: " La pluie en apporte {r} mm, le reste vient de",
      pl_v_none_soil: " Elle la puise dans",
      pl_v_irr: "Irriguer {mm} mm nets au total ({m3} m³), d'abord le {d}.",
      pl_b_water: "Eau à pomper sur 8 jours",
      pl_b_quota: "Méthode du quota (remplacer chaque jour)",
      pl_b_saved: "économie : {v} m³",
      pl_b_soil: "dont {v} mm puisés dans la réserve du sol",
      pl_b_solar: "Énergie solaire",
      pl_b_solar_u: "{s} kWh solaires · {o} kWh autre",
      pl_b_stress: "Jours de stress évités",
      pl_b_stress_u: "{w} sans irrigation → {p} avec le plan",
      pl_th_day: "Jour",
      pl_th_rain: "Pluie (efficace)",
      pl_th_etc: "Conso. culture",
      pl_th_irr: "Irrigation",
      pl_th_hours: "Heures de pompage",
      pl_th_res: "Réserve avec plan",
      pl_th_without: "sans irrigation",
      pl_sun: "Soleil",
      pl_c_t: "Réserve du sol (%) : avec le plan / sans irrigation",
      pl_s_with: "Avec le plan",
      pl_s_without: "Sans irrigation",
      pl_need_pump: "Indiquez le débit de la pompe, la hauteur de pompage et la puissance solaire (bloc « Garde-nappe ») pour obtenir les heures de pompage et l'énergie solaire.",
      pl_how_t: "Comment le plan est calculé",
      pl_how_1: "État du sol aujourd'hui : modèle entraîné (LightGBM). Pluie qui reste dans le sol : modèle de pluie efficace. Météo et soleil : prévision ECMWF IFS.",
      pl_how_2: "Simulation : bilan hydrique FAO-56 de la zone des racines avec le Kc de la culture. Stress quand la réserve passe sous {th} (fraction p de la FAO-56, à vérifier) ; le plan vise {tg} pour garder une marge égale à l'erreur habituelle du modèle.",
      pl_how_3: "Optimisation : le plan ajoute l'eau au dernier moment utile (jamais juste avant une pluie). Si vous économisez l'électricité, il avance l'irrigation de 1 à 3 jours vers les journées ensoleillées : le sol stocke l'eau pompée gratuitement, comme une batterie, et les heures de pompage suivent le soleil.",
      pl_how_4: "La comparaison « méthode du quota » remplace chaque jour la consommation de la culture. Une partie de l'économie vient de la réserve du sol utilisée : elle sera à recompléter plus tard.",
      ag_t: "Agent GAIA : posez votre question",
      ag_badge: "Agent IA + outils",
      ag_lead: "Un modèle d'IA (gratuit : Google Gemini ou Groq) lit votre question, choisit lui-même les outils GAIA à appeler (prévision du sol, plan optimal, simulation « et si », prévision solaire) et répond seulement à partir de leurs résultats, dans votre langue.", ag_by_free: "Répondu par {p} ({m}), modèle d'IA gratuit, avec les outils GAIA", ag_fallback: "Le modèle d'IA gratuit n'a pas répondu ({r}) : réponse de l'agent GAIA intégré (règles + outils).", ag_by_local: "Répondu par l'agent GAIA intégré (règles + outils) : ajoutez une clé gratuite Gemini ou Groq dans backend/.env pour l'agent IA.", ag_by_claude: "Répondu par Claude ({m})", ag_new: "Nouvelle conversation", ag_you: "Vous", ag_gaia: "Agent GAIA", ag_quota: "Le quota gratuit du modèle est atteint pour le moment : réessayez dans une minute.", ag_badkey: "La clé du modèle gratuit est refusée : vérifiez GAIA_LLM_API_KEY dans backend/.env.",
      ag_ph: "Ex. : Puis-je ne pas arroser jusqu'à vendredi ?",
      ag_send: "Demander",
      ag_loading: "L'agent travaille…",
      ag_q1: "Quand faire tourner la pompe cette semaine ?",
      ag_q2: "Et si j'arrose 10 mm demain ?",
      ag_q3: "Puis-je ne pas arroser jusqu'à vendredi ?",
      ag_steps: "Ce que l'agent a fait",
      ag_off: "L'agent a besoin du service GAIA (backend) lancé.",
      ag_nokey: "L'agent IA a besoin de la clé gratuite Gemini : créez-la sur aistudio.google.com/apikey, collez-la dans backend/.env (GAIA_LLM_API_KEY=…), puis relancez le backend.",
      ag_err: "L'agent n'a pas pu répondre :",
      ag_tool_get_soil_forecast: "Prévision du sol",
      ag_tool_optimize_irrigation_plan: "Plan optimal",
      ag_tool_simulate_irrigation_schedule: "Simulation « et si »",
      ag_tool_get_solar_forecast: "Prévision solaire"
    },
    ar: {
      pl_t: "المخطِّط الأمثل: كم نضخ، في أي يوم، وفي أي ساعة",
      pl_badge: "تحسين",
      pl_lead: "كل يوم، يحاكي GAIA تربة قطعتك على 8 أيام ويبحث عن خطة الري التي تجنّب الزراعة أي إجهاد بأقل كمية ماء، أو بأقل طاقة غير شمسية. ويعيد الحساب كل صباح انطلاقًا من حالة التربة الجديدة (تحكّم تنبّئي).",
      pl_lim_off: "شهر غير مسقي (إعداد «أشهر الزراعة المسقية»): لا ري مبرمج في {m}.",
      pl_lim_quota: "الحجم المسموح به (حارس المائدة) محترم: {q} م³ على الأكثر خلال هذه الأيام الثمانية.",
      pl_lim_quota_hit: "بلغ الحجم المسموح به (حارس المائدة): تتوقف الخطة عند {q} م³ خلال هذه الأيام الثمانية، حتى لو نقص الماء للزراعة.",
      pl_mode: "ماذا تريد أن توفّر؟",
      pl_m_water: "💧 الماء",
      pl_m_water_d: "يعطي GAIA أقل كمية ماء ممكنة، في آخر يوم ممكن دون إجهاد. مناسب إذا كان الماء أو الحصة محدودة.",
      pl_m_solar: "☀️ الكهرباء (الضخ تحت الشمس)",
      pl_m_solar_d: "يضخّ GAIA في ساعات الشمس القوية (ألواح شمسية، طاقة مجانية) ويسقي قليلًا مسبقًا في الأيام المشمسة: تحتفظ التربة بالماء للأيام الغائمة. مناسب إذا كانت لديك ألواح شمسية.",
      pl_irr: "ما سُقي منذ الأمس (مم صافية، إن سقيت)",
      pl_off: "خدمة التخطيط غير مشغّلة. من مجلد المشروع: python -m uvicorn gaia.main:app --app-dir backend --port 8000",
      pl_err: "الخطة غير متاحة:",
      pl_loading: "تحسين الخطة…",
      pl_v_none: "لا حاجة للسقي خلال 8 أيام، لكن النبتة تشرب رغم ذلك: ستستهلك حوالي {use} مم من الماء.{src} الماء المخزّن في التربة حول الجذور ({taw} مم مفيدة على عمق {zr} م). ينخفض هذا المخزون من {a} إلى {b}، ويبقى فوق العتبة التي تبدأ عندها النبتة بالمعاناة ({s}). عندما يقترب منها، يبرمج GAIA سقيًا.",
      pl_v_none_rain: " يأتي المطر بـ{r} مم، والباقي من",
      pl_v_none_soil: " تأخذه من",
      pl_v_irr: "اسقِ {mm} مم صافية في المجموع ({m3} م³)، أولًا يوم {d}.",
      pl_b_water: "الماء المضخوخ في 8 أيام",
      pl_b_quota: "طريقة الحصة (تعويض كل يوم)",
      pl_b_saved: "توفير: {v} م³",
      pl_b_soil: "منها {v} مم من مخزون التربة",
      pl_b_solar: "الطاقة الشمسية",
      pl_b_solar_u: "{s} ك.و.س شمسية · {o} ك.و.س أخرى",
      pl_b_stress: "أيام إجهاد تم تجنّبها",
      pl_b_stress_u: "{w} دون ري ← {p} مع الخطة",
      pl_th_day: "اليوم",
      pl_th_rain: "المطر (الفعّال)",
      pl_th_etc: "استهلاك الزراعة",
      pl_th_irr: "الري",
      pl_th_hours: "ساعات الضخ",
      pl_th_res: "المخزون مع الخطة",
      pl_th_without: "دون ري",
      pl_sun: "الشمس",
      pl_c_t: "مخزون التربة (%): مع الخطة / دون ري",
      pl_s_with: "مع الخطة",
      pl_s_without: "دون ري",
      pl_need_pump: "أدخل تدفق المضخة وارتفاع الضخ والقدرة الشمسية (قسم «حارس المائدة») للحصول على ساعات الضخ والطاقة الشمسية.",
      pl_how_t: "كيف تُحسب الخطة",
      pl_how_1: "حالة التربة اليوم: نموذج مُدرَّب (LightGBM). المطر الذي يبقى في التربة: نموذج المطر الفعّال. الطقس والشمس: توقعات ECMWF IFS.",
      pl_how_2: "المحاكاة: الموازنة المائية FAO-56 لمنطقة الجذور مع معامل Kc للزراعة. إجهاد عندما ينزل المخزون تحت {th} (الكسر p من FAO-56، يجب التحقق)؛ تستهدف الخطة {tg} للاحتفاظ بهامش يساوي الخطأ المعتاد للنموذج.",
      pl_how_3: "التحسين: تضيف الخطة الماء في آخر لحظة مفيدة (أبدًا قبل مطر مباشرة). عند توفير الكهرباء، تقدّم الري من 1 إلى 3 أيام نحو الأيام المشمسة: تخزّن التربة الماء المضخوخ مجانًا كبطارية، وتتبع ساعات الضخ الشمس.",
      pl_how_4: "المقارنة مع «طريقة الحصة» تعوّض كل يوم استهلاك الزراعة. جزء من التوفير يأتي من مخزون التربة المستعمل: سيجب تعويضه لاحقًا.",
      ag_t: "وكيل GAIA: اطرح سؤالك",
      ag_badge: "وكيل ذكاء اصطناعي + أدوات",
      ag_lead: "نموذج ذكاء اصطناعي (مجاني: Google Gemini أو Groq) يقرأ سؤالك، ويختار بنفسه أدوات GAIA (توقع التربة، الخطة المثلى، محاكاة «ماذا لو»، توقع الشمس) ويجيب فقط انطلاقًا من نتائجها، بلغتك.", ag_by_free: "أجاب {p} ({m})، نموذج ذكاء اصطناعي مجاني، بأدوات GAIA", ag_fallback: "لم يُجب النموذج المجاني ({r}): الإجابة من وكيل GAIA المدمج (قواعد + أدوات).", ag_by_local: "أجاب وكيل GAIA المدمج (قواعد + أدوات): أضف مفتاحًا مجانيًا لـ Gemini أو Groq في backend/.env لتشغيل الوكيل الذكي.", ag_by_claude: "أجاب Claude ({m})", ag_new: "محادثة جديدة", ag_you: "أنت", ag_gaia: "وكيل GAIA", ag_quota: "تم بلوغ الحصة المجانية للنموذج حاليًا: أعد المحاولة بعد دقيقة.", ag_badkey: "مفتاح النموذج المجاني مرفوض: تحقق من GAIA_LLM_API_KEY في backend/.env.",
      ag_ph: "مثال: هل يمكنني عدم السقي حتى الجمعة؟",
      ag_send: "اسأل",
      ag_loading: "الوكيل يعمل…",
      ag_q1: "متى أشغّل المضخة هذا الأسبوع؟",
      ag_q2: "ماذا لو سقيت 10 مم غدًا؟",
      ag_q3: "هل يمكنني عدم السقي حتى الجمعة؟",
      ag_steps: "ما قام به الوكيل",
      ag_off: "يحتاج الوكيل إلى تشغيل خدمة GAIA (الخادم).",
      ag_nokey: "يحتاج الوكيل الذكي إلى مفتاح Gemini المجاني: أنشئه على aistudio.google.com/apikey، والصقه في backend/.env (GAIA_LLM_API_KEY=…)، ثم أعد تشغيل الخادم.",
      ag_err: "لم يتمكن الوكيل من الإجابة:",
      ag_tool_get_soil_forecast: "توقع التربة",
      ag_tool_optimize_irrigation_plan: "الخطة المثلى",
      ag_tool_simulate_irrigation_schedule: "محاكاة «ماذا لو»",
      ag_tool_get_solar_forecast: "توقع الشمس"
    },
    en: {
      pl_t: "Optimal planner: how much to pump, which day, at what time",
      pl_badge: "Optimisation",
      pl_lead: "Every day, GAIA simulates your plot's soil over 8 days and searches for the irrigation plan that keeps the crop out of stress with the least water, or with the least non-solar energy. It starts again each morning from the new soil state (model predictive control).",
      pl_lim_off: "Month not irrigated (setting \"Irrigated crop months\"): no irrigation planned in {m}.",
      pl_lim_quota: "Authorised volume (Groundwater guard) respected: at most {q} m³ over these 8 days.",
      pl_lim_quota_hit: "Authorised volume (Groundwater guard) reached: the plan stops at {q} m³ over these 8 days, even if the crop lacks water.",
      pl_mode: "What do you want to save?",
      pl_m_water: "💧 Water",
      pl_m_water_d: "GAIA gives the least water possible, on the latest day without stress. Best when water or the quota is limited.",
      pl_m_solar: "☀️ Electricity (pump in the sun)",
      pl_m_solar_d: "GAIA pumps during full-sun hours (solar panels, free energy) and waters a little ahead on sunny days: the soil stores the water for cloudy days. Best if you have solar panels.",
      pl_irr: "Irrigated since yesterday (net mm, if you watered)",
      pl_off: "The planning service is not running. From the project folder, run: python -m uvicorn gaia.main:app --app-dir backend --port 8000",
      pl_err: "Plan unavailable:",
      pl_loading: "Optimising the plan…",
      pl_v_none: "No need to irrigate over these 8 days, but the crop still drinks: it will use about {use} mm of water.{src} the water already stored in the soil around the roots ({taw} mm usable over {zr} m depth). This reserve goes from {a} to {b}, still above the level where the plant starts to suffer ({s}). As soon as it gets close, GAIA schedules an irrigation.",
      pl_v_none_rain: " Rain brings {r} mm, the rest comes from",
      pl_v_none_soil: " It takes it from",
      pl_v_irr: "Irrigate {mm} net mm in total ({m3} m³), first on {d}.",
      pl_b_water: "Water to pump over 8 days",
      pl_b_quota: "Quota method (replace every day)",
      pl_b_saved: "saving: {v} m³",
      pl_b_soil: "of which {v} mm taken from the soil reserve",
      pl_b_solar: "Solar energy",
      pl_b_solar_u: "{s} solar kWh · {o} other kWh",
      pl_b_stress: "Stress days avoided",
      pl_b_stress_u: "{w} without irrigation → {p} with the plan",
      pl_th_day: "Day",
      pl_th_rain: "Rain (effective)",
      pl_th_etc: "Crop use",
      pl_th_irr: "Irrigation",
      pl_th_hours: "Pumping hours",
      pl_th_res: "Reserve with plan",
      pl_th_without: "without irrigation",
      pl_sun: "Sun",
      pl_c_t: "Soil reserve (%): with the plan / without irrigation",
      pl_s_with: "With the plan",
      pl_s_without: "Without irrigation",
      pl_need_pump: "Enter the pump flow, pumping head and solar power (\"Groundwater guard\" block) to get the pumping hours and solar energy.",
      pl_how_t: "How the plan is computed",
      pl_how_1: "Today's soil state: trained model (LightGBM). Rain that stays in the soil: effective-rain model. Weather and sun: ECMWF IFS forecast.",
      pl_how_2: "Simulation: FAO-56 root-zone water balance with the crop's Kc. Stress when the reserve drops below {th} (FAO-56 fraction p, to check); the plan aims at {tg} to keep a margin equal to the model's usual error.",
      pl_how_3: "Optimisation: the plan adds water at the last useful moment (never just before rain). When saving electricity, it brings irrigation forward by 1 to 3 days to sunny days: the soil stores the freely pumped water like a battery, and pumping hours follow the sun.",
      pl_how_4: "The \"quota method\" comparison replaces the crop's use every day. Part of the saving comes from the soil reserve used: it will need refilling later.",
      ag_t: "GAIA agent: ask your question",
      ag_badge: "AI agent + tools",
      ag_lead: "An AI model (free: Google Gemini or Groq) reads your question, chooses which GAIA tools to call (soil forecast, optimal plan, what-if simulation, solar forecast) and answers only from their results, in your language.", ag_by_free: "Answered by {p} ({m}), free AI model, with the GAIA tools", ag_fallback: "The free AI model did not answer ({r}): answer from the built-in GAIA agent (rules + tools).", ag_by_local: "Answered by the built-in GAIA agent (rules + tools): add a free Gemini or Groq key in backend/.env for the AI agent.", ag_by_claude: "Answered by Claude ({m})", ag_new: "New conversation", ag_you: "You", ag_gaia: "GAIA agent", ag_quota: "The model's free quota is reached for the moment: try again in a minute.", ag_badkey: "The free model refused the key: check GAIA_LLM_API_KEY in backend/.env.",
      ag_ph: "E.g.: Can I skip watering until Friday?",
      ag_send: "Ask",
      ag_loading: "The agent is working…",
      ag_q1: "When should I run the pump this week?",
      ag_q2: "What if I water 10 mm tomorrow?",
      ag_q3: "Can I skip watering until Friday?",
      ag_steps: "What the agent did",
      ag_off: "The agent needs the GAIA service (backend) running.",
      ag_nokey: "The AI agent needs the free Gemini key: create it at aistudio.google.com/apikey, paste it in backend/.env (GAIA_LLM_API_KEY=…), then restart the backend.",
      ag_err: "The agent could not answer:",
      ag_tool_get_soil_forecast: "Soil forecast",
      ag_tool_optimize_irrigation_plan: "Optimal plan",
      ag_tool_simulate_irrigation_schedule: "What-if simulation",
      ag_tool_get_solar_forecast: "Solar forecast"
    },
    ja: {
      pl_t: "最適プランナー：いつ、どれだけ、何時に揚水するか",
      pl_badge: "最適化",
      pl_lead: "GAIAは毎日、区画の土壌を8日間シミュレーションし、作物にストレスを与えない灌漑計画を、最少の水、または最少の非太陽エネルギーで探します。毎朝、新しい土壌の状態から計算し直します（モデル予測制御）。",
      pl_lim_off: "灌漑しない月（「灌漑する月」の設定）：{m}は灌漑を計画しません。",
      pl_lim_quota: "許可水量（地下水ガード）を順守：この8日間で最大{q} m³。",
      pl_lim_quota_hit: "許可水量（地下水ガード）に達しました：作物が水不足でも、この8日間は{q} m³で止まります。",
      pl_mode: "何を節約しますか？",
      pl_m_water: "💧 水",
      pl_m_water_d: "ストレスのない最も遅い日に、できるだけ少ない水を与えます。水や割当量が限られている場合に最適。",
      pl_m_solar: "☀️ 電気（日中にポンプ）",
      pl_m_solar_d: "日差しの強い時間（太陽光パネル、無料の電力）に汲み上げ、晴れた日に少し前倒しで灌漑します。土壌が曇りの日のために水を蓄えます。太陽光パネルがある場合に最適。",
      pl_irr: "昨日以降に灌漑した量（正味mm、水をまいた場合）",
      pl_off: "計画サービスが起動していません。プロジェクトのフォルダで次を実行：python -m uvicorn gaia.main:app --app-dir backend --port 8000",
      pl_err: "計画を作成できません：",
      pl_loading: "計画を最適化中…",
      pl_v_none: "この8日間は灌漑不要ですが、作物は水を吸い続けます：約{use} mmの水を使います。{src}根の周りの土壌に蓄えられた水（深さ{zr} mで有効水分{taw} mm）から来ます。この蓄えは{a}から{b}へ減りますが、植物が苦しみ始める水準（{s}）を上回ったままです。近づいたらGAIAが灌漑を計画します。",
      pl_v_none_rain: "雨が{r} mmを供給し、残りは",
      pl_v_none_soil: "その水は",
      pl_v_irr: "合計で正味{mm} mm（{m3} m³）を灌漑、最初は{d}。",
      pl_b_water: "8日間に揚水する水",
      pl_b_quota: "割当量の方法（毎日補う）",
      pl_b_saved: "節約：{v} m³",
      pl_b_soil: "うち{v} mmは土壌の蓄えから",
      pl_b_solar: "太陽エネルギー",
      pl_b_solar_u: "太陽{s} kWh・その他{o} kWh",
      pl_b_stress: "回避したストレス日数",
      pl_b_stress_u: "灌漑なし{w}日 → 計画あり{p}日",
      pl_th_day: "日",
      pl_th_rain: "雨（有効）",
      pl_th_etc: "作物の消費",
      pl_th_irr: "灌漑",
      pl_th_hours: "揚水時間",
      pl_th_res: "計画ありの蓄え",
      pl_th_without: "灌漑なし",
      pl_sun: "日射",
      pl_c_t: "土壌の蓄え（%）：計画あり／灌漑なし",
      pl_s_with: "計画あり",
      pl_s_without: "灌漑なし",
      pl_need_pump: "揚水時間と太陽エネルギーを得るには、ポンプ流量・揚程・太陽光出力（「地下水ガード」欄）を入力してください。",
      pl_how_t: "計画の計算方法",
      pl_how_1: "今日の土壌の状態：学習済みモデル（LightGBM）。土壌に残る雨：有効雨量モデル。天気と日射：ECMWF IFS予報。",
      pl_how_2: "シミュレーション：作物のKcを用いたFAO-56根域水収支。蓄えが{th}を下回るとストレス（FAO-56の割合p、要確認）。モデルの通常誤差分の余裕を持つため、計画は{tg}を目標にします。",
      pl_how_3: "最適化：水は必要になる直前に加えます（雨の直前には加えません）。電気を節約する場合、灌漑を1〜3日早めて晴れの日に移します：土壌が無料で揚水した水を電池のように蓄え、揚水時間は太陽に合わせます。",
      pl_how_4: "「割当量の方法」との比較は毎日作物の消費を補います。節約の一部は使った土壌の蓄えによるもので、後で補う必要があります。",
      ag_t: "GAIAエージェント：質問してください",
      ag_badge: "AIエージェント＋ツール",
      ag_lead: "AIモデル（無料：Google GeminiまたはGroq）が質問を読み、呼び出すGAIAツール（土壌予測、最適計画、「もし」シミュレーション、日射予測）を自分で選び、その結果だけに基づいてあなたの言語で答えます。", ag_by_free: "{p}（{m}）が回答、無料AIモデル＋GAIAツール", ag_fallback: "無料AIモデルが応答しませんでした（{r}）：内蔵GAIAエージェント（ルール＋ツール）の回答です。", ag_by_local: "内蔵GAIAエージェント（ルール＋ツール）が回答：AIエージェントにはbackend/.envに無料のGeminiまたはGroqキーを追加してください。", ag_by_claude: "Claude（{m}）が回答", ag_new: "新しい会話", ag_you: "あなた", ag_gaia: "GAIAエージェント", ag_quota: "モデルの無料枠に達しました：1分後にもう一度お試しください。", ag_badkey: "無料モデルがキーを拒否しました：backend/.envのGAIA_LLM_API_KEYを確認してください。",
      ag_ph: "例：金曜日まで水やりを休めますか？",
      ag_send: "質問する",
      ag_loading: "エージェントが作業中…",
      ag_q1: "今週はいつポンプを動かすべき？",
      ag_q2: "明日10 mm灌漑したら？",
      ag_q3: "金曜日まで水やりを休めますか？",
      ag_steps: "エージェントが行ったこと",
      ag_off: "エージェントにはGAIAサービス（バックエンド）の起動が必要です。",
      ag_nokey: "AIエージェントには無料のGeminiキーが必要です：aistudio.google.com/apikeyで作成し、backend/.env（GAIA_LLM_API_KEY=…）に貼り付けて、バックエンドを再起動してください。",
      ag_err: "エージェントが回答できませんでした：",
      ag_tool_get_soil_forecast: "土壌予測",
      ag_tool_optimize_irrigation_plan: "最適計画",
      ag_tool_simulate_irrigation_schedule: "「もし」シミュレーション",
      ag_tool_get_solar_forecast: "日射予測"
    }
  });

  var PL = { key: null, status: 'off', data: null, error: null, timer: null };
  function planBody(r) {
    return {
      lat: fLat, lon: fLon, crop: S.crop || 'other', kc: num(S.kc) > 0 ? num(S.kc) : 0.65,
      area_ha: num(S.area) > 0 ? num(S.area) : null, ea: num(S.ea) > 0 ? num(S.ea) : 0.9,
      head_m: headM(), pump_eff: num(S.pump_eff) > 0 ? num(S.pump_eff) : 0.45,
      flow_m3h: num(S.flow) > 0 ? num(S.flow) : null,
      pv_kwp: num(S.pv_kwp) > 0 ? num(S.pv_kwp) : (r && r.solar ? Math.round(r.solar.kwp * 10) / 10 : null),
      pr: num(S.pr) > 0 ? num(S.pr) : 0.75, mode: S.plan_mode === 'water' ? 'water' : 'solar',
      irrigated_mm: num(S.irrigated_mm) > 0 ? num(S.irrigated_mm) : 0,
      months: (S.months || []).map(function (x) { return x ? 1 : 0; }),
      quota_m3_month: quotaMonths(r)
    };
  }
  // authorised volume per month (Garde-nappe): the renewable volume spread like the crop need; null = no limit
  function quotaMonths(r) {
    var sy = num(S.safe_yield), area = num(S.area);
    if (!(sy > 0) || !(area > 0) || !r || !r.months) return null;
    var need = 0; r.months.forEach(function (x) { need += x.vol || 0; });
    if (!(need > 0) || sy >= need) return null;                  // the quota does not bind
    var share = sy / need;
    return r.months.map(function (x) { return Math.round((x.vol || 0) * share * 10) / 10; });
  }
  function fetchPlan(body) {
    var key = JSON.stringify(body);
    if (key === PL.key) return;
    PL.key = key; PL.status = 'loading';
    clearTimeout(PL.timer);
    PL.timer = setTimeout(function () {
      fetch(G.CONFIG.planEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key })
        .then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error((j.detail && (j.detail.message || j.detail)) || res.status); return j; }); })
        .then(function (j) { if (PL.key !== key) return; PL.status = 'ok'; PL.data = j; PL.error = null; draw(); })
        .catch(function (e) { if (PL.key !== key) return; PL.status = e instanceof TypeError ? 'off' : 'error'; PL.error = String(e.message || e); draw(); });
    }, 350);
  }
  function hoursLabel(hs) {
    if (!hs || !hs.length) return '—';
    var runs = [], a = hs[0].hour, b = a;
    for (var i = 1; i <= hs.length; i++) {
      var h = i < hs.length ? hs[i].hour : null;
      if (h === b + 1) { b = h; continue; }
      runs.push(a + ' h–' + (b + 1) + ' h'); if (h !== null) { a = b = h; }
    }
    return runs.join(', ');
  }

  function plannerCard(r) {
    var head = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('pl_t')]), G.pill('live', t('pl_badge'))]);
    var card = el('div', { class: 'gp-card', style: 'margin-top:16px' }, [head,
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('pl_lead')])]);
    if (!G.CONFIG.planEndpoint || fLat == null || fLon == null) return card;
    var body = planBody(r);
    fetchPlan(body);

    // controls: objective + irrigation already done
    card.appendChild(el('p', { class: 'small', style: 'margin-top:12px;font-weight:600' }, [t('pl_mode')]));
    card.appendChild(el('div', { class: 'ss-choice', role: 'group', 'aria-label': t('pl_mode'), style: 'margin-top:6px' },
      [['solar', 'pl_m_solar'], ['water', 'pl_m_water']].map(function (o) {
        return el('button', { type: 'button', 'aria-pressed': String((S.plan_mode || 'solar') === o[0]), onclick: function () { S.plan_mode = o[0]; persist(); draw(); } }, [t(o[1])]);
      })));
    card.appendChild(el('p', { class: 'small', style: 'margin-top:6px;max-width:680px;color:var(--g-ink-2,#555)' }, [t((S.plan_mode || 'solar') === 'water' ? 'pl_m_water_d' : 'pl_m_solar_d')]));
    card.appendChild(el('div', { class: 'gp-field', style: 'margin-top:10px;max-width:340px' }, [
      el('label', { for: 'nx-pl-irr' }, [t('pl_irr')]),
      el('input', { id: 'nx-pl-irr', type: 'number', step: 'any', min: '0', inputmode: 'decimal', value: S.irrigated_mm === null ? '' : S.irrigated_mm,
        onchange: function (e) { S.irrigated_mm = num(e.target.value); persist(); draw(); } })
    ]));

    if (PL.status === 'loading' && !PL.data) { card.appendChild(el('p', { class: 'muted small', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' ' + t('pl_loading')])); return card; }
    if (PL.status === 'off') { card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('info', t('pl_off'))])); return card; }
    if (PL.status === 'error') { card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('err', t('pl_err') + ' ' + PL.error)])); card.appendChild(replayBlock(r)); return card; }
    var d = PL.data; if (!d) return card;
    var pc = function (x) { return x === null || x === undefined ? '—' : fmt(x * 100) + ' %'; };
    var T = d.totals, B = d.baseline, perHa = d.per_ha ? ' ' + t('per_ha') : '';
    if (PL.status === 'loading') card.appendChild(el('p', { class: 'muted small', style: 'margin-top:8px' }, [el('span', { class: 'gp-spin' }), ' ' + t('pl_loading')]));

    // 1. the decision
    var first = d.days.filter(function (x) { return x.irrigation_net_mm > 0; })[0];
    var verdict = first ? fill('pl_v_irr', { mm: fmt(T.net_mm, 1), m3: fmt(T.m3) + perHa, d: dayLabel(first.date, first.is_today) }) : (function () {
      var use = 0, rain = 0; d.days.forEach(function (x) { use += x.etc_mm || 0; rain += x.effective_rain_mm || 0; });
      return fill('pl_v_none', { use: fmt(use), src: rain >= 0.5 ? fill('pl_v_none_rain', { r: fmt(rain) }) : t('pl_v_none_soil'), taw: fmt(d.soil.taw_mm),
        zr: fmt(d.soil.zr_m, 1), a: pc(d.soil.start_reserve), b: pc(d.soil.end_reserve), s: pc(d.soil.stress_threshold) });
    })();
    card.appendChild(el('div', { style: 'margin-top:12px' }, [G.note(first ? 'warn' : 'ok', verdict)]));
    var LIM = d.limits || {}, mNames = G.t('months');
    if (LIM.months_off && LIM.months_off.length) {
      var offHere = LIM.months_off.filter(function (m) { return d.days.some(function (x) { return +x.date.slice(5, 7) === m; }); });
      if (offHere.length) card.appendChild(el('div', { style: 'margin-top:8px' }, [G.note('info', fill('pl_lim_off', { m: offHere.map(function (m) { return mNames[m - 1]; }).join(', ') }))]));
    }
    if (LIM.quota_m3 !== null && LIM.quota_m3 !== undefined) card.appendChild(el('div', { style: 'margin-top:8px' }, [
      G.note(LIM.quota_reached ? 'warn' : 'info', fill(LIM.quota_reached ? 'pl_lim_quota_hit' : 'pl_lim_quota', { q: fmt(LIM.quota_m3) }))]));

    // 2. key numbers
    var tiles = [
      el('div', { class: 'fbox water' }, [el('b', null, [t('pl_b_water')]), el('div', { class: 'v' }, [fmt(T.m3) + ' m³']),
        el('span', { class: 'u' }, [fmt(T.net_mm, 1) + ' mm' + perHa])]),
      el('div', { class: 'fbox quota' }, [el('b', null, [t('pl_b_quota')]), el('div', { class: 'v' }, [fmt(B.m3) + ' m³']),
        el('span', { class: 'u' }, [fill('pl_b_saved', { v: fmt(B.saved_m3) }) + (B.soil_borrowed_mm > 0.5 ? ' · ' + fill('pl_b_soil', { v: fmt(B.soil_borrowed_mm, 1) }) : '')])]),
      el('div', { class: 'fbox water' }, [el('b', null, [t('pl_b_stress')]), el('div', { class: 'v' }, [String(T.stress_days_without - T.stress_days)]),
        el('span', { class: 'u' }, [fill('pl_b_stress_u', { w: T.stress_days_without, p: T.stress_days })])])
    ];
    if (T.solar_kwh !== null && T.solar_share !== null) tiles.push(el('div', { class: 'fbox energy' }, [el('b', null, [t('pl_b_solar')]),
      el('div', { class: 'v' }, [pc(T.solar_share)]), el('span', { class: 'u' }, [fill('pl_b_solar_u', { s: fmt(T.solar_kwh, 1), o: fmt(T.other_kwh, 1) })])]));
    card.appendChild(el('div', { class: 'flow', style: 'margin-top:12px' }, tiles));
    if (!(body.flow_m3h && body.head_m && body.pv_kwp)) card.appendChild(el('p', { class: 'assump', style: 'margin-top:6px' }, [t('pl_need_pump')]));

    // 3. day by day
    card.appendChild(el('div', { class: 'gp-table-wrap', style: 'margin-top:12px' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, [el('th', null, [t('pl_th_day')]), el('th', { class: 'num' }, [t('pl_th_rain')]), el('th', { class: 'num' }, [t('pl_th_etc')]),
        el('th', { class: 'num' }, [t('pl_th_irr')]), el('th', null, [t('pl_th_hours')]), el('th', { class: 'num' }, [t('pl_sun')]),
        el('th', { class: 'num' }, [t('pl_th_res')]), el('th', { class: 'num' }, [t('pl_th_without')])])]),
      el('tbody', null, d.days.map(function (x) {
        var irr = x.irrigation_net_mm > 0 ? fmt(x.irrigation_net_mm, 1) + ' mm · ' + fmt(x.irrigation_m3) + ' m³' : '—';
        return el('tr', x.irrigation_net_mm > 0 ? { style: 'background:rgba(47,90,117,.08)' } : null, [
          el('td', null, [dayLabel(x.date, x.is_today)]),
          el('td', { class: 'num' }, [(x.rain_mm ? fmt(x.rain_mm, 1) + ' (' + fmt(x.effective_rain_mm, 1) + ')' : '0') + ' mm']),
          el('td', { class: 'num' }, [fmt(x.etc_mm, 1) + ' mm']),
          el('td', { class: 'num' }, [el('b', null, [irr])]),
          el('td', null, [!(x.irrigation_net_mm > 0) ? el('span', { class: 'muted' }, [t('pl_no_pump')])
            : (x.pumping && x.pumping.hours && x.pumping.hours.length) ? hoursLabel(x.pumping.hours) : el('span', { class: 'muted' }, [t('g_need_flow')])]),
          el('td', { class: 'num' }, [fmt(x.solar_irradiance_kwh_m2, 1) + ' kWh/m²']),
          el('td', { class: 'num' }, [pc(x.reserve)]),
          el('td', { class: 'num', style: x.stress_without ? 'color:#b7472a;font-weight:600' : '' }, [pc(x.reserve_without)])
        ]);
      }))
    ])]));

    // 4. chart
    var chart = el('div', { style: 'margin-top:12px' });
    card.appendChild(chart);
    setTimeout(function () {
      G.barChart(chart, { labels: d.days.map(function (x) { return dayLabel(x.date, false); }), unit: '%', title: t('pl_c_t'), series: [
        { name: t('pl_s_with'), color: '#2F5A75', values: d.days.map(function (x) { return x.reserve * 100; }) },
        { name: t('pl_s_without'), color: '#C9B173', values: d.days.map(function (x) { return x.reserve_without * 100; }) }
      ] });
    }, 0);

    card.appendChild(replayBlock(r));

    // 5. how
    card.appendChild(el('details', { class: 'gp-more', style: 'margin-top:10px' }, [
      el('summary', null, [t('pl_how_t')]),
      el('ul', { class: 'small', style: 'margin:6px 0 0;padding-inline-start:18px;display:grid;gap:4px' }, [
        el('li', null, [t('pl_how_1')]),
        el('li', null, [fill('pl_how_2', { th: pc(d.soil.stress_threshold), tg: pc(d.soil.target_reserve) })]),
        el('li', null, [t('pl_how_3')]), el('li', null, [t('pl_how_4')])
      ]),
      el('p', { class: 'assump', style: 'margin-top:6px' }, ['TAW ' + fmt(d.soil.taw_mm) + ' mm · RAW ' + fmt(d.soil.raw_mm) + ' mm · Zr ' + d.soil.zr_m + ' m · p ' + d.soil.p +
        ' · ' + d.sources.soil_state + ' · ' + d.sources.effective_rain + ' · ' + d.sources.crop])
    ]));
    return card;
  }

  G.addStrings({
    fr: {
      rp_btn: "Rejouer l'été 2025 sur les données réelles",
      rp_loading: "Rejeu de la saison…",
      rp_t: "Été 2025 rejoué jour par jour (1er mai → 30 sept.), site de {s}",
      rp_th: "Stratégie",
      rp_m3: "Eau pompée",
      rp_saved: "vs quota",
      rp_stress: "Jours de stress",
      rp_drain: "Eau perdue (drainage)",
      rp_solar: "Part solaire",
      rp_end: "Réserve finale",
      rp_days: "Jours de pompage",
      rp_quota: "Méthode du quota (remplacer chaque jour)",
      rp_fao_refill: "FAO-56 classique (remplir quand la réserve est basse)",
      rp_mpc_water: "Planificateur GAIA : économiser l'eau",
      rp_mpc_solar: "Planificateur GAIA : économiser l'électricité (pomper au soleil)",
      rp_read: "Lecture : l'économie d'eau par rapport au quota vient de la réserve du sol utilisée (réserve finale plus basse) et de l'eau non perdue en drainage, pas d'une culture qui boit moins ; la méthode FAO classique fait à peu près pareil. L'apport propre du planificateur est l'énergie : de petites doses au bon moment suivent la production solaire, alors que les grosses doses de la méthode classique la dépassent.",
      rp_note: "Météo réelle utilisée comme prévision parfaite (meilleur cas) ; sol simulé par le bilan FAO-56 à partir de l'humidité réelle du 1er mai ; soleil horaire reconstitué à partir du total journalier."
    },
    ar: {
      rp_btn: "إعادة تشغيل صيف 2025 على البيانات الحقيقية",
      rp_loading: "إعادة تشغيل الموسم…",
      rp_t: "صيف 2025 يومًا بيوم (1 ماي ← 30 سبتمبر)، موقع {s}",
      rp_th: "الاستراتيجية",
      rp_m3: "الماء المضخوخ",
      rp_saved: "مقارنة بالحصة",
      rp_stress: "أيام الإجهاد",
      rp_drain: "ماء ضائع (تصريف)",
      rp_solar: "الحصة الشمسية",
      rp_end: "المخزون النهائي",
      rp_days: "أيام الضخ",
      rp_quota: "طريقة الحصة (تعويض كل يوم)",
      rp_fao_refill: "FAO-56 الكلاسيكية (الملء عندما ينخفض المخزون)",
      rp_mpc_water: "مخطِّط GAIA: توفير الماء",
      rp_mpc_solar: "مخطِّط GAIA: توفير الكهرباء (الضخ تحت الشمس)",
      rp_read: "القراءة: توفير الماء مقارنة بالحصة يأتي من مخزون التربة المستعمل (مخزون نهائي أقل) ومن الماء غير الضائع في التصريف، لا من زراعة تشرب أقل؛ الطريقة الكلاسيكية تفعل تقريبًا نفس الشيء. المساهمة الخاصة بالمخطِّط هي الطاقة: جرعات صغيرة في الوقت المناسب تتبع الإنتاج الشمسي، بينما تتجاوزه الجرعات الكبيرة للطريقة الكلاسيكية.",
      rp_note: "الطقس الحقيقي مستعمل كتوقع مثالي (أفضل حالة)؛ التربة محاكاة بموازنة FAO-56 انطلاقًا من الرطوبة الحقيقية يوم 1 ماي؛ الشمس الساعية مُعاد بناؤها من المجموع اليومي."
    },
    en: {
      rp_btn: "Replay summer 2025 on real data",
      rp_loading: "Replaying the season…",
      rp_t: "Summer 2025 replayed day by day (1 May → 30 Sept.), {s} site",
      rp_th: "Strategy",
      rp_m3: "Water pumped",
      rp_saved: "vs quota",
      rp_stress: "Stress days",
      rp_drain: "Water lost (drainage)",
      rp_solar: "Solar share",
      rp_end: "Final reserve",
      rp_days: "Pumping days",
      rp_quota: "Quota method (replace every day)",
      rp_fao_refill: "Classic FAO-56 (refill when the reserve is low)",
      rp_mpc_water: "GAIA planner: save water",
      rp_mpc_solar: "GAIA planner: save electricity (pump in the sun)",
      rp_read: "Reading: the water saved against the quota comes from the soil reserve used (lower final reserve) and from water not lost to drainage, not from a crop that drinks less; the classic FAO method does about the same. The planner's own contribution is energy: small doses at the right time follow the solar output, while the classic method's large doses exceed it.",
      rp_note: "Real weather used as a perfect forecast (best case); soil simulated with the FAO-56 balance from the real soil moisture on 1 May; hourly sun rebuilt from the daily total."
    },
    ja: {
      rp_btn: "2025年夏を実データで再現",
      rp_loading: "シーズンを再現中…",
      rp_t: "2025年夏を1日ずつ再現（5月1日→9月30日）、{s}地点",
      rp_th: "方法",
      rp_m3: "揚水量",
      rp_saved: "割当量比",
      rp_stress: "ストレス日数",
      rp_drain: "失われた水（排水）",
      rp_solar: "太陽の割合",
      rp_end: "最終の蓄え",
      rp_days: "揚水日数",
      rp_quota: "割当量の方法（毎日補う）",
      rp_fao_refill: "従来のFAO-56（蓄えが減ったら満たす）",
      rp_mpc_water: "GAIAプランナー：水を節約",
      rp_mpc_solar: "GAIAプランナー：電気を節約（日中にポンプ）",
      rp_read: "読み方：割当量に対する節水は、使った土壌の蓄え（最終の蓄えが低い）と排水で失われなかった水によるもので、作物が飲む量が減ったわけではありません。従来のFAO法もほぼ同じです。プランナー独自の効果はエネルギーです：適時の少量灌漑は太陽光発電に合い、従来法の大量灌漑はそれを超えてしまいます。",
      rp_note: "実際の天気を完全な予報として使用（最良ケース）。土壌は5月1日の実際の水分からFAO-56収支でシミュレーション。時間ごとの日射は日合計から再構成。"
    }
  });

  var RP = { status: 'idle', data: null, error: null, key: null };
  function runReplay(r) {
    var b = planBody(r); delete b.mode; delete b.irrigated_mm;
    b.start = '2025-05-01'; b.end = '2025-09-30';
    RP = { status: 'loading', data: null, error: null, key: JSON.stringify(b) }; draw();
    fetch(G.CONFIG.replayEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error((j.detail && (j.detail.message || j.detail)) || res.status); return j; }); })
      .then(function (j) { RP.status = 'ok'; RP.data = j; draw(); })
      .catch(function (e) { RP.status = 'error'; RP.error = String(e.message || e); draw(); });
  }
  function replayBlock(r) {
    var box = el('div', { style: 'margin-top:14px' });
    if (!G.CONFIG.replayEndpoint) return box;
    box.appendChild(el('div', { class: 'ss-choice' }, [el('button', { type: 'button', disabled: RP.status === 'loading' ? 'disabled' : null, onclick: function () { runReplay(r); } }, [t('rp_btn')])]));
    if (RP.status === 'loading') box.appendChild(el('p', { class: 'muted small', style: 'margin-top:8px' }, [el('span', { class: 'gp-spin' }), ' ' + t('rp_loading')]));
    if (RP.status === 'error') box.appendChild(el('div', { style: 'margin-top:8px' }, [G.note('err', RP.error)]));
    if (RP.status !== 'ok' || !RP.data) return box;
    var d = RP.data, pc = function (x) { return x === null || x === undefined ? '—' : fmt(x * 100) + ' %'; };
    var perHa = d.per_ha ? ' / ha' : '';
    box.appendChild(el('h3', { style: 'margin-top:12px;font-size:16px' }, [fill('rp_t', { s: d.site.nom })]));
    box.appendChild(el('div', { class: 'gp-table-wrap', style: 'margin-top:8px' }, [el('table', { class: 'gp-table' }, [
      el('thead', null, [el('tr', null, ['rp_th', 'rp_m3', 'rp_saved', 'rp_stress', 'rp_drain', 'rp_solar', 'rp_days', 'rp_end'].map(function (k, i) {
        return el('th', i ? { class: 'num' } : null, [t(k)]);
      }))]),
      el('tbody', null, ['quota', 'fao_refill', 'mpc_water', 'mpc_solar'].map(function (k) {
        var x = d.strategies[k], gaia = k.indexOf('mpc') === 0;
        return el('tr', gaia ? { style: 'background:rgba(91,127,58,.08)' } : null, [
          el('td', null, [gaia ? el('b', null, [t('rp_' + k)]) : t('rp_' + k)]),
          el('td', { class: 'num' }, [fmt(x.m3) + ' m³' + perHa]),
          el('td', { class: 'num' }, [k === 'quota' ? '—' : (x.saved_vs_quota > 0 ? '−' : '+') + fmt(Math.abs(x.saved_vs_quota) * 100) + ' %']),
          el('td', { class: 'num' }, [String(x.stress_days)]),
          el('td', { class: 'num' }, [fmt(x.drainage_mm, 1) + ' mm']),
          el('td', { class: 'num' }, [el('b', null, [pc(x.solar_share)])]),
          el('td', { class: 'num' }, [String(x.pump_days)]),
          el('td', { class: 'num' }, [pc(x.end_reserve)])
        ]);
      }))
    ])]));
    box.appendChild(el('p', { class: 'small', style: 'margin-top:8px;color:var(--g-ink-2);max-width:90ch' }, [t('rp_read')]));
    box.appendChild(el('p', { class: 'assump', style: 'margin-top:4px' }, [t('rp_note')]));
    return box;
  }

  // settings the page knows, sent to the server for the morning check
  function pageSettings(r) {
    var b = planBody(r), out = {};
    ['crop', 'kc', 'area_ha', 'ea', 'head_m', 'pump_eff', 'flow_m3h', 'pv_kwp', 'pr', 'months', 'quota_m3_month'].forEach(function (k) { if (b[k] !== null && b[k] !== undefined) out[k] = b[k]; });
    return out;
  }
  // a confirmed settings change also updates this page's inputs
  var SET_TO_PAGE = { flow_m3h: 'flow', head_m: 'head', pv_kwp: 'pv_kwp', area_ha: 'area', kc: 'kc', crop: 'crop' };
  function confirmProposal(p, r) {
    p.state = 'busy'; draw();
    GAIA_FARMREC.apply(p).then(function () {
      p.state = 'done';
      if (p.type === 'update_settings') Object.keys(p.params.settings || {}).forEach(function (k) { if (SET_TO_PAGE[k]) S[SET_TO_PAGE[k]] = p.params.settings[k]; });
      if (p.type === 'set_monitoring' && p.params.enabled) GAIA_FARMREC.apply({ type: 'update_settings', params: { settings: pageSettings(r) } }).catch(function () {});
      persist(); PL.key = null;                              // the plan is computed again with the new record
      if (p.type === 'update_settings') renderAll(); else draw();   // new settings: rebuild the input fields too
    }).catch(function (e) { p.state = 'error'; p.error = String(e.message || e); draw(); });
  }
  if (window.GAIA_FARMREC) GAIA_FARMREC.onChange(function () { draw(); });

  // conversation with the agent (kept while the page is open)
  var AG = { status: 'idle', draft: '', turns: [], error: null, code: null };
  function askAgent(q, r) {
    if (!q || !q.trim() || AG.status === 'loading') return;
    var b = planBody(r);
    var parcel = { lat: b.lat, lon: b.lon, crop: b.crop, kc: b.kc, area_ha: b.area_ha, ea: b.ea, head_m: b.head_m, pump_eff: b.pump_eff, flow_m3h: b.flow_m3h, pv_kwp: b.pv_kwp, pr: b.pr, months: b.months, quota_m3_month: b.quota_m3_month };
    var history = AG.turns.filter(function (x) { return x.content; }).map(function (x) { return { role: x.role, content: x.content }; });
    AG.turns.push({ role: 'user', content: q.trim() });
    AG.status = 'loading'; AG.draft = ''; AG.error = null; AG.code = null; draw();
    fetch(G.CONFIG.agentEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.trim(), lang: G.lang(), parcel: parcel, history: history }) })
      .then(function (res) { return res.json().then(function (j) { if (!res.ok) { var e = new Error((j.detail && (j.detail.message || j.detail)) || res.status); e.code = j.detail && j.detail.status; throw e; } return j; }); })
      .then(function (j) { AG.turns.push({ role: 'assistant', content: j.text || '', steps: j.steps || [], engine: j.engine, model: j.model, provider: j.provider,
        proposals: (j.proposals || []).map(function (p) { return Object.assign({ state: 'pending' }, p); }) }); AG.status = 'ok'; draw(); })
      .catch(function (e) {
        AG.turns.pop();                                   // the question was not answered: give it back to the input
        AG.draft = q.trim(); AG.status = e instanceof TypeError ? 'off' : 'error'; AG.code = e.code || null; AG.error = String(e.message || e); draw();
      });
  }

  function agentCard(r) {
    var head = el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('ag_t')]), G.pill('live', t('ag_badge'))]);
    var card = el('div', { class: 'gp-card', style: 'margin-top:16px' }, [head,
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2);max-width:80ch' }, [t('ag_lead')])]);
    if (!G.CONFIG.agentEndpoint || fLat == null || fLon == null) return card;

    // 1. the conversation
    if (AG.turns.length) {
      var thread = el('div', { style: 'margin-top:12px;display:grid;gap:10px' });
      AG.turns.forEach(function (x) {
        if (x.role === 'user') {
          thread.appendChild(el('div', { style: 'justify-self:end;max-width:85%;background:var(--g-forest);color:var(--g-ivory);border-radius:14px 14px 4px 14px;padding:9px 13px;white-space:pre-wrap' },
            [el('b', { style: 'display:block;font-size:12px;opacity:.8' }, [t('ag_you')]), x.content]));
          return;
        }
        var box = el('div', { style: 'justify-self:start;max-width:95%;background:var(--g-ivory);border:1px solid var(--g-line);border-radius:14px 14px 14px 4px;padding:10px 13px' },
          [el('b', { style: 'display:block;font-size:12px;color:var(--g-forest)' }, [t('ag_gaia')])]);
        if (x.steps && x.steps.length) box.appendChild(el('details', { class: 'gp-more', style: 'margin-top:4px' }, [
          el('summary', { class: 'small' }, [t('ag_steps') + ' (' + x.steps.length + ')']),
          el('ol', { class: 'small', style: 'margin:4px 0 0;padding-inline-start:20px;display:grid;gap:3px;color:var(--g-ink-2)' }, x.steps.map(function (s) {
            return el('li', null, [el('b', null, [t('ag_tool_' + s.tool)]), ' — ' + s.summary]);
          }))]));
        box.appendChild(el('div', { style: 'margin-top:6px;white-space:pre-wrap' }, [x.content || '—']));
        (x.proposals || []).forEach(function (p) {
          if (!window.GAIA_FARMREC) return;
          var row = el('div', { style: 'margin-top:8px;border:1px solid var(--g-line-2);border-radius:10px;padding:8px 10px;background:#fff' }, [
            el('div', { class: 'small', style: 'font-weight:600;color:var(--g-forest)' }, [t('act_t')]),
            el('div', { style: 'margin-top:2px' }, [GAIA_FARMREC.describe(p)])]);
          if (p.state === 'pending' || p.state === 'busy') row.appendChild(el('div', { class: 'ss-choice', style: 'margin-top:6px' }, [
            el('button', { type: 'button', 'aria-pressed': 'true', disabled: p.state === 'busy' ? 'disabled' : null, onclick: function () { confirmProposal(p, r); } }, [t('act_confirm')]),
            el('button', { type: 'button', disabled: p.state === 'busy' ? 'disabled' : null, onclick: function () { p.state = 'cancelled'; draw(); } }, [t('act_cancel')])]));
          else row.appendChild(el('p', { class: 'small', style: 'margin-top:4px;font-weight:600;color:' + (p.state === 'done' ? 'var(--g-forest)' : '#b7472a') },
            [p.state === 'done' ? t('act_done') : p.state === 'cancelled' ? t('act_cancelled') : t('act_err') + ' ' + p.error]));
          box.appendChild(row);
        });
        thread.appendChild(box);
      });
      card.appendChild(thread);
    }
    if (AG.status === 'loading') card.appendChild(el('p', { class: 'muted small', style: 'margin-top:10px' }, [el('span', { class: 'gp-spin' }), ' ' + t('ag_loading')]));
    if (AG.status === 'off') card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note('info', t('ag_off'))]));
    if (AG.status === 'error') {
      var msg = AG.code === 'no_free_key' ? t('ag_nokey') : AG.code === 'free_quota' ? t('ag_quota') : AG.code === 'bad_key' ? t('ag_badkey') : t('ag_err') + ' ' + AG.error;
      card.appendChild(el('div', { style: 'margin-top:10px' }, [G.note(AG.code === 'free_quota' ? 'info' : 'err', msg)]));
    }

    // 2. the question
    var input = el('textarea', { id: 'nx-ag-q', rows: '2', placeholder: t('ag_ph'), oninput: function (e) { AG.draft = e.target.value; },
      onkeydown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAgent(input.value, r); } } }, [AG.draft || '']);
    card.appendChild(el('div', { class: 'gp-field', style: 'margin-top:12px' }, [input]));
    var buttons = (AG.turns.length ? [] : ['ag_q1', 'ag_q2', 'ag_q3'].map(function (k) {
      return el('button', { type: 'button', onclick: function () { askAgent(t(k), r); } }, [t(k)]);
    })).concat([el('button', { type: 'button', 'aria-pressed': 'true', disabled: AG.status === 'loading' ? 'disabled' : null,
      onclick: function () { askAgent(input.value, r); } }, [t('ag_send')])]);
    if (AG.turns.length) buttons.push(el('button', { type: 'button', onclick: function () { AG = { status: 'idle', draft: '', turns: [], error: null, code: null }; draw(); } }, [t('ag_new')]));
    card.appendChild(el('div', { class: 'ss-choice', style: 'margin-top:6px' }, buttons));
    return card;
  }

  // crop labels live in land.js; provide them here too
  G.addStrings({
    fr: { c_olive: 'Olivier', c_palm: 'Palmier dattier', c_citrus: 'Agrumes', c_cereal: 'Céréales', c_veg: 'Maraîchage', c_other: 'Autre' },
    ar: { c_olive: 'زيتون', c_palm: 'نخيل التمر', c_citrus: 'قوارص', c_cereal: 'حبوب', c_veg: 'خضروات', c_other: 'أخرى' },
    en: { c_olive: 'Olive', c_palm: 'Date palm', c_citrus: 'Citrus', c_cereal: 'Cereals', c_veg: 'Vegetables', c_other: 'Other' },
    ja: { c_olive: 'オリーブ', c_palm: 'ナツメヤシ', c_citrus: '柑橘', c_cereal: '穀物', c_veg: '野菜', c_other: 'その他' }
  });
  // plain words for farmers: technical details stay in the "Method" sections
  G.addStrings({
    fr: { "pe_b_gaia": "Calcul GAIA (IA)", "pe_b_usda": "Formule classique", "pe_s_gaia": "Calcul GAIA", "pe_s_usda": "Formule classique", "g_eyebrow": "Garde-nappe", "g_p": "Avec des panneaux solaires, pomper un mètre cube de plus ne coûte presque rien : on risque de vider la nappe. Le garde-nappe fixe, mois par mois, un plafond de pompage égal au besoin réel de la culture, ou plus bas si la nappe ou votre autorisation l'exige.", "kc_ref": "Valeur conseillée pour cette culture, modifiable.", "in_head": "Hauteur de pompage (m)", "in_head_h": "Profondeur de l'eau dans le puits + environ 10 m pour le goutte-à-goutte.", "in_pump": "Rendement de la pompe (entre 0 et 1)", "in_pr": "Rendement des panneaux solaires (entre 0 et 1)", "in_ea": "Efficacité de l'arrosage (entre 0 et 1)", "sim": "Estimation calculée par GAIA, pas une mesure.", "pe_lead": "Toute la pluie ne profite pas à la culture : une partie ruisselle ou s'évapore. GAIA a appris, sur 6 ans de données de 26 sites tunisiens, quelle part de chaque pluie reste vraiment dans le sol.", "pe_badge": "Appris par l'IA", "pe_opt_gaia": "Calcul GAIA (IA)", "pe_opt_usda": "Formule classique", "pe_classic": "formule classique", "fc_badge": "Prévision IA", "fc_lead": "GAIA prévoit, jour par jour, l'eau disponible autour des racines de votre culture, à partir de l'état du sol et de la météo des prochains jours.", "b_state_u": "{d} (hier, dernier jour connu)", "th_et0": "Évaporation", "b_week_u": "{v} m³ par ha", "fc_sim": "Prévision de GAIA, pas une mesure sur votre parcelle.", "how_dec": "Conseil : « Irriguer » quand la réserve prévue passe sous 30 %, « Irriguer bientôt » entre 30 et 35 %, « Réserve suffisante » au-dessus. Le planificateur juste en dessous utilise, lui, le seuil propre à votre culture.", "pl_badge": "Plan automatique", "pl_lead": "GAIA calcule pour vous, sur 8 jours, quel jour arroser et combien, pour que la culture ne manque jamais d'eau, avec le moins d'eau ou le plus de soleil possible. Le plan est refait chaque matin avec la nouvelle météo.", "pl_b_quota": "Arrosage habituel (un peu chaque jour)", "rp_quota": "Arrosage habituel (un peu chaque jour)", "ag_badge": "Assistant IA", "ag_lead": "Posez votre question comme à un conseiller agricole. GAIA regarde la météo, votre sol et votre plan, puis vous répond avec des chiffres précis, dans votre langue. Il peut aussi enregistrer un plan ou un arrosage, après votre accord.", "ag_steps": "Ce que GAIA a vérifié", "quota_p": "Le volume à ne pas dépasser chaque mois : c'est ce dont la culture a besoin, pas ce que la pompe peut sortir. Si votre autorisation officielle est plus basse, c'est elle qui compte.", "s_etc": "Besoin de la culture", "s_irg": "Eau à pomper", "src_solar_plain": "Ensoleillement : données NASA, moyenne de plusieurs années.", "head_est": "Hauteur de pompage non renseignée : GAIA utilise 40 m, une valeur courante. Indiquez la vraie hauteur dans « Hypothèses » pour des chiffres exacts." },
    en: { "pe_b_gaia": "GAIA calculation (AI)", "pe_b_usda": "Classic formula", "pe_s_gaia": "GAIA calculation", "pe_s_usda": "Classic formula", "g_eyebrow": "Groundwater guard", "g_p": "With solar panels, pumping one more cubic metre costs almost nothing, so the aquifer can be emptied. The groundwater guard sets a monthly pumping ceiling equal to the crop's real need, or lower if the aquifer or your permit requires it.", "kc_ref": "Recommended value for this crop, you can change it.", "in_head": "Pumping height (m)", "in_head_h": "Depth of the water in the well + about 10 m for drip irrigation.", "in_pump": "Pump efficiency (0 to 1)", "in_pr": "Solar panel efficiency (0 to 1)", "in_ea": "Watering efficiency (0 to 1)", "sim": "Estimate calculated by GAIA, not a measurement.", "pe_lead": "Not all rain helps the crop: some runs off or evaporates. GAIA learned, from 6 years of data at 26 Tunisian sites, how much of each rain really stays in the soil.", "pe_badge": "Learned by AI", "pe_opt_gaia": "GAIA calculation (AI)", "pe_opt_usda": "Classic formula", "pe_classic": "classic formula", "fc_badge": "AI forecast", "fc_lead": "GAIA forecasts, day by day, the water available around your crop's roots, from the soil's state and the coming days' weather.", "b_state_u": "{d} (yesterday, last known day)", "th_et0": "Evaporation", "b_week_u": "{v} m³ per ha", "fc_sim": "GAIA forecast, not a measurement on your plot.", "how_dec": "Advice: \"Irrigate\" when the forecast reserve drops below 30 %, \"Irrigate soon\" between 30 and 35 %, \"Reserve sufficient\" above. The planner just below uses your crop's own threshold.", "pl_badge": "Automatic plan", "pl_lead": "GAIA works out, over 8 days, which day to water and how much, so the crop never lacks water, with the least water or the most sun possible. The plan is redone every morning with the new weather.", "pl_b_quota": "Usual watering (a little every day)", "rp_quota": "Usual watering (a little every day)", "ag_badge": "AI assistant", "ag_lead": "Ask your question as you would ask a farm advisor. GAIA looks at the weather, your soil and your plan, then answers with precise numbers, in your language. It can also save a plan or a watering, once you agree.", "ag_steps": "What GAIA checked", "quota_p": "The volume not to exceed each month: what the crop needs, not what the pump can deliver. If your official permit is lower, the permit counts.", "s_etc": "Crop need", "s_irg": "Water to pump", "src_solar_plain": "Sunshine: NASA data, average over several years.", "head_est": "Pumping height not entered: GAIA uses 40 m, a common value. Enter the real height under \"Assumptions\" for exact figures." },
    ar: { "pe_b_gaia": "حساب GAIA (ذكاء اصطناعي)", "pe_b_usda": "الصيغة الكلاسيكية", "pe_s_gaia": "حساب GAIA", "pe_s_usda": "الصيغة الكلاسيكية", "g_eyebrow": "حارس المائدة المائية", "g_p": "مع الألواح الشمسية، يكاد ضخ متر مكعب إضافي لا يكلّف شيئًا، فقد تُستنزف المائدة المائية. يحدّد حارس المائدة كل شهر سقفًا للضخ يساوي الحاجة الحقيقية للزراعة، أو أقل إذا اقتضت ذلك المائدة أو رخصتك.", "kc_ref": "القيمة المنصوح بها لهذه الزراعة، يمكنك تغييرها.", "in_head": "ارتفاع الضخ (م)", "in_head_h": "عمق الماء في البئر + حوالي 10 م للري بالتنقيط.", "in_pump": "مردود المضخة (بين 0 و1)", "in_pr": "مردود الألواح الشمسية (بين 0 و1)", "in_ea": "نجاعة السقي (بين 0 و1)", "sim": "تقدير يحسبه GAIA، وليس قياسًا.", "pe_lead": "ليس كل المطر مفيدًا للزراعة: جزء منه يسيل أو يتبخر. تعلّم GAIA، من 6 سنوات من بيانات 26 موقعًا تونسيًا، كم يبقى فعلًا في التربة من كل مطرة.", "pe_badge": "تعلّمه الذكاء الاصطناعي", "pe_opt_gaia": "حساب GAIA (ذكاء اصطناعي)", "pe_opt_usda": "الصيغة الكلاسيكية", "pe_classic": "الصيغة الكلاسيكية", "fc_badge": "توقع بالذكاء الاصطناعي", "fc_lead": "يتوقع GAIA، يومًا بيوم، الماء المتوفر حول جذور زراعتك، انطلاقًا من حالة التربة وطقس الأيام القادمة.", "b_state_u": "{d} (أمس، آخر يوم معروف)", "th_et0": "التبخر", "b_week_u": "{v} م³ للهكتار", "fc_sim": "توقع GAIA، وليس قياسًا في قطعتك.", "how_dec": "النصيحة: «اسقِ» عندما ينزل المخزون المتوقع تحت 30 %، «اسقِ قريبًا» بين 30 و35 %، «المخزون كافٍ» فوق ذلك. المخطِّط أسفله يستعمل عتبة زراعتك الخاصة.", "pl_badge": "خطة آلية", "pl_lead": "يحسب لك GAIA، على 8 أيام، في أي يوم تسقي وكم، حتى لا ينقص الماء أبدًا عن الزراعة، بأقل ماء أو بأكثر شمس ممكنة. تُعاد الخطة كل صباح بالطقس الجديد.", "pl_b_quota": "السقي المعتاد (قليلًا كل يوم)", "rp_quota": "السقي المعتاد (قليلًا كل يوم)", "ag_badge": "مساعد ذكي", "ag_lead": "اطرح سؤالك كما تسأل مرشدًا فلاحيًا. ينظر GAIA إلى الطقس وتربتك وخطتك، ثم يجيبك بأرقام دقيقة وبلغتك. ويمكنه أيضًا حفظ خطة أو سقي بعد موافقتك.", "ag_steps": "ما تحقق منه GAIA", "quota_p": "الحجم الذي لا يجب تجاوزه كل شهر: هو ما تحتاجه الزراعة، لا ما تستطيع المضخة إخراجه. إذا كانت رخصتك الرسمية أقل، فهي المعتمدة.", "s_etc": "حاجة الزراعة", "s_irg": "الماء المطلوب ضخه", "src_solar_plain": "أشعة الشمس: بيانات NASA، معدل عدة سنوات.", "head_est": "ارتفاع الضخ غير مُدخل: يستعمل GAIA قيمة شائعة هي 40 م. أدخل الارتفاع الحقيقي في «الفرضيات» للحصول على أرقام دقيقة." },
    ja: { "pe_b_gaia": "GAIAの計算（AI）", "pe_b_usda": "従来の式", "pe_s_gaia": "GAIAの計算", "pe_s_usda": "従来の式", "g_eyebrow": "地下水ガード", "g_p": "太陽光パネルがあると、1 m³多く汲んでもほとんどお金がかからず、地下水を枯らすおそれがあります。地下水ガードは毎月、作物が本当に必要とする量を揚水の上限にします。地下水や許可量がそれより少なければ、さらに下げます。", "kc_ref": "この作物の推奨値です。変更できます。", "in_head": "揚水の高さ（m）", "in_head_h": "井戸の水面までの深さ＋点滴灌漑用に約10 m。", "in_pump": "ポンプの効率（0〜1）", "in_pr": "太陽光パネルの効率（0〜1）", "in_ea": "灌水の効率（0〜1）", "sim": "GAIAによる推定値で、実測ではありません。", "pe_lead": "雨のすべてが作物に役立つわけではありません。一部は流れたり蒸発したりします。GAIAはチュニジア26地点・6年分のデータから、雨のうち本当に土に残る割合を学びました。", "pe_badge": "AIが学習", "pe_opt_gaia": "GAIAの計算（AI）", "pe_opt_usda": "従来の式", "pe_classic": "従来の式", "fc_badge": "AI予測", "fc_lead": "GAIAは土の状態とこれからの天気から、作物の根のまわりにある水を日ごとに予測します。", "b_state_u": "{d}（昨日、最新の日）", "th_et0": "蒸発量", "b_week_u": "1 haあたり{v} m³", "fc_sim": "GAIAの予測で、あなたの畑での実測ではありません。", "how_dec": "助言：予測の蓄えが30 %を下回ると「灌漑」、30〜35 %で「まもなく灌漑」、それ以上で「蓄えは十分」。すぐ下の計画では作物ごとのしきい値を使います。", "pl_badge": "自動プラン", "pl_lead": "GAIAが8日間について、どの日にどれだけ水をやるかを計算します。作物が水不足にならないようにしつつ、水を最小に、または太陽を最大に使います。計画は毎朝、新しい天気で作り直されます。", "pl_b_quota": "いつもの灌漑（毎日少しずつ）", "rp_quota": "いつもの灌漑（毎日少しずつ）", "ag_badge": "AIアシスタント", "ag_lead": "農業アドバイザーに聞くように質問してください。GAIAが天気・土・計画を確認し、正確な数字であなたの言語で答えます。あなたの同意があれば、計画や灌漑の記録もできます。", "ag_steps": "GAIAが確認したこと", "quota_p": "毎月超えてはいけない量です。ポンプが出せる量ではなく、作物が必要とする量です。正式な許可量がそれより少なければ、許可量が優先されます。", "s_etc": "作物の必要量", "s_irg": "汲む水の量", "src_solar_plain": "日射：NASAのデータ（数年間の平均）。", "head_est": "揚水の高さが未入力です：一般的な値の40 mを使っています。正確な数字のため「前提条件」に実際の高さを入力してください。" }
  });
  // one short line each: the farmer reads it at a glance
  G.addStrings({
    fr: { "pe_kept": "Gardée par le sol", "g_need_flow": "débit ?", "pl_no_pump": "pas de pompage", "n_lead": "L'eau dont votre culture a besoin, l'énergie pour la pomper, et la limite à ne pas dépasser.", "principle_p": "Pomper au soleil est presque gratuit : GAIA fixe donc toujours une limite d'eau.", "g_p": "Une limite de pompage chaque mois, pour ne pas vider la nappe.", "pe_lead": "La part de la pluie qui reste vraiment dans votre sol.", "fc_lead": "L'eau dans votre sol, jour par jour, cette semaine.", "pl_lead": "Quel jour arroser, combien et à quelle heure.", "pl_m_solar_d": "Pomper aux heures de soleil, avec vos panneaux.", "pl_m_water_d": "Arroser le moins possible, juste quand il faut.", "pl_v_none": "Pas besoin d'arroser ces 8 jours : l'eau du sol suffit (réserve {a} → {b} ; la plante souffre sous {s}).", "pl_need_pump": "Ajoutez le débit, la hauteur et les panneaux pour voir les heures de pompage.", "ag_lead": "Posez une question, GAIA répond avec vos chiffres.", "quota_p": "Le maximum à pomper chaque mois.", "sim": "Estimation, pas une mesure.", "fc_sim": "Prévision, pas une mesure.", "cost_note": "Coût de l'énergie seulement.", "cost_ref": "Prix moyens en Tunisie : mettez les vôtres pour un calcul exact.", "head_est": "Hauteur de pompage inconnue : GAIA utilise 40 m. Mettez la vraie valeur dans « Hypothèses ».", "kc_ref": "Valeur conseillée.", "in_head_h": "Profondeur de l'eau + 10 m.", "fr_lead": "Votre plan, vos arrosages et vos alertes.", "fr_mon_note": "GAIA doit être allumé à cette heure-là." },
    en: { "pe_kept": "Kept by the soil", "g_need_flow": "flow?", "pl_no_pump": "no pumping", "n_lead": "The water your crop needs, the energy to pump it, and the limit not to exceed.", "principle_p": "Pumping in the sun is almost free, so GAIA always sets a water limit.", "g_p": "A monthly pumping limit, so the aquifer is not emptied.", "pe_lead": "How much of the rain really stays in your soil.", "fc_lead": "The water in your soil, day by day, this week.", "pl_lead": "Which day to water, how much and at what time.", "pl_m_solar_d": "Pump during sunny hours, with your panels.", "pl_m_water_d": "Water as little as possible, only when needed.", "pl_v_none": "No need to water for 8 days: the soil has enough water (reserve {a} → {b}; the plant suffers below {s}).", "pl_need_pump": "Add the pump flow, height and panels to see the pumping hours.", "ag_lead": "Ask a question, GAIA answers with your numbers.", "quota_p": "The most you should pump each month.", "sim": "Estimate, not a measurement.", "fc_sim": "Forecast, not a measurement.", "cost_note": "Energy cost only.", "cost_ref": "Average Tunisian prices: enter yours for an exact result.", "head_est": "Pumping height unknown: GAIA uses 40 m. Enter the real value under \"Assumptions\".", "kc_ref": "Recommended value.", "in_head_h": "Water depth + 10 m.", "fr_lead": "Your plan, your waterings and your alerts.", "fr_mon_note": "GAIA must be running at that time." },
    ar: { "pe_kept": "ما تحتفظ به التربة", "g_need_flow": "التدفق؟", "pl_no_pump": "لا ضخ", "n_lead": "الماء الذي تحتاجه زراعتك، والطاقة لضخه، والحد الذي لا يجب تجاوزه.", "principle_p": "الضخ بالشمس شبه مجاني، لذلك يضع GAIA دائمًا حدًا للماء.", "g_p": "حد للضخ كل شهر، حتى لا تُستنزف المائدة المائية.", "pe_lead": "الجزء من المطر الذي يبقى فعلًا في تربتك.", "fc_lead": "الماء في تربتك، يومًا بيوم، هذا الأسبوع.", "pl_lead": "في أي يوم تسقي، وكم، وفي أي ساعة.", "pl_m_solar_d": "الضخ في ساعات الشمس، بألواحك.", "pl_m_water_d": "السقي بأقل كمية، فقط عند الحاجة.", "pl_v_none": "لا حاجة للسقي خلال 8 أيام: ماء التربة يكفي (المخزون {a} ← {b}؛ تعاني النبتة تحت {s}).", "pl_need_pump": "أضف تدفق المضخة والارتفاع والألواح لرؤية ساعات الضخ.", "ag_lead": "اطرح سؤالًا، يجيبك GAIA بأرقامك.", "quota_p": "أقصى ما تضخه كل شهر.", "sim": "تقدير، وليس قياسًا.", "fc_sim": "توقع، وليس قياسًا.", "cost_note": "كلفة الطاقة فقط.", "cost_ref": "أسعار متوسطة في تونس: أدخل أسعارك لحساب دقيق.", "head_est": "ارتفاع الضخ غير معروف: يستعمل GAIA 40 م. أدخل القيمة الحقيقية في «الفرضيات».", "kc_ref": "القيمة المنصوح بها.", "in_head_h": "عمق الماء + 10 م.", "fr_lead": "خطتك، وسقيك، وتنبيهاتك.", "fr_mon_note": "يجب أن يكون GAIA مشغّلًا في تلك الساعة." },
    ja: { "pe_kept": "土に残る量", "g_need_flow": "流量？", "pl_no_pump": "揚水なし", "n_lead": "作物に必要な水、それを汲むエネルギー、そして超えてはいけない上限。", "principle_p": "太陽での揚水はほぼ無料なので、GAIAは必ず水の上限を決めます。", "g_p": "地下水を枯らさないための、毎月の揚水の上限。", "pe_lead": "雨のうち、本当に土に残る量。", "fc_lead": "今週の土の中の水を、日ごとに。", "pl_lead": "いつ、どれだけ、何時に水をやるか。", "pl_m_solar_d": "日差しのある時間に、パネルで汲み上げます。", "pl_m_water_d": "必要なときだけ、できるだけ少なく。", "pl_v_none": "8日間は水やり不要：土の水で足ります（蓄え{a} → {b}、{s}を下回ると植物が弱ります）。", "pl_need_pump": "揚水時間を見るには、流量・高さ・パネルを入力してください。", "ag_lead": "質問すると、GAIAがあなたの数字で答えます。", "quota_p": "毎月汲める最大量。", "sim": "推定値で、実測ではありません。", "fc_sim": "予測で、実測ではありません。", "cost_note": "エネルギー費のみ。", "cost_ref": "チュニジアの平均価格です。正確にするにはご自分の価格を入力してください。", "head_est": "揚水の高さが不明：40 mを使っています。「前提条件」に実際の値を入力してください。", "kc_ref": "推奨値。", "in_head_h": "水面までの深さ＋10 m。", "fr_lead": "あなたの計画、灌漑、アラート。", "fr_mon_note": "その時刻にGAIAが起動している必要があります。" }
  });
  renderAll();
  G.onLang(renderAll);
}());
