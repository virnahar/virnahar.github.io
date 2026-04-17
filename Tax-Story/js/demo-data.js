/**
 * demo-data.js
 *
 * Synthetic 15-year career arc (FY 2010-11 → FY 2024-25) for a fictional
 * Indian IT professional, "Virendra Kumar". Used by the "Try Demo" flow.
 * No real PII is included. "Apple" is a requested brand token only and does
 * not represent any real employee record or source data.
 *
 * Story arc:
 *   2010-2025  Apple (Bengaluru) — progressive growth, role transitions and
 *   compensation changes are synthetic and only for product demo realism.
 *
 * Regime: Old regime all 15 years (home loan + 80C + 80D + HRA keep it ahead).
 *
 * State shape mirrors createEmptyState() in model.js:
 *   { years: Map<string, YearRecord>, files: Array<FileEntry>, reviewCards: [] }
 *
 * NOTE: file entries carry no .blob — integrators must ensure
 * buildComparativeFromState handles itr_json without blob via the
 * snapshotToObj fallback (otherwise the comparative chart loses demo years).
 */

export const DEMO_FY_LABELS = [
  '2010-11', '2011-12', '2012-13', '2013-14', '2014-15',
  '2015-16', '2016-17', '2017-18', '2018-19', '2019-20',
  '2020-21', '2021-22', '2022-23', '2023-24', '2024-25',
];

// ---------------------------------------------------------------------------
// Character constants
// ---------------------------------------------------------------------------

const FIRST_NAME = 'Virendra';
const SUR_NAME = 'Kumar';

const EMPLOYER_ACME      = 'Apple';
const EMPLOYER_HELIOS    = 'Apple';
const EMPLOYER_NORTHWIND = 'Apple';
const EMPLOYER_APPLE     = 'Apple';

const CITY_BANGALORE = 'Bengaluru';
const CITY_BENGALURU = 'Bengaluru';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal ItrSnapshot (shape matches model.js → ItrSnapshot). */
function itr({
  grossIncome,
  grossSalaryIncome,
  salaryIncome,
  housePropertyIncome,
  interestIncome,
  dividendIncome = 0,
  tdsTotal,
  deductions,
  taxLiability,
  capitalGains = null,
  taxRegimeKey = 'old',
  taxRegimeLabel = 'Old Regime',
  formLabel = 'ITR-1',
  assessmentYear,
  employerName,
  city,
}) {
  const totalIncome = grossIncome - (deductions.totalDeductions ?? 0);
  return {
    hasData: true,
    grossIncome,
    totalIncome,
    grossSalaryIncome,
    salaryIncome,
    housePropertyIncome,
    interestIncome,
    dividendIncome,
    businessIncome: null,
    tdsTotal,
    deductions,
    taxLiability,
    capitalGains: capitalGains ?? {
      stcg15pct: null,
      stcgOther: null,
      ltcg10pct: null,
      ltcg20pct: null,
      totalCg: null,
    },
    taxRegimeKey,
    taxRegimeLabel,
    formLabel,
    assessmentYear,
    firstName: FIRST_NAME,
    surName: SUR_NAME,
    employerName,
    city,
  };
}

/** Build a minimal AisSnapshot (matches model.js → AisSnapshot). */
function ais({
  salaryTotal,
  interestSavings = 0,
  interestFD = 0,
  dividendTotal = 0,
  capitalGainsTotal = null,
  capitalGainsMF = null,
  capitalGainsEquity = null,
  rentTotal = null,
  tdsTotal,
  lineCount = 12,
}) {
  return {
    hasData: true,
    salaryTotal,
    interestTotal: interestSavings + interestFD,
    interestSavings,
    interestFD,
    dividendTotal,
    capitalGainsTotal,
    capitalGainsMF,
    capitalGainsEquity,
    rentTotal,
    businessTotal: null,
    tdsTotal,
    tcsTotal: null,
    advanceTaxTotal: null,
    foreignRemittance: null,
    lineCount,
    topTransactions: [],
  };
}

/** Build a minimal TisSnapshot. */
function tis({ salary, savingsInterest = 0, fdInterest = 0, dividend = 0, capitalGains = null }) {
  return {
    hasData: true,
    salary,
    savingsInterest,
    fdInterest,
    dividend,
    capitalGains,
    rentReceived: null,
  };
}

/** Capital-gains snapshot builder (equity STCG @15%, equity LTCG @10%). */
function cg({ stcg15pct = 0, ltcg10pct = 0 }) {
  return {
    stcg15pct,
    stcgOther: null,
    ltcg10pct,
    ltcg20pct: null,
    totalCg: stcg15pct + ltcg10pct,
  };
}

// ---------------------------------------------------------------------------
// FY constants
// ---------------------------------------------------------------------------

const FY_2010_11 = '2010-11';
const FY_2011_12 = '2011-12';
const FY_2012_13 = '2012-13';
const FY_2013_14 = '2013-14';
const FY_2014_15 = '2014-15';
const FY_2015_16 = '2015-16';
const FY_2016_17 = '2016-17';
const FY_2017_18 = '2017-18';
const FY_2018_19 = '2018-19';
const FY_2019_20 = '2019-20';
const FY_2020_21 = '2020-21';
const FY_2021_22 = '2021-22';
const FY_2022_23 = '2022-23';
const FY_2023_24 = '2023-24';
const FY_2024_25 = '2024-25';

// ---------------------------------------------------------------------------
// Synthetic file entries — FileEntry shape from upload-handler.js:
//   { name, classification: { kind, confidence, hint }, metadata: { fy? }, blob? }
// Demo has no .blob (in-memory only).
// ---------------------------------------------------------------------------

/**
 * @param {string} name
 * @param {'itr_json'|'itr_xml'|'ais_json'|'tis_pdf'|'unknown'} kind
 * @param {string} fy
 * @param {number} [confidence]
 * @param {string} [hint]
 */
function fileEntry(name, kind, fy, confidence = 0.99, hint = 'Synthetic demo file') {
  return {
    name,
    classification: { kind, confidence, hint },
    metadata: { fy },
  };
}

const ITR_NAMES = Object.fromEntries(
  DEMO_FY_LABELS.map((fy) => [fy, `ITR_${fy}_Virendra_Kumar.json`]),
);
const AIS_FYS = [FY_2020_21, FY_2021_22, FY_2022_23, FY_2023_24, FY_2024_25];
const AIS_NAMES = Object.fromEntries(
  AIS_FYS.map((fy) => [fy, `AIS_${fy}_Virendra_Kumar.json`]),
);
const TIS_FYS = [FY_2022_23, FY_2023_24, FY_2024_25];
const TIS_NAMES = Object.fromEntries(
  TIS_FYS.map((fy) => [fy, `TIS_${fy}_Virendra_Kumar.pdf`]),
);

const demoFiles = [
  ...DEMO_FY_LABELS.map((fy) =>
    fileEntry(ITR_NAMES[fy], 'itr_json', fy, 0.99, 'Synthetic demo ITR JSON'),
  ),
  ...AIS_FYS.map((fy) =>
    fileEntry(AIS_NAMES[fy], 'ais_json', fy, 0.99, 'Synthetic demo AIS JSON'),
  ),
  ...TIS_FYS.map((fy) =>
    fileEntry(TIS_NAMES[fy], 'tis_pdf', fy, 0.98, 'Synthetic demo TIS PDF'),
  ),
];

/**
 * Build a YearRecord `sources` entry.  Real upload shape is
 * `{ fileIndex, kind, name }` — fileIndex resolved by matching against demoFiles.
 * `fy`/`confidence` are additive demo extras and safely ignored by consumers.
 *
 * @param {'itr_json'|'itr_xml'|'ais_json'|'tis_pdf'} kind
 * @param {string} fy
 * @param {string} name
 * @param {number} [confidence]
 */
function src(kind, fy, name, confidence = 0.99) {
  const fileIndex = demoFiles.findIndex((f) => f.name === name);
  return { fileIndex, kind, fy, name, confidence };
}

// ---------------------------------------------------------------------------
// Per-year data — chronological
// ---------------------------------------------------------------------------

const yearRecords = {

  // ── FY 2010-11 ─────────────────────────────────────────────────────────
  // Early-career synthetic year at Apple, joined Nov 2010 (5-month partial year).
  // Below exemption threshold (₹1.6L) — no tax. ITR-1, old regime (new didn't exist).
  [FY_2010_11]: {
    fy: FY_2010_11,
    itr: itr({
      grossIncome:             1_40_000,
      grossSalaryIncome:       1_50_000,
      salaryIncome:            1_38_000,   // post HRA exempt ₹12k
      housePropertyIncome:              0,
      interestIncome:             2_000,
      tdsTotal:                       0,
      deductions: {
        totalDeductions:           15_000,
        section80C:                15_000,  // partial-year EPF
        section80D:                     0,
        hraExemption:              12_000,
        standardDeduction:              0,  // std ded NA until FY 2018-19
        section80TTA:                   0,  // 80TTA NA until FY 2012-13
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        taxPayable:                     0,
        netTaxPayable:                  0,
        refundDue:                      0,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:                  0,
      },
      assessmentYear: 'AY 2011-12',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_ACME,
      city: CITY_BANGALORE,
    }),
    ais: null,   // AIS only from FY 2020-21 onwards
    tis: null,
    sources: [
      src('itr_json', FY_2010_11, ITR_NAMES[FY_2010_11]),
    ],
  },

  // ── FY 2011-12 ─────────────────────────────────────────────────────────
  // First full synthetic year in the timeline. Modest refund.
  [FY_2011_12]: {
    fy: FY_2011_12,
    itr: itr({
      grossIncome:             3_60_000,
      grossSalaryIncome:       4_00_000,
      salaryIncome:            3_55_000,   // post HRA ₹45k
      housePropertyIncome:              0,
      interestIncome:             5_000,
      tdsTotal:                  14_000,
      deductions: {
        totalDeductions:           68_000,
        section80C:                60_000,  // EPF + some LIC
        section80D:                 8_000,  // first mediclaim
        hraExemption:              45_000,
        standardDeduction:              0,
        section80TTA:                   0,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 2,92,000; slab 1.8-5L @ 10% → 11,200; cess 3% → 336; total 11,536
        taxPayable:                11_536,
        netTaxPayable:             -2_464,
        refundDue:                  2_464,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:                336,
      },
      assessmentYear: 'AY 2012-13',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_ACME,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2011_12, ITR_NAMES[FY_2011_12])],
  },

  // ── FY 2012-13 ─────────────────────────────────────────────────────────
  // 80TTA introduced this year.
  [FY_2012_13]: {
    fy: FY_2012_13,
    itr: itr({
      grossIncome:             3_96_000,
      grossSalaryIncome:       4_40_000,
      salaryIncome:            3_90_000,   // post HRA ₹50k
      housePropertyIncome:              0,
      interestIncome:             6_000,
      tdsTotal:                  13_500,
      deductions: {
        totalDeductions:           85_000,
        section80C:                70_000,
        section80D:                 9_000,
        hraExemption:              50_000,
        standardDeduction:              0,
        section80TTA:               6_000,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 3,11,000; slab 2-5L @ 10% → 11,100; cess 3% → 333; total 11,433
        taxPayable:                11_433,
        netTaxPayable:             -2_067,
        refundDue:                  2_067,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:                333,
      },
      assessmentYear: 'AY 2013-14',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_ACME,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2012_13, ITR_NAMES[FY_2012_13])],
  },

  // ── FY 2013-14 ─────────────────────────────────────────────────────────
  // 87A rebate (₹2,000 up to ₹5L) introduced. Synthetic promotion year.
  [FY_2013_14]: {
    fy: FY_2013_14,
    itr: itr({
      grossIncome:             4_78_000,
      grossSalaryIncome:       5_30_000,
      salaryIncome:            4_70_000,   // post HRA ₹60k
      housePropertyIncome:              0,
      interestIncome:             8_000,
      tdsTotal:                  18_000,
      deductions: {
        totalDeductions:         1_03_000,
        section80C:                85_000,
        section80D:                10_000,
        hraExemption:              60_000,
        standardDeduction:              0,
        section80TTA:               8_000,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 3,75,000; slab 2-5L @ 10% → 17,500; 87A -2,000; cess 3% +465 → 15,965
        taxPayable:                15_965,
        netTaxPayable:             -2_035,
        refundDue:                  2_035,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:                465,
      },
      assessmentYear: 'AY 2014-15',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_ACME,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2013_14, ITR_NAMES[FY_2013_14])],
  },

  // ── FY 2014-15 ─────────────────────────────────────────────────────────
  // 80C cap raised to ₹1.5L in this FY.
  [FY_2014_15]: {
    fy: FY_2014_15,
    itr: itr({
      grossIncome:             6_10_000,
      grossSalaryIncome:       6_80_000,
      salaryIncome:            6_00_000,   // post HRA ₹80k
      housePropertyIncome:              0,
      interestIncome:            10_000,
      tdsTotal:                  24_000,
      deductions: {
        totalDeductions:         1_41_000,
        section80C:              1_20_000,  // EPF + first ELSS
        section80D:                11_000,
        hraExemption:              80_000,
        standardDeduction:              0,
        section80TTA:              10_000,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 4,69,000; slab 2.5-5L @ 10% → 21,900; 87A -2,000; cess 3% +597 → 20,497
        taxPayable:                20_497,
        netTaxPayable:             -3_503,
        refundDue:                  3_503,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:                597,
      },
      assessmentYear: 'AY 2015-16',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_HELIOS,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2014_15, ITR_NAMES[FY_2014_15])],
  },

  // ── FY 2015-16 ─────────────────────────────────────────────────────────
  // First year maxing 80C. 87A still ₹2,000 (cap 5L), but total income > 5L so NA.
  [FY_2015_16]: {
    fy: FY_2015_16,
    itr: itr({
      grossIncome:             7_38_000,
      grossSalaryIncome:       8_20_000,
      salaryIncome:            7_24_000,   // post HRA ₹96k
      housePropertyIncome:              0,
      interestIncome:            14_000,
      tdsTotal:                  42_000,
      deductions: {
        totalDeductions:         1_72_000,
        section80C:              1_50_000,
        section80D:                12_000,
        hraExemption:              96_000,
        standardDeduction:              0,
        section80TTA:              10_000,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 5,66,000; tax 2.5L×10% + 66k×20% = 25k + 13.2k = 38,200; cess 3% +1,146 → 39,346
        taxPayable:                39_346,
        netTaxPayable:             -2_654,
        refundDue:                  2_654,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:              1_146,
      },
      assessmentYear: 'AY 2016-17',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_HELIOS,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2015_16, ITR_NAMES[FY_2015_16])],
  },

  // ── FY 2016-17 ─────────────────────────────────────────────────────────
  // Promotion year; 87A bumped to ₹5,000 (cap 5L) — NA here.
  [FY_2016_17]: {
    fy: FY_2016_17,
    itr: itr({
      grossIncome:             9_68_000,
      grossSalaryIncome:      10_80_000,
      salaryIncome:            9_50_000,   // post HRA ₹1.3L
      housePropertyIncome:              0,
      interestIncome:            18_000,
      tdsTotal:                  90_000,
      deductions: {
        totalDeductions:         1_74_000,
        section80C:              1_50_000,
        section80D:                14_000,
        hraExemption:            1_30_000,
        standardDeduction:              0,
        section80TTA:              10_000,
        npsDeduction:                   0,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 7,94,000; tax 25k + (2.94L × 20%) = 25k + 58.8k = 83,800; cess 3% +2,514 → 86,314
        taxPayable:                86_314,
        netTaxPayable:             -3_686,
        refundDue:                  3_686,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:              2_514,
      },
      assessmentYear: 'AY 2017-18',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_HELIOS,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2016_17, ITR_NAMES[FY_2016_17])],
  },

  // ── FY 2017-18 ─────────────────────────────────────────────────────────
  // Slab change: 2.5-5L now @ 5% (was 10%). NPS 80CCD(1B) opened ₹25k.
  [FY_2017_18]: {
    fy: FY_2017_18,
    itr: itr({
      grossIncome:            12_32_000,
      grossSalaryIncome:      13_70_000,
      salaryIncome:           12_10_000,   // post HRA ₹1.6L
      housePropertyIncome:              0,
      interestIncome:            22_000,
      tdsTotal:                1_32_000,
      deductions: {
        totalDeductions:         2_00_000,
        section80C:              1_50_000,
        section80D:                15_000,
        hraExemption:            1_60_000,
        standardDeduction:              0,
        section80TTA:              10_000,
        npsDeduction:              25_000,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 10,32,000; slab 12,500 + 1,00,000 + 9,600 = 1,22,100; cess 3% +3,663 → 1,25,763
        taxPayable:              1_25_763,
        netTaxPayable:             -6_237,
        refundDue:                  6_237,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:              3_663,
      },
      assessmentYear: 'AY 2018-19',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_HELIOS,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2017_18, ITR_NAMES[FY_2017_18])],
  },

  // ── FY 2018-19 ─────────────────────────────────────────────────────────
  // Standard deduction ₹40k introduced; cess now 4% (H&E cess).
  [FY_2018_19]: {
    fy: FY_2018_19,
    itr: itr({
      grossIncome:            16_25_000,
      grossSalaryIncome:      18_40_000,
      salaryIncome:           16_00_000,   // post std ded ₹40k + HRA ₹2L
      housePropertyIncome:              0,
      interestIncome:            25_000,
      tdsTotal:                2_50_000,
      deductions: {
        totalDeductions:         2_22_000,
        section80C:              1_50_000,
        section80D:                22_000,  // family floater starting
        hraExemption:            2_00_000,
        standardDeduction:         40_000,
        section80TTA:              10_000,
        npsDeduction:              40_000,
        homeLoanInterest:               0,
      },
      taxLiability: {
        // Taxable 14,03,000; slab 12,500 + 1,00,000 + 1,20,900 = 2,33,400; cess 4% +9,336 → 2,42,736
        taxPayable:              2_42_736,
        netTaxPayable:             -7_264,
        refundDue:                  7_264,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:              9_336,
      },
      assessmentYear: 'AY 2019-20',
      formLabel: 'ITR-1',
      employerName: EMPLOYER_NORTHWIND,
      city: CITY_BANGALORE,
    }),
    ais: null,
    tis: null,
    sources: [src('itr_json', FY_2018_19, ITR_NAMES[FY_2018_19])],
  },

  // ── FY 2019-20 ─────────────────────────────────────────────────────────
  // Bought home; home loan 24(b) starts (partial year → ₹1.8L interest).
  // Std ded bumped to ₹50k. Last year with any HRA claim.
  [FY_2019_20]: {
    fy: FY_2019_20,
    itr: itr({
      grossIncome:            21_60_000,
      grossSalaryIncome:      25_00_000,
      salaryIncome:           23_00_000,   // post std ded ₹50k + HRA ₹1.5L (partial)
      housePropertyIncome:    -1_80_000,
      interestIncome:            35_000,
      dividendIncome:             5_000,
      tdsTotal:                4_15_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:            1_50_000,
        standardDeduction:         50_000,
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        1_80_000,  // in housePropertyIncome, not totalDeductions
      },
      taxLiability: {
        // Taxable 19,25,000; slab 12,500 + 1,00,000 + 2,77,500 = 3,90,000; cess 4% +15,600 → 4,05,600
        taxPayable:              4_05_600,
        netTaxPayable:             -9_400,
        refundDue:                  9_400,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:             15_600,
      },
      assessmentYear: 'AY 2020-21',
      formLabel: 'ITR-2',  // HP loss + income approach 50L → ITR-2 safer
      employerName: EMPLOYER_NORTHWIND,
      city: CITY_BANGALORE,
    }),
    ais: null,  // AIS portal history begins FY 2020-21
    tis: null,
    sources: [src('itr_json', FY_2019_20, ITR_NAMES[FY_2019_20])],
  },

  // ── FY 2020-21 ─────────────────────────────────────────────────────────
  // First AIS year.  Home loan 24(b) now maxed at ₹2L.  No HRA (own house).
  // New regime exists (Budget 2020) but Virendra stays on Old (home loan wins).
  [FY_2020_21]: {
    fy: FY_2020_21,
    itr: itr({
      grossIncome:            31_58_000,
      grossSalaryIncome:      33_50_000,
      salaryIncome:           33_00_000,   // post std ded ₹50k, no HRA
      housePropertyIncome:    -2_00_000,
      interestIncome:            50_000,
      dividendIncome:             8_000,
      tdsTotal:                7_25_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:                   0,
        standardDeduction:         50_000,
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        2_00_000,
      },
      taxLiability: {
        // Taxable 29,23,000; slab 12,500 + 1,00,000 + 5,76,900 = 6,89,400; cess 4% +27,576 → 7,16,976
        taxPayable:              7_16_976,
        netTaxPayable:             -8_024,
        refundDue:                  8_024,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:             27_576,
      },
      assessmentYear: 'AY 2021-22',
      formLabel: 'ITR-2',
      employerName: EMPLOYER_NORTHWIND,
      city: CITY_BANGALORE,
    }),
    ais: ais({
      salaryTotal:            34_17_000,  // gross of pre-exempt allowances
      interestSavings:           30_000,
      interestFD:                20_500,
      dividendTotal:              8_200,
      tdsTotal:                7_25_000,
      lineCount: 9,
    }),
    tis: null,
    sources: [
      src('itr_json', FY_2020_21, ITR_NAMES[FY_2020_21]),
      src('ais_json', FY_2020_21, AIS_NAMES[FY_2020_21]),
    ],
  },

  // ── FY 2021-22 ─────────────────────────────────────────────────────────
  // Staff SDE bonus year.  First equity CG (STCG ₹45k taxable; LTCG ₹60k under ₹1L exempt).
  [FY_2021_22]: {
    fy: FY_2021_22,
    itr: itr({
      grossIncome:            45_40_000,
      grossSalaryIncome:      46_00_000,
      salaryIncome:           45_50_000,   // post std ded ₹50k
      housePropertyIncome:    -2_00_000,
      interestIncome:            70_000,
      dividendIncome:            15_000,
      tdsTotal:               11_30_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:                   0,
        standardDeduction:         50_000,
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        2_00_000,
      },
      capitalGains: cg({ stcg15pct: 45_000, ltcg10pct: 60_000 }),
      taxLiability: {
        // Regular taxable 42L; slab tax 10,72,500. STCG 45k × 15% = 6,750. LTCG exempt (<₹1L).
        // Subtotal 10,79,250; cess 4% +43,170 → 11,22,420
        taxPayable:             11_22_420,
        netTaxPayable:             -7_580,
        refundDue:                  7_580,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:                      0,
        educationCess:             43_170,
      },
      assessmentYear: 'AY 2022-23',
      formLabel: 'ITR-2',
      employerName: EMPLOYER_NORTHWIND,
      city: CITY_BANGALORE,
    }),
    ais: ais({
      salaryTotal:            46_92_000,
      interestSavings:           42_000,
      interestFD:                28_300,
      dividendTotal:             15_200,
      capitalGainsTotal:       1_05_000,
      capitalGainsMF:            30_000,
      capitalGainsEquity:        75_000,
      tdsTotal:               11_30_000,
      lineCount: 12,
    }),
    tis: null,
    sources: [
      src('itr_json', FY_2021_22, ITR_NAMES[FY_2021_22]),
      src('ais_json', FY_2021_22, AIS_NAMES[FY_2021_22]),
    ],
  },

  // ── FY 2022-23 ─────────────────────────────────────────────────────────
  // Stock-comp jump year. Surcharge 10% kicks in (>₹50L).
  // TIS PDF portal history begins.
  [FY_2022_23]: {
    fy: FY_2022_23,
    itr: itr({
      grossIncome:            66_75_000,
      grossSalaryIncome:      65_00_000,
      salaryIncome:           64_50_000,
      housePropertyIncome:    -2_00_000,
      interestIncome:            90_000,
      dividendIncome:            35_000,
      tdsTotal:               19_30_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:                   0,
        standardDeduction:         50_000,
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        2_00_000,
      },
      capitalGains: cg({ stcg15pct: 1_20_000, ltcg10pct: 1_80_000 }),
      taxLiability: {
        // Regular taxable 61,40,000; slab 16,54,500. STCG 1.2L×15% = 18,000. LTCG 80k (after ₹1L exempt)×10% = 8,000.
        // Subtotal 16,80,500. Surcharge 10% = 1,68,050. Cess 4% = 73,942 → 19,22,492.
        taxPayable:             19_22_492,
        netTaxPayable:             -7_508,
        refundDue:                  7_508,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:               1_68_050,
        educationCess:             73_942,
      },
      assessmentYear: 'AY 2023-24',
      formLabel: 'ITR-2',
      employerName: EMPLOYER_APPLE,
      city: CITY_BENGALURU,
    }),
    ais: ais({
      salaryTotal:            66_30_000,
      interestSavings:           55_000,
      interestFD:                35_400,
      dividendTotal:             35_200,
      capitalGainsTotal:       3_00_000,
      capitalGainsMF:            90_000,
      capitalGainsEquity:      2_10_000,
      tdsTotal:               19_30_000,
      lineCount: 18,
    }),
    tis: tis({
      salary:                 66_30_000,
      savingsInterest:           55_000,
      fdInterest:                35_400,
      dividend:                  35_200,
      capitalGains:            3_00_000,
    }),
    sources: [
      src('itr_json', FY_2022_23, ITR_NAMES[FY_2022_23]),
      src('ais_json', FY_2022_23, AIS_NAMES[FY_2022_23]),
      src('tis_pdf',  FY_2022_23, TIS_NAMES[FY_2022_23], 0.98),
    ],
  },

  // ── FY 2023-24 ─────────────────────────────────────────────────────────
  // RSU vesting kicks in.  Old regime still wins (home loan + 80C + NPS).
  [FY_2023_24]: {
    fy: FY_2023_24,
    itr: itr({
      grossIncome:            90_95_000,
      grossSalaryIncome:      86_00_000,
      salaryIncome:           85_50_000,
      housePropertyIncome:    -2_00_000,
      interestIncome:         1_00_000,
      dividendIncome:            55_000,
      tdsTotal:               27_05_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:                   0,
        standardDeduction:         50_000,
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        2_00_000,
      },
      capitalGains: cg({ stcg15pct: 2_40_000, ltcg10pct: 3_50_000 }),
      taxLiability: {
        // Regular taxable 82,70,000; slab 22,93,500. STCG 36,000. LTCG (3.5L-1L)×10% = 25,000.
        // Subtotal 23,54,500. Surcharge 10% = 2,35,450. Cess 4% = 1,03,598 → 26,93,548.
        taxPayable:             26_93_548,
        netTaxPayable:            -11_452,
        refundDue:                 11_452,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:               2_35_450,
        educationCess:           1_03_598,
      },
      assessmentYear: 'AY 2024-25',
      formLabel: 'ITR-2',
      employerName: EMPLOYER_APPLE,
      city: CITY_BENGALURU,
    }),
    ais: ais({
      salaryTotal:            87_72_000,
      interestSavings:           62_000,
      interestFD:                38_500,
      dividendTotal:             55_300,
      capitalGainsTotal:       5_90_000,
      capitalGainsMF:          1_80_000,
      capitalGainsEquity:      4_10_000,
      tdsTotal:               27_05_000,
      lineCount: 22,
    }),
    tis: tis({
      salary:                 87_72_000,
      savingsInterest:           62_000,
      fdInterest:                38_500,
      dividend:                  55_300,
      capitalGains:            5_90_000,
    }),
    sources: [
      src('itr_json', FY_2023_24, ITR_NAMES[FY_2023_24]),
      src('ais_json', FY_2023_24, AIS_NAMES[FY_2023_24]),
      src('tis_pdf',  FY_2023_24, TIS_NAMES[FY_2023_24], 0.98),
    ],
  },

  // ── FY 2024-25 ─────────────────────────────────────────────────────────
  // Principal engineer; crosses ₹1 Cr taxable → 15% surcharge.
  [FY_2024_25]: {
    fy: FY_2024_25,
    itr: itr({
      grossIncome:          1_23_20_000,
      grossSalaryIncome:    1_15_00_000,
      salaryIncome:         1_14_50_000,
      housePropertyIncome:    -2_00_000,
      interestIncome:         1_20_000,
      dividendIncome:            80_000,
      tdsTotal:               39_25_000,
      deductions: {
        totalDeductions:         2_35_000,
        section80C:              1_50_000,
        section80D:                25_000,
        hraExemption:                   0,
        standardDeduction:         50_000,  // old regime still 50k
        section80TTA:              10_000,
        npsDeduction:              50_000,
        homeLoanInterest:        2_00_000,
      },
      capitalGains: cg({ stcg15pct: 3_50_000, ltcg10pct: 5_20_000 }),
      taxLiability: {
        // Regular taxable 1,12,15,000; slab 31,77,000. STCG 3.5L×15% = 52,500.
        // LTCG (5.2L-1L)×10% = 42,000. Subtotal 32,71,500.
        // Surcharge 15% (>₹1Cr, <₹2Cr) = 4,90,725. Cess 4% = 1,50,489 → 39,12,714.
        taxPayable:             39_12_714,
        netTaxPayable:            -12_286,
        refundDue:                 12_286,
        advanceTax:                     0,
        selfAssessmentTax:              0,
        surcharge:               4_90_725,
        educationCess:           1_50_489,
      },
      assessmentYear: 'AY 2025-26',
      formLabel: 'ITR-2',
      employerName: EMPLOYER_APPLE,
      city: CITY_BENGALURU,
    }),
    ais: ais({
      salaryTotal:          1_17_30_000,
      interestSavings:           70_000,
      interestFD:                50_400,
      dividendTotal:             80_300,
      capitalGainsTotal:       8_70_000,
      capitalGainsMF:          2_50_000,
      capitalGainsEquity:      6_20_000,
      tdsTotal:               39_25_000,
      lineCount: 27,
    }),
    tis: tis({
      salary:               1_17_30_000,
      savingsInterest:           70_000,
      fdInterest:                50_400,
      dividend:                  80_300,
      capitalGains:            8_70_000,
    }),
    sources: [
      src('itr_json', FY_2024_25, ITR_NAMES[FY_2024_25]),
      src('ais_json', FY_2024_25, AIS_NAMES[FY_2024_25]),
      src('tis_pdf',  FY_2024_25, TIS_NAMES[FY_2024_25], 0.98),
    ],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a pre-populated app state object matching the shape from
 * createEmptyState() in model.js.
 *
 * @returns {{ years: Map<string, import('./model.js').YearRecord>, files: Array, reviewCards: [] }}
 */
export function buildDemoState() {
  const years = new Map();
  for (const fy of DEMO_FY_LABELS) {
    const record = yearRecords[fy];
    if (record) years.set(fy, record);
  }
  return {
    years,
    files: demoFiles.map((f) => ({
      name: f.name,
      classification: { ...f.classification },
      metadata: { ...f.metadata },
    })),
    reviewCards: [],
  };
}
