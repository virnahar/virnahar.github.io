/**
 * Human-readable labels for the "What we detected" table (classify.js kinds).
 */

/** @type {Record<string, string>} */
const KIND_LABELS = {
  itr_json: 'ITR · JSON return',
  itr_xml: 'ITR · XML return',
  ais_json: 'AIS · JSON',
  tis_pdf: 'TIS · PDF',
  unknown: 'Unrecognised',
};

/**
 * @param {string} [kind]
 */
export function friendlyKind(kind) {
  const k = String(kind || '');
  return KIND_LABELS[k] ?? k.replace(/_/g, ' ');
}

/**
 * @param {number} [conf]
 */
export function confidenceLabel(conf) {
  const c = typeof conf === 'number' && Number.isFinite(conf) ? conf : 0;
  const pct = (c * 100).toFixed(0);
  if (c >= 0.85) return `High · ${pct}%`;
  if (c >= 0.55) return `Medium · ${pct}%`;
  if (c > 0) return `Low · ${pct}%`;
  return '—';
}

/**
 * @param {{ name?: string, metadata?: { fy?: string } }} a
 * @param {{ name?: string, metadata?: { fy?: string } }} b
 */
function byFyThenName(a, b) {
  const fa = a.metadata?.fy ?? '\uffff';
  const fb = b.metadata?.fy ?? '\uffff';
  if (fa !== fb) return fa.localeCompare(fb);
  return String(a.name ?? '').localeCompare(String(b.name ?? ''));
}

/**
 * @param {Array<{ name?: string, metadata?: { fy?: string } }>} files
 */
export function sortFilesForDetectTable(files) {
  if (!Array.isArray(files)) return [];
  return [...files].sort(byFyThenName);
}
