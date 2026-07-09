---
title: swarm-path-tuner
---

# Swarm Path Tuner — Agent Swarm Skill for Branching Choices & Foundation Scaling

**Originated branch:** `feat/swarm-path-tuner-governor` (2026-06-13)

This documents the first-class governor skill installed at `~/.grok/skills/swarm-path-tuner/SKILL.md` (user scope, canonical `.grok/skills/`).

## What it does

- Triggered on **any** Grok return containing branching non-intersecting choices (robust detection of **A.** **B.** **C.** **D.**, "Would you like me to:", numbered options, or already-present bulletized pathfinding with `• `).
- For the scope, computes `max_safe` from domain (derivation / synthesis / write-contention / mixed T: Git + Desktop hygiene + skill onboarding).
- **Always** `tuned = max(1, max_safe - 2)`. (4→4, 10→8).
- Curves on public Grok API **usage_scalar** from the serving datacenter: full speed in valleys (≤0.30), gentle then stronger throttle as load approaches peaks.
- **Every governed output** delivers exactly `tuned` crisp `• ` path lines (Grok-authored, binding execution contract) + one compact telemetry:
  `[TELEMETRY] intent:<short> usage:<0.xx> agents:<orig>-><tuned> scope:<kebab>`
- The telemetry + paths are machine-grepable for later mapping against real datacenter metrics and USAGE_LEDGER.

## Live example (applied to "how should i ensure my foundation scales?")

(See conversation for the exact prior return with Desktop verification, location audit one-liner, derivation-2026-06-12 commit, SSOT README pointers, and relocation option.)

Scope: T: canonical root + GitHub Desktop lock + 6-repo hygiene (sesefus, repo-libs-naissance, intuitree, neurallab-web, repo-ingest, Zychs) + fresh derivation-external-view commit + external-view MD + SSOT pointers.

Observed usage_scalar ≈ 0.38 (mid-valley, post clean 4-unit derive).

Domain: mixed reasoning + Git I/O + Desktop + new-skill integration + meta hygiene → max_safe=6.

**Tuned concurrent agents = 6 − 2 = 4**

### Bulletized pathfinding (binding execution contract)

• Verify GitHub Desktop now defaults Local path to `T:\github` (or chosen T: base) by performing one test **Clone repository…** or **New repository** into that root — this permanently teaches the client the canonical T: topology.

• Execute the provided PowerShell location audit one-liner against the six repos currently in the Desktop sidebar; surface any remaining C: stragglers and prepare safe mirror-clone + remote-update + Desktop re-add commands only for those that need it.

• From the live T: working tree, stage + commit the new `derivation-external-view-2026-06-12/` folder together with the updated `GITHUB-EXTERNAL-VIEW-FROM-HEAVY-TRANSCRIPTS.md` (and any meta/ changes); use a conventional message that references the tuner telemetry for the wave.

• Add the single-line SSOT pointer (≤80 chars) into both `sesefus/README.md` and `repo-libs-naissance/README.md` (and intuitree if applicable) linking `CLEANUP.md` + today's derivation folder; this keeps the visible process and foundation version history discoverable.

**Telemetry**  
[TELEMETRY] intent:foundation-scale usage:0.38 agents:6->4 scope:t-drive+desktop+derive+ssot

## Why this makes the foundation scale

- Every non-trivial swarm (derive waves, heavy transcript, Git topology, commit orchestration) first consults the tuner.
- Permanent −2 margin + valley/peak curve gives speed when quiet + automatic protection on load.
- The • paths keep the "visible process" explicit and machine-readable (SSOT contract).
- Telemetry is compact and mappable; pairs with vc-guardrails (pre-write drift/pressure gate at the chosen N) and derive-agent-array (the orchestration that now respects the tuned cap instead of hard 9).
- Robust detection means even when a prior Grok turn ends in 4 options, the fourth is resourcefully the tuner, and the chosen paths are re-expressed as safe concurrent • steps.

## Integration with intuitree (this web project)

intuitree (minimal intuitive navigation + spatial graphics for any repo file structure) is the perfect visual layer for the outputs of the tuner:

- Render dated derivation folders (`derivation-external-view-YYYY-MM-DD/`) as first-class version epochs.
- Visualize the • path contracts as a graph or checklist view tied to a run_id / telemetry entry.
- Overlay usage_scalar vs. effective agent count on a small timeline (foundation health).
- Drill from a repo node (sesefus, repo-libs-naissance, intuitree itself) into its recent SSOT pointers and CLEANUP.md links.

Future: feed tuner TELEMETRY + compose-staging artifacts into the spatial view so "version control" of the entire swarm-driven foundation becomes live and queryable.

## Canonical source (local)
`C:\Users\bardw\.grok\skills\swarm-path-tuner\SKILL.md` (and promoted to T:\grok\skills\...)

Branch created to detail the skill for the web / visualization side of foundation version control. The skill itself is the runtime governor; this doc captures the contract for UI consumers.

— Generated under swarm-path-tuner rules (4 paths, usage 0.38, telemetry emitted).
