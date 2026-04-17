/**
 * @typedef {Object} DeductionSnapshot
 * @property {number|null} totalDeductions  Total deductions (Gross - Total Income)
 * @property {number|null} section80C       LIC, PPF, ELSS, tuition fees etc.
 * @property {number|null} section80D       Health insurance premiums
 * @property {number|null} hraExemption     HRA exempt amount
 * @property {number|null} standardDeduction Standard deduction ₹50k / ₹75k
 * @property {number|null} section80TTA     Savings bank interest deduction
 * @property {number|null} npsDeduction     NPS 80CCD(1B) extra
 * @property {number|null} homeLoanInterest Interest on housing loan (24b)
 */

/**
 * @typedef {Object} TaxLiabilitySnapshot
 * @property {number|null} taxPayable       Gross tax before TDS / advance tax
 * @property {number|null} netTaxPayable    After TDS deduction — could be negative (refund)
 * @property {number|null} refundDue        Refund amount if tax paid > liability
 * @property {number|null} advanceTax       Advance tax paid
 * @property {number|null} selfAssessmentTax Self-assessment tax paid
 * @property {number|null} surcharge
 * @property {number|null} educationCess
 */

/**
 * @typedef {Object} CapitalGainsSnapshot
 * @property {number|null} stcg15pct        STCG taxed at 15% (equity/MF sold within 1yr)
 * @property {number|null} stcgOther        STCG taxed at slab rate
 * @property {number|null} ltcg10pct        LTCG taxed at 10% (equity/MF > 1yr, > ₹1L gains)
 * @property {number|null} ltcg20pct        LTCG taxed at 20% with indexation (property etc)
 * @property {number|null} totalCg          Sum of all capital gains
 */

/**
 * @typedef {Object} ItrSnapshot
 * @property {boolean} hasData
 * @property {number|null} grossIncome
 * @property {number|null} totalIncome      Net taxable income (after deductions)
 * @property {number|null} salaryIncome     Post std-deduction & HRA-exempt (as in ITR salary head)
 * @property {number|null} [grossSalaryIncome] Form-16 Gross Salary (pre std-deduction, pre HRA/LTA exemption). Used by tax-engine regime comparison.
 * @property {boolean} [_grossSalaryIsEstimated] True when grossSalaryIncome fell back to salaryIncome.
 * @property {number|null} housePropertyIncome
 * @property {number|null} interestIncome
 * @property {number|null} dividendIncome
 * @property {number|null} businessIncome
 * @property {number|null} tdsTotal
 * @property {DeductionSnapshot|null} deductions
 * @property {TaxLiabilitySnapshot|null} taxLiability
 * @property {CapitalGainsSnapshot|null} capitalGains
 * @property {'old'|'new'|null|undefined} taxRegimeKey
 * @property {string|null|undefined} taxRegimeLabel
 * @property {string|null|undefined} formLabel
 * @property {string|null|undefined} assessmentYear
 * @property {string|undefined} firstName
 * @property {string|undefined} surName
 * @property {string|undefined} employerName  Primary employer display name (title-cased, suffixes stripped)
 * @property {string|undefined} city          Filing city / place from Verification.Place
 */

/**
 * Full AIS category breakdown (matches portal AIS information codes).
 * @typedef {Object} AisSnapshot
 * @property {boolean} hasData
 * @property {number|null} salaryTotal          SFT-004 / salary category
 * @property {number|null} interestTotal        Savings + FD interest combined
 * @property {number|null} interestSavings      Savings bank interest specifically
 * @property {number|null} interestFD           Fixed deposit / recurring deposit interest
 * @property {number|null} dividendTotal        Dividend income
 * @property {number|null} capitalGainsTotal    Capital gains (MF + equity + property)
 * @property {number|null} capitalGainsMF       Mutual fund capital gains
 * @property {number|null} capitalGainsEquity   Listed equity capital gains
 * @property {number|null} rentTotal            Rent received / house property
 * @property {number|null} businessTotal        Business / professional income
 * @property {number|null} tdsTotal             TDS credits reported
 * @property {number|null} tcsTotal             TCS credits
 * @property {number|null} advanceTaxTotal      Advance tax paid
 * @property {number|null} foreignRemittance    Foreign remittance (SFT-018)
 * @property {number} lineCount
 * @property {Array<{category: string, amount: number, description: string}>} topTransactions
 */

/**
 * Parsed from portal TIS PDF text.
 * @typedef {Object} TisSnapshot
 * @property {boolean} hasData
 * @property {number|null} salary
 * @property {number|null} savingsInterest
 * @property {number|null} fdInterest
 * @property {number|null} dividend
 * @property {number|null} capitalGains
 * @property {number|null} rentReceived
 */

/**
 * @typedef {Object} YearRecord
 * @property {string} fy
 * @property {ItrSnapshot|null} itr
 * @property {AisSnapshot|null} ais
 * @property {TisSnapshot|null} [tis]
 * @property {Array<{ fileIndex: number, kind: string, name: string }>} sources
 */

/**
 * @typedef {import('./join-review.js').ReviewCard} ReviewCard
 */

/**
 * @returns {{
 *   years: Map<string, YearRecord>,
 *   files: Array<unknown>,
 *   reviewCards: ReviewCard[],
 * }}
 */
export function createEmptyState() {
  return {
    years: new Map(),
    files: [],
    reviewCards: [],
  };
}
