/**
 * Tax Story — premium client-only PDF export.
 *
 * Pipeline:
 *   1. Collect metadata (taxpayer name, FY range, chapter offsets, safe-break offsets).
 *   2. Rasterise <main> with html2canvas-pro at up to 3× DPI, preserving the dark theme.
 *   3. Paginate the tall canvas into A4 slices that align with chapter/card boundaries.
 *   4. Insert a cover page and a table of contents at the front; apply a per-page footer.
 *   5. Save the file.
 *
 * Progress updates are dispatched on `document` as `pdf-export-progress` CustomEvents so the
 * Alpine shell can show a toast without importing anything from this module.
 *
 * jsPDF note: standard fonts (Helvetica) do not ship a ₹ glyph. Any rupee text drawn via jsPDF
 * is replaced with "Rs.". ₹ inside the rasterised body capture is preserved (it is part of the
 * image pixels, not a font call).
 *
 * @param {HTMLElement} root
 * @param {{
 *   title?: string,
 *   taxpayerName?: string,
 *   subtitle?: string,
 *   detailMode?: 'structured' | 'detailed' | 'compact',
 *   qualityMode?: 'high' | 'balanced',
 *   reportData?: any
 * }} opts
 *   - `title`         – filename stem (default "Tax-Story"); also used as the cover heading.
 *   - `taxpayerName`  – optional; if absent we look up `.hero-greeting strong`.
 *   - `subtitle`      – optional; overrides the auto "Prepared for …" subtitle.
 * @returns {Promise<boolean>} true on success, false on failure (user has been alerted).
 */

const SAFE_BREAK_SELECTOR =
  '.chapter, .review-card, .insight-card, .intel-card, .chart-shell, .comparative-table-card';

const GOLD = '#d4af37';
const MUTED = '#71717a';
const COVER_BG = '#0f0f11';

function getJsPdfConstructor() {
  const j = window.jspdf;
  if (j && typeof j.jsPDF === 'function') return j.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  return null;
}

function emit(phase, pct) {
  try {
    document.dispatchEvent(
      new CustomEvent('pdf-export-progress', { detail: { phase, pct } })
    );
  } catch {
    // Event dispatch should never crash the export.
  }
}

function sanitizeForPdfText(str) {
  // jsPDF Helvetica cannot render ₹; replace in any text we draw ourselves.
  return String(str ?? '').replace(/\u20B9/g, 'Rs.');
}

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} ancestor
 */
function offsetWithinAncestor(el, ancestor) {
  const a = ancestor.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { top: r.top - a.top, bottom: r.bottom - a.top };
}

/**
 * Extract FY range from year chips, e.g. "FY 2010-11" … "FY 2024-25".
 * Returns "FY 2010-11 — FY 2024-25" or the single chip or "".
 */
function extractFyRange() {
  const chips = Array.from(document.querySelectorAll('.year-chip__fy'))
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean);
  if (!chips.length) return '';
  const sorted = chips.slice().sort();
  if (sorted.length === 1) return sorted[0];
  return `${sorted[0]} \u2014 ${sorted[sorted.length - 1]}`;
}

function extractTaxpayerName() {
  const el = document.querySelector('.hero-greeting strong');
  const t = el ? (el.textContent || '').trim() : '';
  if (!t || /^there$/i.test(t)) return '';
  return t;
}

/**
 * Clone-time hardening so html2canvas-pro captures the exact dark theme.
 * Strips animations, backdrop-filter, filter, and proactively pins computed colors
 * on high-weight surfaces where `color-mix()` has historically tripped older captures.
 */
function hardenCloneForCanvas(clonedDoc) {
  try {
    const style = clonedDoc.createElement('style');
    style.textContent = `
      * , *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      .scroll-reveal, .scroll-reveal * {
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
      .grain-overlay, .hero-orbs, #cursor-trail-canvas, .cursor-trail-canvas {
        display: none !important;
      }
      .glance-tile__value, .headline-display__accent {
        background: none !important;
        background-image: none !important;
        -webkit-background-clip: border-box !important;
        background-clip: border-box !important;
        color: #ececf0 !important;
        -webkit-text-fill-color: #ececf0 !important;
        text-shadow: none !important;
      }
      .glance-tile::before, .glance-tile::after {
        opacity: 0 !important;
      }
    `;
    clonedDoc.head.appendChild(style);
  } catch {}
  try {
    clonedDoc.documentElement.style.setProperty('-webkit-font-smoothing', 'antialiased');
    clonedDoc.documentElement.style.setProperty('text-rendering', 'optimizeLegibility');
  } catch {}
  const clones = clonedDoc.querySelectorAll('*');
  clones.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.setProperty('backdrop-filter', 'none');
    el.style.setProperty('-webkit-backdrop-filter', 'none');
    const cs = window.getComputedStyle(el);
    if (cs.filter && cs.filter !== 'none') el.style.setProperty('filter', 'none');
    if (cs.animationName && cs.animationName !== 'none') {
      el.style.setProperty('animation', 'none');
    }
    if (cs.transition && cs.transition !== 'none' && cs.transition !== 'all 0s ease 0s') {
      el.style.setProperty('transition', 'none');
    }
    const isTransparentText = cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent';
    if (isTransparentText && cs.backgroundImage && cs.backgroundImage !== 'none') {
      el.style.setProperty('background-image', 'none');
      el.style.setProperty('-webkit-text-fill-color', '#ececf0');
      el.style.setProperty('color', '#ececf0');
    }
  });

  // Freeze dynamic hero copy so capture avoids in-between typewriter frames.
  const tw = clonedDoc.getElementById('hero-typewriter');
  if (tw) {
    const liveTw = document.getElementById('hero-typewriter')?.textContent?.trim();
    tw.textContent = liveTw || 'tax story';
  }
  const rot = clonedDoc.getElementById('hero-rotating');
  if (rot) {
    const liveRot = document.getElementById('hero-rotating')?.textContent?.trim();
    rot.textContent = liveRot || 'every year, one place.';
  }

  // Pin resolved computed colors on the heaviest surfaces; scoped so this stays cheap.
  const heavySel =
    '.chapter, .chapter__title, .chapter__lead, .review-card, .insight-card, .intel-card, ' +
    '.chart-shell, .comparative-table-card, .glance-tile, .hero-greeting, .year-chip';
  const liveHeavy = document.querySelectorAll(heavySel);
  const cloneHeavy = clonedDoc.querySelectorAll(heavySel);
  const n = Math.min(liveHeavy.length, cloneHeavy.length);
  for (let i = 0; i < n; i += 1) {
    const l = liveHeavy[i];
    const c = cloneHeavy[i];
    if (!(c instanceof HTMLElement)) continue;
    const cs = window.getComputedStyle(l);
    const reject = /color-mix|^color\(/;
    if (cs.backgroundColor && !reject.test(cs.backgroundColor)) {
      c.style.backgroundColor = cs.backgroundColor;
    }
    if (cs.color && !reject.test(cs.color)) c.style.color = cs.color;
    if (cs.borderColor && !reject.test(cs.borderColor)) {
      c.style.borderColor = cs.borderColor;
    }
  }
}

/**
 * Slice a portion of a source canvas into a freshly allocated canvas.
 * @param {HTMLCanvasElement} source
 * @param {number} sourceY  – integer pixel Y in source canvas coords.
 * @param {number} sliceHeight – integer pixel height in source canvas coords.
 */
function sliceCanvas(source, sourceY, sliceHeight) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = sliceHeight;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, sourceY, source.width, sliceHeight, 0, 0, source.width, sliceHeight);
  return c;
}

/**
 * Pick a break point within (yPx, maxEndPx]. Prefers a safe-break Y that keeps
 * cards whole. Falls back to maxEndPx when no safe break is reachable.
 */
function chooseBreak(yPx, maxEndPx, canvasHeight, safeBreaksPx) {
  if (maxEndPx >= canvasHeight) return canvasHeight;
  // Find the largest safe break that is strictly greater than yPx and <= maxEndPx.
  // safeBreaksPx is sorted ascending.
  let best = -1;
  // Require at least 15% of a page of progress so we don't infinite-loop on
  // consecutive breaks within the same region.
  const minProgress = yPx + Math.max(40, (maxEndPx - yPx) * 0.15);
  for (let i = 0; i < safeBreaksPx.length; i += 1) {
    const b = safeBreaksPx[i];
    if (b <= minProgress) continue;
    if (b > maxEndPx) break;
    best = b;
  }
  return best > 0 ? best : maxEndPx;
}

/**
 * Convert a hex color to 0..1 RGB triplet for jsPDF.setFillColor usage.
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Draw a cover page. Page must already be the active jsPDF page.
 */
function drawCoverPage(pdf, pageW, pageH, cover) {
  const bg = hexToRgb(COVER_BG);
  pdf.setFillColor(bg.r, bg.g, bg.b);
  pdf.rect(0, 0, pageW, pageH, 'F');

  // Decorative glyph: "Rs." at ~80pt in gold, reduced opacity. Use setGState when
  // available; otherwise fall back to a muted gold color so the decoration is subtle.
  const goldRgb = hexToRgb(GOLD);
  try {
    if (typeof pdf.GState === 'function' && typeof pdf.setGState === 'function') {
      const gs = new pdf.GState({ opacity: 0.15 });
      pdf.setGState(gs);
      pdf.setTextColor(goldRgb.r, goldRgb.g, goldRgb.b);
    } else {
      // Blend toward the page background so a 15% gold reads as faint.
      const blend = (a, b) => Math.round(a * 0.15 + b * 0.85);
      pdf.setTextColor(blend(goldRgb.r, bg.r), blend(goldRgb.g, bg.g), blend(goldRgb.b, bg.b));
    }
  } catch {
    pdf.setTextColor(60, 50, 20);
  }
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(80);
  pdf.text('Rs.', pageW / 2, pageH * 0.28, { align: 'center' });
  // Restore full opacity if we changed it.
  try {
    if (typeof pdf.GState === 'function' && typeof pdf.setGState === 'function') {
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    }
  } catch {
    /* no-op */
  }

  // Title.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(36);
  pdf.setTextColor(245, 245, 245);
  pdf.text(sanitizeForPdfText(cover.title), pageW / 2, pageH * 0.46, { align: 'center' });

  // Subtitle.
  if (cover.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(200, 200, 205);
    pdf.text(sanitizeForPdfText(cover.subtitle), pageW / 2, pageH * 0.46 + 30, {
      align: 'center',
    });
  }

  // FY range.
  if (cover.fyRange) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(180, 180, 185);
    pdf.text(sanitizeForPdfText(cover.fyRange), pageW / 2, pageH * 0.46 + 52, {
      align: 'center',
    });
  }

  // Thin gold rule.
  pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
  pdf.setLineWidth(0.6);
  const ruleW = 120;
  pdf.line((pageW - ruleW) / 2, pageH * 0.56, (pageW + ruleW) / 2, pageH * 0.56);

  // Date.
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(160, 160, 165);
  pdf.text(cover.isoDate, pageW / 2, pageH * 0.56 + 22, { align: 'center' });

  // Footer disclaimer.
  pdf.setFontSize(9);
  pdf.setTextColor(130, 130, 138);
  pdf.text(
    'Private, browser-generated analysis - not tax advice.',
    pageW / 2,
    pageH - 48,
    { align: 'center' }
  );
}

/**
 * Draw a Table of Contents on the current jsPDF page.
 * @param {Array<{ title: string, page: number }>} entries
 */
function drawTocPage(pdf, pageW, pageH, entries) {
  const bg = hexToRgb(COVER_BG);
  pdf.setFillColor(bg.r, bg.g, bg.b);
  pdf.rect(0, 0, pageW, pageH, 'F');

  const margin = 56;
  const goldRgb = hexToRgb(GOLD);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(245, 245, 245);
  pdf.text('Contents', margin, margin + 24);

  pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
  pdf.setLineWidth(0.6);
  pdf.line(margin, margin + 34, margin + 80, margin + 34);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(220, 220, 225);

  let y = margin + 70;
  const lineGap = 24;
  const rightX = pageW - margin;
  const maxTitleWidth = rightX - margin - 60;

  entries.forEach((entry, idx) => {
    if (y > pageH - margin) return;
    const num = String(idx + 1).padStart(2, '0');
    const title = sanitizeForPdfText(`${num}  ${entry.title}`);
    const pageLabel = String(entry.page);

    const titleW = pdf.getTextWidth(title);
    pdf.text(title, margin, y);
    pdf.text(pageLabel, rightX, y, { align: 'right' });

    // Leader dots.
    const dotStart = margin + Math.min(titleW, maxTitleWidth) + 8;
    const dotEnd = rightX - pdf.getTextWidth(pageLabel) - 8;
    if (dotEnd > dotStart) {
      pdf.setTextColor(110, 110, 118);
      const dots = '. '.repeat(Math.max(0, Math.floor((dotEnd - dotStart) / 3)));
      pdf.text(dots, dotStart, y);
      pdf.setTextColor(220, 220, 225);
    }

    y += lineGap;
  });
}

/**
 * @param {HTMLElement} root
 */
function extractSummaryData(root) {
  const tiles = Array.from(root.querySelectorAll('.glance-tile')).slice(0, 8).map((el) => ({
    label: (el.querySelector('.glance-tile__label')?.textContent || '').trim(),
    value: (el.querySelector('.glance-tile__value')?.textContent || '').trim(),
    sub: (el.querySelector('.glance-tile__sub')?.textContent || '').trim(),
  })).filter((x) => x.label && x.value);

  const reviewHighlights = Array.from(root.querySelectorAll('.review-card')).slice(0, 6).map((el) => ({
    title: (el.querySelector('.review-card__title')?.textContent || '').trim(),
    body: (el.querySelector('.review-card__body')?.textContent || '').trim(),
  })).filter((x) => x.title);

  const insightHighlights = Array.from(root.querySelectorAll('.insight-card')).slice(0, 5).map((el) => ({
    title: (el.querySelector('.insight-card__category')?.textContent || '').trim(),
    body: (el.querySelector('.insight-card__note')?.textContent || '').trim(),
  })).filter((x) => x.title);

  const chartTitles = Array.from(root.querySelectorAll('.chart-shell__label'))
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  return { tiles, reviewHighlights, insightHighlights, chartTitles };
}

function drawSummaryPage(pdf, pageW, pageH, summary) {
  const bg = hexToRgb(COVER_BG);
  const goldRgb = hexToRgb(GOLD);
  pdf.setFillColor(bg.r, bg.g, bg.b);
  pdf.rect(0, 0, pageW, pageH, 'F');

  const margin = 46;
  const colGap = 16;
  const colW = (pageW - margin * 2 - colGap) / 2;
  let yLeft = 110;
  let yRight = 110;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(245, 245, 245);
  pdf.text('Executive Summary', margin, 70);
  pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
  pdf.setLineWidth(0.6);
  pdf.line(margin, 78, margin + 122, 78);

  const drawTile = (x, y, w, h, title, value, sub = '') => {
    pdf.setFillColor(25, 25, 30);
    pdf.roundedRect(x, y, w, h, 8, 8, 'F');
    pdf.setDrawColor(65, 58, 28);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, y, w, h, 8, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(166, 166, 173);
    pdf.text(sanitizeForPdfText(title), x + 10, y + 15);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(236, 236, 240);
    pdf.text(sanitizeForPdfText(value), x + 10, y + 30);
    if (sub) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(145, 145, 152);
      pdf.text(sanitizeForPdfText(sub), x + 10, y + 42);
    }
  };

  summary.tiles.slice(0, 6).forEach((tile, i) => {
    const x = i % 2 === 0 ? margin : margin + colW + colGap;
    const y = i % 2 === 0 ? yLeft : yRight;
    drawTile(x, y, colW, 54, tile.label, tile.value, tile.sub);
    if (i % 2 === 0) yLeft += 62; else yRight += 62;
  });

  const listY = Math.max(yLeft, yRight) + 8;
  const listBlock = (x, y, title, rows) => {
    pdf.setFillColor(22, 22, 27);
    pdf.roundedRect(x, y, colW, 178, 8, 8, 'F');
    pdf.setDrawColor(55, 55, 62);
    pdf.roundedRect(x, y, colW, 178, 8, 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(216, 216, 222);
    pdf.text(sanitizeForPdfText(title), x + 10, y + 18);
    let yy = y + 31;
    rows.slice(0, 6).forEach((r) => {
      const msg = r.body ? `${r.title} - ${r.body}` : r.title;
      const lines = pdf.splitTextToSize(sanitizeForPdfText(msg), colW - 20);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(176, 176, 184);
      pdf.text(lines.slice(0, 2), x + 10, yy);
      yy += Math.min(26, 12 + lines.length * 4.8);
    });
  };

  listBlock(margin, listY, 'Top Reconciliation Highlights', summary.reviewHighlights);
  listBlock(margin + colW + colGap, listY, 'Top Insight Deck Notes', summary.insightHighlights);

  if (summary.chartTitles.length) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(145, 145, 152);
    pdf.text(
      sanitizeForPdfText(`Included charts: ${summary.chartTitles.join(' • ')}`),
      margin,
      pageH - 28
    );
  }
}

/**
 * Draw a footer on every page except the cover (page 1).
 */
function paintFooters(pdf, pageW, pageH, totalPages, isoDate) {
  const goldRgb = hexToRgb(GOLD);
  const mutedRgb = hexToRgb(MUTED);
  const margin = 36;
  const footerY = pageH - 22;
  const ruleY = footerY - 10;

  for (let p = 2; p <= totalPages; p += 1) {
    pdf.setPage(p);

    pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
    pdf.setLineWidth(0.4);
    pdf.line(margin, ruleY, pageW - margin, ruleY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(mutedRgb.r, mutedRgb.g, mutedRgb.b);
    pdf.text('Tax Story \u00B7 Private browser analysis', margin, footerY);
    pdf.text(`${p} / ${totalPages}`, pageW / 2, footerY, { align: 'center' });
    pdf.text(isoDate, pageW - margin, footerY, { align: 'right' });
  }
}

/**
 * Paint the full-page dark background before placing an image slice, so any
 * sub-pixel edges around JPEG/PNG boundaries read as the theme color instead of white.
 */
function fillPageBackground(pdf, pageW, pageH) {
  const bg = hexToRgb(COVER_BG);
  pdf.setFillColor(bg.r, bg.g, bg.b);
  pdf.rect(0, 0, pageW, pageH, 'F');
}

function formatInr(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `Rs. ${(n / 100000).toFixed(2)} L`;
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

function lineValue(v) {
  return v == null || v === '' ? '—' : String(v);
}

function severityStyle(level) {
  const s = String(level || '').toLowerCase();
  if (s === 'review') return { fill: [225, 75, 75], text: [255, 255, 255], label: 'REVIEW' };
  if (s === 'watch') return { fill: [245, 158, 11], text: [30, 20, 0], label: 'WATCH' };
  if (s === 'ok') return { fill: [16, 185, 129], text: [255, 255, 255], label: 'OK' };
  return { fill: [96, 165, 250], text: [255, 255, 255], label: 'INFO' };
}

function drawStructuredExecutiveSummary(pdf, pageW, pageH, reportData = {}) {
  fillPageBackground(pdf, pageW, pageH);
  const margin = 46;
  const w = pageW - margin * 2;
  let y = 72;
  const totals = reportData.totals || {};
  const regime = reportData.regime || null;
  const actions = Array.isArray(reportData.actions) ? reportData.actions : [];
  const risks = Array.isArray(reportData.anomalies) ? reportData.anomalies : [];
  const textHeight = (lines) => {
    const arr = Array.isArray(lines) ? lines : [String(lines ?? '')];
    const d = pdf.getTextDimensions ? pdf.getTextDimensions(arr) : null;
    const measured = Number(d?.h) || 0;
    const fontSize = pdf.getFontSize ? pdf.getFontSize() : 10;
    const lineFactor = typeof pdf.getLineHeightFactor === 'function' ? pdf.getLineHeightFactor() : 1.15;
    const estimated = arr.length * fontSize * lineFactor;
    return Math.max(10, measured, estimated);
  };
  const ensure = (need = 24) => {
    if (y + need <= pageH - 48) return;
    pdf.addPage();
    fillPageBackground(pdf, pageW, pageH);
    y = 72;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(236, 236, 240);
    pdf.text('Executive Summary (cont.)', margin, y);
    y += 24;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(245, 245, 245);
  pdf.text('Executive Summary', margin, y);
  y += 24;

  const drawKpi = (x, yy, label, value) => {
    pdf.setFillColor(24, 24, 30);
    pdf.setDrawColor(64, 58, 32);
    pdf.roundedRect(x, yy, 160, 56, 6, 6, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(170, 170, 178);
    pdf.text(sanitizeForPdfText(label), x + 10, yy + 16);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(236, 236, 240);
    pdf.text(sanitizeForPdfText(value), x + 10, yy + 35);
  };

  drawKpi(margin, y, 'Lifetime earnings', formatInr(totals.lifetimeEarnings));
  drawKpi(margin + 174, y, 'Total tax paid', formatInr(totals.totalTaxPaid));
  drawKpi(
    margin + 348,
    y,
    'Filing risk',
    totals.filingRiskScore != null
      ? `${totals.filingRiskScore}/100${totals.filingRiskLevel ? ` ${String(totals.filingRiskLevel).toUpperCase()}` : ''}`
      : '—'
  );
  y += 74;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(220, 220, 225);
  pdf.text('Regime outcome', margin, y);
  y += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(205, 205, 212);
  const rText = regime
    ? `${String(regime.recommended || '').toUpperCase()} regime recommended. Savings: ${formatInr(Math.abs(regime.savings ?? 0))}.`
    : 'Regime comparison unavailable for selected FY.';
  const rLines = pdf.splitTextToSize(sanitizeForPdfText(rText), w);
  ensure(textHeight(rLines) + 10);
  pdf.text(rLines, margin, y);
  y += Math.max(16, textHeight(rLines) + 4);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(220, 220, 225);
  pdf.text('Top actions', margin, y);
  y += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(205, 205, 212);
  (actions.length ? actions.slice(0, 4) : [{ title: 'No major action items generated.', impact: '', detail: '' }]).forEach((a) => {
    const line = `• ${a.title || 'Action'}${a.impact ? ` — ${a.impact}` : ''}${a.detail ? ` (${a.detail})` : ''}`;
    const lines = pdf.splitTextToSize(sanitizeForPdfText(line), w);
    ensure(textHeight(lines) + 8);
    pdf.text(lines, margin, y);
    y += Math.max(14, textHeight(lines) + 3);
  });

  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(220, 220, 225);
  pdf.text('Recent anomaly flags', margin, y);
  y += 12;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(205, 205, 212);
  (risks.length ? risks.slice(-4) : [{ fy: '', label: 'No high-risk anomalies detected.', detail: '' }]).forEach((e) => {
    const line = `• ${e.fy ? `${e.fy} — ` : ''}${e.label || ''}${e.detail ? `: ${e.detail}` : ''}`;
    const lines = pdf.splitTextToSize(sanitizeForPdfText(line), w);
    ensure(textHeight(lines) + 8);
    pdf.text(lines, margin, y);
    y += Math.max(14, textHeight(lines) + 3);
  });
}

function drawStructuredReport(pdf, pageW, pageH, title, reportData = {}) {
  const margin = 40;
  const contentW = pageW - margin * 2;
  const lineH = 14;
  let y = 56;
  const ensure = (need = 32) => {
    if (y + need <= pageH - 46) return;
    pdf.addPage();
    fillPageBackground(pdf, pageW, pageH);
    y = 56;
  };
  const textHeight = (lines) => {
    const arr = Array.isArray(lines) ? lines : [String(lines ?? '')];
    const d = pdf.getTextDimensions ? pdf.getTextDimensions(arr) : null;
    const measured = Number(d?.h) || 0;
    const fontSize = pdf.getFontSize ? pdf.getFontSize() : 10;
    const lineFactor = typeof pdf.getLineHeightFactor === 'function' ? pdf.getLineHeightFactor() : 1.15;
    const estimated = arr.length * fontSize * lineFactor;
    return Math.max(10, measured, estimated);
  };
  const nextSection = (titleText) => {
    pdf.addPage();
    fillPageBackground(pdf, pageW, pageH);
    y = 56;
    h2(titleText);
  };
  const compact = (text, max = 140) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '—';
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
  };
  const uniqBy = (items, sig) => {
    const out = [];
    const seen = new Set();
    items.forEach((item) => {
      const key = sig(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  };
  const h1 = (t) => {
    ensure(36);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(245, 245, 245);
    pdf.text(sanitizeForPdfText(t), margin, y);
    y += 22;
  };
  const h2 = (t) => {
    ensure(24);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(220, 220, 225);
    pdf.text(sanitizeForPdfText(t), margin, y);
    y += 16;
  };
  const kv = (k, v) => {
    const valLines = pdf.splitTextToSize(sanitizeForPdfText(lineValue(v)), contentW - 126);
    const h = textHeight(valLines);
    ensure(Math.max(16, h + 4));
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(170, 170, 178);
    pdf.text(sanitizeForPdfText(`${k}:`), margin, y);
    pdf.setTextColor(236, 236, 240);
    pdf.text(valLines, margin + 120, y);
    y += Math.max(lineH, h + 2);
  };
  const para = (text) => {
    const lines = pdf.splitTextToSize(sanitizeForPdfText(lineValue(text)), contentW);
    const h = textHeight(lines);
    ensure(h + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(205, 205, 212);
    pdf.text(lines, margin, y);
    y += Math.max(14, h + 4);
  };
  const bullet = (text) => {
    const lines = pdf.splitTextToSize(sanitizeForPdfText(lineValue(text)), contentW - 16);
    const h = textHeight(lines);
    ensure(h + 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(210, 210, 216);
    pdf.text('•', margin, y);
    pdf.text(lines, margin + 10, y);
    y += Math.max(14, h + 4);
  };

  fillPageBackground(pdf, pageW, pageH);
  h1(`${title} — Structured Report`);
  kv('Generated on', (reportData.generatedOn || '').slice(0, 10));
  kv('Taxpayer', reportData.taxpayerName || '—');
  kv('Employer', reportData.employer || '—');
  kv('City', reportData.city || '—');
  kv('FY range', Array.isArray(reportData.fyRange) && reportData.fyRange.length ? `${reportData.fyRange[0]} to ${reportData.fyRange[reportData.fyRange.length - 1]}` : '—');
  y += 8;

  h2('Key totals');
  const totals = reportData.totals || {};
  kv('Lifetime earnings', formatInr(totals.lifetimeEarnings));
  kv('Total tax paid', formatInr(totals.totalTaxPaid));
  kv('Effective tax rate', totals.effectiveTaxRate != null ? `${Number(totals.effectiveTaxRate).toFixed(2)}%` : '—');
  kv(
    'Filing risk',
    totals.filingRiskScore != null
      ? `${totals.filingRiskScore}/100${totals.filingRiskLevel ? ` (${String(totals.filingRiskLevel).toUpperCase()})` : ''}`
      : '—'
  );

  h2('Regime comparison');
  const r = reportData.regime;
  if (!r) {
    para('Not enough data to run regime comparison for selected FY.');
  } else {
    kv('Recommended', `${String(r.recommended || '').toUpperCase()} regime`);
    kv('Estimated savings', formatInr(Math.abs(r.savings ?? 0)));
    kv('Old regime tax', formatInr(r.oldTax));
    kv('New regime tax', formatInr(r.newTax));
    para(r.reason || '');
  }

  h2('Action center');
  const actions = Array.isArray(reportData.actions) ? reportData.actions : [];
  if (!actions.length) {
    para('No action items generated.');
  } else {
    const prioW = 64;
    const actionW = contentW - prioW;
    ensure(24);
    pdf.setFillColor(28, 28, 34);
    pdf.roundedRect(margin, y - 10, contentW, 16, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(194, 194, 202);
    pdf.text('Order', margin + 8, y);
    pdf.text('Recommended action', margin + prioW + 8, y);
    y += 14;
    actions.slice(0, 14).forEach((a, idx) => {
      const level = idx < 3 ? 'Top' : (idx < 8 ? 'Next' : 'Later');
      const actionText = `${compact(a.title || 'Action', 76)}${a.impact ? ` | ${compact(a.impact, 64)}` : ''}`;
      const actionLines = pdf.splitTextToSize(sanitizeForPdfText(actionText), actionW - 12).slice(0, 2);
      const rowH = Math.max(13, textHeight(actionLines) + 2);
      ensure(rowH + 4);
      if (idx % 2 === 0) {
        pdf.setFillColor(22, 22, 28);
        pdf.rect(margin, y - 9, contentW, rowH, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);
      pdf.setTextColor(210, 210, 216);
      pdf.text(level, margin + 8, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(actionLines, margin + prioW + 8, y);
      y += rowH;
    });
  }

  h2('Data confidence');
  const conf = Array.isArray(reportData.confidence) ? reportData.confidence : [];
  if (!conf.length) para('No confidence items generated.');
  conf.forEach((c) => kv(c.label || 'Metric', c.value || '—'));

  h2('Anomaly timeline');
  const an = Array.isArray(reportData.anomalies) ? reportData.anomalies : [];
  if (!an.length) {
    para('No major anomalies flagged.');
  } else {
    const fyW = 74;
    const noteW = contentW - fyW;
    ensure(24);
    pdf.setFillColor(28, 28, 34);
    pdf.roundedRect(margin, y - 10, contentW, 16, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(194, 194, 202);
    pdf.text('FY', margin + 8, y);
    pdf.text('Flag', margin + fyW + 8, y);
    y += 14;
    an.slice(0, 16).forEach((e, idx) => {
      const note = `${compact(e.label || '', 52)}${e.detail ? ` | ${compact(e.detail, 72)}` : ''}`;
      const noteLines = pdf.splitTextToSize(sanitizeForPdfText(note), noteW - 12).slice(0, 2);
      const rowH = Math.max(13, textHeight(noteLines) + 2);
      ensure(rowH + 4);
      if (idx % 2 === 0) {
        pdf.setFillColor(22, 22, 28);
        pdf.rect(margin, y - 9, contentW, rowH, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);
      pdf.setTextColor(210, 210, 216);
      pdf.text(String(e.fy || '—'), margin + 8, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(noteLines, margin + fyW + 8, y);
      y += rowH;
    });
  }

  nextSection('Review cards');
  const cards = Array.isArray(reportData.reviewCards) ? reportData.reviewCards : [];
  if (!cards.length) para('No review cards generated.');
  const compactCards = uniqBy(cards, (c) =>
    `${String(c.severity || '').toLowerCase()}|${String(c.fy || '').toLowerCase()}|${compact(c.title || '', 64).toLowerCase()}`
  );
  compactCards.slice(0, 24).forEach((c) => {
    const style = severityStyle(c.severity);
    const text = `${c.fy ? `${c.fy} | ` : ''}${compact(c.title || 'Review item', 58)}${c.body ? ` — ${compact(c.body, 108)}` : ''}`;
    const lines = pdf.splitTextToSize(sanitizeForPdfText(text), contentW - 70).slice(0, 2);
    const h = textHeight(lines);
    ensure(h + 14);
    pdf.setFillColor(style.fill[0], style.fill[1], style.fill[2]);
    pdf.roundedRect(margin, y - 8, 52, 12, 2, 2, 'F');
    pdf.setTextColor(style.text[0], style.text[1], style.text[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(style.label, margin + 6, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(210, 210, 216);
    pdf.text(lines, margin + 58, y);
    y += Math.max(14, h + 4);
  });
  if (compactCards.length > 24) para(`+ ${compactCards.length - 24} more review cards omitted for readability.`);

  nextSection('Insights');
  const insights = Array.isArray(reportData.insights) ? reportData.insights : [];
  if (!insights.length) para('No insights generated.');
  const compactInsights = uniqBy(insights, (i) =>
    `${compact(i.category || i.title || 'Insight', 32).toLowerCase()}|${compact(i.note || i.body || i.detail || '', 72).toLowerCase()}`
  );
  compactInsights.slice(0, 18).forEach((i, idx) => {
    const note = compact(i.note || i.body || i.detail || '', 124);
    bullet(`${idx + 1}. ${compact(i.category || i.title || 'Insight', 34)} | ${note}`);
  });
  if (compactInsights.length > 18) para(`+ ${compactInsights.length - 18} more insights omitted for readability.`);

  nextSection('Comparative table snapshot');
  const comp = reportData.comparative || {};
  const years = Array.isArray(comp.years) ? comp.years : [];
  const rows = Array.isArray(comp.rows) ? comp.rows : [];
  if (rows.length) {
    const shownYears = years.slice(-6);
    const startIdx = Math.max(0, years.length - shownYears.length);
    const tableYears = shownYears.length ? shownYears : years.slice(0, 1);
    para(`Showing last ${tableYears.length} FY columns: ${tableYears.join(', ')}`);
    const metricW = Math.max(142, contentW * 0.34);
    const yearCount = Math.max(1, tableYears.length);
    const valueW = (contentW - metricW) / yearCount;
    const drawTableHeader = () => {
      ensure(22);
      pdf.setFillColor(28, 28, 34);
      pdf.roundedRect(margin, y - 10, contentW, 16, 3, 3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(194, 194, 202);
      pdf.text('Metric', margin + 6, y);
      tableYears.forEach((fy, idx) => {
        const colX = margin + metricW + idx * valueW;
        pdf.text(sanitizeForPdfText(String(fy)), colX + valueW / 2, y, { align: 'center' });
      });
      y += 14;
    };
    drawTableHeader();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.4);
    rows.slice(0, 22).forEach((row, idx) => {
      const cells = Array.isArray(row.cells) ? row.cells.slice(startIdx, startIdx + tableYears.length) : [];
      const metricLines = pdf.splitTextToSize(sanitizeForPdfText(row.label || 'Row'), metricW - 10).slice(0, 2);
      const valueLines = cells.map((c) =>
        pdf.splitTextToSize(sanitizeForPdfText(String(c ?? '—')), valueW - 8).slice(0, 2)
      );
      const rowH = Math.max(
        14,
        textHeight(metricLines) + 2,
        ...valueLines.map((v) => textHeight(v) + 2)
      );
      ensure(rowH + 6);
      if (y + rowH > pageH - 50) {
        pdf.addPage();
        fillPageBackground(pdf, pageW, pageH);
        y = 56;
        drawTableHeader();
      }
      if (idx % 2 === 0) {
        pdf.setFillColor(22, 22, 28);
        pdf.rect(margin, y - 9, contentW, rowH, 'F');
      }
      pdf.setTextColor(206, 206, 214);
      pdf.text(metricLines, margin + 6, y);
      valueLines.forEach((lines, cIdx) => {
        const colX = margin + metricW + cIdx * valueW;
        const text = lines.length === 1 ? lines[0] : lines;
        pdf.text(text, colX + valueW / 2, y, { align: 'center' });
      });
      y += rowH;
    });
    if (rows.length > 22) para(`+ ${rows.length - 22} more comparative rows omitted for readability.`);
  } else {
    para('Comparative table rows are not available.');
  }

  nextSection('Detected files');
  const files = Array.isArray(reportData.files) ? reportData.files : [];
  if (!files.length) para('No uploaded files listed.');
  const fileRows = files.slice(0, 40);
  const tableMetricW = 90;
  const tableKindW = 126;
  const tableNameW = contentW - tableMetricW - tableKindW;
  ensure(28);
  pdf.setFillColor(28, 28, 34);
  pdf.roundedRect(margin, y - 10, contentW, 16, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(194, 194, 202);
  pdf.text('FY', margin + 6, y);
  pdf.text('Type', margin + tableMetricW + 6, y);
  pdf.text('File', margin + tableMetricW + tableKindW + 6, y);
  y += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.3);
  fileRows.forEach((f, idx) => {
    const name = String(f.name || '').replace(/\s+/g, ' ');
    const nameLines = pdf.splitTextToSize(sanitizeForPdfText(name), tableNameW - 10).slice(0, 2);
    const rowH = Math.max(13, textHeight(nameLines) + 2);
    ensure(rowH + 4);
    if (idx % 2 === 0) {
      pdf.setFillColor(22, 22, 28);
      pdf.rect(margin, y - 9, contentW, rowH, 'F');
    }
    pdf.setTextColor(210, 210, 216);
    pdf.text(sanitizeForPdfText(String(f.fy || '—')), margin + 6, y);
    pdf.text(sanitizeForPdfText(String(f.kind || 'Unknown')), margin + tableMetricW + 6, y);
    pdf.text(nameLines, margin + tableMetricW + tableKindW + 6, y);
    y += rowH;
  });
  if (files.length > 40) para(`+ ${files.length - 40} more files omitted for readability.`);
}

export async function exportStoryPdf(root, opts = {}) {
  const JsPDF = getJsPdfConstructor();
  if (!JsPDF) {
    window.alert('PDF engine did not load. Please reload and try again.');
    return false;
  }
  const html2canvas = window.html2canvas;

  const title = opts.title ?? 'Tax-Story';
  const detailMode = opts.detailMode === 'structured'
    ? 'structured'
    : (opts.detailMode === 'compact' ? 'compact' : 'detailed');
  const qualityMode = opts.qualityMode === 'balanced' ? 'balanced' : 'high';
  const includeSummary = detailMode === 'detailed';
  const taxpayerName = opts.taxpayerName ?? extractTaxpayerName();
  const fyRange = extractFyRange();
  const isoDate = new Date().toISOString().slice(0, 10);
  const subtitle =
    opts.subtitle ?? (taxpayerName ? `Prepared for ${taxpayerName}` : 'Private analysis');

  if (detailMode === 'structured') {
    emit('Building structured report…', 10);
    const JsPDF = getJsPdfConstructor();
    if (!JsPDF) {
      window.alert('PDF engine is unavailable. Please reload and try again.');
      return false;
    }
    let pdf;
    try {
      pdf = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const isoDate = new Date().toISOString().slice(0, 10);
      drawCoverPage(pdf, pageW, pageH, {
        title,
        subtitle,
        fyRange,
        isoDate,
      });
      pdf.addPage();
      drawStructuredExecutiveSummary(pdf, pageW, pageH, opts.reportData || {});
      pdf.addPage();
      drawStructuredReport(pdf, pageW, pageH, title, opts.reportData || {});
      const totalPages =
        typeof pdf.getNumberOfPages === 'function'
          ? pdf.getNumberOfPages()
          : typeof pdf.internal?.getNumberOfPages === 'function'
            ? pdf.internal.getNumberOfPages()
            : 2;
      paintFooters(pdf, pageW, pageH, totalPages, isoDate);
      emit('Saving PDF…', 95);
      pdf.save(`${title.replace(/\s+/g, '-')}.pdf`);
      emit('Done', 100);
      return true;
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
      window.alert(`Could not build structured PDF.\n\n${msg}`);
      return false;
    }
  }

  document.body.classList.add('pdf-exporting');
  const prevY = window.scrollY;

  // Collect layout metadata BEFORE capture so we can align page breaks with chapter/card edges.
  window.scrollTo(0, 0);
  // Allow scroll-triggered layout to settle for a frame.
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const chapterEls = Array.from(root.querySelectorAll('.chapter'));
  const chapters = chapterEls
    .map((el) => {
      const titleEl = el.querySelector('.chapter__title');
      const t = titleEl ? (titleEl.textContent || '').trim() : '';
      const { top, bottom } = offsetWithinAncestor(el, root);
      return { title: t, topCss: top, bottomCss: bottom };
    })
    .filter((c) => c.title);

  const safeBreakEls = Array.from(root.querySelectorAll(SAFE_BREAK_SELECTOR));
  const safeBreaksCss = safeBreakEls
    .map((el) => offsetWithinAncestor(el, root).bottom)
    .filter((y) => Number.isFinite(y) && y > 0);

  // Adaptive scale: keep output sharp by default, then step down only for
  // very large layouts to avoid renderer crashes.
  const dpr = window.devicePixelRatio || 1;
  const cssArea = Math.max(1, root.scrollWidth * root.scrollHeight);
  const hugeReport = root.scrollHeight > 10000 || cssArea > 18_000_000;
  const ultraLargeReport = root.scrollHeight > 14000 || cssArea > 28_000_000;
  const qBoost = qualityMode === 'high' ? 1 : 0.9;
  const preferredScale = ultraLargeReport
    ? Math.min(2.35, Math.max(1.95, dpr * 1.18 * qBoost))
    : hugeReport
      ? Math.min(2.8, Math.max(2.05, dpr * 1.3 * qBoost))
      : Math.min(3, Math.max(2.25, dpr * 1.5 * qBoost));
  const fallbackScale = Math.max(1.6, preferredScale * 0.82);
  const qualityLabel = qualityMode === 'high' ? 'high quality' : 'balanced quality';
  emit(`Capturing page in ${qualityLabel}\u2026`, 10);

  let canvas;
  try {
    const captureOnce = (scale) =>
      html2canvas(root, {
        scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: COVER_BG,
        scrollX: 0,
        scrollY: 0,
        windowWidth: root.scrollWidth,
        windowHeight: root.scrollHeight,
        imageTimeout: 25000,
        onclone(clonedDoc) {
          hardenCloneForCanvas(clonedDoc);
        },
      });

    try {
      canvas = await captureOnce(preferredScale);
    } catch {
      emit('Retrying capture with lighter quality\u2026', 25);
      canvas = await captureOnce(fallbackScale);
    }
  } catch (e) {
    document.body.classList.remove('pdf-exporting');
    window.scrollTo(0, prevY);
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    window.alert(
      `Could not capture the page for PDF.\n\n${msg}\n\nTry reloading, disabling ad blockers, or opening in a different browser.`
    );
    return false;
  }

  window.scrollTo(0, prevY);
  document.body.classList.remove('pdf-exporting');

  if (!canvas.width || !canvas.height) {
    window.alert('Captured image was empty - scroll to the top and export again.');
    return false;
  }

  emit('Laying out PDF\u2026', 60);

  // Build the PDF. Page size is A4 portrait, measured in points.
  let pdf;
  try {
    pdf = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    window.alert(`PDF engine could not start.\n\n${msg}`);
    return false;
  }

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const footerReserve = 24;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - footerReserve;

  // Map layout coords: canvas is captured at captureScale, so CSS-px values scale directly.
  // Image placed at width usableW. The canvas-to-pdf vertical ratio is `usableW / canvas.width`.
  // Each PDF page can show at most `sliceMaxPxInCanvas` source-canvas rows.
  const sliceMaxPxInCanvas = Math.floor((usableH * canvas.width) / usableW);

  // Translate CSS-px offsets into canvas-px. Canvas width matches root CSS width * captureScale.
  const cssToCanvas = canvas.width / Math.max(1, root.scrollWidth);
  const safeBreaksPx = Array.from(
    new Set(safeBreaksCss.map((y) => Math.round(y * cssToCanvas)))
  )
    .filter((y) => y > 0 && y <= canvas.height)
    .sort((a, b) => a - b);

  // Paginate content into pages 1..N. Track which chapter starts on which content page.
  /** @type {Array<{ title: string, contentPage: number }>} */
  const tocMapping = [];
  const chapterTopsPx = chapters.map((c) => ({
    title: c.title,
    topPx: Math.max(0, Math.round(c.topCss * cssToCanvas)),
  }));
  let chapterCursor = 0;

  let yPx = 0;
  let contentPage = 0;
  try {
    while (yPx < canvas.height) {
      const maxEndPx = Math.min(yPx + sliceMaxPxInCanvas, canvas.height);
      const breakPx = chooseBreak(yPx, maxEndPx, canvas.height, safeBreaksPx);
      const slicePx = Math.max(1, breakPx - yPx);
      const slice = sliceCanvas(canvas, yPx, slicePx);
      if (!slice) break;
      const sliceH = (slicePx * usableW) / canvas.width;

      if (contentPage > 0) pdf.addPage();
      contentPage += 1;

      fillPageBackground(pdf, pageW, pageH);
      pdf.addImage(
        slice.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        usableW,
        sliceH,
        undefined,
        'MEDIUM'
      );

      // Record chapters whose top lies within this slice.
      while (
        chapterCursor < chapterTopsPx.length &&
        chapterTopsPx[chapterCursor].topPx < breakPx
      ) {
        tocMapping.push({
          title: chapterTopsPx[chapterCursor].title,
          contentPage,
        });
        chapterCursor += 1;
      }

      yPx = breakPx;
    }
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    window.alert(
      `PDF layout failed midway.\n\n${msg}\n\nTry closing other tabs or exporting from a desktop browser.`
    );
    return false;
  }

  // Any chapters beyond the last recorded slice (shouldn't happen, but just in case).
  while (chapterCursor < chapterTopsPx.length) {
    tocMapping.push({
      title: chapterTopsPx[chapterCursor].title,
      contentPage: Math.max(1, contentPage),
    });
    chapterCursor += 1;
  }

  emit('Rendering cover + contents\u2026', 85);

  // Insert TOC at position 1, then cover at position 1.
  // After both insertions: cover = page 1, TOC = page 2, content = pages 3..N+2.
  try {
    if (typeof pdf.insertPage === 'function') {
      const frontMatterOffset = includeSummary ? 3 : 2;
      pdf.insertPage(1); // becomes new page 1; content shifts down by 1
      pdf.setPage(1);
      // Draw TOC — page numbers in the TOC reflect final document pagination.
      drawTocPage(
        pdf,
        pageW,
        pageH,
        tocMapping.map((m) => ({ title: m.title, page: m.contentPage + frontMatterOffset }))
      );

      pdf.insertPage(1); // new page 1 = cover; TOC shifts to 2.
      pdf.setPage(1);
      drawCoverPage(pdf, pageW, pageH, {
        title,
        subtitle,
        fyRange,
        isoDate,
      });

      if (includeSummary) {
        pdf.insertPage(3); // Cover=1, TOC=2, Summary=3
        pdf.setPage(3);
        drawSummaryPage(pdf, pageW, pageH, extractSummaryData(root));
      }
    } else {
      // Older jsPDF builds without insertPage: just prepend by re-ordering is not possible,
      // so fall back to no cover/TOC rather than corrupting the file.
      // (Recent jsPDF 2.x all expose insertPage, so this branch is a safety net.)
    }
  } catch (e) {
    // Cover/TOC failures should not block saving the core content.
    emit('Cover/contents fallback applied', 90);
  }

  // Footers on every page except the cover.
  const totalPages =
    typeof pdf.getNumberOfPages === 'function'
      ? pdf.getNumberOfPages()
      : typeof pdf.internal?.getNumberOfPages === 'function'
        ? pdf.internal.getNumberOfPages()
        : contentPage + 2;
  paintFooters(pdf, pageW, pageH, totalPages, isoDate);

  emit('Saving PDF\u2026', 98);

  try {
    pdf.save(`${title.replace(/\s+/g, '-')}.pdf`);
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
    window.alert(
      `PDF could not be saved.\n\n${msg}\n\nTry a different browser or disable aggressive privacy extensions.`
    );
    return false;
  }

  emit('Done', 100);
  return true;
}
