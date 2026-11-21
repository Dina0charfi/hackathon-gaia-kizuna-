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
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status); err.status = r.status; err.retryAfter = +r.headers.get('Retry-After') || 0;
        // Open-Meteo says why it refused: a daily quota will not clear with a retry
        return r.text().then(function (txt) { err.daily = /daily/i.test(txt || ''); throw err; }, function () { throw err; });
      }
      return r.json();
    }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function why(e) { return e.name === 'AbortError' ? 'délai dépassé' : e.message; }

  // Retry on rate limit (429), server errors and network errors, with growing waits
  // (Retry-After is honoured when the server sends a short one). Other errors fail at once.
  function getJSONRetry(url, timeoutMs, waits) {
    waits = waits || [1500, 4000];
    var attempt = function (i) {
      return getJSON(url, timeoutMs).catch(function (e) {
        var retriable = !e.status || e.status === 429 || e.status >= 500;
        if (!retriable || e.daily || i >= waits.length || e.name === 'AbortError') throw e;
        var ms = e.retryAfter > 0 && e.retryAfter <= 10 ? e.retryAfter * 1000 : waits[i] * (0.8 + Math.random() * 0.4);
        return new Promise(function (res) { setTimeout(res, ms); }).then(function () { return attempt(i + 1); });
      });
    };
    return attempt(0);
  }

  // Small cache in the browser: a plot looked at again (or a neighbour within ≈ 1 km)
  // does not call the APIs again. Reads and writes never throw (private mode, quota).
  var CACHE_DAYS = 60;
  function cacheGet(key) {
    try {
      var x = JSON.parse(global.localStorage.getItem('gaia.cache.' + key));
      if (x && Date.now() - x.t < CACHE_DAYS * 864e5) return x.v;
    } catch (e) { /* no storage */ }
    return null;
  }
  function cacheSet(key, v) {
    try { global.localStorage.setItem('gaia.cache.' + key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* full or blocked */ }
  }
  // a flag is a "skip this source until" time
  function flagGet(key) {
    try { return +global.localStorage.getItem('gaia.flag.' + key) > Date.now(); } catch (e) { return false; }
  }
  function flagSet(key, minutes) { try { global.localStorage.setItem('gaia.flag.' + key, String(Date.now() + minutes * 6e4)); } catch (e) { /* ignore */ } }
  function cell(lat, lon, d) { return lat.toFixed(d) + ',' + lon.toFixed(d); }

  /* ---------------------------------------------------------- NASA POWER (one request per plot) */
  // One climatology request serves both the sun (GHI) and the climate fallback, so a
  // plot never costs more than one POWER call; it is cached per ≈ 5 km.
  var powerMemo = {};
  function power(lat, lon) {
    var key = 'power:' + cell(lat, lon, 2);
    if (powerMemo[key]) return powerMemo[key];
    var hit = cacheGet(key);
    if (hit) return (powerMemo[key] = Promise.resolve(hit));
    var url = 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=' + global.GAIA_CLIMATE.PARAMS.join(',') +
      '&community=RE&longitude=' + lon.toFixed(4) + '&latitude=' + lat.toFixed(4) + '&format=JSON';
    powerMemo[key] = getJSONRetry(url, 30000).then(function (d) {
      var p = d && d.properties && d.properties.parameter;
      if (!p || !p.ALLSKY_SFC_SW_DWN) throw new Error('paramètre absent');
      var out = { p: p, fill: d.header && d.header.fill_value, z: d.geometry && d.geometry.coordinates && d.geometry.coordinates[2],
        unit: (d.parameters && d.parameters.ALLSKY_SFC_SW_DWN && d.parameters.ALLSKY_SFC_SW_DWN.units) || 'kWh/m²/jour' };
      cacheSet(key, out);
      return out;
    });
    powerMemo[key].catch(function () { delete powerMemo[key]; });
    return powerMemo[key];
  }

  /* ---------------------------------------------------------- climate */
  // Order: 1) browser cache, 2) Open-Meteo archive (ERA5, 10 years, one request, retried),
  // 3) NASA POWER climatology (same request as the sun) with FAO-56 ET0 computed here,
  // 4) the bundled NASA POWER normals table (js/climate-tn.js), confidence "low".
  // After a 429, Open-Meteo is skipped for 15 min (6 h when its daily quota is used up, which
  // happens on shared hackathon / campus IPs: 10 years of daily data weigh ≈ 100 API calls).
  var OM_META = function (p) { return { source: 'Open-Meteo Historical API (réanalyse ERA5 / ERA5-Land)', resolution: '≈ 11–25 km', period: p.start.slice(0, 4) + '–' + p.end.slice(0, 4), url: 'https://open-meteo.com/en/docs/historical-weather-api' }; };
  var POWER_META = { source: 'NASA POWER — climatologie 2001–2025 (MERRA-2)', resolution: '≈ 50 km (0,5° × 0,625°)', period: '2001–2025', url: 'https://power.larc.nasa.gov/' };

  function climateFields(v, meta, conf, notes) {
    notes = notes || {};
    var n = function (k, base) { return [base, notes.all].filter(Boolean).join(' · ') || undefined; };
    return {
      rain_mm: field(v.rain_mm, Object.assign({ unit: 'mm/an', confidence: conf.rain, note: n('rain', notes.rain), extra: v.extra }, meta)),
      et0_mm: field(v.et0_mm, Object.assign({ unit: 'mm/an', confidence: conf.et0, note: n('et0', notes.et0) }, meta)),
      tmax_hot: field(v.tmax_hot, Object.assign({ unit: '°C', confidence: conf.t, note: n('t', 'Moyenne des maximales du mois le plus chaud') }, meta)),
      tmin_cold: field(v.tmin_cold, Object.assign({ unit: '°C', confidence: conf.t, note: n('t', 'Moyenne des minimales du mois le plus froid') }, meta)),
      monthly: Object.assign({ source: meta.source, period: meta.period }, v.monthly)
    };
  }

  function openMeteo(lat, lon) {
    var p = C().climatePeriod;
    var url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat.toFixed(3) + '&longitude=' + lon.toFixed(3) +
      '&start_date=' + p.start + '&end_date=' + p.end +
      '&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min&timezone=auto';
    var meta = OM_META(p);
    return getJSONRetry(url, 30000).then(function (d) {
      var D = d.daily;
      if (!D || !D.time || !D.time.length) throw new Error('réponse vide');
      var years = {}, monthsP = {}, monthsE = {}, monthTmax = {}, monthTmin = {};
      D.time.forEach(function (day, i) {
        var y = day.slice(0, 4), m = +day.slice(5, 7) - 1, key = y + '-' + m;
        var pr = D.precipitation_sum[i], et = D.et0_fao_evapotranspiration[i];
        if (pr !== null) { years[y] = (years[y] || 0) + pr; monthsP[key] = (monthsP[key] || 0) + pr; }
        if (et !== null) monthsE[key] = (monthsE[key] || 0) + et;
        if (D.temperature_2m_max[i] !== null) (monthTmax[m] = monthTmax[m] || []).push(D.temperature_2m_max[i]);
        if (D.temperature_2m_min[i] !== null) (monthTmin[m] = monthTmin[m] || []).push(D.temperature_2m_min[i]);
      });
      var yearTotals = Object.keys(years).map(function (y) { return years[y]; });
      var mean = function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; };
      var monthlyMean = function (store) {
        var out = [];
        for (var m = 0; m < 12; m++) {
          var vals = Object.keys(store).filter(function (k) { return +k.split('-')[1] === m; }).map(function (k) { return store[k]; });
          out.push(vals.length ? mean(vals) : null);
        }
        return out;
      };
      var rainM = monthlyMean(monthsP), et0M = monthlyMean(monthsE), tmaxM = [], tminM = [];
      for (var m = 0; m < 12; m++) { tmaxM.push(monthTmax[m] ? mean(monthTmax[m]) : null); tminM.push(monthTmin[m] ? mean(monthTmin[m]) : null); }
      var nn = function (a) { return a.filter(function (v) { return v !== null; }); };
      return climateFields({
        rain_mm: mean(yearTotals), et0_mm: et0M.reduce(function (s, v) { return s + (v || 0); }, 0),
        tmax_hot: Math.max.apply(null, nn(tmaxM)), tmin_cold: Math.min.apply(null, nn(tminM)),
        extra: { min: Math.min.apply(null, yearTotals), max: Math.max.apply(null, yearTotals), years: yearTotals.length },
        monthly: { rain: rainM, et0: et0M, tmax: tmaxM, tmin: tminM }
      }, meta, { rain: 'medium', et0: 'medium', t: 'medium' }, { et0: 'ET0 FAO Penman–Monteith calculée par Open-Meteo' });
    });
  }

  function climate(lat, lon) {
    var key = 'climate:' + cell(lat, lon, 2);
    var hit = cacheGet(key);
    if (hit && hit.rain_mm && hit.rain_mm.status === 'ok') return Promise.resolve(hit);
    var omSkipped = flagGet('om429');
    var primary = omSkipped ? Promise.reject(new Error('HTTP 429')) : openMeteo(lat, lon);
    return primary.then(function (r) { cacheSet(key, r); return r; }, function (e) {
      if (e.status === 429 && !omSkipped) flagSet('om429', e.daily ? 360 : 15);
      var reason = 'Open-Meteo indisponible (' + why(e) + (e.daily ? ', quota journalier atteint' : '') + ')';
      return power(lat, lon).then(function (pw) {
        var v = global.GAIA_CLIMATE.fromPower(pw.p, pw.z, pw.fill);
        if (!v || v.rain_mm === null) throw new Error('paramètre absent');
        var r = climateFields(v, POWER_META, { rain: 'low', et0: 'medium', t: 'medium' }, {
          all: reason + ' : repli sur NASA POWER.',
          rain: 'Grille d’environ 50 km : la pluie locale peut s’en écarter nettement.',
          et0: 'ET0 FAO-56 Penman–Monteith calculée par GAIA à partir des moyennes mensuelles NASA POWER'
        });
        cacheSet(key, r);
        return r;
      }).catch(function (e2) {
        var T = global.GAIA_CLIMATE_TN, v = T ? T.lookup(lat, lon) : null;
        var tm = { source: T ? T.source : 'Table GAIA intégrée', resolution: 'grille 0,5° interpolée', period: '2001–2025', url: T ? T.url : null };
        var all = reason + ' ; NASA POWER indisponible (' + why(e2) + ').';
        if (!v) return { rain_mm: failed(all, tm), et0_mm: failed(all, tm), tmax_hot: failed(all, tm), tmin_cold: failed(all, tm), monthly: null };
        return climateFields(v, tm, { rain: 'low', et0: 'low', t: 'low' }, {
          all: all + ' Valeurs interpolées de la table intégrée (point le plus proche ≈ ' + v.km + ' km).'
        });
      });
    });
  }

  // Open-Meteo forecast calls from the other pages (Dashboard, My season, Agrivoltaics) go through this:
  // a short browser cache (the forecast changes a few times a day) and the same 429 skip flag as the
  // climate archive, so a used-up quota is not hit again from every page.
  function forecastJSON(url, ttlMin, timeoutMs) {
    var key = 'wx:' + url, x = null;
    try { x = JSON.parse(global.localStorage.getItem('gaia.cache.' + key)); } catch (e) { /* no storage */ }
    if (x && Date.now() - x.t < (ttlMin || 60) * 6e4) return Promise.resolve(x.v);
    if (flagGet('om429')) { var err = new Error('HTTP 429'); err.status = 429; return Promise.reject(err); }
    return getJSON(url, timeoutMs || 15000).then(function (j) { cacheSet(key, j); return j; }, function (e) {
      if (e.status === 429) flagSet('om429', e.daily ? 360 : 15);
      throw e;
    });
  }

  /* ---------------------------------------------------------- terrain */
  // Five elevation samples (centre + 4 neighbours) → slope by central differences.
  function terrain(lat, lon) {
    var tkey = 'terrain:' + cell(lat, lon, 4), thit = cacheGet(tkey);   // ≈ 10 m: the same plot rebuilt costs no call
    if (thit && thit.slope_pct && thit.slope_pct.status === 'ok') return Promise.resolve(thit);
    return terrainLive(lat, lon).then(function (r) { if (r.slope_pct && r.slope_pct.status === 'ok') cacheSet(tkey, r); return r; });
  }
  function terrainLive(lat, lon) {
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
    var meta = { source: 'NASA POWER — climatologie, ALLSKY_SFC_SW_DWN', resolution: 'grille globale (≈ 0,5°)', url: 'https://power.larc.nasa.gov/' };
    return power(lat, lon).then(function (pw) {
      var p = pw.p.ALLSKY_SFC_SW_DWN, fill = pw.fill;
      var monthly = MONTHS.map(function (k) { var v = p[k]; return (v === undefined || v === fill) ? null : v; });
      var ann = p.ANN !== undefined && p.ANN !== fill ? p.ANN : null;
      var unit = /kW-?hr?\/m\^?2\/day/i.test(pw.unit) ? 'kWh/m²/jour' : pw.unit;
      return {
        ghi_kwh: field(ann, Object.assign({ unit: unit, confidence: 'medium', note: 'Rayonnement global horizontal, moyenne annuelle' }, meta)),
        monthly: { ghi: monthly, unit: unit, source: meta.source }
      };
    }).catch(function (e) {
      return { ghi_kwh: failed('NASA POWER indisponible (' + why(e) + ')', meta), monthly: null };
    });
  }

  /* ---------------------------------------------------------- soil */
  // Order: 1) configured soil service (local SoilGrids rasters), 2) the SoilGrids
  // REST API (paused by ISRIC in 2024-25, answering again in Nov 2026; one retry, and not
  // tried again for 30 min once it failed), 3) the bundled 5 km grid of SoilGrids 2.0 values (js/soil-grid-tn.js),
  // 4) the regional reference table in js/soil-tn.js, shown with confidence "low".
  function textureOf(sand, clay) {
    if (clay === null || clay === undefined) return null;
    if (clay >= 35) return 'clayey';
    if (sand !== null && sand !== undefined && sand >= 65 && clay < 15) return 'sandy';
    return 'loamy';
  }
  function soilGridsRest(lat, lon) {
    var url = 'https://rest.isric.org/soilgrids/v2.0/properties/query?lon=' + lon + '&lat=' + lat +
      '&property=clay&property=sand&property=soc&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean';
    return getJSONRetry(url, 12000, [1500]).then(function (d) {
      var out = {};
      ((d.properties && d.properties.layers) || []).forEach(function (L) {
        var w = { '0-5cm': 5, '5-15cm': 10, '15-30cm': 15 }, sum = 0, wt = 0;
        (L.depths || []).forEach(function (dp) {
          var v = dp.values && dp.values.mean;
          if (v !== null && v !== undefined && w[dp.label]) { sum += v * w[dp.label]; wt += w[dp.label]; }
        });
        var factor = (L.unit_measure && L.unit_measure.d_factor) || 10;
        if (wt) out[L.name] = sum / wt / factor; // clay, sand: % ; soc: g/kg
      });
      if (out.clay === undefined) throw new Error('aucune valeur (zone non cartographiée)');
      return out;
    });
  }
  function soil(lat, lon, declared) {
    var meta = { source: 'SoilGrids 2.0 (ISRIC)', resolution: '250 m', url: 'https://www.isric.org/explore/soilgrids' };
    var fromFarmer = declared && declared !== 'unknown'
      ? field(declared, { confidence: 'declared', source: "Déclaré par l'agriculteur", status: 'ok' }) : null;
    var fromGrid = function (d, m, why, conf) {
      var tx = d.texture || textureOf(d.sand, d.clay_pct !== undefined ? d.clay_pct : d.clay);
      var clay = d.clay_pct !== undefined ? d.clay_pct : d.clay;
      conf = conf || {};
      return {
        texture: fromFarmer || field(tx || null, Object.assign({ confidence: conf.clay || 'medium', note: why || 'Classe déduite de la teneur en argile et en sable (0–30 cm)' }, m)),
        clay_pct: field(clay === undefined ? null : clay, Object.assign({ unit: '%', confidence: conf.clay || 'medium', note: '0–30 cm' + (why ? '. ' + why : '') }, m)),
        soc: field(d.soc === undefined ? null : d.soc, Object.assign({ unit: 'g/kg', confidence: conf.soc || 'medium', note: 'Carbone organique, 0–30 cm' + (why ? '. ' + why : '') }, m))
      };
    };
    var regional = function (reason) {
      var R = global.GAIA_SOIL_TN, hit = R ? R.lookup(lat, lon) : null;
      var rm = { source: R ? R.source : 'Référence régionale', resolution: 'zone agro-écologique', url: R ? R.url : null };
      if (!hit) {
        var why = reason + ' Aucune zone de référence à moins de 120 km : faites analyser le sol.';
        return { texture: fromFarmer || failed(why, rm), clay_pct: failed(why, rm), soc: failed(why, rm) };
      }
      var note = 'Valeur typique de la zone « ' + hit.zone + ' » (≈ ' + hit.km + ' km), pas une mesure de la parcelle. ' + reason;
      return {
        texture: fromFarmer || field(hit.texture, Object.assign({ confidence: 'low', note: note }, rm)),
        clay_pct: field(hit.clay_pct, Object.assign({ unit: '%', confidence: 'low', note: '0–30 cm. ' + note }, rm)),
        soc: field(hit.soc, Object.assign({ unit: 'g/kg', confidence: 'low', note: '0–30 cm. ' + note }, rm))
      };
    };
    var bundled = function (reason) {
      var Gd = global.GAIA_SOIL_GRID, hit = Gd ? Gd.lookup(lat, lon) : null;
      if (!hit) return regional(reason);
      var gm = { source: Gd.source, resolution: 'maille ≈ 5 km (16 points à 250 m)', url: Gd.url };
      var note = hit.km ? 'Moyenne SoilGrids de la maille voisine (≈ ' + hit.km + ' km, côte ou zone non cartographiée), pas une mesure de la parcelle.'
        : 'Moyenne SoilGrids de la maille de 5 km qui contient la parcelle, pas une mesure de la parcelle.';
      return fromGrid({ clay: hit.clay_pct, sand: hit.sand_pct, soc: hit.soc }, gm, note, { clay: hit.km ? 'low' : 'medium', soc: 'low' });
    };
    var viaRest = function () {
      if (flagGet('soilgrids-down')) return Promise.resolve(bundled('SoilGrids injoignable : API REST en pause.'));
      return soilGridsRest(lat, lon).then(function (d) { return fromGrid(d, meta); })
        .catch(function (e) { flagSet('soilgrids-down', 30); return bundled('SoilGrids injoignable (' + why(e) + ') : API REST en pause.'); });
    };
    if (!C().soilEndpoint) return viaRest();
    var url = C().soilEndpoint.replace('{lat}', lat).replace('{lon}', lon);
    return getJSON(url, 15000).then(function (d) {
      return fromGrid(d, Object.assign({}, meta, { source: 'SoilGrids 2.0 (ISRIC), rasters locaux' }), 'Rasters SoilGrids servis localement');
    }).catch(function () { return viaRest(); });
  }

  /* ---------------------------------------------------------- build */
  function declared(v, note, demo) {
    if (v === undefined || v === null || v === '' || v === 'unknown') return { value: null, status: 'missing', confidence: 'missing', source: "Saisie de l'agriculteur", note: (note || 'Non renseigné') + ' — à saisir dans « Votre exploitation »' };
    if (demo) return { value: v, status: 'ok', confidence: 'low', source: 'Valeur de démonstration', note: 'Valeur type pré-remplie pour la démo : remplacez-la par la vôtre.' };
    return { value: v, status: 'ok', confidence: 'declared', source: "Saisie de l'agriculteur" };
  }

  function build(input, onStep) {
    var lat = +input.lat, lon = +input.lon;
    var step = function (k, s) { if (onStep) onStep(k, s); };
    var demo = input.demo || {};
    step('climate', 'loading'); step('terrain', 'loading'); step('solar', 'loading'); step('soil', 'loading');
    var pc = climate(lat, lon).then(function (r) { step('climate', r.rain_mm.status !== 'ok' ? 'error' : /^Open-Meteo/.test(r.rain_mm.source) ? 'ok' : 'approx'); return r; });
    var pt = terrain(lat, lon).then(function (r) { step('terrain', r.slope_pct.status === 'ok' ? 'ok' : 'error'); return r; });
    var ps = solar(lat, lon).then(function (r) { step('solar', r.ghi_kwh.status === 'ok' ? 'ok' : 'error'); return r; });
    var pso = soil(lat, lon, input.soilTexture).then(function (r) { step('soil', r.clay_pct.status !== 'ok' ? 'error' : r.clay_pct.resolution === '250 m' ? 'ok' : 'approx'); return r; });

    return Promise.all([pc, pt, ps, pso]).then(function (res) {
      var cl = res[0], te = res[1], so = res[2], soi = res[3];
      var dna = {
        version: 1,
        builtAt: new Date().toISOString(),
        location: { lat: lat, lon: lon, name: input.name || null },
        climate: { rain_mm: cl.rain_mm, et0_mm: cl.et0_mm, tmax_hot: cl.tmax_hot, tmin_cold: cl.tmin_cold },
        climateMonthly: cl.monthly && !cl.monthly.ghi && so.monthly ? Object.assign({}, cl.monthly, { ghi: so.monthly.ghi }) : cl.monthly,
        terrain: te,
        solar: { ghi_kwh: so.ghi_kwh },
        solarMonthly: so.monthly,
        soil: soi,
        crop: declared(input.crop, 'Culture non renseignée', demo.crop),
        water: {
          source: declared(input.water, "Source d'eau non renseignée", demo.water),
          well_depth_m: input.water && input.water !== 'well' && !input.wellDepth
            ? { value: null, status: 'na', confidence: 'declared', source: "Saisie de l'agriculteur", note: "Sans objet : pas de puits déclaré" }
            : declared(input.wellDepth ? +input.wellDepth : null, 'Profondeur du puits non renseignée', demo.wellDepth)
        },
        energy: { pump: declared(input.pump, 'Pompage non renseigné', demo.pump) },
        area_ha: declared(input.area ? +input.area : null, 'Surface non renseignée', demo.area),
        structures: declared(input.structures && input.structures.length ? input.structures : null, 'Ouvrages non renseignés (cochez « Aucun » s’il n’y en a pas)', demo.structures)
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

  global.GAIA_DNA = { build: build, value: value, fieldAt: fieldAt, walk: walk, forecastJSON: forecastJSON };
}(window));
