/**
 * File-tree derivation from RepoSnapshot.files[] — shared by radial-onion and the
 * directory panel so both surfaces project the same SSOT (docs/ARCHITECTURE.md §2.1).
 * Paths are repo-relative, `/`-joined. The empty path '' is always the synthetic root.
 */

/** @typedef {{ id: string, path: string, name: string, ext: string, isDir: boolean, children: TreeNode[] }} TreeNode */

/**
 * Build a path→node Map from a flat files[] list. Intermediate directories are created
 * as needed when only files are present (local-git already emits dir entries).
 * @param {Array<{path: string, name?: string, ext?: string, isDir?: boolean, id?: string}>} files
 * @returns {Map<string, TreeNode>}
 */
export function buildTree(files) {
  const tree = new Map();
  tree.set('', { id: '', path: '', name: 'repo', ext: '', isDir: true, children: [] });

  const ensure = (path, isDir) => {
    if (tree.has(path)) {
      const n = tree.get(path);
      if (isDir) n.isDir = true;
      return n;
    }
    const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
    const ext = isDir || !name.includes('.') ? '' : name.split('.').pop().toLowerCase();
    const node = { id: path, path, name, ext, isDir: !!isDir, children: [] };
    tree.set(path, node);
    return node;
  };

  // Create every path segment so partial parents exist before we wire children.
  for (const f of files || []) {
    if (!f || !f.path) continue;
    const parts = f.path.split('/').filter(Boolean);
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      const isLeaf = i === parts.length - 1;
      const isDir = isLeaf ? !!f.isDir : true;
      ensure(acc, isDir);
      if (isLeaf && f.name) tree.get(acc).name = f.name;
      if (isLeaf && f.ext != null) tree.get(acc).ext = f.ext;
      if (isLeaf && f.id) tree.get(acc).id = f.id;
    }
  }

  // Wire parent→child once (stable, alphabetical dirs-first then files).
  for (const [path, node] of tree) {
    if (path === '') continue;
    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const parent = tree.get(parentPath) || tree.get('');
    if (!parent.children.includes(node)) parent.children.push(node);
  }

  for (const node of tree.values()) {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  return tree;
}

/** Parent path of a repo-relative path, or '' for top-level. */
export function parentPath(path) {
  if (!path) return null;
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}

/** Architecture layer tag for AyTree self-map (lay-of-the-land cue). */
export function layerForPath(path) {
  if (!path) return { id: 'root', label: 'root', hint: 'repo entry' };
  if (path === 'src' || path.startsWith('src/model')) return { id: 'model', label: 'model', hint: 'SSOT · RepoSnapshot' };
  if (path.startsWith('src/ingest')) return { id: 'ingest', label: 'ingest', hint: 'adapters → snapshot' };
  if (path.startsWith('src/compositor')) return { id: 'compositor', label: 'compositor', hint: 'z-stack · RAF · hits' };
  if (path.startsWith('src/lenses')) return { id: 'lenses', label: 'lenses', hint: 'base + weave overlay' };
  if (path.startsWith('src/ui')) return { id: 'ui', label: 'ui', hint: 'chrome panels' };
  if (path.startsWith('src')) return { id: 'src', label: 'src', hint: 'modular surface' };
  if (path.startsWith('server')) return { id: 'server', label: 'server', hint: 'notes · tree · git' };
  if (path.startsWith('docs/specs')) return { id: 'specs', label: 'specs', hint: 'promoted GUI contracts' };
  if (path.startsWith('docs')) return { id: 'docs', label: 'docs', hint: 'architecture corpus' };
  if (path.startsWith('legacy')) return { id: 'legacy', label: 'primary', hint: 'tree + status + notes tool' };
  if (path.startsWith('assets')) return { id: 'asset', label: 'assets', hint: 'static media' };
  if (/\.(html)$/i.test(path)) return { id: 'shell', label: 'shell', hint: 'entry surface' };
  if (path === 'README.md') return { id: 'docs', label: 'docs', hint: 'front door' };
  return { id: 'other', label: 'other', hint: '' };
}
