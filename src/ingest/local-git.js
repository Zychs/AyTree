/**
 * Local-first ingest: File System Access API picker + real `.git/logs` reflog parse,
 * normalized to a RepoSnapshot. Ported from selectOneLocalRepo/loadLocalRepo/
 * walkWorkingTreeForSpatial (legacy/harvest/harvested_raw.js:203/228/326). Off-thread per
 * docs/specs/gui-worker-indexer.md is deferred — this runs on the main thread for now.
 */
import { makeSnapshot, buildCommitsFromRaw } from '../model/snapshot.js';

export async function pickLocalRepo() {
  const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  return loadLocalRepo(dirHandle);
}

export async function loadLocalRepo(rootHandle) {
  let gitHandle;
  try {
    gitHandle = await rootHandle.getDirectoryHandle('.git');
  } catch {
    gitHandle = rootHandle; // user picked the .git dir directly
  }

  const branches = await readBranches(gitHandle);
  const headSha = await readHeadSha(gitHandle);
  const rawCommits = await parseGitLogs(gitHandle, branches);
  const currentSha = headSha || (rawCommits.length ? rawCommits[rawCommits.length - 1].sha : null);

  const files = [];
  await walkWorkingTree(rootHandle, '', files, 0);

  return makeSnapshot({
    repoPath: rootHandle.name || 'repo',
    commits: buildCommitsFromRaw(rawCommits),
    files,
    branches,
    currentSha,
    scrubT: 1,
  });
}

async function readBranches(gitHandle) {
  const branches = {};
  try {
    const heads = await gitHandle.getDirectoryHandle('refs').then((h) => h.getDirectoryHandle('heads'));
    for await (const [name, h] of heads.entries()) {
      if (h.kind === 'file') {
        const f = await h.getFile();
        const sha = (await f.text()).trim();
        if (sha) branches[name] = sha;
      }
    }
  } catch {
    // no heads, or permission nuance — leave branches empty
  }
  return branches;
}

async function readHeadSha(gitHandle) {
  try {
    const headFile = await (await gitHandle.getFileHandle('HEAD')).getFile();
    const headText = (await headFile.text()).trim();
    if (!headText.startsWith('ref:')) return headText;
    const parts = headText.slice(5).trim().split('/');
    let cur = await gitHandle.getDirectoryHandle('refs');
    for (let i = 2; i < parts.length; i++) cur = await cur.getDirectoryHandle(parts[i]);
    const f = await (await cur.getFileHandle(parts[parts.length - 1])).getFile();
    return (await f.text()).trim();
  } catch {
    return null;
  }
}

const ZERO_SHA = '0000000000000000000000000000000000000000';

async function parseGitLogs(gitHandle, branches) {
  const commits = [];
  const seen = new Set();
  const logPaths = ['logs/HEAD', ...Object.keys(branches).map((b) => `logs/refs/heads/${b}`)];
  for (const lp of logPaths) {
    try {
      const parts = lp.split('/');
      let h = gitHandle;
      for (let i = 0; i < parts.length - 1; i++) h = await h.getDirectoryHandle(parts[i]);
      const lf = await (await h.getFileHandle(parts[parts.length - 1])).getFile();
      const lines = (await lf.text()).trim().split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^([0-9a-f]{40})\s+([0-9a-f]{40})\s+.*?\s+(.*)$/);
        if (!m) continue;
        const [, oldS, newS, rest] = m;
        if (seen.has(newS)) continue;
        seen.add(newS);
        const message = (rest || '').split('\t').pop() || 'commit';
        commits.push({ sha: newS, parents: oldS !== ZERO_SHA ? [oldS] : [], message: message.slice(0, 60) });
      }
    } catch {
      // reflog absent for this ref — skip
    }
  }
  return commits;
}

// Deliberately no size/byte collection — presence + structure only (no-size-encoding rule).
async function walkWorkingTree(dirHandle, prefix, out, depth) {
  if (depth > 8) return;
  for await (const [name, handle] of dirHandle.entries()) {
    if (name === '.git') continue;
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      out.push({ id: path, path, name, ext: '', isDir: true });
      await walkWorkingTree(handle, path, out, depth + 1);
    } else {
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      out.push({ id: path, path, name, ext, isDir: false });
    }
  }
}
