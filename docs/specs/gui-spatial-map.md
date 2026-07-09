# gui-spatial-map

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-04 |
| Run ID | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 2 |
| Lane | **G-B** (spatial + LOD + indexer worker) |
| Source ingest | `C:\Users\bardw\git\intuitree\index.html` L212–279, L428–469, L646–669, L943–958; README L62, L78–79, L87 |
| Domain fence | **NO UI copy.** File-field render + worker tree resolve. Never `fetch` GitHub trees on scrub. |

---

## Map

**Unit role:** Pane-local **file spatial field** — clustered organic distribution of paths at the **scrub commit's tree**. Consumes `TimelineSnapshot` + `commit_selected` / `scrub_t`; resolves tree blobs off-thread; draws presence markers (fixed radii, no byte sizing). Syncs when user scrubs timeline or clicks DAG node.

```text
TimelineSnapshot + scrub_t
        │
        ▼
┌───────────────────┐   worker: tree at sha   ┌────────────────────┐
│ gui-worker-indexer│──headSha / treeSha─────▶│ spatial-tree worker │
│ (head only seam)  │                         │ walk OR git tree obj │
└───────────────────┘                         └─────────┬──────────┘
                                                        │ FileNode[]
                                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│ gui-spatial-map (THIS)                                            │
│  buildNodesFromTree → buildNodesLayout → drawFileField + view    │
│  fitViewToNodes • worldToScreen • pan/zoom via bus (not hotkeys) │
└──────────────────────────────────────────────────────────────────┘
```

| Symbol | Source | Responsibility |
|--------|--------|----------------|
| `buildNodesFromTree(treeItems)` | L222–279 | Province grid + `hashStr` jitter → `{path, wx, wy, wr, cat, isDir}` |
| `buildNodesLayout()` | L447–469 | Local walk layout; **fixed** `wr` (no `sqrt(size)`) — Odyssey no-size rule |
| `walkWorkingTreeForSpatial` | L428–445 | FS walk depth≤8; **worker-only**; emits tree items for checkout-at-commit |
| `fitViewToNodes` | L186–209 | Auto frame clustered field |
| `hitTest` | L943–958 | Generous radius — **delegate policy** to `gui-hit-targets` |

**Bus in:** `pane/{id}/gui/scrub_t`, `pane/{id}/gui/commit_selected`, `snapshot_ready` (validate `pane_id`, `generated_at`). **Bus out:** `pane/{id}/gui/spatial/node_hovered` (path only, no DOM).

**Parent failures:** PF-GUI-MAIN-THREAD-BLOCK (walk on main), PF-GUI-SEAM (stale tree after scrub).

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **Province clustering** | Top-level dir → 3×3-ish grid; README "distribution respects folders, feels organic" |
| **`hashStr` jitter** | Deterministic layout; golden-frame stable across panes |
| **Fixed presence radii** | `buildNodesLayout` L467–468 — no storage encoding (aligns compound river rule) |
| **`catForExt`** | Shape/stroke variety for `gui-dyslexia-encode`; not color-only |
| **Scrub sync contract** | `updateCurrentCommit` intent L651–668 — tree swap + `fitViewToNodes` + dirty |
| **Per-pane `view` state** | `{tx, ty, scale}` isolated; no `window.__` shared camera |
| **Draw order** | Dirs first, then files — intuitree L276–277 |

---

## Toss

| Asset | Reason | Owner |
|-------|--------|-------|
| `fetch(github.com/.../trees)` | Remote tree on scrub L655–658 | Worker `git cat-file` / indexer tree slice |
| `makeDemoNodes` | Synthetic demo | Test fixture only |
| `sqrt(size)` radii in `buildNodesFromTree` | Size encoding | Use `buildNodesLayout` fixed radii path |
| `updateInspector` / KB meta | Copy + wall text | `ui-inspector` |
| `hitTest` pointer policy | Motor + focus | `gui-hit-targets` |
| `draw()` compound river | Timeline viz | `gui-timeline-compound` |
| `buildGraphLayout` / DAG nodes | Commit graph | `gui-timeline-gitgraph` |
| Hotkeys / picker | Interaction | UI domain |

---

## Smoke test

| ID | Probe | Pass |
|----|-------|------|
| SF-GUI-SPM-001 | Pane A scrubs commit `t=0.5`; spatial field updates within 1 RAF; `pane_id` matches; no GitHub fetch in network log | Tree node count >0; frame ≠ prior scrub |

---

## Salience

| Unit | Weight | Role |
|------|--------|------|
| `gui-spatial-map` | **0.86** | Secondary canvas layer; scrub-sync proof for "files at commit"; G-B worker adjacency |