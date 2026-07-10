/**
 * On-screen filter state — filters what's already loaded and laid out, not repo metadata
 * browsing. Shared across lenses via compositor.filterState so switching lenses keeps the
 * same filter applied.
 */
export function createFilterState() {
  return {
    categories: new Set(['code', 'doc', 'config', 'asset', 'other']),
    showFiles: true,
    showDirs: true,
    showRegularCommits: true,
    showMergeCommits: true,
  };
}

export function matchesFileNode(state, n) {
  if (n.isDir) return state.showDirs;
  if (!state.showFiles) return false;
  return state.categories.has(n.cat);
}

export function matchesCommitNode(state, n) {
  return n.isMerge ? state.showMergeCommits : state.showRegularCommits;
}
