import { createFilterState } from './filters.js';

/**
 * The layering mechanism: viewport rect, dpr clamp, per-pane view (camera is
 * compositor-owned, never a lens global), z-manifest {base, weave}, present(). Ported from
 * resizeCanvas/zoomAt/resetView/worldToScreen/screenToWorld
 * (legacy/harvest/harvested_raw.js:72/878/873/646/834).
 */
export class Compositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = 1;
    this.view = { tx: 0, ty: 0, scale: 1 };
    this.baseLens = null;
    this.weaveOverlay = null; // z1, translucent, optional — docs/ARCHITECTURE.md §2.5
    this.filterState = createFilterState(); // on-screen filter, shared across lenses
  }

  mount(baseLens) {
    this.baseLens = baseLens;
  }

  setWeaveOverlay(weaveOverlay) {
    this.weaveOverlay = weaveOverlay;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  worldToScreen(wx, wy) {
    return { x: wx * this.view.scale + this.view.tx, y: wy * this.view.scale + this.view.ty };
  }

  screenToWorld(sx, sy) {
    return { wx: (sx - this.view.tx) / this.view.scale, wy: (sy - this.view.ty) / this.view.scale };
  }

  zoomAt(clientX, clientY, factor) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const before = this.screenToWorld(cx, cy);
    // World coords are normalized 0..1, so fitView sets scale ≈ min(canvas w,h) — hundreds
    // to thousands of px. The zoom cap must sit well ABOVE screen dimensions, not ~1×; the
    // old [0.15, 42] range (from the pixel-space harvested prototype) snapped every zoom to
    // 42 on first use, collapsing the view and locking out zoom-in. See git blame.
    this.view.scale = Math.max(1, Math.min(100000, this.view.scale * factor));
    const after = this.screenToWorld(cx, cy);
    this.view.tx += (after.wx - before.wx) * this.view.scale;
    this.view.ty += (after.wy - before.wy) * this.view.scale;
  }

  pan(dx, dy) {
    this.view.tx += dx;
    this.view.ty += dy;
  }

  fitView(nodes) {
    if (this.baseLens && this.baseLens.fitView) {
      this.baseLens.fitView(this.view, nodes, this.canvas.getBoundingClientRect());
    }
  }

  hitTest(sx, sy) {
    if (!this.baseLens || !this.baseLens.hitTest) return null;
    return this.baseLens.hitTest(sx, sy, this.view, this.filterState);
  }

  present() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, w, h);
    const ctxArgs = { w, h, view: this.view, filter: this.filterState };
    if (this.baseLens) this.baseLens.draw(this.ctx, ctxArgs);
    if (this.weaveOverlay) this.weaveOverlay.draw(this.ctx, ctxArgs);
  }
}
