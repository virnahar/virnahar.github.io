/**
 * Tax Story — premium client-only PDF export.
 *
 * Structured mode (default): pure jsPDF vector drawing — no screenshot.
 * Detailed mode (legacy):    html2canvas-pro rasterise + paginate.
 *
 * Y-coordinate model (prevents text overlap):
 *   - y always = TOP of the next element to draw
 *   - Text baseline = y + topPad + (fontSize * 0.72)
 *   - After each element: y += elementHeight
 *   - No negative y offsets anywhere
 *
 * PDF structure (structured mode):
 *   1. Cover page        — personalised: name, PAN, company, income, taxes
 *   2. Executive Summary — KPI grid + regime recommendation + actions
 *   3. Income Overview   — year-on-year comparative table
 *   4. Regime Analysis   — full old vs new breakdown + action table
 *   5. Review Items      — ITR vs AIS reconciliation (severity-coded)
 *   6. Insights          — TIS/AIS insight deck
 *   7. Anomaly Timeline  — risk flag table
 *   8. Uploaded Files    — file manifest
 */

/** Mask first 5 chars of a PAN (ABCDE1234F → XXXXX1234F). */
function maskPan(pan) {
  if (!pan || pan.length < 5) return pan;
  return 'XXXXX' + pan.slice(5);
}

// ── Colour tokens ──────────────────────────────────────────────────────────────
const C = {
  coverBg:      [13,  15,  21],
  pageBg:       [245, 239, 224],   // warm cream — prints cleanly
  sectionBg:    [233, 226, 208],   // slightly deeper page-header band
  ink:          [18,  18,  26],    // primary text
  inkMed:       [58,  58,  72],    // secondary
  inkMuted:     [118, 112, 98],    // labels/captions
  gold:         [184, 146, 26],    // gold on light bg
  goldCover:    [212, 175, 55],    // gold on dark cover
  teal:         [26,  107, 92],
  tealCover:    [94,  173, 154],
  rule:         [218, 210, 190],
  cardBg:       [255, 252, 245],
  tableHdr:     [38,  32,  8],     // near-black table header
  tableHdrTxt:  [240, 234, 210],
  tableAlt:     [250, 245, 232],
  badgeRed:     [185, 28,  28],
  badgeAmber:   [175, 82,  9],
  badgeGreen:   [4,   118, 85],
  badgeBlue:    [37,  99,  235],
};

// ── Font metrics (Helvetica in jsPDF, units = pt) ──────────────────────────────
// Text baseline ≈ y_top + topPad + fontSize × 0.72
// Total text-line height ≈ fontSize × 1.22
const BL = 0.72;  // baseline factor

// ── Utilities ─────────────────────────────────────────────────────────────────
function emit(phase, pct) {
  try {
    document.dispatchEvent(new CustomEvent('pdf-export-progress', { detail: { phase, pct } }));
  } catch { /* never crash export */ }
}

function px(str) {
  return String(str ?? '').replace(/\u20B9/g, 'Rs.');
}

function fmtInr(n) {
  if (n == null || !Number.isFinite(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `Rs.${(n / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000)   return `Rs.${(n / 100000).toFixed(2)} L`;
  return `Rs.${Math.round(n).toLocaleString('en-IN')}`;
}

function getJsPDF() {
  const j = window.jspdf;
  if (j && typeof j.jsPDF === 'function') return j.jsPDF;
  if (typeof window.jsPDF === 'function') return window.jsPDF;
  return null;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function severityStyle(level) {
  const s = String(level || '').toLowerCase();
  if (s === 'review') return { badge: C.badgeRed,   label: 'REVIEW' };
  if (s === 'watch')  return { badge: C.badgeAmber, label: 'WATCH'  };
  if (s === 'ok')     return { badge: C.badgeGreen, label: 'OK'     };
  return                     { badge: C.badgeBlue,  label: 'INFO'   };
}

// Approximate height of a jsPDF text block (lines × lineHeight)
function measH(pdf, lines, fontSize) {
  const arr = Array.isArray(lines) ? lines : [String(lines ?? '')];
  const lh = fontSize * 1.22;
  return arr.length * lh;
}

// ── Page builder factory ───────────────────────────────────────────────────────
function makeCtx(pdf, pW, pH, margin = 48) {
  const HDR_H    = 36;   // page header strip height
  const FTR_H    = 28;   // footer reserve
  const cW       = pW - margin * 2;
  let y          = HDR_H + 18;
  let secIdx     = 0;
  const isoDate  = new Date().toISOString().slice(0, 10);

  const set = {
    fill: (c) => pdf.setFillColor(c[0], c[1], c[2]),
    draw: (c) => pdf.setDrawColor(c[0], c[1], c[2]),
    text: (c) => pdf.setTextColor(c[0], c[1], c[2]),
    font: (st, sz) => { pdf.setFont('helvetica', st); pdf.setFontSize(sz); },
    lw:   (w) => pdf.setLineWidth(w),
  };

  function _pageHdr() {
    set.fill(C.pageBg); pdf.rect(0, 0, pW, pH, 'F');
    set.fill(C.sectionBg); pdf.rect(0, 0, pW, HDR_H, 'F');
    set.lw(0.5); set.draw(C.gold);
    pdf.line(0, HDR_H, pW, HDR_H);
    set.font('bold', 8); set.text(C.gold);
    pdf.text('Rs.  TAX STORY', margin, HDR_H - 10);
    set.font('normal', 7); set.text(C.inkMuted);
    pdf.text(isoDate, pW - margin, HDR_H - 10, { align: 'right' });
  }

  function newPage() {
    pdf.addPage();
    _pageHdr();
    y = HDR_H + 18;
  }

  function ensure(need) {
    if (y + need <= pH - FTR_H - 4) return;
    newPage();
  }

  // ── Section header ──
  // Total height consumed: 58pt
  function section(title) {
    secIdx++;
    ensure(60);
    const y0 = y;
    // Eyebrow
    set.font('bold', 7.5); set.text(C.gold);
    pdf.text(`${String(secIdx).padStart(2, '0')}  —  ${title.toUpperCase()}`, margin, y0 + 10);
    // Gold left bar
    set.fill(C.gold);
    pdf.rect(margin, y0 + 16, 3, 24, 'F');
    // Title text (baseline = y0 + 16 + 24*0.65 = y0 + 31.6)
    set.font('bold', 18); set.text(C.ink);
    pdf.text(px(title), margin + 10, y0 + 33);
    // Underrule
    set.lw(0.4); set.draw(C.rule);
    pdf.line(margin, y0 + 44, pW - margin, y0 + 44);
    y = y0 + 58;
  }

  // ── Sub-heading ──  (~26pt)
  function h2(title) {
    ensure(28);
    const y0 = y;
    set.font('bold', 10.5); set.text(C.inkMed);
    pdf.text(px(title), margin, y0 + 10.5 * BL + 2);
    set.lw(0.3); set.draw(C.rule);
    pdf.line(margin, y0 + 14, pW - margin, y0 + 14);
    y = y0 + 24;
  }

  // ── Key-value row ── (each line ~14pt)
  function kv(label, value) {
    const valW   = cW - 130;
    const lines  = pdf.splitTextToSize(px(String(value ?? '\u2014')), valW);
    const lh     = 9 * 1.22;
    const h      = Math.max(14, lines.length * lh + 4);
    ensure(h);
    const y0 = y;
    set.font('normal', 8.5); set.text(C.inkMuted);
    pdf.text(px(String(label ?? '')), margin, y0 + 8.5 * BL + 2);
    set.font('normal', 9); set.text(C.ink);
    pdf.text(lines, margin + 130, y0 + 9 * BL + 2);
    y = y0 + h;
  }

  // ── Paragraph ──
  function para(text, col = C.inkMed) {
    const lines = pdf.splitTextToSize(px(String(text ?? '')), cW);
    const h     = Math.max(14, lines.length * 9.5 * 1.22 + 4);
    ensure(h);
    const y0 = y;
    set.font('normal', 9.5); set.text(col);
    pdf.text(lines, margin, y0 + 9.5 * BL + 2);
    y = y0 + h;
  }

  function spacer(n = 8) { y += n; }

  return {
    pdf, pW, pH, margin, cW, set,
    ensure, newPage, section, h2, kv, para, spacer,
    getY: () => y,
    setY: (v) => { y = v; },
    isoDate,
    HDR_H, FTR_H,
  };
}

// ── Cover page ─────────────────────────────────────────────────────────────────
function drawCover(pdf, pW, pH, { title, taxpayerName, pan, employer, city, fyRange, isoDate,
                                   lifetimeEarnings, totalTaxPaid, effectiveTaxRate }) {
  const s = {
    fill: (c) => pdf.setFillColor(c[0], c[1], c[2]),
    draw: (c) => pdf.setDrawColor(c[0], c[1], c[2]),
    text: (c) => pdf.setTextColor(c[0], c[1], c[2]),
    font: (st, sz) => { pdf.setFont('helvetica', st); pdf.setFontSize(sz); },
    lw: (w) => pdf.setLineWidth(w),
  };
  const M = 52;

  // Full dark background
  s.fill(C.coverBg); pdf.rect(0, 0, pW, pH, 'F');

  // Left accent bar (gold)
  s.fill(C.goldCover); pdf.rect(0, 0, 4, pH, 'F');

  // Ghost "Rs." watermark
  try {
    if (typeof pdf.GState === 'function') {
      pdf.setGState(new pdf.GState({ opacity: 0.07 }));
    }
    s.font('bold', 130); s.text(C.goldCover);
    pdf.text('Rs.', pW * 0.62, pH * 0.42, { align: 'center' });
    if (typeof pdf.GState === 'function') {
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    }
  } catch { /* opacity unsupported — skip */ }

  // ── Top brand label
  s.font('bold', 7.5); s.text(C.goldCover);
  pdf.text('INCOME INTELLIGENCE REPORT  \u00B7  TAX STORY', pW / 2, 48, { align: 'center' });
  s.lw(0.4); s.draw(C.goldCover);
  pdf.line(pW * 0.2, 54, pW * 0.8, 54);

  // ── Hero taxpayer name
  const heroName = px(taxpayerName || 'Your Tax Story');
  s.font('bold', 30); s.text([248, 248, 252]);
  pdf.text(heroName, pW / 2, pH * 0.38, { align: 'center' });

  // Subtitle
  s.font('normal', 12); s.text(C.goldCover);
  pdf.text('Income Intelligence Report', pW / 2, pH * 0.38 + 24, { align: 'center' });

  // FY range
  if (fyRange) {
    s.font('normal', 10); s.text(C.tealCover);
    pdf.text(px(fyRange), pW / 2, pH * 0.38 + 42, { align: 'center' });
  }

  // Thin divider
  s.lw(0.4); s.draw(C.goldCover);
  pdf.line(M + 20, pH * 0.52, pW - M - 20, pH * 0.52);

  // ── Personal info grid (2 columns × 3 rows inside a card area)
  const cardTop = pH * 0.54;
  const cardH   = 148;
  const cardW   = pW - M * 2;
  // Card bg
  s.fill([22, 24, 32]); pdf.roundedRect(M, cardTop, cardW, cardH, 6, 6, 'F');
  s.draw([55, 52, 38]); s.lw(0.5); pdf.roundedRect(M, cardTop, cardW, cardH, 6, 6);

  const col1X = M + 18;
  const col2X = M + cardW / 2 + 10;
  const rowH  = 42;

  function infoCell(x, y, label, value, valColor) {
    s.font('normal', 7); s.text([148, 142, 128]);
    pdf.text(label, x, y);
    s.font('bold', 10.5); s.text(valColor || [235, 232, 220]);
    const lines = pdf.splitTextToSize(px(String(value || '\u2014')), cardW / 2 - 28);
    pdf.text(lines.slice(0, 2), x, y + 14);
  }

  const r1 = cardTop + 22;
  const r2 = cardTop + 22 + rowH;
  const r3 = cardTop + 22 + rowH * 2;

  infoCell(col1X, r1, 'TAXPAYER',    taxpayerName || '\u2014');
  infoCell(col2X, r1, 'PAN',          pan          || '\u2014', pan ? C.goldCover : undefined);
  infoCell(col1X, r2, 'EMPLOYER',     employer     || '\u2014');
  infoCell(col2X, r2, 'CITY',         city         || '\u2014');
  infoCell(col1X, r3, 'LIFETIME EARNINGS', fmtInr(lifetimeEarnings), C.goldCover);
  infoCell(col2X, r3, 'TOTAL TAX PAID', fmtInr(totalTaxPaid));

  // Effective rate badge
  if (effectiveTaxRate != null) {
    const rateX = M + cardW - 18;
    const rateY = cardTop + cardH - 22;
    s.font('normal', 7); s.text([148, 142, 128]);
    pdf.text('EFF. RATE', rateX, rateY, { align: 'right' });
    s.font('bold', 11); s.text(C.tealCover);
    pdf.text(`${Number(effectiveTaxRate).toFixed(1)}%`, rateX, rateY + 14, { align: 'right' });
  }

  // ── Bottom
  s.lw(0.4); s.draw(C.goldCover);
  pdf.line(M + 20, pH - 44, pW - M - 20, pH - 44);
  s.font('normal', 7.5); s.text([125, 122, 112]);
  pdf.text(isoDate, M, pH - 28);
  pdf.text(
    'Private browser-generated analysis — not tax or legal advice.',
    pW / 2, pH - 28, { align: 'center' }
  );

  // Bottom accent bar
  s.fill(C.goldCover); pdf.rect(0, pH - 5, pW, 5, 'F');
}

// ── KPI stat block grid (3 cols) ───────────────────────────────────────────────
function drawKpiGrid(ctx, kpis) {
  if (!kpis.length) return;
  const { pdf, pW, margin, set, ensure, cW } = ctx;
  const GAP  = 14;
  const COLS = Math.min(3, kpis.length);
  const colW = (cW - GAP * (COLS - 1)) / COLS;
  const CARD_H = 66;

  const items = kpis.slice(0, 6);
  const rows  = Math.ceil(items.length / COLS);
  ensure(rows * (CARD_H + GAP) + 8);
  const startY = ctx.getY();

  items.forEach((k, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x   = margin + col * (colW + GAP);
    const y   = startY + row * (CARD_H + GAP);

    // Card
    set.fill(C.cardBg); pdf.roundedRect(x, y, colW, CARD_H, 4, 4, 'F');
    // Gold top accent (3pt)
    set.fill(C.gold); pdf.roundedRect(x, y, colW, 3, 1.5, 1.5, 'F');
    // Border
    set.draw(C.rule); pdf.setLineWidth(0.4); pdf.roundedRect(x, y, colW, CARD_H, 4, 4);

    // Label (top of card)
    const lbl = px(k.label || '');
    set.font('normal', 7); set.text(C.inkMuted);
    pdf.text(lbl, x + 10, y + 3 + 7 * BL + 4);
    // Value
    const valFontSize = k.value && k.value.length > 14 ? 11 : 14;
    set.font('bold', valFontSize); set.text(C.ink);
    pdf.text(px(k.value || '\u2014'), x + 10, y + 3 + 12 + valFontSize * BL + 4);
    // Sub
    if (k.sub) {
      set.font('normal', 7.5); set.text(C.teal);
      pdf.text(px(k.sub), x + 10, y + CARD_H - 10);
    }
  });

  ctx.setY(startY + rows * (CARD_H + GAP) + 8);
}

// ── Table ──────────────────────────────────────────────────────────────────────
// All y values are TOP-of-element. Text baseline = y + pad + fontSize * BL
function drawTable(ctx, { headers, rows, colWidths, alignments }) {
  const { pdf, pW, pH, margin, set, cW, FTR_H } = ctx;
  const FONT_SZ = 8;
  const HDR_H   = 20;   // header row total height
  const HDR_PAD = 5;    // top padding in header row
  const ROW_PAD = 4;    // top/bottom padding in data rows
  const MIN_ROW_H = FONT_SZ * 1.22 + ROW_PAD * 2;

  const totalW  = colWidths.reduce((s, w) => s + w, 0);
  const scale   = cW / totalW;
  const sW      = colWidths.map((w) => w * scale);

  function colX(i) {
    let x = margin;
    for (let j = 0; j < i; j++) x += sW[j];
    return x;
  }

  function drawHeader() {
    ctx.ensure(HDR_H + 4);
    const y = ctx.getY();
    set.fill(C.tableHdr); pdf.rect(margin, y, cW, HDR_H, 'F');
    set.font('bold', FONT_SZ); set.text(C.tableHdrTxt);
    headers.forEach((h, i) => {
      const align = alignments?.[i] || 'left';
      const xT    = align === 'right' ? colX(i) + sW[i] - 5 : colX(i) + 6;
      pdf.text(px(String(h)), xT, y + HDR_PAD + FONT_SZ * BL, { align });
    });
    ctx.setY(y + HDR_H);
  }

  drawHeader();

  rows.forEach((row, rIdx) => {
    const cells    = Array.isArray(row) ? row : (row.cells || []);
    const cLines   = cells.map((c, i) =>
      pdf.splitTextToSize(px(String(c ?? '\u2014')), sW[i] - 10).slice(0, 3)
    );
    const maxLines = Math.max(1, ...cLines.map((l) => l.length));
    const rowH     = Math.max(MIN_ROW_H, maxLines * FONT_SZ * 1.22 + ROW_PAD * 2);

    if (ctx.getY() + rowH > pH - FTR_H - 8) {
      ctx.newPage();
      drawHeader();
    }

    const y = ctx.getY();
    // Alternating tint
    if (rIdx % 2 === 1) {
      set.fill(C.tableAlt); pdf.rect(margin, y, cW, rowH, 'F');
    }
    // Bottom rule
    set.draw(C.rule); pdf.setLineWidth(0.2);
    pdf.line(margin, y + rowH, pW - margin, y + rowH);
    // Cell text
    set.font('normal', FONT_SZ); set.text(C.ink);
    cells.forEach((_, i) => {
      const align = alignments?.[i] || 'left';
      const xT    = align === 'right' ? colX(i) + sW[i] - 5 : colX(i) + 6;
      pdf.text(cLines[i], xT, y + ROW_PAD + FONT_SZ * BL, { align });
    });
    ctx.setY(y + rowH);
  });

  ctx.setY(ctx.getY() + 10);
}

// ── Review card row ────────────────────────────────────────────────────────────
function drawReviewRow(ctx, card, idx) {
  const { pdf, pW, margin, set, cW } = ctx;
  const FONT_SZ = 8.5;
  const PAD_V   = 8;
  const BADGE_W = 44;
  const BADGE_H = 13;
  const BAR_W   = 3;
  const textW   = cW - BADGE_W - BAR_W - 16;

  const style  = severityStyle(card.severity);
  const detail = `${card.fy ? card.fy + '   ' : ''}${String(card.title || '')}${card.body ? '  —  ' + String(card.body).slice(0, 110) : ''}`;
  const lines  = pdf.splitTextToSize(px(detail), textW).slice(0, 3);
  const textHt = lines.length * FONT_SZ * 1.22;
  const rowH   = Math.max(PAD_V * 2 + BADGE_H, PAD_V * 2 + textHt);

  ctx.ensure(rowH + 3);
  const y = ctx.getY();

  // Alt bg
  if (idx % 2 === 1) {
    set.fill(C.tableAlt); pdf.rect(margin, y, cW, rowH, 'F');
  }
  // Left severity bar
  set.fill(style.badge); pdf.rect(margin, y, BAR_W, rowH, 'F');

  // Badge pill (vertically centered)
  const badgeTop = y + (rowH - BADGE_H) / 2;
  set.fill(style.badge); pdf.roundedRect(margin + BAR_W + 6, badgeTop, BADGE_W, BADGE_H, 2, 2, 'F');
  set.font('bold', 6.5); set.text([255, 255, 255]);
  pdf.text(style.label, margin + BAR_W + 6 + BADGE_W / 2, badgeTop + BADGE_H * 0.64, { align: 'center' });

  // Text (baseline at top row + PAD_V + firstLine baseline)
  set.font('normal', FONT_SZ); set.text(C.ink);
  pdf.text(lines, margin + BAR_W + BADGE_W + 16, y + PAD_V + FONT_SZ * BL);

  // Rule
  set.draw(C.rule); pdf.setLineWidth(0.2);
  pdf.line(margin, y + rowH, margin + cW, y + rowH);

  ctx.setY(y + rowH + 1);
}

// ── Footers ────────────────────────────────────────────────────────────────────
function paintFooters(pdf, pW, pH, totalPages, isoDate) {
  const M = 48;
  for (let p = 2; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(C.gold[0], C.gold[1], C.gold[2]);
    pdf.setLineWidth(0.3);
    pdf.line(M, pH - 18, pW - M, pH - 18);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
    pdf.setTextColor(C.inkMuted[0], C.inkMuted[1], C.inkMuted[2]);
    pdf.text('Tax Story  \u00B7  Private browser analysis  \u00B7  Not tax advice', M, pH - 9);
    pdf.text(`${p} / ${totalPages}`, pW / 2, pH - 9, { align: 'center' });
    pdf.text(isoDate, pW - M, pH - 9, { align: 'right' });
  }
}

// ── Section: Executive Summary ─────────────────────────────────────────────────
function drawExecutiveSummary(ctx, rd = {}) {
  const { pdf, margin, set, ensure, cW } = ctx;
  ctx.section('Executive Summary');

  const totals = rd.totals || {};
  const regime = rd.regime;
  const actions = Array.isArray(rd.actions) ? rd.actions : [];

  drawKpiGrid(ctx, [
    { label: 'Lifetime Earnings',    value: fmtInr(totals.lifetimeEarnings), sub: '' },
    { label: 'Total Tax Paid',        value: fmtInr(totals.totalTaxPaid),     sub: '' },
    { label: 'Effective Tax Rate',    value: totals.effectiveTaxRate != null ? `${Number(totals.effectiveTaxRate).toFixed(1)}%` : '\u2014', sub: '' },
    { label: 'Filing Risk',           value: totals.filingRiskScore != null ? `${totals.filingRiskScore} / 100` : '\u2014', sub: totals.filingRiskLevel ? String(totals.filingRiskLevel).toUpperCase() : '' },
    { label: 'Taxpayer',             value: px(rd.taxpayerName || '\u2014') },
    { label: 'Employer / Company',   value: px(rd.employer || '\u2014') },
  ].filter((k) => k.value && k.value !== '\u2014'));

  ctx.spacer(10);

  if (regime) {
    ctx.h2('Regime Recommendation');
    ensure(60);
    const y0 = ctx.getY();
    set.fill(C.cardBg); pdf.roundedRect(margin, y0, cW, 54, 4, 4, 'F');
    set.fill(C.teal); pdf.roundedRect(margin, y0, 3, 54, 1.5, 1.5, 'F');
    set.draw(C.rule); pdf.setLineWidth(0.4); pdf.roundedRect(margin, y0, cW, 54, 4, 4);
    set.font('bold', 8.5); set.text(C.teal);
    pdf.text(`${String(regime.recommended || '').toUpperCase()} REGIME RECOMMENDED`, margin + 14, y0 + 8 * BL + 6);
    set.font('bold', 13); set.text(C.ink);
    pdf.text(`Estimated savings: ${fmtInr(Math.abs(regime.savings ?? 0))}`, margin + 14, y0 + 8 * BL + 6 + 13 * BL + 6);
    if (regime.reason) {
      const rLines = pdf.splitTextToSize(px(regime.reason), cW - 24).slice(0, 1);
      set.font('normal', 7.5); set.text(C.inkMuted);
      pdf.text(rLines, margin + 14, y0 + 8 * BL + 6 + 13 * BL + 6 + 8 * BL + 8);
    }
    ctx.setY(y0 + 62);
    ctx.spacer(8);
  }

  if (actions.length) {
    ctx.h2('Priority Actions');
    actions.slice(0, 5).forEach((a, i) => {
      const label = `${i + 1}.  ${String(a.title || 'Action')}${a.impact ? '  —  ' + a.impact : ''}`;
      ctx.para(label, i % 2 === 0 ? C.ink : C.inkMed);
    });
  }

  const anomalies = Array.isArray(rd.anomalies) ? rd.anomalies.slice(-4) : [];
  if (anomalies.length) {
    ctx.spacer(6);
    ctx.h2('Recent Anomaly Flags');
    anomalies.forEach((a) => {
      ctx.para(`${a.fy ? a.fy + '  ' : ''}${a.label || ''}${a.detail ? '  \u2014  ' + a.detail : ''}`, C.inkMed);
    });
  }
}

// ── Section: Income overview (comparative) ────────────────────────────────────
function drawComparativeSection(ctx, rd = {}) {
  const comp = rd.comparative;
  if (!comp?.rows?.length) return;

  ctx.newPage();
  ctx.section('Income Overview  (Year-on-Year)');

  const years   = Array.isArray(comp.years) ? comp.years : [];
  const rows    = comp.rows;
  const shown   = years.slice(-5);
  const startI  = Math.max(0, years.length - shown.length);

  ctx.para(`Showing last ${shown.length} of ${years.length} FY(s): ${shown.join('  ·  ')}`, C.inkMuted);
  ctx.spacer(6);

  const metricW  = 160;
  const perYear  = Math.max(52, (ctx.cW - metricW) / Math.max(1, shown.length));
  const tableRows = rows.slice(0, 28).map((r) => {
    const cells = Array.isArray(r.cells) ? r.cells.slice(startI, startI + shown.length) : [];
    return [String(r.label || ''), ...cells.map((c) => String(c ?? '\u2014'))];
  });

  drawTable(ctx, {
    headers: ['Metric', ...shown.map(String)],
    rows: tableRows,
    colWidths: [metricW, ...shown.map(() => perYear)],
    alignments: ['left', ...shown.map(() => 'right')],
  });
  if (rows.length > 28) ctx.para(`+ ${rows.length - 28} more rows omitted.`, C.inkMuted);
}

// ── Section: Regime analysis ───────────────────────────────────────────────────
function drawRegimeSection(ctx, rd = {}) {
  ctx.newPage();
  ctx.section('Regime Analysis');

  const regime  = rd.regime;
  const totals  = rd.totals || {};
  const fyRange = Array.isArray(rd.fyRange) && rd.fyRange.length
    ? `${rd.fyRange[0]} to ${rd.fyRange[rd.fyRange.length - 1]}`
    : rd.selectedFy || '\u2014';

  drawKpiGrid(ctx, [
    { label: 'Recommended Regime',    value: regime ? `${String(regime.recommended || '').toUpperCase()} REGIME` : '\u2014' },
    { label: 'Old Regime Tax',        value: fmtInr(regime?.oldTax) },
    { label: 'New Regime Tax',        value: fmtInr(regime?.newTax) },
    { label: 'Estimated Savings',     value: fmtInr(Math.abs(regime?.savings ?? 0)) },
    { label: 'Analysis FY Range',     value: px(fyRange) },
    { label: 'Effective Tax Rate',    value: totals.effectiveTaxRate != null ? `${Number(totals.effectiveTaxRate).toFixed(1)}%` : '\u2014' },
  ]);

  if (!regime) {
    ctx.para('Regime comparison requires uploaded ITR data with income and deduction details.', C.inkMuted);
    return;
  }
  if (regime.reason) {
    ctx.spacer(8);
    ctx.h2('Analysis Notes');
    ctx.para(regime.reason);
  }

  const actions = Array.isArray(rd.actions) ? rd.actions : [];
  if (actions.length) {
    ctx.spacer(8);
    ctx.h2('Action Centre');
    drawTable(ctx, {
      headers:    ['Priority', 'Recommended Action', 'Estimated Impact'],
      rows:       actions.slice(0, 16).map((a, i) => [
        i < 3 ? 'Top' : (i < 8 ? 'Next' : 'Later'),
        String(a.title || 'Action').slice(0, 90),
        String(a.impact || '\u2014').slice(0, 60),
      ]),
      colWidths:   [80, 260, 140],
      alignments:  ['left', 'left', 'right'],
    });
  }
}

// ── Section: Review cards ──────────────────────────────────────────────────────
function drawReviewSection(ctx, rd = {}) {
  const cards = Array.isArray(rd.reviewCards) ? rd.reviewCards : [];
  if (!cards.length) return;

  ctx.newPage();
  ctx.section('ITR vs AIS — Reconciliation');
  ctx.para(`${cards.length} review item(s) identified across filing history.`, C.inkMuted);
  ctx.spacer(8);

  // Dedup
  const seen = new Set();
  const uniq = cards.filter((c) => {
    const k = `${c.fy}|${String(c.title || '').slice(0, 48)}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  // Column header
  const { pdf, margin, set, cW } = ctx;
  ensure_header: {
    ctx.ensure(20);
    const y = ctx.getY();
    set.fill(C.tableHdr); pdf.rect(margin, y, cW, 20, 'F');
    set.font('bold', 7.5); set.text(C.tableHdrTxt);
    pdf.text('Status', margin + 10, y + 5 + 7.5 * BL);
    pdf.text('Detail', margin + 58, y + 5 + 7.5 * BL);
    ctx.setY(y + 20);
  }

  uniq.slice(0, 28).forEach((c, i) => drawReviewRow(ctx, c, i));
  if (uniq.length > 28) ctx.para(`+ ${uniq.length - 28} more review items.`, C.inkMuted);
}

// ── Section: Insights ─────────────────────────────────────────────────────────
function drawInsightsSection(ctx, rd = {}) {
  const insights = Array.isArray(rd.insights) ? rd.insights : [];
  if (!insights.length) return;

  ctx.newPage();
  ctx.section('Tax Insights');

  const { pdf, margin, set, cW } = ctx;
  const FONT_SZ = 8.5;
  const PAD_V   = 8;
  const CIRCLE_R = 8;

  const seen = new Set();
  const uniq = insights.filter((ins) => {
    const k = String(ins.category || ins.title || '').slice(0, 32);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  uniq.slice(0, 20).forEach((ins, i) => {
    const category = String(ins.category || ins.title || 'Insight');
    const note     = String(ins.note || ins.body || ins.detail || '');
    const noteLines = pdf.splitTextToSize(px(note), cW - 60).slice(0, 3);
    const noteH    = noteLines.length ? noteLines.length * FONT_SZ * 1.22 : 0;
    const rowH     = PAD_V * 2 + FONT_SZ * 1.22 + (noteH > 0 ? 4 + noteH : 0);

    ctx.ensure(rowH + 4);
    const y = ctx.getY();

    if (i % 2 === 1) {
      set.fill(C.tableAlt); pdf.rect(margin, y, cW, rowH, 'F');
    }
    // Number circle
    set.fill(C.teal); pdf.circle(margin + CIRCLE_R + 2, y + rowH / 2, CIRCLE_R, 'F');
    set.font('bold', 7); set.text([255, 255, 255]);
    pdf.text(String(i + 1), margin + CIRCLE_R + 2, y + rowH / 2 + 7 * BL * 0.5, { align: 'center' });
    // Category
    set.font('bold', FONT_SZ); set.text(C.teal);
    pdf.text(px(category), margin + 26, y + PAD_V + FONT_SZ * BL);
    // Note
    if (noteLines.length) {
      set.font('normal', FONT_SZ); set.text(C.inkMed);
      pdf.text(noteLines, margin + 26, y + PAD_V + FONT_SZ * 1.22 + 4 + FONT_SZ * BL);
    }
    // Rule
    set.draw(C.rule); pdf.setLineWidth(0.2);
    pdf.line(margin, y + rowH, margin + cW, y + rowH);

    ctx.setY(y + rowH + 1);
  });

  if (uniq.length > 20) ctx.para(`+ ${uniq.length - 20} more insights.`, C.inkMuted);
}

// ── Section: Anomaly timeline ──────────────────────────────────────────────────
function drawAnomalySection(ctx, rd = {}) {
  const anomalies = Array.isArray(rd.anomalies) ? rd.anomalies : [];
  if (!anomalies.length) return;

  ctx.newPage();
  ctx.section('Anomaly Timeline');
  ctx.para(`${anomalies.length} anomaly flag(s) detected.`, C.inkMuted);
  ctx.spacer(6);

  drawTable(ctx, {
    headers:    ['FY', 'Flag', 'Detail'],
    rows:       anomalies.slice(0, 20).map((a) => [
      String(a.fy || '\u2014'),
      String(a.label || '').slice(0, 52),
      String(a.detail || '').slice(0, 82),
    ]),
    colWidths:   [80, 182, 218],
    alignments:  ['left', 'left', 'left'],
  });
  if (anomalies.length > 20) ctx.para(`+ ${anomalies.length - 20} more.`, C.inkMuted);
}

// ── Section: Data confidence ───────────────────────────────────────────────────
function drawConfidenceSection(ctx, rd = {}) {
  const conf = Array.isArray(rd.confidence) ? rd.confidence : [];
  if (!conf.length) return;
  ctx.ensure(40);
  ctx.h2('Data Confidence');
  drawTable(ctx, {
    headers:    ['Metric', 'Value'],
    rows:       conf.map((c) => [px(String(c.label || 'Metric')), px(String(c.value || '\u2014'))]),
    colWidths:  [260, 220],
    alignments: ['left', 'right'],
  });
}

// ── Section: Uploaded files ────────────────────────────────────────────────────
function drawFilesSection(ctx, rd = {}) {
  const files = Array.isArray(rd.files) ? rd.files : [];
  if (!files.length) return;

  ctx.newPage();
  ctx.section('Uploaded Files');
  ctx.para(`${files.length} file(s) processed.`, C.inkMuted);
  ctx.spacer(6);

  drawTable(ctx, {
    headers:    ['FY', 'Type', 'File Name'],
    rows:       files.slice(0, 40).map((f) => [
      String(f.fy || '\u2014'),
      String(f.kind || 'Unknown'),
      String(f.name || '').replace(/\s+/g, ' '),
    ]),
    colWidths:   [72, 120, 288],
    alignments:  ['left', 'left', 'left'],
  });
  if (files.length > 40) ctx.para(`+ ${files.length - 40} more files.`, C.inkMuted);
}

// ── html2canvas helpers (detailed/legacy mode) ─────────────────────────────────
function offsetWithinAncestor(el, ancestor) {
  const a = ancestor.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { top: r.top - a.top, bottom: r.bottom - a.top };
}
function chooseBreak(yPx, maxEnd, canH, safeBreaks) {
  if (maxEnd >= canH) return canH;
  let best = -1;
  const minProg = yPx + Math.max(40, (maxEnd - yPx) * 0.15);
  for (const b of safeBreaks) {
    if (b <= minProg) continue;
    if (b > maxEnd) break;
    best = b;
  }
  return best > 0 ? best : maxEnd;
}
function sliceCanvas(src, srcY, sliceH) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = sliceH;
  const cx = c.getContext('2d');
  if (!cx) return null;
  cx.drawImage(src, 0, srcY, src.width, sliceH, 0, 0, src.width, sliceH);
  return c;
}
function hardenCloneForCanvas(clonedDoc) {
  try {
    const s = clonedDoc.createElement('style');
    s.textContent = `
      *, *::before, *::after { animation: none !important; transition: none !important; }
      .scroll-reveal, .scroll-reveal * { opacity: 1 !important; transform: none !important; filter: none !important; }
      .grain-overlay, .hero-orbs, #cursor-trail-canvas, .cursor-trail-canvas { display: none !important; }
      .glance-tile__value, .headline-display__accent {
        background: none !important; background-image: none !important;
        color: #ececf0 !important; -webkit-text-fill-color: #ececf0 !important; text-shadow: none !important;
      }
    `;
    clonedDoc.head.appendChild(s);
  } catch {}
  clonedDoc.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.setProperty('backdrop-filter', 'none');
    el.style.setProperty('-webkit-backdrop-filter', 'none');
    const cs = window.getComputedStyle(el);
    if (cs.filter && cs.filter !== 'none') el.style.setProperty('filter', 'none');
    if (cs.animationName && cs.animationName !== 'none') el.style.setProperty('animation', 'none');
    const transparentTxt = cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent';
    if (transparentTxt && cs.backgroundImage && cs.backgroundImage !== 'none') {
      el.style.setProperty('background-image', 'none');
      el.style.setProperty('-webkit-text-fill-color', '#ececf0');
      el.style.setProperty('color', '#ececf0');
    }
  });
  const tw = clonedDoc.getElementById('hero-typewriter');
  if (tw) tw.textContent = document.getElementById('hero-typewriter')?.textContent?.trim() || 'tax story';
  const rot = clonedDoc.getElementById('hero-rotating');
  if (rot) rot.textContent = document.getElementById('hero-rotating')?.textContent?.trim() || 'every year, one place.';
  // Pin computed colours on heavy surfaces
  const heavySel = '.chapter, .chapter__title, .review-card, .insight-card, .chart-shell, .glance-tile';
  const liveH = document.querySelectorAll(heavySel);
  const cloneH = clonedDoc.querySelectorAll(heavySel);
  const n = Math.min(liveH.length, cloneH.length);
  for (let i = 0; i < n; i++) {
    const ce = cloneH[i];
    if (!(ce instanceof HTMLElement)) continue;
    const cs = window.getComputedStyle(liveH[i]);
    const reject = /color-mix|^color\(/;
    if (cs.backgroundColor && !reject.test(cs.backgroundColor)) ce.style.backgroundColor = cs.backgroundColor;
    if (cs.color && !reject.test(cs.color)) ce.style.color = cs.color;
  }
}

// ── Main export entry point ────────────────────────────────────────────────────
export async function exportStoryPdf(root, opts = {}) {
  const JsPDF = getJsPDF();
  if (!JsPDF) { window.alert('PDF engine did not load. Please reload and try again.'); return false; }

  const title       = opts.title ?? 'Tax-Story';
  const detailMode  = opts.detailMode === 'structured' ? 'structured' : 'detailed';
  const isoDate     = new Date().toISOString().slice(0, 10);
  const taxpayer    = opts.taxpayerName || (document.querySelector('.hero-greeting strong')?.textContent || '').trim() || '';
  const chips       = Array.from(document.querySelectorAll('.year-chip__fy'))
    .map((el) => (el.textContent || '').trim()).filter(Boolean).sort();
  const fyRange     = chips.length === 0 ? '' : chips.length === 1 ? chips[0] : `${chips[0]} \u2014 ${chips[chips.length - 1]}`;

  // ── Structured jsPDF path ──────────────────────────────────────────────────
  if (detailMode === 'structured') {
    emit('Building premium structured report\u2026', 8);
    try {
      const pdf = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
      const pW  = pdf.internal.pageSize.getWidth();
      const pH  = pdf.internal.pageSize.getHeight();
      const rd  = opts.reportData || {};

      emit('Drawing personalised cover page\u2026', 15);
      drawCover(pdf, pW, pH, {
        title,
        taxpayerName:    taxpayer || rd.taxpayerName || '',
        pan:             maskPan(rd.pan) || '',
        employer:        rd.employer || '',
        city:            rd.city || '',
        fyRange,
        isoDate,
        lifetimeEarnings: rd.totals?.lifetimeEarnings ?? null,
        totalTaxPaid:     rd.totals?.totalTaxPaid     ?? null,
        effectiveTaxRate: rd.totals?.effectiveTaxRate ?? null,
      });

      emit('Building executive summary\u2026', 25);
      pdf.addPage();
      // Manually paint first content page header (ctx.newPage() isn't called for page 2)
      pdf.setFillColor(C.pageBg[0], C.pageBg[1], C.pageBg[2]);
      pdf.rect(0, 0, pW, pH, 'F');
      pdf.setFillColor(C.sectionBg[0], C.sectionBg[1], C.sectionBg[2]);
      pdf.rect(0, 0, pW, 36, 'F');
      pdf.setDrawColor(C.gold[0], C.gold[1], C.gold[2]); pdf.setLineWidth(0.5);
      pdf.line(0, 36, pW, 36);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
      pdf.setTextColor(C.gold[0], C.gold[1], C.gold[2]);
      pdf.text('Rs.  TAX STORY', 48, 36 - 10);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
      pdf.setTextColor(C.inkMuted[0], C.inkMuted[1], C.inkMuted[2]);
      pdf.text(isoDate, pW - 48, 36 - 10, { align: 'right' });

      const ctx = makeCtx(pdf, pW, pH);
      ctx.setY(36 + 18);

      drawExecutiveSummary(ctx, rd);

      emit('Building income overview\u2026', 38);
      drawComparativeSection(ctx, rd);

      emit('Building regime analysis\u2026', 50);
      drawRegimeSection(ctx, rd);

      emit('Building review items\u2026', 62);
      drawReviewSection(ctx, rd);

      emit('Building insights\u2026', 72);
      drawInsightsSection(ctx, rd);

      emit('Building anomaly timeline\u2026', 80);
      drawAnomalySection(ctx, rd);
      drawConfidenceSection(ctx, rd);

      emit('Building file manifest\u2026', 88);
      drawFilesSection(ctx, rd);

      emit('Painting footers\u2026', 93);
      const totalPages = typeof pdf.getNumberOfPages === 'function'
        ? pdf.getNumberOfPages()
        : (pdf.internal?.getNumberOfPages?.() ?? 2);
      paintFooters(pdf, pW, pH, totalPages, isoDate);

      emit('Saving\u2026', 97);
      pdf.save(`${title.replace(/\s+/g, '-')}-${isoDate}.pdf`);
      emit('Done', 100);
      return true;
    } catch (e) {
      window.alert(`Could not build PDF.\n\n${e?.message || e}`);
      return false;
    }
  }

  // ── Detailed html2canvas path (legacy fallback) ────────────────────────────
  const COVER_BG_HEX = '#0f0f11';
  const SAFE_SEL     =
    '.chapter, .review-card, .insight-card, .intel-card, .chart-shell, .comparative-table-card';
  const h2c = window.html2canvas;

  document.body.classList.add('pdf-exporting');
  const prevY = window.scrollY;
  window.scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const safeBreaksCss = Array.from(root.querySelectorAll(SAFE_SEL))
    .map((el) => offsetWithinAncestor(el, root).bottom)
    .filter((y) => Number.isFinite(y) && y > 0);

  const dpr = window.devicePixelRatio || 1;
  const prefScale = Math.min(3, Math.max(2.25, dpr * 1.5));
  emit('Capturing page\u2026', 12);
  let canvas;
  try {
    const cap = (sc) => h2c(root, {
      scale: sc, useCORS: true, allowTaint: false, logging: false,
      backgroundColor: COVER_BG_HEX, scrollX: 0, scrollY: 0,
      windowWidth: root.scrollWidth, windowHeight: root.scrollHeight,
      imageTimeout: 25000, onclone: hardenCloneForCanvas,
    });
    try { canvas = await cap(prefScale); }
    catch { emit('Retrying\u2026', 25); canvas = await cap(Math.max(1.6, prefScale * 0.82)); }
  } catch (e) {
    document.body.classList.remove('pdf-exporting');
    window.scrollTo(0, prevY);
    window.alert(`Page capture failed.\n\n${e?.message || e}`);
    return false;
  }

  window.scrollTo(0, prevY);
  document.body.classList.remove('pdf-exporting');
  if (!canvas.width || !canvas.height) {
    window.alert('Captured image was empty — scroll to top and export again.'); return false;
  }

  emit('Laying out PDF\u2026', 60);
  let pdf;
  try { pdf = new JsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true }); }
  catch (e) { window.alert(`PDF engine error.\n\n${e?.message || e}`); return false; }

  const pW = pdf.internal.pageSize.getWidth(), pH = pdf.internal.pageSize.getHeight();
  const MG = 36, usW = pW - MG * 2, usH = pH - MG * 2 - 24;
  const sliceMaxPx = Math.floor((usH * canvas.width) / usW);
  const c2c = canvas.width / Math.max(1, root.scrollWidth);
  const safeBreaksPx = Array.from(new Set(safeBreaksCss.map((y) => Math.round(y * c2c))))
    .filter((y) => y > 0 && y <= canvas.height).sort((a, b) => a - b);
  const bgRgb = hexToRgb(COVER_BG_HEX);

  let yPx = 0, pg = 0;
  try {
    while (yPx < canvas.height) {
      const maxEnd = Math.min(yPx + sliceMaxPx, canvas.height);
      const brk    = chooseBreak(yPx, maxEnd, canvas.height, safeBreaksPx);
      const sH     = Math.max(1, brk - yPx);
      const slice  = sliceCanvas(canvas, yPx, sH);
      if (!slice) break;
      if (pg > 0) pdf.addPage();
      pg++;
      pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]); pdf.rect(0, 0, pW, pH, 'F');
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', MG, MG, usW, (sH * usW) / canvas.width,
        undefined, 'MEDIUM');
      yPx = brk;
    }
  } catch (e) {
    window.alert(`PDF layout failed.\n\n${e?.message || e}`); return false;
  }

  paintFooters(pdf, pW, pH, pg, isoDate);
  emit('Saving\u2026', 98);
  try { pdf.save(`${title.replace(/\s+/g, '-')}-${isoDate}.pdf`); }
  catch (e) { window.alert(`PDF save failed.\n\n${e?.message || e}`); return false; }
  emit('Done', 100);
  return true;
}
