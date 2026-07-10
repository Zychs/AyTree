# Frontier Research Array — GMS2 → GHM2 (AyTree authoring evolution)

First run of `/frontier-research-array`. Verdict on record (2026-07-09): **import** —
GHM2 is a codename for AyTree's authoring evolution, not a new product. Tripwire
status: **none tripped** (see Non-goals).

## Thesis

AyTree is already "version control for dyslexics" as a **map** — a real, booting
snapshot→compositor→lens pipeline. What the GMS2 frame contributes is the
**studio**: an authoring loop over derivations, where GameMaker's build/run/debug
becomes a sandboxed playtest gated by commit/omit. The study's core finding: the
map layer is shipped and honest, while the studio layer is spec-only and currently
rests on constructs that do not exist (`derivation-priority-guardian`, "INDEX
junctions" — no referent anywhere in the suite). The import succeeds exactly to the
extent the studio is rebuilt on real primitives — in-memory `RepoSnapshot` forks,
git worktrees, the Apply|Discard gate — rather than on the metaphor's fictions.

## Concept map

Source-side (GMS2) claims are `memory-derived` throughout — no GMS2 corpus exists
in this workspace. Target-side claims are `cited`. Confidence scores the mapping.

| GMS2 (memory-derived) | AyTree target (cited) | Carry | Conf |
|---|---|---|---|
| Project / resource tree | `RepoSnapshot` SSOT + branch/worktree browsing — `src/model/snapshot.js:8-18` | carries cleanly | high |
| Sprites / objects | Glyph kinds via `encodeCommit` — `src/compositor/encode.js`, `ARCHITECTURE.md:86` | carries cleanly | high |
| IDE workspace layout | DyslexiUI shell — `dyslexia-encoding.md:33-40`; warm-paper palette is canonical per KD-16 (`dyslexistree-design-6c22687c.md:432`), overriding the dark palette in `radial-rerooting-spec.md:96-99` | carries cleanly | high |
| Rooms / room editor | Lenses over one snapshot — `ARCHITECTURE.md:88-96` | carries with friction | med-high |
| Object events | Git lifecycle cues (commit/merge/conflict) — `specs/gui-timeline-gitgraph.md` | carries with friction | med |
| Build / run / debug | Sandbox playtest + **commit/omit** gate — `README.md:59`, `dyslexistree-design-6c22687c.md:443-445` | carries with friction | med |
| Instances | Worktrees / derivation lanes / sandboxes — `README.md:57,62` | greenfield (target constructs partly fictional) | low |
| Event-driven game loop | RAF compositor + `scrub_t` playhead — `ARCHITECTURE.md:19-26` | **breaks** (resolved: weave is an overlay, never a view) | high |
| GML scripts | Skills / recipes | no analogue — greenfield | low |

## Implication study

**Rooms → lenses.** Forcing "you edit a room" onto a lens invents mutation inside a
projection. The invariant blocks it: the render thread never parses `.git` or
mutates — it only projects a snapshot (`ARCHITECTURE.md:52-57`). Redesign: all
authoring lives in the sandbox pane; lenses stay read-only projections.

**Events → git lifecycle.** GMS events are *authored handlers*; git events are
*recorded facts*. Forcing the metaphor implies history is editable from the map.
The legitimate authored surface is the staged fork (`metadata.hasChanges/isStaged`,
`radial-rerooting-spec.md:117-119`), not history itself.

**Game loop → RAF + scrub.** Already broken and already resolved: ~8 explorations
stalled because "the timeline weave kept trying to *be a view* when it is really a
**layer**" (`ARCHITECTURE.md:25-26`). The import must not resurrect time-as-a-tab.

**Instances → lanes.** The README's sandbox abstraction cites Sesefus constructs
that don't exist: `derivation-priority-guardian` appears nowhere in sesefus,
"INDEX junctions" has no referent, and suite worktrees are "future/optional"
(`sesefus/docs/PRODUCTION.md:43`). What is real: the Apply|Discard gate spec
(`dyslexistree-design:443-447` — sandbox state in-memory until explicit Apply),
git worktrees as a native git feature, and the `preview → apply → rollback`
pattern (`dyslexistree-design:940-950`). Lanes must be defined on those.

**Build/run/debug → commit/omit.** The gate exists as spec with **zero code**
(no reference in `src/`; the spec even names `assets/split-sandbox.js`, which does
not exist). And the corpus has **no "promote" verb** — the gate is strictly binary
Apply|Discard. The import coined "probe/promote/omit"; "promote" therefore needs a
defined semantic (commit-into-staged-fork vs merge-to-primary are different acts)
before any code uses the word.

**Scripts → recipes.** Nothing in AyTree executes user-authored behavior. Under
the covenant (suite module per `README.md:38` — the user path is zero-cloud),
any future "recipe" must run local. Candidate that preserves the explorer
identity: a recipe = a *saved view state* (root + lens + scrub + overlays),
not code.

## Research array (ranked)

**[5/5] 1 — Sandbox substrate.** *What real primitive backs a derivation lane:
in-memory snapshot fork, git worktree, or a layered both?* — Frontier: the whole
studio layer rests on it and the named constructs are fictional. Answered, it
unlocks the split-view build (PR-7/8 analog) and defines what commit/omit actually
write. Probe: spike an in-memory `RepoSnapshot` fork + a split pane whose Apply
performs a pure view-merge (writes nothing to disk). **Move: pursue now** — gates
lanes 2 and 3.

**[4/5] 2 — Verb semantics.** *Is "promote" = Apply-into-staged-fork, distinct
from commit-to-primary — or redundant and droppable?* — Frontier: the corpus is
binary Apply|Discard; the import coined the third verb. Answered, it fixes the
action grammar in `VERSIONING.md` (drafted there as provisional). Probe: a paper
probe — write the verb table and check it against PR-7/PR-8 acceptance criteria
(`dyslexistree-design:747-749, 935`). **Move: pursue now.**

**[4/5] 3 — Accessible-branches semantics.** *On re-root, what is shown: direct
children, git reachability, or FS containment?* — Frontier: the radial spec's own
open question #1 (`radial-rerooting-spec.md:155`), newly urgent because
`radial-onion.js` is now 274 lines of real layout code awaiting wiring. Answered,
it unlocks wiring the radial lens into `shell.html` honestly. Probe: one fixture
repo, three candidate definitions rendered side by side. **Move: pursue now.**

**[3/5] 4 — Authoring boundary.** *Does AyTree ever execute user-authored
behavior, or does "recipe = saved view state" cover the need?* — Frontier:
genuine greenfield, and it sits on identity-tripwire territory. Answered, it
bounds how far the import goes. Probe: write the non-goal candidate plus one
counter-sketch. **Move: branch thread** — re-evaluate the three tripwires there.

**[2/5] 5 — Scale under the radial lens.** *Does draw-cull hold 17k–57k+ objects
at 60fps?* — Mostly closed: this is the in-flight branch
(`feat/radial-onion-draw-cull`). Probe: 57k synthetic-node fixture. **Move: park**
— the active work covers it.

## Non-goals

- Not a GameMaker clone, runtime, or source fork — conceptual translation only.
- No GML-equivalent scripting in any near phase (lane 4 decides the boundary).
- No GitHub as source of truth — the REST path stays tossed (`HARVEST.md:46`).
- No history rewriting from the UI; writes pass only through the gate.
- No size/storage encoding, ever (`dyslexia-encoding.md`).
- No pretending Relate/Staged-Fork are "fully supported" (`README.md:50`) — the
  design doc defers them (`dyslexistree-design:433,749,955`); status words only.

**Tripwire check:** (1) no runtime AyTree can't host — browser + optional local
server suffice; (2) explorer identity holds — authoring resolves into the sandbox
pane and saved-view recipes, pending lane 4; (3) no covenant conflict — local
truth is already law here. **Import verdict stands.**

## Trunk check

**Lane 1 — the sandbox substrate spike.** It gates the verb grammar and the whole
studio layer; everything else in the import is commentary until a fork exists that
Apply can merge and Discard can drop. Governance: register *"GMS2 metaphor import
into AyTree (codename GHM2)"* as a new B-queue item so the canon tracks this lane.

## Corpus used

`aytree/README.md` · `aytree/docs/ARCHITECTURE.md` · `aytree/docs/HARVEST.md` ·
`aytree/docs/CATALOG.md` · `aytree/docs/dyslexia-encoding.md` ·
`aytree/docs/dyslexistree-design-6c22687c.md` (design sections only) ·
`aytree/docs/specs/radial-rerooting-spec.md` · `aytree/src/model/snapshot.js` ·
`aytree/src/ingest/local-git.js` · `sesefus/docs/COVENANT.md` ·
`sesefus/docs/CANON.md` · `sesefus/docs/GIT_WORKFLOW.md` ·
`sesefus/docs/PRODUCTION.md` · plus two read-only subagent sweeps (versioning
semantics; code-reality floor) whose findings are cited inline.

GMS2-side claims: `memory-derived` (no GMS2 corpus on disk). The corpus exclusion
rule ran; excluded material is not named here by design.
