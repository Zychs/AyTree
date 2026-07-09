# AyTree Renderer Contract

Thin abstraction so we can experiment with angles (weave, spatial, DAG, radial, hybrids) without big rewrites.

Superseded in shape by `docs/ARCHITECTURE.md` §2.4: the camera (`view {tx,ty,scale}`) is
compositor-owned, not per-lens, so `draw`/`hitTest` take `{view}` from the compositor rather
than each lens holding its own. See `src/lenses/spatial-map.js` for the reference
implementation of this adapted contract.

## Interface (adapted; see src/lenses/spatial-map.js)

```js
class Lens {
  setData(snapshot)          // RepoSnapshot -> internal nodes
  layout()                   // compute positions
  fitView(view, nodes, rect) // mutate compositor-owned view to frame nodes
  draw(ctx, { view })        // to ctx, using compositor-owned view
  hitTest(sx, sy, view)      // -> node or null
  resize()
}
```

## CR-safe Rules (mandatory)
- Every marker uses ≥2 non-color channels (lane/offset, stroke width, size, shape, position).
- Labels ≤16 chars, LOD.
- Respect high-contrast + warm-paper tokens.
- No motion by default or gated.

## Current Implementations
- Spatial presence (jittered clusters) — `src/lenses/spatial-map.js`, implemented
- Weave + accumulation, DAG lanes, radial — stubs only, deferred (`docs/ARCHITECTURE.md` §4);
  still live as a working prototype in `legacy/harvest/harvested_raw.js` / `legacy/index_tree.html`

## Adding a new angle (e.g. radial)
1. Implement the contract in src/lenses/radial-onion.js (stub already present)
2. Wire in main shell with a mode selector
3. Share core utils (src/model/hash.js, src/compositor/*)
4. Test with same RepoSnapshot data model

See src/lenses/ for examples.
