/**
 * AyTree local-first ingest (FS Access + .git/logs)
 * Primary for weave/spatial. No server required for core viz.
 * CR-safe: we deliberately avoid size/storage for visual encoding.
 */

export async function pickAndWalkSpatial() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  const nodes = [];
  await walk(dirHandle, '', nodes, 0);
  return { handle: dirHandle, name: dirHandle.name, nodes };
}

async function walk(dirHandle, prefix, out, depth) {
  if (depth > 7) return;
  for await (const [name, handle] of dirHandle.entries()) {
    if (name === '.git') continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      out.push({ id: path, path, name, isDir: true, wx: 0, wy: 0, wr: 0.018 });
      await walk(handle, path, out, depth + 1);
    } else {
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      out.push({ id: path, path, name, ext, isDir: false, wx: 0, wy: 0, wr: 0.012 });
    }
  }
}

// Stub for future real .git/logs parser (local only)
export async function parseGitLogs(dirHandle) {
  // In real impl: try to get .git/logs/HEAD or HEAD reflog, parse lines for sha sequence
  // For now returns demo or empty
  console.log('[AyTree] .git/logs parse stub — implement with dirHandle.getFileHandle + read text');
  return [];
}
