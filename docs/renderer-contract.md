# AyTree Renderer Contract

Thin abstraction so we can experiment with angles (weave, spatial, DAG, radial, hybrids) without big rewrites.

## Interface (see src/viz/renderer.js)

```js
class VizRenderer {
  constructor(canvas, opts)
  setData(data)          // {nodes, commits, ...}
  layout()               // compute positions
  draw()                 // to ctx
  hitTest(sx, sy)        // -> node or null
  onEvent(type, ev)      // optional
  resize()
}
```

## CR-safe Rules (mandatory)
- Every marker uses ≥2 non-color channels (lane/offset, stroke width, size, shape, position).
- Labels ≤16 chars, LOD.
- Respect high-contrast + warm-paper tokens.
- No motion by default or gated.

## Current Implementations (prototype)
- Weave + accumulation (main curve, stitches, chaos offsets, growing additions)
- Spatial presence (jittered clusters)
- Inset DAG lanes

## Adding a new angle (e.g. radial)
1. Subclass or implement the contract in src/viz/radial.js
2. Wire in main shell with a mode selector
3. Share core utils (hash, fit, curve helpers)
4. Test with same data model

See src/viz/ for examples.
