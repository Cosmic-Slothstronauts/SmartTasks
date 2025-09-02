// src/app/ui/links.js
import { nodes, links } from '../../app/state.js';
import { saveAll } from '../../persistence/storage.js';

function nodeCenter(canvasWrap, el) {
    const cr = canvasWrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (r.left - cr.left) + r.width / 2, y: (r.top - cr.top) + r.height / 2 };
}

export function updateLinkPosition(link) {
    const canvasWrap = document.getElementById('canvasWrap');
    const a = nodes.get(link.from)?.el, b = nodes.get(link.to)?.el;
    if (!a || !b) return;
    const ca = nodeCenter(canvasWrap, a), cb = nodeCenter(canvasWrap, b);
    link.el.setAttribute('x1', ca.x);
    link.el.setAttribute('y1', ca.y);
    link.el.setAttribute('x2', cb.x);
    link.el.setAttribute('y2', cb.y);
}

export function updateLinksForNode(id) {
    links.forEach(l => {
        if (l.from === id || l.to === id) updateLinkPosition(l);
    });
}

export function addLink(fromId, toId) {
    if (fromId === toId) return;
    if (links.some(l => l.from === fromId && l.to === toId)) return;

    const linkLayer = document.getElementById('linkLayer');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('marker-end', 'url(#arrow)');
    line.setAttribute('data-link', '');
    linkLayer.appendChild(line);

    const l = { from: fromId, to: toId, el: line };
    links.push(l);
    updateLinkPosition(l);

    const logAction = window.appState?.logAction;
    if (logAction) logAction('Linked #' + fromId + ' → #' + toId);
    saveAll();
}

export function removeLinkBetween(a, b) {
    let removed = 0;
    for (let i = links.length - 1; i >= 0; i--) {
        const l = links[i];
        const m = (l.from === a && l.to === b) || (l.from === b && l.to === a);
        if (m) {
            l.el.remove();
            links.splice(i, 1);
            removed++;
        }
    }

    const logAction = window.appState?.logAction;
    if (logAction) {
        logAction(removed ? ('Removed link(s) between #' + a + ' and #' + b + ' (' + removed + ')') : 'No link found');
    }
    if (removed) saveAll();
    return removed;
}

