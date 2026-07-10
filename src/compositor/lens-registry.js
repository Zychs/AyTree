/**
 * Base-lens registry + keymap. Exactly one base lens is mounted at a time
 * (docs/ARCHITECTURE.md §2.4: spatial-map / dag-gitgraph / radial-onion, mutually
 * exclusive). The weave overlay (§2.5) is listed separately — it's a toggle over the
 * active base lens, not a switch target.
 */
import { SpatialMapLens } from '../lenses/spatial-map.js';
import { DagGitgraphLens } from '../lenses/dag-gitgraph.js';
import { RadialOnionLens } from '../lenses/radial-onion.js';
import { WeaveOverlay } from '../lenses/weave.js';

export const BASE_LENSES = [
  { key: '1', id: 'spatial-map', label: 'spatial map', ctor: SpatialMapLens, ready: true },
  { key: '2', id: 'dag-gitgraph', label: 'DAG gitgraph', ctor: DagGitgraphLens, ready: true },
  { key: '3', id: 'radial-onion', label: 'radial onion', ctor: RadialOnionLens, ready: true },
];

export const WEAVE_OVERLAY = { key: 'w', id: 'weave', label: 'weave overlay', ctor: WeaveOverlay, ready: true };
