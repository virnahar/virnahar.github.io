/**
 * Structured ITR-1 / ITR-2 extraction — dotted paths + schema-aware fallbacks.
 * No network / no LLM — client-side only.
 */

/**
 * @param {unknown} obj
 * @param {string} path
 * @returns {unknown}
 */
export function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    if (!(p in /** @type {Record<string, unknown>} */ (cur))) return undefined;
    cur = /** @type {Record<string, unknown>} */ (cur)[p];
  }
  return cur;
}

/**
 * @param {unknown} v
 * @returns {number|null}
 */
export function toNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).replace(/,/g, '').replace(/\s/g, '').trim();
  if (!s || s === '-') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} obj
 * @param {string[]} paths
 * @returns {number|null}
 */
function firstNum(obj, paths) {
  for (const p of paths) {
    const n = toNum(getByPath(obj, p));
    if (n !== null) return n;
  }
  return null;
}

/**
 * @param {unknown} obj
 * @param {string[]} paths
 */
function firstString(obj, paths) {
  for (const p of paths) {
    const v = getByPath(obj, p);
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s) return s;
    }
  }
  return '';
}

/** @type {Record<string, string[]>} */
const PATHS = {
  ay: ['ITR.ITR1.Form_ITR1.AssessmentYear', 'ITR.ITR2.Form_ITR2.AssessmentYear', 'ITR.ITR1.CreationInfo.AssessmentYear', 'ITR.ITR2.CreationInfo.AssessmentYear'],
  formName: ['ITR.ITR1.Form_ITR1.FormName', 'ITR.ITR2.Form_ITR2.FormName'],
  firstName: [
    'ITR.ITR1.PersonalInfo.AssesseeName.FirstName',                           // real portal format
    'ITR.ITR2.PartA_GEN1.PersonalInfo.AssesseeName.FirstName',
    'ITR.ITR1.PersonalInfo.AssesseeInfo.IndividualDtls.FirstName',            // legacy fallback
    'ITR.ITR2.PartA_GEN1.PersonalInfo.AssesseeInfo.IndividualDtls.FirstName',
    'ITR.ITR1.Form_ITR1.PersonalInfo.AssesseeInfo.IndividualDtls.FirstName',
  ],
  surName: [
    'ITR.ITR1.PersonalInfo.AssesseeName.SurNameOrOrgName',                    // real portal format
    'ITR.ITR2.PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName',
    'ITR.ITR1.PersonalInfo.AssesseeInfo.IndividualDtls.SurName',              // legacy fallback
    'ITR.ITR2.PartA_GEN1.PersonalInfo.AssesseeInfo.IndividualDtls.SurName',
    'ITR.ITR1.Form_ITR1.PersonalInfo.AssesseeInfo.IndividualDtls.SurName',
  ],
  pan: [
    'ITR.ITR1.PersonalInfo.PAN',
    'ITR.ITR2.PartA_GEN1.PersonalInfo.PAN',
  ],
  city: [
    'ITR.ITR1.Verification.Place',                                            // filing city (clean: "Delhi")
    'ITR.ITR2.Verification.Place',
    'ITR.ITR1.PersonalInfo.Address.CityOrTownOrDistrict',
    'ITR.ITR2.PartA_GEN1.PersonalInfo.Address.CityOrTownOrDistrict',
  ],
  optOutNewTax: [
    'ITR.ITR1.FilingStatus.OptOutNewTaxRegime',
    'ITR.ITR2.PartA_GEN1.FilingStatus.OptOutNewTaxRegime',
    'ITR.ITR2.FilingStatus.OptOutNewTaxRegime',
    'ITR.ITR1.Form_ITR1.FilingStatus.OptOutNewTaxRegime',
  ],

  // ─── Income heads ───────────────────────────────────────────────────────────
  salary: [
    'ITR.ITR1.ITR1_IncomeDeductions.IncomeFromSal',
    'ITR.ITR2.ScheduleS.TotIncUnderHeadSalaries',
    'ITR.ITR1.Form_ITR1.IncomeDeductions.IncomeFromSal',
  ],
  houseProperty: [
    'ITR.ITR1.ITR1_IncomeDeductions.TotalIncomeOfHP',
    'ITR.ITR2.PartB-TI.IncomeFromHP',
    'ITR.ITR2.ScheduleHP.TotalIncomeOfHP',
  ],
  businessIncome: [
    'ITR.ITR2.PartB-TI.ProfGain',
    'ITR.ITR2.ScheduleBP.NetIncBus',
    'ITR.ITR2.ScheduleBP.IncFrmBus',
  ],
  grossItr1: [
    'ITR.ITR1.ITR1_IncomeDeductions.GrossTotIncome',
    'ITR.ITR1.ITR1_IncomeDeductions.TotalIncome',
    'ITR.ITR1.ITR1_IncomeDeductions.GrossTotIncomeIncLTCG112A',
    'ITR.ITR1.Form_ITR1.IncomeDeductions.GrossTotIncome',
  ],
  totalIncomeItr1: [
    'ITR.ITR1.ITR1_IncomeDeductions.TotIncomeTaxable',
    'ITR.ITR1.ITR1_IncomeDeductions.NetIncome',
    'ITR.ITR1.ITR1_IncomeDeductions.TotalIncome',
  ],
  grossItr2Flat: [
    'ITR.ITR2.PartB-TI.GrossTotIncome',
    'ITR.ITR2.PartB-TI.TotalIncome',
    'ITR.ITR2.PartB_TTI.TotalIncome',
    'ITR.ITR2.PartB-TI.AggregateIncome',
  ],
  totalIncomeItr2: [
    'ITR.ITR2.PartB-TI.TotalIncome',
    'ITR.ITR2.PartB_TTI.TotalIncome',
  ],
  hpItr1: ['ITR.ITR1.ITR1_IncomeDeductions.TotalIncomeOfHP'],
  hpItr2: ['ITR.ITR2.PartB-TI.IncomeFromHP'],
  cgItr2: ['ITR.ITR2.PartB-TI.CapGain.TotalCapGains', 'ITR.ITR2.PartB-TI.CapGain'],
  osItr1: ['ITR.ITR1.ITR1_IncomeDeductions.IncomeOthSrc'],
  osItr2: ['ITR.ITR2.ScheduleOS.IncChargeable'],

  // ─── Capital gains breakdown ─────────────────────────────────────────────
  stcg15: [
    'ITR.ITR2.ScheduleCG.ShortTermCapGainFor15Per',
    'ITR.ITR2.ScheduleCG.STCG15Per',
    'ITR.ITR2.PartB-TI.CapGain.ShortTermCapGainFor15Per',
    'ITR.ITR2.ScheduleCG.ShortTermCapGains15Per',
  ],
  stcgOther: [
    'ITR.ITR2.ScheduleCG.ShortTermCapGainForAppRate',
    'ITR.ITR2.ScheduleCG.STCGAppRate',
    'ITR.ITR2.PartB-TI.CapGain.ShortTermCapGainForAppRate',
  ],
  ltcg10: [
    'ITR.ITR2.ScheduleCG.LongTermCapGain10Per',
    'ITR.ITR2.ScheduleCG.LTCG10Per',
    'ITR.ITR2.PartB-TI.CapGain.LongTermCapGain10Per',
    'ITR.ITR2.ScheduleCG.LongTermCapGains10Per',
  ],
  ltcg20: [
    'ITR.ITR2.ScheduleCG.LongTermCapGain20Per',
    'ITR.ITR2.ScheduleCG.LTCG20Per',
    'ITR.ITR2.PartB-TI.CapGain.LongTermCapGain20Per',
    'ITR.ITR2.ScheduleCG.LongTermCapGains20Per',
  ],

  // ─── Deductions ─────────────────────────────────────────────────────────
  totalDeductions: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.TotalChapVIADeductions',
    'ITR.ITR2.ScheduleVIA.TotalChapVIADeductions',
    'ITR.ITR1.Form_ITR1.IncomeDeductions.DeductUndChapVIA.TotalChapVIADeductions',
  ],
  standardDeduction: [
    'ITR.ITR1.ITR1_IncomeDeductions.UsrDeductUndChapVIA.StdDeduct',
    'ITR.ITR1.ITR1_IncomeDeductions.StdDeduct',
    'ITR.ITR1.ITR1_IncomeDeductions.DeductionUs16ia', // XML pre-2019
    'ITR.ITR1.ITR1_IncomeDeductions.DeductionUs16',   // XML pre-2019 total
    'ITR.ITR2.ScheduleS.StdDeduct',
    'ITR.ITR2.ScheduleS.DeductionUs16',
    'ITR.ITR2.ScheduleS.Deduction16ia',
  ],
  section80C: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C',
    'ITR.ITR1.ITR1_IncomeDeductions.UsrDeductUndChapVIA.Section80C',
    'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80C',
    'ITR.ITR2.ScheduleVIA.Section80C',
  ],
  section80D: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80D',
    'ITR.ITR1.ITR1_IncomeDeductions.UsrDeductUndChapVIA.Section80D',
    'ITR.ITR1.ITR1_IncomeDeductions.Sec80DHealthInsurancePremiumUsr', // pre-2020 XML
    'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80D',
    'ITR.ITR2.ScheduleVIA.Section80D',
  ],
  section80TTA: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80TTA',
    'ITR.ITR2.ScheduleVIA.Section80TTA',
  ],
  section80TTB: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80TTB',
    'ITR.ITR2.ScheduleVIA.Section80TTB',
  ],
  nps80CCD: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCD1B',
    'ITR.ITR2.ScheduleVIA.Section80CCD1B',
  ],
  hraExemption: [
    'ITR.ITR2.ScheduleS.HRAExemption',
    'ITR.ITR2.ScheduleS.TotHRAExemption',
    'ITR.ITR1.ITR1_IncomeDeductions.ExemptAllowances.HRA',
    'ITR.ITR1.ITR1_IncomeDeductions.HRA',
  ],
  homeLoanInterest: [
    'ITR.ITR1.ITR1_IncomeDeductions.AnnualValue.IntOnBorrowedCap',
    'ITR.ITR2.ScheduleHP.IntOnBorrowedCap',
    'ITR.ITR2.ScheduleHP.AnnualValue.IntOnBorrowedCap',
  ],

  // ─── Tax liability ───────────────────────────────────────────────────────
  tdsItr1: [
    'ITR.ITR1.TaxPaid.TaxesPaid.TDS',
    'ITR.ITR1.TDSonSalaries.TotalTDSonSalaries',
    'ITR.ITR1.Form_ITR1.TaxPaid.TaxesPaid.TDS',
  ],
  tdsItr2: [
    'ITR.ITR2.TaxPaid.TaxesPaid.TDS',
    'ITR.ITR2.PartB_TTI.TaxesPaid.TDS',
  ],
  taxPayableItr1: [
    'ITR.ITR1.TaxPaid.GrossTaxLiability',
    'ITR.ITR1.ITR1_IncomeDeductions.GrossTaxLiability',
    'ITR.ITR1.Computation.GrossTaxLiability',
  ],
  taxPayableItr2: [
    'ITR.ITR2.PartB_TTI.ComputationOfTaxLiability.GrossTaxLiability',
    'ITR.ITR2.PartB_TTI.GrossTaxLiability',
    'ITR.ITR2.Computation.GrossTaxLiability',
  ],
  netTaxPayableItr1: [
    'ITR.ITR1.TaxPaid.TotalTaxPayable',
    'ITR.ITR1.ITR1_IncomeDeductions.NetTaxPayable',
    'ITR.ITR1.Computation.TaxPayable',
  ],
  netTaxPayableItr2: [
    'ITR.ITR2.PartB_TTI.ComputationOfTaxLiability.TaxPayAfterRelief',
    'ITR.ITR2.PartB_TTI.NetTaxPayable',
    'ITR.ITR2.Computation.TaxPayable',
  ],
  refundItr1: [
    'ITR.ITR1.TaxPaid.Refund',
    'ITR.ITR1.ITR1_IncomeDeductions.TaxRefund',
  ],
  refundItr2: [
    'ITR.ITR2.PartB_TTI.RefundDue',
    'ITR.ITR2.TaxPaid.Refund',
  ],
  advanceTaxItr1: [
    'ITR.ITR1.TaxPaid.TaxesPaid.AdvanceTax',
    'ITR.ITR1.AdvanceTaxSchedule.TotalAdvanceTaxPaid',
  ],
  advanceTaxItr2: [
    'ITR.ITR2.TaxPaid.TaxesPaid.AdvanceTax',
    'ITR.ITR2.PartB_TTI.TaxesPaid.AdvanceTax',
  ],
  surchargeItr1: ['ITR.ITR1.TaxPaid.Surcharge', 'ITR.ITR1.Computation.Surcharge'],
  surchargeItr2: ['ITR.ITR2.PartB_TTI.ComputationOfTaxLiability.Surcharge', 'ITR.ITR2.Computation.Surcharge'],
  cessItr1: ['ITR.ITR1.TaxPaid.EducationCess', 'ITR.ITR1.Computation.EducationCess'],
  cessItr2: ['ITR.ITR2.PartB_TTI.ComputationOfTaxLiability.EducationCess', 'ITR.ITR2.Computation.EducationCess'],
};

/**
 * @param {string|undefined} rawForm
 */
function normalizeFormLabel(rawForm) {
  if (!rawForm) return null;
  const u = String(rawForm).toUpperCase();
  if (u.includes('ITR2') || u.includes('ITR-2') || u === '2') return 'ITR-2';
  if (u.includes('ITR1') || u.includes('ITR-1') || u === '1') return 'ITR-1';
  return String(rawForm).slice(0, 12);
}

/**
 * @param {unknown} parsed
 */
function taxRegimeFrom(parsed) {
  const ayRaw = firstString(parsed, PATHS.ay);
  const m = ayRaw.match(/\d{4}/);
  const ayStart = m ? parseInt(m[0], 10) : 0;
  let opt = '';
  for (const p of PATHS.optOutNewTax) {
    const v = getByPath(parsed, p);
    if (v !== undefined && v !== null && v !== '') {
      opt = String(v).trim().toUpperCase();
      break;
    }
  }
  if (ayStart > 0 && ayStart <= 2023) {
    return { key: /** @type {const} */ ('old'), label: 'Old regime (AY ≤ 2023 default)' };
  }
  if (ayStart > 2023) {
    if (opt === 'Y' || opt === 'YES' || opt === 'TRUE') {
      return { key: /** @type {const} */ ('old'), label: 'Old tax regime (opted out of 115BAC)' };
    }
    if (opt === 'N' || opt === 'NO' || opt === 'FALSE') {
      return { key: /** @type {const} */ ('new'), label: 'New tax regime (115BAC)' };
    }
    if (opt) return { key: /** @type {const} */ ('new'), label: 'New tax regime (115BAC)' };
    // AY 2024+ default is new regime
    return { key: /** @type {const} */ ('new'), label: 'New tax regime (115BAC default)' };
  }
  return { key: null, label: null };
}

/**
 * Extracts primary employer name from TDS-on-salary array and formats it for display.
 * Returns the employer with the highest TDS deducted (primary employer).
 * @param {unknown} parsed
 * @returns {string}
 */
function extractEmployerName(parsed) {
  const arr =
    getByPath(parsed, 'ITR.ITR1.TDSonSalaries.TDSonSalary') ||
    getByPath(parsed, 'ITR.ITR2.TDSonSalaries.TDSonSalary');
  if (!Array.isArray(arr) || arr.length === 0) return '';

  // Pick employer with highest TDS (primary employer)
  let best = /** @type {Record<string, unknown>} */ (arr[0]);
  for (const item of arr) {
    const row = /** @type {Record<string, unknown>} */ (item);
    if ((toNum(row.TotalTDSSal) ?? 0) > (toNum(best.TotalTDSSal) ?? 0)) best = row;
  }
  const det = /** @type {Record<string, unknown>} */ (best?.EmployerOrDeductorOrCollectDetl ?? {});
  const rawName = String(det?.EmployerOrDeductorOrCollecterName ?? '').trim();
  if (!rawName) return '';

  // Strip common corporate suffixes for a clean display name,
  // but keep the full brand/company name otherwise (no word-level truncation).
  let n = rawName
    .replace(/\(INDIA\)/gi, '')
    .replace(/\(I\)/gi, '')
    .replace(/\bPRIVATE\s+LIMITED\b/gi, '')
    .replace(/\bPVT\.?\s*LTD\.?\b/gi, '')
    .replace(/\bLIMITED\b/gi, '')
    .replace(/\bLTD\.?\b/gi, '')
    .replace(/\bINC\.?\b/gi, '')
    .replace(/\bCORPORATION\b/gi, '')
    .replace(/\bLLP\b/gi, '')
    .replace(/[.,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Title-case each word
  const titled = n.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  // Soft cap — keep full name up to 32 chars, ellipsis if longer
  const MAX_LEN = 32;
  return titled.length > MAX_LEN ? titled.slice(0, MAX_LEN - 1).trimEnd() + '…' : titled;
}

/**
 * Full structured ITR extraction — income heads, deductions, tax liability, capital gains.
 * @param {unknown} parsed
 * @returns {{
 *   grossIncome: number|null,
 *   totalIncome: number|null,
 *   salaryIncome: number|null,
 *   housePropertyIncome: number|null,
 *   interestIncome: number|null,
 *   dividendIncome: number|null,
 *   businessIncome: number|null,
 *   tdsTotal: number|null,
 *   taxRegimeKey: 'old'|'new'|null,
 *   taxRegimeLabel: string|null,
 *   formLabel: string|null,
 *   assessmentYear: string|null,
 *   firstName: string,
 *   surName: string,
 *   employerName: string,
 *   city: string,
 *   deductions: import('./model.js').DeductionSnapshot,
 *   taxLiability: import('./model.js').TaxLiabilitySnapshot,
 *   capitalGains: import('./model.js').CapitalGainsSnapshot,
 * }}
 */
export function extractItrStructured(parsed) {
  const out = {
    grossIncome: /** @type {number|null} */ (null),
    totalIncome: /** @type {number|null} */ (null),
    salaryIncome: /** @type {number|null} */ (null),
    housePropertyIncome: /** @type {number|null} */ (null),
    interestIncome: /** @type {number|null} */ (null),
    dividendIncome: /** @type {number|null} */ (null),
    businessIncome: /** @type {number|null} */ (null),
    tdsTotal: /** @type {number|null} */ (null),
    taxRegimeKey: /** @type {'old'|'new'|null} */ (null),
    taxRegimeLabel: /** @type {string|null} */ (null),
    formLabel: /** @type {string|null} */ (null),
    assessmentYear: /** @type {string|null} */ (null),
    firstName: /** @type {string} */ (''),
    surName: /** @type {string} */ (''),
    pan: /** @type {string} */ (''),
    employerName: /** @type {string} */ (''),
    city: /** @type {string} */ (''),
    deductions: {
      totalDeductions: null,
      section80C: null,
      section80D: null,
      hraExemption: null,
      standardDeduction: null,
      section80TTA: null,
      npsDeduction: null,
      homeLoanInterest: null,
    },
    taxLiability: {
      taxPayable: null,
      netTaxPayable: null,
      refundDue: null,
      advanceTax: null,
      selfAssessmentTax: null,
      surcharge: null,
      educationCess: null,
    },
    capitalGains: {
      stcg15pct: null,
      stcgOther: null,
      ltcg10pct: null,
      ltcg20pct: null,
      totalCg: null,
    },
  };

  try {
    const ayRaw = firstString(parsed, PATHS.ay);
    if (ayRaw) out.assessmentYear = ayRaw;

    const formRaw = firstString(parsed, PATHS.formName);
    out.formLabel = normalizeFormLabel(formRaw);

    const regime = taxRegimeFrom(parsed);
    out.taxRegimeKey = regime.key;
    out.taxRegimeLabel = regime.label;

    // ─── Income heads ───────────────────────────────────────────────────────
    out.salaryIncome = firstNum(parsed, PATHS.salary);
    out.housePropertyIncome = firstNum(parsed, PATHS.hpItr2) ?? firstNum(parsed, PATHS.hpItr1);
    out.businessIncome = firstNum(parsed, PATHS.businessIncome);

    const g1 = firstNum(parsed, PATHS.grossItr1);
    if (g1 !== null) {
      out.grossIncome = g1;
    } else {
      const gFlat = firstNum(parsed, PATHS.grossItr2Flat);
      if (gFlat !== null) {
        out.grossIncome = gFlat;
      } else {
        const s = firstNum(parsed, PATHS.salary) ?? 0;
        const hp = out.housePropertyIncome ?? 0;
        const cg = firstNum(parsed, PATHS.cgItr2) ?? 0;
        const os = firstNum(parsed, PATHS.osItr2) ?? firstNum(parsed, PATHS.osItr1) ?? 0;
        const bus = out.businessIncome ?? 0;
        const sum = s + Math.max(0, hp) + cg + os + bus;
        if (sum > 0) out.grossIncome = sum;
      }
    }

    out.totalIncome = firstNum(parsed, PATHS.totalIncomeItr1) ?? firstNum(parsed, PATHS.totalIncomeItr2);

    // ─── Capital gains ───────────────────────────────────────────────────────
    out.capitalGains.stcg15pct = firstNum(parsed, PATHS.stcg15);
    out.capitalGains.stcgOther = firstNum(parsed, PATHS.stcgOther);
    out.capitalGains.ltcg10pct = firstNum(parsed, PATHS.ltcg10);
    out.capitalGains.ltcg20pct = firstNum(parsed, PATHS.ltcg20);
    const cgSum =
      (out.capitalGains.stcg15pct ?? 0) +
      (out.capitalGains.stcgOther ?? 0) +
      (out.capitalGains.ltcg10pct ?? 0) +
      (out.capitalGains.ltcg20pct ?? 0);
    if (cgSum > 0) out.capitalGains.totalCg = cgSum;

    // ─── Deductions ─────────────────────────────────────────────────────────
    out.deductions.totalDeductions = firstNum(parsed, PATHS.totalDeductions);
    out.deductions.section80C = firstNum(parsed, PATHS.section80C);
    out.deductions.section80D = firstNum(parsed, PATHS.section80D);
    out.deductions.hraExemption = firstNum(parsed, PATHS.hraExemption);
    out.deductions.standardDeduction = firstNum(parsed, PATHS.standardDeduction);
    out.deductions.section80TTA = firstNum(parsed, PATHS.section80TTA) ?? firstNum(parsed, PATHS.section80TTB);
    out.deductions.npsDeduction = firstNum(parsed, PATHS.nps80CCD);
    out.deductions.homeLoanInterest = firstNum(parsed, PATHS.homeLoanInterest);

    // Estimate total deductions if not directly available
    if (!out.deductions.totalDeductions && out.grossIncome && out.totalIncome && out.totalIncome < out.grossIncome) {
      out.deductions.totalDeductions = out.grossIncome - out.totalIncome;
    }

    // ─── TDS & Tax liability ─────────────────────────────────────────────────
    out.tdsTotal = firstNum(parsed, PATHS.tdsItr1) ?? firstNum(parsed, PATHS.tdsItr2);
    out.taxLiability.taxPayable = firstNum(parsed, PATHS.taxPayableItr1) ?? firstNum(parsed, PATHS.taxPayableItr2);
    out.taxLiability.netTaxPayable = firstNum(parsed, PATHS.netTaxPayableItr1) ?? firstNum(parsed, PATHS.netTaxPayableItr2);
    out.taxLiability.refundDue = firstNum(parsed, PATHS.refundItr1) ?? firstNum(parsed, PATHS.refundItr2);
    out.taxLiability.advanceTax = firstNum(parsed, PATHS.advanceTaxItr1) ?? firstNum(parsed, PATHS.advanceTaxItr2);
    out.taxLiability.surcharge = firstNum(parsed, PATHS.surchargeItr1) ?? firstNum(parsed, PATHS.surchargeItr2);
    out.taxLiability.educationCess = firstNum(parsed, PATHS.cessItr1) ?? firstNum(parsed, PATHS.cessItr2);

    // ─── Other sources (interest + dividend) ────────────────────────────────
    const schOS = getByPath(parsed, 'ITR.ITR2.ScheduleOS');
    if (schOS && typeof schOS === 'object') {
      const sch = /** @type {Record<string, unknown>} */ (schOS);
      const inner = sch.IncOthThanOwnRaceHorse;
      const osNode =
        inner && typeof inner === 'object' && !Array.isArray(inner)
          ? /** @type {Record<string, unknown>} */ (inner)
          : sch;
      const sav = toNum(osNode.IntrstFrmSavingBank);
      const div = toNum(osNode.DividendGross);
      if (sav !== null && sav > 0) out.interestIncome = sav;
      if (div !== null && div > 0) out.dividendIncome = div;
    }

    const arr1 =
      getByPath(parsed, 'ITR.ITR1.ITR1_IncomeDeductions.OthersInc.OthersIncDtlsOthSrc') ||
      getByPath(parsed, 'ITR.ITR1.ITR1_IncomeDeductions.OthSrc') ||
      getByPath(parsed, 'ITR.ITR1.ITR1_IncomeDeductions.OthersIncDtls');

    if (Array.isArray(arr1)) {
      let savings = 0;
      let dividend = 0;
      for (const x of arr1) {
        if (!x || typeof x !== 'object') continue;
        const row = /** @type {Record<string, unknown>} */ (x);
        const nat = String(row.OthSrcNatureDesc || row.SalNatureDesc || '').toUpperCase();
        const amt =
          toNum(row.OthSrcOthAmount) ??
          toNum(row.OthAmount) ??
          toNum(row.SalOthAmount) ??
          toNum(row.Amount) ??
          0;
        if (!amt) continue;
        if (nat.includes('DIV')) dividend += amt;
        else if (nat.includes('SAV') || nat.includes('INT')) savings += amt;
      }
      if (savings > 0) out.interestIncome = out.interestIncome ?? savings;
      if (dividend > 0) out.dividendIncome = out.dividendIncome ?? dividend;
    }

    // ─── Personal info ───────────────────────────────────────────────────────
    out.firstName = firstString(parsed, PATHS.firstName);
    out.surName = firstString(parsed, PATHS.surName);
    out.pan = firstString(parsed, PATHS.pan);
    out.employerName = extractEmployerName(parsed);
    out.city = firstString(parsed, PATHS.city);

    // Sanity check: salary > gross income correction
    if (out.salaryIncome != null && out.grossIncome != null && out.salaryIncome > out.grossIncome * 1.03) {
      const alt = firstNum(parsed, [
        'ITR.ITR1.ITR1_IncomeDeductions.TotalIncome',
        'ITR.ITR1.ITR1_IncomeDeductions.GrossSalary',
        'ITR.ITR2.PartB-TI.TotalIncome',
        'ITR.ITR2.PartB_TTI.TotalIncome',
      ]);
      if (alt != null && alt + 1 >= out.salaryIncome * 0.94) {
        out.grossIncome = alt;
      } else {
        out.grossIncome = Math.max(out.grossIncome, out.salaryIncome);
      }
    }
  } catch {
    /* ignore — best-effort only */
  }

  return out;
}
