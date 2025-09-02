// src/app/state.js
export let nextId = 1;
export const nodes = new Map(); // id -> { el, titleEl, toggleEl, descWrap, ta, previewEl }
export const links = []; // { from, to, el }
export let mode = 'idle'; // 'idle'|'link'|'unlink'
export let firstPickId = null;
export let selectedId = null;
export let ctxTargetId = null;
export let lastContextPos = {x:0,y:0};
export let lastDeleted = null; // for undo

export let suppressSaves = false;

export let viewMode = 'edit';

// Semantic state
export let semanticsOn = false;
export let semanticCache = {};
export const dirtyNodes = new Set();
export let recomputeTimer = null;

// Setters for state that needs to be modified
export function setNextId(id) { nextId = id; }
export function setMode(m) { mode = m; }
export function setFirstPickId(id) { firstPickId = id; }
export function setSelectedId(id) { selectedId = id; }
export function setCtxTargetId(id) { ctxTargetId = id; }
export function setLastContextPos(pos) { lastContextPos = pos; }
export function setLastDeleted(data) { lastDeleted = data; }
export function setSuppressSaves(flag) { suppressSaves = flag; }
export function setViewMode(mode) { viewMode = mode; }
export function setSemanticsOn(flag) { semanticsOn = flag; }
export function setSemanticCache(cache) { semanticCache = cache; }
export function setRecomputeTimer(timer) { recomputeTimer = timer; }

export function ensureNextId(id) { if (id >= nextId) nextId = id + 1; }
export function incrementNextId() { return nextId++; }
