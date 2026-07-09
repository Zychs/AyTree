/**
 * RepoSnapshot — the shared SSOT every lens reads. Render thread never parses .git or
 * calls a network/FS API; it only projects a snapshot. Shape derives from
 * TimelineSnapshot v1 (docs/specs/gui-timeline-compound.md), widened with a `files[]`
 * field for the spatial lens per docs/ARCHITECTURE.md §2.1.
 */

export function makeSnapshot({
  repoPath = '',
  commits = [],
  files = [],
  branches = {},
  currentSha = null,
  scrubT = 1,
  generatedAt = new Date().toISOString(),
} = {}) {
  return { repoPath, commits, files, branches, currentSha, scrubT, generatedAt };
}

/** commits[]: {sha, index, messageShort, parents, isMerge, isConflictSource} */
export function buildCommitsFromRaw(rawCommits) {
  return rawCommits.map((c, i) => ({
    sha: c.sha,
    index: i,
    messageShort: (c.message || '').slice(0, 60),
    parents: c.parents || [],
    isMerge: (c.parents || []).length > 1,
    isConflictSource: false,
  }));
}

/** Discard stale frames if the bus sends a newer snapshot version. */
export function isNewer(candidate, current) {
  if (!current) return true;
  return new Date(candidate.generatedAt) > new Date(current.generatedAt);
}

/** scrub_t (0..1) → nearest commit index, per gui-timeline-compound.md projection rules. */
export function nearestCommitIndexForT(snapshot, t) {
  const n = snapshot.commits.length;
  if (!n) return -1;
  const idx = Math.round(t * (n - 1));
  return Math.max(0, Math.min(n - 1, idx));
}
