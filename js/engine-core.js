/* ==========================================================================
   GAIA REASONING — compatibility engine (M1), rules only.

   For each record:
   - every condition is evaluated against GAIA LAND DNA: pass | fail | unknown
   - a failed HARD condition rejects the technique, unless an adaptation in
     the record covers that failure → "adapt"
   - the score is the weighted share of SOFT conditions met, and is only
     returned when every soft condition could be evaluated
   - every mandatory condition met but fewer than half of the weighted soft
     conditions met (score < 0.5) → "adapt": the practice is possible, but the
     unmet secondary conditions are listed as what must be adapted, so a
     "feasible" verdict never comes with a weak fit
   - crop conditions are shown in their own "crop" dimension
   - materials, organisation and regulation come from the record: they are
     shown as "to check", never silently passed
   ========================================================================== */

(function (global) {
  'use strict';

  var DIMS = ['climate', 'terrain', 'water', 'crop', 'materials', 'org', 'reg'];
  var WEAK_FIT = 0.5;
  function dimOf(c) { return c.field === 'crop' ? 'crop' : c.dim; }
  var V = function (dna, path) { return global.GAIA_DNA.value(dna, path); };

  function test(c, v) {
    if (v === null || v === undefined) return 'unknown';
    switch (c.op) {
      case 'max': return v <= c.value ? 'pass' : 'fail';
      case 'min': return v >= c.value ? 'pass' : 'fail';
      case 'between': return v >= c.value[0] && v <= c.value[1] ? 'pass' : 'fail';
      case 'in': return c.value.indexOf(v) !== -1 ? 'pass' : 'fail';
      default: return 'unknown';
    }
  }

  function evaluate(rec, dna) {
    var checks = rec.conditions.map(function (c) {
      var v = V(dna, c.field);
      return { cond: c, value: v, result: test(c, v) };
    });

    var hardFails = checks.filter(function (x) { return x.cond.hard && x.result === 'fail'; });
    var unknown = checks.filter(function (x) { return x.result === 'unknown'; });
    var soft = checks.filter(function (x) { return !x.cond.hard; });

    var verdict = 'feasible', adaptation = null;
    if (hardFails.length) {
      var failedFields = hardFails.map(function (x) { return x.cond.field; });
      adaptation = (rec.adaptations || []).filter(function (a) {
        var covers = failedFields.every(function (f) { return a.when.indexOf(f) !== -1; });
        if (!covers) return false;
        if (a.requires) return test(a.requires, V(dna, a.requires.field)) === 'pass';
        return true;
      })[0] || null;
      verdict = adaptation ? 'adapt' : 'rejected';
    } else if (checks.some(function (x) { return x.cond.hard && x.result === 'unknown'; })) {
      verdict = 'insufficient'; // a mandatory condition could not be checked: GAIA says so instead of passing it
    } else if (checks.length && unknown.length === checks.length) {
      verdict = 'insufficient'; // nothing about this parcel could be checked: no verdict without evidence
    }

    var score = null;
    var softKnown = soft.filter(function (x) { return x.result !== 'unknown'; });
    if ((verdict === 'feasible' || verdict === 'adapt') && soft.length && softKnown.length === soft.length) {
      var wSum = soft.reduce(function (s, x) { return s + (x.cond.weight || 1); }, 0);
      var wMet = soft.reduce(function (s, x) { return s + (x.result === 'pass' ? (x.cond.weight || 1) : 0); }, 0);
      score = wSum ? wMet / wSum : null;
    }
    var softFails = soft.filter(function (x) { return x.result === 'fail'; });
    if (verdict === 'feasible' && score !== null && score < WEAK_FIT) {
      verdict = 'adapt';
      adaptation = { auto: true, when: softFails.map(function (x) { return x.cond.field; }), checks: softFails };
      Object.defineProperty(adaptation, 'text', { enumerable: true, get: function () { return weakText(softFails); } });
    }

    // per-dimension status
    var dims = {};
    DIMS.forEach(function (d) { dims[d] = { status: 'info', checks: [] }; });
    var adaptedFields = adaptation && !adaptation.auto ? adaptation.when : [];
    checks.forEach(function (x) {
      var d = dimOf(x.cond);
      if (!dims[d]) return;
      dims[d].checks.push(x);
    });
    DIMS.forEach(function (d) {
      var cs = dims[d].checks;
      if (!cs.length) { dims[d].status = (d === 'materials' || d === 'org' || d === 'reg') ? 'info' : 'none'; return; }
      var hardFail = cs.filter(function (x) { return x.result === 'fail' && x.cond.hard; });
      if (hardFail.length) dims[d].status = hardFail.every(function (x) { return adaptedFields.indexOf(x.cond.field) !== -1; }) ? 'adapted' : 'fail';
      else if (cs.some(function (x) { return x.result === 'unknown'; })) dims[d].status = 'unknown';
      else if (cs.some(function (x) { return x.result === 'fail'; })) dims[d].status = cs.some(function (x) { return x.result === 'pass'; }) ? 'partial' : 'below';
      else dims[d].status = 'pass';
    });

    return {
      record: rec, verdict: verdict, adaptation: adaptation, score: score,
      checks: checks, hardFails: hardFails, softFails: softFails, unknown: unknown, dims: dims,
      softTotal: soft.length, softMet: soft.filter(function (x) { return x.result === 'pass'; }).length,
      provisional: checks.some(function (x) { return x.cond.provisional; }),
      conditional: unknown.length > 0
    };
  }

  function evaluateAll(dna) {
    var order = { feasible: 0, adapt: 1, insufficient: 2, rejected: 3 };
    return global.GAIA_KB.records.map(function (r) { return evaluate(r, dna); }).sort(function (a, b) {
      if (order[a.verdict] !== order[b.verdict]) return order[a.verdict] - order[b.verdict];
      var sa = a.score === null ? -1 : a.score, sb = b.score === null ? -1 : b.score;
      return sb - sa;
    });
  }

  // plain-language reason for a single check (FR, AR, EN, JA)
  var WORDS = {
    fr: {
      label: { 'climate.rain_mm': 'pluie annuelle', 'terrain.slope_pct': 'pente', 'water.source': "source d'eau",
        'crop': 'culture', 'energy.pump': 'pompage', 'climate.tmax_hot': 'température max. estivale',
        'climate.et0_mm': 'évapotranspiration de référence', 'solar.ghi_kwh': 'rayonnement solaire', 'climate.tmin_cold': 'température min. hivernale' },
      weak: function (l) { return 'Les conditions obligatoires sont remplies, mais la plupart des conditions secondaires ne le sont pas : ' + l + '. Adapter la pratique sur ces points, ou l’essayer d’abord sur une petite surface.'; },
      ghi: ' kWh/m²/j', unknown: 'inconnu', sep: ' : ', req: function (t) { return ' (requis ' + t + ')'; },
      values: { rainfed: 'pluviale', well: 'puits', network: 'réseau', shared: 'source partagée',
        olive: 'olivier', palm: 'palmier dattier', citrus: 'agrumes', cereal: 'céréales', veg: 'maraîchage', other: 'autre',
        none: 'aucune', diesel: 'pompe diesel', grid: 'pompe sur réseau', solar: 'pompe solaire' }
    },
    en: {
      label: { 'climate.rain_mm': 'annual rainfall', 'terrain.slope_pct': 'slope', 'water.source': 'water source',
        'crop': 'crop', 'energy.pump': 'pumping', 'climate.tmax_hot': 'summer max. temperature',
        'climate.et0_mm': 'reference evapotranspiration', 'solar.ghi_kwh': 'solar radiation', 'climate.tmin_cold': 'winter min. temperature' },
      weak: function (l) { return 'The mandatory conditions are met, but most secondary conditions are not: ' + l + '. Adapt the practice on these points, or try it on a small area first.'; },
      ghi: ' kWh/m²/day', unknown: 'unknown', sep: ': ', req: function (t) { return ' (required ' + t + ')'; },
      values: { rainfed: 'rainfed', well: 'well', network: 'network', shared: 'shared source',
        olive: 'olive', palm: 'date palm', citrus: 'citrus', cereal: 'cereals', veg: 'vegetables', other: 'other',
        none: 'none', diesel: 'diesel pump', grid: 'grid pump', solar: 'solar pump' }
    },
    ar: {
      label: { 'climate.rain_mm': 'الأمطار السنوية', 'terrain.slope_pct': 'الانحدار', 'water.source': 'مصدر الماء',
        'crop': 'الزراعة', 'energy.pump': 'الضخ', 'climate.tmax_hot': 'أقصى حرارة صيفية',
        'climate.et0_mm': 'التبخر النتحي المرجعي', 'solar.ghi_kwh': 'الإشعاع الشمسي', 'climate.tmin_cold': 'أدنى حرارة شتوية' },
      weak: function (l) { return 'الشروط الإلزامية مستوفاة، لكن أغلب الشروط الثانوية غير مستوفاة: ' + l + '. كيّف التقنية في هذه النقاط أو جرّبها أولاً على مساحة صغيرة.'; },
      ghi: ' kWh/m²/يوم', unknown: 'غير معروف', sep: ': ', req: function (t) { return ' (المطلوب ' + t + ')'; },
      values: { rainfed: 'بعلية', well: 'بئر', network: 'شبكة ري', shared: 'مصدر مشترك',
        olive: 'زيتون', palm: 'نخيل', citrus: 'قوارص', cereal: 'حبوب', veg: 'خضر', other: 'أخرى',
        none: 'لا شيء', diesel: 'مضخة ديزل', grid: 'مضخة على الشبكة', solar: 'مضخة شمسية' }
    },
    ja: {
      label: { 'climate.rain_mm': '年間降水量', 'terrain.slope_pct': '傾斜', 'water.source': '水源',
        'crop': '作物', 'energy.pump': '揚水', 'climate.tmax_hot': '夏の最高気温',
        'climate.et0_mm': '基準蒸発散量', 'solar.ghi_kwh': '日射量', 'climate.tmin_cold': '冬の最低気温' },
      weak: function (l) { return '必須条件は満たしていますが、副次条件の多くを満たしていません：' + l + '。これらの点を調整するか、まず小さな面積で試してください。'; },
      ghi: ' kWh/m²/日', unknown: '不明', sep: '：', req: function (t) { return '（必要条件 ' + t + '）'; },
      values: { rainfed: '天水', well: '井戸', network: '灌漑網', shared: '共同水源',
        olive: 'オリーブ', palm: 'ナツメヤシ', citrus: '柑橘', cereal: '穀物', veg: '野菜', other: 'その他',
        none: 'なし', diesel: 'ディーゼルポンプ', grid: '系統電力ポンプ', solar: '太陽光ポンプ' }
    }
  };
  function words() { var l = global.GAIA && global.GAIA.lang ? global.GAIA.lang() : 'fr'; return WORDS[l] || WORDS.fr; }
  function describe(x) {
    var c = x.cond, f = global.GAIA.fmt, W = words();
    var label = W.label[c.field] || c.field;
    var unit = { 'climate.rain_mm': ' mm', 'terrain.slope_pct': ' %', 'climate.tmax_hot': ' °C', 'climate.tmin_cold': ' °C', 'climate.et0_mm': ' mm', 'solar.ghi_kwh': W.ghi }[c.field] || '';
    var target = c.op === 'max' ? '≤ ' + f(c.value) + unit : c.op === 'min' ? '≥ ' + f(c.value) + unit
      : c.op === 'between' ? f(c.value[0]) + '–' + f(c.value[1]) + unit : c.value.map(valueLabel).join(', ');
    var got = x.value === null ? W.unknown : (typeof x.value === 'number' ? f(x.value, c.field === 'terrain.slope_pct' || c.field === 'solar.ghi_kwh' ? 1 : 0) + unit : valueLabel(x.value));
    return label + W.sep + got + W.req(target);
  }
  function weakText(fails) { var W = words(); return W.weak(fails.map(describe).join(W === WORDS.ja ? '、' : ' ; ')); }
  function valueLabel(v) { return words().values[v] || String(v); }

  global.GAIA_ENGINE = { evaluate: evaluate, evaluateAll: evaluateAll, describe: describe, valueLabel: valueLabel, DIMS: DIMS, WEAK_FIT: WEAK_FIT };
}(window));
