/**
 * AIS PDF — text extraction in the browser (pdf.js).
 * Portal AIS JSON is plain text; PDFs are often password-protected (PAN lower + DOB DDMMYYYY).
 */

/** @type {string | null} */
let workerSrcSet = null;

/** Minimum non-whitespace chars to treat text extraction as useful. */
const MIN_EXTRACT_CHARS = 50;

/** @param {string} s */
export function isPlausibleIndianFyToken(s) {
  const m = String(s).match(/^20(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y1 = parseInt(`20${m[1]}`, 10);
  const yy = parseInt(m[2], 10);
  return yy === (y1 + 1) % 100;
}

/**
 * @param {string} pwd
 * @returns {string[]}
 */
function passwordCandidates(pwd) {
  const p = String(pwd || '').trim();
  if (!p) return [''];
  const out = [];
  for (const x of [p, p.toLowerCase(), p.toUpperCase()]) {
    if (x && !out.includes(x)) out.push(x);
  }
  const digits = p.replace(/\D/g, '');
  if (digits.length === 8 && !out.includes(digits)) out.push(digits);
  return out;
}

/**
 * @param {unknown} pdfjs
 * @param {ArrayBuffer} buf
 * @param {string} password
 * @returns {Promise<{ ok: true, text: string } | { ok: false, needsPassword?: boolean, error: string }>}
 */
async function loadPdfText(pdfjs, buf, password) {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buf),
    password: password || undefined,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (item && typeof item === 'object' && 'str' in item && typeof item.str === 'string') {
        parts.push(item.str);
      }
    }
    parts.push('\n');
  }
  const text = parts.join(' ');
  if (text.replace(/\s/g, '').length < MIN_EXTRACT_CHARS) {
    return {
      ok: false,
      error:
        'PDF decrypted but almost no text was extracted (image-only PDF or non-selectable fonts). Try another AIS export or structured JSON.',
    };
  }
  return { ok: true, text };
}

/**
 * @param {ArrayBuffer} buf
 * @param {string} [password]
 * @returns {Promise<{ ok: true, text: string } | { ok: false, needsPassword?: boolean, error: string }>}
 */
export async function extractTextFromPdf(buf, password = '') {
  try {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.mjs');
    if (!workerSrcSet) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.mjs';
      workerSrcSet = pdfjs.GlobalWorkerOptions.workerSrc;
    }

    const candidates = passwordCandidates(password);
    let lastErr = 'Could not read PDF';
    let sawPasswordError = false;

    for (const pw of candidates) {
      try {
        const result = await loadPdfText(pdfjs, buf, pw);
        if (result.ok) return result;
        lastErr = result.error;
        if (/decrypted but almost no text/i.test(result.error)) {
          return { ok: false, error: result.error };
        }
      } catch (e) {
        const name = e && typeof e === 'object' && 'name' in e ? String(e.name) : '';
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
        lastErr = msg || 'Could not read PDF';
        if (name === 'PasswordException' || /password|encrypt/i.test(msg)) {
          sawPasswordError = true;
        }
      }
    }

    if (sawPasswordError) {
      return {
        ok: false,
        needsPassword: true,
        error:
          'Password not accepted — use PAN in lowercase + DOB as DDMMYYYY (no spaces). Re-upload after correcting the field.',
      };
    }
    return { ok: false, error: lastErr };
  } catch (e) {
    const name = e && typeof e === 'object' && 'name' in e ? String(e.name) : '';
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    if (name === 'PasswordException' || /password|encrypt/i.test(msg)) {
      return { ok: false, needsPassword: true, error: 'Password required for this PDF' };
    }
    return { ok: false, error: msg || 'Could not read PDF' };
  }
}

/**
 * Collect FY hints from AIS/TIS portal PDF text in priority order (deduped).
 * Explicit "Financial Year" / "FY:" lines come before loose ranges so a sample
 * range in the footer does not override the document FY.
 * @param {string} text
 * @returns {string[]}
 */
export function collectFyHintsFromAisPdfText(text) {
  const full = String(text);
  const head25 = full.slice(0, 25000);
  const head120 = full.slice(0, 120000);
  /** @type {string[][]} */
  const tiers = [[], [], [], []];
  const seen = new Set();
  /**
   * @param {number} tier
   * @param {string} s
   */
  const push = (tier, s) => {
    if (!s || !/^20\d{2}-\d{2}$/.test(s)) return;
    if (seen.has(s)) return;
    seen.add(s);
    tiers[tier].push(s);
  };

  for (const m of head120.matchAll(/Financial\s*Year\s*[:\s]*([12]\d{3}-\d{2})/gi)) {
    if (isPlausibleIndianFyToken(m[1])) push(0, m[1]);
  }
  for (const m of head120.matchAll(/\bFY\s*[:\s]*([12]\d{3}-\d{2})\b/gi)) {
    if (isPlausibleIndianFyToken(m[1])) push(1, m[1]);
  }
  for (const m of head25.matchAll(/\b(20\d{2}-\d{2})\b/g)) {
    if (isPlausibleIndianFyToken(m[1])) push(2, m[1]);
  }
  for (const m of head25.matchAll(/\b(20\d{2})[_-](\d{2})\b/g)) {
    const token = `${m[1]}-${m[2]}`;
    if (isPlausibleIndianFyToken(token)) push(2, token);
  }
  for (const m of head120.matchAll(/\b([12]\d{3}-\d{2})\s*[–-]\s*([12]\d{3}-\d{2})\b/g)) {
    if (isPlausibleIndianFyToken(m[1])) push(3, m[1]);
    if (isPlausibleIndianFyToken(m[2])) push(3, m[2]);
  }

  return [...tiers[0], ...tiers[1], ...tiers[2], ...tiers[3]];
}

/**
 * @param {string} text
 * @returns {string|undefined}
 */
export function sniffFyFromAisPdfText(text) {
  const hints = collectFyHintsFromAisPdfText(text);
  return hints[0];
}
