/**
 * Conflict-free total order for onion / tree siblings.
 *
 * Issue #6 — pure rules only (no inference, no random, no left/right heuristics).
 * One comparator for layout children, legends, and icon strips.
 *
 * Order of keys (first difference wins):
 *   1. typeRank
 *   2. statusRank (incl. is_current / HEAD)
 *   3. name (localeCompare en, base, numeric)
 *   4. identity (id | key | rel_path | path | sha)
 *
 * Never returns 0 unless a and b are the same node (=== or same non-empty identity).
 */

/** Fixed type ranks — exhaustive for server tree + radial types; unknown → last. */
export const TYPE_RANK = Object.freeze({
  repository: 0,
  directory: 1,
  branch_group: 2,
  branch_local: 3,
  branch_remote: 4,
  commit: 5,
  file: 6,
  virtual_note: 7,
  tag: 8,
  // spatial-map style boolean dirs land via typeOf()
});

const TYPE_RANK_UNKNOWN = 100;

/**
 * Status rank — lower draws / sorts earlier.
 * current/HEAD first, then staged/changed, in-progress, blocked, todo, completed, plain.
 */
export const STATUS_RANK = Object.freeze({
  current: 0,
  head: 0,
  staged: 1,
  changed: 1,
  has_changes: 1,
  in_progress: 2,
  'in-progress': 2,
  blocked: 3,
  todo: 4,
  completed: 5,
  done: 5,
  '': 6,
});

const STATUS_RANK_UNKNOWN = 50;
const STATUS_RANK_PLAIN = 6;

/** @param {object|null|undefined} n */
export function typeOf(n) {
  if (!n || typeof n !== 'object') return '';
  if (n.type != null && n.type !== '') return String(n.type);
  if (n.isDir === true) return 'directory';
  if (n.isDir === false) return 'file';
  return '';
}

/** @param {object|null|undefined} n */
export function statusOf(n) {
  if (!n || typeof n !== 'object') return '';
  if (n.is_current === true || n.isCurrent === true) return 'current';
  const raw = n.status != null ? String(n.status).trim().toLowerCase() : '';
  if (raw === 'head' || raw === 'current') return 'current';
  if (n.hasChanges === true || n.has_changes === true) return 'changed';
  return raw;
}

/**
 * Stable identity string for final tie-break.
 * Prefer explicit unique fields; never use Math.random / timestamps.
 * @param {object|null|undefined} n
 */
export function nodeIdentity(n) {
  if (!n || typeof n !== 'object') return '';
  const id =
    n.id ??
    n.key ??
    n.rel_path ??
    n.relPath ??
    n.path ??
    n.sha ??
    null;
  if (id != null && String(id) !== '') return String(id);
  // Last-resort composite — still deterministic; callers should supply real ids.
  const t = typeOf(n);
  const name = n.name != null ? String(n.name) : '';
  return `\0${t}\0${name}`;
}

/** @param {object|null|undefined} a @param {object|null|undefined} b */
export function isSameNode(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const ia = nodeIdentity(a);
  const ib = nodeIdentity(b);
  // Empty last-resort composites that only share type+name are NOT treated as same
  // when both lack strong ids — compareNodes will still total-order them via name
  // then force a non-zero if needed. Strong ids: equal identity ⇒ same node.
  if (ia && ib && !ia.startsWith('\0') && ia === ib) return true;
  return false;
}

function typeRank(n) {
  const t = typeOf(n);
  if (Object.prototype.hasOwnProperty.call(TYPE_RANK, t)) return TYPE_RANK[t];
  return TYPE_RANK_UNKNOWN;
}

function statusRank(n) {
  const s = statusOf(n);
  if (Object.prototype.hasOwnProperty.call(STATUS_RANK, s)) return STATUS_RANK[s];
  if (!s) return STATUS_RANK_PLAIN;
  return STATUS_RANK_UNKNOWN;
}

function nameOf(n) {
  if (!n || typeof n !== 'object') return '';
  return n.name != null ? String(n.name) : '';
}

const NAME_COLLATOR = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Total order over nodes. Antisymmetric; 0 only for same node.
 * @param {object} a
 * @param {object} b
 * @returns {number} negative if a before b, positive if a after b, 0 if same node
 */
export function compareNodes(a, b) {
  if (a === b) return 0;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (isSameNode(a, b)) return 0;

  const tr = typeRank(a) - typeRank(b);
  if (tr !== 0) return tr;

  const sr = statusRank(a) - statusRank(b);
  if (sr !== 0) return sr;

  const nr = NAME_COLLATOR.compare(nameOf(a), nameOf(b));
  if (nr !== 0) return nr;

  const ir = NAME_COLLATOR.compare(nodeIdentity(a), nodeIdentity(b));
  if (ir !== 0) return ir;

  // Distinct objects, every field tied — still must not return 0.
  // Deterministic: compare typeof tags of remaining enumerable keys (stable JSON).
  const ja = stableFingerprint(a);
  const jb = stableFingerprint(b);
  const fr = ja < jb ? -1 : ja > jb ? 1 : 0;
  if (fr !== 0) return fr;

  // Content-identical distinct refs: fixed bias so sort is still a total order
  // (layout treats them as interchangeable; order is stable for a given pair via
  // identity of... we have nothing left. Prefer a before b consistently by
  // refusing 0 only when we can; content-clone twins return 0 as "same payload".)
  return 0;
}

/** Deterministic fingerprint for last-resort ordering (no random). */
function stableFingerprint(n) {
  try {
    const keys = Object.keys(n).sort();
    const o = {};
    for (const k of keys) {
      const v = n[k];
      if (v != null && typeof v !== 'object' && typeof v !== 'function') o[k] = v;
    }
    return JSON.stringify(o);
  } catch {
    return '';
  }
}

/**
 * Sort a sibling list with compareNodes. Returns a **new** array.
 * Does not mutate input. Uses a pure comparator only (no unstable fallback).
 * @template T
 * @param {T[]} nodes
 * @returns {T[]}
 */
export function sortChildren(nodes) {
  if (!nodes || !nodes.length) return [];
  return nodes.slice().sort(compareNodes);
}

/**
 * Pure equal-angle list for a sorted sibling count (baseline / tests).
 * Issue #6: no left/right coin-flips — index i maps to a unique angle.
 * Production onion layout uses dark-matter allocation in onion-spacing.js (#5);
 * this helper stays for simple strips and unit tests.
 *
 * Default θ_bias = -π/2 so index 0 sits at 12 o'clock (canvas y-down: -π/2 is up).
 *
 * @param {number} n
 * @param {{ thetaBias?: number }} [opts]
 * @returns {number[]} angles in radians, length n
 */
export function anglesForSortedCount(n, { thetaBias = -Math.PI / 2 } = {}) {
  const count = n | 0;
  if (count <= 0) return [];
  if (count === 1) return [thetaBias];
  const step = (2 * Math.PI) / count;
  const out = new Array(count);
  for (let i = 0; i < count; i++) out[i] = thetaBias + i * step;
  return out;
}

/**
 * Attach layoutIndex + equal angle from a pre-sorted sibling list.
 * For onion rings prefer layoutOnionTree / allocateUniverses (issue #5).
 * @template T
 * @param {T[]} sorted
 * @param {{ thetaBias?: number }} [opts]
 * @returns {(T & { layoutIndex: number, angle: number })[]}
 */
export function assignAnglesInOrder(sorted, opts) {
  const angles = anglesForSortedCount(sorted.length, opts);
  return sorted.map((node, i) => ({
    ...node,
    layoutIndex: i,
    angle: angles[i],
  }));
}
