# gui-raf-scheduler

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-06 |
| Run ID | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 2 |
| Lane | **G-C** (compositor + RAF + scissor) |
| Source ingest | `C:\Users\bardw\git\intuitree\index.html` L925–933, L991–1010, L1132; deriveagentsfrom §1.3 |
| Domain fence | **NO draw logic.** Per-pane frame loop + dirty coalesce + budget; modules register draw callbacks. |

---

## Map

**Unit role:** **Independent RAF loop per `pane_id`** — coalesces `needsRedraw` storms into one frame tick; invokes registered GUI layers in compositor z-order; enforces ≤8ms handoff budget for indexer `postMessage`. Zero shared `rafId` or canvas context across panes.

```text
pane A                          pane B
┌────────────────────┐          ┌────────────────────┐
│ raf-scheduler-a    │          │ raf-scheduler-b    │
│  dirtySet per mod  │          │  dirtySet per mod  │
│  rafId (nullable)  │          │  rafId (nullable)  │
└─────────┬──────────┘          └─────────┬──────────┘
          │ one rAF/tick                      │
          ▼                                   ▼
   compound → spatial → gitgraph        (same order, isolated ctx)
          │                                   │
          └───────────┬───────────────────────┘
                      ▼
            gui-render-compositor (scissor + present)
```

| Symbol | Source | Responsibility |
|--------|--------|----------------|
| `scheduleDraw()` | L925–933 | Set dirty; schedule single `requestAnimationFrame` if idle |
| `needsRedraw` | L926, L922 | Module-level dirty OR compositor dirty bit |
| `rafId` guard | L927–929 | Prevent RAF pile-up during drag/scrub |
| resize → schedule | L1132 | `resizeCanvas` then coalesced redraw |
| drag pan | L1003–1010 | High-frequency `scheduleDraw` — must coalesce to 60fps cap |

**Registration API:** `registerLayer(pane_id, module_id, z, drawFn, dirtyFn)`. **Bus in:** `pane/{id}/gui/invalidate` `{ modules[] }`, `pane/{id}/gui/play_tick` (scrub animation clock from UI). **Forbidden:** global `window.__raf`, shared `OffscreenCanvas` without pane key.

**Parent failures:** PF-GUI-PANE-BLEED-PIXELS, PF-GUI-FPS, PF-GUI-THREAD (indexer work inside RAF callback).

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **Dirty coalesce pattern** | intuitree `scheduleDraw` — O(1) scheduling under scrub drag |
| **Single slot `rafId`** | One pending frame per pane; cancels implicit pile-up |
| **Per-pane scheduler instance** | Odyssey dual scrub: A @60fps while B plays |
| **Layer invoke order** | Fixed z-stack delegated from `gui-render-compositor` manifest |
| **Play tick external** | `replayHistory` L679–692 timer → UI bus; scheduler only interpolates `scrub_t` |
| **Resize hook** | Coalesced redraw after DPR clamp — pairs compositor |
| **Frame budget telemetry** | Optional `frame_ms` bus for smoke registry |

---

## Toss

| Asset | Reason | Owner |
|-------|--------|-------|
| `draw()` / `drawGraph()` bodies | Pixel work | respective viz modules |
| `setInterval` replay | Play orchestration | UI bus + play state machine |
| `window.addEventListener('pointermove')` | Input routing | `ui-focus-router` + hit layer |
| Global `rafId` in monolith | Cross-pane bleed | Per-pane module scope |
| Inline `requestAnimationFrame` in viz | Duplicate loops | Modules call `invalidate` only |
| Status / inspector side effects in RAF | UI domain | Strip from tick |

---

## Smoke test

| ID | Probe | Pass |
|----|-------|------|
| SF-GUI-RAF-001 | Odyssey fixture: pane A scrub-drag 120s + pane B `play_tick`; A ≥55fps; B ≥55fps; neither pane reads the other's `rafId` or dirty set | `PerformanceObserver` longtask = 0 in RAF callback |

---

## Salience

| Unit | Weight | Role |
|------|--------|------|
| `gui-raf-scheduler` | **0.87** | Dual-pane perf gate; G-C spine with compositor; blocks PF-GUI-PANE-BLEED-PIXELS |