import { extractItrStructured, getByPath, toNum } from './itr-paths.js';

/**
 * Best-effort numeric snapshots from ITR / AIS JSON (schemas vary by AY).
 * Never throws.
 */

/**
 * @param {unknown} val
 * @returns {number|null}
 */
function toNumber(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const t = val.replace(/,/g, '').replace(/\s/g, '').trim();
    if (!t || t === '-') return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Generous safety nets — NOT product limits (see CLAUDE.md §13 "no artificial limits").
 * A well-formed ITR-2 with Schedule AL / FA / long TDS arrays can legitimately be
 * deeply nested and include thousands of rows; we only cap to prevent runaway loops
 * on pathological / cyclic inputs.
 * @param {unknown} obj
 * @param {(key: string, val: unknown, depth: number) => void} visitor
 * @param {number} depth
 * @param {number} maxDepth
 */
function walkDeep(obj, visitor, depth = 0, maxDepth = 24) {
  if (depth > maxDepth || obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    const cap = Math.min(obj.length, 2000);
    for (let i = 0; i < cap; i += 1) {
      walkDeep(obj[i], visitor, depth + 1, maxDepth);
    }
    return;
  }
  if (typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    visitor(k, v, depth);
    if (v && typeof v === 'object') walkDeep(v, visitor, depth + 1, maxDepth);
  }
}

/**
 * @param {unknown} parsed
 * @returns {import('./model.js').ItrSnapshot}
 */
export function extractItrSnapshot(parsed) {
  /** @type {Record<string, number>} */
  const picks = {};

  const consider = (key, val) => {
    const n = toNumber(val);
    if (n === null || n < 0 || n > 5e12) return;
    const k = key.replace(/\s|_/g, '');

    if (
      /^(GrossTotIncome|GrossTotalIncome|GTI|TotInc|TotalIncome|AggregateIncome|TotIncmChargeable)$/i.test(k) ||
      /GrossTot.*Inc|TotIncmChargeable|NetIncomeBarSalary/i.test(key)
    ) {
      picks.gross = picks.gross == null ? n : Math.max(picks.gross, n);
    }
    // Only match clearly-total-level salary keys (anchored) — avoids per-employer rows,
    // perquisite/allowance sub-totals, and post-exempt concat fields inflating the pick.
    if (
      /^(TotSal|NetIncome|IncomeFromSal|IncChrgSal|IncomeFromSalary|Salaries|NetSalary|TotIncUnderHeadSalaries|AmtSalary)$/i.test(key) &&
      !/Perquisite|Profit|Allowance|Deduction|Exempt|PreReceipt/i.test(key)
    ) {
      picks.salary = picks.salary == null ? n : Math.max(picks.salary, n);
    }
    if (/Interest|Intrst|OS.*Inc|OtherSource.*Inc|Saving.*Bank/i.test(key) && !/TDS|Tax|Deduction/i.test(key)) {
      picks.interest = picks.interest == null ? n : Math.max(picks.interest, n);
    }
    if (/TDS|TcsAmt|TaxDeducted|TotalTax/i.test(key) && /TDS|Total|Amt/i.test(key)) {
      picks.tds = picks.tds == null ? n : Math.max(picks.tds, n);
    }
    if (/HouseProperty|HP|IncomeFromHP/i.test(key) && !/Deduction|Exempt/i.test(key)) {
      picks.hp = picks.hp == null ? n : Math.max(picks.hp, n);
    }
    if (/CapGain|CapitalGain|STCG|LTCG/i.test(key)) {
      picks.cg = picks.cg == null ? n : Math.max(picks.cg, n);
    }
    if (/Section80C|Deduct80C|TotChapVIADeduct|TotalDeductions/i.test(key)) {
      picks.deductions80C = picks.deductions80C == null ? n : Math.max(picks.deductions80C, n);
    }
    if (/Refund|RefundDue/i.test(key) && !/TDS/i.test(key)) {
      picks.refund = picks.refund == null ? n : Math.max(picks.refund, n);
    }
  };

  try {
    walkDeep(parsed, (k, v) => consider(k, v));
  } catch {
    /* ignore */
  }

  let structured;
  try {
    structured = extractItrStructured(parsed);
  } catch {
    structured = null;
  }

  const merge = (a, b) => {
    if (a != null && Number.isFinite(a) && a > 0) return a;
    if (b != null && Number.isFinite(b) && b > 0) return b;
    return a ?? b ?? null;
  };

  let grossIncome = merge(structured?.grossIncome ?? null, picks.gross ?? null);
  const totalIncome = structured?.totalIncome ?? null;
  const salaryIncome = merge(structured?.salaryIncome ?? null, picks.salary ?? null);
  const housePropertyIncome = structured?.housePropertyIncome ?? (picks.hp != null ? picks.hp : null);
  const interestIncome = merge(structured?.interestIncome ?? null, picks.interest ?? null);
  const tdsTotal = merge(structured?.tdsTotal ?? null, picks.tds ?? null);
  const dividendIncome = structured?.dividendIncome ?? null;
  const businessIncome = structured?.businessIncome ?? null;
  const taxRegimeKey = structured?.taxRegimeKey ?? undefined;
  const taxRegimeLabel = structured?.taxRegimeLabel ?? undefined;
  const formLabel = structured?.formLabel ?? undefined;
  const assessmentYear = structured?.assessmentYear ?? undefined;
  const firstName = structured?.firstName ?? '';
  const surName = structured?.surName ?? '';
  const pan = structured?.pan ?? '';
  const employerName = structured?.employerName ?? '';
  const city = structured?.city ?? '';

  // Use structured deductions/tax/capitalGains, fall back to heuristic picks
  const deductions = structured?.deductions ?? {
    totalDeductions: null,
    section80C: picks.deductions80C ?? null,
    section80D: null,
    hraExemption: null,
    standardDeduction: null,
    section80TTA: null,
    npsDeduction: null,
    homeLoanInterest: null,
  };
  const taxLiability = structured?.taxLiability ?? {
    taxPayable: null,
    netTaxPayable: null,
    refundDue: picks.refund ?? null,
    advanceTax: null,
    selfAssessmentTax: null,
    surcharge: null,
    educationCess: null,
  };
  const capitalGains = structured?.capitalGains ?? {
    stcg15pct: null,
    stcgOther: null,
    ltcg10pct: null,
    ltcg20pct: null,
    totalCg: picks.cg ?? null,
  };

  if (grossIncome != null && salaryIncome != null && salaryIncome > grossIncome * 1.03) {
    grossIncome = Math.max(grossIncome, salaryIncome);
  }

  // ─── grossSalaryIncome (pre-standard-deduction, pre-HRA-exemption) ──────────
  // Needed by the tax-engine's refactored compareRegimes. Try direct paths first,
  // then reconstruct from Schedule S components, then fall back to salaryIncome
  // (flagged as an estimate via _grossSalaryIsEstimated).
  let grossSalaryIncome = /** @type {number|null} */ (null);
  let grossSalaryIsEstimated = false;
  try {
    const direct =
      toNum(getByPath(parsed, 'ITR.ITR2.ScheduleS.TotalGrossSalary')) ??
      toNum(getByPath(parsed, 'ITR.ITR1.ITR1_IncomeDeductions.GrossSalary')) ??
      toNum(getByPath(parsed, 'ITR.ITR1.Form_ITR1.IncomeDeductions.GrossSalary'));
    if (direct != null && direct > 0) {
      grossSalaryIncome = direct;
    } else {
      const schSTot = toNum(getByPath(parsed, 'ITR.ITR2.ScheduleS.TotIncUnderHeadSalaries'));
      const schSDed16 = toNum(getByPath(parsed, 'ITR.ITR2.ScheduleS.DeductionUs16'));
      const schSExempt = toNum(getByPath(parsed, 'ITR.ITR2.ScheduleS.AllwncExtentExemptUs10'));
      if (schSTot != null && schSTot > 0 && (schSDed16 != null || schSExempt != null)) {
        grossSalaryIncome = schSTot + (schSDed16 ?? 0) + (schSExempt ?? 0);
      }
    }
  } catch {
    /* ignore — best-effort */
  }
  if ((grossSalaryIncome == null || grossSalaryIncome <= 0) && salaryIncome != null && salaryIncome > 0) {
    grossSalaryIncome = salaryIncome;
    grossSalaryIsEstimated = true;
  }

  const hasData =
    grossIncome != null ||
    salaryIncome != null ||
    grossSalaryIncome != null ||
    interestIncome != null ||
    tdsTotal != null ||
    (dividendIncome != null && dividendIncome > 0) ||
    (capitalGains.totalCg != null && capitalGains.totalCg > 0);

  return {
    grossIncome,
    totalIncome,
    salaryIncome,
    grossSalaryIncome: grossSalaryIncome != null && grossSalaryIncome > 0 ? grossSalaryIncome : null,
    _grossSalaryIsEstimated: grossSalaryIsEstimated,
    housePropertyIncome: housePropertyIncome != null && housePropertyIncome !== 0 ? housePropertyIncome : null,
    interestIncome,
    dividendIncome: dividendIncome != null && dividendIncome > 0 ? dividendIncome : null,
    businessIncome: businessIncome != null && businessIncome > 0 ? businessIncome : null,
    tdsTotal,
    deductions,
    taxLiability,
    capitalGains,
    taxRegimeKey: taxRegimeKey ?? undefined,
    taxRegimeLabel: taxRegimeLabel ?? undefined,
    formLabel: formLabel ?? undefined,
    assessmentYear: assessmentYear ?? undefined,
    firstName,
    surName,
    pan,
    employerName,
    city,
    hasData,
  };
}


/**
 * Categorize an AIS transaction line from its text blob.
 * @param {string} blob  Lowercased JSON string of the transaction object
 * @returns {string|null}
 */
function categorizeAisLine(blob) {
  if (/salary|sft.*004|sft-004/.test(blob)) return 'salary';

  // Dividends first so e.g. "dividend on bonds" doesn't fall into interest buckets.
  if (/dividend|sft.*00[56]/.test(blob)) return 'dividend';

  // Capital gains before rent/business so "capital gain on property" routes here.
  if (/(mutual.fund|\bmf\b|elss).{0,40}(gain|sale|redeem|capital)|sft.*01[12]/.test(blob)) return 'capitalGainsMF';
  if (/(equity|share|listed.securities|stock).{0,40}(gain|sale|capital)|sft.*01[56]/.test(blob)) return 'capitalGainsEquity';
  if (/(capital.gain|short.term|long.term|ltcg|stcg)/.test(blob)) return 'capitalGainsMF';

  // Savings-bank-specific interest (narrow — must name the savings/SB bucket).
  if (/savings|saving bank|sb account|s\/b interest|sft.*001|sft-001/.test(blob)) return 'interestSavings';

  // Fixed / recurring / term deposits — fully taxable non-savings interest.
  if (/fixed deposit|\bfd\b|recurring deposit|\brd\b|term deposit|sft.*00[23]/.test(blob)) return 'interestFD';

  // Bonds / NSC / debentures / post-office interest — also fully taxable non-savings.
  if (/\bbond\b|\bnsc\b|debenture|post.?office/.test(blob)) return 'interestFD';

  if (/foreign.remittance|sft.*018|outward.remittance/.test(blob)) return 'foreignRemittance';
  if (/(rent.received|house.property|rental|sft.*00[89])/.test(blob)) return 'rent';
  if (/(business|professional|freelanc|self.employ|gst.turnover|sft.*010)/.test(blob)) return 'business';

  // Generic "interest" with no qualifier — route to interestFD (fully taxable).
  // Safer default than interestSavings, which would trigger false 80TTA-missed alerts.
  if (/interest/.test(blob)) return 'interestFD';

  if (/tds|tax.deduct(ed|ion)|section 194|section194/.test(blob)) return 'tds';
  if (/tcs|tax.collect(ed|ion)/.test(blob)) return 'tcs';
  if (/advance.tax|self.assessment.tax/.test(blob)) return 'advanceTax';
  return null;
}

/**
 * @param {unknown} parsed
 * @returns {import('./model.js').AisSnapshot}
 */
export function extractAisSnapshot(parsed) {
  const totals = {
    salary: 0, interestSavings: 0, interestFD: 0,
    dividend: 0, capitalGainsMF: 0, capitalGainsEquity: 0,
    rent: 0, business: 0, tds: 0, tcs: 0, advanceTax: 0, foreignRemittance: 0,
  };
  let lineCount = 0;
  let sawAmount = false;

  /** @type {Array<{category: string, amount: number, description: string}>} */
  const topTransactions = [];

  const addLine = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    const o = /** @type {Record<string, unknown>} */ (obj);
    const amt =
      toNumber(o.Amount) ??
      toNumber(o.amount) ??
      toNumber(o.TransactionAmount) ??
      toNumber(o.TaxableAmount) ??
      toNumber(o.Value) ??
      toNumber(o.ReportedAmount) ??
      toNumber(o.reportedAmount) ??
      toNumber(o.ReportedAmt) ??
      toNumber(o.grossAmount) ??
      toNumber(o.PaidCredited) ??
      toNumber(o.paidCredited) ??
      toNumber(o.derivedAmount) ??
      toNumber(o.DerivedAmount);
    if (amt === null || amt <= 0 || amt > 1e12) return;
    sawAmount = true;
    lineCount += 1;

    const blob = JSON.stringify(o).toLowerCase();
    const category = categorizeAisLine(blob);

    if (category && category in totals) {
      totals[category] += amt;
      // Track top transactions for display
      if (topTransactions.length < 20 && amt > 1000) {
        const desc =
          String(o.InformationDescription || o.informationDescription || o.Description || o.description || o.Category || '').slice(0, 80) ||
          category.replace(/([A-Z])/g, ' $1').trim();
        topTransactions.push({ category, amount: amt, description: desc });
      }
    }
  };

  try {
    walkDeep(parsed, (k, v) => {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
        const head = v[0];
        if (
          head &&
          typeof head === 'object' &&
          ('Amount' in head ||
            'amount' in head ||
            'TransactionAmount' in head ||
            'ReportedAmount' in head ||
            'derivedAmount' in head ||
            'DerivedAmount' in head)
        ) {
          // Generous safety net (not a product limit) — see CLAUDE.md §13.
          v.slice(0, 5000).forEach(addLine);
        }
      }
      if (k && /transaction|part|section|line|information|sft|tds|tcs/i.test(k) && v && typeof v === 'object' && !Array.isArray(v)) {
        addLine(v);
      }
    });
  } catch {
    /* ignore */
  }

  const interestTotal = totals.interestSavings + totals.interestFD;
  const dividendTotal = totals.dividend;
  const capitalGainsTotal = totals.capitalGainsMF + totals.capitalGainsEquity;

  const hasData =
    sawAmount ||
    interestTotal > 0 ||
    dividendTotal > 0 ||
    totals.tds > 0 ||
    totals.salary > 0 ||
    capitalGainsTotal > 0;

  // Sort top transactions by amount desc
  topTransactions.sort((a, b) => b.amount - a.amount);

  return {
    hasData,
    salaryTotal: totals.salary > 0 ? totals.salary : null,
    interestTotal: interestTotal > 0 ? interestTotal : null,
    interestSavings: totals.interestSavings > 0 ? totals.interestSavings : null,
    interestFD: totals.interestFD > 0 ? totals.interestFD : null,
    dividendTotal: dividendTotal > 0 ? dividendTotal : null,
    capitalGainsTotal: capitalGainsTotal > 0 ? capitalGainsTotal : null,
    capitalGainsMF: totals.capitalGainsMF > 0 ? totals.capitalGainsMF : null,
    capitalGainsEquity: totals.capitalGainsEquity > 0 ? totals.capitalGainsEquity : null,
    rentTotal: totals.rent > 0 ? totals.rent : null,
    businessTotal: totals.business > 0 ? totals.business : null,
    tdsTotal: totals.tds > 0 ? totals.tds : null,
    tcsTotal: totals.tcs > 0 ? totals.tcs : null,
    advanceTaxTotal: totals.advanceTax > 0 ? totals.advanceTax : null,
    foreignRemittance: totals.foreignRemittance > 0 ? totals.foreignRemittance : null,
    lineCount,
    topTransactions,
  };
}

/**
 * Rough AIS-style totals from portal PDF text (no JSON). Best-effort; prefer AIS JSON when available.
 * @param {string} text
 * @returns {import('./model.js').AisSnapshot}
 */
export function extractAisSnapshotFromPdfText(text) {
  let interestSavings = 0;
  let interestFD = 0;
  let dividendTotal = 0;
  let tdsTotal = 0;
  let capitalGains = 0;
  let salary = 0;
  let rent = 0;
  let lineCount = 0;
  const maxPerLine = 2e8;
  const lines = String(text).split(/\r?\n/);

  /**
   * @param {string} line
   * @returns {number[]}
   */
  const amountsInLine = (line) => {
    const out = [];
    const re = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/gi;
    let m;
    while ((m = re.exec(line)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0 && n < maxPerLine) out.push(n);
    }
    if (!out.length) {
      const re2 = /\b(\d{2,}(?:,\d{3})+(?:\.\d{2})?)\b/g;
      while ((m = re2.exec(line)) !== null) {
        const n = parseFloat(m[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n >= 1000 && n < maxPerLine) out.push(n);
      }
    }
    return out;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length < 6) continue;
    const low = line.toLowerCase();
    const amounts = amountsInLine(line);
    if (!amounts.length) continue;
    const row = Math.max(...amounts);

    if (/savings.{0,20}(interest|bank)|bank.*interest/.test(low)) {
      interestSavings += row;
      lineCount += 1;
      continue;
    }
    if (/(fixed.deposit|fd|recurring|deposit).{0,30}interest/.test(low)) {
      interestFD += row;
      lineCount += 1;
      continue;
    }
    if (/interest/.test(low)) {
      interestSavings += row;
      lineCount += 1;
      continue;
    }
    if (/dividend|mutual fund|securities|equity|capital gain|\bmf\b/.test(low)) {
      dividendTotal += row;
      lineCount += 1;
      continue;
    }
    if (/(capital.gain|ltcg|stcg)/.test(low)) {
      capitalGains += row;
      lineCount += 1;
      continue;
    }
    if (/salary/.test(low)) {
      salary += row;
      lineCount += 1;
      continue;
    }
    if (/rent/.test(low)) {
      rent += row;
      lineCount += 1;
      continue;
    }
    if (/tds|tax\s*deduct|tcs\b/.test(low)) {
      tdsTotal += row;
      lineCount += 1;
    }
  }

  const interestTotal = interestSavings + interestFD;
  const hasData = lineCount > 0 || interestTotal > 0 || dividendTotal > 0 || tdsTotal > 0;
  return {
    hasData,
    salaryTotal: salary > 0 ? salary : null,
    interestTotal: interestTotal > 0 ? interestTotal : null,
    interestSavings: interestSavings > 0 ? interestSavings : null,
    interestFD: interestFD > 0 ? interestFD : null,
    dividendTotal: dividendTotal > 0 ? dividendTotal : null,
    capitalGainsTotal: capitalGains > 0 ? capitalGains : null,
    capitalGainsMF: null,
    capitalGainsEquity: null,
    rentTotal: rent > 0 ? rent : null,
    businessTotal: null,
    tdsTotal: tdsTotal > 0 ? tdsTotal : null,
    tcsTotal: null,
    advanceTaxTotal: null,
    foreignRemittance: null,
    lineCount,
    topTransactions: [],
  };
}

/**
 * Portal TIS PDF — richer extraction from text layer.
 * @param {string} text
 * @returns {import('./model.js').TisSnapshot}
 */
export function extractTisSnapshotFromPdfText(text) {
  const fullText = String(text).replace(/\s+/g, ' ').trim();
  const textLower = fullText.toLowerCase();

  /**
   * Strip commas / spaces / currency marks but PRESERVE the decimal point
   * (and optional leading minus) so "32,145.75" stays as 32145.75 rather
   * than being collapsed to 3214575.
   * @param {string} s
   * @returns {number}
   */
  const parseNum = (s) => {
    const cleaned = String(s).replace(/[^\d.\-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const results = {
    salary: /** @type {number|null} */ (null),
    savingsInterest: /** @type {number|null} */ (null),
    fdInterest: /** @type {number|null} */ (null),
    dividend: /** @type {number|null} */ (null),
    capitalGains: /** @type {number|null} */ (null),
    rentReceived: /** @type {number|null} */ (null),
  };

  const labels = [
    { key: 'salary', patterns: ['salary'] },
    { key: 'savingsInterest', patterns: ['interest from savings bank', 'savings bank interest', 'savings account interest'] },
    { key: 'fdInterest', patterns: ['interest from deposit', 'fixed deposit', 'fd interest', 'recurring deposit'] },
    { key: 'dividend', patterns: ['dividend', 'dividend income'] },
    { key: 'capitalGains', patterns: ['capital gain', 'long term', 'short term'] },
    { key: 'rentReceived', patterns: ['rent received', 'house property', 'rental income'] },
  ];

  for (const lab of labels) {
    let idx = -1;
    for (const pat of lab.patterns) {
      idx = textLower.indexOf(pat);
      if (idx !== -1) break;
    }
    if (idx === -1) continue;
    const sub = fullText.slice(idx, idx + 280);
    const nums = [...sub.matchAll(/[\d,]+(?:\.\d+)?/g)].map((m) => m[0]);
    if (nums.length < 1) continue;
    const v = parseNum(nums[0]);
    if (lab.key === 'salary') results.salary = v || null;
    if (lab.key === 'savingsInterest') results.savingsInterest = v || null;
    if (lab.key === 'fdInterest') results.fdInterest = v || null;
    if (lab.key === 'dividend') results.dividend = v || null;
    if (lab.key === 'capitalGains') results.capitalGains = v || null;
    if (lab.key === 'rentReceived') results.rentReceived = v || null;
  }

  // Fallback regex sweeps
  if (!results.salary) {
    const m = textLower.match(/salary\s+([\d,]+)/);
    if (m) results.salary = parseNum(m[1]);
  }
  if (!results.savingsInterest) {
    const m = textLower.match(/savings\s+bank\s+interest\s+([\d,]+)/);
    if (m) results.savingsInterest = parseNum(m[1]);
  }
  if (!results.dividend) {
    const m = textLower.match(/dividend\s+([\d,]+)/);
    if (m) results.dividend = parseNum(m[1]);
  }

  const hasData =
    (results.salary != null && results.salary > 0) ||
    (results.savingsInterest != null && results.savingsInterest > 0) ||
    (results.fdInterest != null && results.fdInterest > 0) ||
    (results.dividend != null && results.dividend > 0) ||
    (results.capitalGains != null && results.capitalGains > 0) ||
    (results.rentReceived != null && results.rentReceived > 0);

  return {
    hasData,
    salary: results.salary && results.salary > 0 ? results.salary : null,
    savingsInterest: results.savingsInterest && results.savingsInterest > 0 ? results.savingsInterest : null,
    fdInterest: results.fdInterest && results.fdInterest > 0 ? results.fdInterest : null,
    dividend: results.dividend && results.dividend > 0 ? results.dividend : null,
    capitalGains: results.capitalGains && results.capitalGains > 0 ? results.capitalGains : null,
    rentReceived: results.rentReceived && results.rentReceived > 0 ? results.rentReceived : null,
  };
}
