/**
 * AyTree Renderer Abstraction (thin, for experimenting with angles)
 *
 * All viz modes implement this (or a subset). Allows swapping spatial, DAG, timeline-weave,
 * radial, or hybrids without rewriting the app shell or data layer.
 *
 * CR-safe / dyslexia: renderers MUST use >=2 non-color channels (position/offset/lane,
 * stroke, size, shape). Keep text short. Respect theme tokens.
 */

export class VizRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.opts = opts;
    this.data = null;          // { nodes?: [], commits?: [], graphNodes?: [] , ... }
    this.view = { tx: 0, ty: 0, scale: 1 };
    this.needsRedraw = true;
  }

  // === Core contract ===
  setData(data) { this.data = data; this.needsRedraw = true; }
  layout() { /* compute wx/wy/wr etc. */ this.needsRedraw = true; }
  draw() { /* implement in subclass */ }
  hitTest(sx, sy) { return null; } // return node or null
  onEvent(type, ev) { /* optional */ }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.needsRedraw = true;
  }

  scheduleDraw() {
    if (!this.needsRedraw) return;
    this.needsRedraw = false;
    requestAnimationFrame(() => this.draw());
  }

  // Shared utils (move to core.js)
  hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }
}

/**
 * Example usage for mode switching (to be wired in shell):
 * const renderer = mode === 'weave' ? new TimelineWeaveRenderer(c) : new SpatialRenderer(c);
 * renderer.setData(ingested);
 * renderer.layout();
 * renderer.draw();
 */
