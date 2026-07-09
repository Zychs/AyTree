# gui-timeline-compound

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-01 |
| Run | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 1 |
| Lane | **G-A** (compound + gitgraph) |
| Domain fence | Render + perf only — **no** copy editing, hotkey policy, auth, pane focus |
| Read model | `TimelineSnapshot` v1 — render thread **never** parses `.git` |
| Source truth | `C:\Users\bardw\git\intuitree\index.html` L745–923, README.md L7–21 |

---

## Map

**Unit role:** Primary full-pane **compounding river** — the reliable "time machine" that shows how each commit **added** persistent visual layers until the present end reads as the compounded mess. One canvas layer per pane; consumes indexed snapshot only.

### Problem space

| Pressure | Signal |
|----------|--------|
| Interpretation uncertainty (dyslexia) | Multi-channel encoding: main reason curve + chaos offset markers + weave stitches + growing density cloud + short labels (≤16 chars LOD) |
| Decision latency on 49" dual pane | Independent draw path per `pane_id`; no shared canvas state; scrub via `scrub_t` without re-index |
| Local-only truth | Upstream `gui-worker-indexer` owns `.git/logs` parse; this unit is pure projection |
| Entire-window viz | Primary graphic owns viewport rect (scissor from `gui-render-compositor`); overlays are sibling modules |

### Data contract (input)

```text
TimelineSnapshot v1
  pane_id: "a" | "b"
  repo_path: string
  granularity?: versions | full | conflict_prominent
  commits[]: { sha, index, message_short, parents, is_merge?, is_conflict_source?, profile?, tag? }
  scrub_t?: 0..1
  generated_at: ISO-8601
```

**Projection rules:**

| Snapshot field | Render use |
|----------------|------------|
| `commits[].index` | Monotonic `t = index / (n-1)` along curve (oldest→newest) |
| `commits[].message_short` | Label LOD; search highlight delegated to UI bus, not parsed here |
| `commits[].is_merge` | Marker fill variant (purple-ish in intuitree) |
| `commits[].is_conflict_source` | Thicker stroke / accent ring when `granularity=conflict_prominent` |
| `scrub_t` | Playhead on main reason curve; current commit = nearest index at `t` |
| `generated_at` | Discard stale frames if bus sends newer snapshot version |

### Visual grammar (from intuitree `draw()`)

```text
t=0 (oldest) ──────────────────────────────────────► t=1 (present)
     │ main reason curve (thick accent stroke, waveCount scales with t)
     │ mess ribbon (fat semi-transparent band thickening toward present)
     │ per-commit chaos marker (hash-stable perpendicular offset from curve)
     │ weave stitch (quadratic curve: chaos → main reason pull)
     │ accumulation dots (count grows with t; radius grows with t)
     └ end label: "now — reason woven through the accumulated chaos"
```

**Core functions to port (pure render, no I/O):**

| Symbol | Source lines | Responsibility |
|--------|--------------|----------------|
| `getTimelineCurvePoint(t, w, h)` | L765–782 | Single scaled sine river; `waveCount = 1.5 + t*4` compresses dense recent history |
| `hashStr(s)` | L213–220 | Stable chaos offset per `sha` |
| `drawCompoundRiver(ctx, snapshot, viewport, theme)` | L784–923 | Full draw list: curve, ribbon, markers, weaves, additions, LOD labels |
| `scheduleDraw()` / RAF coalesce | L925–933 | Dirty flag; pairs with `gui-raf-scheduler` per pane |

### Module boundary

```text
┌─────────────────────────────────────────────────────────┐
│ gui-worker-indexer (G-B)                               │
│   FS / worker parse .git/logs → TimelineSnapshot       │
└───────────────────────────┬─────────────────────────────┘
                            │ bus: snapshot/{pane_id}
                            ▼
┌─────────────────────────────────────────────────────────┐
│ gui-timeline-compound (THIS UNIT)                        │
│   snapshot → draw list → Canvas2D (or WebGL path G-A-2) │
└───────────────────────────┬─────────────────────────────┘
                            │ z-layer under gitgraph overlay
                            ▼
┌─────────────────────────────────────────────────────────┐
│ gui-render-compositor (G-C)                              │
│   scissor rect, pane_id, DPI scale                       │
└─────────────────────────────────────────────────────────┘
```

### Adjacent units (not in this map impl)

| Unit | Relationship |
|------|--------------|
| `gui-timeline-gitgraph` | Tangential DAG overlay; shares `commits[]` but separate canvas |
| `gui-spatial-map` | File field at scrub commit; reacts to `commit_selected` bus |
| `gui-lod-controller` | Sets `granularity`; drives `labelEvery` and density caps |
| UI `ui-linear-export` | Plain-text escape — **not** implemented here |

### Parent failures this unit addresses

| ID | Symptom |
|----|---------|
| PF-GUI-SCRUB-JANK | Scrub redraw >16ms on 2k-commit fixture |
| PF-GUI-SEAM | Draw without checking snapshot `generated_at` |
| PF-GUI-DAG-DRIFT | (shared with gitgraph) index order ≠ visual `t` |

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **Compounding curve** | `getTimelineCurvePoint` — the "reason" thread; wave frequency increases with `t` for compression |
| **Weave stitches** | Quadratic chaos→main pull; encodes "reason weaving through chaos" without prose |
| **Accumulate mess** | Per-commit `addCount = floor(1 + t*5)` persistent dots; ribbon thickens toward present |
| **No size encoding** | Explicit intuitree rule: additions are presence/density only, never byte radii |
| **Hash-stable chaos offset** | `hashStr(sha)` perpendicular jitter — reproducible golden frames |
| **LOD labels** | `labelEvery` scales with density (`n>120` → fewer labels); current + search match always labeled |
| **THEME tokens** | Warm dark palette (`#0f0e0a`, `#c2a334`, `#e0be3e`) — feed `gui-dyslexia-encode` |
| **High-DPI transform** | `dpr` clamp 1–2; draw in CSS px space |
| **RAF coalescing** | `needsRedraw` + single `requestAnimationFrame` slot |
| **End-cap semantics** | Present marker text anchors narrative at `t=1` |
| **Search highlight hook** | Accept `highlight_shas: Set<string>` from UI bus (render-only tint); do not own search input |
| **Playhead at `scrub_t`** | Map bus scrub to nearest commit index + accent ring on main curve point |

---

## Toss

| Asset | Reason | Owner |
|-------|--------|-------|
| `fetchGitHistory()` GitHub API | Remote demo + rate limits; Odyssey is local `.git/logs` only | Delete on extract |
| `loadRepo()` / `updateCurrentCommit()` tree fetch | `api.github.com/git/trees` — violates local-only seam | `gui-worker-indexer` + `gui-spatial-map` |
| `showDirectoryPicker` / `loadLocalRepo` | FS parse belongs in worker, not render thread | `gui-worker-indexer` |
| `walkWorkingTreeForSpatial` | File spatial field | `gui-spatial-map` |
| `buildGraphLayout` / `drawGraph` / graph overlay | DAG tangents | `gui-timeline-gitgraph` |
| `makeDemoNodes` / `buildNodesFromTree` | Spatial distribution | `gui-spatial-map` |
| Inspector DOM, search input, help/legend copy | Wording + interaction | UI domain units |
| Hotkeys (`h`, `s`, `r`, `/`, `Esc`) | Policy + focus routing | `ui-focus-router` |
| `export list (plain)` / clipboard copy | Linear escape | `ui-linear-export` |
| `simulateCommit()` | Demo mutation — optional bus-driven preview later, not v1 extract | Defer |
| `replayHistory()` timer | Play mode orchestration | UI bus → `scrub_t` animation in `gui-raf-scheduler` |
| Header chrome / picker prompt HTML | One-repo picker UX | `ui-pane-host` |
| File size in inspector (`KB`) | Contradicts no-size rule for compound viz | UI inspector only if needed elsewhere |

---

## Smoke test

### S1 — Source fidelity (intuitree monolith)

| Step | Action | Pass |
|------|--------|------|
| ST-GUI-CMP-01 | `cd C:\Users\bardw\git\intuitree && python -m http.server 5173` | Server listens |
| ST-GUI-CMP-02 | Open page; pick one local repo under `C:\Users\bardw\git\` | Picker dismisses; canvas full window |
| ST-GUI-CMP-03 | Verify main accent curve + mess ribbon + weave stitches + growing dot cloud | Visual match legend L77–83 |
| ST-GUI-CMP-04 | Drag timeline (pan) + dense repo (`n>120`) | Labels thin; no frame stall >33ms subjective |
| ST-GUI-CMP-05 | Search highlights commit markers | Accent tint on match only |

### S2 — Snapshot seam (Odyssey target)

| Step | Action | Pass |
|------|--------|------|
| ST-GUI-CMP-06 | Load fixture `fixtures/timeline-snapshot-pane-a.json` (≥200 commits) | Renders without FS APIs |
| ST-GUI-CMP-07 | Set `scrub_t=0.5`; emit updated snapshot with `scrub_t=0.51` | Playhead moves; no re-parse |
| ST-GUI-CMP-08 | Send snapshot with newer `generated_at` while old frame in flight | Old frame discarded |
| ST-GUI-CMP-09 | Dual pane: scrub A while B `scrub_t` auto-advances 120s | A ≥55fps; B ≥55fps on Odyssey fixture |
| ST-GUI-CMP-10 | `granularity=conflict_prominent` + `is_conflict_source:true` | Thick border on conflict markers only |

### S3 — Golden frame

| Step | Action | Pass |
|------|--------|------|
| ST-GUI-CMP-11 | Render fixture at 5120×1440, dpr=2, `scrub_t=1` | PNG golden diff <2% outside anti-alias |

---

## Next commit

**Lane G-A — 3 extract strategies** (pick one in S4; all consume `TimelineSnapshot` only):

| Strategy | ID | Approach | Pros | Risks |
|----------|-----|----------|------|-------|
| **1 — ES module extract** | G-A-1 | Split `index.html` → `packages/gui/timeline-compound/` as `compoundRiver.ts` + thin `drawFrame(snapshot, ctx, rect)`; retain Canvas2D path verbatim | Lowest regression risk; fastest S4; golden matches intuitree | Main-thread draw cost at 10k commits |
| **2 — WebGL2 / regl river** | G-A-2 | Upload commit attributes as buffer; curve + instances in shader; CPU only builds buffers on snapshot change | Best headroom for dual-pane 49" + 10k commits | Visual parity drift on weave curves; higher S4 cost |
| **3 — Canvas2D retain + OffscreenCanvas** | G-A-3 | G-A-1 draw list unchanged; render to `OffscreenCanvas` in worker; compositor blits texture | Keeps proven aesthetics; moves paint off main thread | Snapshot→worker marshaling; hit-test stays on main via `gui-hit-targets` |

**Recommended S4 order:** G-A-1 (smoke parity) → G-A-3 if ST-GUI-CMP-09 fails → G-A-2 only if both miss 55fps.

**First commit scope (G-A-1):**

```text
packages/gui/timeline-compound/
  src/
    curve.ts          ← getTimelineCurvePoint
    hash.ts           ← hashStr
    drawCompound.ts   ← draw list from snapshot
    types.ts          ← TimelineSnapshot import from schemas/
    index.ts          ← export drawFrame
  fixtures/
    timeline-snapshot-pane-a.json
  smoke/
    render-fixture.html
```

---

## Inventory

| # | Item | Source | Disposition |
|---|------|--------|-------------|
| 1 | `getTimelineCurvePoint` | index.html L765–782 | **Extract** → `curve.ts` |
| 2 | `draw()` compound section | L784–923 | **Extract** → `drawCompound.ts` |
| 3 | `hashStr` | L213–220 | **Extract** → `hash.ts` |
| 4 | `THEME` / `CAT_COLOR` | L105–122 | **Tokenize** → shared `gui-theme` or props |
| 5 | `commits[]` state | L145 | **Replace** with `snapshot.commits` |
| 6 | `currentSha` / scrub | L147, L646 | **Replace** with `scrub_t` + index lookup |
| 7 | `scheduleDraw` / RAF | L925–933 | **Delegate** to `gui-raf-scheduler` |
| 8 | `resizeCanvas` / dpr | L174–184 | **Delegate** to compositor viewport |
| 9 | `fetchGitHistory` | L482–527 | **Toss** |
| 10 | `loadLocalRepo` / log parse | L330–424 | **Toss** → `gui-worker-indexer` |
| 11 | Graph DAG block | L471–670 | **Toss** → `gui-timeline-gitgraph` |
| 12 | Spatial nodes / hitTest | L212–279, L943–958 | **Toss** → `gui-spatial-map` + `gui-hit-targets` |
| 13 | Legend/help/status DOM | HTML L77–90 | **Toss** → UI |
| 14 | `TimelineSnapshot` schema | staging `schemas/timeline-snapshot.v1.json` | **Import** as SSOT |
| 15 | README compounding narrative | README L7–21 | **Reference** for golden acceptance wording |

---

## Salience

| Unit | Weight | Justification |
|------|--------|---------------|
| `gui-timeline-compound` | **0.94** | Core metaphor ("compounded mess"), primary pixel budget, intuitree ingest anchor, dual-pane scrub perf gate |

≥0.92 threshold met. Wave 1 pairing with `gui-worker-indexer` (0.90) is mandatory — compound render is useless without snapshot seam.

---

## Version role

| Role | Value |
|------|-------|
| Phase artifact | **S1 Map** — decomposition only; no package write until user gate + `vc-guardrails` |
| Stability | `draft-map-v1` — safe to revise after smoke registry ST-GUI-CMP-* |
| Promotion | Staging `T:\compose-staging\odyssey-component-derive-2026-06-13\map\gui\` until merge-orch; no `C:\Users\bardw\git\` promotion in wave 1 |
| Downstream | Feeds `ODYSSEY_GUI_ONTOLOGY.md` §gui-timeline-compound; lane G-A S4 impl tournament |
| Epoch | 0 — ingest map from monolith; epoch 1 after G-A-1 extract smoke PASS |

---

*MAP-GUI-01 — gui-timeline-compound — 2026-06-13*