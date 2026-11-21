/* ==========================================================================
   GAIA SOIL REFERENCE — regional topsoil values for Tunisia (fallback).

   Used only when no measured or gridded value is reachable (SoilGrids REST
   paused, no local raster). Each point is an ORDER OF MAGNITUDE for the
   dominant topsoil (0–30 cm) of an agro-ecological zone, compiled from the
   broad soil patterns described in the Harmonized World Soil Database v2.0
   (FAO / IIASA) and the SoilGrids 2.0 maps. They are NOT measurements of the
   parcel: the Land DNA shows them with confidence "low" and says so.
   Replace with a soil analysis, a local SoilGrids raster or a CRDA soil map.
   ========================================================================== */
(function (global) {
  'use strict';

  // [zone, lat, lon, texture, clay %, organic carbon g/kg]
  var POINTS = [
    ['Kroumirie (Aïn Draham), sols forestiers', 36.78, 8.69, 'clayey', 38, 18],
    ['Vallée de la Medjerda (Jendouba, Béja), vertisols', 36.60, 9.20, 'clayey', 45, 12],
    ['Plaine de Mateur (Bizerte)', 37.05, 9.67, 'clayey', 40, 12],
    ['Basse vallée (Tunis, Manouba)', 36.80, 10.05, 'clayey', 32, 10],
    ['Cap Bon (Nabeul, Menzel Bouzelfa)', 36.55, 10.70, 'loamy', 18, 8],
    ['Dorsale (Siliana, Le Kef)', 36.05, 9.15, 'clayey', 33, 11],
    ['Sahel (Sousse, Monastir)', 35.75, 10.70, 'sandy', 14, 6],
    ['Plaine de Kairouan', 35.65, 10.05, 'loamy', 22, 7],
    ['Oueslatia (Kairouan Ouest)', 35.85, 9.60, 'loamy', 24, 8],
    ['Hautes steppes (Kasserine)', 35.20, 8.80, 'loamy', 20, 6],
    ['Sidi Bouzid', 35.04, 9.48, 'sandy', 14, 5],
    ['Plaine de Sfax', 34.75, 10.60, 'sandy', 10, 4],
    ['Gafsa', 34.42, 8.78, 'sandy', 12, 4],
    ['Djérid (Tozeur, Nefta), sols d’oasis gypseux', 33.92, 8.13, 'sandy', 8, 5],
    ['Nefzaoua (Kébili)', 33.70, 8.97, 'sandy', 6, 3],
    ['Oasis de Gabès', 33.88, 10.10, 'sandy', 12, 6],
    ['Matmata, Béni Khédache (loess des jessour)', 33.45, 10.15, 'loamy', 16, 4],
    ['Plaine de la Jeffara (Médenine)', 33.35, 10.50, 'sandy', 10, 3],
    ['Djerba, Zarzis', 33.70, 10.90, 'sandy', 8, 3],
    ['Dahar (Tataouine)', 32.90, 10.20, 'sandy', 8, 2],
    ['Sahara (Remada, El Borma)', 31.50, 9.80, 'sandy', 4, 1]
  ];
  var SOURCE = 'Référence régionale GAIA (ordres de grandeur d’après HWSD v2 FAO/IIASA et SoilGrids 2.0)';
  var URL = 'https://www.fao.org/soils-portal/data-hub/soil-maps-and-databases/harmonized-world-soil-database-v20/en/';

  function km(aLat, aLon, bLat, bLon) {
    var r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }

  // nearest reference zone, or null when the point is more than maxKm away from every zone
  function lookup(lat, lon, maxKm) {
    var best = null;
    POINTS.forEach(function (p) {
      var d = km(lat, lon, p[1], p[2]);
      if (!best || d < best.km) best = { zone: p[0], texture: p[3], clay_pct: p[4], soc: p[5], km: d };
    });
    if (!best || best.km > (maxKm || 120)) return null;
    best.km = Math.round(best.km);
    return best;
  }

  global.GAIA_SOIL_TN = { points: POINTS, lookup: lookup, source: SOURCE, url: URL };
}(typeof window !== 'undefined' ? window : this));
