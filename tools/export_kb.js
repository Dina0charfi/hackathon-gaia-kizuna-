// Export the knowledge base used by the site (js/kb.js) to backend/data/knowledge.json,
// so the website and the API always read the same records.
// Usage: node tools/export_kb.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/kb.js'), 'utf8'), sandbox);
const kb = sandbox.window.GAIA_KB;
const out = { exported_at: new Date().toISOString(), source: 'js/kb.js', families: kb.families, records: kb.records };
fs.writeFileSync(path.join(root, 'backend/data/knowledge.json'), JSON.stringify(out, null, 2));
console.log('exported', kb.records.length, 'records');

// Regional soil reference (js/soil-tn.js) → backend/data/soil_tn.json, read by gaia/profile.py.
const soilBox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/soil-tn.js'), 'utf8'), soilBox);
const S = soilBox.window.GAIA_SOIL_TN;
fs.writeFileSync(path.join(root, 'backend/data/soil_tn.json'), JSON.stringify({ source: S.source, url: S.url, columns: ['zone', 'lat', 'lon', 'texture', 'clay_pct', 'soc_g_kg'], points: S.points }, null, 2));
console.log('exported', S.points.length, 'soil reference zones');
