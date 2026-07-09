# gui-timeline-gitgraph

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-07 |
| Run | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 2 |
| Lane | **G-A** (compound + gitgraph) |
| Domain fence | Render + perf only — **no** copy, hotkeys, auth, export prose |
| Read model | `TimelineSnapshot` v1 — **never** parse `.git` or `gh` on render thread |
| Source spec | `.grok/skills/tangential-mermaid/references/tangential.mermaid.md` |
| Ingest fallback | `C:\Users\bardw\git\intuitree\index.html` L529–625 (`buildGraphLayout`, `drawGraph`) |

---

## Map

**Unit role:** Live **tangential DAG overlay** per pane — snapshot commits → lane gitGraph geometry with **conflict cues** from tangential-mermaid. Layer above `gui-timeline-compound`; separate canvas / draw list.

`TimelineSnapshot` → `buildGitgraphLayout()` → `graphNodes[]` → `drawGitgraph(ctx, rect)` (Canvas live; mermaid export sidecar).

| Tangential cue | Draw-list encoding |
|----------------|-------------------|
| Conflict source | `#fee2e2` fill, `#b91c1c` stroke, `lineWidth:4`, hex shape (+ `gui-dyslexia-encode`) |
| Tangent branch | Blue `#0ea5e9`, dashed `setLineDash([5,5])`, lane offset |
| Version tag | Green `#22c55e` ring + `tag` ≤7 chars |
| Profile | `@profile` on label LOD; lane position, not color-only |
| `versions` LOD | Collapse non-tag/non-merge; thin segments (`gui-lod-controller`) |
| `conflict_prominent` | Conflict nodes always full size + thick stroke |

**Layout:** intuitree lane allocator L529–560 — `wx` per branch, `wy = index/(n-1)`; label `tangent/<slug>-by-@profile` when `profile` set.

**Seams:** In `pane/{id}/gui/indexer/snapshot_ready`; invalidate `gui-raf-scheduler`; clip `gui-render-compositor`; out `commit_selected` (payload only).

**Failures:** PF-GUI-DAG-DRIFT, PF-GUI-SCRUB-JANK, PF-GUI-SEAM. **S4:** Canvas live + export · mermaid.js export-only · hybrid (Case G3).

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **Visual cue grammar** | tangential.mermaid.md §79–98 — SSOT colors/shapes |
| **gitGraph template L104–126** | Export mirrors live cues for prose accessibility |
| **`is_conflict_source` / `is_merge`** | Cue selection without merge re-parse |
| **`buildGraphLayout` lanes** | Proven DAG columns + hash jitter |
| **Edges-before-nodes** | Dashed tangent edges under nodes |
| **Separate `graphCtx`** | Toggle overlay; compound underneath |
| **Mermaid export hook** | `adj-audit-export` queue — not live render dep |

---

## Toss

| Asset | Owner |
|-------|-------|
| `gh api`, `fetchGitHistory`, runtime `render_on_demand_github_*` | indexer / tangential-mermaid async |
| Session mindmap / flowchart | abstract tangential views |
| `updateCurrentCommit` tree fetch | `gui-spatial-map` |
| Inspector, status, search, `hitGraph` | UI / `gui-hit-targets` |
| Hard-coded mermaid shapes | update tangential.mermaid.md first |
| Main-thread reflog parse | `gui-worker-indexer` |
| Compound `draw()` | `gui-timeline-compound` |

---

## Smoke test

| ID | Probe | Pass |
|----|-------|------|
| SF-GUI-GG-001 | `is_conflict_source` + `conflict_prominent` | Red + 4px stroke + shape @ 5120×1440 dpr=2 |
| SF-GUI-GG-002 | `versions` on 2k commits | ≤120 nodes; tag/merge/conflict kept |
| SF-GUI-GG-003 | Lane-shift edge | Dashed blue; not solid mainline |
| SF-GUI-GG-004 | Stale `generated_at` | Frame dropped |
| SF-GUI-GG-005 | Pick on pane A | B unchanged; `pane_id` on bus |
| SF-GUI-GG-006 | Export snapshot → mermaid | Cues match grammar §79–98 |
| SF-GUI-GG-007 | `scrub_t` highlight | Ring on correct `commits[].index` |

**Gate:** Overlay ≤8ms incremental @55fps dual-pane.

---

## Salience

| Weight | **0.90** |
|--------|----------|
| Justification | Tangential conflict/tangent **visual truth**; completes G-A with compound (0.94). Without live cues, Case G3 stays export-only. |
| Wave 2 pairing | Requires `gui-render-compositor` scissor — else PF-GUI-PANE-BLEED-PIXELS. |

*MAP-GUI-07 — gui-timeline-gitgraph — wave 2 — 2026-06-13*