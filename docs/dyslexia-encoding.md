# AyTree — Dyslexia-First Encoding (cross-cutting invariant)

This is the one rule every lens, the overlay, and the encoder obey. It is not a theme; it
is a **constraint on what carries meaning**.

## The rule

> **Encode every state in ≥2 non-color channels. Color is an optional accent, never the
> sole carrier.**

Three channels are always available:

| Channel | Range | Example |
|---------|-------|---------|
| **Shape** | circle · diamond · merge-hex · ring | merge = hex, conflict = diamond |
| **Weight** | stroke width, fill density | conflict source = thick stroke |
| **Position** | curve vs ribbon vs field vs onion ring; lane offset | tangent branch = lane offset |

A commit marker exposes ≥2 of these **before** any optional color fill. Conflict is
`weight + shape`, not red-only. Tangent is `position (lane) + dash`, not blue-only.

## No size/storage encoding

Presence + structure + time carry the signal. **Never** map file/repo byte-size to radius,
area, or thickness. Additions accumulate as presence/density (dot count, ribbon thickening
toward the present), not magnitude. This is an explicit, load-bearing rule — it keeps the
map honest about *what happened* rather than *how big the bytes are*.

## Reading-stress environment (shell + labels)

Folded from `specs/dyslexiui-design.md`:

- **Type:** Lexend (→ OpenDyslexic → system sans). Wide letterforms, open apertures.
- **Spacing:** line-height 1.8 · letter +0.04em · word +0.08em. Ragged-right, never justified.
- **Measure:** ~65ch for prose labels; short viz labels ≤16 chars at LOD.
- **Ground:** warm paper `#F5F2EB` / warm dark `#1C1A16` — never pure white/black (halation).
- **Contrast:** ~90%, not 100% (letter vibration).
- **Accent:** blue-green / teal family; avoid red+green pairing (colorblind co-occurrence).
- **Motion:** off by default; honor `prefers-reduced-motion`. No fade-in on appearing marks.
- **Focus:** shape/outline focus rings, never color-only.

## Where it lives in code

- `src/compositor/encode.js` — `encodeCommit(c, granularity) → DrawGlyph`; the single place
  that turns snapshot semantics into shape+weight+position. Owner spec:
  `specs/gui-dyslexia-encode.md`.
- Shell theme — CSS custom properties for type/spacing/ground/contrast, user-adjustable
  dials (font size, line height, letter spacing, measure) per `dyslexiui-design.md`.

## Acceptance check (every lens)

1. Desaturate the frame to greyscale → all state distinctions still legible? If not, the
   lens is color-dependent and fails.
2. No mark's size correlates with byte size.
3. Motion is absent unless the user opted in.
