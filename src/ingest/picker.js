/**
 * Source picker + adapter dispatch. Nothing downstream of loadSnapshot() knows which
 * adapter ran — both normalize to the same RepoSnapshot (docs/ARCHITECTURE.md §2.2).
 * Only `local-git` is wired up this pass; `python-scan` is a stub.
 */
import { pickLocalRepo } from './local-git.js';
import { pickPythonScan } from './python-scan.js';

export const ADAPTERS = {
  'local-git': pickLocalRepo,
  'python-scan': pickPythonScan,
};

export async function loadSnapshot(adapter = 'local-git') {
  const load = ADAPTERS[adapter];
  if (!load) throw new Error(`unknown ingest adapter "${adapter}"`);
  return load();
}
