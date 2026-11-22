/* ==========================================================================
   GAIA — crop vigour from space: Sentinel-2 NDVI of the plot (free, no key).

   Sentinel-2 (ESA Copernicus) photographs every Tunisian field every 5 days
   at 10 m. NDVI = (NIR − red) / (NIR + red) measures green, active foliage:
   bare soil ≈ 0.1, a sparse olive grove 0.25–0.4, a dense irrigated crop
   0.6–0.85. A drop between two clear images is an early sign of water stress,
   disease or damage, often before it is visible on the ground.

   1. scenes over the plot from the Element 84 Earth Search STAC catalogue
      (Sentinel-2 L2A, cloud cover < 30 %, last 12 months);
   2. for each scene, a small window of the red (B04) and NIR (B08) bands
      around the plot, read by HTTP range requests from the cloud-optimised
      GeoTIFFs on AWS Open Data (geotiff.js), and the scene classification
      (SCL) to drop cloud, shadow and snow pixels;
   3. NDVI per scene, then the trend and any sudden drop.

   Sources: ESA Copernicus Sentinel-2 L2A via AWS Open Data and Element 84
   Earth Search (https://earth-search.aws.element84.com/v1), free, no key.
   ========================================================================== */
(function (global) {
  'use strict';
  var STAC = 'https://earth-search.aws.element84.com/v1/search';
  var GEOTIFF = 'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm';
  var CACHE = 'gaia.ndvi.v1', TTL_DAYS = 4;
  var lib = null;
  function geotiff() { return lib || (lib = import(GEOTIFF)); }
  function lsGet() { try { return JSON.parse(global.localStorage.getItem(CACHE) || '{}'); } catch (e) { return {}; } }
  function lsSet(o) { try { global.localStorage.setItem(CACHE, JSON.stringify(o)); } catch (e) { /* quota */ } }

  /* WGS84 lat/lon -> UTM easting/northing (Krüger series, mm accuracy), zone given by the scene's EPSG code */
  function toUTM(lat, lon, epsg) {
    var zone = epsg % 100, south = Math.floor(epsg / 100) === 327;
    var a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
    var phi = lat * Math.PI / 180, lam = lon * Math.PI / 180, lam0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
    var N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi)), T = Math.tan(phi) * Math.tan(phi), C = ep2 * Math.cos(phi) * Math.cos(phi), A = Math.cos(phi) * (lam - lam0);
    var M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi)
      + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi));
    var x = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * Math.pow(A, 5) / 120) + 500000;
    var y = k0 * (M + N * Math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * Math.pow(A, 6) / 720));
    if (south) y += 10000000;
    return [x, y];
  }

  /* pixel values of a COG in a square window of half-size r metres around (x, y) */
  var tifs = {};
  function windowOf(url, xy, r) {
    tifs[url] = tifs[url] || geotiff().then(function (G) { return G.fromUrl(url, { allowFullFile: false }); }).then(function (t) { return t.getImage(); });
    return tifs[url].then(function (im) {
      var o = im.getOrigin(), res = im.getResolution();
      var x0 = Math.floor((xy[0] - r - o[0]) / res[0]), x1 = Math.ceil((xy[0] + r - o[0]) / res[0]);
      var y0 = Math.floor((xy[1] + r - o[1]) / res[1]), y1 = Math.ceil((xy[1] - r - o[1]) / res[1]);
      x1 = Math.max(x1, x0 + 1); y1 = Math.max(y1, y0 + 1);
      if (x0 < 0 || y0 < 0 || x1 > im.getWidth() || y1 > im.getHeight()) return null;
      return im.readRasters({ window: [x0, y0, x1, y1], interleave: false }).then(function (v) { return { data: v[0], w: x1 - x0, h: y1 - y0 }; });
    });
  }

  var KEEP_SCL = { 4: 1, 5: 1 };                // vegetation, bare soil; drops cloud (8, 9), cirrus (10), shadow (3), water, snow, no data
  function sceneNDVI(item, lat, lon, r) {
    var p = item.properties || {}, epsg = p['proj:epsg'] || +(String(p['proj:code'] || '').split(':')[1]);
    var A = item.assets || {}, red = A.red || A.B04, nir = A.nir || A.B08, scl = A.scl || A.SCL;
    if (!epsg || !red || !nir) return Promise.resolve(null);
    var xy = toUTM(lat, lon, epsg);
    var offset = p['earthsearch:boa_offset_applied'] === false && parseFloat(p['s2:processing_baseline'] || 0) >= 4 ? -1000 : 0;
    return Promise.all([windowOf(red.href, xy, r), windowOf(nir.href, xy, r), scl ? windowOf(scl.href, xy, Math.max(r, 10)) : Promise.resolve(null)]).then(function (w) {
      var R = w[0], Nn = w[1], S = w[2];
      if (!R || !Nn) return null;
      var sum = 0, n = 0, tot = R.w * R.h;
      for (var j = 0; j < R.h; j++) for (var i = 0; i < R.w; i++) {
        if (S) {   // SCL is 20 m: the 10 m pixel (i, j) falls in SCL pixel (i/2, j/2) of a window that starts at the same corner (± 1 px)
          var si = Math.min(S.w - 1, Math.floor(i * S.w / R.w)), sj = Math.min(S.h - 1, Math.floor(j * S.h / R.h));
          if (!KEEP_SCL[S.data[sj * S.w + si]]) continue;
        }
        var rr = (R.data[j * R.w + i] + offset) / 10000, nn = (Nn.data[j * R.w + i] + offset) / 10000;
        if (rr <= 0 || nn <= 0) continue;
        sum += (nn - rr) / (nn + rr); n++;
      }
      return { date: (p.datetime || '').slice(0, 10), cloud: p['eo:cloud_cover'], clear: n / tot, ndvi: n >= Math.max(1, 0.5 * tot) ? sum / n : null, pixels: n };
    }).catch(function () { return null; });
  }

  function search(lat, lon, months) {
    var end = new Date(), start = new Date(end.getTime() - months * 30.5 * 864e5);
    var body = { collections: ['sentinel-2-l2a'], intersects: { type: 'Point', coordinates: [lon, lat] },
      datetime: start.toISOString().slice(0, 19) + 'Z/' + end.toISOString().slice(0, 19) + 'Z', limit: 200,
      query: { 'eo:cloud_cover': { lt: 30 } }, fields: { include: ['properties', 'assets.red', 'assets.nir', 'assets.scl'] } };
    return fetch(STAC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('Earth Search ' + r.status); return r.json(); })
      .then(function (j) { return j.features || []; });
  }

  // at most two scenes a month (the clearest), one per date (a point can sit in two overlapping tiles)
  function pick(items) {
    var byDate = {}, byMonth = {};
    items.forEach(function (it) { var d = (it.properties.datetime || '').slice(0, 10); if (!byDate[d] || it.properties['eo:cloud_cover'] < byDate[d].properties['eo:cloud_cover']) byDate[d] = it; });
    Object.keys(byDate).forEach(function (d) { (byMonth[d.slice(0, 7)] = byMonth[d.slice(0, 7)] || []).push(byDate[d]); });
    var out = [];
    Object.keys(byMonth).forEach(function (m) {
      var l = byMonth[m].sort(function (a, b) { return a.properties['eo:cloud_cover'] - b.properties['eo:cloud_cover']; }).slice(0, 2);
      out = out.concat(l);
    });
    return out.sort(function (a, b) { return a.properties.datetime < b.properties.datetime ? -1 : 1; });
  }

  function limit(n, tasks) {   // run promise factories n at a time
    var i = 0, res = new Array(tasks.length);
    function next() { if (i >= tasks.length) return Promise.resolve(); var k = i++; return tasks[k]().then(function (v) { res[k] = v; return next(); }); }
    var w = []; for (var j = 0; j < Math.min(n, tasks.length); j++) w.push(next());
    return Promise.all(w).then(function () { return res; });
  }

  function median(a) { var s = a.slice().sort(function (x, y) { return x - y; }); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; }
  function analyse(scenes) {
    var ok = scenes.filter(function (s) { return s && s.ndvi !== null; });
    if (!ok.length) return { scenes: ok, latest: null };
    var v = ok.map(function (s) { return s.ndvi; }), last = ok[ok.length - 1], med = median(v);
    // sudden drop: latest clear scene vs the mean of the 3 before it
    var prev = ok.slice(-4, -1).map(function (s) { return s.ndvi; }), prevMean = prev.length ? prev.reduce(function (a, b) { return a + b; }, 0) / prev.length : null;
    var drop = prevMean !== null ? last.ndvi - prevMean : null;
    // linear trend over the last 90 days (NDVI per month)
    var t0 = Date.parse(last.date), rec = ok.filter(function (s) { return t0 - Date.parse(s.date) <= 90 * 864e5; });
    var slope = null;
    if (rec.length >= 3) {
      var xs = rec.map(function (s) { return (Date.parse(s.date) - t0) / (30.4 * 864e5); }), ys = rec.map(function (s) { return s.ndvi; });
      var mx = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length, my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length, sxy = 0, sxx = 0;
      xs.forEach(function (x, i) { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); });
      slope = sxx > 0 ? sxy / sxx : null;
    }
    var status = drop !== null && drop <= -0.08 ? 'drop' : slope !== null && slope <= -0.03 ? 'declining' : slope !== null && slope >= 0.03 ? 'greening' : 'stable';
    return { scenes: ok, latest: last, median12: med, min12: Math.min.apply(null, v), max12: Math.max.apply(null, v), drop: drop, trend_per_month: slope, status: status };
  }

  /* NDVI series of the plot for the last `months` months. opts: { months: 12, radius_m: 25 } */
  function series(lat, lon, opts) {
    opts = opts || {};
    var months = opts.months || 12, r = opts.radius_m || 25, key = lat.toFixed(4) + ',' + lon.toFixed(4) + ',' + r, cache = lsGet();
    if (cache[key] && Date.now() - cache[key].at < TTL_DAYS * 864e5) return Promise.resolve(cache[key].v);
    return search(lat, lon, months).then(function (items) {
      var sel = pick(items);
      return limit(4, sel.map(function (it) { return function () { return sceneNDVI(it, lat, lon, r); }; }));
    }).then(function (scenes) {
      var res = analyse(scenes);
      res.source = 'ESA Copernicus Sentinel-2 L2A (10 m), AWS Open Data via Element 84 Earth Search';
      res.window_m = 2 * r; res.at = new Date().toISOString();
      var c = lsGet(); c[key] = { at: Date.now(), v: res }; lsSet(c);
      return res;
    });
  }

  global.GAIA_NDVI = { series: series, analyse: analyse, toUTM: toUTM, sceneNDVI: sceneNDVI, pick: pick };
}(typeof window !== 'undefined' ? window : globalThis));
