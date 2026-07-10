# AyTree — One-Click Launch Plan

> Derived 2026-07-10 from `docs/BACKBONE-TODO.md` Phase 0–3, live `server/aytree_server.py`,
> `VERSIONING.md` (checkout authority + offline-first), and GHM2 floor audit.
> Goal: **double-click → tree tool is up**, no console ritual.

---

## What “one-click” means here

| User action | Result |
|---|---|
| Double-click app / shortcut / `.bat` | Window opens on the **primary tool** (tree + status + notes) |
| No second terminal | Server is **in-process** (or hidden daemon), not a separate console the user must keep open |
| No browser chrome required | Prefer native shell; browser is fallback only |
| Offline-capable | Matches `VERSIONING.md` §2 — network never load-bearing |
| Reversible / local | No installer that phones home; package is local artifact |

**Primary surface today:** `legacy/index_tree.html` served by `python server/aytree_server.py` → `http://localhost:8000/` (and `/legacy`).  
**Not the default for launch:** `shell.html` / experimental lenses (still optional).

---

## Current state (floor, 2026-07-10)

| Piece | Status |
|---|---|
| `server/aytree_server.py` | **WIRED** — notes DB, `/api/tree`, git branches, static serve |
| Primary tree UI | **WIRED** under `legacy/index_tree.html` (path name is misleading; not deprecated) |
| Launch path | **Manual:** `cd` repo → `python server/aytree_server.py` → open browser |
| Health/version APIs | **Missing** — needed for “server down” banner + native shell boot |
| `pywebview` / PyInstaller | **Not installed** on authority machine yet |
| PWA manifest | **Missing** |
| Windows `.bat` / `.ps1` launcher | **Missing** |
| Checkout authority | `/home/justavision/aytree` (WSL) per `VERSIONING.md` + issue #23; `C:\dev\AyTree` is secondary |

**Repo currency (same day):** Phase A closed — PR #12 squash-merged, `npm test` **27/27** green on `main`.  
**Preserved WIP (not on main):** branch `wip/backbone-pivot-2026-07-09` on the Windows checkout holds map dual-view, lens ports, `python-scan` implementation, and this BACKBONE stack — re-base onto `main` before any product launch PR.

---

## Strategy (three rungs, cheapest first)

Same ladder as BACKBONE-TODO “How do I get Windows native UI?” — ordered by time-to-double-click:

```
Rung 0  Windows double-click launcher   (~30 min)   ← ship this week
Rung 1  PWA install from Edge           (~15 min)   ← interim “app-like”
Rung 2  pywebview + in-process server   (1–2 days)  ← real one-click product
Rung 3  PyInstaller → AyTree.exe        (1 day)     ← distribute / pin to taskbar
```

**Avoid:** Electron (Chromium bulk), full WinUI rewrite, Tauri until appliance/Pi size matters.

---

## Rung 0 — Double-click launcher (this week)

**Deliverable:** `AyTree.bat` (and optional `AyTree.ps1`) at repo root + Start Menu / Desktop shortcut.

### Behavior
1. Resolve repo root relative to the script.
2. Prefer `py` / `python3` / `python` on PATH (fail with a plain MessageBox-style `echo` if missing).
3. Start `python server/aytree_server.py` **minimized** or in a hidden window.
4. Open default browser to `http://localhost:8000/` after a short bind wait (poll `/` or, once Rung 2 prep lands, `GET /api/health`).
5. On second launch: detect busy port 8000–8019 (server already does port walk) and only open the browser.

### Files
| Path | Role |
|---|---|
| `AyTree.bat` | Zero-dep Windows entry (primary) |
| `scripts/launch-aytree.sh` | WSL/macOS equivalent |
| `docs/ONE-CLICK-LAUNCH.md` | this plan |

### Acceptance
- [ ] From Explorer, double-click → browser shows the tree tool within ~2s when Python is installed.
- [ ] Closing the browser does **not** kill the server (document tray/console stop: Ctrl+C or taskkill).
- [ ] Second double-click does not spawn a second bound server if port still held (or attaches cleanly).

### Gaps this rung does **not** solve
Still a browser window; still a Python process in the background; still requires Python on PATH.

---

## Rung 1 — PWA install (same day as Rung 0)

**Deliverable:** installable Edge/Chrome app icon, offline shell of static assets.

### Work
1. Add `manifest.webmanifest` (name **AyTree**, start_url `/`, display `standalone`, theme/background warm-paper per dyslexia docs).
2. Icons: generate `assets/favicon.svg` + PNG/ICO from Branching A wordmark (BACKBONE Phase 4).
3. Link manifest from primary HTML (`legacy/index_tree.html` and any future `app/`).
4. Optional service worker that caches `legacy/`, `src/`, and shell static files; **API routes stay network-first** (notes must hit the live server).

### Acceptance
- [ ] Edge → Install AyTree → taskbar icon opens chrome-less window on `/`.
- [ ] Server still required for notes/`/api/tree` (document that honestly).

---

## Rung 2 — Real one-click: `pywebview` shell (product)

**Deliverable:** `python -m aytree` or `python server/aytree_app.py` opens a **native window** (WebView2 on Windows 11) with the tree tool, server in-thread, no browser, no separate console.

### Architecture

```
┌─────────────────────────────────────────────┐
│  aytree_app.py (entry)                      │
│  ├─ thread: HTTPServer (localhost only)     │
│  │    same handlers as aytree_server.py     │
│  └─ main: webview.create_window(            │
│         url=http://127.0.0.1:{port}/,       │
│         title="AyTree",                     │
│         width/height remembered)            │
│     + native File→Open folder (optional)    │
└─────────────────────────────────────────────┘
```

### Prerequisites (do before or inside this rung)
From BACKBONE Phase 1 — small, unblock launch reliability:

| Item | Why for one-click |
|---|---|
| `GET /api/health` + `GET /api/version` | Window can show “starting…” / fail closed instead of blank WebView |
| `SCAN_ROOT` via CLI/env | User can open “this folder’s siblings” without editing source |
| Atomic notes writes | Crash mid-save must not corrupt `.aytree_notes.json` |
| Migrate `.intuitree_notes.json` → `.aytree_notes.json` | First-run safety for supersession |
| Rename `legacy/` → `app/` (+ `/legacy` redirect) | Primary path no longer reads as abandoned |
| Optional: `python-scan` client real (WIP branch has a start) | Shell/map surfaces share server tree |

### Native shell checklist (BACKBONE Phase 3)
- [ ] Depend on `pywebview` (WebView2 backend on Win).
- [ ] Bundle server as **daemon thread**; bind `127.0.0.1` only.
- [ ] Load primary URL (not `/experimental`).
- [ ] Native folder picker → hand path to server/model.
- [ ] Menu: File (Open / Recent), View (high-contrast), Help.
- [ ] Window title + taskbar icon (`assets/aytree.ico`).
- [ ] Remember bounds; single-instance mutex (second launch focuses first).
- [ ] On window close: stop server thread cleanly.

### Acceptance
- [ ] One command / one shortcut → native window with working tree + notes, **no browser, no second console**.
- [ ] Kill window → process exits (no orphan listener on 8000).
- [ ] Works offline (local FS + git only).

---

## Rung 3 — Package `AyTree.exe` (distribute)

**Deliverable:** single-folder or one-file PyInstaller build; optional Inno Setup later.

### Work
1. `requirements-app.txt`: `pywebview`, (build) `pyinstaller`.
2. Spec file: include `legacy/` or `app/`, `src/`, `assets/`, server package data.
3. On first run: check WebView2 Evergreen runtime; if missing, open Microsoft install URL once.
4. Output: `dist/AyTree/AyTree.exe` (prefer onedir over onefile for faster cold start).
5. Document “pin to taskbar” + “add to Start”.

### Acceptance
- [ ] Machine **without** a dev checkout: double-click `AyTree.exe` → same as Rung 2.
- [ ] Notes file writes next to exe or under `%APPDATA%\AyTree\` (decide before ship; prefer AppData for Program Files installs).

---

## Recommended build order (PR-sized)

| PR | Scope | Exit |
|---|---|---|
| **L0** | `AyTree.bat` + `scripts/launch-aytree.sh` + README “Run” one-liner | Double-click works on Windows with Python |
| **L1** | `manifest.webmanifest` + icons + link from primary HTML | Installable PWA |
| **L2a** | `/api/health`, `/api/version`, SCAN_ROOT CLI, atomic notes, intuitree notes migrate | Server ready for native shell |
| **L2b** | `legacy/` → `app/` rename + redirects + README | Path honesty |
| **L2c** | `server/aytree_app.py` + pywebview window | True one-click in-repo |
| **L3** | PyInstaller spec + short packaging doc | `AyTree.exe` artifact |

Parallel hygiene (not blocking L0):
- Rebase `wip/backbone-pivot-2026-07-09` onto `main` → land map/lenses via GHM2 Phase B+ only as separate PRs.
- Issue #23: keep **one** write checkout (`~/aytree`); mark or mirror `C:\dev\AyTree` read-only / archive after WIP is pushed or cherry-picked.
- Intuitree archive (rename, not delete) — Claude assessment todos; no hard-delete.

---

## Explicit non-goals for “one-click v1”

- Split-view sandbox / Apply|Discard (GHM2 Phases C–D) — product depth, not launch.
- Full keyboard-nav perfection (BACKBONE Phase 2) — can follow first windowed ship.
- Experimental lenses as default home.
- Auto-update channel / store listing.
- Deleting `Zychs/intuitree` or local intuitree history.

---

## Smoke test script (every rung)

```text
1. Fresh process: launch
2. Tree loads for SCAN_ROOT siblings (or self)
3. Expand a folder, set status, write a note → reload → note persists
4. Kill app / close window → port free (netstat / ss)
5. Relaunch → same notes
6. Unplug network → still works
```

---

## Decision locks (already made)

| Decision | Source |
|---|---|
| pywebview over Electron/Tauri for Windows native | BACKBONE-TODO |
| Primary = tree tool, not canvas shell | README layout (WIP pivot) + BACKBONE goal |
| WSL `~/aytree` is checkout authority | VERSIONING + issue #23 |
| Archive intuitree, never hard-delete for launch | Supersession assessment 2026-07-10 |
| Phase/PR discipline, squash to main | VERSIONING §5 |

---

## Immediate next action

**Implement Rung 0 (L0)** on a branch off current `main` — a `AyTree.bat` that starts the existing server and opens the browser. That is the shortest path from “repo clone” to “one click” without new dependencies. Rungs 1–3 layer on top without invalidating L0.
