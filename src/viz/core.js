/**
 * AyTree core shared utilities (harvested + adapted)
 * hash, layout helpers, fit, etc. Used by all renderers.
 */

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function buildPresenceLayout(nodes) {
  const dirCenters = new Map();
  function topCenter(name) {
    if (dirCenters.has(name)) return dirCenters.get(name);
    const h = hashStr(name);
    const col = Math.floor(h * 3);
    const row = Math.floor((h * 7) % 3);
    const c = { x: 0.15 + col * 0.28, y: 0.18 + row * 0.26 };
    dirCenters.set(name, c);
    return c;
  }
  nodes.forEach(n => {
    const top = (n.path.split('/')[0] || 'root');
    const c = topCenter(top);
    const h = hashStr(n.path + 'j');
    const jr = n.isDir ? 0.04 : 0.025;
    n.wx = c.x + (h - 0.5) * jr * 1.5;
    n.wy = c.y + (hashStr(n.path + 'k') - 0.5) * jr * 1.2;
  });
}

export function fitViewToNodes(view, nodes, canvasRect) {
  if (!nodes.length) { view.tx = 0; view.ty = 0; view.scale = 1; return; }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const r = n.wr || 0.02;
    minX = Math.min(minX, n.wx - r);
    minY = Math.min(minY, n.wy - r);
    maxX = Math.max(maxX, n.wx + r);
    maxY = Math.max(maxY, n.wy + r);
  }
  const pad = 0.08;
  const w = Math.max(0.01, maxX - minX + pad * 2);
  const h = Math.max(0.01, maxY - minY + pad * 2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const availW = canvasRect.width || 800;
  const availH = canvasRect.height || 600;
  const s = Math.min(availW / (w * 1.1), availH / (h * 1.1));
  view.scale = Math.max(0.2, Math.min(18, s));
  view.tx = availW * 0.5 - cx * view.scale;
  view.ty = availH * 0.5 - cy * view.scale;
}
