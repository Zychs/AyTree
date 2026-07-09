# gui-render-compositor

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-03 |
| Run | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 2 |
| Lane | **G-C** (compositor + RAF + scissor) |
| Domain fence | Viewport rects, z-order, clip, present — **no** draw bodies, copy, input policy |
| Fixture | Odyssey 49" — **5120×1440** CSS px dual-pane |
| Source | `intuitree/index.html` L174–184; deriveagentsfrom §1.3 G-C |
| Upstream | `gui-raf-scheduler` invokes; this unit owns **where** layers paint |

---

## Map

**Unit role:** **Dual scissor compositor** — host surface with per-`pane_id` clip rects, DPR scale, z-manifest. Pane A pixels never bleed into pane B on 49" ultrawide.

```text
shell layout (50/50 | 70/30 | solo) → PaneRect{a,b}
Host 5120×1440 → clip A | clip B → z0 compound → z1 spatial → z2 gitgraph
```

| Concern | Rule |
|---------|------|
| **PaneRect** | `{ pane_id, x, y, w, h, dpr }` from shell; refresh on preset change |
| **Scissor** | `save → clip(rect) → layers → restore` per pane |
| **DPR** | `clamp(dpr, 1, 2)`; backing `floor(w*dpr)`; draw CSS px via `setTransform` |
| **Z manifest** | `compound:0 → spatial:1 → gitgraph:2` — SSOT for RAF invoke |
| **Isolation** | No shared ctx state across panes without `save/restore` |
| **Present** | One host rAF OR blit Offscreen textures per pane |

**Bus:** In `shell/layout_changed` `{ preset, rects[] }`; out `pane/{id}/gui/viewport` `{ x,y,w,h,dpr }`.

**Failures:** PF-GUI-PANE-BLEED-PIXELS, PF-GUI-FPS, PF-GUI-SEAM. **S4:** dual OffscreenCanvas · single canvas scissor · WebGPU pass.

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **dpr clamp 1–2** | intuitree `resizeCanvas`; crisp 150–200% zoom |
| **`getBoundingClientRect` sizing** | Shell-embedded pane truth |
| **Per-pane clip stack** | Hard ultrawide bleed guard |
| **Z-order manifest** | RAF invoke order data-driven |
| **Layout rects** | 50/50, 70/30, solo — from shell tiles |
| **Viewport bus** | Spatial/gitgraph `fitView` use pane rect |
| **Scissor-only clear** | No full 5120×1440 fill when solo |

---

## Toss

| Asset | Owner |
|-------|-------|
| `draw()` / `drawGraph()` / `drawCompound` | viz modules |
| `scheduleDraw` / `rafId` | `gui-raf-scheduler` |
| Layout preset policy, hotkey hide | `ui-layout-presets`, `ui-focus-router` |
| `showDirectoryPicker` | `ui-pane-host` |
| Global `canvasEl`, unclipped full-window canvas | **Forbidden** |
| Theme glyphs | `gui-dyslexia-encode`; account chrome → `ui-account-rail` |

---

## Smoke test

| ID | Probe | Pass |
|----|-------|------|
| SF-GUI-CMPOS-001 | Red fill pane A only @ 5120×1440 dpr=2 | Zero red in B rect (±1px AA) |
| SF-GUI-CMPOS-002 | 50/50 → 70/30 mid-session | Rects ≤1 frame; no stale clip |
| SF-GUI-CMPOS-003 | Solo A | B skip draw; no full-surface clear |
| SF-GUI-CMPOS-004 | Zoom 200% | dpr clamp; rects match shell |
| SF-GUI-CMPOS-005 | Dual scrub 120s | Present ≤2ms p95; no bleed |
| SF-GUI-CMPOS-006 | Z-order gitgraph over compound | Hit order = manifest |
| SF-GUI-CMPOS-007 | `layout_changed` sans `pane_id` | Bus reject |

**Gate:** Pixel outside `PaneRect` → **FAIL** `PF-GUI-PANE-BLEED-PIXELS`.

---

## Salience

| Weight | **0.88** |
|--------|----------|
| Justification | **49" dual scissor** guarantees two-account side-by-side; G-A/G-B viz unsafe without clip SSOT. |
| Wave 2 pairing | Clips gitgraph + compound; RAF invokes, compositor clips (0.87). |

*MAP-GUI-03 — gui-render-compositor — wave 2 — 2026-06-13*