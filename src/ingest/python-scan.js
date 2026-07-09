/**
 * Deferred (docs/ARCHITECTURE.md §4) — not implemented this pass.
 * Client for server/aytree_server.py's recursive filesystem scan. Port target: fetchTreeData
 * (legacy/index_tree.html:615), normalized to RepoSnapshot. Requires the server running.
 */
export async function pickPythonScan() {
  throw new Error('python-scan ingest adapter not implemented yet — see docs/ARCHITECTURE.md §4');
}
