# AyTree — Versioning Contract

> Companion to `ARCHITECTURE.md` (shape) and the suite law docs
> (`sesefus/docs/COVENANT.md`, `sesefus/docs/CANON.md` — AyTree is a suite module
> per `README.md:38`, so the covenant binds its user path). This file is the
> *versioning promise*: what a version is, which verbs may touch one, and what may
> never happen. Where a build decision and this file disagree, one of them must be
> fixed before merging. Derived 2026-07-09 from the GMS2→GHM2 frontier study
> (`ghm2-frontier-research-array.md`).

## 1 · What a version is

A version is one **`RepoSnapshot`** — `{repoPath, commits, files, branches,
currentSha, scrubT, generatedAt}` (`src/model/snapshot.js:8-18`). Nothing else in
the system is a version.

- **Identity:** a commit is `{sha, index, …}`; `index` is the indexer-owned stable
  ordering key (`specs/gui-worker-indexer.md`).
- **Time:** `scrub_t ∈ [0,1]` is the playhead; the current commit derives as the
  nearest index (`snapshot.js:38-44`). Time is *navigated*, never edited.
- **Freshness:** `generated_at` supersedes — a newer snapshot replaces an older
  one, and a stale frame never paints over a newer one (`isNewer`,
  `snapshot.js:32-36`).
- **Schema:** the snapshot shape carries an explicit schema tag (`v:1`,
  TimelineSnapshot lineage). Schema changes bump the tag and preserve `isNewer`
  semantics; lenses reject shapes they don't know.
- **Projection law:** the render thread never parses `.git`, never calls
  network/FS — lenses *project* versions and can never create or mutate one
  (`ARCHITECTURE.md:52-57`).

## 2 · Local truth

History enters through local ingest only: `.git/logs` reflog parse + File System
Access working-tree walk (`src/ingest/local-git.js`), or the *optional* local
python-scan server. **No remote is ever load-bearing.** GitHub (`Zychs/AyTree`)
is a mirror and collaboration remote, never a source of truth — the REST ingest
path was tossed and stays tossed (`HARVEST.md:46`). The user path completes with
the network unplugged.

## 3 · The action grammar

Three tiers of verb, strictly ordered by what they may touch:

| Tier | Verbs | May touch |
|---|---|---|
| **Read** | scrub · re-root · switch lens · toggle overlay | nothing — pure projection |
| **Sandbox** | fork (in-memory snapshot fork) · probe (experiment inside the fork) | sandbox state only, in memory |
| **Gate** | **commit** (Apply — merge validated changes into the primary scope or a staged fork) \| **omit** (Discard — close clean, zero writes) | the gate is the *only* door out of a sandbox |

The gate is binary and mandatory: a split pane never closes without an explicit
commit or omit (`README.md:59`; `dyslexistree-design-6c22687c.md:443-447` —
sandbox state stays in-memory until an explicit Apply). Any staged write follows
the `preview → apply → rollback` pattern (`dyslexistree-design:940-950`).

> **Provisional (research lane 2):** "promote" — commit *into a staged fork* as
> distinct from commit *to primary* — is a coined verb from the GMS2 import; the
> corpus itself is binary Apply|Discard. No code uses the word "promote" until
> lane 2 of the frontier array settles its semantic or drops it.

## 4 · Isolation law

- Sandboxes are backed only by **real primitives**: in-memory `RepoSnapshot`
  forks today; git worktrees if and when adopted. Never by undefined constructs —
  `derivation-priority-guardian` and "INDEX junctions" (`README.md:62`) have no
  referent in the suite and must not be load-bearing in any design.
- Index and tags: shared for reading, isolated for sandbox writes
  (`README.md:62`).
- The primary view stays fully operational while a sandbox is engaged
  (`README.md:59`).

## 5 · Versioning the code itself

- **Phase/PR discipline, not semver:** phases map 1:1 to numbered PRs
  (`dyslexistree-design:740-799` pattern); branches are `feat/<concern>`
  (current family: `feat/radial-onion-*`); merge via squash PR — matching
  `sesefus/docs/GIT_WORKFLOW.md`.
- **Status words:** every capability claim in every doc uses exactly
  **WIRED / STUB / DEAD** (CANON §2 discipline). "Fully supported" prose for
  unbuilt features is the drift class this rule kills.
- **Checkout authority:** `/home/justavision/aytree` (WSL) is the working
  authority; `C:\dev\aytree` is a stale convenience checkout (verified 4 commits
  behind, ancestor HEAD) — sync it or delete it, never edit there.

## 6 · Never

- No history rewriting from the UI — history is recorded fact; the authored
  surface is the staged fork, never the past.
- No remote-dependent feature on the user path.
- No size/storage encoding — presence + structure + time carry the signal
  (`dyslexia-encoding.md`).
- No state encoded in color alone — ≥2 non-color channels, always.
- No sandbox that can leak: Discard leaves `git status` and the primary snapshot
  bit-identical.

## 7 · Verification (run these, don't argue)

1. **Unplugged:** cut all non-loopback network → ingest, scrub, re-root, and
   lens-switch complete end to end.
2. **Clean omit:** open a sandbox, make changes, Discard → `git status` untouched
   and the primary snapshot unchanged.
3. **Freshness:** feed an older `generated_at` after a newer one → the stale
   frame never paints.
4. **Status audit:** grep the docs — every capability claim resolves to
   WIRED / STUB / DEAD.

## 8 · Doc-drift ledger (fix at source, then re-derive)

- [ ] `ARCHITECTURE.md:9` — still calls `radial-onion.js` a stub; it is 274 lines
      of real layout code (unwired). Status should read WIRED-unwired or PARTIAL.
- [ ] `README.md:50` — "Relate Mode … fully supported" contradicts the design
      doc's deferral (`dyslexistree-design:433,749,955`); restate with status words.
- [ ] `README.md:57,62` — replace `derivation-priority-guardian` / "INDEX
      junctions" with the real primitives (§4) or mark them INTENT.
- [ ] `CATALOG.md:35` — `updateCurrentCommit(sha)` legacy git-tree fetch still
      pending its drop to the pure `scrub_t` derivation.
- [ ] `radial-rerooting-spec.md:96-99` — dark `#0d1117` palette superseded by
      KD-16 warm-paper canon; add the override note.
- [ ] No test runner: add a minimal `package.json` with `node --test` script so
      the 27 passing assertions run on one command.
