/**
 * Dirty-flag + single RAF slot, shared across the whole z-stack (one redraw pass paints
 * every lens). Ported from legacy/harvest/harvested_raw.js:823 scheduleDraw().
 */
export class RafScheduler {
  constructor(paintFn) {
    this.paintFn = paintFn;
    this.needsRedraw = true;
    this.rafId = null;
  }

  schedule() {
    this.needsRedraw = true;
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.needsRedraw) {
        this.needsRedraw = false;
        this.paintFn();
      }
    });
  }
}
