/**
 * Radial onion lens — re-rootable starburst + concentric layers.
 * Spec: docs/specs/radial-rerooting-spec.md
 * Contract: docs/renderer-contract.md (compositor-owned camera)
 *
 * Layout stack (deterministic, no inference):
 *   #6 sort  → total-order siblings (compare-nodes)
 *   #5 space → dark-matter gaps + proportional sectors (onion-spacing)
 *   #4 keep  → membership ≠ camera (draw-cull later)
 *   #3 dash  → phase-offset strokes later
 *
 * Prefer empty stretch over packing — see ONION_SPACING + layoutOnionTree.
 */
import {
  compareNodes,
  sortChildren,
  anglesForSortedCount,
  assignAnglesInOrder,
  nodeIdentity,
} from '../model/compare-nodes.js';
import {
  ONION_SPACING,
  deltaR,
  thetaMin,
  layoutOnionTree,
  allocateUniverses,
  minRing1EmptyGap,
  universeWeight,
  gapBudget,
} from '../model/onion-spacing.js';
import { buildTree } from '../model/tree.js';

export {
  compareNodes,
  sortChildren,
  anglesForSortedCount,
  assignAnglesInOrder,
  nodeIdentity,
  ONION_SPACING,
  deltaR,
  thetaMin,
  layoutOnionTree,
  allocateUniverses,
  minRing1EmptyGap,
  universeWeight,
  gapBudget,
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
  constructor(spacingOverrides = {}) {
    /** @type {OnionNode|null} */
    this.root = null;
    /** @type {OnionNode|null} */
    this.currentRoot = null;
    /** Flat list of laid-out nodes (full accessibility set for current root). */
    this.nodes = [];
    /** @type {string|null} */
    this.rootId = null;
    /** Repo-relative path of the current root ('' = full repo). Used by map.html. */
    this.rootPath = '';
    /** @type {string|null} */
    this.selectedPath = null;
    /** Optional per-instance spacing overrides (tests / tuning). */
    this.spacingOverrides = spacingOverrides;
    /** @type {Map<string, OnionNode>|null} path index for string reRoot */
    this._byPath = null;
  }

  /**
   * Accept a tree-shaped root (`{ children }`) or RepoSnapshot-like `{ files[] }`.
   * @param {OnionNode|{files?: object[], repoPath?: string, notes?: object}|null} snapshotOrTree
   */
  setData(snapshotOrTree) {
    this.notes = (snapshotOrTree && snapshotOrTree.notes) || {};
    this.root = normalizeToTree(snapshotOrTree);
    this.currentRoot = this.root;
    this.rootId = this.root ? nodeIdentity(this.root) : null;
    this.rootPath = this.root ? (this.root.path || '') : '';
    this.selectedPath = null;
    this._byPath = indexByPath(this.root);
    this.layout();
  }

  /**
   * Click-to-re-root: recompute onion from the chosen node or repo-relative path.
   * @param {OnionNode|string|null} nodeOrPath
   */
  reRoot(nodeOrPath) {
    if (nodeOrPath == null || nodeOrPath === '') {
      this.currentRoot = this.root;
      this.rootId = this.root ? nodeIdentity(this.root) : null;
      this.rootPath = this.root ? (this.root.path || '') : '';
      this.selectedPath = null;
      this.layout();
      return;
    }
    const node = typeof nodeOrPath === 'string'
      ? (this._byPath && this._byPath.get(nodeOrPath)) || findByPath(this.root, nodeOrPath)
      : nodeOrPath;
    if (!node) return;
    this.currentRoot = node;
    this.rootId = nodeIdentity(node);
    this.rootPath = node.path || node.rel_path || '';
    this.selectedPath = null;
    this.layout();
  }

  setSelected(path) {
    this.selectedPath = path;
  }

  /** Directory click re-roots; file click falls through to inspector. */
  onClick(node) {
    if (!node) return null;
    const isDir = node.isDir || node.type === 'directory' || node.type === 'repository'
      || (node.children && node.children.length);
    const path = node.path || node.rel_path || '';
    if (isDir && path !== this.rootPath) {
      this.reRoot(node);
      return null;
    }
    this.selectedPath = path || null;
    return node;
  }

  /**
   * Full accessibility layout for currentRoot via dark-matter allocator.
   * Camera never changes membership (issue #4); this always rebuilds the batch.
   */
  layout() {
    const root = this.currentRoot;
    if (!root) {
      this.nodes = [];
      return;
    }
    this.nodes = layoutOnionTree(root, this.spacingOverrides);
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
    // Concentric guides (onion layers) — subtle, non-interactive.
    const rings = new Set(this.nodes.map((n) => n.ring).filter((r) => r > 0));
    if (rings.size) {
      const center = this.nodes.find((n) => n.ring === 0);
      const cx = center ? center.wx * view.scale + view.tx : view.tx;
      const cy = center ? center.wy * view.scale + view.ty : view.ty;
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 190, 62, 0.12)';
      ctx.lineWidth = 1;
      const r0 = (this.spacingOverrides.R0 ?? ONION_SPACING.R0);
      const dR = deltaR({ ...ONION_SPACING, ...this.spacingOverrides });
      for (const ring of rings) {
        const rr = (r0 + ring * dR) * view.scale;
        // actual radii may differ slightly if R0+ring*Δr; use max node radius on ring
        const sample = this.nodes.find((n) => n.ring === ring);
        const rad = sample
          ? Math.hypot(sample.wx, sample.wy) * view.scale
          : rr;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, rad), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Spokes parent→child by ring adjacency (solid; dash phase is #3).
    ctx.save();
    ctx.strokeStyle = 'rgba(224, 190, 62, 0.35)';
    ctx.lineWidth = 1;
    const byRing = new Map();
    for (const n of this.nodes) {
      if (!byRing.has(n.ring)) byRing.set(n.ring, []);
      byRing.get(n.ring).push(n);
    }
    // Connect each node on ring r>0 toward center (root) along its angle —
    // true parent edges need parent ids; radial spokes still read as onion.
    const rootN = this.nodes.find((n) => n.ring === 0);
    if (rootN) {
      const cx = rootN.wx * view.scale + view.tx;
      const cy = rootN.wy * view.scale + view.ty;
      for (const n of this.nodes) {
        if (n.ring !== 1) continue;
        const sx = n.wx * view.scale + view.tx;
        const sy = n.wy * view.scale + view.ty;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      // Deeper rings: spoke from parent sector midpoint radius to node
      for (const n of this.nodes) {
        if (n.ring < 2) continue;
        const parentR = Math.hypot(n.wx, n.wy) - deltaR({ ...ONION_SPACING, ...this.spacingOverrides });
        const px = Math.cos(n.angle) * parentR * view.scale + view.tx;
        const py = Math.sin(n.angle) * parentR * view.scale + view.ty;
        const sx = n.wx * view.scale + view.tx;
        const sy = n.wy * view.scale + view.ty;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
    }
    ctx.restore();

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
      path: input.path != null ? input.path : (input.rel_path || ''),
      children: sortChildren((input.children || []).map(normalizeToTree).filter(Boolean)),
    };
  }
  if (Array.isArray(input.files)) {
    // Hierarchical path tree (shared with map directory panel) rather than a flat list.
    const pathMap = buildTree(input.files);
    const rootNode = pathMap.get('');
    return onionFromTreeNode(rootNode, input.repoPath);
  }
  return {
    id: 'root',
    name: 'root',
    type: 'directory',
    path: '',
    children: [],
  };
}

/** @param {import('../model/tree.js').TreeNode|undefined} node */
function onionFromTreeNode(node, repoPath) {
  if (!node) {
    return {
      id: repoPath || 'root',
      name: repoPath ? String(repoPath).split(/[/\\]/).pop() : 'root',
      type: 'repository',
      path: '',
      children: [],
    };
  }
  const isRoot = !node.path;
  return {
    id: node.id || node.path || 'root',
    name: isRoot
      ? (repoPath ? String(repoPath).split(/[/\\]/).pop() : node.name || 'root')
      : node.name,
    path: node.path || '',
    rel_path: node.path || '',
    type: isRoot ? 'repository' : (node.isDir ? 'directory' : 'file'),
    isDir: isRoot || !!node.isDir,
    children: sortChildren((node.children || []).map((c) => onionFromTreeNode(c, repoPath))),
  };
}

function indexByPath(root) {
  const map = new Map();
  const walk = (n) => {
    if (!n) return;
    const p = n.path != null ? n.path : (n.rel_path || '');
    map.set(p, n);
    for (const c of n.children || []) walk(c);
  };
  walk(root);
  return map;
}

function findByPath(root, path) {
  if (!root) return null;
  if ((root.path || root.rel_path || '') === path) return root;
  for (const c of root.children || []) {
    const hit = findByPath(c, path);
    if (hit) return hit;
  }
  return null;
}
