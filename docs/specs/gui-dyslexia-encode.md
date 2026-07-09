# MAP-GUI-09 — gui-dyslexia-encode

## gui-dyslexia-encode

**Map:** Shared **draw-list encoding layer** mapping snapshot semantics to redundant channels: **shape** (circle vs diamond vs merge hex), **stroke weight** (conflict thick), **lane position** (curve vs ribbon vs spatial field). Consumed by compound, gitgraph, and spatial modules — no label text authored here.

**Keep:**
- Every commit marker exposes ≥2 non-color channels before optional accent fill; conflict uses weight + shape, not red-only.
- `encodeCommit(c, granularity) → DrawGlyph` pure fn; theme tokens from `THEME` / `gui-lod-controller`, not UI copy.

**Smoke:** SF-GUI-DYS-001

**Salience:** 0.86