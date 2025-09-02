// src/persistence/storage.js
import { STORAGE_KEY, SEM_CACHE_KEY } from '../app/constants.js';
import { nextId, nodes, links, suppressSaves } from '../app/state.js';

export function saveAll() {
  if (suppressSaves) return;
  const state = { nextId, nodes: {}, links: links.map(l => [l.from, l.to]) };
  nodes.forEach((n, id) => {
    state.nodes[id] = {
      id,
      title: n.titleEl.textContent,
      desc: n.ta.value,
      x: parseFloat(n.el.style.left) || 0,
      y: parseFloat(n.el.style.top) || 0,
      descOpen: n.descWrap.classList.contains('open')
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
  } catch {
    return null;
  }
}

export function loadSemanticCache() {
  try {
    return JSON.parse(localStorage.getItem(SEM_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSemanticCache(cache) {
  if (suppressSaves) return;
  localStorage.setItem(SEM_CACHE_KEY, JSON.stringify(cache));
}
