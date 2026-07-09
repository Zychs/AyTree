/**
 * Generous hit-test policy, shared by every lens (dyslexia: large, forgiving targets).
 * Pulled out of per-lens hitTest/hitGraph (legacy/harvest/harvested_raw.js:841/536) so hit
 * policy isn't duplicated per lens.
 */
export function hitTestNodes(nodes, wx, wy, { minMult = 1.6 } = {}) {
  let best = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const dist = Math.hypot(n.wx - wx, n.wy - wy);
    const r = (n.wr || 0.015) * minMult;
    if (dist < r && dist < bestDist) {
      bestDist = dist;
      best = n;
    }
  }
  return best;
}
