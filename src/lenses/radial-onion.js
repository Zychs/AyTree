/**
 * Radial onion lens — re-rootable starburst + concentric layers.
 * Spec: docs/specs/radial-rerooting-spec.md
 * Contract: docs/renderer-contract.md (compositor-owned camera)
 *
 * Issue #6 (done here): conflict-free deterministic sibling sort + pure angle
 * assignment from sorted index. Spacing “dark matter” (#5), draw-cull retention
 * (#4), and dash phase (#3) build on this order — do not reintroduce left/right
 * heuristics or Math.random in layout.
 */
import {
  compareNodes,
  sortChildren,
  anglesForSortedCount,
  assignAnglesInOrder,
  nodeIdentity,
} from '../model/compare-nodes.js';

export {
  compareNodes,
  sortChildren,
  anglesForSortedCount,
  assignAnglesInOrder,
  nodeIdentity,
};

/**
 * @typedef {object} OnionNode
 * @property {string} [id]
 * @property {string} [key]
 * @property {string} [name]
 * @property {string} [type]
 * @property {string} [path]
 * @property {string} [rel_path]
 * @property {string} [status]
 * @property {boolean} [is_current]
 * @property {OnionNode[]} [children]
 */

export class RadialOnionLens {
  constructor() {
    /** @type {OnionNode|null} */
    this.root = null;
    /** @type {OnionNode|null} */
    this.currentRoot = null;
    /** Flat list of laid-out nodes (membership for current root; issue #4 keeps full set). */
    this.nodes = [];
    /** @type {string|null} identity of currentRoot */
    this.rootId = null;
  }

  /**
   * Accept either a tree-shaped root node (`{ children }`) or a RepoSnapshot-like
   * object with `files[]` (promoted to a synthetic root for early wiring).
   * @param {OnionNode|{files?: object[], repoPath?: string}|null} snapshotOrTree
   */
  setData(snapshotOrTree) {
    this.root = normalizeToTree(snapshotOrTree);
    this.currentRoot = this.root;
    this.rootId = this.root ? nodeIdentity(this.root) : null;
    this.layout();
  }

  /** Click-to-re-root: any node in the laid-out set can become the new root. */
  reRoot(node) {
    if (!node) return;
    this.currentRoot = node;
    this.rootId = nodeIdentity(node);
    this.layout();
  }

  /**
   * Layout over the full accessibility set for currentRoot (direct children only
   * in this pass — deeper onion rings land with #5 spacing).
   * Children are always sortChildren'd before angles are assigned.
   */
  layout() {
    this.nodes = [];
    const root = this.currentRoot;
    if (!root) return;

    const center = {
      ...root,
      layoutIndex: -1,
      angle: 0,
      ring: 0,
      wx: 0,
      wy: 0,
      wr: 0.04,
    };
    this.nodes.push(center);

    const kids = sortChildren(root.children || []);
    const placed = assignAnglesInOrder(kids);
    const ringRadius = 0.35;

    for (const child of placed) {
      const wx = Math.cos(child.angle) * ringRadius;
      const wy = Math.sin(child.angle) * ringRadius;
      this.nodes.push({
        ...child,
        ring: 1,
        wx,
        wy,
        wr: 0.02,
        // preserve sorted children on the node for later rings / legends
        children: sortChildren(child.children || []),
      });
    }
  }

  fitView(view, nodes, rect) {
    const list = nodes && nodes.length ? nodes : this.nodes;
    if (!list.length) {
      view.tx = 0;
      view.ty = 0;
      view.scale = 1;
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
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
    // Spokes first (parent → ring-1). Dash phase is issue #3; solid for now.
    const center = this.nodes.find((n) => n.ring === 0);
    if (center) {
      const cx = center.wx * view.scale + view.tx;
      const cy = center.wy * view.scale + view.ty;
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 190, 62, 0.35)';
      ctx.lineWidth = 1;
      for (const n of this.nodes) {
        if (n.ring !== 1) continue;
        const sx = n.wx * view.scale + view.tx;
        const sy = n.wy * view.scale + view.ty;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const n of this.nodes) {
      const sx = n.wx * view.scale + view.tx;
      const sy = n.wy * view.scale + view.ty;
      const r = Math.max(3, (n.wr || 0.02) * view.scale);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = n.ring === 0 ? '#58a6ff' : '#f4edcf';
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,14,10,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  hitTest(sx, sy, view) {
    const wx = (sx - view.tx) / view.scale;
    const wy = (sy - view.ty) / view.scale;
    let best = null;
    let bestD = Infinity;
    for (const n of this.nodes) {
      const dx = wx - n.wx;
      const dy = wy - n.wy;
      const d = Math.hypot(dx, dy);
      const hitR = (n.wr || 0.02) * 1.8;
      if (d <= hitR && d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  resize() {}
}

/**
 * @param {OnionNode|{files?: object[], repoPath?: string}|null} input
 * @returns {OnionNode|null}
 */
function normalizeToTree(input) {
  if (!input) return null;
  if (Array.isArray(input.children) || input.type || input.name) {
    return {
      ...input,
      children: sortChildren(input.children || []),
    };
  }
  // RepoSnapshot-ish: files[] → synthetic root with file/dir children
  if (Array.isArray(input.files)) {
    const children = input.files.map((f) => ({
      id: f.path || f.name,
      name: f.name || (f.path ? f.path.split('/').pop() : 'file'),
      path: f.path,
      rel_path: f.path,
      type: f.isDir ? 'directory' : 'file',
      children: [],
    }));
    return {
      id: input.repoPath || 'repo-root',
      name: input.repoPath ? String(input.repoPath).split(/[/\\]/).pop() : 'root',
      type: 'repository',
      children: sortChildren(children),
    };
  }
  return {
    id: 'root',
    name: 'root',
    type: 'directory',
    children: [],
  };
}
