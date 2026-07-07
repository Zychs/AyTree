/**
 * AyTree core data model (CR-safe iTree)
 * Shared between ingest, renderers, and future server.
 */

export class AyNode {
  constructor({ id, path, name, kind = 'file', wx = 0, wy = 0, wr = 0.01, signals = [] }) {
    this.id = id;
    this.path = path;
    this.name = name;
    this.kind = kind;           // file | dir | junction | commit | etc.
    this.wx = wx; this.wy = wy; this.wr = wr;
    this.signals = signals;     // CR/anomaly signals
  }
}

export class AyCommit {
  constructor({ sha, parents = [], message = '', t = 0 }) {
    this.sha = sha;
    this.parents = parents;
    this.message = message;
    this.t = t;                 // normalized time 0..1 along history
  }
}

/**
 * Unified view state passed to renderers.
 */
export class AyViewState {
  constructor() {
    this.nodes = [];      // AyNode[]
    this.commits = [];    // AyCommit[]
    this.current = null;  // sha or id
    this.search = '';
    // scope / re-root state later
  }
}
