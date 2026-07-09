# MAP-GUI-08 — gui-hit-targets

## gui-hit-targets

**Map:** Pane-local **generous pick targets** for timeline commits and spatial nodes — inflated radii (intuitree `×1.6` motor slack) in world space, mapped through compositor DPI. Hit-test runs on main thread from latest `TimelineSnapshot` + layout cache; emits `commit_selected` on bus, never opens inspector copy.

**Keep:**
- Minimum target radius floor in CSS px (≥24px at 100% zoom) independent of LOD dot size.
- `hitTest(pane_id, sx, sy)` returns nearest commit/node within slack; misses do not steal focus from sibling pane.

**Smoke:** SF-GUI-HIT-001

**Salience:** 0.82