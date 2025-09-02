// src/app/ui/node.js
import { nodes, incrementNextId, selectedId, setSelectedId, ensureNextId } from '../../app/state.js';
import { saveAll } from '../../persistence/storage.js';

export function createNode({ id, title, x, y, desc, descOpen } = {}) {
    const useId = id ?? incrementNextId();
    ensureNextId(useId);

    const el = document.createElement('div');
    el.className = 'node';
    el.dataset.id = useId;
    el.style.left = (typeof x === 'number' ? x : 40 * useId) + 'px';
    el.style.top = (typeof y === 'number' ? y : 40 * useId) + 'px';

    const header = document.createElement('div');
    header.className = 'node-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'node-title';
    titleEl.textContent = title || ('Task ' + useId);
    const toggle = document.createElement('button');
    toggle.className = 'toggle-desc';
    toggle.title = 'Toggle description';
    toggle.textContent = descOpen ? '▾' : '▸';
    header.appendChild(titleEl);
    header.appendChild(toggle);

    const descWrap = document.createElement('div');
    descWrap.className = 'node-desc';
    if (descOpen) descWrap.classList.add('open');
    const ta = document.createElement('textarea');
    ta.placeholder = 'Markdown description…';
    ta.value = desc || '';
    const preview = document.createElement('div');
    preview.className = 'desc-preview';
    preview.style.display = 'none';
    descWrap.appendChild(ta);
    descWrap.appendChild(preview);

    el.appendChild(header);
    el.appendChild(descWrap);

    const nodesLayer = document.getElementById('nodesLayer');
    nodesLayer.appendChild(el);

    nodes.set(useId, { el, titleEl, toggleEl: toggle, descWrap, ta, previewEl: preview });

    return { useId, el, titleEl, toggle, descWrap, ta, preview };
}

export function deleteNode(id) {
    const entry = nodes.get(id);
    if (!entry) return;
    if (!confirm('Delete this task?')) return;

    const lastDeleted = {
        id,
        title: entry.titleEl.textContent,
        desc: entry.ta.value,
        x: parseFloat(entry.el.style.left) || 0,
        y: parseFloat(entry.el.style.top) || 0,
        descOpen: entry.descWrap.classList.contains('open')
    };

    // Remove associated links
    const links = window.appState?.links || [];
    for (let i = links.length - 1; i >= 0; i--) {
        const l = links[i];
        if (l.from === id || l.to === id) {
            l.el.remove();
            links.splice(i, 1);
        }
    }

    entry.el.remove();
    nodes.delete(id);

    if (selectedId === id) setSelectedId(null);

    // Clear semantic cache
    const semanticCache = window.appState?.semanticCache || {};
    delete semanticCache[id];

    return lastDeleted;
}

export function startInlineTitleRename(id) {
    const entry = nodes.get(id);
    if (!entry) return;
    const { el, titleEl } = entry;
    if (el.classList.contains('editing')) return;

    el.classList.add('editing');
    const original = titleEl.textContent || '';
    titleEl.textContent = '';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'node-title-input';
    inp.value = original;
    inp.addEventListener('pointerdown', e => e.stopPropagation());

    const commit = (save) => {
        const v = save ? inp.value.trim() : original;
        titleEl.textContent = v || ('Task ' + id);
        el.classList.remove('editing');
        saveAll();
    };

    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit(true);
        if (e.key === 'Escape') commit(false);
    });
    inp.addEventListener('blur', () => commit(true));
    titleEl.appendChild(inp);
    setTimeout(() => { inp.focus(); inp.select(); }, 0);
}
