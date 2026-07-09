/**
 * Issue #6 acceptance: total order, shuffle-stable, pure angles, no left/right flips.
 * Run: node --test tests/compare-nodes.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareNodes,
  sortChildren,
  anglesForSortedCount,
  assignAnglesInOrder,
  nodeIdentity,
  isSameNode,
  TYPE_RANK,
} from '../src/model/compare-nodes.js';
import { RadialOnionLens } from '../src/lenses/radial-onion.js';

function shuffle(arr, seed = 1) {
  // Deterministic LCG shuffle for the test itself (not used by production code).
  let s = seed >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('compareNodes — total order', () => {
  it('returns 0 only for the same node (===)', () => {
    const a = { id: 'x', name: 'a', type: 'file' };
    assert.equal(compareNodes(a, a), 0);
    assert.equal(isSameNode(a, a), true);
  });

  it('returns 0 for distinct objects with the same strong identity', () => {
    const a = { id: 'same', name: 'foo', type: 'file' };
    const b = { id: 'same', name: 'foo', type: 'file' };
    assert.equal(compareNodes(a, b), 0);
    assert.equal(isSameNode(a, b), true);
  });

  it('never returns 0 for twin names with different ids', () => {
    const a = { id: '1', name: 'readme', type: 'file' };
    const b = { id: '2', name: 'readme', type: 'file' };
    const c = compareNodes(a, b);
    assert.notEqual(c, 0);
    assert.equal(Math.sign(c), -Math.sign(compareNodes(b, a)));
  });

  it('orders by typeRank before name', () => {
    const dir = { id: 'd', name: 'zzz', type: 'directory' };
    const file = { id: 'f', name: 'aaa', type: 'file' };
    assert.ok(compareNodes(dir, file) < 0);
    assert.ok(TYPE_RANK.directory < TYPE_RANK.file);
  });

  it('orders current/HEAD before plain status', () => {
    const head = { id: 'h', name: 'main', type: 'branch_local', is_current: true };
    const other = { id: 'o', name: 'main', type: 'branch_local', status: '' };
    // different ids — name same, status should put head first
    const head2 = { id: 'h2', name: 'feature', type: 'branch_local', is_current: true };
    const plain = { id: 'p', name: 'aaa', type: 'branch_local' };
    assert.ok(compareNodes(head2, plain) < 0);
    void head;
    void other;
  });

  it('uses numeric-aware name compare', () => {
    const a = { id: 'a', name: 'file2', type: 'file' };
    const b = { id: 'b', name: 'file10', type: 'file' };
    assert.ok(compareNodes(a, b) < 0);
  });
});

describe('sortChildren — shuffle stability', () => {
  const fixtures = [
    { id: 'r1', name: 'repo', type: 'repository' },
    { id: 'd1', name: 'src', type: 'directory' },
    { id: 'd2', name: 'docs', type: 'directory' },
    { id: 'f1', name: 'a.js', type: 'file' },
    { id: 'f2', name: 'b.js', type: 'file' },
    { id: 'f3', name: 'readme', type: 'file' },
    { id: 'f4', name: 'readme', type: 'file' }, // twin name
    { id: 'bl', name: 'main', type: 'branch_local', is_current: true },
    { id: 'br', name: 'origin/main', type: 'branch_remote' },
    { id: 'vn', name: 'todo', type: 'virtual_note', status: 'todo' },
  ];

  it('same output order for any input permutation', () => {
    const expected = sortChildren(fixtures).map(nodeIdentity);
    for (let seed = 1; seed <= 20; seed++) {
      const got = sortChildren(shuffle(fixtures, seed)).map(nodeIdentity);
      assert.deepEqual(got, expected, `seed ${seed}`);
    }
  });

  it('does not mutate the input array', () => {
    const copy = fixtures.slice();
    const before = copy.map((n) => n.id);
    sortChildren(copy);
    assert.deepEqual(copy.map((n) => n.id), before);
  });
});

describe('angles — pure function of sorted count + bias', () => {
  it('maps index to unique angles with fixed thetaBias only', () => {
    const a = anglesForSortedCount(4);
    const b = anglesForSortedCount(4);
    assert.deepEqual(a, b);
    assert.equal(a.length, 4);
    const set = new Set(a.map((x) => x.toFixed(12)));
    assert.equal(set.size, 4);
  });

  it('does not half-left / half-right — monotonic from bias', () => {
    const bias = -Math.PI / 2;
    const angles = anglesForSortedCount(5, { thetaBias: bias });
    assert.equal(angles[0], bias);
    for (let i = 1; i < angles.length; i++) {
      assert.ok(angles[i] > angles[i - 1]);
    }
  });

  it('assignAnglesInOrder is pure on sorted input', () => {
    const sorted = sortChildren([
      { id: '2', name: 'b', type: 'file' },
      { id: '1', name: 'a', type: 'file' },
    ]);
    // input already sorted: a then b
    const once = assignAnglesInOrder(sorted);
    const twice = assignAnglesInOrder(sorted);
    assert.deepEqual(
      once.map((n) => ({ id: n.id, i: n.layoutIndex, ang: n.angle })),
      twice.map((n) => ({ id: n.id, i: n.layoutIndex, ang: n.angle })),
    );
    assert.equal(once[0].id, '1');
    assert.equal(once[0].layoutIndex, 0);
    assert.equal(once[1].layoutIndex, 1);
  });
});

describe('RadialOnionLens uses sort for layout', () => {
  it('layout angles are a pure function of root + sorted children', () => {
    const tree = {
      id: 'root',
      name: 'root',
      type: 'directory',
      children: shuffle(
        [
          { id: 'c', name: 'c', type: 'file' },
          { id: 'a', name: 'a', type: 'file' },
          { id: 'b', name: 'b', type: 'file' },
        ],
        99,
      ),
    };

    const lens1 = new RadialOnionLens();
    lens1.setData(tree);
    const snap1 = lens1.nodes
      .filter((n) => n.ring === 1)
      .map((n) => ({ id: n.id, angle: n.angle, layoutIndex: n.layoutIndex }));

    const lens2 = new RadialOnionLens();
    lens2.setData({
      ...tree,
      children: shuffle(tree.children, 3),
    });
    const snap2 = lens2.nodes
      .filter((n) => n.ring === 1)
      .map((n) => ({ id: n.id, angle: n.angle, layoutIndex: n.layoutIndex }));

    assert.deepEqual(snap1, snap2);
    assert.deepEqual(
      snap1.map((n) => n.id),
      ['a', 'b', 'c'],
    );
  });

  it('exports compareNodes for legend / icon strips', () => {
    assert.equal(typeof compareNodes, 'function');
    assert.equal(typeof sortChildren, 'function');
  });
});
