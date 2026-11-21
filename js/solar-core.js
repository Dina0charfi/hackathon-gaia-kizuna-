/* ==========================================================================
   GAIA AGRIVOLTAIC — simplified physical model (M3). Pure functions, no DOM.

   Per month, one representative day (the 15th), 15-minute steps in solar time:
   - sun position: declination (Spencer series), hour angle, elevation, azimuth
   - daily diffuse fraction: Erbs correlation on the clearness index KT = H / H0
     (as given in Duffie & Beckman); hourly profiles proportional to sin(elevation)
   - plane-of-array irradiance: isotropic sky (beam + diffuse + ground-reflected)
   - energy: kWp × POA[kWh/m²] × PR (temperature and system losses folded into PR)
   - ground shading: 2-D cross-section of infinitely long rows; each row's
     beam shadow is projected on the ground along the sun's profile angle
   - light reaching the crop: unshaded beam + diffuse reduced by the panels'
     horizontal cover ratio (approximation)
   This is a teaching-grade simulation. The backend version uses pvlib.
   ========================================================================== */

(function (root) {
  'use strict';

  var RAD = Math.PI / 180, DOY = [15, 46, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
  var DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function declination(doy) {
    var g = 2 * Math.PI / 365 * (doy - 1);
    return 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
      + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g); // radians
  }

  // solar time in hours → { el, az } in degrees; az from north, clockwise
  function sunPosition(latDeg, doy, solarHour) {
    var phi = latDeg * RAD, dec = declination(doy), H = (solarHour - 12) * 15 * RAD;
    var sinEl = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
    var el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
    var az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / RAD + 180;
    return { el: el / RAD, az: (az + 360) % 360 };
  }

  // daily extraterrestrial irradiation on a horizontal plane, kWh/m²
  function h0(latDeg, doy) {
    var phi = latDeg * RAD, dec = declination(doy);
    var ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(dec))));
    return 24 / Math.PI * 1.367 * (1 + 0.033 * Math.cos(2 * Math.PI * doy / 365)) *
      (Math.cos(phi) * Math.cos(dec) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(dec));
  }

  // Erbs daily diffuse fraction (Duffie & Beckman)
  function diffuseFraction(KT, wsDeg) {
    if (wsDeg <= 81.4) return KT < 0.715 ? 1 - 0.2727 * KT + 2.4495 * KT * KT - 11.9514 * Math.pow(KT, 3) + 9.3879 * Math.pow(KT, 4) : 0.143;
    return KT < 0.722 ? 1 + 0.2832 * KT - 2.5557 * KT * KT + 0.8448 * Math.pow(KT, 3) : 0.175;
  }

  // ground beam shadow of one row, as a fraction of the row pitch (0..1)
  function shadeFraction(sun, g) {
    if (sun.el <= 0) return 1;
    var c = Math.cos((sun.az - g.azimuth) * RAD), cotEl = 1 / Math.tan(sun.el * RAD);
    var b = g.tilt * RAD, half = g.width / 2;
    // x axis points the way the panel faces; shadow moves away from the sun
    var x1 = half * Math.cos(b), z1 = g.height - half * Math.sin(b);   // front (low) edge
    var x2 = -half * Math.cos(b), z2 = g.height + half * Math.sin(b);  // back (high) edge
    var s1 = x1 - z1 * c * cotEl, s2 = x2 - z2 * c * cotEl;
    return { frac: Math.min(1, Math.abs(s1 - s2) / g.pitch), a: Math.min(s1, s2), b: Math.max(s1, s2) };
  }

  /**
   * g: { lat, ghi[12] kWh/m²/day, tilt°, azimuth° (180 = south), height m, width m, pitch m,
   *      area_ha, density_wp_m2, pr, albedo }
   */
  function simulate(g) {
    var gcr = g.width / g.pitch, coverH = Math.min(1, g.width * Math.cos(g.tilt * RAD) / g.pitch);
    var panelArea = (g.area_ha || 0) * 10000 * gcr;
    var kwp = panelArea * (g.density_wp_m2 || 0) / 1000;
    var b = g.tilt * RAD, albedo = g.albedo === undefined ? 0.2 : g.albedo, dt = 0.25;
    var months = [];
    for (var m = 0; m < 12; m++) {
      var H = g.ghi ? g.ghi[m] : null;
      if (H === null || H === undefined) { months.push(null); continue; }
      var doy = DOY[m], dec = declination(doy);
      var wsDeg = Math.acos(Math.max(-1, Math.min(1, -Math.tan(g.lat * RAD) * Math.tan(dec)))) / RAD;
      var H0 = h0(g.lat, doy), KT = H0 > 0 ? Math.min(1, H / H0) : 0, kd = diffuseFraction(KT, wsDeg);
      var steps = [], sinSum = 0;
      for (var h = 0; h < 24; h += dt) {
        var sp = sunPosition(g.lat, doy, h + dt / 2);
        var s = Math.max(0, Math.sin(sp.el * RAD));
        steps.push({ sun: sp, s: s }); sinSum += s * dt;
      }
      var poa = 0, ground = 0, shadeW = 0, beamSum = 0;
      steps.forEach(function (st) {
        if (st.s <= 0) return;
        var ghiH = H * st.s / sinSum;               // kWh/m² per hour of this step (rate)
        var dif = ghiH * kd, beamH = ghiH - dif;
        var cosInc = st.s * Math.cos(b) + Math.cos(st.sun.el * RAD) * Math.sin(b) * Math.cos((st.sun.az - g.azimuth) * RAD);
        var dni = st.sun.el > 3 ? beamH / st.s : 0;
        var p = dni * Math.max(0, cosInc) + dif * (1 + Math.cos(b)) / 2 + ghiH * albedo * (1 - Math.cos(b)) / 2;
        var sh = shadeFraction(st.sun, g);
        var groundH = beamH * (1 - sh.frac) + dif * (1 - coverH);
        poa += p * dt; ground += groundH * dt; shadeW += sh.frac * beamH * dt; beamSum += beamH * dt;
      });
      months.push({
        m: m, ghi: H, kd: kd, poa: poa, ground: ground,
        lightShare: H > 0 ? ground / H : null,
        beamShade: beamSum > 0 ? shadeW / beamSum : null,
        energy_kwh: kwp * poa * DAYS[m] * (g.pr || 0.8)
      });
    }
    var ok = months.filter(Boolean);
    var sum = function (k) { return ok.reduce(function (s, x) { return s + x[k] * DAYS[x.m]; }, 0); };
    var summer = ok.filter(function (x) { return x.m >= 5 && x.m <= 7; });
    return {
      months: months, kwp: kwp, gcr: gcr, coverH: coverH,
      annual_kwh: ok.reduce(function (s, x) { return s + x.energy_kwh; }, 0),
      lightShareYear: ok.length ? sum('ground') / sum('ghi') : null,
      lightShareSummer: summer.length ? summer.reduce(function (s, x) { return s + x.ground * DAYS[x.m]; }, 0) / summer.reduce(function (s, x) { return s + x.ghi * DAYS[x.m]; }, 0) : null
    };
  }

  var api = { sunPosition: sunPosition, shadeFraction: shadeFraction, simulate: simulate, h0: h0, diffuseFraction: diffuseFraction, DOY: DOY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GAIA_SOLAR = api;
}(typeof window !== 'undefined' ? window : this));
