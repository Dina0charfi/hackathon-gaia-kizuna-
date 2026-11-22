/* Waste-to-energy page: farm waste → biogas → cooking gas, electricity and fertiliser, with a day-by-day
   simulation of one year. Calculations in waste-core.js. */
(function () {
  'use strict';
  var G = window.GAIA, el = G.el, t = G.t, fmt = G.fmt, W = window.GAIA_WASTE;

  G.addStrings({
    fr: {
      nav_waste: 'Énergie des déchets', w_title: 'Énergie des déchets',
      w_lead: 'Vos déchets agricoles deviennent du gaz pour cuisiner, de l’électricité et de l’engrais.',
      w_principle: 'Rien ne se perd : le fumier et les grignons deviennent énergie, puis engrais.',
      w_in_t: 'Vos déchets', w_presets: 'Exemples rapides :', w_p_family: 'Ferme familiale', w_p_olive: 'Oliveraie + élevage', w_p_coop: 'Coopérative',
      w_animals: 'Animaux', w_cow: 'Vaches', w_small: 'Moutons et chèvres', w_poultry: 'Volailles',
      w_share: 'Part du fumier ramassée (%)', w_share_h: 'Les animaux au pâturage laissent leur fumier aux champs.',
      w_olive: 'Olives', w_pomace: 'Grignons (t / an)', w_margines: 'Margines (m³ / an)', w_olive_h: 'Disponibles de novembre à mars, à la saison des olives.',
      w_other: 'Autres déchets', w_residues: 'Résidus de culture verts (t / an)', w_food: 'Restes de cuisine et de marché (kg / jour)',
      w_use_t: 'Utilisation du gaz', w_bottles: 'Bouteilles de gaz utilisées par mois', w_gen: 'Le surplus fait de l’électricité (groupe électrogène)',
      w_prices: 'Prix (pour le coût)', w_p_bottle: 'Bouteille de gaz 13 kg (TND)', w_p_kwh: 'Électricité (TND / kWh)', w_p_dig: 'Digesteur (TND / m³)', w_p_gen: 'Groupe électrogène (TND / kW)', w_p_urea: 'Sac d’urée 50 kg (TND)',
      w_ref: 'Prix de référence à vérifier : mettez les vôtres.',
      k_gas: 'Biogaz', k_gas_u: 'm³ par an', k_bottles: 'Bouteilles de gaz remplacées', k_bottles_u: 'sur {n} utilisées par an', k_elec: 'Électricité', k_elec_u: 'kWh par an',
      k_fert: 'Engrais', k_fert_u: 'sacs d’urée remplacés ({t} t de digestat)', k_co2: 'CO₂ évité', k_co2_u: 't par an', k_dig: 'Digesteur', k_dig_u: 'm³ à construire',
      w_none: 'Indiquez au moins un déchet pour lancer le calcul.',
      w_cold: 'En hiver le digesteur est froid : il produit {p} % de moins qu’en été. Un digesteur enterré et une serre au-dessus aident.',
      w_src_t: 'D’où vient le gaz', w_month_t: 'Gaz produit et gaz utilisé pour cuisiner, par mois', s_made: 'Gaz produit', s_cook: 'Besoin pour cuisiner',
      sim_t: 'Simulation : une année jour par jour', sim_p: 'Regardez le digesteur produire, la cuisine consommer et le surplus faire de l’électricité.',
      sim_play: 'Lancer la simulation', sim_pause: 'Pause', sim_reset: 'Recommencer', sim_speed: 'Vitesse',
      sim_day: 'Jour {d} · {m}', sim_bag: 'Réserve de gaz', sim_made: 'Gaz produit', sim_cooked: 'Repas cuisinés au biogaz', sim_bottles: 'Bouteilles économisées', sim_kwh: 'Électricité produite', sim_short: 'Jours où il a manqué du gaz',
      sim_meals: 'repas', sim_end: 'Fin de l’année : {b} bouteilles économisées, {k} kWh produits, {s} jours avec un manque de gaz.',
      cost_t: 'Coût et retour sur investissement', c_build: 'Construction', c_save: 'Économie par an', c_payback: 'Remboursé en', c_years: 'ans', c_none: '—',
      c_note: 'L’économie compte le gaz, l’électricité et l’urée remplacés.',
      method_t: 'Méthode et hypothèses',
      method_p: 'Rendements en biogaz typiques de la littérature (guides FAO et GIZ), pour des déchets frais : à vérifier par un test sur vos déchets. Biogaz à 60 % de méthane (6 kWh/m³), groupe électrogène 25 %, 1 bouteille de 13 kg ≈ 29 m³ de biogaz en cuisine. Digesteur enterré non chauffé : sa production suit la température du mois. Volume = mélange déchets + eau × 40 jours.'
    },
    ar: {
      nav_waste: 'طاقة النفايات', w_title: 'طاقة النفايات',
      w_lead: 'تتحوّل نفاياتك الفلاحية إلى غاز للطبخ وكهرباء وسماد.',
      w_principle: 'لا شيء يضيع: الروث والفيتورة يصبحان طاقة ثم سمادًا.',
      w_in_t: 'نفاياتك', w_presets: 'أمثلة سريعة:', w_p_family: 'ضيعة عائلية', w_p_olive: 'زياتين + تربية ماشية', w_p_coop: 'تعاضدية',
      w_animals: 'الحيوانات', w_cow: 'أبقار', w_small: 'أغنام وماعز', w_poultry: 'دواجن',
      w_share: 'نسبة الروث المجمّع (%)', w_share_h: 'الحيوانات في المرعى تترك روثها في الحقول.',
      w_olive: 'الزيتون', w_pomace: 'الفيتورة (طن / سنة)', w_margines: 'المرجين (م³ / سنة)', w_olive_h: 'متوفرة من نوفمبر إلى مارس، في موسم الزيتون.',
      w_other: 'نفايات أخرى', w_residues: 'بقايا زراعية خضراء (طن / سنة)', w_food: 'بقايا المطبخ والسوق (كغ / يوم)',
      w_use_t: 'استعمال الغاز', w_bottles: 'قوارير الغاز المستعملة في الشهر', w_gen: 'الفائض يصنع كهرباء (مولّد)',
      w_prices: 'الأسعار (للكلفة)', w_p_bottle: 'قارورة غاز 13 كغ (د)', w_p_kwh: 'الكهرباء (د / ك.و.س)', w_p_dig: 'الهاضم (د / م³)', w_p_gen: 'المولّد (د / ك.و)', w_p_urea: 'كيس أمونيتر/يوريا 50 كغ (د)',
      w_ref: 'أسعار مرجعية يجب التحقق منها: أدخل أسعارك.',
      k_gas: 'الغاز الحيوي', k_gas_u: 'م³ في السنة', k_bottles: 'قوارير غاز معوّضة', k_bottles_u: 'من {n} مستعملة في السنة', k_elec: 'الكهرباء', k_elec_u: 'ك.و.س في السنة',
      k_fert: 'السماد', k_fert_u: 'أكياس يوريا معوّضة ({t} طن من المخلّفات المهضومة)', k_co2: 'CO₂ متجنَّب', k_co2_u: 'طن في السنة', k_dig: 'الهاضم', k_dig_u: 'م³ للبناء',
      w_none: 'أدخل نوعًا واحدًا على الأقل من النفايات لبدء الحساب.',
      w_cold: 'في الشتاء يكون الهاضم باردًا: ينتج أقل بـ{p} % من الصيف. هاضم مدفون مع بيت بلاستيكي فوقه يساعد.',
      w_src_t: 'من أين يأتي الغاز', w_month_t: 'الغاز المنتج والغاز المستعمل للطبخ، شهرًا بشهر', s_made: 'الغاز المنتج', s_cook: 'حاجة الطبخ',
      sim_t: 'محاكاة: سنة يومًا بيوم', sim_p: 'شاهد الهاضم ينتج، والمطبخ يستهلك، والفائض يصنع الكهرباء.',
      sim_play: 'ابدأ المحاكاة', sim_pause: 'توقف', sim_reset: 'من جديد', sim_speed: 'السرعة',
      sim_day: 'اليوم {d} · {m}', sim_bag: 'مخزون الغاز', sim_made: 'الغاز المنتج', sim_cooked: 'وجبات مطبوخة بالغاز الحيوي', sim_bottles: 'قوارير موفَّرة', sim_kwh: 'الكهرباء المنتجة', sim_short: 'أيام نقص فيها الغاز',
      sim_meals: 'وجبة', sim_end: 'نهاية السنة: {b} قارورة موفَّرة، {k} ك.و.س منتجة، {s} يوم نقص فيها الغاز.',
      cost_t: 'الكلفة واسترجاع الاستثمار', c_build: 'البناء', c_save: 'التوفير في السنة', c_payback: 'يُسترجع في', c_years: 'سنوات', c_none: '—',
      c_note: 'يحسب التوفير الغاز والكهرباء واليوريا المعوّضة.',
      method_t: 'المنهجية والفرضيات',
      method_p: 'مردود الغاز الحيوي قيم نموذجية من المراجع (أدلة FAO وGIZ) للنفايات الطازجة: يجب التحقق منها بتجربة على نفاياتك. غاز بـ60 % ميثان (6 ك.و.س/م³)، مولّد 25 %، قارورة 13 كغ ≈ 29 م³ للطبخ. هاضم مدفون غير مدفّأ: إنتاجه يتبع حرارة الشهر. الحجم = خليط النفايات والماء × 40 يومًا.'
    },
    en: {
      nav_waste: 'Energy from waste', w_title: 'Energy from waste',
      w_lead: 'Your farm waste becomes cooking gas, electricity and fertiliser.',
      w_principle: 'Nothing is lost: manure and olive pomace become energy, then fertiliser.',
      w_in_t: 'Your waste', w_presets: 'Quick examples:', w_p_family: 'Family farm', w_p_olive: 'Olive grove + livestock', w_p_coop: 'Cooperative',
      w_animals: 'Animals', w_cow: 'Cows', w_small: 'Sheep and goats', w_poultry: 'Poultry',
      w_share: 'Share of the manure collected (%)', w_share_h: 'Grazing animals leave their manure in the fields.',
      w_olive: 'Olives', w_pomace: 'Olive pomace (t / year)', w_margines: 'Olive mill wastewater (m³ / year)', w_olive_h: 'Available from November to March, in the olive season.',
      w_other: 'Other waste', w_residues: 'Green crop residues (t / year)', w_food: 'Kitchen and market waste (kg / day)',
      w_use_t: 'Using the gas', w_bottles: 'Gas bottles used per month', w_gen: 'Surplus gas makes electricity (generator)',
      w_prices: 'Prices (for the cost)', w_p_bottle: '13 kg gas bottle (TND)', w_p_kwh: 'Electricity (TND / kWh)', w_p_dig: 'Digester (TND / m³)', w_p_gen: 'Generator (TND / kW)', w_p_urea: '50 kg urea bag (TND)',
      w_ref: 'Reference prices to check: enter yours.',
      k_gas: 'Biogas', k_gas_u: 'm³ per year', k_bottles: 'Gas bottles replaced', k_bottles_u: 'of {n} used per year', k_elec: 'Electricity', k_elec_u: 'kWh per year',
      k_fert: 'Fertiliser', k_fert_u: 'urea bags replaced ({t} t of digestate)', k_co2: 'CO₂ avoided', k_co2_u: 't per year', k_dig: 'Digester', k_dig_u: 'm³ to build',
      w_none: 'Enter at least one kind of waste to start.',
      w_cold: 'In winter the digester is cold: it makes {p} % less gas than in summer. A buried digester with a small greenhouse on top helps.',
      w_src_t: 'Where the gas comes from', w_month_t: 'Gas made and gas used for cooking, month by month', s_made: 'Gas made', s_cook: 'Needed for cooking',
      sim_t: 'Simulation: one year, day by day', sim_p: 'Watch the digester make gas, the kitchen use it and the surplus make electricity.',
      sim_play: 'Run the simulation', sim_pause: 'Pause', sim_reset: 'Start again', sim_speed: 'Speed',
      sim_day: 'Day {d} · {m}', sim_bag: 'Gas in store', sim_made: 'Gas made', sim_cooked: 'Meals cooked on biogas', sim_bottles: 'Bottles saved', sim_kwh: 'Electricity made', sim_short: 'Days short of gas',
      sim_meals: 'meals', sim_end: 'End of the year: {b} bottles saved, {k} kWh made, {s} days short of gas.',
      cost_t: 'Cost and payback', c_build: 'Building it', c_save: 'Saved per year', c_payback: 'Paid back in', c_years: 'years', c_none: '—',
      c_note: 'Savings count the gas, electricity and urea replaced.',
      method_t: 'Method and assumptions',
      method_p: 'Biogas yields are typical literature values (FAO and GIZ guides) for fresh waste: check them with a test on your own waste. Biogas at 60 % methane (6 kWh/m³), generator 25 %, one 13 kg bottle ≈ 29 m³ of biogas for cooking. Buried, unheated digester: its output follows the month’s temperature. Volume = waste + water mix × 40 days.'
    },
    ja: {
      nav_waste: '廃棄物エネルギー', w_title: '廃棄物エネルギー',
      w_lead: '農場の廃棄物が、調理用ガス・電気・肥料になります。',
      w_principle: '無駄はありません：ふん尿やオリーブ搾りかすがエネルギーに、そして肥料になります。',
      w_in_t: 'あなたの廃棄物', w_presets: 'すぐ試せる例：', w_p_family: '家族経営の農場', w_p_olive: 'オリーブ園＋畜産', w_p_coop: '協同組合',
      w_animals: '家畜', w_cow: '牛', w_small: '羊・ヤギ', w_poultry: '家禽',
      w_share: '集められるふん尿の割合（%）', w_share_h: '放牧中の家畜のふん尿は畑に残ります。',
      w_olive: 'オリーブ', w_pomace: '搾りかす（t / 年）', w_margines: '搾油排水（m³ / 年）', w_olive_h: 'オリーブの季節、11月から3月まで。',
      w_other: 'その他の廃棄物', w_residues: '緑の作物残さ（t / 年）', w_food: '台所・市場の残り物（kg / 日）',
      w_use_t: 'ガスの使い道', w_bottles: '1か月に使うガスボンベ', w_gen: '余ったガスで発電（発電機）',
      w_prices: '価格（費用の計算用）', w_p_bottle: '13 kgガスボンベ（TND）', w_p_kwh: '電気（TND / kWh）', w_p_dig: '消化槽（TND / m³）', w_p_gen: '発電機（TND / kW）', w_p_urea: '尿素50 kg袋（TND）',
      w_ref: '確認が必要な参考価格です。ご自分の価格を入力してください。',
      k_gas: 'バイオガス', k_gas_u: 'm³ / 年', k_bottles: '置き換えたガスボンベ', k_bottles_u: '年間使用{n}本のうち', k_elec: '電気', k_elec_u: 'kWh / 年',
      k_fert: '肥料', k_fert_u: '置き換えた尿素の袋（消化液{t} t）', k_co2: '削減したCO₂', k_co2_u: 't / 年', k_dig: '消化槽', k_dig_u: 'm³（建設）',
      w_none: '計算を始めるには、廃棄物を1つ以上入力してください。',
      w_cold: '冬は消化槽が冷え、夏より{p} %少ないガスしか作れません。地中に埋め、上に小さな温室を置くと効果的です。',
      w_src_t: 'ガスの出どころ', w_month_t: '月ごとの生産ガスと調理に使うガス', s_made: '生産ガス', s_cook: '調理に必要な量',
      sim_t: 'シミュレーション：1年を1日ずつ', sim_p: '消化槽がガスを作り、台所が使い、余りが電気になる様子を見てみましょう。',
      sim_play: 'シミュレーション開始', sim_pause: '一時停止', sim_reset: '最初から', sim_speed: '速さ',
      sim_day: '{d}日目 · {m}', sim_bag: 'ガスの蓄え', sim_made: '生産ガス', sim_cooked: 'バイオガスで作った食事', sim_bottles: '節約したボンベ', sim_kwh: '発電量', sim_short: 'ガスが足りなかった日',
      sim_meals: '食', sim_end: '1年終了：ボンベ{b}本を節約、{k} kWhを発電、ガス不足{s}日。',
      cost_t: '費用と回収', c_build: '建設費', c_save: '年間の節約', c_payback: '回収期間', c_years: '年', c_none: '—',
      c_note: '節約額には、置き換えたガス・電気・尿素を含みます。',
      method_t: '方法と前提',
      method_p: 'バイオガス収率は文献の代表値（FAO・GIZのガイド、新鮮な廃棄物）で、ご自分の廃棄物での試験による確認が必要です。メタン60 %のバイオガス（6 kWh/m³）、発電機効率25 %、13 kgボンベ1本≈調理用バイオガス29 m³。地中の無加温消化槽で、生産量は月の気温に従います。容量＝廃棄物と水の混合物×40日。'
    }
  });

  G.addStrings({
    fr: { "co_t": "Empreinte carbone et taxe carbone", "co_lead": "Ce que votre ferme émet chaque année, et ce que GAIA permet d’éviter.", "co_energy": "Énergie de pompage aujourd’hui", "co_diesel": "Diesel", "co_grid": "Réseau STEG", "co_solar": "Solaire", "co_kwh": "Énergie de pompage (kWh / an)", "co_kwh_auto": "Calculée depuis la page Eau & énergie : {v} kWh. Mettez votre valeur si vous la connaissez.", "co_kwh_none": "Remplissez la page Eau & énergie, ou mettez votre valeur.", "co_urea": "Sacs d’urée 50 kg achetés par an", "co_gaia_solar": "Avec GAIA, le pompage passe au solaire", "co_tax": "Prix du carbone (TND / t CO₂)", "co_today": "Aujourd’hui", "co_gaia": "Avec GAIA", "co_unit": "t CO₂e par an", "co_cut": "{p} % d’émissions en moins", "co_src": "Source", "co_tax_t": "Taxe carbone par an", "co_tax_saved": "Économisé", "co_pumping": "Pompage de l’eau", "co_cooking": "Gaz de cuisine", "co_fertiliser": "Engrais (urée)", "co_animals": "Digestion des animaux", "co_manure": "Fumier en tas (méthane)", "co_note": "La Tunisie n’applique pas encore de taxe carbone : le prix proposé (~70 € / t) est celui du marché européen, pour montrer ce que coûterait une tonne de CO₂.", "co_animals_note": "La digestion des animaux reste la plus grosse source : le digesteur ne la change pas.", "co_method": "Facteurs typiques (GIEC, à vérifier) : diesel 2,68 kg CO₂/L, réseau tunisien 0,46 kg/kWh, solaire 0,04 kg/kWh, bouteille de gaz 39 kg, sac d’urée ~230 kg CO₂e (fabrication + champ), vache 35 kg et mouton 5 kg de méthane par an (×28)." },
    ar: { "co_t": "البصمة الكربونية وضريبة الكربون", "co_lead": "ما تبعثه ضيعتك كل سنة، وما يساعد GAIA على تجنّبه.", "co_energy": "طاقة الضخ حاليًا", "co_diesel": "مازوط", "co_grid": "شبكة الستاغ", "co_solar": "شمسية", "co_kwh": "طاقة الضخ (ك.و.س / سنة)", "co_kwh_auto": "محسوبة من صفحة الماء والطاقة: {v} ك.و.س. أدخل قيمتك إن كنت تعرفها.", "co_kwh_none": "املأ صفحة الماء والطاقة، أو أدخل قيمتك.", "co_urea": "أكياس يوريا 50 كغ المشتراة في السنة", "co_gaia_solar": "مع GAIA، يصبح الضخ بالطاقة الشمسية", "co_tax": "سعر الكربون (د / طن CO₂)", "co_today": "اليوم", "co_gaia": "مع GAIA", "co_unit": "طن CO₂ مكافئ في السنة", "co_cut": "انبعاثات أقل بـ{p} %", "co_src": "المصدر", "co_tax_t": "ضريبة الكربون في السنة", "co_tax_saved": "الموفَّر", "co_pumping": "ضخ الماء", "co_cooking": "غاز الطبخ", "co_fertiliser": "السماد (يوريا)", "co_animals": "هضم الحيوانات", "co_manure": "الروث المكدّس (ميثان)", "co_note": "لا تطبّق تونس ضريبة كربون بعد: السعر المقترح (~70 € / طن) هو سعر السوق الأوروبية، لإظهار كلفة طن من CO₂.", "co_animals_note": "يبقى هضم الحيوانات أكبر مصدر: الهاضم لا يغيّره.", "co_method": "معاملات نموذجية (IPCC، يجب التحقق منها): مازوط 2,68 كغ CO₂/ل، الشبكة التونسية 0,46 كغ/ك.و.س، الشمسية 0,04 كغ/ك.و.س، قارورة غاز 39 كغ، كيس يوريا ~230 كغ CO₂ مكافئ، بقرة 35 كغ وخروف 5 كغ ميثان في السنة (×28)." },
    en: { "co_t": "Carbon footprint and carbon tax", "co_lead": "What your farm emits each year, and what GAIA helps avoid.", "co_energy": "Pumping energy today", "co_diesel": "Diesel", "co_grid": "STEG grid", "co_solar": "Solar", "co_kwh": "Pumping energy (kWh / year)", "co_kwh_auto": "Calculated from the Water & energy page: {v} kWh. Enter your own value if you know it.", "co_kwh_none": "Fill in the Water & energy page, or enter your value.", "co_urea": "50 kg urea bags bought per year", "co_gaia_solar": "With GAIA, pumping moves to solar", "co_tax": "Carbon price (TND / t CO₂)", "co_today": "Today", "co_gaia": "With GAIA", "co_unit": "t CO₂e per year", "co_cut": "{p} % fewer emissions", "co_src": "Source", "co_tax_t": "Carbon tax per year", "co_tax_saved": "Saved", "co_pumping": "Pumping water", "co_cooking": "Cooking gas", "co_fertiliser": "Fertiliser (urea)", "co_animals": "Animal digestion", "co_manure": "Manure heaps (methane)", "co_note": "Tunisia has no carbon tax yet: the price shown (~€70 / t) is the European market's, to show what a tonne of CO₂ would cost.", "co_animals_note": "Animal digestion stays the largest source: the digester does not change it.", "co_method": "Typical factors (IPCC, to check): diesel 2.68 kg CO₂/L, Tunisian grid 0.46 kg/kWh, solar 0.04 kg/kWh, gas bottle 39 kg, urea bag ~230 kg CO₂e (making + field), cow 35 kg and sheep 5 kg of methane per year (×28)." },
    ja: { "co_t": "カーボンフットプリントと炭素税", "co_lead": "農場が毎年出す排出量と、GAIAで減らせる量。", "co_energy": "現在の揚水エネルギー", "co_diesel": "ディーゼル", "co_grid": "STEG電力網", "co_solar": "太陽光", "co_kwh": "揚水エネルギー（kWh / 年）", "co_kwh_auto": "「水とエネルギー」ページから計算：{v} kWh。わかる場合はご自分の値を入力してください。", "co_kwh_none": "「水とエネルギー」ページを入力するか、値を入力してください。", "co_urea": "年間に買う尿素50 kg袋", "co_gaia_solar": "GAIAで揚水を太陽光に切り替える", "co_tax": "炭素価格（TND / t CO₂）", "co_today": "現在", "co_gaia": "GAIA導入後", "co_unit": "t CO₂e / 年", "co_cut": "排出量{p} %削減", "co_src": "排出源", "co_tax_t": "年間の炭素税", "co_tax_saved": "節約", "co_pumping": "揚水", "co_cooking": "調理用ガス", "co_fertiliser": "肥料（尿素）", "co_animals": "家畜の消化", "co_manure": "積まれたふん尿（メタン）", "co_note": "チュニジアにはまだ炭素税がありません。表示価格（約70ユーロ / t）は欧州市場の価格で、CO₂ 1トンのコストを示すためのものです。", "co_animals_note": "最大の排出源は家畜の消化で、消化槽では変わりません。", "co_method": "代表的な係数（IPCC、要確認）：ディーゼル2.68 kg CO₂/L、チュニジア電力網0.46 kg/kWh、太陽光0.04 kg/kWh、ガスボンベ39 kg、尿素1袋約230 kg CO₂e（製造＋圃場）、牛35 kg・羊5 kgのメタン/年（×28）。" }
  });

  G.mountShell('waste');
  var app = document.getElementById('app');

  // ---------------------------------------------------------------- inputs
  var REF = { bottle: 7.75, kwh: 0.25, digester_m3: 350, generator_kw: 2000, urea: 60, carbon: 240 };   // carbon ≈ €70 / t
  var PRESETS = {
    family: { cow: 2, small: 10, poultry: 30, share: 70, pomace: 0, margines: 0, residues: 1, food: 2, bottles: 2, gen: false },
    olive: { cow: 4, small: 30, poultry: 50, share: 60, pomace: 20, margines: 30, residues: 2, food: 3, bottles: 3, gen: true },
    coop: { cow: 25, small: 150, poultry: 300, share: 60, pomace: 120, margines: 200, residues: 20, food: 20, bottles: 20, gen: true }
  };
  var S = Object.assign({}, PRESETS.family, { p_bottle: '', p_kwh: '', p_dig: '', p_gen: '', p_urea: '', c_energy: 'diesel', c_kwh: '', c_urea: 10, c_solar: true, c_tax: '' }, G.load('gaia.waste.inputs', null) || {});
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; }
  function persist() { G.save('gaia.waste.inputs', S); }
  function price(k, r) { return num(S[k]) > 0 ? num(S[k]) : r; }

  // mean air temperature of each month: from the saved plot when there is one
  function monthlyTemp() {
    var p = G.getParcel(), cm = p && p.dna && p.dna.climateMonthly;
    if (cm && cm.tmax && cm.tmin && cm.tmax.length === 12) return cm.tmax.map(function (x, i) { return (x + cm.tmin[i]) / 2; });
    return null;
  }

  function field(id, key, label, hint, step) {
    return el('div', { class: 'gp-field' }, [
      el('label', { for: id }, [t(label)]),
      el('input', { id: id, type: 'number', min: '0', step: step || 'any', inputmode: 'decimal', value: S[key] === null || S[key] === undefined ? '' : S[key],
        oninput: function (e) { S[key] = num(e.target.value); persist(); stop(); draw(); } }),
      hint ? el('span', { class: 'hint' }, [t(hint)]) : null
    ]);
  }
  function priceField(id, key, label, ref) {
    return el('div', { class: 'gp-field' }, [
      el('label', { for: id }, [t(label)]),
      el('input', { id: id, type: 'number', min: '0', step: 'any', inputmode: 'decimal', placeholder: ref + ' (réf.)', value: S[key] || '',
        oninput: function (e) { S[key] = num(e.target.value); persist(); draw(); } })
    ]);
  }

  function inputs() {
    var presets = el('div', { class: 'ss-choice', style: 'margin-top:6px' }, ['family', 'olive', 'coop'].map(function (k) {
      return el('button', { type: 'button', onclick: function () { Object.assign(S, PRESETS[k]); persist(); stop(); renderAll(); } }, [t('w_p_' + k)]);
    }));
    return el('aside', { class: 'gp-card wa-in' }, [
      el('h2', null, [t('w_in_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;font-weight:600' }, [t('w_presets')]), presets,
      el('h3', { class: 'wa-h' }, [t('w_animals')]),
      field('wa-cow', 'cow', 'w_cow', null, '1'), field('wa-small', 'small', 'w_small', null, '1'), field('wa-poultry', 'poultry', 'w_poultry', null, '1'),
      field('wa-share', 'share', 'w_share', 'w_share_h', '5'),
      el('h3', { class: 'wa-h' }, [t('w_olive')]),
      field('wa-pomace', 'pomace', 'w_pomace'), field('wa-marg', 'margines', 'w_margines', 'w_olive_h'),
      el('h3', { class: 'wa-h' }, [t('w_other')]),
      field('wa-res', 'residues', 'w_residues'), field('wa-food', 'food', 'w_food'),
      el('h3', { class: 'wa-h' }, [t('w_use_t')]),
      field('wa-bottles', 'bottles', 'w_bottles', null, '1'),
      el('label', { class: 'wa-check' }, [
        el('input', { type: 'checkbox', checked: S.gen ? 'checked' : null, onchange: function (e) { S.gen = e.target.checked; persist(); stop(); draw(); } }),
        el('span', null, [t('w_gen')])
      ]),
      el('details', { class: 'gp-more', style: 'margin-top:12px' }, [
        el('summary', null, [t('w_prices')]),
        priceField('wa-pb', 'p_bottle', 'w_p_bottle', REF.bottle), priceField('wa-pk', 'p_kwh', 'w_p_kwh', REF.kwh),
        priceField('wa-pd', 'p_dig', 'w_p_dig', REF.digester_m3), priceField('wa-pg', 'p_gen', 'w_p_gen', REF.generator_kw),
        priceField('wa-pu', 'p_urea', 'w_p_urea', REF.urea),
        el('p', { class: 'assump', style: 'margin-top:6px' }, [t('w_ref')])
      ])
    ]);
  }

  function model() {
    var inp = {
      cow: num(S.cow), small: num(S.small), poultry: num(S.poultry), share_stable: num(S.share) !== null ? Math.min(100, Math.max(0, num(S.share))) / 100 : 1,
      pomace: num(S.pomace), margines: num(S.margines), residues: num(S.residues), food: num(S.food),
      temp: monthlyTemp(), bottles_month: num(S.bottles) || 0, generator: !!S.gen,
      prices: { bottle: price('p_bottle', REF.bottle), kwh: price('p_kwh', REF.kwh), digester_m3: price('p_dig', REF.digester_m3), generator_kw: price('p_gen', REF.generator_kw) }
    };
    var r = W.compute(inp);
    var urea = price('p_urea', REF.urea);
    r.totals.saved_tnd_year += r.totals.urea_bags * urea;                  // fertiliser bought less
    r.totals.payback_years = r.totals.saved_tnd_year > 0 && r.totals.cost_tnd > 0 ? r.totals.cost_tnd / r.totals.saved_tnd_year : null;
    return { inp: inp, r: r };
  }

  // ---------------------------------------------------------------- results
  var out, SIM = { timer: null, day: 0, data: null, speed: 1, ui: null };
  function stop() { if (SIM.timer) { clearInterval(SIM.timer); SIM.timer = null; } SIM.day = 0; SIM.data = null; }

  function kpi(label, value, unit, hi) {
    return el('div', { class: 'kpi' + (hi ? ' hi' : '') }, [el('b', null, [label]), el('div', { class: 'v' }, [value]), el('span', { class: 'u' }, [unit])]);
  }

  function draw() {
    if (!out) return;
    stop();                                                  // a new result restarts the simulation
    var se = document.scrollingElement || document.documentElement, y = se.scrollTop;
    out.style.minHeight = out.offsetHeight + 'px';
    G.clear(out);
    var M = model(), r = M.r, T = r.totals, months = G.t('months');
    if (!(T.gas_m3 > 0)) {
      out.appendChild(el('div', { class: 'gp-card' }, [G.note('info', t('w_none'))]));
      out.appendChild(carbonCard(M));
      finish(); return;
    }

    // 1. what you get
    out.appendChild(el('div', { class: 'gp-card' }, [el('div', { class: 'kpis' }, [
      kpi(t('k_gas'), fmt(T.gas_m3) + ' m³', t('k_gas_u'), true),
      kpi(t('k_bottles'), fmt(T.bottles), t('k_bottles_u').replace('{n}', fmt(T.need_bottles))),
      kpi(t('k_elec'), S.gen ? fmt(T.kwh_elec) + ' kWh' : '—', t('k_elec_u')),
      kpi(t('k_fert'), fmt(T.urea_bags, 1), t('k_fert_u').replace('{t}', fmt(T.digestate_t, 1))),
      kpi(t('k_co2'), fmt(T.co2_t, 1), t('k_co2_u')),
      kpi(t('k_dig'), fmt(T.digester_m3), t('k_dig_u'))
    ])]));
    var fs = r.months.map(function (x) { return x.factor; });
    var lost = Math.round((1 - Math.min.apply(null, fs) / Math.max.apply(null, fs)) * 100);
    if (lost >= 20) out.appendChild(el('div', { style: 'margin-top:12px' }, [G.note('info', t('w_cold').replace('{p}', lost))]));

    // 2. the simulation
    out.appendChild(simCard(M));

    // 3. month by month + sources
    var chart = el('div');
    var srcRows = Object.keys(r.by_source).sort(function (a, b) { return r.by_source[b] - r.by_source[a]; });
    var srcName = { cow: 'w_cow', small: 'w_small', poultry: 'w_poultry', pomace: 'w_pomace', margines: 'w_margines', residues: 'w_residues', food: 'w_food' };
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('h2', null, [t('w_month_t')]), chart,
      el('h3', { style: 'margin-top:14px' }, [t('w_src_t')]),
      el('div', { class: 'wa-bars' }, srcRows.map(function (k) {
        var share = r.by_source[k] / T.gas_m3;
        return el('div', { class: 'wa-bar' }, [
          el('span', null, [t(srcName[k]).replace(/ \(.*\)$/, '')]),
          el('i', null, [el('b', { style: 'width:' + Math.max(2, share * 100).toFixed(1) + '%' })]),
          el('span', { class: 'num' }, [fmt(share * 100) + ' %'])
        ]);
      }))
    ]));
    setTimeout(function () {
      G.barChart(chart, { labels: months, unit: 'm³', title: t('w_month_t'), series: [
        { name: t('s_made'), color: '#5E8C4A', values: r.months.map(function (x) { return x.gas; }) },
        { name: t('s_cook'), color: '#D9B86A', values: r.months.map(function (x) { return M.inp.bottles_month * W.M3_PER_BOTTLE * W.DAYS[x.m] * 12 / 365; }) }
      ] });
    }, 0);

    // 4. cost
    out.appendChild(el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('h2', null, [t('cost_t')]),
      el('div', { class: 'kpis', style: 'margin-top:10px' }, [
        kpi(t('c_build'), fmt(T.cost_tnd) + ' TND', T.generator_kw ? fmt(T.digester_m3) + ' m³ + ' + fmt(T.generator_kw, 1) + ' kW' : fmt(T.digester_m3) + ' m³'),
        kpi(t('c_save'), fmt(T.saved_tnd_year) + ' TND', ''),
        kpi(t('c_payback'), T.payback_years ? fmt(T.payback_years, 1) + ' ' + t('c_years') : t('c_none'), '', true)
      ]),
      el('p', { class: 'assump', style: 'margin-top:8px' }, [t('c_note') + ' ' + t('w_ref')])
    ]));

    // 5. carbon footprint and carbon tax
    out.appendChild(carbonCard(M));

    // 6. method
    out.appendChild(el('details', { class: 'gp-card gp-more', style: 'margin-top:16px' }, [
      el('summary', null, [t('method_t')]),
      el('p', { class: 'small', style: 'margin-top:8px;color:var(--g-ink-2)' }, [t('method_p')])
    ]));
    finish();

    function finish() {
      se.scrollTop = y;
      setTimeout(function () { out.style.minHeight = ''; }, 80);
    }
  }


  // ---------------------------------------------------------------- carbon footprint and carbon tax
  // pumping energy of a year, from the Water & energy page's settings and the plot's climate
  function pumpKwhFromNexus() {
    var N = window.GAIA_NEXUS, p = G.getParcel(), cm = p && p.dna && p.dna.climateMonthly, sv = G.load('gaia.nexus.inputs', null);
    if (!N || !cm || !cm.et0 || !cm.rain || !sv || !sv.values) return null;
    var v = sv.values, n = function (x, d) { var y = num(x); return y > 0 ? y : d; };
    var crop = N.CROPS[v.crop] ? v.crop : 'other';
    var r = N.compute({ et0: cm.et0, rain: cm.rain, ghi: cm.ghi || null, kc: n(v.kc, N.CROPS[crop].kc || 0.65), months: v.months || N.CROPS[crop].months,
      area_ha: n(v.area, 1), ea: n(v.ea, 0.9), head_m: n(v.head, 40), pump_eff: n(v.pump_eff, 0.45), pr: n(v.pr, 0.75), prices: {} });
    return r.totals && r.totals.kwh > 0 ? r.totals.kwh : null;
  }

  function carbonCard(M) {
    var T = M.r.totals, auto = pumpKwhFromNexus();
    var kwh = num(S.c_kwh) > 0 ? num(S.c_kwh) : (auto || 0);
    var c = W.carbon({
      pump_kwh: kwh, energy: S.c_energy, urea_bags: num(S.c_urea) || 0, bottles_year: T.need_bottles || 0,
      cow: num(S.cow), small: num(S.small), poultry: num(S.poultry), share_stable: M.inp.share_stable,
      gaia: { solar: !!S.c_solar, bottles_saved: T.bottles || 0, urea_saved: T.urea_bags || 0, kwh_biogas: S.gen ? T.kwh_elec || 0 : 0 },
      tax_tnd_t: price('c_tax', REF.carbon)
    });
    var redraw = function () { persist(); draw(); };
    var energyBtns = el('div', { class: 'ss-choice', role: 'group', 'aria-label': t('co_energy') }, ['diesel', 'grid', 'solar'].map(function (k) {
      return el('button', { type: 'button', 'aria-pressed': String(S.c_energy === k), onclick: function () { S.c_energy = k; redraw(); } }, [t('co_' + k)]);
    }));
    var small = function (id, key, label, ph) {
      return el('div', { class: 'gp-field', style: 'width:200px' }, [el('label', { for: id }, [t(label)]),
        el('input', { id: id, type: 'number', min: '0', step: 'any', inputmode: 'decimal', placeholder: ph || '', value: S[key] === null || S[key] === undefined ? '' : S[key],
          onchange: function (e) { S[key] = num(e.target.value); redraw(); } })]);
    };
    var rows = ['pumping', 'cooking', 'fertiliser', 'manure', 'animals'];
    var big = function (label, v, hi) {
      return el('div', { class: 'kpi' + (hi ? ' hi' : '') }, [el('b', null, [label]), el('div', { class: 'v' }, [fmt(v, 1) + ' t']), el('span', { class: 'u' }, [t('co_unit')])]);
    };
    var max = Math.max.apply(null, rows.map(function (k) { return c.today[k]; })) || 1;
    return el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('h2', null, [t('co_t')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('co_lead')]),
      el('p', { class: 'small', style: 'margin-top:12px;font-weight:600' }, [t('co_energy')]), energyBtns,
      el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-top:10px' }, [
        small('co-kwh', 'c_kwh', 'co_kwh', auto ? String(Math.round(auto)) : ''),
        small('co-urea', 'c_urea', 'co_urea'),
        small('co-tax', 'c_tax', 'co_tax', REF.carbon + ' (réf.)')
      ]),
      el('p', { class: 'assump', style: 'margin-top:6px' }, [auto ? t('co_kwh_auto').replace('{v}', fmt(auto)) : t('co_kwh_none')]),
      el('label', { class: 'wa-check' }, [el('input', { type: 'checkbox', checked: S.c_solar ? 'checked' : null, onchange: function (e) { S.c_solar = e.target.checked; redraw(); } }),
        el('span', null, [t('co_gaia_solar')])]),
      el('div', { class: 'kpis', style: 'margin-top:14px' }, [
        big(t('co_today'), c.t_today), big(t('co_gaia'), c.t_gaia, true),
        el('div', { class: 'kpi' }, [el('b', null, [t('co_tax_t')]), el('div', { class: 'v' }, [fmt(c.tax_today) + ' → ' + fmt(c.tax_gaia)]),
          el('span', { class: 'u' }, ['TND · ' + t('co_tax_saved') + ' ' + fmt(c.tax_saved) + ' TND'])])
      ]),
      c.cut > 0 ? el('div', { style: 'margin-top:10px' }, [G.note('ok', t('co_cut').replace('{p}', fmt(c.cut * 100)))]) : null,
      el('div', { class: 'gp-table-wrap', style: 'margin-top:12px' }, [el('table', { class: 'gp-table' }, [
        el('thead', null, [el('tr', null, [el('th', null, [t('co_src')]), el('th', { class: 'num' }, [t('co_today')]), el('th', { class: 'num' }, [t('co_gaia')]), el('th', null, [''])])]),
        el('tbody', null, rows.map(function (k) {
          return el('tr', null, [el('td', null, [t('co_' + k)]), el('td', { class: 'num' }, [fmt(c.today[k] / 1000, 2) + ' t']),
            el('td', { class: 'num' }, [el('b', null, [fmt(c.gaia[k] / 1000, 2) + ' t'])]),
            el('td', { style: 'width:30%' }, [el('div', { class: 'wa-bar', style: 'grid-template-columns:1fr' }, [el('i', null, [el('b', { style: 'width:' + Math.max(1, c.gaia[k] / max * 100).toFixed(1) + '%' })])])])]);
        }))
      ])]),
      c.today.animals > c.t_today * 1000 * 0.3 ? el('p', { class: 'assump', style: 'margin-top:8px' }, [t('co_animals_note')]) : null,
      el('p', { class: 'assump', style: 'margin-top:6px' }, [t('co_note')]),
      el('details', { class: 'gp-more', style: 'margin-top:8px' }, [el('summary', null, [t('method_t')]), el('p', { class: 'small', style: 'margin-top:6px' }, [t('co_method')])])
    ]);
  }

  // ---------------------------------------------------------------- day-by-day simulation
  function simCard(M) {
    var data = W.daily(M.inp, M.r);
    SIM.data = data;
    var months = G.t('months');
    var gauge = el('div', { class: 'wa-gauge' }, [el('i')]);
    var dayLab = el('div', { class: 'wa-day' });
    var prog = el('div', { class: 'wa-prog' }, [el('i')]);
    var cells = {};
    function cell(k, label) { cells[k] = el('div', { class: 'v' }); return el('div', { class: 'kpi' }, [el('b', null, [label]), cells[k]]); }
    var stats = el('div', { class: 'kpis', style: 'margin-top:12px' }, [
      cell('made', t('sim_made')), cell('meals', t('sim_cooked')), cell('bottles', t('sim_bottles')), cell('kwh', t('sim_kwh')), cell('short', t('sim_short'))
    ]);
    var endNote = el('div', { style: 'margin-top:10px' });
    var playBtn = el('button', { type: 'button', class: 'gp-btn sm primary', onclick: function () { SIM.timer ? pause() : play(); } });
    var resetBtn = el('button', { type: 'button', class: 'gp-btn sm ghost', onclick: function () { pause(); SIM.day = 0; paint(); } }, [G.iconText('refresh', t('sim_reset'))]);
    var speed = el('div', { class: 'ss-choice', role: 'group', 'aria-label': t('sim_speed') }, [1, 3, 10].map(function (s) {
      return el('button', { type: 'button', 'aria-pressed': String(SIM.speed === s), onclick: function (e) {
        SIM.speed = s; [].forEach.call(e.target.parentNode.children, function (b) { b.setAttribute('aria-pressed', String(b === e.target)); });
      } }, ['×' + s]);
    }));

    function totals(n) {
      var a = { made: 0, cook: 0, kwh: 0, short: 0 };
      for (var i = 0; i < n; i++) { var d = data[i]; a.made += d.made; a.cook += d.cook; a.kwh += d.kwh; if (d.short > 0.01) a.short++; }
      return a;
    }
    function paint() {
      var n = SIM.day, d = data[Math.max(0, n - 1)] || data[0], a = totals(n);
      gauge.firstChild.style.height = Math.round((n ? d.bag : 0.5) * 100) + '%';
      gauge.setAttribute('aria-label', t('sim_bag') + ' ' + Math.round((n ? d.bag : 0.5) * 100) + ' %');
      dayLab.textContent = t('sim_day').replace('{d}', n).replace('{m}', months[(data[Math.max(0, n - 1)] || data[0]).m]);
      prog.firstChild.style.width = (n / data.length * 100).toFixed(1) + '%';
      cells.made.textContent = fmt(a.made) + ' m³';
      cells.meals.textContent = fmt(a.cook / 0.15) + ' ' + t('sim_meals');                // ≈ 0.15 m³ of biogas per family meal
      cells.bottles.textContent = fmt(a.cook / W.M3_PER_BOTTLE, 1);
      cells.kwh.textContent = S.gen ? fmt(a.kwh) + ' kWh' : '—';
      cells.short.textContent = fmt(a.short);
      playBtn.replaceChildren(G.iconText(SIM.timer ? 'pause' : 'play', t(SIM.timer ? 'sim_pause' : 'sim_play')));
      G.clear(endNote);
      if (n >= data.length) endNote.appendChild(G.note('ok', t('sim_end').replace('{b}', fmt(a.cook / W.M3_PER_BOTTLE, 1)).replace('{k}', fmt(a.kwh)).replace('{s}', fmt(a.short))));
    }
    function play() {
      if (SIM.day >= data.length) SIM.day = 0;
      SIM.timer = setInterval(function () {
        SIM.day = Math.min(data.length, SIM.day + SIM.speed);
        if (SIM.day >= data.length) pause();
        paint();
      }, 40);
      paint();
    }
    function pause() { if (SIM.timer) { clearInterval(SIM.timer); SIM.timer = null; } paint(); }
    paint();

    return el('div', { class: 'gp-card', style: 'margin-top:16px' }, [
      el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [el('h2', null, [t('sim_t')]), G.pill('demo', 'Simulation')]),
      el('p', { class: 'small', style: 'margin-top:6px;color:var(--g-ink-2)' }, [t('sim_p')]),
      el('div', { class: 'wa-sim' }, [
        el('div', { class: 'wa-tank' }, [gauge, el('span', { class: 'small muted' }, [t('sim_bag')])]),
        el('div', { style: 'flex:1;min-width:0' }, [dayLab, prog,
          el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px' }, [playBtn, resetBtn, speed])])
      ]),
      stats, endNote
    ]);
  }

  function renderAll() {
    var se = document.scrollingElement || document.documentElement, y = se.scrollTop;
    G.clear(app);
    app.appendChild(el('div', { class: 'gp-principle', style: 'margin-bottom:18px' }, [t('w_principle')]));
    out = el('div', { 'aria-live': 'polite' });
    app.appendChild(el('div', { class: 'wa' }, [inputs(), out]));
    draw();
    se.scrollTop = y;
  }
  renderAll();
  G.onLang(function () { stop(); renderAll(); });
}());
