/**
 * Deterministic string hash → [0,1). Shared by every lens for golden-frame stable,
 * reproducible layout (jitter, lane assignment, chaos offsets).
 * Ported from legacy/harvest/harvested_raw.js:111 (FNV-1a variant).
 */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
