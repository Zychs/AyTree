# Design Specification: Interactive Re-Rooting Radial Branch Visualizer for intuittree

**Project**  
intuittree – New feature branch: `feature/re-rooting-radial-visualizer`

**Version**  
0.1 (Draft)  
**Date**  
2026-06-15  
**Author**  
Grok (based on user sketch and prior visualization work)  
**Status**  
Draft for review and implementation planning

---

## 1. Executive Summary

This specification defines the design for a new interactive visualization mode in intuittree. The core innovation is **re-rooting**: any visible branch or node can be clicked to become the temporary root of the view. The visualizer then dynamically remaps and filters the displayed set to show only newly accessible branches.

The design directly implements the interaction model sketched by the user and integrates the radial starburst layout with the previously developed concentric (“onion-layer”) depth representation. The goal is fluid navigation of very large trees (17k–57k+ git objects or equivalent derivation/file structures) without requiring scrolling through the full graph.

This becomes the foundation for a new feature branch of intuittree, evolving the existing static/force-directed commit visualizer into a focus-oriented, re-rootable explorer.

---

## 2. Background & Context

- **Existing intuittree**: Client-side web application (`index.html` + canvas/SVG) capable of rendering large git object graphs. Current views include radial-ish node placements, commit/branch/tag legends, search, and basic HEAD visualization. It already handles high item counts but lacks dynamic re-orientation.
- **Prior work in this session**: 
  - Static radial + concentric onion-layer directory tree visualization (Python/Matplotlib).
  - Analysis of storage configuration, worktrees, archival mirroring, and subagent derivations.
- **User sketch (2026-06-15)**: Hand-drawn radial diagram with central “root”, radiating branches, explicit “Branch Becomes root” behavior, “Relate” mode to main base/SSOT, “habit / Staged Fork” with changes, and the directive “Visualizer maps to new accessible branches”.

The new feature branch will unify these threads into a cohesive, interactive experience.

---

## 3. Goals & Non-Goals

### Goals
- Enable rapid focus and exploration of large, branching structures via click-to-re-root.
- Maintain a single-screen overview (no scrolling required for core comprehension).
- Clearly distinguish conceptual layers/modes: main SSOT base, staged/habit forks with changes, and related branches.
- Preserve and extend the visual language of existing intuittree (dark theme, node styling, legend).
- Provide a foundation that can later support git worktree integration, derivation trees, and file-system views.

### Non-Goals (for v0.1)
- Full bidirectional git write operations (read-only visualization first).
- Persistent layout algorithms across sessions (client-side only initially).
- Mobile/responsive design (desktop-first, large canvas assumed).
- Advanced filtering beyond accessibility from current root.

---

## 4. Core Interaction Model

### Primary Flow (directly from user sketch)
1. User views a radial starburst diagram centered on the current root.
2. User clicks any branch (or node) radiating from the current root.
3. The clicked item **becomes the new root**.
4. The visualizer immediately:
   - Re-positions the new root at the center.
   - Redraws radiating branches for items now directly accessible from the new root.
   - Updates any secondary panels (e.g., “Relate” or “Staged Fork” indicators).
5. The user can repeat the process, successively focusing deeper or laterally.

### Supporting Modes & Concepts
- **Relate mode** (left side of sketch): A persistent or toggleable link back to the “main Base” that holds the Single Source of Truth (SSOT). Clicking “Relate” or the main-base indicator re-roots (or overlays) the view onto the authoritative baseline.
- **Staged Fork / habit mode** (right side): Visual treatment for branches/forks that carry uncommitted or staged changes. These may appear with distinct styling (e.g., dashed lines, highlighted endpoints, or a “changes” badge) and can be clicked to become root while preserving change context.
- **Dynamic accessibility mapping**: The visualizer is responsible for computing and rendering only the branches reachable/accessible from the current root. This is the key mechanism that keeps the view manageable regardless of total tree size.

---

## 5. Visual Design Specification

### Layout
- **Primary view**: Radial starburst (as sketched) combined with 2–3 distinct concentric circles (onion layers) to convey depth/hierarchy.
  - Innermost circle: Current root (prominent, larger radius or heavier stroke).
  - Mid layer(s): Immediate child branches.
  - Outer layer: Further accessible descendants or related nodes.
- Nodes: Open circles/ovals at branch endpoints (matching the sketch). Different node styles or colors for:
  - Current root
  - Main SSOT / base
  - Staged forks with changes
  - Regular commits / directories
- Connection lines: Clean radial spokes; optional subtle curvature or bundling for dense areas. Lines cross the concentric layer circles to reinforce the onion metaphor.
- Labels: Short, legible text for branch names, SHAs (truncated), or type indicators. On hover or selection, full details appear in a side panel or tooltip.
- Legend: Updated from existing intuittree to include new node types (SSOT base, staged fork, re-root target, etc.).

### Styling & Theme

> **Superseded (KD-16):** the warm-paper DyslexiUI palette (`docs/dyslexia-encoding.md`) is
> canonical for this lens, not the dark theme below. Radial-onion inherits the shape/weight/
> position glyph language from that spec; it does not inherit `#0d1117`. See
> `docs/dyslexistree-design-6c22687c.md:432`.

- ~~Dark professional theme consistent with terminal screenshots and prior visualizations (`#0d1117` background, high-contrast accents).~~ Superseded — see note above.
- Color coding:
  - Root / focus: Bright blue (`#58a6ff`)
  - Main SSOT / Relate: Warm gold/orange
  - Staged / habit forks with changes: Green or purple with dashed styling
  - Regular nodes: Neutral or category-specific
- Typography: Sans-serif, minimum 7–8 pt for labels, larger for root and key annotations. Ensure readability at dense zoom levels.
- No-scroll constraint: All critical information (current root, immediate branches, mode indicators, legend) must remain visible within the initial viewport. Optional zoom/pan for exploration of very dense sub-regions.

### Annotations & UI Elements
- Top: Current root label + “Click any branch to make it root” hint (subtle).
- Side panels (collapsible):
  - Left: “Relate to Main Base / SSOT” with quick re-root button.
  - Right: “Staged Fork / Habit” status and change summary.
- Bottom or floating: “Visualizer has mapped X accessible branches from current root.”
- Export / share: Button to export current focused view (plain list or image), building on existing intuittree “export list (plain)”.

---

## 6. Data Model & Behavioral Requirements

### Recommended Data Structures (client-side)
- `TreeNode` or equivalent object with:
  - `id` / SHA
  - `label` / name
  - `type` (commit, branch, tag, directory, staged-fork, etc.)
  - `children[]` or adjacency list for efficient traversal
  - `metadata` (hasChanges, isStaged, relatesToSSOT, etc.)
- Current state:
  - `currentRoot: Node`
  - `visibleNodes: Set<Node>` (computed on re-root)
  - `focusHistory: Stack<Node>` (for undo / breadcrumb navigation)

### Re-rooting Algorithm (high-level)
1. On click of node N:
   - Set `currentRoot = N`
   - Compute `visibleNodes = directOrRelevantChildrenOf(N)` (definition of “accessible” to be refined – e.g., direct children in git tree, reachable commits, or sub-directory contents)
   - Trigger layout recalculation (radial positioning around new center)
   - Update UI indicators for modes (Relate, Staged)
2. Performance target: Smooth animation (< 300 ms) even on 10k+ visible items by using efficient spatial indexing or incremental layout.

### Accessibility Mapping Rules (to be implemented & tuned)
- From a regular commit/branch: show direct children + any staged changes.
- From main SSOT base: show canonical structure.
- From a staged fork: prioritize nodes with pending changes; visually de-emphasize or hide unrelated branches.

---

## 7. Technical Architecture Recommendations

- **Frontend**: Retain and extend existing `intuitree/index.html` (HTML5 Canvas or SVG + vanilla JS or lightweight framework). Canvas preferred for performance with tens of thousands of nodes.
- **Layout engine**: Adapt or replace current force-directed logic with a hybrid radial + concentric positioning algorithm (inspired by the Python Matplotlib prototype already created). Support smooth animated transitions on re-root.
- **Data ingestion**: Continue using existing git parsing (or enhance with libgit2.wasm / isomorphic-git for richer metadata). Support both full-repo loads and worktree-specific views.
- **State management**: Simple client-side store (or lightweight observable pattern). Persist current root + history in URL hash or localStorage for shareable focused views.
- **Integration with broader system**:
  - Link to T:\Grok worktree / archival mirrors.
  - Expose hooks for the derive-agent-array / skill-governed mechanisms (e.g., surface derivation lanes as special “branches”).
  - Optional backend endpoint (Python/FastAPI or Zig) for heavy pre-computation of accessibility graphs on very large repos.

---

## 8. Open Questions & Risks

1. Precise definition of “accessible branches” from a given root (direct children only? All descendants? Git reachability? File-system containment?).
2. Handling of merge commits and multiple parents in the re-rooted view.
3. Performance scaling strategy when visible set still exceeds ~5–10k nodes after filtering.
4. Whether re-rooting should be purely visual or also mutate an underlying git worktree / HEAD (probably visual-only in v0.1).
5. Conflict resolution when a “Staged Fork” and “Relate to SSOT” overlap.
6. Keyboard / accessibility support for clicking branches (arrow navigation, enter to re-root).

These should be resolved in the first implementation sprint or documented as explicit assumptions.

---

## 9. Success Metrics (for the new feature branch)

- User can navigate from root to any leaf or interesting sub-structure in ≤ 5 clicks without scrolling.
- Visual overview remains comprehensible on trees with 50k+ total objects.
- Clear visual distinction between SSOT base, staged changes, and regular history.
- Smooth 60 fps interactions on mid-range hardware.
- Positive feedback on reduced cognitive load compared to traditional git log / graph tools.

---

## 10. Proposed Implementation Roadmap

**Phase 0 – Setup (1–2 days)**
- Create git branch `feature/re-rooting-radial-visualizer` from current intuittree main.
- Port key layout code from the Python radial/onion prototype into the web app (or keep as reference).
- Add basic click handler that logs the target and re-centers a static test node.

**Phase 1 – Core Re-rooting (3–5 days)**
- Implement dynamic radial layout recalculation on node click.
- Compute and render only “accessible” children from new root.
- Add smooth animated transition between root states.
- Update legend and side panels for current root + mode indicators.

**Phase 2 – Modes & Polish (2–4 days)**
- Implement “Relate to Main Base / SSOT” quick action.
- Add visual treatment and data model support for “Staged Fork / habit” nodes with changes.
- Refine concentric layer circles and node styling.
- Ensure no-scroll single-view constraint and legible typography.

**Phase 3 – Integration & Hardening (ongoing)**
- Connect to real git data sources and worktree metadata.
- Performance tuning and incremental layout.
- Export / share focused views.
- Documentation and examples tied to Arcadiumandcircadia storage configuration use cases.

---

## 11. References

- User handwritten sketch (2026-06-15) – primary source for interaction model.
- Prior radial + onion-layer visualization (`arcadiumandcircadia_full_tree_visualization.png`).
- Existing intuittree screenshots and `index.html` implementation.
- Broader context: storage configuration derivation, git worktrees, archival strategy, subagent lane system.

---

**Next Steps Recommendation**  
Review this specification, clarify any open questions (especially the exact semantics of “accessible branches”), then create the feature branch and begin Phase 0. I am ready to assist with code sketches, refined visual mockups (digital version of the sketch), or updates to this spec as implementation reveals new constraints.

This document is saved alongside the project artifacts and can be copied directly into the new branch’s `docs/` or `design/` folder.