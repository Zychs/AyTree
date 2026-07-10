/**
 * The compounding-river time-layer. NOT a base lens — a translucent z1 overlay rendered
 * above whichever base lens is active (docs/ARCHITECTURE.md §2.5). Draws in full canvas
 * space (independent of the base lens's pan/zoom), same as the source. Ported from
 * getTimelineCurvePoint + the compound draw() section
 * (legacy/harvest/harvested_raw.js:663-821) per docs/specs/gui-timeline-compound.md.
 */
import { hashStr } from '../model/hash.js';
import { matchesCommitNode } from '../compositor/filters.js';

const THEME_ACCENT = '#c2a334';
const THEME_ACCENT_STRONG = '#e0be3e';
const THEME_MUTED = '#a99f78';
const THEME_TEXT = '#f4edcf';

export class WeaveOverlay {
  constructor(opts = {}) {
    this.commits = [];
    this.currentSha = null;
    this.opacity = opts.opacity ?? 0.85; // non-distracting default, docs/renderer-contract.md
  }

  setData(snapshot) {
    this.commits = snapshot.commits || [];
    this.currentSha = snapshot.currentSha;
  }

  getTimelineCurvePoint(t, w, h) {
    const startX = 50;
    const endX = w - 50;
    const cx = startX + t * (endX - startX);
    const cy = h * 0.5;
    const waveCount = 1.5 + t * 4.0;
    const amp = Math.min(80, h * 0.18) * (0.6 + 0.4 * Math.sin(t * Math.PI));
    const y = cy + Math.sin(t * waveCount * Math.PI * 2) * amp;
    return { x: cx, y };
  }

  draw(ctx, { w, h, filter }) {
    if (!this.commits.length) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;

    const total = this.commits.length;
    // keep each commit's original recency (t) even when a filtered-out subset is hidden,
    // so remaining markers stay at their true position along the curve
    const visible = this.commits
      .map((c, i) => ({ c, t: i / (total - 1 || 1) }))
      .filter(({ c }) => !filter || matchesCommitNode(filter, c));
    const n = visible.length;

    ctx.strokeStyle = THEME_ACCENT;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = this.getTimelineCurvePoint(t, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(194,163,52,0.25)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = this.getTimelineCurvePoint(t, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    const isDense = n > 120;
    const labelEvery = Math.max(1, Math.floor(n / (isDense ? 12 : 6)));

    for (let i = 0; i < n; i++) {
      const { c, t } = visible[i];
      const mainP = this.getTimelineCurvePoint(t, w, h);
      const isCurrent = c.sha === this.currentSha;

      const chaos = (hashStr(c.sha) - 0.5) * (isDense ? 18 : 28);
      const perpX = -Math.sin(t * 5) * chaos * 0.6;
      const perpY = Math.cos(t * 5) * chaos * 0.6;
      const chaosX = mainP.x + perpX;
      const chaosY = mainP.y + perpY;

      // recency focus: newer commits (t -> 1) draw larger, older ones shrink toward the past
      const recencyR = (isCurrent ? 5.5 : 3) * (0.55 + 0.45 * t);
      ctx.fillStyle = isCurrent ? THEME_ACCENT_STRONG : THEME_MUTED;
      ctx.beginPath();
      ctx.arc(chaosX, chaosY, recencyR, 0, Math.PI * 2);
      ctx.fill();

      // weave stitch: quadratic pull from chaos position back to the main reason curve
      ctx.strokeStyle = isCurrent ? THEME_ACCENT_STRONG : 'rgba(224,190,62,0.6)';
      ctx.lineWidth = isCurrent ? 2.2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(chaosX, chaosY);
      const midX = (chaosX + mainP.x) * 0.5 + (mainP.y - chaosY) * 0.15;
      const midY = (chaosY + mainP.y) * 0.5 + (chaosX - mainP.x) * 0.15;
      ctx.quadraticCurveTo(midX, midY, mainP.x, mainP.y);
      ctx.stroke();

      // accumulating additions — presence/density only, count and radius grow with t, no size encoding
      const addCount = Math.max(1, Math.min(6, Math.floor(1 + t * 5)));
      for (let a = 0; a < addCount; a++) {
        const at = Math.min(1, Math.max(0, t + (a - addCount * 0.5) * 0.003));
        const ap = this.getTimelineCurvePoint(at, w, h);
        const off = (hashStr(c.sha + a) - 0.5) * (12 + t * 18);
        const ax = ap.x + Math.sin(a + i) * off * 0.7;
        const ay = ap.y + Math.cos(a + i) * off * 0.5;
        ctx.fillStyle = 'rgba(194,163,52,0.65)';
        ctx.beginPath();
        ctx.arc(ax, ay, 1.6 + t * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isCurrent || i % labelEvery === 0) {
        ctx.fillStyle = THEME_TEXT;
        ctx.font = (isCurrent ? '600 ' : '500 ') + '9.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const short = (c.messageShort || c.sha.slice(0, 7)).slice(0, 16);
        ctx.fillText(short, chaosX, chaosY - 10);
      }
    }

    const endP = this.getTimelineCurvePoint(1, w, h);
    ctx.fillStyle = THEME_ACCENT_STRONG;
    ctx.font = '10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('now — reason woven through the accumulated chaos', endP.x + 12, endP.y + 4);

    ctx.restore();
  }
}
