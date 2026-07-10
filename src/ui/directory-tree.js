/**
 * Expandable directory panel over the shared path→node tree (src/model/tree.js).
 * Stays in lockstep with radial-onion re-root: both surfaces read the same rootPath
 * and selection. Dyslexia-first: large row hit targets, shape+label (not color alone),
 * truncated names with full path on title (docs/dyslexia-encoding.md).
 */
import { catForExt, CAT_COLOR } from '../compositor/encode.js';
import { layerForPath } from '../model/tree.js';

const STATUS_MARK = {
  todo: '○',
  'in-progress': '◐',
  blocked: '⊘',
  done: '●',
};

export class DirectoryTree {
  /**
   * @param {HTMLElement} host
   * @param {{
   *   onSelect?: (node: object|null) => void,
   *   onReRoot?: (path: string) => void,
   * }} [handlers]
   */
  constructor(host, handlers = {}) {
    this.host = host;
    this.onSelect = handlers.onSelect || (() => {});
    this.onReRoot = handlers.onReRoot || (() => {});
    this.tree = null;
    this.notes = {};
    this.rootPath = '';
    this.selectedPath = null;
    /** @type {Set<string>} */
    this.expanded = new Set(['']);
    this.host.classList.add('ay-dir');
    this.host.setAttribute('role', 'tree');
    this.host.addEventListener('click', (e) => this.#onClick(e));
    this.host.addEventListener('dblclick', (e) => this.#onDblClick(e));
    this.host.addEventListener('keydown', (e) => this.#onKey(e));
  }

  /**
   * @param {Map<string, object>} tree
   * @param {{ notes?: object, rootPath?: string, selectedPath?: string|null }} [state]
   */
  setTree(tree, state = {}) {
    this.tree = tree;
    this.notes = state.notes || {};
    if (state.rootPath != null) this.rootPath = state.rootPath;
    if (state.selectedPath !== undefined) this.selectedPath = state.selectedPath;
    // Always expand the current root so its children are visible after re-root.
    this.expanded.add(this.rootPath || '');
    this.render();
  }

  setRoot(path) {
    this.rootPath = path || '';
    this.expanded.add(this.rootPath);
    this.selectedPath = null;
    this.render();
  }

  setSelected(path) {
    this.selectedPath = path;
    // Expand ancestors of selection so the row is visible.
    if (path) {
      const parts = path.split('/');
      let acc = '';
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        this.expanded.add(acc);
      }
    }
    this.render();
    this.#scrollSelectedIntoView();
  }

  render() {
    if (!this.tree) {
      this.host.innerHTML = '<div class="ay-dir-empty">no tree loaded</div>';
      return;
    }
    const root = this.tree.get(this.rootPath);
    if (!root) {
      this.host.innerHTML = '<div class="ay-dir-empty">root not in tree</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    const list = document.createElement('ul');
    list.className = 'ay-dir-list';
    list.setAttribute('role', 'group');

    // Root row (current re-root center)
    list.appendChild(this.#row(root, 0, true));

    if (this.expanded.has(root.path)) {
      this.#appendChildren(list, root, 1);
    }

    frag.appendChild(list);
    this.host.replaceChildren(frag);
  }

  #appendChildren(list, parent, depth) {
    for (const child of parent.children || []) {
      list.appendChild(this.#row(child, depth, false));
      if (child.isDir && this.expanded.has(child.path)) {
        this.#appendChildren(list, child, depth + 1);
      }
    }
  }

  #row(node, depth, isViewRoot) {
    const li = document.createElement('li');
    li.className = 'ay-dir-row';
    li.dataset.path = node.path;
    li.dataset.isdir = node.isDir ? '1' : '0';
    li.setAttribute('role', 'treeitem');
    li.setAttribute('aria-level', String(depth + 1));
    li.tabIndex = node.path === this.selectedPath || (this.selectedPath == null && isViewRoot) ? 0 : -1;
    if (node.isDir) {
      li.setAttribute('aria-expanded', this.expanded.has(node.path) ? 'true' : 'false');
    }
    if (node.path === this.selectedPath) li.classList.add('is-selected');
    if (isViewRoot) li.classList.add('is-view-root');

    const cat = node.isDir ? 'other' : catForExt(node.ext);
    const layer = layerForPath(node.path);
    const note = this.notes[node.path];
    const status = note && note.status ? note.status : '';
    const hasNote = !!(note && (note.notes || note.status));

    const pad = document.createElement('span');
    pad.className = 'ay-dir-pad';
    pad.style.width = `${depth * 14}px`;

    const twist = document.createElement('button');
    twist.type = 'button';
    twist.className = 'ay-dir-twist';
    twist.tabIndex = -1;
    if (node.isDir) {
      twist.textContent = this.expanded.has(node.path) ? '▾' : '▸';
      twist.setAttribute('aria-label', this.expanded.has(node.path) ? 'collapse' : 'expand');
      twist.dataset.action = 'toggle';
    } else {
      twist.classList.add('is-leaf');
      twist.textContent = '·';
      twist.disabled = true;
    }

    const glyph = document.createElement('span');
    glyph.className = `ay-dir-glyph cat-${cat} shape-${node.isDir ? 'dir' : cat}`;
    glyph.style.setProperty('--cat', CAT_COLOR[cat] || CAT_COLOR.other);
    glyph.setAttribute('aria-hidden', 'true');
    glyph.title = node.isDir ? 'directory' : cat;

    const label = document.createElement('span');
    label.className = 'ay-dir-label';
    const display = (node.name || '/').slice(0, 28);
    label.textContent = display + ((node.name || '').length > 28 ? '…' : '');
    label.title = node.path || '(repo root)';

    const meta = document.createElement('span');
    meta.className = 'ay-dir-meta';
    if (isViewRoot) {
      meta.textContent = 'root';
      meta.title = 'current radial center';
    } else if (layer.id !== 'other' && depth <= 2) {
      meta.textContent = layer.label;
      meta.title = layer.hint || layer.label;
    }
    if (hasNote) {
      const mark = document.createElement('span');
      mark.className = 'ay-dir-note';
      mark.textContent = STATUS_MARK[status] || '✎';
      mark.title = status ? `[${status}] ${note.notes || ''}`.trim() : (note.notes || 'has note');
      meta.appendChild(mark);
    }

    const reRootBtn = document.createElement('button');
    reRootBtn.type = 'button';
    reRootBtn.className = 'ay-dir-reroot';
    reRootBtn.tabIndex = -1;
    reRootBtn.dataset.action = 'reroot';
    reRootBtn.textContent = '⊙';
    reRootBtn.title = 're-root here (make radial center)';
    reRootBtn.hidden = !node.isDir || node.path === this.rootPath;

    li.append(pad, twist, glyph, label, meta, reRootBtn);
    return li;
  }

  #rowFromEvent(e) {
    return e.target.closest('.ay-dir-row');
  }

  #onClick(e) {
    const actionEl = e.target.closest('[data-action]');
    const row = this.#rowFromEvent(e);
    if (!row) return;
    const path = row.dataset.path;
    const node = this.tree.get(path);
    if (!node) return;

    if (actionEl && actionEl.dataset.action === 'toggle') {
      e.stopPropagation();
      this.#toggle(path);
      return;
    }
    if (actionEl && actionEl.dataset.action === 'reroot') {
      e.stopPropagation();
      this.onReRoot(path);
      return;
    }

    // Click twist-area already handled; plain row click = select (and expand dirs once).
    this.selectedPath = path;
    if (node.isDir && !this.expanded.has(path)) this.expanded.add(path);
    this.render();
    this.onSelect(node);
  }

  #onDblClick(e) {
    const row = this.#rowFromEvent(e);
    if (!row) return;
    const path = row.dataset.path;
    const node = this.tree.get(path);
    if (node && node.isDir) this.onReRoot(path);
  }

  #onKey(e) {
    const row = e.target.closest('.ay-dir-row');
    if (!row) return;
    const path = row.dataset.path;
    const node = this.tree.get(path);
    if (!node) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (node.isDir && !this.expanded.has(path)) {
        this.expanded.add(path);
        this.render();
      } else if (node.isDir && node.children[0]) {
        this.selectedPath = node.children[0].path;
        this.render();
        this.#focusSelected();
        this.onSelect(this.tree.get(this.selectedPath));
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (node.isDir && this.expanded.has(path) && path !== this.rootPath) {
        this.expanded.delete(path);
        this.render();
      } else {
        const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : this.rootPath;
        if (parent !== path) {
          this.selectedPath = parent;
          this.render();
          this.#focusSelected();
          this.onSelect(this.tree.get(this.selectedPath));
        }
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = [...this.host.querySelectorAll('.ay-dir-row')];
      const i = rows.indexOf(row);
      const next = rows[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        this.selectedPath = next.dataset.path;
        this.render();
        this.#focusSelected();
        this.onSelect(this.tree.get(this.selectedPath));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (node.isDir) this.onReRoot(path);
      else this.onSelect(node);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (node.isDir) this.#toggle(path);
      else this.onSelect(node);
    }
  }

  #toggle(path) {
    if (this.expanded.has(path)) this.expanded.delete(path);
    else this.expanded.add(path);
    this.render();
  }

  #focusSelected() {
    const el = this.host.querySelector('.ay-dir-row.is-selected') || this.host.querySelector('.ay-dir-row');
    if (el) el.focus();
  }

  #scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const el = this.host.querySelector('.ay-dir-row.is-selected');
      if (el) el.scrollIntoView({ block: 'nearest' });
    });
  }
}
