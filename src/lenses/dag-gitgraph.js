/**
 * Deferred (docs/ARCHITECTURE.md §4) — not implemented this pass.
 * Port targets: buildGraphLayout, drawGraph, worldToScreenGraph/g2s, hitGraph
 * (legacy/harvest/harvested_raw.js:427-542), per docs/specs/gui-timeline-gitgraph.md.
 */
export class DagGitgraphLens {
  setData() {
    throw new Error('dag-gitgraph lens not implemented yet — see docs/ARCHITECTURE.md §4');
  }
}
