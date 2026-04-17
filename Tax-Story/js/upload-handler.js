import { classifyFromText, classifyAisPortalPdfText, classifyTisPortalPdfText } from './classify.js';
import {
  extractItrSnapshot,
  extractAisSnapshot,
  extractAisSnapshotFromPdfText,
  extractTisSnapshotFromPdfText,
} from './extract-snapshots.js';
import { extractTextFromPdf, collectFyHintsFromAisPdfText, isPlausibleIndianFyToken } from './ais-pdf.js';
import { buildReviewCards } from './join-review.js';

/**
 * @typedef {import('./model.js').YearRecord} YearRecord
 * @typedef {import('./classify.js').ClassifyResult} ClassifyResult
 */

/**
 * @typedef {Object} FileEntry
 * @property {string} name
 * @property {ClassifyResult} classification
 * @property {{ fy?: string }} metadata
 * @property {File|Blob} [blob]
 */

/**
 * Recursively convert an XML Element into a plain JS object that mirrors
 * the ITR JSON structure (so the same itr-paths.js paths work for both).
 * Namespace prefixes are stripped; repeated tags become arrays.
 * @param {Element} node
 * @returns {unknown}
 */
function _xmlNodeToObj(node) {
  const children = Array.from(node.children);
  if (children.length === 0) {
    const raw = (node.textContent ?? '').trim();
    if (raw === '') return null;
    const num = Number(raw);
    return Number.isFinite(num) && raw !== '' ? num : raw;
  }
  /** @type {Record<string, unknown>} */
  const obj = {};
  for (const child of children) {
    const key = child.localName; // strips "ns2:", "ns3:" etc.
    const val = _xmlNodeToObj(child);
    if (key in obj) {
      if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
      /** @type {unknown[]} */ (obj[key]).push(val);
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

/**
 * Parse ITR XML text into a plain object matching the ITR JSON schema.
 * Returns `{ ITR: { ITR1: { … } } }` or `{ ITR: { ITR2: { … } } }`.
 * @param {string} xmlText
 * @returns {Record<string, unknown>}
 */
function xmlToItrObj(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) throw new Error('XML parse error: ' + parseErr.textContent);
  // Root element is <ns3:ITR> or <ITR>; its localName is always "ITR"
  const root = doc.documentElement;
  const obj = _xmlNodeToObj(root);
  // Wrap in `{ ITR: <root_obj> }` so dotted paths like "ITR.ITR1.…" resolve correctly
  return { ITR: obj };
}

/**
 * @param {string} raw
 * @param {'fy'|'ay'} role
 * @returns {string|undefined}
 */
function normalizePortalYearLabel(raw) {
  const s = String(raw).trim();
  if (!s) return undefined;
  // Already "2024-25" format
  if (/^20\d{2}-\d{2}$/.test(s)) return s;
  // "202425" compact → "2024-25"
  const m4 = s.match(/^(\d{4})(\d{2})$/);
  if (m4) return `${m4[1]}-${m4[2]}`;
  // 4-digit Assessment Year: "2025" → AY 2025-26 → FY 2024-25
  // Portal always stores AY as the first year of the AY pair (e.g. AY2025-26 → "2025")
  const m1 = s.match(/^(\d{4})$/);
  if (m1) {
    const y = parseInt(m1[1], 10);
    if (y < 1991 || y > 2100) return undefined;
    // AY y → FY (y-1)-(last 2 digits of y)
    return `${y - 1}-${String(y).slice(-2)}`;
  }
  return undefined;
}

/**
 * @param {unknown} obj
 * @param {{ fy: string[], ay: string[] }} buckets
 * @param {number} depth
 */
function collectYearStringsFromJson(obj, buckets, depth = 0) {
  if (depth > 28 || obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    const cap = Math.min(obj.length, 80);
    for (let i = 0; i < cap; i += 1) collectYearStringsFromJson(obj[i], buckets, depth + 1);
    return;
  }
  if (typeof obj !== 'object') return;
  const rec = /** @type {Record<string, unknown>} */ (obj);
  for (const [k, v] of Object.entries(rec)) {
    const kn = k.replace(/\s|_/g, '').toLowerCase();
    if (v != null && typeof v !== 'object' && (typeof v === 'string' || typeof v === 'number')) {
      const s = String(v).trim();
      if (/\d{4}/.test(s)) {
        if (kn === 'financialyear' || kn === 'finyear' || kn === 'financial_year') {
          buckets.fy.push(s);
        } else if (kn === 'assessmentyear' || kn === 'ay') {
          buckets.ay.push(s);
        } else if (kn === 'fy') {
          buckets.fy.push(s);
        }
      }
    }
    if (v && typeof v === 'object') collectYearStringsFromJson(v, buckets, depth + 1);
  }
}

/**
 * @param {string} text
 * @returns {string|undefined}
 */
/**
 * @param {string} text
 * @returns {string[]}
 */
function collectAllNormalizedFysFromJson(text) {
  try {
    const data = JSON.parse(text);
    const buckets = { fy: /** @type {string[]} */ ([]), ay: /** @type {string[]} */ ([]) };
    collectYearStringsFromJson(data, buckets);
    const out = [];
    const seen = new Set();
    const push = (raw) => {
      const n = normalizePortalYearLabel(raw);
      if (!n || seen.has(n) || !isPlausibleIndianFyToken(n)) return;
      seen.add(n);
      out.push(n);
    };
    for (const raw of buckets.fy) push(raw);
    for (const raw of buckets.ay) push(raw);
    return out;
  } catch {
    return [];
  }
}

/**
 * When several FY labels appear in one file, prefer one that appears in the filename;
 * otherwise prefer the latest start year (common for current-year portal exports).
 * @param {string[]} candidates
 * @param {string} [fileName]
 * @returns {string|undefined}
 */
export function pickPreferredFy(candidates, fileName = '') {
  const list = (candidates || [])
    .map((c) => String(c))
    .filter((c) => c && /^20\d{2}-\d{2}$/.test(c) && isPlausibleIndianFyToken(c));
  if (!list.length) return undefined;
  const uniq = [...new Set(list.map((c) => String(c)))];
  if (uniq.length === 1) return uniq[0];
  const low = String(fileName).toLowerCase().replace(/\\/g, '/');
  for (const f of uniq) {
    const compact = f.replace(/-/g, '');
    if (low.includes(f.toLowerCase()) || low.includes(compact)) return f;
  }
  uniq.sort((a, b) => {
    const na = parseInt(a.slice(0, 4), 10) || 0;
    const nb = parseInt(b.slice(0, 4), 10) || 0;
    return na - nb;
  });
  return uniq[uniq.length - 1];
}

/**
 * @param {string} text
 * @param {string} [fileName]
 * @returns {string|undefined}
 */
function sniffFyFromJsonText(text, fileName = '') {
  const all = collectAllNormalizedFysFromJson(text);
  if (all.length) return pickPreferredFy(all, fileName);
  return undefined;
}

/**
 * @param {string} text
 * @returns {string|undefined}
 */
function sniffFyFromXmlText(text) {
  const head = text.slice(0, 16000);
  const m =
    head.match(/\b(?:AssessmentYear|AY|FinancialYear|FY)\s*=\s*["']([^"']+)["']/i) ||
    head.match(/<(?:AssessmentYear|FinancialYear|AY|FY)>\s*([^<]+?)\s*</i);
  if (m && m[1]) {
    const raw = String(m[1]).trim();
    // Normalize AY → FY (portal stores AY as 4-digit, e.g. "2019" for AY 2019-20 = FY 2018-19)
    return normalizePortalYearLabel(raw);
  }
  return undefined;
}

/**
 * @param {string} fileName
 * @returns {string|undefined}
 */
function sniffFyFromFileNameOnly(fileName) {
  const base = String(fileName).replace(/\.[^.]+$/i, '');
  let m = base.match(/(20\d{2})[_-](\d{2})(?![0-9])/);
  if (m?.[1] && m[2]) return `${m[1]}-${m[2]}`;
  m = base.match(/\b(20\d{2}-\d{2})\b/);
  if (m?.[1]) return m[1];
  m = base.match(/\bFY[.\s_-]*(20\d{2}-\d{2})\b/i);
  if (m?.[1]) return m[1];
  m = base.match(/\b(20\d{6})\b/);
  if (m?.[1] && m[1].length === 6) {
    const s = m[1];
    return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  }
  return undefined;
}

/**
 * @param {string} fileName
 * @param {string} text
 * @returns {string|undefined}
 */
/**
 * When the filename contains a clear `20xx-yy` FY token, prefer it over body text.
 * Portal PDFs often mention other years (AY, samples); AIS/TIS for 2025-26 must not pick 2022-23 from the text layer.
 */
export function detectFyFromFileNameAndText(fileName, text) {
  const lower = String(fileName).toLowerCase();
  const nameFy = sniffFyFromFileNameOnly(fileName);
  const nameStrong = !!(nameFy && /^20\d{2}-\d{2}$/.test(nameFy));

  if (lower.endsWith('.json')) {
    return nameStrong ? nameFy : sniffFyFromJsonText(text, fileName) || nameFy;
  }
  if (lower.endsWith('.xml')) {
    return nameStrong ? nameFy : sniffFyFromXmlText(text) || nameFy;
  }
  if (lower.endsWith('.pdf')) {
    const hints = collectFyHintsFromAisPdfText(text);
    return nameStrong ? nameFy : pickPreferredFy(hints, fileName) || nameFy;
  }
  return nameFy;
}

/**
 * @param {Map<string, YearRecord>} years
 * @param {string} fy
 * @returns {YearRecord}
 */
function ensureYear(years, fy) {
  const key = fy.trim();
  let row = years.get(key);
  if (!row) {
    row = { fy: key, itr: null, ais: null, tis: null, sources: [] };
    years.set(key, row);
  } else if (row.tis === undefined) {
    row.tis = null;
  }
  return row;
}

/**
 * @param {FileEntry} entry
 * @param {string} hint
 */
function annotateFileHint(entry, hint) {
  entry.classification = {
    ...entry.classification,
    confidence: Math.min(0.35, Number(entry.classification?.confidence ?? 0)),
    hint,
  };
}

/**
 * @param {string} name
 * @param {string} text
 * @returns {import('./classify.js').ClassifyResult}
 */
function pickPortalPdfKind(name, text) {
  const l = String(name).toLowerCase();
  const tisC = classifyTisPortalPdfText(text, name);
  const aisC = classifyAisPortalPdfText(text, name);
  const hasTisToken = /(^|[._-])tis([._-]|\.pdf)/i.test(l) || /_tis_/i.test(l);
  const hasAisToken = /(^|[._-])ais([._-]|\.pdf)/i.test(l) || /_ais_/i.test(l);
  if (hasTisToken && !hasAisToken) {
    return tisC.kind === 'tis_pdf'
      ? tisC
      : {
          kind: /** @type {const} */ ('unknown'),
          confidence: 0,
          hint: 'Filename looks like TIS but PDF text did not match — check password or try another export.',
        };
  }
  if (hasAisToken && !hasTisToken) {
    return aisC.kind === 'ais_json'
      ? aisC
      : {
          kind: /** @type {const} */ ('unknown'),
          confidence: 0,
          hint: 'Filename looks like AIS but PDF text did not match — check password or use JSON.',
        };
  }
  const ranked = /** @type {import('./classify.js').ClassifyResult[]} */ ([tisC, aisC]).filter((c) => c.kind !== 'unknown');
  if (ranked.length) {
    ranked.sort((a, b) => b.confidence - a.confidence);
    return ranked[0];
  }
  return aisC.confidence >= tisC.confidence ? aisC : tisC;
}

/**
 * @param {FileList|Blob[]|File[]} fileList
 * @param {{ years: Map<string, YearRecord>, files: FileEntry[], reviewCards: unknown[] }} state
 * @param {() => void} onUpdate
 * @param {{ aisPdfPassword?: string }} [opts]
 * @returns {Promise<{ warnings: string[], parseFailures: number, duplicateConflicts: number }>}
 */
export async function handleFiles(fileList, state, onUpdate, opts = {}) {
  const list = Array.from(fileList ?? []);
  const pwd = typeof opts.aisPdfPassword === 'string' ? opts.aisPdfPassword : '';
  /** @type {string[]} */
  const warnings = [];
  let parseFailures = 0;
  let duplicateConflicts = 0;

  for (const file of list) {
    const name = file && 'name' in file && file.name != null ? String(file.name) : 'blob';
    const lower = name.toLowerCase();

    if (lower.endsWith('.pdf')) {
      let buf;
      try {
        buf = await file.arrayBuffer();
      } catch {
        state.files.push({
          name,
          classification: { kind: 'unknown', confidence: 0, hint: 'Could not read PDF file' },
          metadata: {},
          blob: file,
        });
        continue;
      }

      const pdfResult = await extractTextFromPdf(buf, pwd);
      if (!pdfResult.ok) {
        state.files.push({
          name,
          classification: {
            kind: 'unknown',
            confidence: 0,
            hint: pdfResult.needsPassword
              ? 'Portal PDF is password-protected — enter password below (PAN lower + DOB as DDMMYYYY), then upload again'
              : pdfResult.error || 'Could not read PDF',
          },
          metadata: {},
          blob: file,
        });
        continue;
      }

      const text = pdfResult.text || '';
      const classification = pickPortalPdfKind(name, text);
      const fy = detectFyFromFileNameAndText(name, text);

      /** @type {FileEntry} */
      const entry = {
        name,
        classification,
        metadata: fy ? { fy } : {},
        blob: file,
      };
      state.files.push(entry);

      if (fy && classification.kind === 'tis_pdf') {
        const year = ensureYear(state.years, fy);
        year.sources.push({
          fileIndex: state.files.length - 1,
          kind: classification.kind,
          name: entry.name,
        });
        if (year.tis?.hasData) {
          duplicateConflicts += 1;
          annotateFileHint(entry, `Duplicate TIS for FY ${fy}. Keeping first parsed file for this FY.`);
          warnings.push(`${entry.name}: duplicate TIS skipped for FY ${fy}.`);
        } else {
          year.tis = extractTisSnapshotFromPdfText(text);
        }
      } else if (fy && classification.kind === 'ais_json') {
        const year = ensureYear(state.years, fy);
        year.sources.push({
          fileIndex: state.files.length - 1,
          kind: classification.kind,
          name: entry.name,
        });
        if (year.ais?.hasData) {
          duplicateConflicts += 1;
          annotateFileHint(entry, `Duplicate AIS for FY ${fy}. Keeping first parsed file for this FY.`);
          warnings.push(`${entry.name}: duplicate AIS skipped for FY ${fy}.`);
        } else {
          year.ais = extractAisSnapshotFromPdfText(text);
        }
      }
      continue;
    }

    if (!lower.endsWith('.json') && !lower.endsWith('.xml')) {
      /** @type {FileEntry} */
      const skipEntry = {
        name,
        classification: {
          kind: /** @type {'unknown'} */ ('unknown'),
          confidence: 0,
          hint: 'Use .json / .xml / .pdf (or ZIP containing them)',
        },
        metadata: {},
        blob: file,
      };
      state.files.push(skipEntry);
      continue;
    }

    let text;
    try {
      text = await file.text();
    } catch {
      state.files.push({
        name,
        classification: { kind: 'unknown', confidence: 0, hint: 'Could not read file' },
        metadata: {},
        blob: file,
      });
      continue;
    }

    const classification = classifyFromText(name, text);
    const fy = detectFyFromFileNameAndText(name, text);

    /** @type {FileEntry} */
    const entry = {
      name,
      classification,
      metadata: fy ? { fy } : {},
      blob: file,
    };

    state.files.push(entry);

    if (fy) {
      const year = ensureYear(state.years, fy);
      year.sources.push({
        fileIndex: state.files.length - 1,
        kind: classification.kind,
        name: entry.name,
      });

      if (classification.kind === 'itr_json') {
        if (year.itr?.hasData) {
          duplicateConflicts += 1;
          annotateFileHint(entry, `Duplicate ITR for FY ${fy}. Keeping first parsed file for this FY.`);
          warnings.push(`${entry.name}: duplicate ITR skipped for FY ${fy}.`);
          continue;
        }
        try {
          const parsed = JSON.parse(text);
          year.itr = extractItrSnapshot(parsed);
        } catch {
          parseFailures += 1;
          annotateFileHint(entry, 'Could not parse ITR JSON. Verify portal export and re-upload.');
          warnings.push(`${entry.name}: ITR JSON parse failed.`);
        }
      } else if (classification.kind === 'itr_xml') {
        if (year.itr?.hasData) {
          duplicateConflicts += 1;
          annotateFileHint(entry, `Duplicate ITR for FY ${fy}. Keeping first parsed file for this FY.`);
          warnings.push(`${entry.name}: duplicate ITR skipped for FY ${fy}.`);
          continue;
        }
        try {
          const xmlObj = xmlToItrObj(text);
          year.itr = extractItrSnapshot(xmlObj);
        } catch {
          parseFailures += 1;
          annotateFileHint(entry, 'Could not parse ITR XML. Verify portal export and re-upload.');
          warnings.push(`${entry.name}: ITR XML parse failed.`);
        }
      } else if (classification.kind === 'ais_json') {
        if (year.ais?.hasData) {
          duplicateConflicts += 1;
          annotateFileHint(entry, `Duplicate AIS for FY ${fy}. Keeping first parsed file for this FY.`);
          warnings.push(`${entry.name}: duplicate AIS skipped for FY ${fy}.`);
          continue;
        }
        try {
          const parsed = JSON.parse(text);
          year.ais = extractAisSnapshot(parsed);
        } catch {
          parseFailures += 1;
          annotateFileHint(entry, 'Could not parse AIS JSON. Verify portal export and re-upload.');
          warnings.push(`${entry.name}: AIS JSON parse failed.`);
        }
      }
    }
  }

  state.reviewCards = buildReviewCards(state);
  onUpdate();
  return { warnings, parseFailures, duplicateConflicts };
}
