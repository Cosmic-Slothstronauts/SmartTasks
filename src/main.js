// src/main.js - Main application entry point
document.addEventListener('DOMContentLoaded', function () {
    // Keys & state
    const STORAGE_KEY = 'taskheat.v5restore';
    const THEME_KEY = 'taskheat.theme';
    const VIEW_KEY = 'taskheat.view';
    const SEM_CACHE_KEY = 'taskheat.semantic.cache';

    const menuBtn = document.getElementById('menuBtn');
    const viewModeBtn = document.getElementById('viewModeBtn');
    const toggleAllDescBtn = document.getElementById('toggleAllDescBtn');
    const themeBtn = document.getElementById('themeBtn');
    const semanticBtn = document.getElementById('semanticBtn');
    const recomputeBtn = document.getElementById('recomputeBtn');
    const palette = document.getElementById('palette');
    const palInput = document.getElementById('palInput');
    const modeHint = document.getElementById('modeHint');
    const nodesLayer = document.getElementById('nodesLayer');
    const linkLayer = document.getElementById('linkLayer');
    const canvasWrap = document.getElementById('canvasWrap');
    const ctxMenu = document.getElementById('ctxMenu');
    const logList = document.getElementById('logList');

    const DEV_SEMANTICS_METRICS = false;

    let nextId = 1;
    const nodes = new Map(); // id -> { el, titleEl, toggleEl, descWrap, ta, previewEl }
    const links = []; // { from, to, el }
    let mode = 'idle'; // 'idle'|'link'|'unlink'
    let firstPickId = null;
    let selectedId = null;
    let ctxTargetId = null;
    let lastContextPos = { x: 0, y: 0 };
    let lastDeleted = null; // for undo

    let suppressSaves = false;

    window.setSaveSuppression = (on) => {
        suppressSaves = !!on;
        logAction?.(`Save suppression ${suppressSaves ? 'ON' : 'OFF'}`);
        return suppressSaves;
    };
    window.toggleSaveSuppression = () => window.setSaveSuppression(!suppressSaves);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F9') { window.toggleSaveSuppression(); e.preventDefault(); }
    });

    // Semantic colouring
    const SEM_ON_KEY = 'taskheat.semantic.on';
    let semanticsOn = localStorage.getItem(SEM_ON_KEY) === '1';
    let semanticCache = loadSemanticCache();
    const dirtyNodes = new Set();
    let recomputeTimer = null;
    if (semanticsOn) { semanticBtn.classList.add('active'); }
    recomputeBtn.disabled = !semanticsOn;

    // Theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon();
    themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', cur);
        localStorage.setItem(THEME_KEY, cur);
        updateThemeIcon();
    });
    function updateThemeIcon() { themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }

    // Global view toggle
    let viewMode = localStorage.getItem(VIEW_KEY) || 'edit';
    updateViewButton();
    viewModeBtn.addEventListener('click', () => {
        viewMode = viewMode === 'edit' ? 'preview' : 'edit';
        localStorage.setItem(VIEW_KEY, viewMode);
        updateViewButton();
        applyViewModeToAll();
    });
    function updateViewButton() { viewModeBtn.textContent = viewMode === 'edit' ? '👁 Preview' : '✍️ Edit'; }

    // Toggle all descriptions
    function updateToggleAllDescBtn() {
        const allOpen = [...nodes.values()].every(n => n.descWrap.classList.contains('open'));
        toggleAllDescBtn.textContent = allOpen ? '▾ All' : '▸ All';
    }
    toggleAllDescBtn.addEventListener('click', () => {
        const anyClosed = [...nodes.values()].some(n => !n.descWrap.classList.contains('open'));
        nodes.forEach(n => {
            n.descWrap.classList.toggle('open', anyClosed);
            n.toggleEl.textContent = anyClosed ? '▾' : '▸';
        });
        updateToggleAllDescBtn();
        saveAll();
    });

    // Semantic controls
    recomputeBtn.addEventListener('click', async () => {
        console.log('Recompute button clicked, semanticsOn:', semanticsOn);
        if (!semanticsOn) return;
        console.log('Starting recompute for nodes:', [...nodes.keys()]);
        try {
            await computeEmbeddingsFor([...nodes.keys()]);
            console.log('Recompute completed successfully');
        }
        catch (err) {
            console.error('Recompute failed:', err);
            logAction('Semantics recompute failed: ' + err.message);
        }
    });

    semanticBtn.addEventListener('click', async () => {
        semanticsOn = !semanticsOn;
        semanticBtn.classList.toggle('active', semanticsOn);
        recomputeBtn.disabled = !semanticsOn;
        localStorage.setItem(SEM_ON_KEY, semanticsOn ? '1' : '0');
        if (semanticsOn) {
            try { await computeEmbeddingsFor([...nodes.keys()]); }
            catch {
                semanticsOn = false;
                localStorage.setItem(SEM_ON_KEY, '0');
                semanticBtn.classList.remove('active');
                recomputeBtn.disabled = true;
            }
        } else {
            clearSemanticColors();
        }
    });

    // Palette
    menuBtn.addEventListener('click', () => togglePalette());
    function togglePalette() { const open = palette.style.display === 'block'; palette.style.display = open ? 'none' : 'block'; if (!open) { palInput.focus(); palInput.select(); } }
    document.addEventListener('click', (e) => { if (!palette.contains(e.target) && e.target !== menuBtn) palette.style.display = 'none'; });
    palette.addEventListener('click', (e) => { const it = e.target.closest('[data-cmd]'); if (!it) return; runCommand(it.dataset.cmd); });
    palInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runCommand('create'); });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMode('idle');
        if (e.key.toLowerCase() === 'l') setMode('link');
        if (e.key.toLowerCase() === 'u') setMode('unlink');
        if (e.key === 'Delete' && selectedId != null && !isTypingTarget(e.target)) { deleteNode(selectedId); saveAll(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isTypingTarget(e.target)) {
            e.preventDefault();
            undoDelete();
        }
    });
    function isTypingTarget(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }

    function runCommand(cmd) {
        if (cmd === 'create') { const title = palInput.value.trim() || undefined; createNode({ title }); saveAll(); palInput.value = ''; palette.style.display = 'none'; return; }
        if (cmd === 'link') { setMode('link'); palette.style.display = 'none'; return; }
        if (cmd === 'unlink') { setMode('unlink'); palette.style.display = 'none'; return; }
        if (cmd === 'cancel') { setMode('idle'); palette.style.display = 'none'; return; }
        if (cmd === 'deleteSelected') { if (selectedId != null) { deleteNode(selectedId); saveAll(); } palette.style.display = 'none'; return; }
    }

    function setMode(m) { nodes.forEach(n => n.el.classList.remove('selected')); firstPickId = null; mode = m; if (m === 'link') setHint('Link mode: click source, then target. Esc cancels.'); else if (m === 'unlink') setHint('Unlink mode: click two connected nodes. Esc cancels.'); else setHint('Tip: L to link, U to unlink.'); }
    function setHint(t) { modeHint.textContent = t; }

    // Log
    function logAction(t) {
        const li = document.createElement('li');
        li.textContent = '[' + new Date().toLocaleTimeString() + '] ' + t;
        logList.appendChild(li);
        // Auto-scroll to bottom
        setTimeout(() => {
            logList.scrollTop = logList.scrollHeight;
        }, 0);
    }

    // Markdown
    function escapeHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function renderMarkdown(src) { if (!src) return ''; let s = src.replace(/\r\n?/g, '\n'); const fences = []; s = s.replace(/```([\s\S]*?)```/g, (_, c) => { fences.push(c); return `\uE000${fences.length - 1}\uE000`; }); s = escapeHTML(s); s = s.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>').replace(/^##\s+(.*)$/gm, '<h2>$1</h2>').replace(/^#\s+(.*)$/gm, '<h1>$1</h1>'); s = s.replace(/^(?:- |\* |\+ )(.*)$/gm, '<li>$1</li>'); s = s.replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, m => '\n<ul>' + m.replace(/\n/g, '') + '</ul>\n'); s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'); s = s.replace(/`([^`]+?)`/g, '<code>$1<\/code>'); s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); s = s.replace(/\*(?!\s)([^*]+?)\*/g, '<em>$1</em>'); s = s.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>'); s = s.replace(/\uE000(\d+)\uE000/g, (_, i) => `<pre><code>${escapeHTML(fences[Number(i)])}</code></pre>`); return s; }

    // Geometry
    function nodeCenter(el) { const cr = canvasWrap.getBoundingClientRect(); const r = el.getBoundingClientRect(); return { x: (r.left - cr.left) + r.width / 2, y: (r.top - cr.top) + r.height / 2 }; }
    function updateLinkPosition(link) { const a = nodes.get(link.from)?.el, b = nodes.get(link.to)?.el; if (!a || !b) return; const ca = nodeCenter(a), cb = nodeCenter(b); link.el.setAttribute('x1', ca.x); link.el.setAttribute('y1', ca.y); link.el.setAttribute('x2', cb.x); link.el.setAttribute('y2', cb.y); }
    function updateLinksForNode(id) { links.forEach(l => { if (l.from === id || l.to === id) updateLinkPosition(l); }); }

    // Links
    function addLink(fromId, toId) { if (fromId === toId) return; if (links.some(l => l.from === fromId && l.to === toId)) return; const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('marker-end', 'url(#arrow)'); line.setAttribute('data-link', ''); linkLayer.appendChild(line); const l = { from: fromId, to: toId, el: line }; links.push(l); updateLinkPosition(l); logAction('Linked #' + fromId + ' → #' + toId); saveAll(); }
    function removeLinkBetween(a, b) { let removed = 0; for (let i = links.length - 1; i >= 0; i--) { const l = links[i]; const m = (l.from === a && l.to === b) || (l.from === b && l.to === a); if (m) { l.el.remove(); links.splice(i, 1); removed++; } } logAction(removed ? ('Removed link(s) between #' + a + ' and #' + b + ' (' + removed + ')') : 'No link found'); if (removed) saveAll(); }

    // Nodes
    function createNode({ id, title, x, y, desc, descOpen } = {}) {
        const useId = id ?? nextId++;
        if (useId >= nextId) nextId = useId + 1;

        const el = document.createElement('div'); el.className = 'node'; el.dataset.id = useId;
        el.style.left = (typeof x === 'number' ? x : 40 * useId) + 'px'; el.style.top = (typeof y === 'number' ? y : 40 * useId) + 'px';

        const header = document.createElement('div'); header.className = 'node-header';
        const titleEl = document.createElement('div'); titleEl.className = 'node-title'; titleEl.textContent = title || ('Task ' + useId);
        const toggle = document.createElement('button'); toggle.className = 'toggle-desc'; toggle.title = 'Toggle description'; toggle.textContent = descOpen ? '▾' : '▸';
        header.appendChild(titleEl); header.appendChild(toggle);

        const descWrap = document.createElement('div'); descWrap.className = 'node-desc'; if (descOpen) descWrap.classList.add('open');
        const ta = document.createElement('textarea'); ta.placeholder = 'Markdown description…'; ta.value = desc || '';
        const preview = document.createElement('div'); preview.className = 'desc-preview'; preview.style.display = 'none';
        descWrap.appendChild(ta); descWrap.appendChild(preview);

        el.appendChild(header); el.appendChild(descWrap);
        nodesLayer.appendChild(el);

        nodes.set(useId, { el, titleEl, toggleEl: toggle, descWrap, ta, previewEl: preview });

        // Select node on press
        el.addEventListener('pointerdown', () => { selectedId = useId; nodes.forEach(n => n.el.classList.remove('selected')); el.classList.add('selected'); });

        // Link/unlink by clicks while in mode
        el.addEventListener('click', (e) => { if (e.target === toggle || e.target === ta) return; if (mode === 'idle') return; const thisId = useId; if (firstPickId == null) { firstPickId = thisId; el.classList.add('selected'); setHint((mode === 'link' ? 'Link' : 'Unlink') + ': pick second node.'); } else if (firstPickId !== thisId) { const firstEl = nodes.get(firstPickId)?.el; firstEl?.classList.remove('selected'); if (mode === 'link') addLink(firstPickId, thisId); else removeLinkBetween(firstPickId, thisId); firstPickId = null; setMode('idle'); } });

        // Toggle description
        toggle.addEventListener('click', (e) => { e.stopPropagation(); const open = !descWrap.classList.contains('open'); descWrap.classList.toggle('open'); toggle.textContent = open ? '▾' : '▸'; if (open) ta.focus(); saveAll(); updateToggleAllDescBtn(); });

        // Inline rename on double click
        titleEl.addEventListener('dblclick', (e) => { e.stopPropagation(); startInlineTitleRename(useId); });

        // Context menu
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); ctxTargetId = useId; showContextMenu(e.clientX, e.clientY, true); });

        // Dragging
        makeDraggable(el, useId);

        // Apply global view mode
        applyViewModeToNode(useId);

        // Autosave while typing; live preview when in preview mode
        ta.addEventListener('input', () => { if (viewMode === 'preview') preview.innerHTML = renderMarkdown(ta.value); saveAll(); markNodeDirty(useId); });

        logAction('Created node #' + useId);
        if (semanticsOn) { markNodeDirty(useId); }
        updateToggleAllDescBtn();
        return useId;
    }

    function startInlineTitleRename(id) { const entry = nodes.get(id); if (!entry) return; const { el, titleEl } = entry; if (el.classList.contains('editing')) return; el.classList.add('editing'); const original = titleEl.textContent || ''; titleEl.textContent = ''; const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'node-title-input'; inp.value = original; inp.addEventListener('pointerdown', e => e.stopPropagation()); const commit = (save) => { const v = save ? inp.value.trim() : original; if (v !== original) markNodeDirty(id); titleEl.textContent = v || ('Task ' + id); el.classList.remove('editing'); saveAll(); }; inp.addEventListener('keydown', e => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); }); inp.addEventListener('blur', () => commit(true)); titleEl.appendChild(inp); setTimeout(() => { inp.focus(); inp.select(); }, 0); }

    function deleteNode(id) {
        const entry = nodes.get(id); if (!entry) return;
        if (!confirm('Delete this task?')) return;
        lastDeleted = {
            id,
            title: entry.titleEl.textContent,
            desc: entry.ta.value,
            x: parseFloat(entry.el.style.left) || 0,
            y: parseFloat(entry.el.style.top) || 0,
            descOpen: entry.descWrap.classList.contains('open')
        };
        for (let i = links.length - 1; i >= 0; i--) { const l = links[i]; if (l.from === id || l.to === id) { l.el.remove(); links.splice(i, 1); } }
        entry.el.remove(); nodes.delete(id); updateToggleAllDescBtn();
        if (selectedId === id) selectedId = null;
        delete semanticCache[id]; saveSemanticCache();
        logAction('Deleted node #' + id);
    }

    function undoDelete() {
        if (!lastDeleted) return;
        createNode(lastDeleted);
        lastDeleted = null;
        logAction('Undo last deletion');
        saveAll();
    }


    // --- Semantics helpers ---
    function loadSemanticCache() { try { return JSON.parse(localStorage.getItem(SEM_CACHE_KEY) || '{}'); } catch { return {}; } }
    function saveSemanticCache() {
        if (suppressSaves) return;
        localStorage.setItem(SEM_CACHE_KEY, JSON.stringify(semanticCache));
    }

    function markNodeDirty(id) { dirtyNodes.add(id); if (semanticsOn) scheduleRecompute(); }
    function scheduleRecompute() { if (recomputeTimer) clearTimeout(recomputeTimer); recomputeTimer = setTimeout(recomputeDirty, 400); }
    function recomputeDirty() { const ids = Array.from(dirtyNodes); dirtyNodes.clear(); computeEmbeddingsFor(ids); }

    function clearSemanticColors() { nodes.forEach(n => { n.el.style.borderColor = 'var(--node-border)'; n.el.style.boxShadow = ''; }); }
    function vecToColor(v) {
        const h = Math.round(v[0] * 360);
        const s = Math.round(40 + v[1] * 40);
        const l = Math.round(45 + v[2] * 20);
        return `hsl(${h} ${s}% ${l}%)`;
    }
    function withAlpha(hsl, a = 0.25) { return hsl.replace(')', ` / ${a})`).replace(',', ' '); }
    function applyColorToNode(n, color) { n.el.style.borderColor = color; n.el.style.boxShadow = `0 0 0 3px ${withAlpha(color, 0.25)}`; }
    function applySemanticColors() { nodes.forEach((n, id) => { const c = semanticCache[id]; if (c) applyColorToNode(n, c.color); }); }

    async function contentHashForNode(node) { const str = (node.titleEl.textContent || '') + '|' + (node.ta.value || ''); const buf = new TextEncoder().encode(str); const hash = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''); }

    // Embedder
    let embedderPromise = null;
    async function loadEmbedder() {
        if (window._embedder) return window._embedder;
        if (!embedderPromise) {
            embedderPromise = (async () => {
                try {
                    const transformersModule = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
                    const { pipeline, env } = transformersModule;
                    env.allowRemoteModels = true; env.allowLocalModels = false; env.remoteHost = 'https://huggingface.co';
                    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
                    return window._embedder = embedder;
                } catch (err) {
                    logAction('Semantics unavailable (model load failed): ' + err.message); throw err;
                }
            })();
        }
        return embedderPromise;
    }

    // UMAP reduce
    let umapMod = null;
    async function reduceTo3D(vectors) {
        if (!vectors || vectors.length < 2) { const v = [0.5, 0.5, 0.5]; return vectors.map(() => v.slice()); }
        if (vectors.length <= 4) { const colors = [[0.2, 0.8, 0.6], [0.8, 0.2, 0.6], [0.6, 0.8, 0.2], [0.2, 0.6, 0.8]]; return vectors.map((_, i) => colors[i % colors.length]); }
        if (!umapMod) { try { umapMod = await import('https://esm.sh/umap-js@1.0.2'); } catch { const colors = vectors.map((_, i) => [(i * 0.3) % 1, 0.7, 0.5]); return colors; } }
        try {
            const { UMAP, Random } = umapMod;
            const umap = new UMAP({ nComponents: 3, random: new Random(42) });
            const emb = umap.fit(vectors);
            const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
            for (const v of emb) { for (let i = 0; i < 3; i++) { if (v[i] < mins[i]) mins[i] = v[i]; if (v[i] > maxs[i]) maxs[i] = v[i]; } }
            return emb.map(v => v.map((val, i) => (val - mins[i]) / ((maxs[i] - mins[i]) || 1)));
        } catch {
            const colors = vectors.map((_, i) => [(i * 0.3) % 1, 0.7, 0.5]); return colors;
        }
    }

    async function computeEmbeddingsFor(ids) {
        if (!ids || !ids.length) return;
        const embedder = await loadEmbedder();
        const need = [];
        for (const id of ids) {
            const n = nodes.get(id); if (!n) continue;
            const hash = await contentHashForNode(n);
            const cached = semanticCache[id];
            if (cached && cached.hash === hash) { applyColorToNode(n, cached.color); continue; }
            const text = (n.titleEl.textContent || '') + '\n' + (n.ta.value || '');
            need.push({ id, hash, text });
        }
        if (!need.length) { saveSemanticCache(); return; }
        const texts = need.map(n => n.text);
        const res = await embedder(texts, { pooling: 'mean', normalize: true });
        let vecs;
        if (res.dims && res.dims.length === 2) { const [numTexts, dim] = res.dims; vecs = []; for (let i = 0; i < numTexts; i++) { const start = i * dim; vecs.push(Array.from(res.data.slice(start, start + dim))); } }
        else { vecs = res.data || res; }
        const reduced = await reduceTo3D(vecs);
        need.forEach((item, i) => { const color = vecToColor(reduced[i]); semanticCache[item.id] = { hash: item.hash, embedding: vecs[i], color }; const n = nodes.get(item.id); if (n) applyColorToNode(n, color); });
        saveSemanticCache();
    }

    // Dragging
    function makeDraggable(el, id) { let startX = 0, startY = 0, origL = 0, origT = 0; const onDown = (e) => { if (e.button !== undefined && e.button !== 0) return; const t = e.target; if (t.tagName === 'TEXTAREA' || t.classList.contains('node-title-input') || t.closest('button') || t.closest('a')) return; el.setPointerCapture?.(e.pointerId); startX = e.clientX; startY = e.clientY; origL = parseFloat(el.style.left) || 0; origT = parseFloat(el.style.top) || 0; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true }); }; const onMove = (e) => { const dx = e.clientX - startX, dy = e.clientY - startY; el.style.left = (origL + dx) + 'px'; el.style.top = (origT + dy) + 'px'; updateLinksForNode(id); }; const onUp = () => { window.removeEventListener('pointermove', onMove); saveAll(); }; el.addEventListener('pointerdown', onDown); setupLongPress(el, (pt) => { ctxTargetId = id; showContextMenu(pt.clientX, pt.clientY, true); }); }

    // Context menu
    function showContextMenu(x, y, forNode) { lastContextPos = pageToCanvasPoint({ clientX: x, clientY: y }); ctxMenu.style.left = x + 'px'; ctxMenu.style.top = y + 'px'; ctxMenu.style.display = 'block'; ctxMenu.querySelectorAll('[data-action="startLink"], [data-action="startUnlink"], [data-action="rename"], [data-action="updateDesc"], [data-action="delete"]').forEach(el => { el.style.display = forNode ? 'flex' : 'none'; }); }
    function hideContextMenu() { ctxMenu.style.display = 'none'; }
    window.addEventListener('click', (e) => { if (!ctxMenu.contains(e.target)) hideContextMenu(); });
    canvasWrap.addEventListener('contextmenu', (e) => { if (e.target === canvasWrap || e.target === linkLayer) { e.preventDefault(); ctxTargetId = null; showContextMenu(e.clientX, e.clientY, false); } });
    ctxMenu.addEventListener('click', (e) => { const btn = e.target.closest('[data-action]'); if (!btn) return; e.stopPropagation(); const act = btn.dataset.action; hideContextMenu(); if (act === 'addHere') { const name = prompt('Task title'); if (name !== null) { createNode({ title: (name || '').trim(), x: lastContextPos.x, y: lastContextPos.y }); saveAll(); } return; } if (act === 'seedCanvas') { seedCanvas(); return; } if (ctxTargetId != null) { const n = nodes.get(ctxTargetId); if (!n) return; if (act === 'startLink') { setMode('link'); firstPickId = ctxTargetId; n.el.classList.add('selected'); setHint('Link: pick a target node.'); } else if (act === 'startUnlink') { setMode('unlink'); firstPickId = ctxTargetId; n.el.classList.add('selected'); setHint('Unlink: pick the other node.'); } else if (act === 'rename') { startInlineTitleRename(ctxTargetId); } else if (act === 'updateDesc') { if (!n.descWrap.classList.contains('open')) { n.descWrap.classList.add('open'); n.toggleEl.textContent = '▾'; } n.ta.focus(); } else if (act === 'delete') { deleteNode(ctxTargetId); saveAll(); } } });

    // Long‑press
    function setupLongPress(target, onFire) { let timer = null, sx = 0, sy = 0; const clear = () => { if (timer) { clearTimeout(timer); timer = null; } }; const onDown = (e) => { if (e.button !== undefined && e.button !== 0) return; sx = e.clientX; sy = e.clientY; clear(); timer = setTimeout(() => onFire({ clientX: e.clientX, clientY: e.clientY }), 500); }; const onMove = (e) => { if (!timer) return; if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) clear(); }; const onUp = () => clear(); target.addEventListener('pointerdown', onDown); target.addEventListener('pointermove', onMove); target.addEventListener('pointerup', onUp); target.addEventListener('pointercancel', onUp); target.addEventListener('pointerleave', onUp); }
    function pageToCanvasPoint(pt) { const r = canvasWrap.getBoundingClientRect(); return { x: pt.clientX - r.left, y: pt.clientY - r.top }; }
    setupLongPress(canvasWrap, (pt) => { const el = document.elementFromPoint(pt.clientX, pt.clientY); if (el && (el.closest('.node') || el === linkLayer)) return; ctxTargetId = null; showContextMenu(pt.clientX, pt.clientY, false); });

    // View mode
    function applyViewModeToNode(id) { const n = nodes.get(id); if (!n) return; if (viewMode === 'edit') { n.ta.style.display = 'block'; n.previewEl.style.display = 'none'; } else { n.ta.style.display = 'none'; n.previewEl.style.display = 'block'; n.previewEl.innerHTML = renderMarkdown(n.ta.value); } }
    function applyViewModeToAll() { nodes.forEach((_, id) => applyViewModeToNode(id)); }

    // Persistence
    function saveAll() {
        if (suppressSaves) return;
        const state = { nextId, nodes: {}, links: links.map(l => [l.from, l.to]) };
        nodes.forEach((n, id) => { state.nodes[id] = { id, title: n.titleEl.textContent, desc: n.ta.value, x: parseFloat(n.el.style.left) || 0, y: parseFloat(n.el.style.top) || 0, descOpen: n.descWrap.classList.contains('open') }; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    function loadAll() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || ''); } catch { return null; } }

    // Seed helpers
    function findNodeByTitle(title) { for (const [id, n] of nodes) if (n.titleEl.textContent === title) return id; return null; }
    function ensureLink(fromId, toId) { if (!links.some(l => l.from === fromId && l.to === toId)) addLink(fromId, toId); }

    const SEED_DATA = [
        {
            id: 100, title: 'Nimbus Deployment Workflow', tasks: [
                { id: 1, status: '🟢', title: 'Adjust Apache proxy settings', state: 'Completed', estimate: '', comment: '', created: '', started: '', completed: '2025-07-15 18:12' },
                { id: 2, status: '🟢', title: 'Create read-only deploy key', state: 'Completed', estimate: '', comment: '', created: '', started: '2025-07-15 09:30', completed: '2025-07-15 12:40' },
                { id: 20, status: '🟢', title: 'Validate hybrid deployment pipeline', state: 'Completed', estimate: '', comment: 'Work log 09:15–11:15; 13:00–15:00; 16:00–18:45', created: '2025-07-15 12:40', started: '2025-07-16 09:15', completed: '2025-07-16 18:45' },
                { id: 27, status: '🟢', title: 'Finalize service-host pipelines', state: 'Completed', estimate: '', comment: '', created: '2025-07-16 18:45', started: '2025-07-17 14:00', completed: '2025-07-17 16:20' },
                { id: 28, status: '🔵', title: 'Craft proxy automation workflow', state: 'In progress', estimate: '', comment: '', created: '2025-07-16 18:45', started: '', completed: '' },
                { id: 29, status: '🔵', title: 'Run CI workflow tests', state: 'In progress', estimate: '', comment: '', created: '2025-07-16 18:45', started: '2025-07-17 16:50', completed: '' },
                { id: 25, status: '🟢', title: 'GitHub onboarding workshop', state: 'Completed', estimate: '', comment: 'Session with teammate', created: '2025-07-16 11:00', started: '2025-07-16 11:00', completed: '2025-07-16 12:15' },
                { id: 30, status: '🟢', title: 'Investigate DDH bug', state: 'Completed', estimate: '', comment: '', created: '2025-07-16 18:45', started: '2025-07-17 10:05', completed: '2025-07-17 10:22' },
                { id: 32, status: '🟢', title: 'Backlog refinement meeting', state: 'Completed', estimate: '', comment: '', created: '2025-07-17 08:20', started: '2025-07-17 08:20', completed: '2025-07-17 09:40' }
            ]
        },
        {
            id: 101, title: 'Metrics Dashboard Access', tasks: [
                { id: 3, status: '🟢', title: 'File ticket for dashboard access', state: 'Completed', estimate: '', comment: 'waiting for approval', created: '2025-07-15 10:11', started: '', completed: '2025-07-15 10:32' },
                { id: 4, status: '🟢', title: 'Give Alex administrator role', state: 'Completed', estimate: '', comment: '', created: '', started: '', completed: '2025-07-15 10:45' },
                { id: 5, status: '🟢', title: 'Verify Jordan dashboard access', state: 'Completed', estimate: '', comment: '', created: '', started: '', completed: '2025-07-16 14:18' }
            ]
        },
    ];

    function seedFromData(data) {
        data.forEach((story, si) => {
            const sx = 60 + si * 260, sy = 60;
            let sid = findNodeByTitle(story.title);
            if (sid == null) sid = createNode({ id: story.id, title: story.title, x: sx, y: sy });
            story.tasks?.forEach((t, ti) => {
                const desc = `- **Status:** ${t.status}\n- **State:** ${t.state}\n- **Estimate:** ${t.estimate}\n- **Comment:** ${t.comment}\n- **CreatedAt:** ${t.created}\n- **StartedAt:** ${t.started}\n- **CompletedAt:** ${t.completed}`;
                const tx = sx, ty = sy + 100 * (ti + 1);
                let tid = findNodeByTitle(t.title);
                if (tid == null) tid = createNode({ id: t.id, title: t.title, x: tx, y: ty, desc });
                ensureLink(sid, tid);
            });
        });
    }

    function seedCanvas() {
        const prev = localStorage.getItem(STORAGE_KEY);
        const semPrev = localStorage.getItem(SEM_CACHE_KEY);
        const prevSuppress = suppressSaves; suppressSaves = true;
        const savedSaveAll = saveAll; saveAll = () => { };
        try {
            seedFromData(SEED_DATA);
            applyViewModeToAll?.();
            logAction?.('Seeded sample task dataset');
        } finally {
            saveAll = savedSaveAll;
            suppressSaves = prevSuppress;
            if (prev === null) localStorage.removeItem(STORAGE_KEY); else localStorage.setItem(STORAGE_KEY, prev);
            if (semPrev === null) localStorage.removeItem(SEM_CACHE_KEY); else localStorage.setItem(SEM_CACHE_KEY, semPrev);
        }
    }

    function bootstrap() { const s = loadAll(); if (s && s.nodes) { const ids = Object.keys(s.nodes).map(Number).sort((a, b) => a - b); ids.forEach(id => { const n = s.nodes[id]; createNode({ id: n.id, title: n.title, x: n.x, y: n.y, desc: n.desc, descOpen: n.descOpen }); }); nextId = Math.max(s.nextId || 1, Math.max(0, ...ids) + 1); if (Array.isArray(s.links)) s.links.forEach(([f, t]) => addLink(f, t)); applyViewModeToAll(); logAction('Restored from localStorage'); } else { seedFromData(SEED_DATA); applyViewModeToAll(); saveAll(); } }

    window.addEventListener('resize', () => { links.forEach(updateLinkPosition); });

    bootstrap();

    console.log('Press F9 to toggle save suppression at runtime (window.toggleSaveSuppression()).');
    updateToggleAllDescBtn();
    if (semanticsOn) applySemanticColors();
})();
