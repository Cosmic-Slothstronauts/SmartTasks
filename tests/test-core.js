// tests/test-core.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const base = 'file://' + path.join(__dirname, '..').replace(/\\/g, '/') + '/';
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: base
  });
  return dom;
}

function nextTick(ms = 50) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const dom = loadApp();
  const { document, window } = dom.window;
  window.confirm = () => true; // auto-confirm deletes

  await new Promise(res => document.addEventListener('DOMContentLoaded', res));
  await nextTick(50);

  // Create a node via command palette
  const menuBtn = document.getElementById('menuBtn');
  const palInput = document.getElementById('palInput');
  menuBtn.click();
  palInput.value = 'Test Node A';
  document.querySelector('.pal-item[data-cmd="create"]').click();
  await nextTick();

  const nodes = () => Array.from(document.querySelectorAll('.node'));
  if (nodes().length < 1) {
    console.error('❌ expected ≥1 node after creation');
    process.exit(1);
  }

  // Create another node
  menuBtn.click();
  palInput.value = 'Test Node B';
  document.querySelector('.pal-item[data-cmd="create"]').click();
  await nextTick();

  if (nodes().length < 2) {
    console.error('❌ expected ≥2 nodes after second creation');
    process.exit(1);
  }

  // Link the two nodes via keyboard 'L' and clicking
  const [n1, n2] = nodes();
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'l' }));
  n1.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  n2.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await nextTick();

  const linkCount = document.querySelectorAll('#linkLayer line[data-link]').length;
  if (linkCount < 1) {
    console.error('❌ expected ≥1 link after linking');
    process.exit(1);
  }

  // Select second node and press Delete
  n2.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete' }));
  await nextTick(100);

  if (nodes().length !== 1) {
    console.error('❌ expected 1 node after deletion');
    process.exit(1);
  }

  console.log('Core operations tests: ✅ passed');
  process.exit(0);
})();

