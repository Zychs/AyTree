# AyTree — Architecture

*The dyslexia-first repository map. A **platform** that hosts many visualization
angles as swappable **lenses** over one shared data/model layer — not any single
prototype evolved forward.*

Status: **Phase 0 (Harvest) skeleton.** Modules below are stubs with ported-source
provenance, not implementations.

---

## 1. The decided shape

Three gate decisions (2026-07-08):

1. **Module home** — clean worktree. Harvest the good parts in; do not inherit any one
   prototype's structure.
2. **Priority** — all four modalities, but the **weave is a temporal *overlay*
   composited over whichever base lens is active** ("opaquely layered onto the other
   modalities, in a nondistracting way"), not a fourth peer tab.
3. **Ingest** — source **picker first**, then two adapters behind one model:
   local-first (`.git/logs` + FS Access API) **and** the Python recursive scan.

This resolves the thing that stalled convergence across ~8 explorations: the timeline
weave kept trying to *be a view* when it is really a **layer**.

```
                         ┌─────────────────────────────────────┐
   source picker ──▶     │        SHARED MODEL (SSOT)          │
   ├ local-git  ─┐       │  RepoSnapshot: commits[] · tree[]   │
   └ python-scan ┴──────▶│  · refs · scrub_t · generated_at    │
                         └──────────────────┬──────────────────┘
                                            │ (render thread never parses .git)
                                            ▼
                         ┌─────────────────────────────────────┐
                         │           COMPOSITOR (z-stack)       │
                         │  z0  BASE LENS  (one of:)            │
                         │        · spatial-map                 │
                         │        · dag-gitgraph                │
                         │        · radial-onion                │
                         │  z1  WEAVE OVERLAY (translucent)     │  ◀─ opacity dial
                         │  --  dyslexia-encode (shared glyphs) │
                         │  --  raf-scheduler · hit-targets     │
                         └─────────────────────────────────────┘
```

---

## 2. Layers

### 2.1 Shared model (`src/model/`) — SSOT
One normalized `RepoSnapshot` that every lens reads. The render thread **never** parses
`.git` or calls a network/FS API; it only projects a snapshot. Contract derives from
`TimelineSnapshot v1` (see [specs/gui-timeline-compound.md](specs/gui-timeline-compound.md)),
widened to also carry the file/tree field for the spatial lens and the adjacency needed
for radial re-rooting.

- `snapshot.js` — `RepoSnapshot` shape + validators (`generated_at` staleness guard).
- `hash.js` — `hashStr(s)` deterministic jitter. Shared by every lens for golden-frame
  stable, reproducible layout. Ported from `index.html:213`.

### 2.2 Ingest adapters (`src/ingest/`) — picker first
Two adapters normalize their source into `RepoSnapshot`. The **picker** chooses; nothing
downstream knows which adapter ran.

- `picker.js` — source selection UI + adapter dispatch.
- `local-git.js` — **local-first.** `.git/logs` reflog parse + File System Access API
  working-tree walk. Powers weave + spatial directly, no server. Ported/derived from
  `selectOneLocalRepo`, `loadLocalRepo`, `walkWorkingTreeForSpatial`
  (`index.html:305/330/428`). Off-thread per [specs/gui-worker-indexer.md](specs/gui-worker-indexer.md).
- `python-scan.js` — client for `intuitree_server.py` recursive filesystem scan (richer
  FS metadata; requires server). Derived from `fetchTreeData` (`index_tree.html:615`).

> The GitHub REST path (`fetchGitHistory`, `api.github.com/git/trees`) is **tossed** —
> Odyssey/AyTree is local truth only. Kept in [CATALOG.md](CATALOG.md) as provenance.

### 2.3 Compositor (`src/compositor/`) — the layering mechanism
The **z-manifest** stack is how the weave sits over a base lens. Straight out of
[specs/gui-render-compositor.md](specs/gui-render-compositor.md): per-pane scissor rect,
`dpr` clamp 1–2, draw in CSS px via `setTransform`, data-driven z-order.

- `compositor.js` — viewport rects, clip stack, z-manifest `{ base:0, weave:1 }`, present.
- `raf.js` — `needsRedraw` dirty flag + single RAF slot ([specs/gui-raf-scheduler.md](specs/gui-raf-scheduler.md)).
- `hit-targets.js` — generous hit policy, motor/focus separated from draw ([specs/gui-hit-targets.md](specs/gui-hit-targets.md)).
- `encode.js` — **dyslexia glyph encoder** (see §3). `encodeCommit(c, granularity) → DrawGlyph`.

### 2.4 Base lenses (`src/lenses/`) — swappable, mutually exclusive
Each renders the same snapshot into a base draw list. Exactly one is active at a time.

- `spatial-map.js` — clustered organic file field at the scrub commit's tree
  ([specs/gui-spatial-map.md](specs/gui-spatial-map.md)).
- `dag-gitgraph.js` — laned tangential DAG with conflict/tangent cues
  ([specs/gui-timeline-gitgraph.md](specs/gui-timeline-gitgraph.md)).
- `radial-onion.js` — re-rootable radial starburst + concentric onion layers
  ([specs/radial-rerooting-spec.md](specs/radial-rerooting-spec.md)).

### 2.5 Weave overlay (`src/lenses/weave.js`) — NOT a base lens
The compounding-river time-layer, rendered **translucently above** the active base lens
with an opacity dial (default non-distracting). Time is the axis; commits braid a "reason
curve" through accumulated "chaos." Ported from `getTimelineCurvePoint` +
compound section of `draw()` (`index.html:765/784`) — see
[specs/gui-timeline-compound.md](specs/gui-timeline-compound.md).

The overlay reads the same `scrub_t` as the base lens, so scrubbing moves the playhead
and re-resolves the base view (e.g. spatial field at that commit) in lockstep.

---

## 3. Cross-cutting rule — dyslexia-first encoding

**Encode state in ≥2 non-color channels — never color alone.** Channels: **shape**
(circle · diamond · merge-hex), **stroke weight** (conflict = thick), **position** (curve
vs ribbon vs spatial field vs onion ring). Color is an *optional accent on top*, never the
sole carrier. Conflict = weight + shape, not red-only.

**No size/storage encoding by default.** Additions are presence + density only, never byte
radii. Presence + structure + time carry the signal.

Typography/reading-stress rules (Lexend, line-height 1.8, ragged-right, warm-paper ground,
~90% contrast, motion off by default) live in
[specs/dyslexiui-design.md](specs/dyslexiui-design.md) and are folded into `encode.js` +
the shell theme. Full statement: [dyslexia-encoding.md](dyslexia-encoding.md).

Owner spec: [specs/gui-dyslexia-encode.md](specs/gui-dyslexia-encode.md).

---

## 4. What Phase 0 delivers vs. defers

**Delivered (skeleton):** directory shape, 11 promoted specs, the harvested-function
[CATALOG.md](CATALOG.md), provenance [HARVEST.md](HARVEST.md), module stubs with port
targets, this document.

**Deferred to later phases:** actual draw-list ports, the worker/off-thread indexer,
split-view sandboxing + commit/omit gating (see root `README.md`), LOD controller wiring,
editing/virtual-node operations (`index_tree.html`).
