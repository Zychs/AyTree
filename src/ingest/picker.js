/**
 * Source picker + adapter dispatch. Nothing downstream of loadSnapshot() knows which
 * adapter ran — both normalize to the same RepoSnapshot (docs/ARCHITECTURE.md §2.2).
 * Adapters: `local-git` (FS Access + .git/logs), `python-scan` (GET /api/tree).
 */
import { pickLocalRepo } from './local-git.js';
import { pickPythonScan } from './python-scan.js';

export const ADAPTERS = {
  'local-git': pickLocalRepo,
  'python-scan': pickPythonScan,
};

/**
 * @param {'local-git'|'python-scan'} [adapter]
 * @param {object} [opts] forwarded to the adapter (e.g. { focus: 'AyTree' } for python-scan)
 */
export async function loadSnapshot(adapter = 'local-git', opts) {
  const load = ADAPTERS[adapter];
  if (!load) throw new Error(`unknown ingest adapter "${adapter}"`);
  return opts !== undefined ? load(opts) : load();
}
