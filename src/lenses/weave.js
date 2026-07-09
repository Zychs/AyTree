/**
 * Deferred (docs/ARCHITECTURE.md §4) — not implemented this pass.
 * NOT a base lens: a translucent z1 overlay composited above whichever base lens is active
 * (docs/ARCHITECTURE.md §2.5). Port targets: getTimelineCurvePoint, draw() compound section
 * (legacy/harvest/harvested_raw.js:663-821), per docs/specs/gui-timeline-compound.md.
 */
export class WeaveOverlay {
  draw() {
    throw new Error('weave overlay not implemented yet — see docs/ARCHITECTURE.md §4');
  }
}
