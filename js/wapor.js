/* ==========================================================================
   GAIA — satellite water use from FAO WaPOR v3 (free, no key).

   WaPOR measures, from satellites, how much water the land actually gives
   to the air: actual evapotranspiration and interception (AETI), 100 m,
   monthly, for Tunisia and the Near East. GAIA reads one pixel of each
   monthly map (cloud-optimised GeoTIFF, read by HTTP range requests with
   geotiff.js), plus reference ET (RET) and precipitation (PCP), for the
   last 12 months. That gives a measured counterpart to the FAO-56 estimate:
       satellite crop coefficient  Kc_sat = Σ AETI / Σ RET
   Relative soil moisture (RSM, 0–1, dekadal, 100 m) of the latest dekad is
   read as well.

   Source: FAO (2024) WaPOR v3, https://data.apps.fao.org/wapor  (CC BY 4.0)
   ========================================================================== */
(function (global) {
  'use strict';
  var API = 'https://data.apps.fao.org/gismgr/api/v2/catalog/workspaces/WAPOR-3/mapsets/';
  var GEOTIFF = 'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm';
  var CACHE = 'gaia.wapor.v1', TTL_DAYS = 10;
  var lib = null;

  function geotiff() { return lib || (lib = import(GEOTIFF)); }
  function lsGet() { try { return JSON.parse(global.localStorage.getItem(CACHE) || '{}'); } catch (e) { return {}; } }
  function lsSet(o) { try { global.localStorage.setItem(CACHE, JSON.stringify(o)); } catch (e) { /* quota / private mode */ } }

  // The rasters of a mapset, newest first: [{period: '2026-10', url}]
  function rasters(mapset, n) {
    return fetch(API + mapset + '/rasters?paged=false&sort=code%3Adesc').then(function (r) {
      if (!r.ok) throw new Error('WaPOR catalogue ' + r.status);
      return r.json();
    }).then(function (j) {
      var items = (j.response && (j.response.items || j.response)) || [];
      return items.slice(0, n).map(function (it) {
        var m = it.dimensions && it.dimensions[0] && it.dimensions[0].member;
        return { period: m ? m.code : it.code.split('.').pop(), start: m && m.startDate, url: it.downloadUrl };
      });
    });
  }

  // One pixel of a cloud-optimised GeoTIFF, scaled; null for no-data.
  function pixel(url, lat, lon) {
    return geotiff().then(function (G) { return G.fromUrl(url); }).then(function (tif) { return tif.getImage(); }).then(function (im) {
      var o = im.getOrigin(), res = im.getResolution();
      var x = Math.floor((lon - o[0]) / res[0]), y = Math.floor((lat - o[1]) / res[1]);
      if (x < 0 || y < 0 || x >= im.getWidth() || y >= im.getHeight()) return null;
      var md = im.fileDirectory.GDAL_METADATA || '', sc = md.match(/role="scale">([-\d.eE]+)/), off = md.match(/role="offset">([-\d.eE]+)/);
      var nd = im.getGDALNoData();
      return im.readRasters({ window: [x, y, x + 1, y + 1] }).then(function (v) {
        var raw = v[0][0];
        if (raw === undefined || raw === null || raw === nd || raw <= -9999) return null;
        return raw * (sc ? +sc[1] : 1) + (off ? +off[1] : 0);
      });
    });
  }

  /* Last 12 months at a point: {months: [{period, month (0-11), aeti, ret, pcp}], kcSat, rsm, at} */
  function monthly(lat, lon) {
    var key = lat.toFixed(3) + ',' + lon.toFixed(3), cache = lsGet();
    if (cache[key] && Date.now() - cache[key].at < TTL_DAYS * 864e5) return Promise.resolve(cache[key]);
    return Promise.all([rasters('L2-AETI-M', 12), rasters('L1-RET-M', 24), rasters('L1-PCP-M', 24), rasters('L2-RSM-D', 1)]).then(function (L) {
      var byP = function (list) { var o = {}; list.forEach(function (r) { o[r.period] = r.url; }); return o; };
      var ret = byP(L[1]), pcp = byP(L[2]);
      var jobs = L[0].map(function (a) {
        return Promise.all([pixel(a.url, lat, lon), ret[a.period] ? pixel(ret[a.period], lat, lon) : null, pcp[a.period] ? pixel(pcp[a.period], lat, lon) : null])
          .then(function (v) { return { period: a.period, month: +a.period.slice(5, 7) - 1, aeti: v[0], ret: v[1], pcp: v[2] }; })
          .catch(function () { return { period: a.period, month: +a.period.slice(5, 7) - 1, aeti: null, ret: null, pcp: null }; });
      });
      var rsmJob = L[3][0] ? pixel(L[3][0].url, lat, lon).then(function (v) { return v === null ? null : { value: v, period: L[3][0].period, start: L[3][0].start }; }).catch(function () { return null; }) : Promise.resolve(null);
      return Promise.all([Promise.all(jobs), rsmJob]);
    }).then(function (r) {
      var months = r[0].sort(function (a, b) { return a.period < b.period ? -1 : 1; });
      var both = months.filter(function (m) { return m.aeti !== null && m.ret > 0; });
      if (!months.some(function (m) { return m.aeti !== null; })) throw new Error('no WaPOR data at this point');
      var sa = both.reduce(function (s, m) { return s + m.aeti; }, 0), sr = both.reduce(function (s, m) { return s + m.ret; }, 0);
      var out = { months: months, kcSat: sr > 0 ? sa / sr : null, aetiYear: months.reduce(function (s, m) { return s + (m.aeti || 0); }, 0),
        rsm: r[1], at: Date.now(), source: 'FAO WaPOR v3 (L2 AETI 100 m, L1 RET, L1 PCP, L2 RSM)', url: 'https://data.apps.fao.org/wapor' };
      cache = lsGet(); cache[key] = out;
      var keys = Object.keys(cache); if (keys.length > 20) delete cache[keys[0]];
      lsSet(cache);
      return out;
    });
  }

  global.GAIA_WAPOR = { monthly: monthly, pixel: pixel, rasters: rasters };
}(window));
