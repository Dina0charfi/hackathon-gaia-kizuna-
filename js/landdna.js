/* ==========================================================================
   GAIA LAND DNA — builds the parcel profile from open data.

   Every field: { value, unit, source, resolution, period, confidence, status, note }
     confidence: high | medium | low | declared | missing | error
   Nothing is ever filled with an invented value: a source that fails leaves
   the field at status "error" with the reason, and the UI says so.
   ========================================================================== */

(function (global) {
  'use strict';

  var C = function () { return global.GAIA.CONFIG; };

  function field(value, extra) { return Object.assign({ value: value, status: value === null ? 'missing' : 'ok' }, extra || {}); }
  function failed(reason, extra) { return Object.assign({ value: null, status: 'error', confidence: 'error', note: reason }, extra || {}); }

  function getJSON(url, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  /* ---------------------------------------------------------- climate */
  function climate(lat, lon) {
    var p = C().climatePeriod;
    var url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon +
      '&start_date=' + p.start + '&end_date=' + p.end +
      '&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum&timezone=auto';
    var meta = { source: 'Open-Meteo Historical API (réanalyse ERA5 / ERA5-Land)', resolution: '≈ 11–25 km', period: p.start.slice(0, 4) + '–' + p.end.slice(0, 4), url: 'https://open-meteo.com/en/docs/historical-weather-api' };
    return getJSON(url, 30000).then(function (d) {
      var D = d.daily;
      if (!D || !D.time || !D.time.length) throw new Error('réponse vide');
      var years = {}, monthsP = {}, monthsE = {}, monthTmax = {}, monthTmin = {}, monthSw = {};
      D.time.forEach(function (day, i) {
        var y = day.slice(0, 4), m = +day.slice(5, 7) - 1, key = y + '-' + m;
        var pr = D.precipitation_sum[i], et = D.et0_fao_evapotranspiration[i];
        if (pr !== null) { years[y] = (years[y] || 0) + pr; monthsP[key] = (monthsP[key] || 0) + pr; }
        if (et !== null) monthsE[key] = (monthsE[key] || 0) + et;
        if (D.temperature_2m_max[i] !== null) (monthTmax[m] = monthTmax[m] || []).push(D.temperature_2m_max[i]);
        if (D.temperature_2m_min[i] !== null) (monthTmin[m] = monthTmin[m] || []).push(D.temperature_2m_min[i]);
        if (D.shortwave_radiation_sum && D.shortwave_radiation_sum[i] !== null) (monthSw[m] = monthSw[m] || []).push(D.shortwave_radiation_sum[i] / 3.6); // MJ/m² → kWh/m²
      });
      var yearTotals = Object.keys(years).map(function (y) { return years[y]; });
      var nY = yearTotals.length;
      var mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; };
      var monthlyMean = function (store) {
        var out = [];
        for (var m = 0; m < 12; m++) {
          var vals = Object.keys(store).filter(function (k) { return +k.split('-')[1] === m; }).map(function (k) { return store[k]; });
          out.push(vals.length ? mean(vals) : null);
        }
        return out;
      };
      var rainM = monthlyMean(monthsP), et0M = monthlyMean(monthsE);
      var tmaxM = []; var tminM = [];
      for (var m = 0; m < 12; m++) { tmaxM.push(monthTmax[m] ? mean(monthTmax[m]) : null); tminM.push(monthTmin[m] ? mean(monthTmin[m]) : null); }
      return {
        rain_mm: field(mean(yearTotals), Object.assign({ unit: 'mm/an', confidence: 'medium', extra: { min: Math.min.apply(null, yearTotals), max: Math.max.apply(null, yearTotals), years: nY } }, meta)),
        et0_mm: field(et0M.reduce(function (s, v) { return s + (v || 0); }, 0), Object.assign({ unit: 'mm/an', confidence: 'medium', note: 'ET0 FAO Penman–Monteith calculée par Open-Meteo' }, meta)),
        tmax_hot: field(Math.max.apply(null, tmaxM.filter(function (v) { return v !== null; })), Object.assign({ unit: '°C', confidence: 'medium', note: 'Moyenne des maximales du mois le plus chaud' }, meta)),
        tmin_cold: field(Math.min.apply(null, tminM.filter(function (v) { return v !== null; })), Object.assign({ unit: '°C', confidence: 'medium', note: 'Moyenne des minimales du mois le plus froid' }, meta)),
        monthly: { rain: rainM, et0: et0M, tmax: tmaxM, tmin: tminM, ghi: (function () { var g = []; for (var k = 0; k < 12; k++) g.push(monthSw[k] ? mean(monthSw[k]) : null); return g.some(function (v) { return v !== null; }) ? g : null; }()), source: meta.source, period: meta.period }
      };
    }).catch(function (e) {
      var why = 'Open-Meteo indisponible (' + (e.name === 'AbortError' ? 'délai dépassé' : e.message) + ')';
      return { rain_mm: failed(why, meta), et0_mm: failed(why, meta), tmax_hot: failed(why, meta), tmin_cold: failed(why, meta), monthly: null };
    });
  }

  /* ---------------------------------------------------------- terrain */
  // Five elevation samples (centre + 4 neighbours) → slope by central differences.
  function terrain(lat, lon) {
    var dLat = 0.0015, dLon = 0.0015;
    var lats = [lat, lat + dLat, lat - dLat, lat, lat], lons = [lon, lon, lon, lon + dLon, lon - dLon];
    var url = 'https://api.open-meteo.com/v1/elevation?latitude=' + lats.join(',') + '&longitude=' + lons.join(',');
    var meta = { source: 'Copernicus DEM GLO-90 via Open-Meteo Elevation API', resolution: '90 m', url: 'https://open-meteo.com/en/docs/elevation-api' };
    return getJSON(url, 15000).then(function (d) {
      var z = d.elevation; if (!z || z.length < 5) throw new Error('réponse incomplète');
      var dy = dLat * 111320, dx = dLon * 111320 * Math.cos(lat * Math.PI / 180);
      var dzdy = (z[1] - z[2]) / (2 * dy), dzdx = (z[3] - z[4]) / (2 * dx);
      var slope = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100;
      var aspectDeg = (Math.atan2(-dzdx, -dzdy) * 180 / Math.PI + 360) % 360; // direction the slope faces
      var spacing = Math.round(2 * dy);
      return {
        elev_m: field(z[0], Object.assign({ unit: 'm', confidence: 'high' }, meta)),
        slope_pct: field(slope, Object.assign({ unit: '%', confidence: 'medium', note: 'Pente moyenne calculée sur ≈ ' + spacing + ' m à partir de 5 points d’altitude' }, meta)),
        aspect_deg: field(slope < 1 ? null : aspectDeg, Object.assign({ unit: '°', confidence: slope < 1 ? 'missing' : 'medium', note: slope < 1 ? 'Terrain presque plat : orientation non significative' : 'Orientation de la pente (0° = nord)' }, meta))
      };
    }).catch(function (e) {
      var why = 'Altitude indisponible (' + (e.name === 'AbortError' ? 'délai dépassé' : e.message) + ')';
      return { elev_m: failed(why, meta), slope_pct: failed(why, meta), aspect_deg: failed(why, meta) };
    });
  }

  /* ---------------------------------------------------------- solar */
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function solar(lat, lon) {
    var url = 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=AG&longitude=' + lon + '&latitude=' + lat + '&format=JSON';
    var meta = { source: 'NASA POWER — climatologie, ALLSKY_SFC_SW_DWN', resolution: 'grille globale (≈ 0,5°)', url: 'https://power.larc.nasa.gov/' };
    return getJSON(url, 30000).then(function (d) {
      var p = d && d.properties && d.properties.parameter && d.properties.parameter.ALLSKY_SFC_SW_DWN;
      if (!p) throw new Error('paramètre absent');
      var fill = d.header && d.header.fill_value;
      var monthly = MONTHS.map(function (k) { var v = p[k]; return (v === undefined || v === fill) ? null : v; });
      var unit = (d.parameters && d.parameters.ALLSKY_SFC_SW_DWN && d.parameters.ALLSKY_SFC_SW_DWN.units) || 'kWh/m²/jour';
      var ann = p.ANN !== undefined && p.ANN !== fill ? p.ANN : null;
      return {
        ghi_kwh: field(ann, Object.assign({ unit: unit, confidence: 'medium', note: 'Rayonnement global horizontal, moyenne annuelle' }, meta)),
        monthly: { ghi: monthly, unit: unit, source: meta.source }
      };
    }).catch(function (e) {
      return { ghi_kwh: failed('NASA POWER indisponible (' + (e.name === 'AbortError' ? 'délai dépassé' : e.message) + ')', meta), monthly: null };
    });
  }

  /* ---------------------------------------------------------- soil */
  function soil(lat, lon, declared) {
    var meta = { source: 'SoilGrids (ISRIC), rasters locaux', resolution: '250 m', url: 'https://www.isric.org/explore/soilgrids' };
    var fromFarmer = declared && declared !== 'unknown'
      ? field(declared, { confidence: 'declared', source: "Déclaré par l'agriculteur", status: 'ok' }) : null;
    if (!C().soilEndpoint) {
      var boundary = failed("Service de sol local non configuré. L'API REST de SoilGrids est en pause : il faut servir les rasters téléchargés pour la Tunisie (voir README).", meta);
      return Promise.resolve({ texture: fromFarmer || boundary, clay_pct: boundary, soc: boundary });
    }
    var url = C().soilEndpoint.replace('{lat}', lat).replace('{lon}', lon);
    return getJSON(url, 15000).then(function (d) {
      return {
        texture: fromFarmer || field(d.texture || null, Object.assign({ confidence: 'medium' }, meta)),
        clay_pct: field(d.clay_pct === undefined ? null : d.clay_pct, Object.assign({ unit: '%', confidence: 'medium', note: '0–30 cm' }, meta)),
        soc: field(d.soc === undefined ? null : d.soc, Object.assign({ unit: 'g/kg', confidence: 'medium', note: 'Carbone organique, 0–30 cm' }, meta))
      };
    }).catch(function (e) {
      var why = 'Service de sol indisponible (' + e.message + ')';
      return { texture: fromFarmer || failed(why, meta), clay_pct: failed(why, meta), soc: failed(why, meta) };
    });
  }

  /* ---------------------------------------------------------- build */
  function declared(v, note) {
    if (v === undefined || v === null || v === '' || v === 'unknown') return { value: null, status: 'missing', confidence: 'missing', source: "Saisie de l'agriculteur", note: note || 'Non renseigné' };
    return { value: v, status: 'ok', confidence: 'declared', source: "Saisie de l'agriculteur" };
  }

  function build(input, onStep) {
    var lat = +input.lat, lon = +input.lon;
    var step = function (k, s) { if (onStep) onStep(k, s); };
    step('climate', 'loading'); step('terrain', 'loading'); step('solar', 'loading'); step('soil', 'loading');
    var pc = climate(lat, lon).then(function (r) { step('climate', r.rain_mm.status === 'ok' ? 'ok' : 'error'); return r; });
    var pt = terrain(lat, lon).then(function (r) { step('terrain', r.slope_pct.status === 'ok' ? 'ok' : 'error'); return r; });
    var ps = solar(lat, lon).then(function (r) { step('solar', r.ghi_kwh.status === 'ok' ? 'ok' : 'error'); return r; });
    var pso = soil(lat, lon, input.soilTexture).then(function (r) { step('soil', r.texture.status === 'ok' ? 'ok' : 'error'); return r; });

    return Promise.all([pc, pt, ps, pso]).then(function (res) {
      var cl = res[0], te = res[1], so = res[2], soi = res[3];
      var dna = {
        version: 1,
        builtAt: new Date().toISOString(),
        location: { lat: lat, lon: lon, name: input.name || null },
        climate: { rain_mm: cl.rain_mm, et0_mm: cl.et0_mm, tmax_hot: cl.tmax_hot, tmin_cold: cl.tmin_cold },
        climateMonthly: cl.monthly,
        terrain: te,
        solar: { ghi_kwh: so.ghi_kwh },
        solarMonthly: so.monthly,
        soil: soi,
        crop: declared(input.crop),
        water: {
          source: declared(input.water),
          well_depth_m: declared(input.wellDepth ? +input.wellDepth : null, 'Profondeur du puits non renseignée')
        },
        energy: { pump: declared(input.pump), grid: declared(input.grid) },
        area_ha: declared(input.area ? +input.area : null, 'Surface non renseignée'),
        structures: declared(input.structures && input.structures.length ? input.structures : null, 'Aucun ouvrage déclaré')
      };
      dna.quality = quality(dna);
      return dna;
    });
  }

  // flat list of every field with its path
  function walk(dna) {
    var out = [];
    ['climate', 'terrain', 'solar', 'soil', 'water', 'energy'].forEach(function (g) {
      Object.keys(dna[g] || {}).forEach(function (k) { out.push({ path: g + '.' + k, f: dna[g][k] }); });
    });
    out.push({ path: 'crop', f: dna.crop }, { path: 'area_ha', f: dna.area_ha });
    return out;
  }
  function quality(dna) {
    var all = walk(dna);
    var missing = all.filter(function (x) { return x.f && (x.f.status === 'missing' || x.f.status === 'error'); }).map(function (x) { return x.path; });
    var core = ['climate.rain_mm', 'terrain.slope_pct', 'water.source', 'crop'];
    var coreMissing = core.filter(function (p) { return missing.indexOf(p) !== -1; });
    var overall = coreMissing.length ? 'low' : (missing.length > 4 ? 'medium' : 'medium');
    return { missing: missing, coreMissing: coreMissing, overall: overall, total: all.length };
  }

  // value at "group.key" (or "crop")
  function value(dna, path) {
    var parts = path.split('.'), node = dna;
    for (var i = 0; i < parts.length; i++) { if (!node) return null; node = node[parts[i]]; }
    if (!node || typeof node !== 'object') return null;
    return node.status === 'ok' ? node.value : null;
  }
  function fieldAt(dna, path) {
    var parts = path.split('.'), node = dna;
    for (var i = 0; i < parts.length; i++) { if (!node) return null; node = node[parts[i]]; }
    return node || null;
  }

  global.GAIA_DNA = { build: build, value: value, fieldAt: fieldAt, walk: walk };
}(window));
