# AyTree

**The dyslexia-first repository map.** Version control for dyslexics.

The name is spoken "iTree" — "Ay" is the pirate's "Aye", the long-I sound. It's a
deliberate phonetic respelling that *enacts* the dyslexia-first thesis at the level of the
name itself, and routes around Apple's "i-" prefix and the existing i-Tree tool while staying
a coined mark. "intuitree" / "dyslexitree" persist only as internal lens/layer names.

---

## Repository layout

This repo is the consolidation of two lineages (merged 2026-07-08), now on top of the
architecture in `docs/ARCHITECTURE.md`:

- **`index.html`** — the original single-file prototype (weave + spatial + DAG inset,
  inline script). Kept working as a reference until `shell.html` reaches parity.
- **`shell.html` + `src/`** — the go-forward modular shell, wired to the documented module
  layout: `src/model/` (RepoSnapshot SSOT), `src/compositor/` (viewport, RAF, hit-testing,
  dyslexia glyph encoding), `src/ingest/` (picker + local-git adapter; python-scan deferred),
  `src/lenses/` (pluggable renderers against `docs/renderer-contract.md`). Only the
  spatial-map lens is implemented so far — weave/DAG/radial are stubs, see
  `docs/ARCHITECTURE.md` §4.
- **`server/aytree_server.py`** — the working Python power layer (notes DB, git branch
  enumeration, `/api/tree` filesystem scan, safe folder/branch mutation). Run from the repo
  root: `python server/aytree_server.py` → http://localhost:8000/ (legacy monolith at `/legacy`).
- **`legacy/index_tree.html`** — the mature working monolith (ported from intuitree, branded).
  The reference implementation until its logic is ported into `src/lenses/`.
- **`legacy/harvest/`** — Grok's original scrape of the intuitree source (working scratch).
- **`docs/`** — the unified design corpus (architecture, catalog, harvest provenance, radial
  re-rooting, dyslexia encoding, GUI specs, swarm path tuner, renderer contract).

---

## Feature specification: AyTree Adaptive Visualizer

Module: aytree (Sesefus Suite – Version Control)

Feature Title: Adaptive Scope-Aware Radial Branch Visualizer with Split-View Sandboxing and Commit/Omit Gating

Purpose: Provide an intuitive, reliable visualization and exploration interface that supports safe, throw-away experimentation while preserving full user capabilities and maintaining workflow continuity.

### Core Components and Integration

**Enumeration and Scope Detection Engine**
Efficient directory enumeration, scope-signal detection (folder/file names, content patterns), dynamic scope model updates, and non-intrusive tagging (`.aytree-index` metadata with timestamps, content hashes, and extracted scopes). Incremental read-triggered rescans remain active.

**Interactive Radial Visualizer**
Radial ("starburst") layout with central root node and radiating branches. Click-to-re-root behavior with dynamic remapping, pruning, and expansion of accessible branches. **STUB** — Relate Mode (SSOT anchoring) and Habit / Staged Fork Mode (parallel change paths) are speced (`docs/specs/radial-rerooting-spec.md`) but not built; the design doc defers both past MVP. Scope overlays and color-coded derivation lanes belong to the same deferred spec, not shipped code.

**Split-View Sandboxing**
Easy Split Mechanism: the visualizer window supports a one-action split into two synchronized or independent views within the same window (side-by-side panes or tabbed split).
- Primary view: main workspace / current root and scope.
- Secondary view: sandboxed remote or experimental context.

Sandbox Abstraction: the secondary view is planned as a lightweight, isolated sandbox backed by real primitives — an in-memory `RepoSnapshot` fork today, git worktrees if adopted later (see `docs/VERSIONING.md` §4). This enables throw-away experiments (testing scope changes, branch re-rooting, or derivation hypotheses) without affecting the primary view or main repository state. Sandboxing is abstracted: users interact with it as a natural extension of the visualizer rather than a separate tool. **Status: doc-only, zero code** — see `docs/ghm2-development-plan.md` Phase C.

Gating and Persistence: the split window remains open and active until the sandbox explicitly returns a commit (merging validated changes back into the primary scope or a staged fork) or an omit (discarding the experimental changes cleanly). This gating ensures workflow continuity — no premature closure — while preventing resource leakage or unintended state pollution. User capabilities remain fully intact: the primary view continues normal operations (navigation, scope adjustments, indexing) during sandbox engagement.

**Unified Data and Persistence Model**
Index and tags are shared where appropriate but isolated for the sandbox pane. Compatibility target: Git worktrees and the suite's `drive-mapping.json` SSOT convention (`sesefus/docs/CANON.md` §6) for any archive relocation. (A generic "derivation-priority-guardian" service and "INDEX junctions," named in earlier drafts of this section, have no referent anywhere in the suite — dropped rather than left to imply a system that doesn't exist.)

### Benefits and Alignment with Sesefus Vision

- **Safety and Experimentation:** sandboxed views lower the risk of destructive changes, making advanced features approachable for entry-level users while enabling sophisticated derivation work.
- **Usability:** split-view in a single window reduces context-switching overhead and supports fluid comparison between main and experimental states.
- **Abstraction Without Loss:** sandboxing is transparent and reversible, preserving the full power of the underlying system.
- **Progressive Exposure:** natural usage introduces users to Sesefus concepts such as lane isolation, scoped derivations, and commit/omit hygiene.
- **Performance:** split views leverage targeted indexing and incremental updates, remaining responsive even in large repositories.
