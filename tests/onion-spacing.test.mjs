/**
 * Issue #5 acceptance: dark-matter gaps, empty stretch, pure stability.
 * Run: node --test tests/onion-spacing.test.mjs tests/compare-nodes.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ONION_SPACING,
  deltaR,
  thetaMin,
  gapBudget,
  universeWeight,
  allocateUniverses,
  layoutOnionTree,
  minRing1EmptyGap,
  fitCountOnRing,
} from '../src/model/onion-spacing.js';
import { sortChildren } from '../src/model/compare-nodes.js';
import { RadialOnionLens } from '../src/lenses/radial-onion.js';

function shuffle(arr, seed = 1) {
  let s = seed >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('ONION_SPACING constants', () => {
  it('Δr ≥ max(minGap, nodeRadius·2 + pad)', () => {
    const d = deltaR();
    assert.ok(d >= ONION_SPACING.minGap);
    assert.ok(d >= ONION_SPACING.nodeRadius * 2 + ONION_SPACING.pad);
  });

  it('θ_min respects floor and shrinks gently with radius', () => {
    const tSmall = thetaMin(0.1);
    const tLarge = thetaMin(2.0);
    assert.ok(tSmall >= ONION_SPACING.thetaFloor);
    assert.ok(tLarge >= ONION_SPACING.thetaFloor);
    assert.ok(tSmall >= tLarge - 1e-12);
  });

  it('universeWeight is max(1, directChildCount)', () => {
    assert.equal(universeWeight({ children: [] }), 1);
    assert.equal(universeWeight({}), 1);
    assert.equal(universeWeight({ children: [{}, {}, {}] }), 3);
  });
});

describe('gapBudget — dark matter clamp', () => {
  it('reserves m·G when under maxGapFraction', () => {
    const m = 4;
    const span = Math.PI * 2;
    const b = gapBudget(m, span);
    assert.ok(Math.abs(b.G - ONION_SPACING.G) < 1e-12);
    assert.ok(Math.abs(b.totalGaps - m * ONION_SPACING.G) < 1e-12);
    assert.ok(b.contentArc > 0);
    assert.ok(b.totalGaps <= span * ONION_SPACING.maxGapFraction + 1e-12);
  });

  it('scales G down when m·G would exceed maxGapFraction', () => {
    const m = 100;
    const span = Math.PI * 2;
    const b = gapBudget(m, span, { ...ONION_SPACING, G: Math.PI / 4 });
    assert.ok(b.totalGaps <= span * ONION_SPACING.maxGapFraction + 1e-9);
    assert.ok(b.G < Math.PI / 4);
  });
});

describe('allocateUniverses — empty stretch', () => {
  it('with ≥2 siblings, min empty gap ≥ G (after clamp)', () => {
    const kids = sortChildren([
      { id: 'a', name: 'a', type: 'directory', children: [{}, {}] },
      { id: 'b', name: 'b', type: 'directory', children: [{}] },
      { id: 'c', name: 'c', type: 'file', children: [] },
    ]);
    const span = Math.PI * 2;
    const r = ONION_SPACING.R0 + deltaR();
    const { placements, G } = allocateUniverses(kids, ONION_SPACING.thetaBias, span, r);
    assert.equal(placements.length, 3);
    assert.ok(G > 0);

    // Build pseudo-nodes for minRing1EmptyGap
    const nodes = placements.map((p) => ({
      ring: 1,
      angle: p.angle,
      sectorSpan: p.sectorSpan,
      gapAfter: G,
    }));
    const empty = minRing1EmptyGap(nodes);
    assert.ok(
      empty + 1e-9 >= G,
      `expected min empty ${empty} ≥ G ${G}`,
    );
  });

  it('larger free sector increases empty stretch, not jitter of order', () => {
    const kids = sortChildren([
      { id: 'a', name: 'a', type: 'file' },
      { id: 'b', name: 'b', type: 'file' },
    ]);
    const r = 0.4;
    const tight = allocateUniverses(kids, 0, Math.PI / 2, r);
    const wide = allocateUniverses(kids, 0, Math.PI * 2, r);
    assert.equal(tight.placements[0].node.id, wide.placements[0].node.id);
    assert.equal(tight.placements[1].node.id, wide.placements[1].node.id);
    // Wider sector ⇒ larger content arcs (more empty around hubs)
    const tightArc = tight.placements.reduce((s, p) => s + p.sectorSpan, 0);
    const wideArc = wide.placements.reduce((s, p) => s + p.sectorSpan, 0);
    assert.ok(wideArc > tightArc);
  });

  it('proportional weight: heavier subtree gets larger sector', () => {
    const kids = sortChildren([
      { id: 'light', name: 'light', type: 'directory', children: [] },
      {
        id: 'heavy',
        name: 'heavy',
        type: 'directory',
        children: [{}, {}, {}, {}, {}],
      },
    ]);
    const { placements } = allocateUniverses(
      kids,
      0,
      Math.PI * 2,
      0.4,
    );
    const light = placements.find((p) => p.node.id === 'light');
    const heavy = placements.find((p) => p.node.id === 'heavy');
    assert.ok(heavy.sectorSpan > light.sectorSpan);
  });
});

describe('layoutOnionTree — pure + multi-ring', () => {
  const tree = {
    id: 'root',
    name: 'root',
    type: 'repository',
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'directory',
        children: [
          { id: 'a.js', name: 'a.js', type: 'file', children: [] },
          { id: 'b.js', name: 'b.js', type: 'file', children: [] },
        ],
      },
      {
        id: 'docs',
        name: 'docs',
        type: 'directory',
        children: [{ id: 'r.md', name: 'readme', type: 'file', children: [] }],
      },
      { id: 'pkg', name: 'package.json', type: 'file', children: [] },
    ],
  };

  it('same snapshot + root ⇒ identical radii and angles', () => {
    const shuffled = {
      ...tree,
      children: shuffle(tree.children, 7).map((c) => ({
        ...c,
        children: shuffle(c.children || [], 11),
      })),
    };
    const a = layoutOnionTree(tree);
    const b = layoutOnionTree(shuffled);
    const pick = (nodes) =>
      nodes
        .map((n) => ({
          id: n.id,
          ring: n.ring,
          angle: n.angle,
          wx: n.wx,
          wy: n.wy,
        }))
        .sort((x, y) => (x.id < y.id ? -1 : 1));
    assert.deepEqual(pick(a), pick(b));
  });

  it('ring-1 empty wedges measurable ≥ G', () => {
    const nodes = layoutOnionTree(tree);
    const ring1 = nodes.filter((n) => n.ring === 1);
    assert.ok(ring1.length >= 2);
    const { G } = gapBudget(ring1.length, Math.PI * 2);
    const empty = minRing1EmptyGap(nodes);
    assert.ok(empty + 1e-9 >= G, `empty ${empty} G ${G}`);
  });

  it('children stay inside parent sector (no steal)', () => {
    const nodes = layoutOnionTree(tree);
    const src = nodes.find((n) => n.id === 'src');
    assert.ok(src);
    const nested = nodes.filter((n) => n.id === 'a.js' || n.id === 'b.js');
    assert.equal(nested.length, 2);
    for (const n of nested) {
      // angle within parent sector (normalize to parent start)
      let rel = n.angle - src.sectorStart;
      while (rel < 0) rel += Math.PI * 2;
      while (rel >= Math.PI * 2) rel -= Math.PI * 2;
      assert.ok(
        rel <= src.sectorSpan + 1e-9,
        `${n.id} rel ${rel} span ${src.sectorSpan}`,
      );
    }
  });

  it('N_max overflow goes to next rings (breadth), no left/right push', () => {
    const many = {
      id: 'root',
      name: 'root',
      type: 'directory',
      children: Array.from({ length: 30 }, (_, i) => ({
        id: `n${i}`,
        name: `n${String(i).padStart(2, '0')}`,
        type: 'file',
        children: [],
      })),
    };
    const cfg = { N_max: 10 };
    const nodes = layoutOnionTree(many, cfg);
    const byRing = new Map();
    for (const n of nodes) {
      if (n.ring === 0) continue;
      byRing.set(n.ring, (byRing.get(n.ring) || 0) + 1);
    }
    for (const [ring, count] of byRing) {
      assert.ok(count <= 10, `ring ${ring} has ${count} > N_max`);
    }
    const placed = [...byRing.values()].reduce((a, b) => a + b, 0);
    assert.equal(placed, 30);
    assert.ok(byRing.size >= 3, 'overflow should span multiple rings');
  });
});

describe('RadialOnionLens + dark matter', () => {
  it('layout uses allocator (stable under shuffle)', () => {
    const children = [
      { id: 'z', name: 'z', type: 'file', children: [] },
      { id: 'a', name: 'a', type: 'file', children: [] },
      { id: 'm', name: 'm', type: 'file', children: [] },
    ];
    const lens1 = new RadialOnionLens();
    lens1.setData({ id: 'r', name: 'r', type: 'directory', children });
    const lens2 = new RadialOnionLens();
    lens2.setData({
      id: 'r',
      name: 'r',
      type: 'directory',
      children: shuffle(children, 42),
    });
    const ids1 = lens1.nodes.filter((n) => n.ring === 1).map((n) => n.id);
    const ids2 = lens2.nodes.filter((n) => n.ring === 1).map((n) => n.id);
    assert.deepEqual(ids1, ids2);
    assert.deepEqual(ids1, ['a', 'm', 'z']);
  });
});

describe('fitCountOnRing', () => {
  it('never exceeds N_max', () => {
    const k = fitCountOnRing(100, Math.PI * 2, 0.5, { ...ONION_SPACING, N_max: 24 });
    assert.ok(k <= 24);
  });
});
