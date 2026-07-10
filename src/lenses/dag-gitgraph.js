/**
 * Laned DAG over commits — lane-per-branch, y = reverse-chrono. Ported from
 * buildGraphLayout/drawGraph/worldToScreenGraph/hitGraph
 * (legacy/harvest/harvested_raw.js:427-542) per docs/specs/gui-timeline-gitgraph.md, adapted
 * so the camera stays compositor-owned (see docs/renderer-contract.md).
 */
import { hashStr } from '../model/hash.js';
import { hitTestNodes } from '../compositor/hit-targets.js';
import { matchesCommitNode } from '../compositor/filters.js';

export class DagGitgraphLens {
  constructor() {
    this.nodes = [];
  }

  setData(snapshot) {
    const commits = snapshot.commits || [];
    const shaToNode = {};
    const laneAlloc = [];
    this.nodes = commits.map((c, idx) => {
      let lane = 0;
      if (c.parents.length > 0) {
        const pNode = shaToNode[c.parents[0]];
        if (pNode) lane = pNode.lane;
      }
      while (laneAlloc[lane] && laneAlloc[lane] > idx - 3) lane++;
      laneAlloc[lane] = idx;

      const t = idx / Math.max(1, commits.length - 1); // recency: 0 oldest, 1 newest
      const wx = 0.12 + lane * 0.18 + (hashStr(c.sha) - 0.5) * 0.03;
      const wy = 0.1 + t * 0.78;

      const node = {
        id: c.sha,
        sha: c.sha,
        name: c.messageShort || c.sha.slice(0, 7),
        path: c.sha,
        wx,
        wy,
        wr: 0.014,
        lane,
        parents: c.parents,
        isMerge: c.isMerge,
        isDir: false,
        t,
      };
      shaToNode[c.sha] = node;
      return node;
    });
    this.currentSha = snapshot.currentSha;
  }

  layout() {}

  fitView(view, nodes, rect) {
    const list = nodes && nodes.length ? nodes : this.nodes;
    if (!list.length) {
      view.tx = 0;
      view.ty = 0;
      view.scale = 1;
      return;
    }
    const availW = rect.width || 800;
    const availH = rect.height || 600;
    view.scale = Math.max(0.2, Math.min(18, Math.min(availW, availH) * 0.9));
    view.tx = availW * 0.1;
    view.ty = availH * 0.05;
  }

  draw(ctx, { view, filter }) {
    const byId = new Map(this.nodes.map((n) => [n.sha, n]));
    const s = (n) => ({ x: n.wx * view.scale + view.tx, y: n.wy * view.scale + view.ty });
    const visible = (n) => !filter || matchesCommitNode(filter, n);

    ctx.strokeStyle = 'rgba(224,190,62,0.35)';
    ctx.lineWidth = 1.4;
    for (const n of this.nodes) {
      if (!visible(n)) continue;
      for (const psha of n.parents) {
        const p = byId.get(psha);
        if (!p || !visible(p)) continue;
        const a = s(p);
        const b = s(n);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const n of this.nodes) {
      if (!visible(n)) continue;
      const p = s(n);
      const isCurrent = n.sha === this.currentSha;
      // recency focus: newer commits draw larger, older ones shrink toward the past
      const baseR = isCurrent ? 7 : n.isMerge ? 6 : 4.5;
      const r = baseR * (0.55 + 0.45 * n.t);
      ctx.beginPath();
      // shape channel: merge commits draw as a hex (diamond approximation), regular as circle
      if (n.isMerge) {
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r, p.y);
        ctx.closePath();
      } else {
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = isCurrent ? '#e0be3e' : n.isMerge ? '#a88bc4' : '#c2a334';
      ctx.fill();
      ctx.lineWidth = isCurrent ? 2.4 : 1;
      ctx.strokeStyle = isCurrent ? '#fff' : 'rgba(224,190,62,0.4)';
      ctx.stroke();

      ctx.fillStyle = '#f4edcf';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(n.sha.slice(0, 7), p.x + r + 4, p.y + 3);
    }
  }

  hitTest(sx, sy, view, filter) {
    const wx = (sx - view.tx) / view.scale;
    const wy = (sy - view.ty) / view.scale;
    const pool = filter ? this.nodes.filter((n) => matchesCommitNode(filter, n)) : this.nodes;
    return hitTestNodes(pool, wx, wy);
  }

  resize() {}
}
