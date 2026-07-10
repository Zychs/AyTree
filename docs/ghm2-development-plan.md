# GHM2 Development Plan — AyTree authoring evolution

> Derived 2026-07-09 from `ghm2-frontier-research-array.md` (the ranked lanes) and
> a code-reality audit of the tree. Governed by `VERSIONING.md` (action grammar,
> status words, phase/PR discipline). GHM2 is a codename per the import verdict —
> nothing here creates a new product, brand, or repo.

## The floor this plan stands on (audited, not assumed)

| Capability | Status |
|---|---|
| Model (`snapshot`, `hash`, `compare-nodes`, `onion-spacing`) | WIRED |
| Compositor (`compositor`, `raf`, `hit-targets`, `encode`) | WIRED |
| Ingest (`local-git` reflog+FS walk, `picker`) | WIRED |
| `spatial-map` lens (the only lens `shell.html` imports) | WIRED |
| `radial-onion` lens (274L real layout math) | **STUB-listed but real — unwired** |
| `dag-gitgraph` lens, `weave` overlay, `python-scan` | STUB (throw on use) |
| Split-sandbox + commit/omit gate | **doc-only — zero code** |
| Server (`aytree_server.py`) | WIRED, optional power layer |
| Tests (27 assertions, all green) | WIRED, no runner config |

Active branch: `feat/radial-onion-draw-cull` (radial layout math in flight).

## Phases (1 phase = 1 concern = 1 squash PR)

### Phase A — Truth & law *(docs + one tiny config; no behavior change)*
Land `VERSIONING.md`; burn down its §8 doc-drift ledger (ARCHITECTURE stub line,
README status-word fixes, guardian/junction corrections, palette override note);
add minimal `package.json` with a `node --test` script.
**Exit:** status audit passes (VERSIONING §7.4); `npm test` runs the 27 assertions.

### Phase B — Radial lens lands *(finishes the in-flight lane)*
Complete draw-cull on the current branch, then wire `radial-onion.js` into
`shell.html` as the second base lens. **Blocker to resolve inside this phase:**
research lane 3 (accessible-branches semantics) — run the three-definition
fixture probe before wiring re-root, so the lens ships with a decided semantic
rather than an accident.
**Exit:** lens picker offers spatial|radial; re-root behaves per the decided
definition; 57k-object fixture stays interactive (lane 5 evidence).

### Phase C — Sandbox substrate spike *(research lane 1 — the trunk)*
Smallest real thing: an in-memory `RepoSnapshot` fork + a split pane + the
Apply|Discard gate where **Apply performs a pure view-merge and writes nothing to
disk**. This proves the substrate without touching git state. Resolve research
lane 2 (verb semantics) on paper first — the verb table in `VERSIONING.md` §3
either gains "promote" with a defined meaning or drops it.
**Exit:** VERSIONING §7.2 (clean omit) passes; a fork can be created, probed,
committed (view-merge), or omitted; the split cannot close ungated.

### Phase D — The commit path grows teeth
Apply targets a **staged fork** (the `metadata.isStaged` surface from the radial
spec) using the `preview → apply → rollback` pattern. Primary history remains
untouched — writes create staged state only. This is where the GMS2 "playtest
loop" becomes real: probe in the sandbox, land in a staged fork, primary stays
sovereign.
**Exit:** a sandbox experiment survives into a staged fork and is visible in the
radial lens with staged styling; rollback restores cleanly; VERSIONING §7.1
(unplugged) still passes end to end.

### Phase E — Remaining lenses *(parallelizable with C/D)*
Port the weave overlay and DAG lens from their `index.html` port sources
(`ARCHITECTURE.md:98-103` names the exact functions); wire the LOD controller.
Weave stays an overlay — never a fourth tab.
**Exit:** all three base lenses + weave overlay live in `shell.html`;
`index.html` demoted to reference-only.

### Phase F — Authoring boundary *(research lane 4 — branch thread)*
Decide whether "recipe = saved view state" (root + lens + scrub + overlays)
covers the GML-scripts analogue, or whether any executable authoring is wanted.
**Mandatory checkpoint:** re-evaluate the three import tripwires (runtime need /
explorer identity / covenant) before building anything here.
**Exit:** a written decision; if recipes proceed, they serialize to
localStorage/URL-hash per the radial spec's persistence sketch — local only.

## Sequencing logic

A first (cheap, kills drift the other phases would inherit) → B finishes what's
already moving → C is the trunk-check lane and unlocks D → E can run beside C/D →
F is deliberately last because it sits on the identity tripwires.

## Standing rules for every phase

- Verbs per `VERSIONING.md` §3; status words per §5; the §6 "never" list is law.
- All work in `/home/justavision/aytree` (WSL authority); push to
  `Zychs/AyTree`; never edit `C:\dev\aytree`.
- Every phase ends by re-running VERSIONING §7 verification.
- Governance: register *"GMS2 metaphor import into AyTree (codename GHM2)"* in
  the B-queue at Phase A, so the canon tracks the lane from the start.
