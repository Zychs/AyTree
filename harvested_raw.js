
    // === CONFIG & THEME (warm dark, high contrast, chordinator-inspired) ===
    const THEME = {
      bg: '#0f0e0a',
      text: '#f4edcf',
      muted: '#a99f78',
      accent: '#c2a334',
      accentStrong: '#e0be3e',
      line: 'rgba(224,190,62,0.22)',
      card: '#17150d'
    };

    // Category colors (redundant with shape/stroke + labels)
    const CAT_COLOR = {
      code: '#e8c55c',   // warm gold
      doc: '#d9c9a3',    // soft warm
      config: '#8fa3b8', // cool muted
      asset: '#a88bc4',  // purple-ish
      other: '#8fa88f'   // green-gray
    };

    function catForExt(ext) {
      ext = (ext || '').toLowerCase();
      if (['js','ts','tsx','jsx','py','rb','go','rs','zig','c','cpp','java','cs'].includes(ext)) return 'code';
      if (['md','txt','rst','adoc'].includes(ext)) return 'doc';
      if (['json','yaml','yml','toml','ini','cfg','xml','env'].includes(ext)) return 'config';
      if (['png','jpg','jpeg','gif','svg','webp','ico','mp3','wav','mp4'].includes(ext)) return 'asset';
      return 'other';
    }

    // === STATE ===
    let nodes = [];           // {id, path, name, ext, size, cat, wx, wy, wr, isDir}
    let view = { tx: 0, ty: 0, scale: 1 };
    let isDragging = false;
    let lastX = 0, lastY = 0;
    let selected = null;
    let searchTerm = '';
    let rafId = null;
    let needsRedraw = true;
    let canvas, ctx, dpr = 1;

    // Git history / DAG state (branches + commit nodes + transitions) — now from local .git only
    let commits = [];           // [{sha, parents:[], treeSha, message, date, author}]
    let branches = {};          // {name: currentSha}
    let currentSha = null;
    let graphNodes = [];        // visual {sha, wx, wy, lane, ...} for spatial DAG layout
    let graphView = { tx: 0, ty: 0, scale: 1 };
    let showGraph = false;
    let graphDragging = false;
    let graphLastX = 0, graphLastY = 0;

    // Local one-repo lock (github cli client's .git dirs in bardw)
    let selectedRepoHandle = null; // FileSystemDirectoryHandle for the SINGLE chosen repo root
    let selectedRepoName = '';

    const canvasEl = document.getElementById('map');
    const graphWrap = document.getElementById('graph-wrap');
    const graphEl = document.getElementById('graph');
    let graphCtx = null;
    const insp = document.getElementById('inspector');
    const inspName = document.getElementById('insp-name');
    const inspPath = document.getElementById('insp-path');
    const inspMeta = document.getElementById('insp-meta');
    const statusEl = document.getElementById('status');
    const searchInput = document.getElementById('search');
    const currentRefEl = document.getElementById('current-ref');
    const currentCommitEl = document.getElementById('current-commit');

    function setStatus(msg) { statusEl.textContent = msg; }

    // === HIGH-DPI + RESIZE (responsive) ===
    function resizeCanvas() {
      const rect = canvasEl.getBoundingClientRect();
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvasEl.width = Math.floor(rect.width * dpr);
      canvasEl.height = Math.floor(rect.height * dpr);
      canvasEl.style.width = rect.width + 'px';
      canvasEl.style.height = rect.height + 'px';
      ctx = canvasEl.getContext('2d', { alpha: true });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px
      needsRedraw = true;
    }

    function fitViewToNodes() {
      if (!nodes.length) { view = { tx: 0, ty: 0, scale: 1 }; return; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        const r = n.wr || 0.02;
        minX = Math.min(minX, n.wx - r);
        minY = Math.min(minY, n.wy - r);
        maxX = Math.max(maxX, n.wx + r);
        maxY = Math.max(maxY, n.wy + r);
      }
      const pad = 0.08;
      const w = Math.max(0.01, maxX - minX + pad * 2);
      const h = Math.max(0.01, maxY - minY + pad * 2);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const rect = canvasEl.getBoundingClientRect();
      const availW = rect.width || 800;
      const availH = rect.height || 600;
      const s = Math.min(availW / (w * 1.1), availH / (h * 1.1));
      view.scale = Math.max(0.2, Math.min(18, s));
      view.tx = availW * 0.5 - cx * view.scale;
      view.ty = availH * 0.5 - cy * view.scale;
      needsRedraw = true;
    }

    // === LAYOUT (simple clustered spatial distribution — deterministic jitter) ===
    function hashStr(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) / 4294967296;
    }

    function buildNodesFromTree(treeItems) {
      // treeItems: array from GitHub {path, type, size?}
      const out = [];
      const dirCenters = new Map(); // top-level dir -> {x,y}

      // top-level provinces (rough 3x3-ish grid for organic feel)
      function topCenter(name) {
        if (dirCenters.has(name)) return dirCenters.get(name);
        const h = hashStr(name);
        const col = Math.floor(h * 3);
        const row = Math.floor((h * 7) % 3);
        const cx = 0.15 + col * 0.28 + (hashStr(name + 'x') - 0.5) * 0.06;
        const cy = 0.18 + row * 0.26 + (hashStr(name + 'y') - 0.5) * 0.05;
        const c = { x: Math.max(0.08, Math.min(0.92, cx)), y: Math.max(0.1, Math.min(0.9, cy)) };
        dirCenters.set(name, c);
        return c;
      }

      for (const item of treeItems) {
        if (item.type !== 'blob' && item.type !== 'tree') continue;
        const parts = item.path.split('/');
        const name = parts[parts.length - 1];
        const ext = name.includes('.') ? name.split('.').pop() : '';
        const isDir = item.type === 'tree';
        const size = item.size || (isDir ? 0 : 120 + Math.floor(hashStr(item.path) * 2400));

        let top = parts[0] || 'root';
        const center = topCenter(top);

        // inner offset within province (deterministic jitter)
        const h = hashStr(item.path + 'j');
        const jr = isDir ? 0.045 : 0.028;
        const jx = (h - 0.5) * jr * 1.6;
        const jy = (hashStr(item.path + 'k') - 0.5) * jr * 1.35;

        const wx = center.x + jx;
        const wy = center.y + jy;

        // radius: larger files bigger, dirs medium
        let wr = isDir ? 0.018 : Math.max(0.006, Math.sqrt(Math.max(40, size)) * 0.0018);
        if (isDir) wr = 0.022;

        out.push({
          id: item.path,
          path: item.path,
          name,
          ext,
          size,
          cat: catForExt(ext),
          wx, wy, wr,
          isDir
        });
      }

      // sort: dirs first then small-to-large for draw order
      out.sort((a, b) => (a.isDir === b.isDir ? a.size - b.size : a.isDir ? -1 : 1));
      return out;
    }

    // Synthetic demo tree (instant, no network)
    function makeDemoNodes() {
      const demo = [
        { path: 'src', type: 'tree', size: 0 },
        { path: 'src/main.js', type: 'blob', size: 1840 },
        { path: 'src/canvas.js', type: 'blob', size: 620 },
        { path: 'src/layout.js', type: 'blob', size: 410 },
        { path: 'src/utils.js', type: 'blob', size: 290 },
        { path: 'README.md', type: 'blob', size: 1240 },
        { path: 'package.json', type: 'blob', size: 380 },
        { path: 'docs', type: 'tree', size: 0 },
        { path: 'docs/guide.md', type: 'blob', size: 780 },
        { path: 'docs/examples', type: 'tree', size: 0 },
        { path: 'docs/examples/basic.html', type: 'blob', size: 2100 },
        { path: 'assets', type: 'tree', size: 0 },
        { path: 'assets/logo.svg', type: 'blob', size: 540 },
        { path: 'assets/icon.png', type: 'blob', size: 3120 },
        { path: '.github', type: 'tree', size: 0 },
        { path: '.github/workflows/ci.yml', type: 'blob', size: 320 },
      ];
      return buildNodesFromTree(demo);
    }

    // === LOCAL FS (one repo at a time from bardw gh CLI .git clones) + full-window picker ===
    async function selectOneLocalRepo() {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        // Lock to exactly one (clear any prior)
        selectedRepoHandle = dirHandle;
        selectedRepoName = dirHandle.name || 'selected-repo';
        setStatus('loading local .git for ' + selectedRepoName + ' …');

        // Hide the picker prompt (entire window now belongs to the viz)
        const prompt = document.getElementById('picker-prompt');
        if (prompt) prompt.style.display = 'none';

        await loadLocalRepo(dirHandle);
        // Show graph by default for branches + nodes (or keep toggle)
        showGraph = true;
        const gw = document.getElementById('graph-wrap');
        if (gw) gw.style.display = 'block';
        initGraphCanvas();
        if (graphCtx) drawGraph();
        draw();
      } catch (e) {
        setStatus('picker cancelled or failed: ' + (e && e.message ? e.message : e));
      }
    }

    async function loadLocalRepo(rootHandle) {
      // Parse the one selected local repo's .git for branches/nodes/transitions + working tree for file spatial
      // This replaces all remote GitHub API usage
      if (!rootHandle) return;

      // 1. Try to get .git handle (repo root or the .git dir itself)
      let gitHandle;
      try {
        gitHandle = await rootHandle.getDirectoryHandle('.git');
      } catch {
        // user may have picked the .git dir directly
        gitHandle = rootHandle;
      }

      // 2. Branches from refs (text files)
      branches = {};
      try {
        const heads = await gitHandle.getDirectoryHandle('refs').then(h => h.getDirectoryHandle('heads'));
        for await (const [name, h] of heads.entries()) {
          if (h.kind === 'file') {
            const f = await h.getFile();
            const sha = (await f.text()).trim();
            if (sha) branches[name] = sha;
          }
        }
      } catch (e) { /* no heads or permission nuance */ }

      // HEAD
      let headSha = null;
      try {
        const headFile = await (await gitHandle.getFileHandle('HEAD')).getFile();
        const headText = (await headFile.text()).trim();
        if (headText.startsWith('ref:')) {
          const refPath = headText.slice(5).trim();
          // try to resolve
          const parts = refPath.split('/');
          let cur = await gitHandle.getDirectoryHandle('refs');
          for (let i=2; i<parts.length; i++) { // refs/heads/...
            cur = await cur.getDirectoryHandle(parts[i]);
          }
          const f = await (await cur.getFileHandle(parts[parts.length-1])).getFile();
          headSha = (await f.text()).trim();
        } else {
          headSha = headText;
        }
      } catch {}

      // 3. Commit nodes + transitions from .git/logs (the "complex git transitions" the objects undergo)
      commits = [];
      const logPaths = ['logs/HEAD'];
      Object.keys(branches).forEach(b => logPaths.push('logs/refs/heads/' + b));
      const seen = new Set();
      for (const lp of logPaths) {
        try {
          const parts = lp.split('/');
          let h = gitHandle;
          for (let i=0; i<parts.length-1; i++) h = await h.getDirectoryHandle(parts[i]);
          const lf = await (await h.getFileHandle(parts[parts.length-1])).getFile();
          const txt = await lf.text();
          const lines = txt.trim().split(/\r?\n/);
          for (const line of lines) {
            // format: oldsha newsha ... subject
            const m = line.match(/^([0-9a-f]{40})\s+([0-9a-f]{40})\s+.*?\s+(.*)$/);
            if (!m) continue;
            const [, oldS, newS, rest] = m;
            if (seen.has(newS)) continue;
            seen.add(newS);
            const msg = (rest || '').split('\t').pop() || 'commit';
            commits.push({ sha: newS, parents: oldS && oldS !== '0000000000000000000000000000000000000000' ? [oldS] : [], treeSha: null, message: msg.slice(0,60), date: null, author: '' });
          }
        } catch {}
      }
      if (!commits.length && headSha) {
        // minimal fallback node
        commits.push({ sha: headSha, parents: [], treeSha: null, message: 'HEAD', date: null, author: '' });
      }

      // default current
      currentSha = headSha || (commits.length ? commits[commits.length-1].sha : null);
      if (currentSha && !branches['HEAD']) branches['HEAD'] = currentSha;

      // 4. File spatial from the working tree (the repo checkout under the selected dir) — one repo only
      nodes = [];
      await walkWorkingTreeForSpatial(rootHandle, '', nodes, 0);

      // 5. Build layouts
      buildNodesLayout();   // file spatial (reuse/adapt previous clustered)
      buildGraphLayout();   // DAG spatial for branches + commit nodes

      fitViewToNodes();
      if (currentSha) {
        // no treeSha in logs, but we can keep current checkout spatial
      }
      setStatus(`${selectedRepoName} • ${commits.length} commits on the reliable timeline • drag/scrub to travel`);
    }

    // Working tree walk: ONLY to know "what was added" at commits for the compounding layers.
    // NO sizes, NO byte counts, NO disk/storage details are collected or used for any visual encoding.
    async function walkWorkingTreeForSpatial(dirHandle, prefix, out, depth) {
      if (depth > 8) return; // safety
      for await (const [name, handle] of dirHandle.entries()) {
        if (name === '.git') continue;
        const path = prefix ? prefix + '/' + name : name;
        if (handle.kind === 'directory') {
          out.push({ id: path, path, name, ext: '', size: 0, cat: 'other', wx: 0, wy: 0, wr: 0.02, isDir: true }); // size field kept only as metadata placeholder (never rendered)
          await walkWorkingTreeForSpatial(handle, path, out, depth+1);
        } else {
          try {
            const f = await handle.getFile();
            // size deliberately ignored for the compounding timeline viz
            const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
            out.push({ id: path, path, name, ext, size: 0, cat: catForExt(ext), wx: 0, wy: 0, wr: 0, isDir: false });
          } catch {}
        }
      }
    }

    function buildNodesLayout() {
      // Lightweight positions for any supporting file nodes (for "what was added" metadata only).
      // No size-based radii or storage encoding. Pure presence for the timeline layers.
      const dirCenters = new Map();
      function topCenter(name) {
        if (dirCenters.has(name)) return dirCenters.get(name);
        const h = hashStr(name);
        const col = Math.floor(h * 3);
        const row = Math.floor((h * 7) % 3);
        const c = { x: 0.15 + col * 0.28, y: 0.18 + row * 0.26 };
        dirCenters.set(name, c);
        return c;
      }
      nodes.forEach(n => {
        const top = (n.path.split('/')[0] || 'root');
        const c = topCenter(top);
        const h = hashStr(n.path + 'j');
        const jr = n.isDir ? 0.04 : 0.025;
        n.wx = c.x + (h - 0.5) * jr * 1.5;
        n.wy = c.y + (hashStr(n.path + 'k') - 0.5) * jr * 1.2;
        n.wr = n.isDir ? 0.018 : 0.012; // fixed small presence markers; no sqrt(size)
      });
    }

    // === GIT HISTORY / BRANCHES / NODES / TRANSITIONS (local .git version) ===
    function initGraphCanvas() {
      if (!graphEl) return;
      const rect = graphEl.getBoundingClientRect();
      const gdpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      graphEl.width = Math.floor(rect.width * gdpr) || 420;
      graphEl.height = Math.floor(rect.height * gdpr) || 220;
      graphCtx = graphEl.getContext('2d', { alpha: true });
      graphCtx.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    }

    async function fetchGitHistory(owner, repo) {
      // Fetch recent commits (with parents + tree sha) + branches for real DAG + ref state
      try {
        const [commitsRes, branchesRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=80`, { headers: { 'Accept': 'application/vnd.github.v3+json' } }),
          fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers: { 'Accept': 'application/vnd.github.v3+json' } })
        ]);
        if (!commitsRes.ok) throw new Error('commits fetch failed (rate limit or private?)');
        const rawCommits = await commitsRes.json();
        const rawBranches = branchesRes.ok ? await branchesRes.json() : [];

        commits = rawCommits.map(c => ({
          sha: c.sha,
          parents: (c.parents || []).map(p => p.sha),
          treeSha: c.commit && c.commit.tree ? c.commit.tree.sha : null,
          message: (c.commit && c.commit.message || '').split('\n')[0].slice(0, 60),
          date: c.commit && c.commit.author ? c.commit.author.date : null,
          author: c.commit && c.commit.author ? c.commit.author.name : ''
        })).reverse(); // oldest first for layout

        branches = {};
        rawBranches.forEach(b => { branches[b.name] = b.commit.sha; });

        // default current to default branch tip or first
        const defaultBranch = rawBranches.find(b => b.name === 'main' || b.name === 'master') || rawBranches[0];
        currentSha = defaultBranch ? defaultBranch.commit.sha : (commits[commits.length-1] ? commits[commits.length-1].sha : null);

        buildGraphLayout();
        updateCurrentCommit(currentSha, false);
        if (currentRefEl) currentRefEl.textContent = Object.keys(branches).length ? Object.keys(branches)[0] : '';
        setStatus(`${commits.length} commits • ${Object.keys(branches).length} branches`);
      } catch (e) {
        setStatus('history: ' + e.message + ' (using demo)');
        // demo graph data
        commits = [
          {sha:'a1', parents:[], treeSha:'t1', message:'init', date:null, author:'demo'},
          {sha:'a2', parents:['a1'], treeSha:'t2', message:'add canvas', date:null, author:'demo'},
          {sha:'a3', parents:['a2'], treeSha:'t3', message:'add legend', date:null, author:'demo'},
          {sha:'m1', parents:['a3','b1'], treeSha:'tm', message:'merge feature', date:null, author:'demo'}
        ];
        branches = { main: 'm1', feature: 'a3' };
        currentSha = 'm1';
        buildGraphLayout();
        updateCurrentCommit(currentSha, false);
      }
    }

    function buildGraphLayout() {
      // Simple spatial 2D DAG layout: columns (lanes) for parallel branches, y = reverse chrono
      graphNodes = [];
      const shaToNode = {};
      const laneAlloc = []; // active lanes

      // topo-ish order (commits are oldest first)
      commits.forEach((c, idx) => {
        let lane = 0;
        // prefer parent's lane or find free
        if (c.parents.length > 0) {
          const pNode = shaToNode[c.parents[0]];
          if (pNode) lane = pNode.lane;
        }
        // simple collision avoid for multiple parents / branches
        while (laneAlloc[lane] && laneAlloc[lane] > idx - 3) lane++;
        laneAlloc[lane] = idx;

        const wx = 0.12 + lane * 0.18 + (hashStr(c.sha) - 0.5) * 0.03; // slight jitter for "spatial" organic
        const wy = 0.1 + (idx / Math.max(1, commits.length - 1)) * 0.78;

        const gnode = {
          sha: c.sha,
          wx, wy,
          lane,
          parents: c.parents,
          message: c.message,
          isMerge: c.parents.length > 1
        };
        graphNodes.push(gnode);
        shaToNode[c.sha] = gnode;
      });

      // fit graph view
      graphView = { tx: 20, ty: 10, scale: 1.0 };
    }

    function drawGraph() {
      if (!graphCtx || !graphNodes.length) return;
      const w = graphEl.width / (window.devicePixelRatio || 1);
      const h = graphEl.height / (window.devicePixelRatio || 1);

      graphCtx.fillStyle = 'rgba(23,21,13,0.95)';
      graphCtx.fillRect(0, 0, w, h);

      const gscale = graphView.scale;
      const gtx = graphView.tx;
      const gty = graphView.ty;

      function g2s(wx, wy) {
        return { x: wx * 380 * gscale + gtx, y: wy * 180 * gscale + gty };
      }

      // edges first (parent links)
      graphCtx.strokeStyle = THEME.line;
      graphCtx.lineWidth = 1.2;
      graphNodes.forEach(gn => {
        gn.parents.forEach(pSha => {
          const p = graphNodes.find(x => x.sha === pSha);
          if (!p) return;
          const a = g2s(p.wx, p.wy);
          const b = g2s(gn.wx, gn.wy);
          graphCtx.beginPath();
          graphCtx.moveTo(a.x, a.y);
          graphCtx.lineTo(b.x, b.y);
          graphCtx.stroke();
        });
      });

      // nodes + branch tags
      graphNodes.forEach(gn => {
        const s = g2s(gn.wx, gn.wy);
        const isCurrent = gn.sha === currentSha;
        const isTip = Object.values(branches).includes(gn.sha);

        // node
        graphCtx.fillStyle = gn.isMerge ? '#a88bc4' : (isCurrent ? THEME.accentStrong : THEME.accent);
        graphCtx.beginPath();
        graphCtx.arc(s.x, s.y, isCurrent ? 7 : (isTip ? 6 : 4.5), 0, Math.PI * 2);
        graphCtx.fill();
        graphCtx.strokeStyle = isCurrent ? '#fff' : THEME.line;
        graphCtx.lineWidth = isCurrent ? 2 : 1;
        graphCtx.stroke();

        // short sha label
        graphCtx.fillStyle = THEME.text;
        graphCtx.font = '10px Inter, sans-serif';
        graphCtx.fillText(gn.sha.slice(0,7), s.x + 9, s.y + 3);

        // branch tags (the "branches" part)
        Object.entries(branches).forEach(([name, sha]) => {
          if (sha !== gn.sha) return;
          graphCtx.fillStyle = THEME.accentStrong;
          graphCtx.fillText(name, s.x + 9, s.y - 8);
        });
      });
    }

    function worldToScreenGraph(wx, wy) {
      // reuse for hit test on graph
      const gdpr = (window.devicePixelRatio || 1);
      const gw = graphEl.width / gdpr;
      const gh = graphEl.height / gdpr;
      return {
        x: wx * 380 * graphView.scale + graphView.tx,
        y: wy * 180 * graphView.scale + graphView.ty
      };
    }

    function hitGraph(sx, sy) {
      for (const gn of graphNodes) {
        const s = worldToScreenGraph(gn.wx, gn.wy);
        if (Math.hypot(s.x - sx, s.y - sy) < 12) return gn;
      }
      return null;
    }

    async function updateCurrentCommit(sha, doTransition = true) {
      if (!sha) return;
      currentSha = sha;
      if (currentCommitEl) currentCommitEl.textContent = sha.slice(0,7);

      // Pipe into control panel + sync spatial file map to this commit's tree
      const c = commits.find(x => x.sha === sha);
      if (c && c.treeSha) {
        try {
          const treeRes = await fetch(`https://api.github.com/repos/${document.getElementById('repo').value.trim()}/git/trees/${c.treeSha}?recursive=1`);
          if (treeRes.ok) {
            const tdata = await treeRes.json();
            nodes = buildNodesFromTree(tdata.tree || []);
            fitViewToNodes();
          }
        } catch(e) { /* keep previous spatial */ }
      }
      if (doTransition) {
        // visual "transition" feedback
        setStatus('transition → ' + sha.slice(0,7));
        setTimeout(() => setStatus(`${nodes.length} items • graph at ${currentSha ? currentSha.slice(0,7) : ''}`), 1400);
      }
      scheduleDraw();
      if (graphCtx) drawGraph();
    }

    function stepCommit(delta) {
      if (!commits.length || !currentSha) return;
      const idx = commits.findIndex(c => c.sha === currentSha);
      let nextIdx = Math.max(0, Math.min(commits.length-1, idx + delta));
      updateCurrentCommit(commits[nextIdx].sha, true);
    }

    function replayHistory() {
      if (!commits.length) return;
      let i = 0;
      const timer = setInterval(() => {
        if (i >= commits.length) { clearInterval(timer); return; }
        updateCurrentCommit(commits[i].sha, true);
        // also advance a branch visually for transition demo
        if (Object.keys(branches).length) {
          const bname = Object.keys(branches)[0];
          branches[bname] = commits[i].sha;
        }
        i++;
        if (graphCtx) drawGraph();
      }, 420);
    }

    function simulateCommit() {
      // Demonstrates "complex git transitions the actual objects undergo"
      if (!currentSha || !commits.length) return;
      const parent = currentSha;
      const newSha = 'sim' + Math.random().toString(16).slice(2, 9);
      const newTree = 't' + Math.random().toString(16).slice(2, 9);

      // create new commit object
      const newC = {
        sha: newSha,
        parents: [parent],
        treeSha: newTree,
        message: 'sim: change ' + (nodes[0] ? nodes[0].name : 'file'),
        date: new Date().toISOString(),
        author: 'you'
      };
      commits.push(newC);

      // "create" objects in ledger sense + advance branch
      const bnames = Object.keys(branches);
      const bname = bnames.length ? bnames[0] : 'main';
      branches[bname] = newSha;
      currentSha = newSha;

      buildGraphLayout();

      updateCurrentCommit(newSha, true);

      // ledger / object creation feedback (in status + inspector for short text)
      // This is a visual "what if this commit happened" addition to the compounding layers.
      const ledgerMsg = `sim addition at ${newSha.slice(0,7)} • branch ${bname} advanced`;
      setStatus(ledgerMsg);
      if (insp && !insp.classList.contains('open')) {
        inspName.textContent = 'Simulated addition';
        inspPath.textContent = ledgerMsg;
        inspMeta.textContent = 'a new layer would be added to the mess';
        insp.classList.add('open');
      }
      if (graphCtx) drawGraph();
    }

    function toggleGraph() {
      showGraph = !showGraph;
      if (graphWrap) graphWrap.style.display = showGraph ? 'block' : 'none';
      if (showGraph) {
        initGraphCanvas();
        if (graphCtx) drawGraph();
      }
    }

    // === COMPOUNDING TIMELINE RENDER (the reliable "time machine") ===
    // Full-window primary graphic. No sizes. Each commit from the logs "adds" persistent visual elements
    // that accumulate toward the present, making the compounded mess visible at the right/current end.
    function worldToScreen(wx, wy) {
      return {
        x: wx * view.scale + view.tx,
        y: wy * view.scale + view.ty
      };
    }

    // === COMPOUNDING CURVED TIMELINE (single scaled curve weaving reason through chaos) ===
    // One elegant curve spans the full window. t [0..1] from logs order (oldest first).
    // Curve can be "scaled" (more waves or non-linear t) if necessary to compress dense history.
    // Main curve = the "reason" (coherent thread).
    // Individual commits are slightly offset "chaos" markers.
    // Short curved "weave" stitches pull each chaotic commit back into the main reason curve.
    // As t grows, more additions (small persistent dots/strands) accumulate around the curve,
    // creating visible density "mess" that the reason curve weaves through.
    // No sizes. Full compression into one visual narrative line.

    function getTimelineCurvePoint(t, w, h) {
      // t: 0 (oldest) .. 1 (newest/present)
      // Single smooth curve across the canvas.
      // Gentle waves that increase in frequency toward the end (compression for dense recent history if needed).
      // x linear, y = center + amplitude * sin( phase )
      const startX = 50;
      const endX = w - 50;
      const cx = startX + t * (endX - startX);
      const cy = h * 0.5;

      // Number of weaves increases with t for "scaled if necessary" compression + weaving feel
      const waveCount = 1.5 + t * 4.0;   // more curves later to pack/compress commits
      const amp = Math.min(80, h * 0.18) * (0.6 + 0.4 * Math.sin(t * Math.PI)); // breathing amplitude

      const y = cy + Math.sin(t * waveCount * Math.PI * 2) * amp;

      return { x: cx, y };
    }

    function draw() {
      if (!ctx) return;
      const w = canvasEl.width / dpr;
      const h = canvasEl.height / dpr;

      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, w, h);

      if (!commits || commits.length === 0) {
        ctx.fillStyle = THEME.muted;
        ctx.font = '16px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('pick a local repo dir to see its commit time machine', w/2, h/2);
        needsRedraw = false;
        return;
      }

      const n = commits.length;

      // Draw the single main "reason" curve (thick, elegant)
      ctx.strokeStyle = THEME.accent;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= 120; i++) {  // sample the curve smoothly
        const t = i / 120;
        const p = getTimelineCurvePoint(t, w, h);
        if (first) {
          ctx.moveTo(p.x, p.y);
          first = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      // Optional subtle "mess ribbon" that thickens with t (compounded chaos the reason weaves through)
      ctx.strokeStyle = 'rgba(194,163,52,0.25)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      first = true;
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const p = getTimelineCurvePoint(t, w, h);
        // fatten the ribbon toward present
        const fat = 8 + t * 22;
        if (first) {
          ctx.moveTo(p.x, p.y);
          first = false;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      // Now place commits and their "weave" connections
      const isDense = n > 120;
      const labelEvery = Math.max(1, Math.floor(n / (isDense ? 12 : 6)));

      for (let i = 0; i < n; i++) {
        const c = commits[i];
        const t = i / (n - 1 || 1);

        const mainP = getTimelineCurvePoint(t, w, h);

        const isCurrent = c.sha === currentSha;
        const isMatch = searchTerm && (c.message.toLowerCase().includes(searchTerm) || c.sha.includes(searchTerm));

        // Slight perpendicular offset for "chaos" (individual commit feels a bit off the main reason)
        // Use a hash for stable but varied weave
        const chaos = (hashStr(c.sha) - 0.5) * (isDense ? 18 : 28);
        const perpX = -Math.sin(t * 5) * chaos * 0.6; // gentle side offset
        const perpY = Math.cos(t * 5) * chaos * 0.6;

        const chaosX = mainP.x + perpX;
        const chaosY = mainP.y + perpY;

        // Commit marker (slightly off main curve = chaos)
        ctx.fillStyle = isCurrent ? THEME.accentStrong : (isMatch ? THEME.accent : THEME.muted);
        ctx.beginPath();
        ctx.arc(chaosX, chaosY, isCurrent ? 5.5 : (isMatch ? 4.5 : 3), 0, Math.PI * 2);
        ctx.fill();

        // "Weave stitch": short curved line from the chaotic commit position back to the main reason curve
        // This visually "weaves together reason through the chaos"
        ctx.strokeStyle = isCurrent || isMatch ? THEME.accentStrong : 'rgba(224,190,62,0.6)';
        ctx.lineWidth = isCurrent ? 2.2 : 1.1;
        ctx.beginPath();
        ctx.moveTo(chaosX, chaosY);
        // quadratic curve toward mainP (the "pull" of reason)
        const midX = (chaosX + mainP.x) * 0.5 + (mainP.y - chaosY) * 0.15; // slight bow for weave
        const midY = (chaosY + mainP.y) * 0.5 + (chaosX - mainP.x) * 0.15;
        ctx.quadraticCurveTo(midX, midY, mainP.x, mainP.y);
        ctx.stroke();

        // Persistent additions around the curve (the compounding mess the reason is weaving through)
        // More additions as t increases (history accumulates)
        const addCount = Math.max(1, Math.min(6, Math.floor(1 + t * 5)));
        for (let a = 0; a < addCount; a++) {
          const at = t + (a - addCount * 0.5) * 0.003; // very local spread along curve
          const ap = getTimelineCurvePoint(Math.min(1, Math.max(0, at)), w, h);
          const off = (hashStr(c.sha + a) - 0.5) * (12 + t * 18); // growing chaos cloud
          const ax = ap.x + Math.sin(a + i) * off * 0.7;
          const ay = ap.y + Math.cos(a + i) * off * 0.5;

          ctx.fillStyle = isMatch ? THEME.accent : 'rgba(194,163,52,0.65)';
          ctx.beginPath();
          ctx.arc(ax, ay, 1.6 + t * 1.2, 0, Math.PI * 2); // additions get a bit "larger" visually as mess compounds
          ctx.fill();
        }

        // Very short labels (dyslexia-friendly, LOD)
        if (isCurrent || isMatch || (i % labelEvery === 0)) {
          ctx.fillStyle = THEME.text;
          ctx.font = (isCurrent ? '600 ' : '500 ') + '9.5px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          const short = (c.message || c.sha.slice(0,7)).slice(0, 16);
          // place label near the weave, slightly off to avoid clutter
          ctx.fillText(short, chaosX, chaosY - 10);
        }
      }

      // "Present — the compounded mess the reason curve has woven through" (short)
      const endP = getTimelineCurvePoint(1, w, h);
      ctx.fillStyle = THEME.accentStrong;
      ctx.font = '10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('now — reason woven through the accumulated chaos', endP.x + 12, endP.y + 4);

      // Subtle status
      if (searchTerm) {
        const matches = commits.filter(c => c.message.toLowerCase().includes(searchTerm) || c.sha.includes(searchTerm)).length;
        setStatus(`${matches} match${matches === 1 ? '' : 'es'} • drag/scrub the curved timeline`);
      } else {
        setStatus(`${commits.length} commits • single curved timeline (weaves reason through the chaos)`);
      }

      needsRedraw = false;
    }

    function scheduleDraw() {
      needsRedraw = true;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (needsRedraw) draw();
        if (showGraph && graphCtx) drawGraph();
      });
    }

    // === INTERACTION (highly responsive, direct) ===
    function screenToWorld(sx, sy) {
      return {
        wx: (sx - view.tx) / view.scale,
        wy: (sy - view.ty) / view.scale
      };
    }

    function hitTest(sx, sy) {
      const { wx, wy } = screenToWorld(sx, sy);
      let best = null;
      let bestDist = Infinity;
      for (const n of nodes) {
        const dx = n.wx - wx;
        const dy = n.wy - wy;
        const dist = Math.hypot(dx, dy);
        const r = (n.wr || 0.015) * 1.6; // generous hit for dyslexia (large targets)
        if (dist < r && dist < bestDist) {
          bestDist = dist;
          best = n;
        }
      }
      return best;
    }

    function updateInspector(n) {
      selected = n;
      if (!n) {
        insp.classList.remove('open');
        return;
      }
      inspName.textContent = n.name + (n.isDir ? ' /' : '');
      inspPath.textContent = n.path;
      const kb = n.size >= 1024 ? (n.size / 1024).toFixed(1) + ' KB' : n.size + ' B';
      inspMeta.textContent = `${kb} • ${n.cat} • ${n.isDir ? 'directory' : 'file'} • click map or press Esc to close`;
      insp.classList.add('open');
      needsRedraw = true;
      draw();
    }

    function resetView() {
      fitViewToNodes();
      draw();
    }

    function zoomAt(clientX, clientY, factor) {
      const rect = canvasEl.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;

      const before = screenToWorld(cx, cy);
      view.scale = Math.max(0.15, Math.min(42, view.scale * factor));
      const after = screenToWorld(cx, cy);

      view.tx += (after.wx - before.wx) * view.scale;
      view.ty += (after.wy - before.wy) * view.scale;
      scheduleDraw();
    }

    function attachEvents() {
      // Pointer drag (mouse + touch unified)
      canvasEl.addEventListener('pointerdown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvasEl.setPointerCapture(e.pointerId);
      });
      window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        view.tx += dx;
        view.ty += dy;
        lastX = e.clientX;
        lastY = e.clientY;
        scheduleDraw();
      });
      window.addEventListener('pointerup', (e) => {
        if (isDragging) {
          isDragging = false;
          try { canvasEl.releasePointerCapture(e.pointerId); } catch {}
        }
      });

      // Wheel zoom (centered)
      canvasEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        zoomAt(e.clientX, e.clientY, factor);
      }, { passive: false });

      // Click / tap inspect
      canvasEl.addEventListener('click', (e) => {
        const rect = canvasEl.getBoundingClientRect();
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        updateInspector(hit);
      });

      // Keyboard (minimal, discoverable)
      window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r') { resetView(); }
        if (e.key === '/') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
        if (e.key === 'Escape') { updateInspector(null); searchInput.value = ''; searchTerm = ''; scheduleDraw(); }
        if (e.key === '+' || e.key === '=') { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.22); }
        if (e.key === '-') { zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.22); }
      });

      // Search (live, forgiving)
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value.trim().toLowerCase();
        scheduleDraw();
      });

      // Buttons for the single selected local repo (minimal; many are now keyboard or status-driven for full-window)
      const closeInsp = document.getElementById('close-insp');
      const exportOne = document.getElementById('export-one');
      if (closeInsp) closeInsp.addEventListener('click', () => updateInspector(null));
      if (exportOne) exportOne.addEventListener('click', () => {
        if (!selected) return;
        navigator.clipboard.writeText(selected.path || selected.sha || '').then(() => {
          const b = document.getElementById('export-one');
          if (b) { const old = b.textContent; b.textContent = 'copied'; setTimeout(() => { if (b) b.textContent = old; }, 700); }
        });
      });

      // History / graph for the locked repo (can be called from keys too)
      const prevBtn = document.getElementById('prev-commit');
      const nextBtn = document.getElementById('next-commit');
      const replayBtn = document.getElementById('replay');
      const simBtn = document.getElementById('simulate-commit');
      const togBtn = document.getElementById('toggle-graph');
      if (prevBtn) prevBtn.addEventListener('click', () => stepCommit(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => stepCommit(1));
      if (replayBtn) replayBtn.addEventListener('click', () => replayHistory());
      if (simBtn) simBtn.addEventListener('click', () => simulateCommit());
      if (togBtn) togBtn.addEventListener('click', () => toggleGraph());

      // Graph canvas interactions (drag pan + click nodes for selection/transition)
      if (graphEl) {
        graphEl.addEventListener('pointerdown', (e) => {
          graphDragging = true;
          graphLastX = e.clientX;
          graphLastY = e.clientY;
          graphEl.setPointerCapture(e.pointerId);
        });
        window.addEventListener('pointermove', (e) => {
          if (!graphDragging) return;
          graphView.tx += e.clientX - graphLastX;
          graphView.ty += e.clientY - graphLastY;
          graphLastX = e.clientX;
          graphLastY = e.clientY;
          if (graphCtx) drawGraph();
        });
        window.addEventListener('pointerup', (e) => {
          if (graphDragging) {
            graphDragging = false;
            try { graphEl.releasePointerCapture(e.pointerId); } catch {}
          }
        });
        graphEl.addEventListener('click', (e) => {
          const rect = graphEl.getBoundingClientRect();
          const hit = hitGraph(e.clientX - rect.left, e.clientY - rect.top);
          if (hit) updateCurrentCommit(hit.sha, true);
        });
        graphEl.addEventListener('wheel', (e) => {
          e.preventDefault();
          const f = e.deltaY < 0 ? 1.15 : 1/1.15;
          graphView.scale = Math.max(0.4, Math.min(3.5, graphView.scale * f));
          if (graphCtx) drawGraph();
        }, {passive:false});
      }

      // Global export list (plain text — dyslexia linear fallback)
      const exportBtn = document.createElement('button');
      exportBtn.className = 'secondary';
      exportBtn.style.cssText = 'position:absolute; bottom:12px; left:50%; transform:translateX(-50%); padding:5px 11px; font-size:0.7rem; z-index:12;';
      exportBtn.textContent = 'export list (plain)';
      exportBtn.onclick = () => {
        if (!nodes.length) return;
        const lines = nodes
          .sort((a, b) => a.path.localeCompare(b.path))
          .map(n => (n.isDir ? '📁 ' : '  ') + n.path + (n.size ? `  (${Math.round(n.size / 1024 * 10) / 10} KB)` : ''));
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'repo-list.txt';
        a.click();
      };
      document.querySelector('main').appendChild(exportBtn);

      // Resize
      const ro = new ResizeObserver(() => {
        resizeCanvas();
        if (nodes.length) fitViewToNodes(); // keep overview nice
        scheduleDraw();
      });
      ro.observe(canvasEl);
      window.addEventListener('resize', () => { resizeCanvas(); scheduleDraw(); });
    }

    // Remote loadRepo completely removed (plan: only local gh CLI .git in bardw, one repo at a time).
    // All data now comes from the FS picker + local .git/logs + working tree walk (see selectOneLocalRepo / loadLocalRepo above).
    async function loadRepo(_unused) { /* no-op for compatibility during edits */ }

    // === BOOT ===
    function boot() {
      canvas = canvasEl;
      ctx = canvas.getContext('2d');

      // Full-window from the very first pixel
      const fitFull = () => {
        canvasEl.style.width = '100vw';
        canvasEl.style.height = '100vh';
        resizeCanvas();
        if (graphEl) {
          const gw = document.getElementById('graph-wrap');
          if (gw && showGraph) {
            // graph overlay keeps its % size but we refit its backing store
            initGraphCanvas();
          }
        }
      };
      fitFull();

      // Graph init (still available as overlay for branches + nodes)
      if (graphEl) initGraphCanvas();

      // Start with synthetic so something beautiful is visible in the full window immediately
      nodes = makeDemoNodes();
      fitViewToNodes();
      draw();

      attachEvents();

      // Show the centered picker prompt (user must pick exactly one local bardw gh clone dir)
      const prompt = document.getElementById('picker-prompt');
      const pickBtn = document.getElementById('pick-btn');
      if (pickBtn) pickBtn.addEventListener('click', () => selectOneLocalRepo());

      // On first load we also prepare demo DAG so the graph layer (when toggled) has data
      // (the real data will come from the local picker + .git/logs)
      fetchGitHistory('demo', 'demo').then(() => {
        if (graphCtx && showGraph) drawGraph();
      });

      // Polite one-line hint (short, dyslexia-friendly)
      setTimeout(() => {
        if (prompt && prompt.style.display !== 'none') {
          setStatus('click the button to pick exactly one local repo dir — the viz will fill the entire window');
        }
      }, 1800);

      // Resize always keeps full window
      window.addEventListener('resize', () => {
        fitFull();
        if (graphCtx && showGraph) drawGraph();
      });

      // Expose (for the one locked repo)
      window.intuitree = { getNodes: () => nodes, fit: resetView, view, getCommits: () => commits, getBranches: () => branches, current: () => currentSha, selectRepo: selectOneLocalRepo };
    }

    boot();
  
