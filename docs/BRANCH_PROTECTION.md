# AyTree — `main` branch protection

> Public-repo guardrails for `main`, drafted to match **Sesefus working rules**
> (`sesefus/docs/GIT_WORKFLOW.md`, `sesefus/ROADMAP.md`) and AyTree’s own phase/PR
> discipline (`docs/VERSIONING.md` §5). This file is the *policy*; enforcement is
> GitHub rulesets + repo merge settings applied by `tools/apply-main-protection.sh`.

## Why this exists

`Zychs/AyTree` is (or will be) **public**. On a public free GitHub repo, anyone can
fork and open PRs; without protection, `main` can also be force-pushed or
direct-pushed by collaborators. Sesefus already states the law of the land:

| Sesefus source | Rule |
|---|---|
| `ROADMAP.md` | **One feature branch = one squash PR into `main`.** Easy to read, bisect, revert. |
| `GIT_WORKFLOW.md` | Code → branch → **open PR** → **squash-merge** to `main`. |
| `GIT_WORKFLOW.md` | Force-push to `main` only as an intentional, scripted history rewrite — not day-to-day. |
| `VERSIONING.md` §5 (AyTree) | Phases map 1:1 to numbered PRs; branches `feat/<concern>`; merge via squash PR — matching Sesefus. |

Sesefus itself is currently **private**, so classic branch protection / rulesets
are unavailable on a free plan there (same 403 AyTree hits while private). The
*policy* still holds; AyTree should enforce it as soon as the repo is public.

## Target state (match Sesefus intent, not its currently unenforced defaults)

### A. Repo merge settings

| Setting | Value | Why |
|---|---|---|
| Default branch | `main` | Same as Sesefus / AyTree today |
| Allow squash merge | **on** | Required — one PR = one commit on `main` |
| Allow merge commit | **off** | Blocks non-linear history (Sesefus toolflow wants linear) |
| Allow rebase merge | **off** | Prefer squash titles over silent rebases of multi-commit stacks |
| Delete head branch on merge | **on** | Keeps remote branch list to open work only |
| Auto-merge | off | Explicit human merge until CI is trusted |

### B. Ruleset: `main` (active, enforce)

Target: ref `refs/heads/main` only.

| Rule | Setting | Why |
|---|---|---|
| **Restrict deletions** | block | No one deletes `main` |
| **Non-fast-forward / force push** | block (including admins) | Force-push only via a deliberate break-glass (temporary ruleset edit), never casual |
| **Require a pull request before merging** | on | No direct pushes to `main` |
| ↳ Required approvals | **0** (solo maintainer default) | Sesefus/AyTree history is single-maintainer; raising to 1 is optional once a second trusted reviewer exists |
| ↳ Dismiss stale reviews on new commits | on (if approvals ≥ 1) | — |
| ↳ Require review from Code Owners | off until `CODEOWNERS` exists | Add later if multi-owner |
| ↳ Require conversation resolution | on | No merge with open threads |
| ↳ Allowed merge methods | **squash only** | Mirrors Sesefus “squash PR” |
| **Require linear history** | on | Reinforces squash-only / no merge commits |
| **Block force pushes** | on | Same as non-FF |
| **Require status checks to pass** | on when CI exists | Gate on `CI` / `test` once `.github/workflows/ci.yml` lands (Phase A `npm test`) |
| ↳ Strict status checks | on | Branch must be up to date with `main` before merge |
| **Require deployments to succeed** | off | No deploy env yet |
| **Restrict who can push** | bypass actors: repo admin only for emergency; do **not** grant bypass for day-to-day bots until trusted | Public = untrusted external PRs |

### C. What we deliberately do **not** copy from private-free defaults

Current `Zychs/sesefus` and `Zychs/AyTree` API settings still allow merge commits,
rebase merges, and leave head branches after merge. That is **settings drift**, not
policy. This draft enforces the **documented** Sesefus workflow, not the loose
defaults GitHub created the repos with.

### D. AyTree-specific notes

- **Local truth stays local:** branch protection does not make GitHub the SSOT.
  `VERSIONING.md` §2 still holds — GitHub is mirror + collaboration remote.
- **Phase/PR discipline:** one concern per PR (`ghm2-development-plan.md`).
  Protection cannot enforce “one concern,” only “came through a PR and squashed.”
- **CI checklist names (when wired):**
  - `test` — `node --test` / `npm test` (27 assertions today)
  - Optional later: secret scan (Sesefus `feat/repo-hardening` pattern) if secrets
    ever appear; AyTree is client-side + optional local Python server, so start thin.
- **Admin break-glass:** temporarily disable the ruleset or add a timed bypass
  actor, do the scripted rewrite, re-enable. Never leave “allow force push”
  permanently on for public `main`.

## Preconditions to apply

1. Repo visibility is **public** (or the account has GitHub Pro). Classic
   protection and repository rulesets return 403 on free **private** repos.
2. You have admin on `Zychs/AyTree`.
3. Prefer rulesets over legacy branch protection (one ruleset, exportable JSON).

## Apply

```bash
# From AyTree repo root (WSL authority: /home/justavision/aytree)
bash tools/apply-main-protection.sh           # dry-run prints the payload
bash tools/apply-main-protection.sh --apply   # create/update ruleset + merge settings
```

## Verify

```bash
gh api repos/Zychs/AyTree/rulesets --jq '.[] | {id,name,enforcement,target}'
gh api repos/Zychs/AyTree --jq '{visibility, allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge}'
# Attempt (should fail):
# git push origin main   # direct push blocked once ruleset is active
```

## Non-goals

- Not a substitute for CODEOWNERS, security policy, or Dependabot (add separately).
- Does not protect feature branches — only `main`.
- Does not rewrite history or close open PRs.
- Does not change Sesefus until that repo is public or Pro-enabled; same draft can be
  re-pointed at `Zychs/sesefus` with `REPO=Zychs/sesefus`.
