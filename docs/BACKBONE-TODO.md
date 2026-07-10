# AyTree — Backbone & Navigation TODO

Goal: get the **backbone** solid and **navigation perfect** on the primary tool
(`legacy/index_tree.html` — the tree + status + notes experience), with the canvas
lenses (`shell.html` + `src/`) kept as optional experiments. Plus: ship a **Windows
native UI**.

Legend:  `[ ]` todo · `[~]` partial/exists-but-weak · `[x]` done.
Priority:  **P0** backbone-blocking · **P1** navigation-perfect · **P2** polish/experiment.

---

## Phase 0 — Ground it (hygiene + one decision) — P0

- [ ] **Commit the 2026-07-09 pivot onto a fresh branch off `main`.** It's currently
  uncommitted on the stale `phase1-modules` branch (already merged via PR #2, now 1 behind
  `main`). New branch e.g. `phase2-primary-nav`; carry the working-tree changes over; PR.
- [ ] **Rename `legacy/` → `app/`.** The primary tool must not live under a path that reads
  as "deprecated." Update `server/aytree_server.py` (`serve_file_or_fallback` + `/legacy`
  route → keep `/legacy` as a redirect alias), README layout section, and any hrefs.
- [ ] **Archive `C:\dev\intuitree`** → `C:\dev\intuitree.archived` (rename was blocked by a
  file lock; retry once the holding editor/server is closed). Marker already dropped inside.
- [ ] **Confirm the shape decision:** served-web now, **pywebview native shell** next
  (see Phase 3). This choice drives the picker (browser FS Access vs native dialog).

## Phase 1 — Backbone: one model, one server, no dead ends — P0

**Server (`server/aytree_server.py`)**
- [~] `/api/tree` scan, `/api/notes`, `/api/extend`, branch enumeration — working.
- [ ] `GET /api/health` + `GET /api/version` (native shell + "server down" banner poll it).
- [ ] `SCAN_ROOT` configurable via CLI arg / env (not only "parent of repo"); add a
  single-repo mode vs sibling-scan mode flag.
- [ ] Migrate a pre-existing `.intuitree_notes.json` → `.aytree_notes.json` on first run.
- [ ] Debounced / atomic notes writes (temp-file + rename) to survive a crash mid-save.
- [ ] Graceful JSON errors on every endpoint (never a bare 500 stack to the client).

**Shared model (SSOT)**
- [ ] Make the tree tool and the lenses read **one** `RepoSnapshot` (`src/model/snapshot.js`).
  Today `index_tree.html` has its own `fetchTreeData` path (`~:615`) separate from the
  lens model — unify so selection/re-root/notes are shared state.
- [ ] **Implement `src/ingest/python-scan.js`** (currently a stub that throws): normalize the
  server `/api/tree` payload into `RepoSnapshot`. Unblocks the experimental shell against the
  server and lets both surfaces share ingest.
- [ ] Finish `snapshot.js` validators + `generated_at` staleness guard.
- [ ] Off-thread indexer (worker) for large repos — spec: `docs/specs/gui-worker-indexer.md`.

## Phase 2 — Navigation perfect (the heart) — P1

Target surface: the primary tree tool. Every node reachable by keyboard AND mouse; no dead
ends; state survives reload.

**Keyboard model (biggest gap — only `/`-to-search exists today at `index_tree.html:1329`)**
- [ ] Arrow **Up/Down** = move focus across visible rows (roving focus).
- [ ] Arrow **Right** = expand / step to first child; **Left** = collapse / step to parent.
- [ ] **Enter/Space** = open inspector (metadata + notes); **Esc** = close / clear search.
- [ ] **Home/End**, **PageUp/PageDown**, and **type-ahead** (jump to node by typing name).
- [ ] Roving `tabindex` (one tab-stop for the whole tree), visible focus ring.

**ARIA / screen-reader correctness**
- [ ] `role="tree"` / `treeitem` / `group`; `aria-expanded`, `aria-selected`, `aria-level`,
  `aria-setsize`/`aria-posinset`. (No ARIA tree roles exist today.)

**Search / filter**
- [ ] Incremental filter that keeps ancestors visible; highlight matches; result count.
- [ ] Jump-to-next/prev match (Enter / Shift+Enter or F3); clear on Esc.

**Re-rooting — AyTree's signature move (MISSING from the primary tool)**
- [ ] Click / keypress (`R`) to **re-root** the tree at any node; the rest re-maps around it.
  Logic exists only in the deferred `radial-onion` lens — bring the core into the tree tool.
  Spec: `docs/specs/radial-rerooting-spec.md`.
- [ ] **Breadcrumb** of the current root, always visible; click a crumb to re-root there.
- [ ] "Up to parent root" and "back to full root" controls.

**History & state (never a dead end)**
- [ ] Back/forward across root changes + selections (**Alt+Left / Alt+Right**).
- [ ] Persist expanded set + current root + selection (localStorage — rename the existing
  `intuitree_expanded` key → `aytree_expanded`).
- [ ] Encode root+selection in the URL hash so a view is restorable/shareable.
- [ ] Keep the focused/selected node scrolled into view on every navigation.

**States**
- [~] "Server unreachable" banner exists — extend to no-repo, permission-denied, empty-tree.

**Dyslexia-first ergonomics (cross-cutting — `docs/dyslexia-encoding.md`)**
- [ ] Lexend font, line-height 1.8, ragged-right, warm-paper ground, ~90% contrast.
- [ ] `.cr-high` high-contrast toggle wired to a visible control + persisted.
- [ ] Generous hit targets (`docs/specs/gui-hit-targets.md`); motion off by default.
- [ ] ≤16-char labels with LOD/truncation + full name on focus.

**Definition of "navigation perfect" (acceptance)**
- [ ] Every node reachable and operable with keyboard only, mouse only, and screen reader.
- [ ] Re-root + breadcrumb + back/forward form a closed loop — you can always get "home."
- [ ] Reload restores exactly where you were (root, expansion, selection, scroll).

## Phase 3 — Windows native UI — P1  (see the "How" note below)

- [ ] **Adopt `pywebview`** as the native shell: a Python window that hosts
  `app/index_tree.html` via WebView2 — no browser chrome.
- [ ] Native **folder picker** (`window.create_file_dialog(FOLDER_DIALOG)`) replacing the
  browser FS Access picker; hand the chosen path to the server / model.
- [ ] Native **menu bar** (File: Open repo / Recent · View: high-contrast, lenses · Help).
- [ ] App **icon** = the Branching A wordmark (`assets/aytree.ico`); window title + taskbar.
- [ ] Remember window bounds; single-instance; system-tray "keep running" (optional).
- [ ] **Package** with PyInstaller → single `AyTree.exe`; check/prompt for WebView2 runtime.
- [ ] Bundle the Python server as an in-process thread (no separate console window).

## Phase 4 — Polish & experiments — P2

- [ ] Finish deferred lenses behind `/experimental`: `dag-gitgraph`, `radial-onion`, and the
  `weave` overlay (translucent, opacity dial — NOT a base tab; `docs/ARCHITECTURE.md §2.5`).
- [ ] The weave "degenerate diagonal smear" fix (why `index.html` was culled) — fix or shelve.
- [ ] Split-view sandboxing + commit/omit gating (big; root `README.md` feature spec).
- [ ] Wordmark assets: `assets/favicon.svg` + `.ico` generated from the Branching A glyph.
- [ ] Tests: server endpoint unit tests + a keyboard-nav smoke test.

---

## How do I get Windows native UI?  (the specific question)

Your stack is **Python server + HTML/JS frontend**, and the ethos is offline-first /
lightweight (Pi Zero 2 appliance someday). Three routes, cheapest-first:

1. **PWA install — zero-effort interim (~15 min).** Add a `manifest.json` + icons; open the
   served app in Edge → **Install AyTree** → it becomes a windowed, icon'd taskbar app that
   runs offline. No native menus/dialogs, but instantly "app-like." Good stopgap.

2. **`pywebview` — the recommended native path.** Pure Python, renders through **Edge
   WebView2** (already on Windows 11), wraps `index_tree.html` in a **real native window**
   (no address bar), and gives you native **menus**, native **folder-picker dialogs**,
   system tray, and window state. You keep 100% of the existing HTML/JS; you can even drop
   the HTTP server and call Python directly over the JS↔Python bridge. One dependency;
   packages to a single `.exe` with PyInstaller. **This is the best fit** — it matches the
   Python backbone and stays light. (Phase 3 above is written against it.)

3. **Tauri — heaviest, most "truly native," appliance-ready.** Rust + system webview →
   tiny binaries, best for the eventual Pi Zero 2 appliance and a real installer. Cost: a
   Rust learning curve and re-homing the backend. Choose this only when packaging/size for
   the appliance matters more than staying in Python.

**Recommendation:** do **PWA install today** for an instant native-feeling window, then build
the **pywebview** shell as the real Windows app (Phase 3). Revisit Tauri only for the
appliance build.

*What to avoid:* Electron (bundles a whole Chromium — against the lightweight/offline ethos)
and a WinUI/WPF rewrite (throws away the working HTML tool for no real gain here).
