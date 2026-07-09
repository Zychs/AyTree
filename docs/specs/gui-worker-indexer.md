# gui-worker-indexer

| Field | Value |
|-------|-------|
| Agent | MAP-GUI-02 |
| Run ID | `odyssey-component-derive-2026-06-13` |
| Wave | S1 map wave 1 |
| Lane | **G-B** (spatial + LOD + indexer worker) |
| Schema seam | `schemas/timeline-snapshot.v1.json` |
| Bus seam | `schemas/bus-envelope.v1.json` |
| Source ingest | `C:\Users\bardw\git\intuitree\index.html` → `loadLocalRepo` §lines 330–424 |
| Domain fence | **NO UI copy.** GUI compute only. Never parse `.git` on main thread or in RAF. |

---

## Map

**Unit role:** Off-thread indexer that reads a pane-local clone's `.git/` metadata and emits an immutable **`TimelineSnapshot` v1** read model. One indexer instance (or lane) per `pane_id` (`a` | `b`). All viz modules (`gui-timeline-compound`, `gui-timeline-gitgraph`, `gui-spatial-map`, `gui-lod-controller`) **consume** snapshots; they never touch log files.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN THREAD (per pane) — RAF-safe, ≤8ms budget for indexer handoff   │
│  ┌──────────────┐    postMessage      ┌─────────────────────────────┐   │
│  │ ui-pane-host │──repo pick─────────▶│ indexer coordinator (pane)  │   │
│  │ (UI seam)    │    pane_id, path   │  • spawn / route worker     │   │
│  └──────────────┘                    │  • transfer snapshot buffer │   │
│         ▲                            └──────────────┬──────────────┘   │
│         │ bus subscribe                           │                     │
│  ┌──────┴───────┐   snapshot_ready                ▼                     │
│  │ gui-* viz    │◀─────────────────── WORKER / SIDECAR (off-thread)    │
│  │ modules      │                    ┌─────────────────────────────┐   │
│  └──────────────┘                    │ parse .git/refs + logs      │   │
│                                      │ → TimelineSnapshot v1       │   │
│                                      │ validate JSON schema        │   │
│                                      └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Parse pipeline (worker-only)

| Step | Input | Output | Notes |
|------|-------|--------|-------|
| 1. Resolve `.git` | `repo_path` or FS handle root | `gitHandle` | Repo root or `.git` dir picked directly (intuitree pattern) |
| 2. Branch refs | `.git/refs/heads/*` | `Map<branch, headSha>` | Text file per ref; trim SHA |
| 3. HEAD | `.git/HEAD` | `headSha` | Resolve `ref:` or detached SHA |
| 4. Log ingest | `logs/HEAD`, `logs/refs/heads/<branch>` | raw commit records | One file per tracked log path |
| 5. Line parse | reflog line | `{ sha, parents[], message_short }` | Regex from intuitree: `^([0-9a-f]{40})\s+([0-9a-f]{40})\s+.*?\s+(.*)$` |
| 6. Dedup + order | seen `Set<newSha>` | `commits[]` oldest→newest | Skip duplicate `newSha`; assign monotonic `index` |
| 7. Enrich | parents length, message | `is_merge`, optional `tag`/`profile` | `is_merge := parents.length > 1`; conflict flags deferred to LOD pass |
| 8. Snapshot pack | pane context | `TimelineSnapshot` | `v:1`, `pane_id`, `repo_path`, `generated_at`, optional `granularity` from `gui-lod-controller` |
| 9. Publish | validated snapshot | bus + `postMessage` | Topic: `pane/{a|b}/gui/indexer/snapshot_ready` |

### Per-pane isolation (simultaneity)

| Rule | Enforcement |
|------|-------------|
| No shared worker mutable state across panes | Dedicated worker **or** SharedWorker keyed by `pane_id` session |
| No `window.__` snapshot cache | Pane-local coordinator module only |
| Snapshot carries `pane_id` | Consumers drop frames where `pane_id` ≠ subscribed pane |
| Parallel index on Odyssey fixture | Pane A 10k commits + Pane B scrub must not block either RAF |

### Bus contract (indexer as producer)

```json
{
  "v": 1,
  "pane_id": "a",
  "module_id": "gui-worker-indexer",
  "topic": "pane/a/gui/indexer/snapshot_ready",
  "ts": 0,
  "payload": { "snapshot": { "v": 1, "pane_id": "a", "repo_path": "...", "commits": [], "generated_at": "..." } }
}
```

Secondary topics (worker-internal, optional S2):

| Topic | When |
|-------|------|
| `pane/{id}/gui/indexer/index_started` | Worker accepted job |
| `pane/{id}/gui/indexer/index_progress` | Chunked parse (>2k commits); payload `{ pct }` |
| `pane/{id}/gui/indexer/index_failed` | Parse/IO error; payload `{ code, detail }` |
| `pane/{id}/gui/indexer/incremental_delta` | Tail append only; future S4 |

### Upstream / downstream edges

| Partner unit | Direction | Seam |
|--------------|-----------|------|
| `ui-pane-host` | in | repo pick event, `pane_id`, path string |
| `gui-lod-controller` | in | `granularity`: `versions` \| `full` \| `conflict_prominent` |
| `gui-timeline-compound` | out | full `commits[]` + `scrub_t` echo |
| `gui-timeline-gitgraph` | out | `commits[]`, `is_merge`, `parents` |
| `gui-spatial-map` | out | **not** working-tree walk here — spatial has own worker slice; indexer may pass `headSha` only |
| `gui-raf-scheduler` | constraint | zero parse on RAF tick |

### Target package layout (staging intent)

```text
packages/gui/worker-indexer/
  src/
    parse-git-logs.ts      # pure parse (portable to Rust)
    snapshot-builder.ts    # TimelineSnapshot v1 pack + validate
    indexer-worker.ts      # Dedicated Worker entry
    indexer-shared.ts      # SharedWorker entry (G-B impl 2)
    coordinator.ts         # main-thread handoff only
  fixtures/
    logs-head-sample.txt
    snapshot-10k.json
  tests/
    parse-git-logs.test.ts
    thread-budget.smoke.ts
```

---

## Keep

| Asset | Rationale |
|-------|-----------|
| **Reflog line regex + dedup-by-`newSha`** | Battle-tested in intuitree `loadLocalRepo`; stable across local gh clones |
| **Log path list** `logs/HEAD` + `logs/refs/heads/*` | Matches real bardw clone layout; no `git` binary dependency in browser lane |
| **`message_short` ≤70 chars** | Aligns with `TimelineSnapshot` schema + `DYSLEXIA-CONTRACT` token budget for downstream draw |
| **Parent from `oldSha`** with zero-SHA guard | Correct root commit handling (`000…000` → `parents: []`) |
| **`headSha` single-node fallback** | Empty logs still produce scrubbable snapshot |
| **`generated_at` ISO-8601** | Enables viz modules to ignore stale frames (`snapshot.v` + timestamp) |
| **Chunked postMessage for large repos** | Transferable `ArrayBuffer` or structured clone in ≤4ms main-thread slices |
| **Schema validation in worker** | Fail before bus publish; keeps render thread free of try/catch parse paths |
| **Per-`pane_id` worker affinity** | Simultaneity guarantee for dual GitHub accounts on 49" |

---

## Toss

| Item | Owner / fate |
|------|----------------|
| `walkWorkingTreeForSpatial` | **`gui-spatial-map`** — not indexer |
| `buildGraphLayout`, `buildNodesLayout`, canvas draw | **`gui-timeline-compound`**, **`gui-timeline-gitgraph`**, **`gui-render-compositor`** |
| `fetchGitHistory` (GitHub API) | Removed — Odyssey is local `.git/logs` only |
| `setStatus`, picker prompt copy, button labels | **UI domain** — indexer emits machine topics only |
| `showDirectoryPicker` policy | **`ui-pane-host`** — indexer receives path/handle, does not own UX |
| Main-thread `await lf.text()` over full log files | **Forbidden** — move all FS reads to worker (or Tauri sidecar) |
| Global `commits`, `branches`, `nodes` arrays | Replace with pane-scoped snapshot store |
| Demo / synthetic commit injection | **`gui-timeline-compound`** simulate path — indexer stays faithful to logs |
| LOD filtering logic inside parse | **`gui-lod-controller`** selects view; indexer may pre-tag but does not drop commits silently without topic |

---

## Smoke test

**Gate:** Any main-thread indexer handoff or parse work **>8ms** during 120s dual-pane fixture = **FAIL** (`PF-GUI-THREAD-001`).

| ID | Probe | Pass | Fail |
|----|-------|------|------|
| SF-GUI-IDX-001 | Index 10k-commit synthetic `logs/HEAD` fixture | Worker completes; main thread max block ≤8ms per frame | Any `performance.now()` delta >8ms on coordinator during index |
| SF-GUI-IDX-002 | Dual pane: A indexes 10k while B scrubs @60fps | B RAF p95 ≤16.7ms | B drops below 30fps or stalls >3 consecutive frames |
| SF-GUI-IDX-003 | Snapshot schema validation | 100% payloads pass `timeline-snapshot.v1.json` | Missing `pane_id`, `index`, or `message_short` >70 |
| SF-GUI-IDX-004 | Pane bleed | Snapshot on pane `a` never delivered to `b` subscriber | Cross-pane `pane_id` mismatch undetected |
| SF-GUI-IDX-005 | Re-index same repo | Second snapshot has new `generated_at`; viz invalidates | Stale frame rendered without version check |
| SF-GUI-IDX-006 | Empty / corrupt log file | `index_failed` topic; no throw on main | Uncaught promise / main-thread parse fallback |
| SF-GUI-IDX-007 | Browser zoom 150–200% | Index timing unchanged (compute only) | Main-thread parse added for "crisp" workaround |

**Fixture command (S2):**

```text
node packages/gui/worker-indexer/tests/thread-budget.smoke.ts
  --fixture fixtures/logs-10k.txt
  --panes a,b
  --duration 120
  --main-thread-budget-ms 8
```

---

## Next commit

**Lane G-B — three indexer strategies** (pick one per strategy-quartet winner; do not blend on first commit).

| # | Strategy | Sketch | Wins when | Risks |
|---|----------|--------|-----------|-------|
| **1 — Dedicated Worker** | `new Worker(indexer-worker.ts)` per `pane_id` | Simplest isolation; maps to S-C worker compositor; no cross-pane locks | Lowest simultaneity risk; easiest smoke | 2× worker boot on cold start; duplicate parse code in memory |
| **2 — SharedWorker pool** | Single `SharedWorker` routes `{ pane_id, job }` | One parse codebase; shared warm cache for same repo path (unlikely across accounts) | Memory-conscious on 49" long sessions | Lock contention if pool serializes; **must prove** parallel A+B jobs |
| **3 — Tauri sidecar (G-B Rust)** | `invoke('index_git_logs', { pane_id, path })` → JSON snapshot | Native `std::fs` read; best for 10k+ and future `git` object reads; aligns S-A monorepo | Fastest IO; frees browser workers for canvas | IPC latency; platform packaging; FS permissions in shell |

**Recommended first commit (Worker):** Dedicated Worker per pane + `parse-git-logs.ts` pure module + schema validate + bus publish. SharedWorker and sidecar remain feature-flagged stubs until SF-GUI-IDX-002 passes on Worker baseline.

**First commit checklist:**

1. Port intuitree log parse to `parse-git-logs.ts` (zero DOM).
2. `snapshot-builder.ts` assigns `index` 0..n-1 oldest first.
3. `coordinator.ts` — spawn, `postMessage({ type:'index', pane_id, repo_path, granularity })`, receive snapshot in ≤4ms handler.
4. Register `module_id: gui-worker-indexer` in GUI manifest.
5. Wire `gui-lod-controller` granularity as pass-through field only (no filter yet).

---

## Inventory

| Artifact | Path (staging) | Status |
|----------|----------------|--------|
| TimelineSnapshot schema | `schemas/timeline-snapshot.v1.json` | ✅ exists |
| Bus envelope schema | `schemas/bus-envelope.v1.json` | ✅ exists |
| GUI manifest unit list | `manifest-gui.json` → `gui-worker-indexer` | ✅ listed |
| This map | `map/gui/gui-worker-indexer.md` | ✅ wave 1 |
| Parse source truth | `C:\Users\bardw\git\intuitree\index.html` (`loadLocalRepo`) | ingest reference |
| Package root (planned) | `packages/gui/worker-indexer/` | ❌ not created |
| `parse-git-logs.ts` | — | ❌ |
| `indexer-worker.ts` | — | ❌ |
| `coordinator.ts` | — | ❌ |
| 10k log fixture | `fixtures/logs-10k.txt` | ❌ |
| Thread smoke test | `tests/thread-budget.smoke.ts` | ❌ |
| GUI smoke registry entry | `ODYSSEY_GUI_SMOKE_REGISTRY.md` | ❌ pending S2 |

**PF-GUI parent failures this unit resolves:**

| ID | Symptom |
|----|---------|
| PF-GUI-MAIN-THREAD-BLOCK | intuitree `loadLocalRepo` async FS + parse on picker path blocks UI |
| PF-GUI-THREAD | render modules tempted to re-parse logs on scrub |
| PF-GUI-SEAM | draw without snapshot `v` / `generated_at` check |

---

## Salience ≥0.90

| Weight | **0.91** |
|--------|----------|
| Justification | Indexer is the **sole authorized** `.git/logs` parser in GUI domain; without off-thread snapshot, every downstream unit (compound ≥0.92, gitgraph ≥0.90) violates thread smoke and simultaneity. Blocks G-B lane and Case G1 acceptance. |
| Wave 1 pairing | Co-mapped with `gui-timeline-compound` (MAP-GUI-01) — compound **must not** ship parse; indexer **must** ship before compound extraction merges. |
| Deferral cost | High — dual-pane Odyssey demo reverts to intuitree monolith blocking pattern. |

---

## Version role

| Concern | Owner |
|---------|-------|
| **`TimelineSnapshot.v`** | Fixed `1` for this derive run; indexer refuses to emit other versions |
| **`generated_at`** | Indexer sets on every successful pack; consumers treat as frame freshness token |
| **`commits[].index`** | Indexer-owned stable ordering key for scrub mapping (`scrub_t` ↔ index interpolation in viz) |
| **Schema drift** | Indexer runs AJV (or zod) against `timeline-snapshot.v1.json` before publish; viz modules trust but verify `v === 1` |
| **Incremental parse version** | Future `snapshot_seq` field reserved in G-B impl 3 sidecar; not in v1 schema — use new bus topic, not silent array mutation |
| **Not indexer scope** | Canvas draw list version, LOD bitmask, shader uniforms — **`gui-render-compositor`**, **`gui-lod-controller`** |

**Consumer rule (all GUI viz):** If `snapshot.v !== 1` or `snapshot.pane_id` ≠ subscribed pane → drop frame, emit `PF-GUI-SEAM` in dev builds.

---

*MAP-GUI-02 — gui-worker-indexer — DERIVE-GUI wave 1 — 2026-06-13*