/**
 * Client for the server's notes DB (server/aytree_server.py: GET/POST /api/notes).
 * Free-text note + closed-set status per file path, keyed the same way the server's
 * build_tree_recursive keys them (repo-relative path). Best-effort: the app is local-first
 * (docs/ARCHITECTURE.md), so notes silently degrade to unavailable if the server isn't
 * running rather than surfacing as an error.
 */
const BASE = '';

export async function fetchNotes() {
  try {
    const res = await fetch(`${BASE}/api/notes`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {}; // server not running — notes feature quietly unavailable
  }
}

export async function saveNote(key, { notes = '', status = '' } = {}) {
  const res = await fetch(`${BASE}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, notes, status }),
  });
  if (!res.ok) throw new Error(`save failed (${res.status})`);
  return res.json();
}
