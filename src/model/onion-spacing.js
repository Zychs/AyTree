/**
 * Dark-matter spacing for the radial onion.
 *
 * Issue #5 — prefer empty stretch over packing. Keep universes apart by
 * reserving angular gaps and proportional sectors; never pack edge-to-edge;
 * never push nodes left/right with ad-hoc overlap fixes.
 *
 * Depends on issue #6: callers pass sortChildren-ordered lists (this module
 * re-sorts defensively so layout stays total-ordered either way).
 *
 * Constants live in one place (ONION_SPACING). Pure functions only.
 */
import { sortChildren } from './compare-nodes.js';

/**
 * Layout constants — single source for the onion.
 *
 * | Symbol | Meaning |
 * | R0     | root marker radius (world) |
 * | Δr     | min radial gap between rings |
 * | θ_min  | min angular separation at a ring radius |
 * | G      | reserved empty wedge between sibling universes |
 * | N_max  | max nodes on one ring in a sector before overflow |
 */
export const ONION_SPACING = Object.freeze({
  R0: 0.04,
  nodeRadius: 0.02,
  pad: 0.01,
  /** Floor for Δr in world units. */
  minGap: 0.08,
  /** Default universe gap (~15°). Scaled down if m*G exceeds maxGapFraction. */
  G: Math.PI / 12,
  /** At most this fraction of a sector may be dark-matter gaps. */
  maxGapFraction: 0.45,
  /** Absolute floor on angular separation (radians). */
  thetaFloor: 0.08,
  /** Chord length used in θ_min = 2·asin(minChord / (2·r)). */
  minChord: 0.05,
  /** Max nodes per ring inside one sector; overflow drops to next ring (breadth). */
  N_max: 24,
  /** Fixed rotation only — no per-node left/right bias. 12 o'clock on canvas. */
  thetaBias: -Math.PI / 2,
  maxRings: 8,
});

/** Δr ≥ max(minGap, nodeRadius·2 + pad) */
export function deltaR(cfg = ONION_SPACING) {
  return Math.max(cfg.minGap, cfg.nodeRadius * 2 + cfg.pad);
}

/**
 * θ_min at ring radius r: chord floor, then global θ_floor.
 * @param {number} rRing
 * @param {typeof ONION_SPACING} [cfg]
 */
export function thetaMin(rRing, cfg = ONION_SPACING) {
  const r = Math.max(rRing, 1e-6);
  const half = cfg.minChord / (2 * r);
  const fromChord = half >= 1 ? Math.PI : 2 * Math.asin(Math.min(1, half));
  return Math.max(cfg.thetaFloor, fromChord);
}

/** weight = max(1, directChildCount) — integer counts only, no inference. */
export function universeWeight(node) {
  const n = node && Array.isArray(node.children) ? node.children.length : 0;
  return Math.max(1, n | 0);
}

/**
 * Effective gap G' after clamp: if m·G ≥ span·maxGapFraction, scale G down
 * uniformly so m·G' = span·maxGapFraction.
 * @returns {{ G: number, totalGaps: number, contentArc: number }}
 */
export function gapBudget(m, sectorSpan, cfg = ONION_SPACING) {
  const count = Math.max(0, m | 0);
  const span = Math.max(0, sectorSpan);
  if (count === 0 || span <= 0) {
    return { G: 0, totalGaps: 0, contentArc: span };
  }
  let G = cfg.G;
  let totalGaps = count * G;
  const maxGaps = span * cfg.maxGapFraction;
  if (totalGaps > maxGaps) {
    G = maxGaps / count;
    totalGaps = maxGaps;
  }
  // Degenerate: never let gaps eat the whole sector.
  if (totalGaps >= span) {
    totalGaps = span * cfg.maxGapFraction;
    G = totalGaps / count;
  }
  const contentArc = Math.max(0, span - totalGaps);
  return { G, totalGaps, contentArc };
}

/**
 * How many of `m` nodes fit on this ring given contentArc and θ_min.
 * Overflow uses breadth rule (issue #5 option a) with N_max cap.
 */
export function fitCountOnRing(m, contentArc, rRing, cfg = ONION_SPACING) {
  const tMin = thetaMin(rRing, cfg);
  const byAngle = tMin > 0 ? Math.max(1, Math.floor(contentArc / tMin + 1e-12)) : m;
  const cap = Math.min(cfg.N_max, m);
  return Math.max(1, Math.min(cap, byAngle, m));
}

/**
 * Allocate proportional arcs + dark-matter gaps for a sorted sibling list.
 * Extra angle beyond n·θ_min stays empty (stretch — not redistributed as jitter).
 *
 * Pattern per sibling i: [ content arc_i | gap G ]  (gap after each, including last,
 * so universes stay separated wrapping around the circle at top level).
 *
 * @param {object[]} sorted already ordered siblings
 * @param {number} sectorStart radians
 * @param {number} sectorSpan radians
 * @param {number} rRing radius for θ_min
 * @param {typeof ONION_SPACING} [cfg]
 * @returns {{ placements: { node: object, angle: number, layoutIndex: number, sectorStart: number, sectorSpan: number }[], overflow: object[], G: number }}
 */
export function allocateUniverses(sorted, sectorStart, sectorSpan, rRing, cfg = ONION_SPACING) {
  const list = sorted || [];
  const mAll = list.length;
  if (!mAll) return { placements: [], overflow: [], G: 0 };

  // Provisional budget with all m to decide fit; may shrink to k on this ring.
  let k = mAll;
  let budget = gapBudget(k, sectorSpan, cfg);
  k = fitCountOnRing(mAll, budget.contentArc, rRing, cfg);
  // Recompute budget for the actual k (G scales with count).
  budget = gapBudget(k, sectorSpan, cfg);

  const onRing = list.slice(0, k);
  const overflow = list.slice(k);

  const weights = onRing.map(universeWeight);
  const sumW = weights.reduce((a, b) => a + b, 0) || k;

  const placements = [];
  let cursor = sectorStart;
  const { G, contentArc } = budget;

  for (let i = 0; i < k; i++) {
    // Proportional content; leftover inside a large arc stays empty around the hub.
    const arc = contentArc * (weights[i] / sumW);
    const angle = cursor + arc / 2;
    placements.push({
      node: onRing[i],
      angle,
      layoutIndex: i,
      sectorStart: cursor,
      sectorSpan: arc,
    });
    cursor += arc + G;
  }

  return { placements, overflow, G: budget.G };
}

/**
 * Full onion layout from a root node.
 * Prefer empty stretch over packing — gaps and oversized sectors intentionally idle.
 *
 * @param {object} root tree node with children[]
 * @param {Partial<typeof ONION_SPACING>} [overrides]
 * @returns {object[]} flat list with wx, wy, wr, angle, ring, layoutIndex, sector*
 */
export function layoutOnionTree(root, overrides = {}) {
  const cfg = freezeCfg(overrides);
  /** @type {object[]} */
  const out = [];
  if (!root) return out;

  out.push({
    ...root,
    layoutIndex: -1,
    angle: 0,
    ring: 0,
    wx: 0,
    wy: 0,
    wr: cfg.R0,
    sectorStart: cfg.thetaBias,
    sectorSpan: Math.PI * 2,
    children: sortChildren(root.children || []),
  });

  const r1 = cfg.R0 + deltaR(cfg);
  layoutSector({
    children: root.children || [],
    sectorStart: cfg.thetaBias,
    sectorSpan: Math.PI * 2,
    ring: 1,
    radius: r1,
    out,
    cfg,
  });

  return out;
}

/**
 * @param {object} args
 * @param {object[]} args.children
 * @param {number} args.sectorStart
 * @param {number} args.sectorSpan
 * @param {number} args.ring
 * @param {number} args.radius
 * @param {object[]} args.out
 * @param {typeof ONION_SPACING & Record<string, number>} args.cfg
 */
function layoutSector({ children, sectorStart, sectorSpan, ring, radius, out, cfg }) {
  if (ring > cfg.maxRings) return;
  const sorted = sortChildren(children || []);
  if (!sorted.length || sectorSpan <= 0) return;

  const { placements, overflow, G } = allocateUniverses(
    sorted,
    sectorStart,
    sectorSpan,
    radius,
    cfg,
  );

  for (const p of placements) {
    const node = p.node;
    const kids = sortChildren(node.children || []);
    out.push({
      ...node,
      layoutIndex: p.layoutIndex,
      angle: p.angle,
      ring,
      wx: Math.cos(p.angle) * radius,
      wy: Math.sin(p.angle) * radius,
      wr: cfg.nodeRadius,
      sectorStart: p.sectorStart,
      sectorSpan: p.sectorSpan,
      gapAfter: G,
      children: kids,
    });

    // Deeper rings: same rules inside this universe's content arc only —
    // never steal angle from a sibling universe.
    if (kids.length) {
      layoutSector({
        children: kids,
        sectorStart: p.sectorStart,
        sectorSpan: p.sectorSpan,
        ring: ring + 1,
        radius: radius + deltaR(cfg),
        out,
        cfg,
      });
    }
  }

  // Breadth overflow: next ring, same parent sector (not a sibling steal).
  if (overflow.length) {
    layoutSector({
      children: overflow,
      sectorStart,
      sectorSpan,
      ring: ring + 1,
      radius: radius + deltaR(cfg),
      out,
      cfg,
    });
  }
}

function freezeCfg(overrides) {
  return Object.freeze({ ...ONION_SPACING, ...overrides });
}

/**
 * Measurable min empty gap between consecutive ring-1 hubs (angular).
 * Used by tests: should be ≥ G (after clamp) for m ≥ 2.
 * @param {object[]} nodes layout output
 * @returns {number} min angular gap between successive ring-1 nodes (radians)
 */
export function minRing1EmptyGap(nodes) {
  const ring1 = (nodes || [])
    .filter((n) => n.ring === 1)
    .slice()
    .sort((a, b) => a.angle - b.angle);
  if (ring1.length < 2) return Infinity;
  let minGap = Infinity;
  for (let i = 0; i < ring1.length; i++) {
    const a = ring1[i];
    const b = ring1[(i + 1) % ring1.length];
    // Empty stretch ≈ distance from end of a's content to start of b's content,
    // which is gapAfter; also mid-to-mid minus half-arcs.
    const midDist =
      i < ring1.length - 1
        ? b.angle - a.angle
        : b.angle + Math.PI * 2 - a.angle;
    const halfA = (a.sectorSpan || 0) / 2;
    const halfB = (b.sectorSpan || 0) / 2;
    const empty = midDist - halfA - halfB;
    if (empty < minGap) minGap = empty;
  }
  return minGap;
}
