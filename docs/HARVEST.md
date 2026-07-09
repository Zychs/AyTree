# AyTree — Harvest Provenance

What each source contributed to the Phase 0 skeleton. Sources are **referenced in place**,
not moved (safety: no destructive ops). Specs were **copied** into `docs/specs/`.

---

## Promoted specs (copied → `docs/specs/`)

| In-repo | Origin | Contributes |
|---------|--------|-------------|
| `gui-timeline-compound.md` | `odyssey-cockpit/map/gui/` | `TimelineSnapshot v1` model + weave draw list (SSOT for the overlay) |
| `gui-timeline-gitgraph.md` | `odyssey-cockpit/map/gui/` | DAG lens: lane geometry + conflict/tangent cue grammar |
| `gui-spatial-map.md` | `odyssey-cockpit/map/gui/` | spatial lens: province clustering, fixed radii, scrub-sync |
| `gui-render-compositor.md` | `odyssey-cockpit/map/gui/` | **the layering mechanism** — scissor, dpr, z-manifest |
| `gui-worker-indexer.md` | `odyssey-cockpit/map/gui/` | off-thread `.git/logs` parse seam (ingest) |
| `gui-dyslexia-encode.md` | `odyssey-cockpit/map/gui/` | ≥2-channel glyph encoding (cross-cutting) |
| `gui-lod-controller.md` | `odyssey-cockpit/map/gui/` | granularity / label density (deferred wiring) |
| `gui-raf-scheduler.md` | `odyssey-cockpit/map/gui/` | RAF coalescing |
| `gui-hit-targets.md` | `odyssey-cockpit/map/gui/` | generous hit policy |
| `radial-rerooting-spec.md` | `Favorites/git/intuitree/` | radial lens: click-to-re-root + onion layers + Relate/Staged modes |
| `dyslexiui-design.md` | `~/git/dyslexiui_extracted/` | typography + reading-stress rationale (Lexend, spacing, warm paper) |

## Code harvested (referenced in place — see [CATALOG.md](CATALOG.md))

| Source | Path | Role |
|--------|------|------|
| Canvas build | `Favorites/git/intuitree/index.html` (51 KB) | **primary anchor** — spatial + DAG + weave monolith |
| Tree build | `<worktree>/index_tree.html` (42 KB) | DOM tree + Python-scan client; editing ops |
| Python server | `<worktree>/intuitree_server.py` (17 KB) | backend for the `python-scan` ingest adapter — **kept at root** |

## Reference-only (not yet folded in)

| Source | Path | Note |
|--------|------|------|
| Adaptive visualizer spec | `<worktree>/README.md` | split-view sandboxing + commit/omit gating + Relate/Habit modes — feeds a later phase |
| dyslexistree design | `<worktree>/docs/dyslexistree-design-6c22687c.md` | prior dyslexia-tree exploration |
| swarm path tuner | `<worktree>/docs/swarm-path-tuner.md` | prior tuner/governor exploration |
| grok dyslexia layer | `~/.grok/grok-build-dyslexia-layer.html` (49 KB) | cross-cutting dyslexia layer prototype — mine for encode.js |
| Odyssey GUI ontology | `odyssey-cockpit/map/gui/` (full set) | the source decomposition this skeleton adopts |

## Not harvested (tossed with reason)

| Item | Reason |
|------|--------|
| GitHub REST ingest (`fetchGitHistory`, `api.github.com/git/trees`) | remote + rate-limited; AyTree is local-truth only |
| byte-size node radii (`sqrt(size)`) | violates no-size-encoding rule |
| file-size in inspector (KB) | same rule |

---

*Cross-cutting invariant carried from every source: encode state in ≥2 non-color channels;
presence + structure + time carry the signal, never storage size.*
