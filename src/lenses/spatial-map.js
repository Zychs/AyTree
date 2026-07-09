/**
 * Spatial file map — clustered organic file field, presence-only (no size encoding).
 * Implements docs/renderer-contract.md's VizRenderer contract, adapted so the camera stays
 * compositor-owned (draw/hitTest take {view} from the compositor rather than holding their
 * own). Ported from buildNodesLayout/fitViewToNodes/worldToScreen
 * (legacy/harvest/harvested_raw.js:345/84/646) per docs/specs/gui-spatial-map.md.
 */
import { hashStr } from '../model/hash.js';
import { catForExt, drawGlyph } from '../compositor/encode.js';
import { hitTestNodes } from '../compositor/hit-targets.js';

export class SpatialMapLens {
  constructor() {
    this.nodes = [];
  }

  setData(snapshot) {
    this.nodes = (snapshot.files || []).map((f) => ({ ...f, cat: catForExt(f.ext) }));
    this.layout();
  }

  layout() {
    const dirCenters = new Map();
    const topCenter = (name) => {
      if (dirCenters.has(name)) return dirCenters.get(name);
      const h = hashStr(name);
      const col = Math.floor(h * 3);
      const row = Math.floor((h * 7) % 3);
      const c = { x: 0.15 + col * 0.28, y: 0.18 + row * 0.26 };
      dirCenters.set(name, c);
      return c;
    };
    this.nodes.forEach((n) => {
      const top = n.path.split('/')[0] || 'root';
      const c = topCenter(top);
      const h = hashStr(n.path + 'j');
      const jr = n.isDir ? 0.04 : 0.025;
      n.wx = c.x + (h - 0.5) * jr * 1.5;
      n.wy = c.y + (hashStr(n.path + 'k') - 0.5) * jr * 1.2;
      n.wr = n.isDir ? 0.018 : 0.012; // fixed presence markers — no sqrt(size)
    });
  }

  fitView(view, nodes, rect) {
    const list = nodes && nodes.length ? nodes : this.nodes;
    if (!list.length) {
      view.tx = 0;
      view.ty = 0;
      view.scale = 1;
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of list) {
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
    const availW = rect.width || 800;
    const availH = rect.height || 600;
    const s = Math.min(availW / (w * 1.1), availH / (h * 1.1));
    view.scale = Math.max(0.2, Math.min(18, s));
    view.tx = availW * 0.5 - cx * view.scale;
    view.ty = availH * 0.5 - cy * view.scale;
  }

  draw(ctx, { view }) {
    for (const n of this.nodes) {
      const sx = n.wx * view.scale + view.tx;
      const sy = n.wy * view.scale + view.ty;
      const r = Math.max(2, n.wr * view.scale);
      drawGlyph(ctx, sx, sy, r, n.cat);
    }
  }

  hitTest(sx, sy, view) {
    const wx = (sx - view.tx) / view.scale;
    const wy = (sy - view.ty) / view.scale;
    return hitTestNodes(this.nodes, wx, wy);
  }

  resize() {}
}
