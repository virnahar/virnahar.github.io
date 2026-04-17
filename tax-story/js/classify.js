/**
 * @typedef {'itr_json'|'itr_xml'|'ais_json'|'tis_pdf'|'unknown'} FileKind
 */

/**
 * @typedef {{ kind: FileKind, confidence: number, hint: string }} ClassifyResult
 */

const ITR_JSON_KEY_HINTS = [
  'ITR',
  'PartA_GEN1',
  'PartB_GEN1',
  'PartA_GEN2',
  'ScheduleS',
  'ScheduleHP',
  'ScheduleOS',
  'ScheduleCYLA',
  'ScheduleBFLA',
  'ScheduleCFL',
  'ScheduleVIA',
  'ScheduleSPI',
  'ScheduleSI',
  'ScheduleEI',
  'ScheduleIT',
  'ScheduleTDS1',
  'ScheduleTDS2',
  'ScheduleTDS3',
  'ITRForm',
  'ITR1',
  'ITR2',
];

/** Keys / substrings typical of portal AIS JSON (utility export). */
const AIS_JSON_KEY_HINTS = [
  'FinancialYear',
  'AIS',
  'AnnualInformationStatement',
  'annualInformationStatement',
  'Information',
  'PART_A',
  'PART_B',
  'PartA',
  'PartB',
  'SFT',
  'TDS',
  'reportedTxn',
  'ReportedTxn',
  'transactions',
  'L1Annexure',
  'Taxpayer',
  'MainInformation',
];

const JSON_SCAN = 220000;

/**
 * @param {unknown} value
 * @param {(key: string) => boolean} keyTest
 * @param {number} depth
 * @param {number} maxDepth
 * @returns {boolean}
 */
function objectHasKeyDeep(value, keyTest, depth = 0, maxDepth = 10) {
  if (depth > maxDepth || value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    for (let i = 0; i < Math.min(value.length, 80); i += 1) {
      if (objectHasKeyDeep(value[i], keyTest, depth + 1, maxDepth)) return true;
    }
    return false;
  }
  for (const k of Object.keys(/** @type {Record<string, unknown>} */ (value))) {
    if (keyTest(k)) return true;
  }
  for (const k of Object.keys(/** @type {Record<string, unknown>} */ (value))) {
    if (objectHasKeyDeep(/** @type {Record<string, unknown>} */ (value)[k], keyTest, depth + 1, maxDepth)) return true;
  }
  return false;
}

/**
 * @param {unknown} obj
 * @param {number} depth
 * @returns {boolean}
 */
function jsonLooksLikeFinancialYearField(obj, depth = 0) {
  if (depth > 14 || obj === null || obj === undefined) return false;
  if (typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.slice(0, 40).some((x) => jsonLooksLikeFinancialYearField(x, depth + 1));
  }
  for (const [k, v] of Object.entries(obj)) {
    if (/financialyear|finyear|fin_year|fy\b|assessmentyear/i.test(k) && v != null && /20\d{2}/.test(String(v))) {
      return true;
    }
    if (typeof v === 'object' && jsonLooksLikeFinancialYearField(v, depth + 1)) return true;
  }
  return false;
}

/**
 * @param {string} fileName
 * @param {string} text
 * @returns {ClassifyResult}
 */
export function classifyFromText(fileName, text) {
  const lower = String(fileName).toLowerCase();
  if (lower.endsWith('.json')) return classifyJsonText(fileName, text);
  if (lower.endsWith('.xml')) return classifyXmlText(text);
  return { kind: 'unknown', confidence: 0, hint: 'Use .json or .xml for classification' };
}

/**
 * Heuristic: does extracted PDF text look like Income Tax AIS?
 * @param {string} text
 * @returns {{ kind: FileKind, confidence: number, hint: string }}
 */
/**
 * @param {string} text
 * @param {string} [fileName]
 */
export function classifyAisPortalPdfText(text, fileName = '') {
  const t = String(text).slice(0, 120000);
  const lower = t.toLowerCase();
  const nameLow = String(fileName).toLowerCase();
  const compactLen = t.replace(/\s/g, '').length;

  /** Filename says AIS and we got a usable text layer — portal PDFs often omit the exact “Annual Information Statement” phrase. */
  const nameLooksAis =
    /(?:^|[._-])ais(?:[._-]|\.pdf|$)/i.test(nameLow) || /\bais\b/i.test(nameLow) || /annual.?information/i.test(nameLow);
  if (compactLen >= 80 && nameLooksAis) {
    const taxish = /income|tax|tds|tcs|pan|deduct|₹|rs\.?\s*\d|inr|statement|financial|section/i.test(lower);
    if (taxish) {
      return {
        kind: 'ais_json',
        confidence: 0.58,
        hint: 'AIS PDF from filename + text heuristics — totals are approximate; prefer portal JSON when you can',
      };
    }
  }

  const hasAisPhrase = /annual information statement/.test(lower) || /\bais\b/.test(lower);
  const hasItDept = /income tax|incometax|e-filing|efiling|cbdt/.test(lower);
  const hasPart = /\bpart\s*[a-z]\b/i.test(t) || /statement\s*of/i.test(lower);

  if (hasAisPhrase && (hasItDept || hasPart)) {
    return {
      kind: 'ais_json',
      confidence: 0.72,
      hint: 'AIS from PDF text layer — totals are approximated in-browser; prefer portal JSON when you can',
    };
  }
  if (hasAisPhrase) {
    return {
      kind: 'ais_json',
      confidence: 0.48,
      hint: 'Possible AIS PDF — weak match; verify FY and numbers in the portal',
    };
  }
  return { kind: 'unknown', confidence: 0, hint: 'PDF text did not look like portal AIS' };
}

/**
 * Heuristic: portal TIS (Transaction Information Statement) PDF text.
 * @param {string} text
 * @param {string} [fileName]
 * @returns {{ kind: FileKind, confidence: number, hint: string }}
 */
export function classifyTisPortalPdfText(text, fileName = '') {
  const t = String(text).slice(0, 120000);
  const lower = t.toLowerCase();
  const nameLow = String(fileName).toLowerCase();
  const compactLen = t.replace(/\s/g, '').length;

  const nameLooksTis =
    /(?:^|[._-])tis(?:[._-]|\.pdf|$)/i.test(nameLow) ||
    /\btis\b/i.test(nameLow) ||
    /transaction.?information/i.test(nameLow);

  if (compactLen >= 80 && nameLooksTis) {
    const taxish = /income|tax|salary|interest|dividend|pan|₹|rs\.?\s*\d|inr|statement|financial/i.test(lower);
    if (taxish) {
      return {
        kind: /** @type {const} */ ('tis_pdf'),
        confidence: 0.58,
        hint: 'TIS PDF from filename + text — values are read from the PDF text layer (approximate)',
      };
    }
  }

  const hasTisPhrase =
    /transaction\s+information\s+statement/i.test(lower) ||
    /\btis\b.*(income|tax|statement)/i.test(lower) ||
    /transaction\s+information/i.test(lower);

  if (hasTisPhrase && /income|tax|salary|deduct|pan/i.test(lower)) {
    return {
      kind: /** @type {const} */ ('tis_pdf'),
      confidence: 0.72,
      hint: 'TIS from PDF text — compare to ITR for a quick reconciliation pass',
    };
  }
  if (hasTisPhrase) {
    return {
      kind: /** @type {const} */ ('tis_pdf'),
      confidence: 0.48,
      hint: 'Possible TIS PDF — weak text match; verify numbers in the portal',
    };
  }
  return { kind: 'unknown', confidence: 0, hint: 'PDF text did not look like portal TIS' };
}

/**
 * Some portal “AIS JSON” downloads are a single-line payload (64-char hex + base64-style body)
 * for the desktop AIS Utility — not parseable JSON in the browser.
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeEncryptedAisUtilityPayload(text) {
  const t = String(text).trim();
  if (!t || t.startsWith('{') || t.startsWith('[')) return false;
  if (t.length < 200) return false;
  const head = t.slice(0, 64);
  if (!/^[a-f0-9]{64}$/i.test(head)) return false;
  const rest = t.slice(64);
  return /^[A-Za-z0-9+/=_-]+$/.test(rest);
}

/**
 * @param {string} fileName
 * @param {string} text
 * @returns {ClassifyResult}
 */
function classifyJsonText(fileName, text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (looksLikeEncryptedAisUtilityPayload(text)) {
      return {
        kind: 'unknown',
        confidence: 0,
        hint:
          'Not plain JSON — encrypted-style AIS bundle for AIS Utility. Use AIS PDF + password here, or re-download JSON that starts with { in a text editor.',
      };
    }
    return { kind: 'unknown', confidence: 0, hint: 'Invalid JSON' };
  }

  const nameLower = String(fileName).toLowerCase();
  const scanLen = Math.min(text.length, JSON_SCAN);
  const scan = text.slice(0, scanLen);
  const upperScan = scan.toUpperCase();

  const fyInScan =
    /\bFINANCIALYEAR\b|FinancialYear|"financialYear"|"financial_year"|"FIN_YEAR"|FinYear|"fy"\s*:/i.test(scan);
  const aisWord =
    /\bAIS\b|ANNUALINFORMATIONSTATEMENT|"AIS"|annual information statement|"AnnualInformationStatement"/i.test(
      scan,
    );
  const infoBlock =
    /"Information"\s*:|Information\s*\{|PART_A|PART_B|"PartA"|"PartB"|SFT|reportedtxn|ReportedTransaction|L1Annexure|TDSDetails|TDS\s*Details/i.test(
      scan,
    );

  const looksAisByString = (fyInScan || jsonLooksLikeFinancialYearField(parsed)) && (aisWord || infoBlock);

  const looksItrByString =
    /\bPARTA_GEN1\b/i.test(scan) ||
    /\bITRFORM\b/i.test(scan) ||
    /\b"ITR1"\b/i.test(scan) ||
    /\b"ITR2"\b/i.test(scan) ||
    /\b"ITR3"\b/i.test(scan) ||
    /\b"ITR4"\b/i.test(scan) ||
    /\b"SCHEDULE/i.test(upperScan);

  const itrKeyHit = objectHasKeyDeep(
    parsed,
    (k) =>
      ITR_JSON_KEY_HINTS.some((h) => h.toLowerCase() === k.toLowerCase() || k.toUpperCase().includes('ITR')) &&
      !/^ais$/i.test(k),
  );

  const aisKeyHit = objectHasKeyDeep(parsed, (k) => {
    const l = k.toLowerCase();
    return AIS_JSON_KEY_HINTS.some((h) => h.toLowerCase() === l || l.includes(h.toLowerCase()));
  });

  const fyDeep = jsonLooksLikeFinancialYearField(parsed);

  /** Filename suggests AIS export (portal often names files generically — still help). */
  const nameHintAis =
    /\bais\b|annual.?information|statement.?ais|aisutility|ais_?utility/i.test(nameLower) &&
    !/\bitr[-_]?(\d|json)|\bitr1\b|\bitr2\b|prefill.*\bitr\b|return.*\bitr\b/i.test(nameLower);

  const nameHintItr =
    /\bitr\b|prefill|offline|return|schedule|parta_gen|itrform/i.test(nameLower) && !/\bais\b/i.test(nameLower);

  let aisScore = 0;
  if (aisKeyHit) aisScore += 4;
  if (looksAisByString) aisScore += 3;
  if (nameHintAis) aisScore += 4;
  if (infoBlock && (fyDeep || fyInScan)) aisScore += 2;

  let itrScore = 0;
  if (itrKeyHit) itrScore += 4;
  if (looksItrByString) itrScore += 3;
  if (nameHintItr) itrScore += 4;

  const pickItr = (strong) => ({
    kind: /** @type {const} */ ('itr_json'),
    confidence: strong ? 0.9 : itrKeyHit ? 0.74 : 0.56,
    hint: strong ? 'ITR-shaped JSON (schedule / PartA markers)' : 'Likely ITR JSON (heuristic)',
  });

  const pickAis = (strong) => ({
    kind: /** @type {const} */ ('ais_json'),
    confidence: strong ? 0.9 : aisKeyHit ? 0.76 : 0.58,
    hint: strong
      ? 'AIS-shaped JSON (FY / Information-style markers)'
      : 'Likely AIS JSON (heuristic) — if this is wrong, rename file to include “ais” or use ITR-only upload',
  });

  if (itrScore === 0 && aisScore === 0) {
    return { kind: 'unknown', confidence: 0.2, hint: 'JSON did not match AIS or ITR fingerprints' };
  }

  if (itrScore > 0 && aisScore > 0) {
    if (nameHintAis && !nameHintItr) return pickAis(aisKeyHit && looksAisByString);
    if (nameHintItr && !nameHintAis) return pickItr(itrKeyHit && looksItrByString);
    if (aisScore > itrScore) return pickAis(aisKeyHit && looksAisByString);
    if (itrScore > aisScore) return pickItr(itrKeyHit && looksItrByString);
    if (aisKeyHit && (infoBlock || aisWord)) return pickAis(true);
    return pickItr(itrKeyHit && looksItrByString);
  }

  if (aisScore > 0) {
    return pickAis(aisKeyHit && looksAisByString);
  }

  return pickItr(itrKeyHit && looksItrByString);
}

/**
 * @param {string} text
 * @returns {ClassifyResult}
 */
function classifyXmlText(text) {
  const head = text.slice(0, 12000);
  const trimmed = head.trimStart();
  const hasXmlDecl = trimmed.startsWith('<?xml');
  const upper = head.toUpperCase();

  const hasItrMarker =
    /<ITR[\s>:]/i.test(head) ||
    /ITR\d*\b/i.test(upper) ||
    /\bFORM\s*:\s*ITR/i.test(upper);

  const hasFormMarker = /<FORM[\s>:]/i.test(head) || /<FORM\d*\b/i.test(head);

  if (hasItrMarker) {
    return {
      kind: 'itr_xml',
      confidence: hasXmlDecl ? 0.88 : 0.7,
      hint: hasXmlDecl ? 'XML with ITR root / ITR markers' : 'XML content suggests ITR (no XML declaration)',
    };
  }

  if (hasFormMarker) {
    return {
      kind: 'itr_xml',
      confidence: hasXmlDecl ? 0.55 : 0.45,
      hint: 'XML with FORM-like root (treated as ITR family)',
    };
  }

  if (hasXmlDecl) {
    return {
      kind: 'unknown',
      confidence: 0.15,
      hint: 'XML declaration present but no ITR/FORM markers in the opening content',
    };
  }

  return { kind: 'unknown', confidence: 0, hint: 'Not recognised as ITR/XML pack in sniff window' };
}

/**
 * @param {File|Blob} file
 * @returns {Promise<ClassifyResult>}
 */
async function classifyFile(file) {
  const name = file && 'name' in file && file.name != null ? String(file.name) : '';
  try {
    const t = await file.text();
    return classifyFromText(name, t);
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
    return { kind: 'unknown', confidence: 0, hint: message || 'Read or classify error' };
  }
}
