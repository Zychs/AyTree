# gui-lod-controller

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-05 |
| Run ID | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 2 |
| Lane | **G-B** (spatial + LOD + indexer worker) |
| Source ingest | `C:\Users\bardw\git\intuitree\index.html` L841–904; README L75–76; `schemas/timeline-snapshot.v1.json` `granularity` |
| Domain fence | **NO label copy.** Policy module — emits LOD bitmask + caps; viz units apply, do not own mode UX. |

---

## Map

**Unit role:** Central **granularity governor** for all GUI draw lists. Maps user/UI mode → `TimelineSnapshot.granularity` + per-module **LOD profile** (`labelEvery`, density chaos, cull thresholds, conflict emphasis). Switch must complete &lt;16ms (deriveagentsfrom Case G1).

```text
ui bus / preset
      │ granularity: versions | full | conflict_prominent
      ▼
┌─────────────────────┐
│ gui-lod-controller   │
│  derive LodProfile   │
└──────────┬──────────┘
           │ bus: pane/{id}/gui/lod/profile_changed
     ┌─────┴─────┬─────────────┬──────────────┐
     ▼           ▼             ▼              ▼
compound     gitgraph    spatial-map    indexer (pass-through tag)
```

| Mode | Behavior | intuitree anchor |
|------|----------|------------------|
| `full` | All commits visible; `labelEvery = max(1, floor(n/6))` | L841–842 default |
| `versions` | Tag/profile commits only + merges; sparse labels `n/12` when dense | Dense branch compression |
| `conflict_prominent` | `is_conflict_source` nodes full detail; others culled | tangential gitGraph seam |

| LodProfile field | Source | Consumers |
|------------------|--------|-----------|
| `labelEvery` | L842 | `gui-timeline-compound`, `gui-timeline-gitgraph` |
| `isDense` (`n > 120`) | L841 | chaos offset L855, addCount cap L882 |
| `chaosScale` | L855 | perpendicular weave offset |
| `spatialCull` | README culling | `gui-spatial-map` max nodes drawn |
| `granularity` | schema L12 | indexer snapshot field (tag only, no silent drop) |

**Bus in:** `pane/{id}/ui/lod/mode_set`. **Bus out:** `pane/{id}/gui/lod/profile_changed` `{ profile, snapshot_version }`.

**Parent failures:** PF-GUI-SCRUB-JANK (LOD recompute on main thread each frame), PF-GUI-SEAM (draw without profile version).

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **`isDense` threshold** | `n > 120` — battle-tested intuitree breakpoint |
| **`labelEvery` formula** | `floor(n / (isDense ? 12 : 6))` — dyslexia-friendly sparse labels |
| **Always label current + search match** | L897 — never hide playhead or highlight |
| **Three schema modes** | `versions` \| `full` \| `conflict_prominent` — single seam enum |
| **Immutable profile per snapshot** | Profile version bumps on mode change; viz drops stale frames |
| **Pass-through to indexer** | Worker may pre-tag conflicts; controller does not parse `.git` |

---

## Toss

| Asset | Reason | Owner |
|-------|--------|-------|
| `setStatus` strings in `draw()` | Status copy L914–920 | UI status rail |
| Font strings / message `.slice(0,16)` | Label text | UI search + `gui-dyslexia-encode` tokens |
| Mode toggle DOM / legend | Interaction | `ui-help-legend` |
| Per-frame LOD recompute | Jank | Compute once on `profile_changed` or snapshot swap |
| Silent commit drop in indexer | Data loss | Indexer emits all; controller filters draw list only |
| `addCount` / weave draw | Render | `gui-timeline-compound` reads profile numbers |

---

## Smoke test

| ID | Probe | Pass |
|----|-------|------|
| SF-GUI-LOD-001 | 2k-commit fixture: toggle `full` → `versions` on pane B while pane A plays; profile swap ≤16ms; B label count drops ≥40% | No main-thread parse; `pane_id` isolated |

---

## Salience

| Unit | Weight | Role |
|------|--------|------|
| `gui-lod-controller` | **0.84** | Perf + dyslexia density gate; enables 10k-commit dual-pane; G-B policy hub |