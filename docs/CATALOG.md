# AyTree — Function Catalog

Harvested from the two richest builds. Each row maps a source symbol to its **target
module** in the new skeleton. Line numbers are the odyssey-spec-verified positions in the
canvas build (`Favorites/git/intuitree/index.html`, identical to the spec's cited
`~/git/intuitree/index.html`).

**Disposition:** `port` = bring across mostly intact · `derive` = reshape to the model
seam · `toss` = drop (recorded for provenance) · `defer` = later phase.

---

## A. Canvas build — `Favorites/git/intuitree/index.html` (51 KB)

The immersive/spatial + DAG + weave monolith. This is the primary harvest anchor.

| Symbol | Line | Target module | Disp. |
|--------|------|---------------|-------|
| `hashStr(s)` | 213 | `src/model/hash.js` | **port** — shared deterministic jitter |
| `catForExt(ext)` | 124 | `src/compositor/encode.js` | derive — category → shape, not color-only |
| `getTimelineCurvePoint(t,w,h)` | 765 | `src/lenses/weave.js` | **port** — reason-curve, `waveCount=1.5+t*4` |
| `draw()` compound section | 784–923 | `src/lenses/weave.js` | **port** — curve·ribbon·markers·weaves·dots·LOD |
| `scheduleDraw()` | 925 | `src/compositor/raf.js` | derive — dirty flag → RAF slot |
| `buildNodesFromTree(items)` | 222 | `src/lenses/spatial-map.js` | derive — province grid + jitter (drop `sqrt(size)`) |
| `buildNodesLayout()` | 447 | `src/lenses/spatial-map.js` | **port** — fixed radii (no size encoding) |
| `makeDemoNodes()` | 282 | `src/lenses/spatial-map.js` | defer — fixture only |
| `fitViewToNodes()` | 186 | `src/lenses/spatial-map.js` | port — auto-frame field |
| `worldToScreen/screenToWorld` | 748/936 | `src/lenses/spatial-map.js` | port — per-pane view `{tx,ty,scale}` |
| `hitTest(sx,sy)` | 943 | `src/compositor/hit-targets.js` | derive — policy moves out of lens |
| `buildGraphLayout()` | 529 | `src/lenses/dag-gitgraph.js` | **port** — lane allocator `wx`/`wy=index/(n-1)` |
| `drawGraph()` | 566 | `src/lenses/dag-gitgraph.js` | **port** — edges-before-nodes DAG |
| `worldToScreenGraph` / `g2s` | 627 | `src/lenses/dag-gitgraph.js` | port |
| `hitGraph(sx,sy)` | 638 | `src/compositor/hit-targets.js` | derive |
| `initGraphCanvas` / `toggleGraph` | 472/736 | `src/compositor/compositor.js` | derive — becomes z-manifest toggle |
| `updateCurrentCommit(sha)` | 646 | `src/model/snapshot.js` | derive — `scrub_t` → nearest index (drop tree fetch) |
| `stepCommit` / `replayHistory` | 672/679 | (shell / raf) | defer — scrub animation |
| `simulateCommit()` | 695 | — | defer — demo mutation |
| `resizeCanvas()` | 174 | `src/compositor/compositor.js` | derive — `dpr` clamp 1–2 |
| `zoomAt` / `resetView` | 980/975 | `src/compositor/compositor.js` | port — viewport math |
| `attachEvents()` | 994 | shell | defer — hotkey/focus policy is UI domain |
| `boot()` | 1140 | shell (`index.html`) | derive — becomes picker→model→compositor boot |
| `updateInspector(n)` | 960 | UI (`ui-inspector`) | defer |
| `setStatus(msg)` | 171 | UI | defer |
| `selectOneLocalRepo()` | 305 | `src/ingest/local-git.js` | derive — FS Access picker |
| `loadLocalRepo(handle)` | 330 | `src/ingest/local-git.js` | **derive** — `.git/logs` parse → snapshot |
| `walkWorkingTreeForSpatial()` | 428 | `src/ingest/local-git.js` | derive — depth≤8 walk (move off-thread) |
| `fetchGitHistory(owner,repo)` | 482 | — | **toss** — GitHub API, remote/rate-limited |
| `loadRepo()` | 1137 | — | toss — compat no-op |

## B. Hierarchical-tree + Python build — `index_tree.html` (42 KB, worktree root)

The DOM tree + `intuitree_server.py` scan approach. Feeds the `python-scan` adapter and a
possible later DOM-tree lens; editing ops are deferred.

| Symbol | Line | Target module | Disp. |
|--------|------|---------------|-------|
| `fetchTreeData()` | 615 | `src/ingest/python-scan.js` | **derive** — server scan → snapshot.tree |
| `renderTree` / `createNodeDom` | 664/677 | (future `lenses/dom-tree.js`) | defer |
| `toggleCollapse` / `expandParents` | 813/831 | (future dom-tree) | defer |
| `selectNode` | 856 | hit-targets / bus | defer |
| `saveExpandedState` | 606 | (future dom-tree state) | defer |
| `updateNodeStatus` | 1066 | editing | defer |
| `createFolder`/`createBranch`/`createVirtualNode` | 1126/1156/1187 | editing | defer |
| `renameVirtualNode`/`deleteVirtualNode` | 1224/1263 | editing | defer |
| `getVirtualParentKey` / `getParentPath` | 1105/995 | model | defer |
| `escapeHtml` | 1297 | util | port-on-demand |

---

## C. Symbols that become shared infrastructure

| Concept | Source | New home | Why shared |
|---------|--------|----------|------------|
| `hashStr` jitter | A:213 | `model/hash.js` | Every lens needs golden-stable layout |
| `THEME` / `CAT_COLOR` | A:105–122 | `compositor/encode.js` + shell theme | Tokens, not per-lens |
| per-pane `view {tx,ty,scale}` | A | `compositor` | Camera is compositor-owned, never global |
| `dpr` clamp + `setTransform` | A:174 | `compositor` | One high-DPI path for all lenses |
| RAF coalesce | A:925 | `compositor/raf.js` | Single slot across the z-stack |

See [HARVEST.md](HARVEST.md) for source-file provenance and [ARCHITECTURE.md](ARCHITECTURE.md)
for how these modules compose.
