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
