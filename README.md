# AyTree

**The dyslexia-first repository map.** Version control for dyslexics.

The name is spoken "iTree" — "Ay" is the pirate's "Aye", the long-I sound. It's a
deliberate phonetic respelling that *enacts* the dyslexia-first thesis at the level of the
name itself, and routes around Apple's "i-" prefix and the existing i-Tree tool while staying
a coined mark. "intuitree" / "dyslexitree" persist only as internal lens/layer names.

---

## Repository layout

This repo is the consolidation of two lineages (merged 2026-07-08):

- **`index.html` + `src/`** — the go-forward modular shell (canvas viz, CR-safe / dyslexia
  theming, ES-module renderer abstraction, local-first via the File System Access API).
- **`src/viz/`** — pluggable renderers against the contract in `docs/renderer-contract.md`
  (weave, spatial, DAG, radial, hybrids). ≥2 non-color channels per marker, LOD labels.
- **`server/aytree_server.py`** — the working Python power layer (notes DB, git branch
  enumeration, `/api/tree` filesystem scan, safe folder/branch mutation). Run from the repo
  root: `python server/aytree_server.py` → http://localhost:8000/ (legacy monolith at `/legacy`).
- **`legacy/index_tree.html`** — the mature working monolith (ported from intuitree, branded).
  The reference implementation until its logic is ported into `src/viz/`.
- **`legacy/harvest/`** — Grok's original scrape of the intuitree source (working scratch).
- **`docs/`** — the unified design corpus (radial re-rooting, dyslexia encoding, GUI specs,
  swarm path tuner, renderer contract).

---

## Feature specification: AyTree Adaptive Visualizer

Module: aytree (Sesefus Suite – Version Control)

Feature Title: Adaptive Scope-Aware Radial Branch Visualizer with Split-View Sandboxing and Commit/Omit Gating

Purpose: Provide an intuitive, reliable visualization and exploration interface that supports safe, throw-away experimentation while preserving full user capabilities and maintaining workflow continuity.

### Core Components and Integration

**Enumeration and Scope Detection Engine**
Efficient directory enumeration, scope-signal detection (folder/file names, content patterns), dynamic scope model updates, and non-intrusive tagging (`.aytree-index` metadata with timestamps, content hashes, and extracted scopes). Incremental read-triggered rescans remain active.

**Interactive Radial Visualizer**
Radial ("starburst") layout with central root node and radiating branches. Click-to-re-root behavior with dynamic remapping, pruning, and expansion of accessible branches. Relate Mode (SSOT anchoring) and Habit / Staged Fork Mode (parallel change paths) fully supported. Scope overlays and color-coded derivation lanes.

**Split-View Sandboxing**
Easy Split Mechanism: the visualizer window supports a one-action split into two synchronized or independent views within the same window (side-by-side panes or tabbed split).
- Primary view: main workspace / current root and scope.
- Secondary view: sandboxed remote or experimental context.

Sandbox Abstraction: the secondary view operates as a lightweight, isolated sandbox (leveraging existing Sesefus constructs such as isolated worktrees, sidecar subagents, or constrained derivation lanes). This enables throw-away experiments (testing scope changes, branch re-rooting, or derivation hypotheses) without affecting the primary view or main repository state. Sandboxing is abstracted: users interact with it as a natural extension of the visualizer rather than a separate tool.

Gating and Persistence: the split window remains open and active until the sandbox explicitly returns a commit (merging validated changes back into the primary scope or a staged fork) or an omit (discarding the experimental changes cleanly). This gating ensures workflow continuity — no premature closure — while preventing resource leakage or unintended state pollution. User capabilities remain fully intact: the primary view continues normal operations (navigation, scope adjustments, indexing) during sandbox engagement.

**Unified Data and Persistence Model**
Index and tags are shared where appropriate but isolated for the sandbox pane. Integration with derivation-priority-guardian for safe sidecar execution during experiments. Compatibility with Git worktrees, INDEX junctions, SSOT hygiene, and archive relocation patterns.

### Benefits and Alignment with Sesefus Vision

- **Safety and Experimentation:** sandboxed views lower the risk of destructive changes, making advanced features approachable for entry-level users while enabling sophisticated derivation work.
- **Usability:** split-view in a single window reduces context-switching overhead and supports fluid comparison between main and experimental states.
- **Abstraction Without Loss:** sandboxing is transparent and reversible, preserving the full power of the underlying system.
- **Progressive Exposure:** natural usage introduces users to Sesefus concepts such as lane isolation, scoped derivations, and commit/omit hygiene.
- **Performance:** split views leverage targeted indexing and incremental updates, remaining responsive even in large repositories.
