/**
 * Dyslexia glyph encoder — docs/ARCHITECTURE.md §3: encode state in >=2 non-color channels,
 * never color alone. Shape carries category; stroke weight carries conflict. Color is an
 * accent on top, never the sole carrier. Minimal version sized for spatial-map; extend when
 * DAG/weave land (see docs/specs/gui-dyslexia-encode.md).
 */

export const CAT_COLOR = {
  code: '#e8c55c',
  doc: '#d9c9a3',
  config: '#8fa3b8',
  asset: '#a88bc4',
  other: '#8fa88f',
};

export const CAT_SHAPE = {
  code: 'circle',
  doc: 'square',
  config: 'triangle',
  asset: 'diamond',
  other: 'circle',
};

export function catForExt(ext) {
  ext = (ext || '').toLowerCase();
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'zig', 'c', 'cpp', 'java', 'cs'].includes(ext)) return 'code';
  if (['md', 'txt', 'rst', 'adoc'].includes(ext)) return 'doc';
  if (['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'xml', 'env'].includes(ext)) return 'config';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'mp3', 'wav', 'mp4'].includes(ext)) return 'asset';
  return 'other';
}

export function drawGlyph(ctx, x, y, r, cat, { conflict = false, fill, stroke } = {}) {
  const shape = CAT_SHAPE[cat] || 'circle';
  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;
    case 'triangle':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = fill || CAT_COLOR[cat] || CAT_COLOR.other;
  ctx.fill();
  if (conflict) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke || '#fff';
    ctx.stroke();
  }
}
