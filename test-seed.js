const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const STORAGE_KEY = 'taskheat.v5restore';
const SEM_CACHE_KEY = 'taskheat.semantic.cache';

const USER_STATE = JSON.stringify({
  nextId: 2,
  nodes: {
    "1": { id: 1, title: "Saved task", desc: "", x: 10, y: 10, descOpen: false }
  },
  links: []
});

(async () => {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Replace module script with inline script for testing
  const mainJs = fs.readFileSync(path.join(__dirname, 'src/main.js'), 'utf8');
  html = html.replace('<script type="module" src="./src/main.js"></script>', `<script>${mainJs}</script>`);
  const base = 'file://' + htmlPath.replace(/\\/g, '/') + '/';

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: base,
    beforeParse(window) {
      window.localStorage.setItem(STORAGE_KEY, USER_STATE);
    }
  });

  await new Promise(res => dom.window.addEventListener('DOMContentLoaded', res));

  const { document, localStorage } = dom.window;

  const seedBtn = document.querySelector('[data-action="seedCanvas"]');
  if (!seedBtn) {
    console.error('❌ seed button missing');
    process.exit(1);
  }

  const countLinks = () => document.querySelectorAll('#linkLayer path, #linkLayer line').length;

  const beforeStorage = localStorage.getItem(STORAGE_KEY);
  const beforeSem = localStorage.getItem(SEM_CACHE_KEY);
  const beforeNodes = document.querySelectorAll('.node').length;
  const beforeLinks = countLinks();

  seedBtn.click();
  await new Promise(r => setTimeout(r, 10));

  const afterFirstNodes = document.querySelectorAll('.node').length;
  const afterFirstLinks = countLinks();

  const nodesAdded = afterFirstNodes - beforeNodes;
  const linksAdded = afterFirstLinks - beforeLinks;

  seedBtn.click();
  await new Promise(r => setTimeout(r, 10));

  const afterSecondNodes = document.querySelectorAll('.node').length;
  const afterSecondLinks = countLinks();

  const nodesAddedSecond = afterSecondNodes - afterFirstNodes;
  const linksAddedSecond = afterSecondLinks - afterFirstLinks;

  const storageUnchanged = beforeStorage === localStorage.getItem(STORAGE_KEY);
  const semUnchanged = beforeSem === localStorage.getItem(SEM_CACHE_KEY);

  const nodesSeeded = nodesAdded >= 3;
  const idempotent = nodesAddedSecond === 0 && linksAddedSecond === 0;

  const results = [
    '✅ seed button present',
    storageUnchanged ? '✅ storage preserved' : '❌ storage changed',
    nodesSeeded ? '✅ nodes seeded (≥3)' : `❌ expected ≥3 new nodes, got ${nodesAdded}`,
    linksAdded >= 2 ? '✅ links seeded (≥2)' : `❌ expected ≥2 new links, got ${linksAdded}`,
    semUnchanged ? '✅ semantic cache preserved' : '❌ semantic cache changed',
    idempotent ? '✅ seeding is idempotent' : '❌ seeding is not idempotent'
  ];

  console.log('Seed canvas tests:\n' + results.join('\n'));

  if (!storageUnchanged || !nodesSeeded || linksAdded < 2 || !semUnchanged || !idempotent) process.exit(1);
  process.exit(0);
})();
