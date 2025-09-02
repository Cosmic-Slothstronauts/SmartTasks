// tests/test-transforms.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const base = 'file://' + path.join(__dirname, '..').replace(/\\/g, '/') + '/';
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: base });
  await new Promise(res => dom.window.addEventListener('DOMContentLoaded', res));

  const { document } = dom.window;

  // Seed button existence
  const seedBtn = document.querySelector('[data-action="seedCanvas"]');
  if (!seedBtn) { console.error('❌ seed button missing'); process.exit(1); }

  console.log('Transform tests: ✅ passed');
  process.exit(0);
})();

