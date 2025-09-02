// tests/test-persistence.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STORAGE_KEY = 'taskheat.v5restore';

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const base = 'file://' + path.join(__dirname, '..').replace(/\\/g, '/') + '/';
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: base });
  await new Promise(res => dom.window.addEventListener('DOMContentLoaded', res));

  const { document, localStorage } = dom.window;

  // create one node
  const menuBtn = document.getElementById('menuBtn');
  const palInput = document.getElementById('palInput');
  menuBtn.click(); palInput.value = 'Persisted Task';
  document.querySelector('.pal-item[data-cmd="create"]').click();

  // force save and snapshot storage
  const before = localStorage.getItem(STORAGE_KEY);
  if (!before) { console.error('❌ expected storage to be set after creation'); process.exit(1); }

  // Reload document and verify restoration
  const dom2 = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: base });
  dom2.window.localStorage.setItem(STORAGE_KEY, before);
  await new Promise(res => dom2.window.addEventListener('DOMContentLoaded', res));
  const nodeCount = dom2.window.document.querySelectorAll('.node').length;
  if (nodeCount < 1) { console.error('❌ expected nodes restored from storage'); process.exit(1); }

  console.log('Persistence tests: ✅ passed');
  process.exit(0);
})();

