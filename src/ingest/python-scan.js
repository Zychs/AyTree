/**
 * Python-scan ingest adapter — client for server/aytree_server.py's recursive filesystem
 * scan (`GET /api/tree`), normalized to RepoSnapshot (docs/ARCHITECTURE.md §2.2).
 * Ported intent from fetchTreeData (legacy/index_tree.html) + sibling SCAN_ROOT shape.
 */
import { makeSnapshot } from '../model/snapshot.js';

/**
 * Fetch /api/tree and project into a RepoSnapshot.
 * @param {{ focus?: string, endpoint?: string }} [opts]
 *   focus — if set (e.g. "AyTree"), keep only that top-level child and strip its name
 *           from paths so files[] are repo-relative (matches local-git).
 *   endpoint — override URL (default `/api/tree`).
 */
export async function pickPythonScan(opts = {}) {
  const endpoint = opts.endpoint || '/api/tree';
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`python-scan: ${endpoint} returned ${res.status}`);
  }
  const root = await res.json();
  return treePayloadToSnapshot(root, opts);
}

/**
 * Normalize the nested server tree payload into RepoSnapshot.
 * Skips branch_group / branch_* / virtual_note (those belong to the primary tree tool).
 */
export function treePayloadToSnapshot(root, opts = {}) {
  let focusRoot = root;
  let repoPath = root?.name || 'workspace';
  let stripPrefix = '';

  if (opts.focus) {
    const hit = findFocusChild(root, opts.focus);
    if (hit) {
      focusRoot = hit;
      repoPath = hit.name || opts.focus;
      // Server rel_path is SCAN_ROOT-relative (e.g. "AyTree/src/foo.js"). Strip the
      // focus segment so lens paths match local-git repo-relative form.
      stripPrefix = (hit.rel_path || hit.name || opts.focus).replace(/\/$/, '');
    }
  }

  const files = [];
  const notes = {};
  flattenTree(focusRoot, files, notes, stripPrefix, true);

  const snap = makeSnapshot({
    repoPath,
    commits: [],
    files,
    branches: {},
    currentSha: null,
    scrubT: 1,
    generatedAt: new Date().toISOString(),
  });
  // notes ride alongside the SSOT fields (same convention as local-git + shell attach)
  snap.notes = notes;
  return snap;
}

function findFocusChild(root, focus) {
  if (!root || !root.children) return null;
  const want = focus.toLowerCase();
  return root.children.find((c) => {
    const name = (c.name || '').toLowerCase();
    const rel = (c.rel_path || '').toLowerCase();
    return name === want || rel === want || rel.endsWith('/' + want);
  }) || null;
}

const SKIP_TYPES = new Set(['branch_group', 'branch_local', 'branch_remote', 'virtual_note']);

function flattenTree(node, files, notes, stripPrefix, isScanRoot) {
  if (!node || SKIP_TYPES.has(node.type)) return;

  // Don't emit the scan root itself when focusing a child — children become top-level.
  if (!isScanRoot) {
    const path = normalizeRel(node.rel_path, stripPrefix);
    if (path != null && path !== '') {
      const isDir = node.type === 'directory' || node.type === 'repository';
      const name = node.name || path.split('/').pop();
      const ext = isDir || !name.includes('.') ? '' : name.split('.').pop().toLowerCase();
      files.push({ id: path, path, name, ext, isDir });
      if (node.notes || node.status) {
        notes[path] = { notes: node.notes || '', status: node.status || '' };
      }
    }
  }

  for (const child of node.children || []) {
    flattenTree(child, files, notes, stripPrefix, false);
  }
}

/** Strip scan-root prefix; return null to drop out-of-focus nodes. */
function normalizeRel(relPath, stripPrefix) {
  if (relPath == null || relPath === '' || relPath === '.') return '';
  let p = String(relPath).replace(/\\/g, '/');
  if (!stripPrefix) return p;
  if (p === stripPrefix) return '';
  if (p.startsWith(stripPrefix + '/')) return p.slice(stripPrefix.length + 1);
  // Child without matching prefix (e.g. branch keys) — drop.
  return null;
}
