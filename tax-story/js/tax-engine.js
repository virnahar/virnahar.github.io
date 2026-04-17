/**
 * Tax Engine — India income tax slab calculations, regime comparison,
 * deduction analysis, and notice risk scoring.
 *
 * DISCLAIMER: For informational purposes only. Not tax advice.
 * Always verify with a CA or the income tax portal.
 */

/**
 * @typedef {Object} SlabResult
 * @property {number} income       Taxable income
 * @property {number} baseTax      Tax before cess
 * @property {number} surcharge    Surcharge amount
 * @property {number} cess         4% health & education cess
 * @property {number} totalTax     baseTax + surcharge + cess
 * @property {number} effectiveRate Effective rate (%)
 * @property {number} marginalRate  Marginal rate at top slab (%)
 * @property {{ slab: string, tax: number }[]} slabBreakdown
 */

/**
 * @typedef {Object} RegimeComparison
 * @property {SlabResult} oldRegime
 * @property {SlabResult} newRegime
 * @property {number} savings       Positive = old regime costs more (new saves you money); negative = old is better
 * @property {'old'|'new'} recommended
 * @property {string} reason
 * @property {string} fy            Normalised FY string (e.g. "2024-25")
 */

/**
 * @typedef {Object} NoticeRisk
 * @property {number} score        0–100 (higher = more risk)
 * @property {'low'|'medium'|'high'|'critical'} level
 * @property {string[]} flags      Specific risk flags
 * @property {string} summary
 */

/**
 * @typedef {Object} DeductionAnalysis
 * @property {number} section80CUsed    Amount claimed
 * @property {number} section80CLimit   ₹1.5L
 * @property {number} section80CRemaining  Unused room
 * @property {number} section80DUsed
 * @property {number} section80DLimit
 * @property {number} totalDeductionsUsed
 * @property {number} npsExtraRoom      Extra ₹50k under 80CCD(1B)
 * @property {number} efficiencyScore   0–100 (how well deductions are utilised)
 */

/**
 * @typedef {Object} RegimeDefaults
 * @property {{ upto: number, rate: number }[]} slabs
 * @property {number} stdDeduction
 * @property {number} rebateThreshold
 * @property {number} rebateMax
 */

// ─── India tax slab tables ─────────────────────────────────────────────────

/** New regime slabs from FY 2024-25 onwards (current). Std deduction ₹75k. */
const NEW_SLABS_FY2425_ON = [
  { upto: 300000, rate: 0 },  { upto: 700000, rate: 5 },  { upto: 1000000, rate: 10 },
  { upto: 1200000, rate: 15 }, { upto: 1500000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** New regime slabs for FY 2023-24 only. Std deduction ₹50k (first year for new regime). */
const NEW_SLABS_FY2324 = [
  { upto: 300000, rate: 0 },  { upto: 600000, rate: 5 },  { upto: 900000, rate: 10 },
  { upto: 1200000, rate: 15 }, { upto: 1500000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** Original 115BAC new regime slabs (FY 2020-21 through FY 2022-23). No std deduction. */
const NEW_SLABS_LEGACY = [
  { upto: 250000, rate: 0 },  { upto: 500000, rate: 5 },  { upto: 750000, rate: 10 },
  { upto: 1000000, rate: 15 }, { upto: 1250000, rate: 20 }, { upto: 1500000, rate: 25 },
  { upto: Infinity, rate: 30 },
];

/** Old regime slabs for FY 2017-18 onward (below 60 years). */
const OLD_SLABS_FY1718_ON = [
  { upto: 250000, rate: 0 },  { upto: 500000, rate: 5 },
  { upto: 1000000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** FY 2014-15 to FY 2016-17. */
const OLD_SLABS_FY1415_TO_1617 = [
  { upto: 250000, rate: 0 },  { upto: 500000, rate: 10 },
  { upto: 1000000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** FY 2012-13 to FY 2013-14. */
const OLD_SLABS_FY1213_TO_1314 = [
  { upto: 200000, rate: 0 },  { upto: 500000, rate: 10 },
  { upto: 1000000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** FY 2011-12. */
const OLD_SLABS_FY1112 = [
  { upto: 180000, rate: 0 },  { upto: 500000, rate: 10 },
  { upto: 800000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** FY 2010-11 and earlier supported range. */
const OLD_SLABS_FY1011 = [
  { upto: 160000, rate: 0 },  { upto: 500000, rate: 10 },
  { upto: 800000, rate: 20 }, { upto: Infinity, rate: 30 },
];

/** Current (highest) new regime std deduction — preserved export. */
const STD_DEDUCTION_NEW = 75000;
/** Old regime std deduction (stable since FY 2019-20, earlier variants also ₹40k/₹50k). */
const STD_DEDUCTION_OLD = 50000;

/** Section 80C limit */
const LIMIT_80C = 150000;
/** Section 80D standard limit (self + family, below 60) */
const LIMIT_80D = 25000;
/** NPS 80CCD(1B) extra */
const LIMIT_80CCD_1B = 50000;

// ─── FY helpers ────────────────────────────────────────────────────────────

/**
 * Normalise an FY string. Accepts "2024-25", "FY 2024-25", "fy2024-25",
 * "2024-2025", or just "2024". Returns canonical "YYYY-YY".
 * Falls back to "2024-25" for unparseable inputs.
 * @param {string|null|undefined} fy
 * @returns {string}
 */
function normaliseFY(fy) {
  if (!fy) return '2024-25';
  const trimmed = String(fy).replace(/^FY\s*/i, '').trim();
  const match = trimmed.match(/(\d{4})/);
  if (!match) return '2024-25';
  const start = parseInt(match[1], 10);
  if (!Number.isFinite(start) || start < 1990 || start > 2100) return '2024-25';
  const end = String((start + 1) % 100).padStart(2, '0');
  return `${start}-${end}`;
}

/** Starting calendar year of an FY (e.g. 2024 for FY 2024-25). */
function fyStartYear(fy) {
  return parseInt(normaliseFY(fy).split('-')[0], 10);
}

/**
 * Slab table + std deduction for a given FY + regime.
 * Unknown FYs fall back to the latest supported table.
 * @param {string} fy
 * @param {'old'|'new'} regime
 * @returns {{ slabs: { upto: number, rate: number }[], stdDeduction: number }}
 */
export function getSlabTable(fy, regime) {
  const startYear = fyStartYear(fy);
  if (regime === 'old') {
    // Std deduction for salaried class was reintroduced at ₹40k in FY 2018-19
    // and raised to ₹50k from FY 2019-20 onwards.
    let stdDeduction = 0;
    if (startYear >= 2019) stdDeduction = STD_DEDUCTION_OLD;
    else if (startYear === 2018) stdDeduction = 40000;
    if (startYear >= 2017) return { slabs: OLD_SLABS_FY1718_ON, stdDeduction };
    if (startYear >= 2014) return { slabs: OLD_SLABS_FY1415_TO_1617, stdDeduction };
    if (startYear >= 2012) return { slabs: OLD_SLABS_FY1213_TO_1314, stdDeduction };
    if (startYear === 2011) return { slabs: OLD_SLABS_FY1112, stdDeduction };
    return { slabs: OLD_SLABS_FY1011, stdDeduction };
  }
  // new regime
  if (startYear >= 2024) return { slabs: NEW_SLABS_FY2425_ON, stdDeduction: 75000 };
  if (startYear === 2023) return { slabs: NEW_SLABS_FY2324, stdDeduction: 50000 };
  // FY 2020-21, 2021-22, 2022-23 — original 115BAC, no std deduction
  return { slabs: NEW_SLABS_LEGACY, stdDeduction: 0 };
}

/**
 * 87A rebate threshold + max for a given FY + regime.
 *
 * Old regime history:
 *   FY 2013-14 → FY 2015-16: ₹2,000 rebate for total income up to ₹5L.
 *   FY 2016-17:               ₹5,000 rebate for total income up to ₹5L.
 *   FY 2017-18 → FY 2018-19: ₹2,500 rebate for total income up to ₹3.5L.
 *   FY 2019-20 onwards:       ₹12,500 rebate for total income up to ₹5L.
 *   Pre FY 2013-14:           no 87A rebate.
 *
 * New regime (115BAC):
 *   FY 2020-21 → FY 2022-23: ₹12,500 for income up to ₹5L.
 *   FY 2023-24 onwards:      ₹25,000 for income up to ₹7L.
 *
 * @param {string} fy
 * @param {'old'|'new'} regime
 * @returns {{ threshold: number, rebate: number }}
 */
function get87ARebate(fy, regime) {
  const startYear = fyStartYear(fy);
  if (regime === 'new') {
    if (startYear >= 2023) return { threshold: 700000, rebate: 25000 };
    if (startYear >= 2020) return { threshold: 500000, rebate: 12500 };
    // New regime didn't exist before FY 2020-21.
    return { threshold: 0, rebate: 0 };
  }
  // old regime
  if (startYear >= 2019) return { threshold: 500000, rebate: 12500 };
  if (startYear >= 2017) return { threshold: 350000, rebate: 2500 };
  if (startYear === 2016) return { threshold: 500000, rebate: 5000 };
  if (startYear >= 2013) return { threshold: 500000, rebate: 2000 };
  return { threshold: 0, rebate: 0 };
}

/**
 * Apply section 87A rebate with marginal relief at the threshold.
 * Relief rule: tax payable after rebate should not exceed income over threshold.
 * @param {number} taxableIncome
 * @param {number} baseTax
 * @param {number} threshold
 * @param {number} rebateMax
 * @returns {{ rebate: number, taxAfterRebate: number }}
 */
function apply87AWithMarginalRelief(taxableIncome, baseTax, threshold, rebateMax) {
  if (threshold <= 0 || rebateMax <= 0 || taxableIncome <= 0 || baseTax <= 0) {
    return { rebate: 0, taxAfterRebate: Math.max(0, baseTax) };
  }
  if (taxableIncome <= threshold) {
    const rebate = Math.min(baseTax, rebateMax);
    return { rebate, taxAfterRebate: Math.max(0, baseTax - rebate) };
  }
  const excessIncome = taxableIncome - threshold;
  // If tax without rebate exceeds excess income, marginal relief applies.
  if (baseTax > excessIncome) {
    const targetTax = Math.max(0, excessIncome);
    const rebate = Math.min(rebateMax, Math.max(0, baseTax - targetTax));
    return { rebate, taxAfterRebate: Math.max(0, baseTax - rebate) };
  }
  return { rebate: 0, taxAfterRebate: baseTax };
}

/**
 * Composable defaults for a FY + regime — slabs, std deduction, and 87A.
 * Useful for UI that wants to render the regime rules without running the engine.
 * @param {string} fy
 * @param {'old'|'new'} regime
 * @returns {RegimeDefaults}
 */
export function getRegimeDefaults(fy, regime) {
  const { slabs, stdDeduction } = getSlabTable(fy, regime);
  const { threshold, rebate } = get87ARebate(fy, regime);
  return { slabs, stdDeduction, rebateThreshold: threshold, rebateMax: rebate };
}

// ─── Core slab maths ───────────────────────────────────────────────────────

/**
 * Calculate income tax on taxable income using given slabs.
 * @param {number} taxableIncome
 * @param {{ upto: number, rate: number }[]} slabs
 * @returns {{ baseTax: number, slabBreakdown: { slab: string, tax: number }[], marginalRate: number }}
 */
function calcTaxOnSlabs(taxableIncome, slabs) {
  let remaining = Math.max(0, taxableIncome);
  let baseTax = 0;
  let prev = 0;
  let marginalRate = 0;
  const slabBreakdown = [];

  for (const { upto, rate } of slabs) {
    if (remaining <= 0) break;
    const cap = upto - prev;
    const taxable = Math.min(remaining, cap);
    const tax = (taxable * rate) / 100;
    if (taxable > 0) {
      slabBreakdown.push({ slab: `₹${fmtL(prev)}–${upto === Infinity ? '∞' : fmtL(upto)} @ ${rate}%`, tax });
      marginalRate = rate;
    }
    baseTax += tax;
    remaining -= taxable;
    prev = upto;
  }

  return { baseTax, slabBreakdown, marginalRate };
}

/** @param {number} n */
function fmtL(n) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(0)}L`;
  return `${(n / 1000).toFixed(0)}k`;
}

/**
 * Calculate surcharge. Both FY- and regime-aware.
 *
 * Old regime history:
 *   FY 2013-14 → FY 2015-16: 10% above ₹1Cr.
 *   FY 2016-17:              15% above ₹1Cr.
 *   FY 2017-18 → FY 2018-19: 10% above ₹50L, 15% above ₹1Cr.
 *   FY 2019-20 onwards:      also 25% above ₹2Cr and 37% above ₹5Cr.
 *
 * New regime (115BAC):
 *   FY 2020-21 → FY 2022-23: mirrors the old regime (incl. 25% / 37%).
 *   FY 2023-24 onwards:      capped at 25% (no 37% slab).
 *
 * @param {number} baseTax
 * @param {number} income
 * @param {'old'|'new'} [regime]
 * @param {string} [fy]
 * @returns {number}
 */
function calcSurcharge(baseTax, income, regime = 'old', fy = '2024-25') {
  const startYear = fyStartYear(fy);

  if (regime === 'new') {
    if (startYear >= 2023) {
      // 25% cap from FY 2023-24.
      if (income > 20000000) return baseTax * 0.25;
      if (income > 10000000) return baseTax * 0.15;
      if (income > 5000000)  return baseTax * 0.10;
      return 0;
    }
    // FY 2020-21 → FY 2022-23: mirrors old regime (incl. 37%).
    if (income > 50000000) return baseTax * 0.37;
    if (income > 20000000) return baseTax * 0.25;
    if (income > 10000000) return baseTax * 0.15;
    if (income > 5000000)  return baseTax * 0.10;
    return 0;
  }

  // old regime
  if (startYear >= 2019) {
    if (income > 50000000) return baseTax * 0.37;
    if (income > 20000000) return baseTax * 0.25;
    if (income > 10000000) return baseTax * 0.15;
    if (income > 5000000)  return baseTax * 0.10;
    return 0;
  }
  if (startYear >= 2017) {
    // 10% > 50L, 15% > 1Cr.
    if (income > 10000000) return baseTax * 0.15;
    if (income > 5000000)  return baseTax * 0.10;
    return 0;
  }
  if (startYear === 2016) {
    // 15% > 1Cr.
    if (income > 10000000) return baseTax * 0.15;
    return 0;
  }
  if (startYear >= 2013) {
    // 10% > 1Cr.
    if (income > 10000000) return baseTax * 0.10;
    return 0;
  }
  return 0;
}

/**
 * Cess rate by FY:
 *   3% education cess up to FY 2017-18.
 *   4% health & education cess from FY 2018-19 onwards.
 * @param {string} fy
 * @returns {number}
 */
function cessRate(fy) {
  return fyStartYear(fy) >= 2018 ? 0.04 : 0.03;
}

// ─── Public compute functions ──────────────────────────────────────────────

/**
 * Full tax computation for old regime.
 *
 * IMPORTANT: `grossSalary` is **Form 16 "Gross Salary" (ScheduleS.TotalGrossSalary)**
 * — i.e. salary BEFORE standard deduction and BEFORE HRA/LTA exemption.
 * Callers that only have post-std-deduction `salaryIncome` from an ITR snapshot
 * should ADD the standard deduction back before calling, otherwise std deduction
 * will effectively be applied twice.
 *
 * @param {number} grossSalary  Gross salary, pre-std-deduction, pre-HRA/LTA exemption
 * @param {number} [otherIncome]
 * @param {{ sec80C?: number, sec80D?: number, hra?: number, nps80CCD?: number, homeLoan?: number, sec80TTA?: number }} [deductions]
 * @param {string} [fy]  FY string (e.g. "2024-25" or "FY 2024-25"); defaults to latest
 * @returns {SlabResult}
 */
export function computeOldRegimeTax(grossSalary, otherIncome = 0, deductions = {}, fy = '2024-25') {
  const normal = normaliseFY(fy);
  const { slabs, stdDeduction: stdMax } = getSlabTable(normal, 'old');
  const { threshold: rebateLimit, rebate: rebateMax } = get87ARebate(normal, 'old');

  const safeGross = Math.max(0, grossSalary || 0);
  const stdDeduct = Math.min(stdMax, safeGross);
  const dHra = Math.max(0, deductions.hra ?? 0);
  const salaryAfter = Math.max(0, safeGross - stdDeduct - dHra);
  const grossTotal = salaryAfter + Math.max(0, otherIncome || 0);

  // Chapter VI-A deductions
  const d80C = Math.min(deductions.sec80C ?? 0, LIMIT_80C);
  const d80D = Math.min(deductions.sec80D ?? 0, LIMIT_80D);
  const dNps = Math.min(deductions.nps80CCD ?? 0, LIMIT_80CCD_1B);
  const dHomeLoan = Math.min(Math.max(0, deductions.homeLoan ?? 0), 200000);
  const d80TTA = Math.min(deductions.sec80TTA ?? 0, 10000);

  const totalDeductions = d80C + d80D + dNps + dHomeLoan + d80TTA;
  const taxableIncome = Math.max(0, grossTotal - totalDeductions);

  const { baseTax, slabBreakdown, marginalRate } = calcTaxOnSlabs(taxableIncome, slabs);

  const { rebate, taxAfterRebate } = apply87AWithMarginalRelief(
    taxableIncome,
    baseTax,
    rebateLimit,
    rebateMax,
  );

  const surcharge = calcSurcharge(taxAfterRebate, taxableIncome, 'old', normal);
  const cess = (taxAfterRebate + surcharge) * cessRate(normal);
  const totalTax = taxAfterRebate + surcharge + cess;
  const totalGross = safeGross + Math.max(0, otherIncome || 0);
  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  return { income: taxableIncome, baseTax, surcharge, cess, totalTax, effectiveRate, marginalRate, slabBreakdown };
}

/**
 * Full tax computation for new regime.
 *
 * IMPORTANT: `grossSalary` is **Form 16 "Gross Salary"** — pre-std-deduction.
 * No HRA/LTA exemption applies in new regime (except rare edge cases which
 * are intentionally not modelled here).
 *
 * @param {number} grossSalary  Gross salary, pre-std-deduction
 * @param {number} [otherIncome]
 * @param {string} [fy]  FY string; defaults to latest
 * @returns {SlabResult}
 */
export function computeNewRegimeTax(grossSalary, otherIncome = 0, fy = '2024-25') {
  const normal = normaliseFY(fy);
  const { slabs, stdDeduction: stdMax } = getSlabTable(normal, 'new');
  const { threshold: rebateLimit, rebate: rebateMax } = get87ARebate(normal, 'new');

  const safeGross = Math.max(0, grossSalary || 0);
  const stdDeduct = Math.min(stdMax, safeGross);
  const taxableIncome = Math.max(0, safeGross - stdDeduct + Math.max(0, otherIncome || 0));

  const { baseTax, slabBreakdown, marginalRate } = calcTaxOnSlabs(taxableIncome, slabs);

  const { rebate, taxAfterRebate } = apply87AWithMarginalRelief(
    taxableIncome,
    baseTax,
    rebateLimit,
    rebateMax,
  );

  const surcharge = calcSurcharge(taxAfterRebate, taxableIncome, 'new', normal);
  const cess = (taxAfterRebate + surcharge) * cessRate(normal);
  const totalTax = taxAfterRebate + surcharge + cess;
  const totalGross = safeGross + Math.max(0, otherIncome || 0);
  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  return { income: taxableIncome, baseTax, surcharge, cess, totalTax, effectiveRate, marginalRate, slabBreakdown };
}

/**
 * Compare old vs new regime and recommend.
 *
 * `grossSalary` MUST be pre-std-deduction, pre-HRA/LTA gross salary
 * (ScheduleS.TotalGrossSalary / Form 16 Part B). See `computeOldRegimeTax` for details.
 *
 * @param {number} grossSalary
 * @param {number} [otherIncome]
 * @param {{ sec80C?: number, sec80D?: number, hra?: number, nps80CCD?: number, homeLoan?: number, sec80TTA?: number }} [deductions]
 * @param {string} [fy]
 * @returns {RegimeComparison}
 */
export function compareRegimes(grossSalary, otherIncome = 0, deductions = {}, fy = '2024-25') {
  const normal = normaliseFY(fy);
  const oldRegime = computeOldRegimeTax(grossSalary, otherIncome, deductions, normal);
  const newRegime = computeNewRegimeTax(grossSalary, otherIncome, normal);

  const savings = oldRegime.totalTax - newRegime.totalTax; // positive = new regime saves money
  const recommended = savings >= 0 ? 'new' : 'old';

  const d80C = Math.min(deductions.sec80C ?? 0, LIMIT_80C);
  const d80D = Math.min(deductions.sec80D ?? 0, LIMIT_80D);
  const dHra = Math.max(0, deductions.hra ?? 0);
  const dNps = Math.min(deductions.nps80CCD ?? 0, LIMIT_80CCD_1B);
  const totalDeductionsBenefit = d80C + d80D + dHra + dNps;

  const grossFmt = Math.round(grossSalary || 0).toLocaleString('en-IN');
  const dedFmt = Math.round(totalDeductionsBenefit).toLocaleString('en-IN');
  const savingsFmt = Math.round(Math.abs(savings)).toLocaleString('en-IN');
  const fyLabel = `FY ${normal}`;

  let reason;
  if (recommended === 'new') {
    reason = savings > 0
      ? `For ${fyLabel}, new regime saves ₹${savingsFmt} on gross salary ₹${grossFmt} (pre std-deduction / HRA). Old-regime deductions (~₹${dedFmt}) don't offset the lower slabs + higher std deduction in new regime.`
      : `For ${fyLabel}, both regimes produce similar tax on gross salary ₹${grossFmt}. New regime is simpler — fewer proofs required.`;
  } else {
    reason = `For ${fyLabel}, old regime saves ₹${savingsFmt} on gross salary ₹${grossFmt} (pre std-deduction / HRA). Your deductions (~₹${dedFmt}) are high enough to make old regime worthwhile.`;
  }

  return { oldRegime, newRegime, savings, recommended, reason, fy: normal };
}

// ─── Deduction analysis ────────────────────────────────────────────────────

/**
 * Analyse deduction utilisation.
 * @param {import('./model.js').DeductionSnapshot} deductions
 * @returns {DeductionAnalysis}
 */
export function analyseDeductions(deductions) {
  const sec80CUsed = deductions.section80C ?? 0;
  const sec80DUsed = deductions.section80D ?? 0;
  const totalUsed = deductions.totalDeductions ?? 0;
  const npsExtra = deductions.npsDeduction ?? 0;

  const sec80CRemaining = Math.max(0, LIMIT_80C - sec80CUsed);
  const sec80DLimit = 25000; // standard limit
  const npsExtraRoom = Math.max(0, LIMIT_80CCD_1B - npsExtra);

  // Efficiency score — how well are the limits being used?
  const maxPossible80C = LIMIT_80C;
  const maxPossible80D = sec80DLimit;
  const maxPossibleNPS = LIMIT_80CCD_1B;
  const maxPossibleTotal = maxPossible80C + maxPossible80D + maxPossibleNPS;
  const actualUsed = sec80CUsed + sec80DUsed + Math.min(npsExtra, LIMIT_80CCD_1B);
  const efficiencyScore = maxPossibleTotal > 0 ? Math.min(100, Math.round((actualUsed / maxPossibleTotal) * 100)) : 0;

  return {
    section80CUsed: sec80CUsed,
    section80CLimit: LIMIT_80C,
    section80CRemaining,
    section80DUsed: sec80DUsed,
    section80DLimit: sec80DLimit,
    totalDeductionsUsed: totalUsed,
    npsExtraRoom,
    efficiencyScore,
  };
}

// ─── Notice risk scoring ───────────────────────────────────────────────────

/**
 * Calculate notice risk score based on ITR vs AIS discrepancies.
 * @param {import('./model.js').ItrSnapshot|null} itr
 * @param {import('./model.js').AisSnapshot|null} ais
 * @param {string} fy
 * @returns {NoticeRisk}
 */
export function calculateNoticeRisk(itr, ais, fy) {
  let score = 0;
  const flags = [];

  if (!itr || !ais || !itr.hasData || !ais.hasData) {
    return {
      score: 0,
      level: 'low',
      flags: ['Upload both ITR and AIS for a risk assessment'],
      summary: 'Add ITR + AIS to see your filing risk score',
    };
  }

  const aisInterest = ais.interestTotal ?? 0;
  const itrInterest = itr.interestIncome ?? 0;
  if (aisInterest > 0 && itrInterest < aisInterest * 0.75 && aisInterest - itrInterest > 5000) {
    const gap = aisInterest - itrInterest;
    score += gap > 100000 ? 25 : gap > 25000 ? 15 : 8;
    flags.push(`Interest income gap: AIS shows ₹${fmtAmount(aisInterest)} but ITR has ₹${fmtAmount(itrInterest)}`);
  }

  const aisDividend = ais.dividendTotal ?? 0;
  const itrDividend = itr.dividendIncome ?? 0;
  if (aisDividend > 10000 && itrDividend < aisDividend * 0.8) {
    const gap = aisDividend - itrDividend;
    score += gap > 50000 ? 20 : gap > 10000 ? 12 : 6;
    flags.push(`Dividend gap: AIS shows ₹${fmtAmount(aisDividend)}, ITR declares ₹${fmtAmount(itrDividend)}`);
  }

  const aisCG = ais.capitalGainsTotal ?? 0;
  const itrCG = itr.capitalGains?.totalCg ?? 0;
  if (aisCG > 5000 && itrCG < aisCG * 0.7) {
    const gap = aisCG - itrCG;
    score += gap > 200000 ? 30 : gap > 50000 ? 20 : 10;
    flags.push(`Capital gains in AIS (₹${fmtAmount(aisCG)}) but low/no declaration in ITR (₹${fmtAmount(itrCG)})`);
  }

  const aisTotal = (ais.interestTotal ?? 0) + (ais.dividendTotal ?? 0) + (ais.capitalGainsTotal ?? 0) + (ais.rentTotal ?? 0);
  const itrOtherIncome = (itr.interestIncome ?? 0) + (itr.dividendIncome ?? 0) + (itr.capitalGains?.totalCg ?? 0);
  if (aisTotal > 50000 && itrOtherIncome === 0) {
    score += 25;
    flags.push(`AIS shows ₹${fmtAmount(aisTotal)} in non-salary income, but ITR shows no other income`);
  }

  const aisTds = ais.tdsTotal ?? 0;
  const itrTds = itr.tdsTotal ?? 0;
  if (aisTds > 0 && itrTds > 0 && Math.abs(aisTds - itrTds) > Math.max(5000, aisTds * 0.1)) {
    score += 8;
    flags.push(`TDS mismatch: AIS ₹${fmtAmount(aisTds)} vs ITR ₹${fmtAmount(itrTds)}`);
  }

  if (ais.lineCount > 150) {
    score += 5;
    flags.push(`High AIS activity (${ais.lineCount} transactions) — verify all categories are accounted for`);
  }

  if ((ais.foreignRemittance ?? 0) > 0) {
    score += 10;
    flags.push(`Foreign remittance detected in AIS (₹${fmtAmount(ais.foreignRemittance ?? 0)}) — ensure Schedule FA is filed`);
  }

  const aisRent = ais.rentTotal ?? 0;
  const itrHP = itr.housePropertyIncome ?? 0;
  if (aisRent > 100000 && itrHP === 0) {
    score += 15;
    flags.push(`AIS shows rental income ₹${fmtAmount(aisRent)} but no house property income in ITR`);
  }

  if ((ais.businessTotal ?? 0) > 0 && !itr.businessIncome) {
    score += 10;
    flags.push(`Business income in AIS (₹${fmtAmount(ais.businessTotal ?? 0)}) with no corresponding ITR declaration`);
  }

  // Cap score
  score = Math.min(100, score);

  const level =
    score >= 70 ? 'critical' :
    score >= 40 ? 'high' :
    score >= 20 ? 'medium' : 'low';

  const summary =
    level === 'critical' ? 'High risk of income tax notice — significant AIS vs ITR gaps detected' :
    level === 'high' ? 'Material gaps between AIS and ITR — reconcile before filing' :
    level === 'medium' ? 'Minor discrepancies found — review and clarify before deadline' :
    'Filing looks clean — AIS and ITR appear well-aligned';

  if (flags.length === 0) flags.push('No significant gaps detected between AIS and ITR');

  return { score, level, flags, summary };
}

// ─── Formatting ────────────────────────────────────────────────────────────

/**
 * Format an INR amount compactly (k / L / Cr). Handles negatives correctly.
 * @param {number|null|undefined} n
 */
function fmtAmount(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

// ─── Effective tax rate ────────────────────────────────────────────────────

/**
 * Compute effective tax rate from ITR data.
 *
 * Numerator preference (most honest → last resort):
 *   1. `itr.taxLiability.taxPayable` — gross tax liability BEFORE TDS. True tax cost.
 *   2. `max(netTaxPayable, 0) + tdsTotal` — reconstruct gross from net + withheld.
 *   3. `itr.tdsTotal` — TDS withheld (often > actual liability for refund cases).
 *
 * @param {import('./model.js').ItrSnapshot & { fy?: string }} itr
 * @returns {{ effectiveRate: number, marginalRate: number, taxPaid: number, taxPaidLabel: string, income: number } | null}
 */
export function computeEffectiveTaxRate(itr) {
  if (!itr || !itr.hasData) return null;
  const income = itr.grossIncome ?? itr.salaryIncome ?? 0;
  if (income <= 0) return null;

  const taxPayable = itr.taxLiability?.taxPayable;
  const netTaxPayable = itr.taxLiability?.netTaxPayable;
  const tdsTotal = itr.tdsTotal ?? 0;

  let taxPaid;
  let taxPaidLabel;
  if (taxPayable != null && Number.isFinite(taxPayable) && taxPayable > 0) {
    taxPaid = taxPayable;
    taxPaidLabel = 'gross tax liability';
  } else if (netTaxPayable != null && Number.isFinite(netTaxPayable)) {
    taxPaid = Math.max(netTaxPayable, 0) + Math.max(0, tdsTotal);
    taxPaidLabel = 'net tax + TDS';
  } else {
    taxPaid = Math.max(0, tdsTotal);
    taxPaidLabel = 'TDS withheld';
  }

  const effectiveRate = income > 0 ? (taxPaid / income) * 100 : 0;

  // Marginal rate from the FY/regime slab table
  const regime = itr.taxRegimeKey === 'old' ? 'old' : 'new';
  const fy = itr.fy ?? '2024-25';
  const { slabs } = getSlabTable(fy, regime);
  let marginalRate = 0;
  for (const { upto, rate } of slabs) {
    if (income <= upto) { marginalRate = rate; break; }
    marginalRate = rate;
  }

  return { effectiveRate, marginalRate, taxPaid, taxPaidLabel, income };
}

// ─── Income growth ─────────────────────────────────────────────────────────

/**
 * Get income growth rate (YoY) across years.
 * @param {Map<string, import('./model.js').YearRecord>} years
 * @returns {{ fy: string, income: number, growth: number|null }[]}
 */
export function computeIncomeGrowth(years) {
  const sorted = [...years.entries()]
    .filter(([, r]) => r.itr?.grossIncome != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fy, r]) => ({ fy, income: r.itr?.grossIncome ?? 0 }));

  return sorted.map((item, i) => ({
    fy: item.fy,
    income: item.income,
    growth: i === 0 ? null : sorted[i - 1].income > 0
      ? ((item.income - sorted[i - 1].income) / sorted[i - 1].income) * 100
      : null,
  }));
}

export { fmtAmount };
