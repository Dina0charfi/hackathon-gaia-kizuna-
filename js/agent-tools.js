/* ==========================================================================
   GAIA Farm Agent — the tools.

   Each tool wraps one of GAIA's own modules, so the agent measures before it
   advises: Land DNA (landdna.js), FAO-56 water need (nexus-core.js), the
   groundwater guard (guard-core.js), the compatibility engine (engine-core.js),
   Solar Brain (agv-ai-core.js), live weather (Open-Meteo), weather-driven
   disease risk, the last plant-health photo check and the knowledge records.

   A tool returns { summary, data }: `summary` is one line for the farmer,
   `data` is the compact evidence the language model reads. A tool never
   invents a value: what it cannot compute is listed in data.missing.
   ========================================================================== */
(function (global) {
  'use strict';
  var G = global.GAIA, D = global.GAIA_DNA, N = global.GAIA_NEXUS, GG = global.GAIA_GUARD,
    E = global.GAIA_ENGINE, A = global.GAIA_AGV_AI, KB = global.GAIA_KB, R = global.GAIA_RETRIEVAL;

  var ctx = { parcel: null };
  function parcel() { return ctx.parcel || G.getParcel(); }
  function r1(x, d) { if (x === null || x === undefined || isNaN(x)) return null; var k = Math.pow(10, d || 0); return Math.round(x * k) / k; }
  function V(dna, p) { return D.value(dna, p); }
  function L() { return G.lang ? G.lang() : 'fr'; }
  function W(o) { var l = L(); return o[l] !== undefined ? o[l] : (o.en !== undefined ? o.en : o.fr); }
  function today() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function needPlot() {
    var p = parcel();
    if (!p || !p.dna) { var e = new Error('no_plot'); e.hint = 'Call find_place then build_land_dna first.'; throw e; }
    return p;
  }

  /* -------------------------------------------------------------- places (offline first) */
  var PLACES = [
    ['tunis', 36.806, 10.181], ['ariana', 36.862, 10.195], ['ben arous', 36.753, 10.218], ['manouba', 36.81, 10.097], ['nabeul', 36.456, 10.735],
    ['zaghouan', 36.402, 10.143], ['bizerte', 37.274, 9.874], ['beja', 36.726, 9.182], ['jendouba', 36.501, 8.78], ['kef', 36.182, 8.715],
    ['siliana', 36.085, 9.371], ['sousse', 35.825, 10.636], ['monastir', 35.778, 10.826], ['mahdia', 35.504, 11.062], ['sfax', 34.74, 10.76],
    ['kairouan', 35.678, 10.096], ['kasserine', 35.168, 8.836], ['sidi bouzid', 35.038, 9.484], ['gabes', 33.881, 10.098], ['medenine', 33.355, 10.505],
    ['tataouine', 32.929, 10.452], ['gafsa', 34.425, 8.784], ['tozeur', 33.919, 8.134], ['kebili', 33.705, 8.969], ['djerba', 33.807, 10.845],
    ['matmata', 33.543, 9.968], ['nefta', 33.873, 7.877], ['douz', 33.457, 9.021], ['zarzis', 33.504, 11.112], ['cap bon', 36.85, 10.9],
    ['testour', 36.551, 9.443], ['chebika', 34.317, 7.937], ['el jem', 35.296, 10.707], ['msaken', 35.729, 10.58], ['beni khedache', 33.25, 10.2]
  ];
  var AR_PLACES = { 'تونس': 'tunis', 'صفاقس': 'sfax', 'سوسة': 'sousse', 'القيروان': 'kairouan', 'سيدي بوزيد': 'sidi bouzid', 'قابس': 'gabes', 'مدنين': 'medenine',
    'تطاوين': 'tataouine', 'قفصة': 'gafsa', 'توزر': 'tozeur', 'قبلي': 'kebili', 'جربة': 'djerba', 'نابل': 'nabeul', 'بنزرت': 'bizerte', 'باجة': 'beja', 'الكاف': 'kef',
    'المهدية': 'mahdia', 'المنستير': 'monastir', 'القصرين': 'kasserine', 'زغوان': 'zaghouan', 'سليانة': 'siliana', 'جندوبة': 'jendouba', 'مطماطة': 'matmata' };
  var JA_PLACES = { 'チュニス': 'tunis', 'スファックス': 'sfax', 'スース': 'sousse', 'カイルアン': 'kairouan', 'ケルアン': 'kairouan', 'シディ・ブジッド': 'sidi bouzid', 'シディブジッド': 'sidi bouzid',
    'ガベス': 'gabes', 'メドニン': 'medenine', 'タタウィン': 'tataouine', 'ガフサ': 'gafsa', 'トズール': 'tozeur', 'ケビリ': 'kebili', 'ジェルバ': 'djerba', 'ナブール': 'nabeul',
    'ビゼルト': 'bizerte', 'ベジャ': 'beja', 'ケフ': 'kef', 'マハディア': 'mahdia', 'モナスティール': 'monastir', 'カセリーヌ': 'kasserine', 'マトマタ': 'matmata', 'ザグアン': 'zaghouan' };
  Object.keys(JA_PLACES).forEach(function (k) { AR_PLACES[k] = JA_PLACES[k]; });
  // Typical monthly global horizontal irradiation for central Tunisia (kWh/m²/day, NASA POWER order of magnitude),
  // used only when the plot has no sun data (offline demo); flagged as approximate in the result.
  var GHI_TN = [3.0, 3.9, 5.1, 6.2, 7.1, 7.8, 7.8, 7.0, 5.7, 4.4, 3.3, 2.8];
  function ghiOf(dna) {
    var SM = dna.solarMonthly, CM = dna.climateMonthly;
    var g = SM && SM.ghi && SM.ghi.every(function (v) { return v > 0; }) ? SM.ghi : (CM && CM.ghi && CM.ghi.every(function (v) { return v > 0; }) ? CM.ghi : null);
    return g ? { ghi: g, approx: false } : { ghi: GHI_TN, approx: true };
  }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z؀-ۿ぀-鿿 ]+/g, ' ').trim(); }
  function placeIn(text) {
    var f = ' ' + fold(text) + ' ', best = null;
    PLACES.forEach(function (p) { if (f.indexOf(' ' + p[0] + ' ') !== -1 && (!best || p[0].length > best[0].length)) best = p; });
    Object.keys(AR_PLACES).forEach(function (k) { if (String(text).indexOf(k) !== -1) best = PLACES.filter(function (p) { return p[0] === AR_PLACES[k]; })[0]; });
    return best ? { name: best[0].replace(/\b\w/g, function (c) { return c.toUpperCase(); }), lat: best[1], lon: best[2], source: 'GAIA gazetteer (town centre)' } : null;
  }

  /* -------------------------------------------------------------- weather */
  var wxCache = {};
  function forecast(p) {
    var key = p.lat.toFixed(3) + ',' + p.lon.toFixed(3);
    if (wxCache[key]) return wxCache[key];
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat.toFixed(3) + '&longitude=' + p.lon.toFixed(3) +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,wind_speed_10m_max,relative_humidity_2m_mean' +
      '&hourly=temperature_2m,relative_humidity_2m,precipitation&past_days=30&forecast_days=16&timezone=auto';
    wxCache[key] = D.forecastJSON(url, 60, 15000).then(function (j) {
      var d = j.daily, h = j.hourly;
      var days = d.time.map(function (t, i) {
        return { date: t, tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i], rain: d.precipitation_sum[i], et0: d.et0_fao_evapotranspiration[i],
          wind: d.wind_speed_10m_max[i], rh: d.relative_humidity_2m_mean ? d.relative_humidity_2m_mean[i] : null };
      });
      var hours = h.time.map(function (t, i) { return { t: t, temp: h.temperature_2m[i], rh: h.relative_humidity_2m[i], rain: h.precipitation[i] }; });
      return { days: days, hours: hours, source: 'Open-Meteo forecast (ECMWF / DWD ICON / Météo-France blend)' };
    });
    wxCache[key].catch(function () { delete wxCache[key]; });
    return wxCache[key];
  }
  function split(wx) {
    var t0 = today();
    return { past: wx.days.filter(function (d) { return d.date < t0; }), next: wx.days.filter(function (d) { return d.date >= t0; }) };
  }

  /* -------------------------------------------------------------- crop keys */
  function cropKey(c) {
    c = fold(c || '');
    if (/oliv|zitoun|زيتون|オリーブ/.test(c)) return 'olive';
    if (/palm|dat|nakhl|نخيل|ナツメヤシ|deglet/.test(c)) return 'palm';
    if (/citr|agrum|orang|lemon|citron|قوارص|柑橘/.test(c)) return 'citrus';
    if (/ble|wheat|cereal|orge|barley|قمح|شعير|小麦|穀物/.test(c)) return 'cereal';
    if (/tomat|طماطم|トマト/.test(c)) return 'tomato';
    if (/pomme de terre|potato|batata|بطاطا|ジャガイモ/.test(c)) return 'potato';
    if (/piment|pepper|felfel|فلفل|ピーマン/.test(c)) return 'pepper';
    if (/vigne|grape|raisin|عنب|ブドウ/.test(c)) return 'grape';
    if (/veg|maraich|خضر|野菜/.test(c)) return 'veg';
    return c ? 'other' : null;
  }
  function nexusCrop(k) { return k === 'tomato' || k === 'potato' || k === 'pepper' ? 'veg' : (k === 'grape' ? 'other' : k); }
  function plotCrop(p, override) { return cropKey(override) || cropKey(V(p.dna, 'crop')) || null; }

  /* -------------------------------------------------------------- disease risk models */
  // Indicative infection-risk rules from the literature, computed on the hourly forecast. They flag weather that
  // favours an infection; they are not a diagnosis. Every rule cites its source.
  var RISK_MODELS = {
    olive: [{
      id: 'peacock_spot', name: { fr: 'Œil de paon (Venturia oleaginea)', en: 'Olive peacock spot (Venturia oleaginea)', ar: 'عين الطاووس', ja: 'オリーブ孔雀斑病' },
      scout: { fr: 'inspecter 20 feuilles du bas de la frondaison (taches rondes)', en: 'inspect 20 leaves low in the canopy (round spots)', ar: 'افحص 20 ورقة من أسفل الشجرة (بقع دائرية)', ja: '樹冠下部の葉20枚を点検（円形の斑点）' },
      rule: 'wet leaves (RH ≥ 90 % or rain) for ≥ 12 h with 8–24 °C',
      src: 'Viruega et al. 2011, Plant Disease 95:1139 (infection needs 12–24 h wetness between 5 and 25 °C, optimum 15 °C)',
      test: function (hrs) { return wetRuns(hrs, 8, 24, 12); }
    }, {
      id: 'olive_fly', name: { fr: 'Mouche de l\'olive (Bactrocera oleae)', en: 'Olive fruit fly (Bactrocera oleae)', ar: 'ذبابة الزيتون', ja: 'オリーブミバエ' },
      scout: { fr: 'relever les pièges jaunes / à phéromone deux fois par semaine', en: 'check yellow / pheromone traps twice a week', ar: 'تفقّد المصائد الصفراء / الفرمونية مرتين في الأسبوع', ja: '黄色・フェロモントラップを週2回確認' },
      rule: 'days with mean 20–30 °C and max < 35 °C (adult activity, egg laying in fruit)',
      src: 'Wang et al. 2009, Ecol. Model.; Tunisian IO extension notes (activity drops above 35 °C)',
      test: function (hrs, days) { return days.filter(function (d) { var m = (d.tmax + d.tmin) / 2; return m >= 20 && m <= 30 && d.tmax < 35; }).map(function (d) { return { date: d.date, hours: 24 }; }); }
    }],
    grape: [{
      id: 'downy_mildew', name: { fr: 'Mildiou (Plasmopara viticola), règle 3-10', en: 'Downy mildew (Plasmopara viticola), 3-10 rule', ar: 'البياض الزغبي', ja: 'べと病（3-10ルール）' },
      scout: { fr: 'chercher les taches d\'huile sur les feuilles 5 à 10 jours après la pluie', en: 'look for oil spots on leaves 5–10 days after the rain', ar: 'ابحث عن بقع زيتية على الأوراق بعد 5 إلى 10 أيام من المطر', ja: '雨の5〜10日後に葉の油染み状の斑点を探す' },
      rule: '≥ 10 mm rain in 24 h with mean ≥ 10 °C (shoots ≥ 10 cm)',
      src: 'Baldacci 1947 "3-10 rule", in Rossi et al. 2008, Ecol. Model. 212:480',
      test: function (hrs, days) { return days.filter(function (d) { return d.rain >= 10 && (d.tmax + d.tmin) / 2 >= 10; }).map(function (d) { return { date: d.date, hours: 24 }; }); }
    }, {
      id: 'powdery_mildew', name: { fr: 'Oïdium (Erysiphe necator)', en: 'Powdery mildew (Erysiphe necator)', ar: 'البياض الدقيقي', ja: 'うどんこ病' },
      scout: { fr: 'inspecter le dessous des feuilles et les grappes (poudre blanche)', en: 'inspect leaf undersides and bunches (white powder)', ar: 'افحص ظهر الأوراق والعناقيد (مسحوق أبيض)', ja: '葉裏と房を点検（白い粉）' },
      rule: '≥ 6 consecutive hours between 21 and 30 °C (Gubler–Thomas index)',
      src: 'Gubler et al. 1999, Plant Disease 83:795',
      test: function (hrs) { return tempRuns(hrs, 21, 30, 6); }
    }],
    tomato: [{
      id: 'late_blight', name: { fr: 'Mildiou (Phytophthora infestans)', en: 'Late blight (Phytophthora infestans)', ar: 'اللفحة المتأخرة', ja: '疫病' },
      scout: { fr: 'inspecter les feuilles basses (taches brunes huileuses, duvet blanc dessous)', en: 'inspect lower leaves (oily brown patches, white down beneath)', ar: 'افحص الأوراق السفلية (بقع بنية زيتية)', ja: '下葉を点検（油状の褐色斑、裏に白いかび）' },
      rule: 'Hutton criteria: 2 days with min ≥ 10 °C and ≥ 6 h RH ≥ 90 %',
      src: 'Dancey et al. 2017, Plant Pathology 66:1269 (Hutton criteria, replacing the Smith period)',
      test: hutton
    }],
    potato: [{
      id: 'late_blight', name: { fr: 'Mildiou (Phytophthora infestans)', en: 'Late blight (Phytophthora infestans)', ar: 'اللفحة المتأخرة', ja: '疫病' },
      scout: { fr: 'inspecter les feuilles basses (taches brunes huileuses, duvet blanc dessous)', en: 'inspect lower leaves (oily brown patches, white down beneath)', ar: 'افحص الأوراق السفلية (بقع بنية زيتية)', ja: '下葉を点検（油状の褐色斑、裏に白いかび）' },
      rule: 'Hutton criteria: 2 days with min ≥ 10 °C and ≥ 6 h RH ≥ 90 %',
      src: 'Dancey et al. 2017, Plant Pathology 66:1269',
      test: hutton
    }],
    citrus: [{
      id: 'alternaria', name: { fr: 'Alternariose (Alternaria alternata)', en: 'Alternaria brown spot', ar: 'التبقع البني', ja: '褐色斑点病' },
      scout: { fr: 'inspecter les jeunes feuilles et fruits (taches brunes à halo jaune)', en: 'inspect young leaves and fruit (brown spots, yellow halo)', ar: 'افحص الأوراق والثمار الفتية (بقع بنية بهالة صفراء)', ja: '若葉と果実を点検（黄色いかさのある褐色斑）' },
      rule: 'wet leaves (RH ≥ 90 % or rain) for ≥ 10 h with 20–29 °C',
      src: 'Timmer et al. 2000, Phytopathology 90:1279 (infection 8–12 h wetness, optimum 20–27 °C)',
      test: function (hrs) { return wetRuns(hrs, 20, 29, 10); }
    }],
    palm: [{
      id: 'heat_stress', name: { fr: 'Stress de chaleur au nouaison', en: 'Heat stress at fruit set', ar: 'إجهاد حراري', ja: '結実期の高温ストレス' },
      scout: { fr: 'irriguer la veille, vérifier la chute de fruits', en: 'irrigate the day before, check fruit drop', ar: 'اسقِ في اليوم السابق وتفقّد تساقط الثمار', ja: '前日に灌水し、落果を確認' }, rule: 'days with Tmax ≥ 45 °C', src: 'FAO Date palm cultivation (2002), ch. 6',
      test: function (hrs, days) { return days.filter(function (d) { return d.tmax >= 45; }).map(function (d) { return { date: d.date, hours: 24 }; }); }
    }]
  };
  function wet(h) { return (h.rh !== null && h.rh >= 90) || (h.rain || 0) > 0.1; }
  function wetRuns(hrs, tlo, thi, need) { return runs(hrs, function (h) { return wet(h) && h.temp >= tlo && h.temp <= thi; }, need); }
  function tempRuns(hrs, tlo, thi, need) { return runs(hrs, function (h) { return h.temp >= tlo && h.temp <= thi; }, need); }
  function runs(hrs, ok, need) {
    var out = [], n = 0, start = null;
    hrs.forEach(function (h, i) {
      if (ok(h)) { if (!n) start = h.t; n++; } else { if (n >= need) out.push({ date: start.slice(0, 10), hours: n }); n = 0; }
      if (i === hrs.length - 1 && n >= need) out.push({ date: start.slice(0, 10), hours: n });
    });
    // one event per day
    var seen = {}; return out.filter(function (e) { if (seen[e.date]) return false; seen[e.date] = 1; return true; });
  }
  function hutton(hrs) {
    var byDay = {};
    hrs.forEach(function (h) { var d = h.t.slice(0, 10); (byDay[d] = byDay[d] || []).push(h); });
    var dates = Object.keys(byDay).sort(), ok = dates.map(function (d) {
      var hs = byDay[d], tmin = Math.min.apply(null, hs.map(function (h) { return h.temp; })), wetH = hs.filter(function (h) { return h.rh >= 90; }).length;
      return tmin >= 10 && wetH >= 6;
    }), out = [];
    for (var i = 1; i < dates.length; i++) if (ok[i] && ok[i - 1]) out.push({ date: dates[i], hours: 48 });
    return out;
  }

  /* -------------------------------------------------------------- tool table */
  var TOOLS = [
    {
      name: 'find_place',
      description: 'Find the coordinates of a Tunisian town or area named by the farmer (offline gazetteer first, then Open-Meteo geocoding).',
      parameters: { type: 'object', properties: { name: { type: 'string', description: 'town, delegation or governorate' } }, required: ['name'] },
      run: function (a) {
        var hit = placeIn(a.name);
        if (hit) return Promise.resolve({ summary: hit.name + ' · ' + hit.lat.toFixed(3) + ', ' + hit.lon.toFixed(3), data: hit });
        var url = 'https://geocoding-api.open-meteo.com/v1/search?count=5&language=fr&name=' + encodeURIComponent(a.name);
        return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          var res = (j.results || []).sort(function (x, y) { return (y.country_code === 'TN') - (x.country_code === 'TN'); })[0];
          if (!res) throw new Error('place not found: ' + a.name);
          var o = { name: res.name + (res.admin1 ? ', ' + res.admin1 : ''), lat: res.latitude, lon: res.longitude, country: res.country_code, source: 'Open-Meteo geocoding (GeoNames)' };
          return { summary: o.name + ' · ' + o.lat.toFixed(3) + ', ' + o.lon.toFixed(3), data: o };
        });
      }
    },
    {
      name: 'build_land_dna',
      description: "Build the plot's Land DNA from open data (ERA5 climate, elevation and slope, NASA POWER sun, SoilGrids soil) and save it as the farmer's plot. Use when there is no plot yet or the farmer names another place.",
      parameters: { type: 'object', properties: {
        lat: { type: 'number' }, lon: { type: 'number' }, name: { type: 'string' },
        crop: { type: 'string', enum: ['olive', 'palm', 'citrus', 'cereal', 'veg', 'other'] },
        area_ha: { type: 'number' }, water: { type: 'string', enum: ['rainfed', 'well', 'network', 'shared'] },
        well_depth_m: { type: 'number' }, pump: { type: 'string', enum: ['none', 'diesel', 'grid', 'solar'] } }, required: ['lat', 'lon'] },
      run: function (a) {
        var c = cropKey(a.crop), crop = c ? nexusCrop(c) : null;
        var input = { lat: +a.lat, lon: +a.lon, name: a.name || null, crop: crop, water: a.water || null, area: a.area_ha || '', wellDepth: a.well_depth_m || '', pump: a.pump || null, soilTexture: 'unknown', structures: [] };
        return D.build(input).then(function (dna) {
          ctx.parcel = { lat: input.lat, lon: input.lon, name: input.name, input: input, dna: dna };
          G.setParcel(ctx.parcel);
          var d = profileData(ctx.parcel);
          return { summary: (input.name || '') + ' · ' + W({ fr: 'pluie ', en: 'rain ', ar: 'أمطار ', ja: '降水 ' }) + d.climate.rain_mm + ' mm · ET0 ' + d.climate.et0_mm + ' mm · ' + W({ fr: 'pente ', en: 'slope ', ar: 'انحدار ', ja: '傾斜 ' }) + d.terrain.slope_pct + ' %', data: d };
        });
      }
    },
    {
      name: 'plot_profile',
      description: "Read the farmer's saved plot (Land DNA): location, crop, area, water source, well depth, pump, climate normals, terrain, sun, soil, each with its source and confidence, and the list of missing fields.",
      parameters: { type: 'object', properties: {} },
      run: function () {
        var p = needPlot(), d = profileData(p);
        return Promise.resolve({ summary: (p.name || W({ fr: 'Parcelle', en: 'Plot', ar: 'القطعة', ja: '区画' })) + ' · ' + (d.crop || '?') + ' · ' + (d.area_ha !== null ? d.area_ha + ' ha' : '? ha') + ' · ' +
          d.climate.rain_mm + ' mm/' + W({ fr: 'an', en: 'yr', ar: 'سنة', ja: '年' }) + ' · ' + W({ fr: 'manquant : ', en: 'missing: ', ar: 'ناقص: ', ja: '不足：' }) + (d.missing.length || 0), data: d });
      }
    },
    {
      name: 'weather_forecast',
      description: 'Live 16-day weather forecast for the plot (Open-Meteo): daily max/min temperature, rain, reference evapotranspiration ET0, wind, plus the rain of the last 30 days and alerts (heat ≥ 40 °C, frost, heavy rain, sirocco, dry spell).',
      parameters: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 16, description: 'how many days ahead (default 14)' } } },
      run: function (a) {
        var p = needPlot(), n = Math.max(1, Math.min(16, a.days || 14));
        return forecast(p).then(function (wx) {
          var s = split(wx), next = s.next.slice(0, n), alerts = [];
          var past30 = s.past.reduce(function (t, d) { return t + (d.rain || 0); }, 0);
          next.forEach(function (d) {
            if (d.tmax >= 40) alerts.push({ date: d.date, kind: 'heat', value: d.tmax });
            else if (d.tmax >= 35 && d.wind >= 35) alerts.push({ date: d.date, kind: 'sirocco', value: d.tmax, wind: d.wind });
            if (d.tmin <= 0) alerts.push({ date: d.date, kind: 'frost', value: d.tmin });
            if (d.rain >= 20) alerts.push({ date: d.date, kind: 'heavy_rain', value: d.rain });
          });
          var rainNext = next.reduce(function (t, d) { return t + (d.rain || 0); }, 0);
          if (rainNext < 2 && past30 < 5) alerts.push({ kind: 'dry_spell', past30_mm: r1(past30, 0), next_mm: r1(rainNext, 1) });
          var hot = next.reduce(function (b, d) { return !b || d.tmax > b.tmax ? d : b; }, null);
          return {
            summary: n + W({ fr: ' j : max ', en: ' d: max ', ar: ' يوم: أقصى ', ja: '日：最高 ' }) + r1(hot.tmax, 0) + ' °C (' + hot.date.slice(5) + ') · ' + W({ fr: 'pluie ', en: 'rain ', ar: 'أمطار ', ja: '降水 ' }) + r1(rainNext, 0) + ' mm · ' +
              (alerts.length ? alerts.length + W({ fr: ' alerte(s)', en: ' alert(s)', ar: ' تنبيه', ja: '件の警報' }) : W({ fr: 'pas d\'alerte', en: 'no alert', ar: 'لا تنبيه', ja: '警報なし' })),
            data: { source: wx.source, today: today(), rain_last_30d_mm: r1(past30, 0), rain_next_mm: r1(rainNext, 1), et0_next_mm: r1(next.reduce(function (t, d) { return t + (d.et0 || 0); }, 0), 0),
              days: next.map(function (d) { return { date: d.date, tmax: r1(d.tmax, 0), tmin: r1(d.tmin, 0), rain: r1(d.rain, 1), et0: r1(d.et0, 1), wind: r1(d.wind, 0) }; }), alerts: alerts }
          };
        });
      }
    },
    {
      name: 'water_need',
      description: 'FAO-56 irrigation need of the crop on this plot: monthly and yearly need (mm and m³), pumping energy and solar pump size; and the irrigation schedule for the next 14 days from the live ET0 forecast (m³ per day, split by irrigation system efficiency).',
      parameters: { type: 'object', properties: {
        crop: { type: 'string', description: 'olive, palm, citrus, cereal, veg, tomato, potato... (default: the plot crop)' },
        area_ha: { type: 'number', description: 'default: the plot area' },
        irrigation: { type: 'string', enum: ['drip', 'sprinkler', 'surface'], description: 'default drip' } } },
      run: function (a) {
        var p = needPlot(), dna = p.dna, ck = plotCrop(p, a.crop), nk = ck ? nexusCrop(ck) : null, C = nk && N.CROPS[nk];
        var CM = dna.climateMonthly, GH = ghiOf(dna), ghi = GH.ghi;
        var area = a.area_ha > 0 ? +a.area_ha : V(dna, 'area_ha'), sys = a.irrigation || 'drip', ea = N.EFFICIENCY[sys] || 0.9;
        var depth = V(dna, 'water.well_depth_m'), head = depth ? depth + 10 : null;
        if (!C || !(C.kc > 0)) return Promise.resolve({ summary: W({ fr: 'culture inconnue : Kc manquant', en: 'unknown crop: Kc missing', ar: 'زراعة غير معروفة', ja: '作物不明：Kcなし' }), data: { missing: ['crop'] } });
        var r = N.compute({ et0: CM ? CM.et0 : null, rain: CM ? CM.rain : null, ghi: ghi, kc: C.kc, months: C.months, area_ha: area, ea: ea, head_m: head, pump_eff: 0.45, pr: 0.75, prices: {} });
        if (r.missing.indexOf('climate') !== -1) return Promise.resolve({ summary: 'climate missing', data: { missing: r.missing } });
        var T = r.totals, mon = r.months.map(function (m, i) { return { month: i + 1, etc_mm: r1(m.etc, 0), irg_mm: r1(m.irg, 0), m3: r1(m.vol, 0), kwh: r1(m.kwh, 0) }; });
        return forecast(p).then(function (wx) { return wx; }, function () { return null; }).then(function (wx) {
          var plan = null;
          if (wx) {
            var next = split(wx).next.slice(0, 14), cm = new Date().getMonth();
            var on = C.months[cm];
            plan = next.map(function (d) {
              var etc = on ? C.kc * (d.et0 || 0) : 0, pe = (d.rain || 0) > 5 ? 0.8 * d.rain : 0, irn = Math.max(0, etc - pe), irg = irn / ea;
              return { date: d.date, etc_mm: r1(etc, 1), rain_mm: r1(d.rain, 1), irrigate_mm: r1(irg, 1), m3: area > 0 ? r1(10 * irg * area, 1) : null };
            });
          }
          var sum14 = plan ? plan.reduce(function (t, d) { return t + (d.m3 || 0); }, 0) : null;
          return {
            summary: 'ETc ' + r1(T.etc, 0) + ' mm/' + W({ fr: 'an', en: 'yr', ar: 'سنة', ja: '年' }) + ' · ' + (area > 0 ? r1(T.vol, 0) + ' m³/' + W({ fr: 'an', en: 'yr', ar: 'سنة', ja: '年' }) : r1(T.volHa, 0) + ' m³/ha') +
              (sum14 !== null && area > 0 ? ' · ' + W({ fr: '14 j : ', en: '14 d: ', ar: '14 يوم: ', ja: '14日：' }) + r1(sum14, 0) + ' m³' : '') + (r.solar ? ' · ' + r1(r.solar.kwp, 1) + ' kWp' : ''),
            data: { crop: ck, kc: C.kc, kc_ref: C.ref, irrigation: sys, efficiency: ea, area_ha: area || null, head_m: head,
              year: { etc_mm: r1(T.etc, 0), eff_rain_mm: r1(T.pe, 0), irrigation_mm: r1(T.irg, 0), m3: area > 0 ? r1(T.vol, 0) : null, m3_per_ha: r1(T.volHa, 0), pump_kwh: T.kwh > 0 ? r1(T.kwh, 0) : null },
              solar_pump_kwp: r.solar ? r1(r.solar.kwp, 1) : null, sun_data: GH.approx ? 'approximate' : 'NASA POWER', peak_month: r.solar ? r.solar.peakMonth + 1 : null, months: mon,
              next_14_days: plan, next_14_days_m3: sum14 !== null ? r1(sum14, 0) : null, missing: r.missing,
              method: 'FAO-56 Kc × ET0, USDA-SCS effective rain (monthly); daily plan: Kc × forecast ET0 − 0.8 × rain > 5 mm' }
          };
        });
      }
    },
    {
      name: 'groundwater_guard',
      description: 'Groundwater guard: compares what the solar pump COULD lift with what the crop NEEDS (FAO-56) and the aquifer safe yield, and returns the monthly pumping cap for the controller, the over-pumping it prevents and the solar energy freed for other uses.',
      parameters: { type: 'object', properties: { safe_yield_m3_year: { type: 'number', description: 'permit or aquifer share, if known' }, pv_kwp: { type: 'number', description: 'installed solar, if known' }, flow_m3_h: { type: 'number' } } },
      run: function (a) {
        var p = needPlot(), dna = p.dna, ck = plotCrop(p), nk = ck ? nexusCrop(ck) : null, C = nk && N.CROPS[nk];
        var CM = dna.climateMonthly, GH = ghiOf(dna), ghi = GH.ghi;
        var depth = V(dna, 'water.well_depth_m'), area = V(dna, 'area_ha');
        var inp = { et0: CM && CM.et0, rain: CM && CM.rain, ghi: ghi, kc: C ? C.kc : null, months: C ? C.months : null, area_ha: area, ea: 0.9, head_m: depth ? depth + 10 : null,
          pump_eff: 0.45, pr: 0.75, pv_kwp: a.pv_kwp, safe_yield_m3_year: a.safe_yield_m3_year, flow_m3_h: a.flow_m3_h };
        var g = GG.guard(inp);
        if (g.status === 'incomplete' || !g.totals) return Promise.resolve({ summary: W({ fr: 'incomplet : ', en: 'incomplete: ', ar: 'غير مكتمل: ', ja: '不完全：' }) + g.missing.join(', '), data: { status: 'incomplete', missing: g.missing } });
        var T = g.totals;
        return Promise.resolve({
          summary: W({ fr: 'capacité ', en: 'capacity ', ar: 'القدرة ', ja: '揚水能力 ' }) + r1(T.capacity, 0) + ' m³ · ' + W({ fr: 'besoin ', en: 'need ', ar: 'الحاجة ', ja: '必要量 ' }) + r1(T.need, 0) + ' m³ · ' + W({ fr: 'bloqué ', en: 'blocked ', ar: 'محجوب ', ja: '抑制 ' }) + r1(T.blocked, 0) + ' m³',
          data: { status: g.status, kwp: r1(g.kwp, 1), kwp_source: g.kwp_source, over_ratio: r1(T.over_ratio, 2), peak_daily_m3: r1(T.peak_daily_m3, 1), totals: Object.keys(T).reduce(function (o, k) { o[k] = typeof T[k] === 'number' ? r1(T[k], T[k] < 10 ? 2 : 0) : T[k]; return o; }, {}),
            months: g.months.map(function (m, i) { return { month: i + 1, need_m3: r1(m.need_m3, 0), capacity_m3: r1(m.capacity_m3, 0), allowed_m3: r1(m.allowed_m3, 0), blocked_m3: r1(m.blocked_m3, 0), daily_cap_m3: r1(m.daily_cap_m3, 1), hours_per_day: r1(m.hours_per_day, 1) }; }),
            missing: g.missing, sun_data: GH.approx ? 'approximate Tunisian monthly values (no NASA POWER data for this plot)' : 'NASA POWER', assumption: 'pump efficiency 0.45, PR 0.75, head = well depth + 10 m, drip 90 %' }
        });
      }
    },
    {
      name: 'check_practices',
      description: "GAIA compatibility engine: checks each Tunisian and Japanese practice (jessour, tabia, meskat, mulch, oasis layers, tanada, solar sharing, satoyama...) against this plot's data. Returns feasible / adapt / insufficient / rejected with reasons.",
      parameters: { type: 'object', properties: { origin: { type: 'string', enum: ['tn', 'jp', 'x'], description: 'only Tunisian (tn), Japanese (jp) or cross (x) practices' } } },
      run: function (a) {
        var p = needPlot(), all = E.evaluateAll(p.dna).filter(function (r) { return !a.origin || r.record.origin === a.origin; });
        var cnt = {}; all.forEach(function (r) { cnt[r.verdict] = (cnt[r.verdict] || 0) + 1; });
        return Promise.resolve({
          summary: ['feasible', 'adapt', 'insufficient', 'rejected'].filter(function (k) { return cnt[k]; }).map(function (k) { return cnt[k] + ' ' + k; }).join(' · '),
          data: { results: all.map(function (r) {
            return { id: r.record.id, name: r.record.name, origin: r.record.origin, verdict: r.verdict,
              why: r.verdict === 'rejected' ? r.hardFails.map(function (x) { return E.describe(x); }).slice(0, 2) : r.checks.filter(function (x) { return x.result === 'pass'; }).map(E.describe).slice(0, 2),
              adaptation: r.adaptation ? r.adaptation.text : null, unknown: r.unknown.map(function (x) { return x.cond.field; }).slice(0, 3), draft: r.record.review.status !== 'validated' };
          }) }
        });
      }
    },
    {
      name: 'solar_brain',
      description: 'Solar Brain agrivoltaic optimiser (NSGA-II over row spacing, panel width, tilt, orientation, with the AgriNet crop model and the Japanese rule: crop keeps ≥ 80 % of its yield). Returns the best panel layout, crop yield under panels, electricity, land equivalent ratio and water saved.',
      parameters: { type: 'object', properties: {
        crop: { type: 'string', enum: ['tomato', 'pepper', 'potato', 'wheat', 'lettuce_s', 'strawb', 'alfalfa'], description: 'crop under the panels' },
        goal: { type: 'string', enum: ['ler', 'energy', 'crop'], description: 'ler = best land use (default), energy, crop' },
        area_ha: { type: 'number' } } },
      run: function (a) {
        var p = needPlot(), dna = p.dna, CM = dna.climateMonthly || {}, GH = ghiOf(dna), ghi = GH.ghi;
        var ck = cropKey(a.crop) || plotCrop(p), map = { tomato: 'tomato', pepper: 'pepper', potato: 'potato', cereal: 'wheat', veg: 'tomato' };
        var crop = A.CROPS[a.crop] ? a.crop : (map[ck] || 'tomato');
        if (!ghi) return Promise.resolve({ summary: 'no sun data', data: { missing: ['solar.ghi_kwh'] } });
        var area = a.area_ha > 0 ? +a.area_ha : (V(dna, 'area_ha') || 1);
        var base = { lat: dna.location.lat, ghi: ghi, tilt: 25, azimuth: 180, height: 4, width: 2, pitch: 8, area_ha: area, density_wp_m2: 200, pr: 0.8 };
        var opt = A.optimizer({ base: base, crop: crop, clim: { ghi: ghi, tmax: CM.tmax, tmin: CM.tmin, et0: CM.et0, rain: CM.rain }, goal: a.goal || 'ler', japan: true,
          start: { pitch: 8, width: 2, tilt: 25, azimuth: 180 }, seed: Math.round(Math.abs(dna.location.lat * 1000 + dna.location.lon * 100)) });
        return new Promise(function (resolve) {
          (function tick() {       // one generation per frame, so the page stays responsive
            for (var i = 0; i < 4 && !opt.done(); i++) opt.next();
            if (!opt.done()) { setTimeout(tick, 0); return; }
            var b = opt.best();
            resolve({
              summary: crop + ' · ' + W({ fr: 'rangs ', en: 'rows ', ar: 'صفوف ', ja: '列間 ' }) + b.genes.pitch + ' m · ' + W({ fr: 'rendement ', en: 'yield ', ar: 'المردود ', ja: '収量 ' }) + Math.round(100 * b.yrel) + ' % · LER ' + r1(b.ler, 2) + ' · ' + r1(b.kwh / 1000, 0) + ' MWh/' + W({ fr: 'an', en: 'yr', ar: 'سنة', ja: '年' }),
              data: { crop: crop, goal: a.goal || 'ler', area_ha: area, method: 'NSGA-II, ' + opt.gens + ' generations, ' + opt.all.length + ' layouts evaluated; crop model ' + (b.model || 'formula'),
                layout: { row_pitch_m: b.genes.pitch, panel_width_m: r1(b.genes.width, 1), tilt_deg: b.genes.tilt, azimuth_deg: b.genes.azimuth, height_m: 4 },
                crop_yield_pct: Math.round(100 * b.yrel), japan_rule_ok: b.ok, kwp: r1(b.kwp, 0), kwh_year: r1(b.kwh, 0), ler: r1(b.ler, 2), light_share_pct: Math.round(100 * b.light),
                water_saved_m3: r1(b.waterSaved * 10, 0), sun_data: GH.approx ? 'approximate Tunisian monthly values' : 'NASA POWER', caveat: 'crop response parameters are indicative, to calibrate on a trial plot' }
            });
          }());
        });
      }
    },
    {
      name: 'disease_risk',
      description: 'Weather-driven infection risk for the crop over the next days, from published rules run on the hourly forecast (olive peacock spot and olive fly, grape downy and powdery mildew, tomato/potato late blight with the Hutton criteria, citrus Alternaria, date palm heat). Not a diagnosis.',
      parameters: { type: 'object', properties: { crop: { type: 'string', description: 'default: the plot crop' } } },
      run: function (a) {
        var p = needPlot(), ck = plotCrop(p, a.crop), models = RISK_MODELS[ck === 'veg' ? 'tomato' : ck];
        if (!models) return Promise.resolve({ summary: W({ fr: 'pas de modèle de risque pour ', en: 'no risk model for ', ar: 'لا نموذج خطر لـ ', ja: 'リスクモデルなし：' }) + (ck || '?'), data: { crop: ck, models: [] } });
        return forecast(p).then(function (wx) {
          var t0 = today(), hrs = wx.hours.filter(function (h) { return h.t.slice(0, 10) >= t0 && h.temp !== null; }).slice(0, 24 * 10), days = split(wx).next.slice(0, 10);
          var res = models.map(function (m) {
            var ev = m.test(hrs, days), level = ev.length >= 3 ? 'high' : ev.length ? 'moderate' : 'low';
            return { id: m.id, disease: W(m.name), scout: W(m.scout), level: level, risk_days: ev.map(function (e) { return e.date; }), rule: m.rule, source: m.src };
          });
          return { summary: res.map(function (r) { return r.disease.split(' (')[0] + ' : ' + r.level; }).join(' · '),
            data: { crop: ck, horizon_days: 10, results: res, note: 'indicative weather rules; confirm in the field (Plant health photo check) before any treatment' } };
        });
      }
    },
    {
      name: 'satellite_ndvi',
      description: 'Crop vigour from space: Sentinel-2 NDVI (10 m) of the plot over the last 12 months (cloud-masked), with the latest value, the 12-month median, the 90-day trend and any sudden drop (early sign of water stress, disease or damage).',
      parameters: { type: 'object', properties: { months: { type: 'integer', minimum: 3, maximum: 24 } } },
      run: function (a) {
        var p = needPlot(), NV = global.GAIA_NDVI, area = V(p.dna, 'area_ha');
        if (!NV) return Promise.resolve({ summary: 'NDVI module not loaded', data: { status: 'unavailable' } });
        var r = area > 0 ? Math.max(15, Math.min(100, Math.sqrt(area * 10000) / 2)) : 25;
        return NV.series(p.lat, p.lon, { months: a.months || 12, radius_m: r }).then(function (x) {
          if (!x.latest) return { summary: W({ fr: 'aucune image claire', en: 'no clear image', ar: 'لا صورة واضحة', ja: '晴天画像なし' }), data: { status: 'no_clear_scene', source: x.source } };
          return {
            summary: 'NDVI ' + r1(x.latest.ndvi, 2) + ' (' + x.latest.date + ') · ' + W({ fr: 'médiane 12 mois ', en: '12-month median ', ar: 'وسيط 12 شهراً ', ja: '12か月中央値 ' }) + r1(x.median12, 2) + ' · ' + x.status + ' · ' + x.scenes.length + ' images',
            data: { latest: { date: x.latest.date, ndvi: r1(x.latest.ndvi, 3) }, median_12m: r1(x.median12, 3), min_12m: r1(x.min12, 3), max_12m: r1(x.max12, 3),
              change_vs_previous_3: r1(x.drop, 3), trend_per_month_90d: r1(x.trend_per_month, 3), status: x.status, window_m: x.window_m, n_scenes: x.scenes.length,
              series: x.scenes.map(function (s) { return [s.date, r1(s.ndvi, 3)]; }), source: x.source,
              reading: 'bare soil ~0.1, sparse olive grove 0.2-0.4, dense irrigated crop 0.6-0.85' }
          };
        });
      }
    },
    {
      name: 'plant_health_last',
      description: "The last photo check made in GAIA's Plant health page on this device (tree species, disease, confidence, date), if any.",
      parameters: { type: 'object', properties: {} },
      run: function () {
        var h = G.load('gaia.health.last', null);
        if (!h) return Promise.resolve({ summary: W({ fr: 'aucune photo analysée', en: 'no photo checked yet', ar: 'لا صورة بعد', ja: '写真の診断なし' }), data: { status: 'none', hint: 'ask the farmer to take a leaf photo in Plant health (health.html)' } });
        return Promise.resolve({ summary: (h.plant || '?') + ' · ' + (h.disease || '?') + (h.confidence ? ' · ' + Math.round(100 * h.confidence) + ' %' : '') + ' · ' + (h.at || '').slice(0, 10), data: h });
      }
    },
    {
      name: 'business_model',
      description: "GAIA business model for this plot: pay-as-you-go solar pump kit paid out of the diesel it replaces (deposit, monthly installments, seasonal schedule, share of savings, break-even, gain over the kit life), the cooperative shared pump if members are saved, and the four adoption tests. The pump energy, solar size and water quota come from the plot (FAO-56). Prices are never invented: they come from the arguments (ask the farmer), the Business model page or the Water & energy page; what is missing is listed in data.missing with the question to ask.",
      parameters: { type: 'object', properties: {
        crop: { type: 'string', description: 'default: the plot crop' },
        kit_tnd: { type: 'number', description: 'installed price of the solar pump kit (TND), if the farmer gave it' },
        diesel_tnd_year: { type: 'number', description: 'what the farmer spends on pumping diesel per year (TND)' },
        diesel_tnd_l: { type: 'number', description: 'diesel price per litre (TND/L), to estimate the yearly spending from the pump energy' },
        pv_tnd_kwp: { type: 'number', description: 'installed solar price per kWp (TND/kWp), to estimate the kit price from its size' },
        deposit_pct: { type: 'number', description: 'down payment, % (default 10)' },
        term_months: { type: 'number', description: 'number of monthly installments (default 36)' },
        seasonal: { type: 'boolean', description: 'installments follow the pumping season (default true)' } } },
      run: function (a) {
        var B = global.GAIA_BUSINESS;
        if (!B) return Promise.resolve({ error: 'business core not loaded' });
        var p = needPlot(), dna = p.dna, ck = plotCrop(p, a.crop), nk = ck ? nexusCrop(ck) : null, C = nk && N.CROPS[nk];
        var CM = dna.climateMonthly, GH = ghiOf(dna), ghi = GH.ghi, area = V(dna, 'area_ha'), depth = V(dna, 'water.well_depth_m');
        var biz = G.load('gaia.business.inputs', null) || {}, nx = (G.load('gaia.nexus.inputs', null) || {}).values || {};
        function n(v) { var x = typeof v === 'number' ? v : parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(x) || x <= 0 ? null : x; }
        // a percentage may legitimately be 0 (no fee, no deposit)
        function pct(v, d) { var x = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return (isNaN(x) || x < 0 ? d : x) / 100; }

        // physics of the plot: pumping energy, solar size, water quota
        var phys = null;
        if (C && C.kc > 0 && CM) {
          var r = N.compute({ et0: CM.et0, rain: CM.rain, ghi: ghi, kc: C.kc, months: C.months, area_ha: area, ea: 0.9, head_m: depth ? depth + 10 : null, pump_eff: 0.45, pr: 0.75, prices: {} });
          if (r.totals) phys = { kwh: r.totals.kwh > 0 ? r.totals.kwh : null, m3: r.totals.vol > 0 ? r.totals.vol : null, kwp: r.solar ? r.solar.kwp : null,
            monthly_kwh: r.totals.kwh > 0 ? r.months.map(function (m) { return m.kwh || 0; }) : null };
        }
        var KWH_PER_L = 3;     // electricity a diesel pump-set delivers per litre (technical assumption, not a price)

        // prices: farmer's words first, then the Business page, then the Water & energy page
        var src = {}, diesel = null, kit = null;
        if (n(a.diesel_tnd_year)) { diesel = n(a.diesel_tnd_year); src.diesel = 'farmer'; }
        else if (n(biz.diesel)) { diesel = n(biz.diesel); src.diesel = 'business page'; }
        else {
          var dl = n(a.diesel_tnd_l) || n(nx.diesel_tnd_l), kl = n(nx.diesel_kwh_l) || KWH_PER_L;
          if (dl && phys && phys.kwh) { diesel = phys.kwh / kl * dl; src.diesel = 'pump energy ' + Math.round(phys.kwh) + ' kWh/yr ÷ ' + kl + ' kWh/L × ' + dl + ' TND/L'; }
        }
        if (n(a.kit_tnd)) { kit = n(a.kit_tnd); src.kit = 'farmer'; }
        else if (n(biz.kit)) { kit = n(biz.kit); src.kit = 'business page'; }
        else {
          var pv = n(a.pv_tnd_kwp) || n(nx.pv_tnd_kwp);
          if (pv && phys && phys.kwp) { kit = phys.kwp * pv; src.kit = r1(phys.kwp, 1) + ' kWp × ' + pv + ' TND/kWp'; }
        }
        var inp = { kit_tnd: kit, diesel_tnd_year: diesel, deposit_pct: pct(a.deposit_pct !== undefined ? a.deposit_pct : biz.dep, 10),
          term_months: n(a.term_months) || n(biz.term) || 36, fee_rate: pct(biz.fee, 8), share_cap: pct(biz.cap, 70), maint_tnd_year: n(biz.maint) || 0,
          monthly_kwh: phys && phys.monthly_kwh, seasonal: a.seasonal !== undefined ? !!a.seasonal : (biz.seasonal !== undefined ? !!biz.seasonal : true),
          start_month: biz.start !== undefined ? +biz.start : new Date().getMonth(), life_y: n(biz.life) || 20 };
        var pg = B.payg(inp);
        var ask = { kit: W({ fr: 'Quel est le prix installé du kit solaire (TND) ? (ou le prix du kWc)', en: 'What is the installed price of the solar kit (TND)? (or the price per kWp)', ar: 'ما سعر المنظومة الشمسية مركّبة (د.ت)؟', ja: '太陽光キットの設置価格（TND）は？（またはkWpあたりの価格）' }),
          diesel: W({ fr: 'Combien dépensez-vous en gazole de pompage par an (TND) ? (ou le prix du litre)', en: 'How much do you spend on pumping diesel per year (TND)? (or the price per litre)', ar: 'كم تنفق على غازوال الضخ سنوياً (د.ت)؟', ja: '揚水用の軽油に年間いくら使っていますか（TND）？（またはリットル単価）' }) };
        var physData = phys ? { pump_kwh_year: r1(phys.kwh, 0), solar_kwp: r1(phys.kwp, 1), quota_m3_year: r1(phys.m3, 0), diesel_litres_year: phys.kwh ? r1(phys.kwh / KWH_PER_L, 0) : null,
          sun_data: GH.approx ? 'approximate' : 'NASA POWER', assumption: 'FAO-56 need, drip 90 %, head = well depth + 10 m, pump 0.45, PR 0.75, ' + KWH_PER_L + ' kWh per litre of diesel' } : null;

        var ad = B.adoption({ ghi_mean: GH.approx ? null : ghi.reduce(function (s, v) { return s + v; }, 0) / 12, water_source: V(dna, 'water.source'), has_quota: !!(phys && phys.m3),
          payg: pg.missing.length ? null : pg, ease: biz.ease || {}, partners: biz.partners || {} });
        var adoption = { overall: ad.overall, tests: ad.tests.map(function (x) { return { test: x.key, verdict: x.verdict, why: x.why }; }) };

        var coop = null;
        var members = (biz.members || []).map(function (m) { return { name: m.name, quota_m3: n(m.quota), diesel_tnd_year: n(m.diesel) }; });
        if (n(biz.co_kit) && members.filter(function (m) { return m.quota_m3; }).length >= 2) {
          var co = B.coop({ kit_tnd: n(biz.co_kit), individual_kit_tnd: n(biz.co_ind), deposit_pct: inp.deposit_pct, term_months: inp.term_months, fee_rate: inp.fee_rate, reserve_pct: pct(biz.co_res, 5), members: members });
          if (!co.missing.length) coop = { members: co.members.map(function (m) { return { name: m.name || null, share_pct: r1(100 * m.share, 0), monthly_tnd: r1(m.monthly, 0), net_month_tnd: r1(m.net_month, 0) }; }),
            reserve_at_term_tnd: r1(co.reserve_at_term, 0), capex_saved_tnd: r1(co.capex_saved, 0) };
        }

        if (pg.missing.length) {
          return Promise.resolve({
            summary: W({ fr: 'à chiffrer : ', en: 'to price: ', ar: 'للتسعير: ', ja: '要入力：' }) + pg.missing.map(function (k) { return k === 'kit' ? W({ fr: 'prix du kit', en: 'kit price', ar: 'سعر المنظومة', ja: 'キット価格' }) : W({ fr: 'dépense gazole', en: 'diesel spending', ar: 'نفقة الغازوال', ja: '軽油代' }); }).join(', ') +
              (phys && phys.kwp ? ' · ' + W({ fr: 'kit de ', en: 'kit of ', ar: 'منظومة ', ja: 'キット ' }) + r1(phys.kwp, 1) + ' kWp' : ''),
            data: { status: 'needs_prices', missing: pg.missing, ask_farmer: pg.missing.map(function (k) { return ask[k]; }), plot: physData, adoption: adoption, coop: coop,
              hint: 'Ask the farmer these questions, or have them fill the Business model page (business.html). Never invent a price.' }
          });
        }
        var first12 = pg.schedule.slice(0, 12).map(function (x) { return { n: x.i, month: x.month + 1, saving: r1(x.saving, 0), installment: r1(x.installment, 0), net: r1(x.net, 0) }; });
        return Promise.resolve({
          summary: W({ fr: 'apport ', en: 'deposit ', ar: 'دفعة أولى ', ja: '頭金 ' }) + r1(pg.deposit, 0) + ' TND · ' + r1(pg.avg_installment, 0) + ' TND/' + W({ fr: 'mois', en: 'month', ar: 'شهر', ja: '月' }) + ' × ' + pg.term +
            ' · ' + r1(100 * pg.ratio, 0) + ' % ' + W({ fr: 'des économies', en: 'of savings', ar: 'من الوفر', ja: '（節約額比）' }) + ' · ' + pg.verdict,
          data: { status: 'ok', verdict: pg.verdict, kit_tnd: r1(kit, 0), diesel_tnd_year: r1(diesel, 0), maintenance_tnd_year: r1(inp.maint_tnd_year, 0), fee_rate_pct: r1(100 * inp.fee_rate, 1), kit_life_years: inp.life_y, sources: src,
            deposit_tnd: r1(pg.deposit, 0), financed_tnd: r1(pg.financed, 0), fee_tnd: r1(pg.fee, 0), total_tnd: r1(pg.total, 0), term_months: pg.term, seasonal: pg.seasonal,
            avg_installment_tnd: r1(pg.avg_installment, 0), max_installment_tnd: r1(pg.max_installment, 0), installments_over_savings_pct: r1(100 * pg.ratio, 0), share_cap_pct: r1(100 * pg.share_cap, 0),
            months_paying_more_than_saved: pg.negative_months, break_even_month: pg.break_even_month, suggested_term_months: pg.suggested_term,
            yearly_gain_after_tnd: r1(pg.yearly_after, 0), gain_over_life_tnd: r1(pg.life_gain, 0), simple_payback_years: r1(pg.simple_payback_y, 1),
            first_12_months: first12, plot: physData, adoption: adoption, coop: coop,
            rule: 'the controller only releases the FAO-56 quota: the kit is paid by the diesel saved, never by pumping more water' }
        });
      }
    },
    {
      name: 'search_knowledge',
      description: "Search GAIA's 11 sourced knowledge records (Tunisian and Japanese practices: description, conditions, cost, risks, adaptations, actions, sources).",
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: function (a) {
        var an = R.analyse(a.query || ''), ids = an.hits.slice(0, 3).map(function (h) { return h.id; });
        var recs = KB.records.filter(function (r) { return ids.indexOf(r.id) !== -1; });
        return Promise.resolve({ summary: recs.map(function (r) { return r.name; }).join(' · ') || '—',
          data: { records: recs.map(function (r) { return { id: r.id, name: r.name, origin: r.origin, summary: r.summary, cost: r.cost, risks: r.risks, actions: r.actions, status: r.review && r.review.status }; }) } });
      }
    }
  ];

  function profileData(p) {
    var dna = p.dna, f = function (k) { var x = D.fieldAt(dna, k); return x && x.status === 'ok' ? x.value : null; },
      conf = function (k) { var x = D.fieldAt(dna, k); return x ? x.confidence : null; };
    return {
      name: p.name || null, lat: r1(p.lat, 4), lon: r1(p.lon, 4),
      crop: f('crop'), area_ha: f('area_ha'), water_source: f('water.source'), well_depth_m: f('water.well_depth_m'), pump: f('energy.pump'),
      climate: { rain_mm: r1(f('climate.rain_mm'), 0), et0_mm: r1(f('climate.et0_mm'), 0), tmax_hot: r1(f('climate.tmax_hot'), 1), tmin_cold: r1(f('climate.tmin_cold'), 1), confidence: conf('climate.rain_mm') },
      terrain: { elev_m: r1(f('terrain.elev_m'), 0), slope_pct: r1(f('terrain.slope_pct'), 1), aspect_deg: r1(f('terrain.aspect_deg'), 0) },
      sun_kwh_m2_day: r1(f('solar.ghi_kwh'), 2),
      soil: { texture: f('soil.texture'), clay_pct: r1(f('soil.clay_pct'), 0), organic_carbon: r1(f('soil.soc'), 1), confidence: conf('soil.clay_pct') },
      demo_values: Object.keys((p.input && p.input.demo) || {}).filter(function (k) { return p.input.demo[k]; }),
      missing: (dna.quality && dna.quality.missing) || []
    };
  }

  function byName(n) { return TOOLS.filter(function (t) { return t.name === n; })[0]; }
  function run(name, args) {
    var t = byName(name);
    if (!t) return Promise.resolve({ error: 'unknown tool ' + name });
    try {
      return Promise.resolve(t.run(args || {})).catch(function (e) { return { error: e.message || String(e), hint: e.hint }; });
    } catch (e) { return Promise.resolve({ error: e.message || String(e), hint: e.hint }); }
  }
  function schemas() { return TOOLS.map(function (t) { return { name: t.name, description: t.description, parameters: t.parameters }; }); }

  global.GAIA_AGENT_TOOLS = { TOOLS: TOOLS, run: run, schemas: schemas, byName: byName, placeIn: placeIn, cropKey: cropKey, ctx: ctx, RISK_MODELS: RISK_MODELS, profileData: profileData };
}(window));
