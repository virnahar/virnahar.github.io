/**
 * FY-level "insight deck" for TIS ↔ ITR alignment (PDF text vs structured ITR), and
 * AIS ↔ ITR comparison cards when no TIS is available. No external APIs.
 * @typedef {{ label: string, tis: number|null, itr: number|null, match: boolean, tisStr: string, itrStr: string }} InsightLine
 * @typedef {{ fy: string, score: number, lines: InsightLine[], summary: string }} InsightCard
 */

import { getRegimeDefaults } from './tax-engine.js';

/**
 * Parse the starting year of an FY string (e.g. "2024-25" → 2024).
 * @param {string} fy
 * @returns {number}
 */
function fyStart(fy) {
  const m = String(fy || '').match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * @param {number|null|undefined} n
 */
function fmtIn(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

/**
 * @param {number|null|undefined} n
 */
function fmtINR(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  try {
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

/**
 * Tolerance for AIS vs ITR amount comparison. AIS can differ from ITR due to
 * TDS timing, rounding, and category mapping — use a generous tolerance.
 * @param {string} label
 * @param {number} a
 * @param {number} b
 */
function aisTolerance(label, a, b) {
  if (/salary/i.test(label)) return Math.max(50000, Math.abs(b) * 0.10, Math.abs(a) * 0.10);
  if (/interest/i.test(label)) return Math.max(5000, Math.abs(b) * 0.12, Math.abs(a) * 0.12);
  if (/dividend/i.test(label)) return Math.max(1000, Math.abs(b) * 0.08, Math.abs(a) * 0.08);
  if (/capital/i.test(label)) return Math.max(5000, Math.abs(b) * 0.10, Math.abs(a) * 0.10);
  return Math.max(2000, Math.abs(b) * 0.08, Math.abs(a) * 0.08);
}

/**
 * Build AIS-vs-ITR insight cards for years that have both AIS and ITR but no TIS.
 * @param {string} fy
 * @param {import('./model.js').AisSnapshot} ais
 * @param {import('./model.js').ItrSnapshot} itr
 * @returns {Array<object>|null}
 */
function buildAisVsItrCard(fy, ais, itr) {
  /** @type {Array<{id:string,fy:string,category:string,icon:string,tisFormatted:string,itrFormatted:string,matchLevel:string,note:string}>} */
  const cards = [];

  /**
   * @param {string} id
   * @param {string} category
   * @param {string} icon
   * @param {number|null|undefined} aisV
   * @param {number|null|undefined} itrV
   * @param {string} note
   */
  const push = (id, category, icon, aisV, itrV, note) => {
    const a = aisV != null && Number.isFinite(aisV) ? aisV : null;
    const b = itrV != null && Number.isFinite(itrV) ? itrV : null;
    if ((a == null || a <= 0) && (b == null || b <= 0)) return;
    const aVal = a ?? 0;
    const bVal = b ?? 0;
    const tol = aisTolerance(category, aVal, bVal);
    const diff = Math.abs(aVal - bVal);
    let matchLevel = 'ok';
    // Use "watch" instead of "mismatch" for differences within 5x tolerance —
    // most AIS vs ITR gaps have legitimate explanations (timing, exemptions).
    if (diff > tol * 5) matchLevel = 'watch';
    else if (diff > tol) matchLevel = 'review';
    cards.push({
      id: `ais-itr-${fy}-${id}`,
      fy,
      category,
      icon,
      tisFormatted: fmtIn(a),
      itrFormatted: fmtIn(b),
      matchLevel,
      note,
    });
  };

  push('salary', 'Salary (AIS vs ITR)', 'account_balance_wallet',
    ais.salaryTotal, itr.salaryIncome,
    'AIS salary from Form 16 / SFT-004 vs ITR salary head. Differences under ₹50,000 are typically timing or rounding — check Form 16 Part B if larger.');

  const aisInterest = (ais.interestTotal ?? 0) || ((ais.interestSavings ?? 0) + (ais.interestFD ?? 0));
  push('interest', 'Interest income (AIS vs ITR)', 'savings',
    aisInterest || null, itr.interestIncome,
    'AIS savings + FD interest vs ITR other-sources. Gaps up to ₹10,000 are normal (Section 80TTA savings bank exemption). Larger gaps warrant a check — FD interest is fully taxable.');

  push('dividend', 'Dividend (AIS vs ITR)', 'monetization_on',
    ais.dividendTotal, itr.dividendIncome,
    'AIS dividend from dividend warrants vs ITR declaration. Since FY 2020-21 dividends are taxable at slab rates — ensure all are disclosed in Schedule OS.');

  const aisCg = ais.capitalGainsTotal ?? ((ais.capitalGainsMF ?? 0) + (ais.capitalGainsEquity ?? 0));
  push('capgains', 'Capital gains (AIS vs ITR)', 'trending_up',
    aisCg || null, itr.capitalGains?.totalCg,
    'AIS capital gains from broker / MF statements vs ITR Schedule CG. Differences can arise from FIFO/LIFO accounting or 112A grandfathering — but large gaps are a common notice trigger.');

  return cards.length ? cards : null;
}

/**
 * Compute HRA exemption — minimum of three values per Indian tax law (Section 10(13A)).
 * @param {{ actualHra: number, basicSalary: number, rentPaid: number, isMetro: boolean }} params
 * @returns {{ limit: number, breakdownLabel: string }}
 */
function hraExemptionLimit({ actualHra, basicSalary, rentPaid, isMetro }) {
  // Rule: exempt = min(actual HRA received, 50%/40% of basic, rent paid - 10% of basic)
  const salaryPct = isMetro ? basicSalary * 0.5 : basicSalary * 0.4;
  const rentExcess = Math.max(0, rentPaid - basicSalary * 0.1);
  const limit = Math.min(actualHra, salaryPct, rentExcess);
  const binding = limit === actualHra ? 'actual HRA received'
    : limit === salaryPct ? `${isMetro ? '50%' : '40%'} of basic (metro rule)`
    : 'rent paid minus 10% of basic';
  return { limit, breakdownLabel: binding };
}

/**
 * Build India-specific optimization and advisory insight cards for a single FY.
 * These are in addition to the AIS/TIS reconciliation cards and focus on
 * actionable tax planning observations.
 * @param {string} fy
 * @param {import('./model.js').ItrSnapshot} itr
 * @param {import('./model.js').AisSnapshot|null} ais
 * @returns {Array<object>}
 */
function buildItrInsightCards(fy, itr, ais) {
  /** @type {Array<object>} */
  const cards = [];
  const d = itr.deductions;
  const regime = itr.taxRegimeKey;
  const totalIncome = itr.totalIncome ?? null;
  const grossIncome = itr.grossIncome ?? null;

  // ── HRA efficiency analysis ────────────────────────────────────────────────
  // Section 10(13A): HRA exemption = min(actual HRA, 50%/40% basic, rent - 10% basic).
  // We have the exempted amount from ITR deductions; compare it to gross HRA from salary.
  // If the exemption is much lower than gross HRA, the taxpayer may be under-claiming
  // (e.g. not submitting enough rent receipts) or over-stating rent.
  const hraExempt = d?.hraExemption ?? null;
  if (hraExempt != null && hraExempt > 0 && (itr.salaryIncome ?? 0) > 0) {
    // Heuristic: if exempt amount > 0 but < ₹60,000 for an income that suggests a
    // metro salary, the cap may be the rent-minus-10%-of-basic leg.
    const hraEfficiencyNote = hraExempt < 60000
      ? `Next year, consider submitting higher rent receipts if actual rent paid is more — the exemption is limited to rent paid minus 10% of basic salary.`
      : `This looks correct — verify the exemption calculation matches Form 16 Part B.`;
    cards.push({
      id: `hra-efficiency-${fy}`,
      fy,
      category: 'HRA exemption',
      icon: 'home',
      matchLevel: 'ok',
      tisFormatted: fmtIn(hraExempt),
      itrFormatted: fmtIn(hraExempt),
      note: `HRA exemption: ${fmtINR(hraExempt)} claimed (Section 10(13A)). Exemption = minimum of: actual HRA received, 50% of basic (metro) / 40% (non-metro), or rent paid minus 10% of basic salary. ${hraEfficiencyNote}`,
    });
  }

  // ── NPS optimisation: 80CCD(1B) vs 80CCD(2) ──────────────────────────────
  // 80CCD(2): Employer NPS contribution — deductible up to 10% of basic salary,
  //           available in BOTH old and new regime (Budget 2020 made it regime-agnostic).
  // 80CCD(1B): Voluntary NPS — extra ₹50,000 above 80C limit, introduced in
  //            Finance Act 2015 (applicable from FY 2015-16).
  // Skip this insight for pre-FY 2015-16 years where the sub-section didn't exist.
  if (regime === 'old' && d && fyStart(fy) >= 2015) {
    const nps80CCD1B = d.npsDeduction ?? 0;
    const alreadyMaxing80C = (d.section80C ?? 0) >= 140000;
    if (nps80CCD1B === 0) {
      cards.push({
        id: `nps-80ccd1b-${fy}`,
        fy,
        category: 'NPS optimization (80CCD(1B))',
        icon: 'savings',
        matchLevel: 'review',
        tisFormatted: '—',
        itrFormatted: '₹0',
        note: `No Section 80CCD(1B) NPS contribution found. This gives an extra ₹50,000 deduction above the ₹1.5L Section 80C ceiling — a separate bucket. ${alreadyMaxing80C ? 'You have maxed 80C, so adding NPS can save an additional ₹15,600+ (at 30% slab) next year.' : 'Consider opening an NPS Tier I account — contributions here are deductible up to ₹50,000 per year.'}`,
      });
    } else {
      const npsMaxed = nps80CCD1B >= 48000; // ₹50k minus small tolerance
      cards.push({
        id: `nps-80ccd1b-ok-${fy}`,
        fy,
        category: 'NPS 80CCD(1B)',
        icon: 'savings',
        matchLevel: 'ok',
        tisFormatted: fmtIn(nps80CCD1B),
        itrFormatted: fmtIn(nps80CCD1B),
        note: `NPS 80CCD(1B) deduction of ${fmtINR(nps80CCD1B)} claimed. ${npsMaxed ? 'Fully utilised — good use of this exclusive deduction bucket.' : `Next year, consider topping up to ₹50,000 to maximise this deduction (currently ${fmtINR(50000 - nps80CCD1B)} remaining).`}`,
      });
    }
  }

  // ── Section 80D health insurance ──────────────────────────────────────────
  // Old regime only. Limits (FY 2024-25 onwards; same since FY 2018-19):
  //   - Self, spouse, dependent children: ₹25,000 (₹50,000 if self/spouse is senior citizen)
  //   - Parents: ₹25,000 (₹50,000 if parents are senior citizens)
  //   - Preventive health check-up: ₹5,000 sub-limit within the above caps
  // We can't know age, so we give the relevant context either way.
  if (regime === 'old' && d) {
    const section80D = d.section80D ?? 0;
    if (section80D > 0) {
      const cappedAtNonSenior = section80D <= 25000;
      cards.push({
        id: `80d-efficiency-${fy}`,
        fy,
        category: 'Section 80D (health insurance)',
        icon: 'health_and_safety',
        matchLevel: 'ok',
        tisFormatted: fmtIn(section80D),
        itrFormatted: fmtIn(section80D),
        note: `Section 80D claimed: ${fmtINR(section80D)}. Limit is ₹25,000 for self/family (₹50,000 if self or spouse is a senior citizen). ${cappedAtNonSenior ? 'Parents\' premiums can add another ₹25,000–₹50,000 (₹50,000 if parents are senior citizens). Next year, check if parent premiums are being claimed separately.' : 'This looks like it includes family + parents coverage — solid utilisation.'}`,
      });
    } else if ((grossIncome ?? 0) > 500000) {
      cards.push({
        id: `80d-unclaimed-insight-${fy}`,
        fy,
        category: 'Section 80D opportunity',
        icon: 'health_and_safety',
        matchLevel: 'review',
        tisFormatted: '—',
        itrFormatted: '₹0',
        note: `No Section 80D deduction found. If you pay health insurance premiums, up to ₹25,000 is deductible (₹50,000 for senior citizens). Parent premiums earn a separate ₹25,000–₹50,000 deduction. This is a straightforward deduction often missed. Next year, ensure premiums are paid via cheque/digital (not cash) to be eligible.`,
      });
    }
  }

  // ── Home loan Section 24(b) efficiency ────────────────────────────────────
  // Self-occupied property: interest deduction capped at ₹2,00,000/year.
  // Let-out property: full interest deductible but overall loss set-off from other heads
  // is capped at ₹2L; excess carried forward for 8 years.
  const hpIncome = itr.housePropertyIncome ?? null;
  const homeLoanInterest = d?.homeLoanInterest ?? null;
  if (hpIncome != null && hpIncome < 0) {
    const claimedInterest = Math.abs(hpIncome);
    const atCap = claimedInterest >= 190000; // ₹2L cap with small tolerance
    cards.push({
      id: `home-loan-24b-insight-${fy}`,
      fy,
      category: 'Home loan deduction (Section 24b)',
      icon: 'home_work',
      matchLevel: 'ok',
      tisFormatted: fmtIn(claimedInterest),
      itrFormatted: fmtIn(claimedInterest),
      note: `Home loan interest deduction of ${fmtINR(claimedInterest)} under Section 24(b). ${atCap ? 'Maxed at the ₹2,00,000 cap for self-occupied property — any interest paid above ₹2L is not deductible for self-occupied property (unlike let-out where full interest is allowed).' : `Current deduction ${fmtINR(claimedInterest)} is within the ₹2,00,000 cap. If your actual interest exceeds this, verify the property is correctly classified in ITR.`}`,
    });
  } else if (homeLoanInterest != null && homeLoanInterest > 0) {
    cards.push({
      id: `home-loan-deduction-insight-${fy}`,
      fy,
      category: 'Home loan deduction (Section 24b)',
      icon: 'home_work',
      matchLevel: homeLoanInterest >= 190000 ? 'ok' : 'review',
      tisFormatted: fmtIn(homeLoanInterest),
      itrFormatted: fmtIn(homeLoanInterest),
      note: `Home loan interest of ${fmtINR(homeLoanInterest)} noted. Ensure it is routed through the house property schedule (Section 24b) in ITR and not just as a deduction entry. The deduction shows up as a loss from house property, reducing total taxable income.`,
    });
  }

  // ── 80C utilisation ────────────────────────────────────────────────────────
  // Only old regime. Cap: ₹1,00,000 until FY 2013-14, ₹1,50,000 from FY 2014-15.
  // Common instruments: EPF (employee share only), PPF, ELSS, life insurance,
  // NSC, principal repayment of home loan, tuition fees.
  if (regime === 'old' && d) {
    const section80C = d.section80C ?? 0;
    const CAP_80C = fyStart(fy) >= 2014 ? 150000 : 100000;
    const MAXED_THRESHOLD = Math.round(CAP_80C * 0.93); // ~93% of cap
    const LOW_THRESHOLD = Math.round(CAP_80C * 0.67); // ~67% of cap
    if (section80C >= MAXED_THRESHOLD) {
      cards.push({
        id: `80c-maxed-insight-${fy}`,
        fy,
        category: 'Section 80C utilisation',
        icon: 'verified',
        matchLevel: 'ok',
        tisFormatted: fmtIn(section80C),
        itrFormatted: fmtIn(section80C),
        note: `80C fully utilised at ${fmtINR(section80C)} (cap: ${fmtINR(CAP_80C)}). This looks good.${fyStart(fy) >= 2015 ? ' Next year, remember that the Section 80CCD(1B) NPS bucket gives an additional ₹50,000 deduction above this cap — don\'t leave it on the table.' : ''}`,
      });
    } else if (section80C > 0 && section80C < LOW_THRESHOLD) {
      const gap = CAP_80C - section80C;
      cards.push({
        id: `80c-partial-insight-${fy}`,
        fy,
        category: 'Section 80C gap',
        icon: 'radio_button_partial',
        matchLevel: 'review',
        tisFormatted: fmtIn(section80C),
        itrFormatted: fmtIn(CAP_80C),
        note: `80C claimed: ${fmtINR(section80C)} — ${fmtINR(gap)} below the ${fmtINR(CAP_80C)} cap. Next year, consider topping up with PPF (safe, tax-free returns), ELSS (market-linked, shortest 3-yr lock-in), or increasing EPF voluntary contribution (VPF). Each rupee claimed saves at your marginal rate.`,
      });
    }
  }

  // ── New vs Old regime comparison ──────────────────────────────────────────
  // If we have enough data to estimate, compute approximate tax under both regimes
  // and note which was better and by how much.
  // This is a simplified heuristic — not a substitute for a proper tax computation.
  // Only run this for FY 2020-21 onwards — the new regime (115BAC) didn't exist earlier.
  if (grossIncome != null && grossIncome > 0 && regime && fyStart(fy) >= 2020) {
    const totalDed = d?.totalDeductions ?? 0;
    const oldDefaults = getRegimeDefaults(fy, 'old');
    const newDefaults = getRegimeDefaults(fy, 'new');
    const netOld = Math.max(0, grossIncome - Math.max(totalDed, oldDefaults.stdDeduction));
    const netNew = Math.max(0, grossIncome - newDefaults.stdDeduction);

    const taxOld = slabTax(netOld, oldDefaults.slabs);
    const taxNew = slabTax(netNew, newDefaults.slabs);

    const betterRegime = taxOld <= taxNew ? 'old' : 'new';
    const savings = Math.abs(taxOld - taxNew);

    // Only emit if there's a meaningful difference (>₹5k) and the user chose the right regime
    if (savings > 5000) {
      const choseRight = betterRegime === regime;
      cards.push({
        id: `regime-compare-${fy}`,
        fy,
        category: 'New vs Old regime comparison',
        icon: 'balance',
        matchLevel: choseRight ? 'ok' : 'review',
        tisFormatted: `₹${fmtIn(taxOld)} (old)`,
        itrFormatted: `₹${fmtIn(taxNew)} (new)`,
        note: choseRight
          ? `You chose the ${regime} regime — estimated to be the better option by ~${fmtINR(savings)} in tax savings. This is a heuristic estimate; use a tax calculator for a precise comparison.`
          : `You chose the ${regime} regime, but the ${betterRegime} regime may save approximately ${fmtINR(savings)} in tax based on your declared income and deductions. Consider running a full comparison before filing next year. Note: salaried employees can switch regime each year.`,
      });
    }
  }

  return cards;
}

/**
 * Generic slab tax calculator — walks an ordered slab table of the shape
 * `[{ upto, rate }, …]`. Excludes surcharge and cess; used for the
 * heuristic regime-comparison insight only.
 * @param {number} income
 * @param {{ upto: number, rate: number }[]} slabs
 * @returns {number}
 */
function slabTax(income, slabs) {
  let remaining = Math.max(0, income);
  let prev = 0;
  let tax = 0;
  for (const { upto, rate } of slabs) {
    if (remaining <= 0) break;
    const cap = upto - prev;
    const taxable = Math.min(remaining, cap);
    tax += (taxable * rate) / 100;
    remaining -= taxable;
    prev = upto;
  }
  return tax;
}

/**
 * @param {{ years: Map<string, import('./model.js').YearRecord> }} state
 * @returns {Array<object>}
 */
export function buildInsightDeck(state) {
  /** @type {Array<object>} */
  const deck = [];
  const years = state.years;
  if (!years?.size) return deck;

  for (const [fy, row] of years) {
    const t = row.tis;
    const i = row.itr;
    const a = row.ais;

    // ── TIS + ITR path (original behaviour) ─────────────────────────────────
    if (t?.hasData && i?.hasData) {
      /** @type {InsightLine[]} */
      const lines = [];
      let ok = 0;
      let tot = 0;

      /**
       * @param {string} label
       * @param {number|null|undefined} tisV
       * @param {number|null|undefined} itrV
       */
      const pushLine = (label, tisV, itrV) => {
        const ta = tisV != null && Number.isFinite(tisV) ? tisV : null;
        const ib = itrV != null && Number.isFinite(itrV) ? itrV : null;
        if ((ta == null || ta <= 0) && (ib == null || ib <= 0)) return;
        tot += 1;
        const aVal = ta ?? 0;
        const bVal = ib ?? 0;
        const tol = label.includes('Salary')
          ? Math.max(35000, Math.abs(bVal) * 0.09, Math.abs(aVal) * 0.09)
          : /interest|Interest/i.test(label)
            ? Math.max(4000, Math.abs(bVal) * 0.08, Math.abs(aVal) * 0.08)
            : Math.max(800, Math.abs(bVal) * 0.04, Math.abs(aVal) * 0.04);
        const match = Math.abs(aVal - bVal) <= tol;
        if (match) ok += 1;
        lines.push({
          label,
          tis: ta,
          itr: ib,
          match,
          tisStr: fmtIn(ta),
          itrStr: fmtIn(ib),
        });
      };

      pushLine('Salary (TIS vs ITR salary head)', t.salary, i.salaryIncome);
      pushLine('Savings interest (TIS vs ITR other sources)', t.savingsInterest, i.interestIncome);
      pushLine('Dividend', t.dividend, i.dividendIncome ?? null);

      if (lines.length) {
        const score = tot > 0 ? Math.round((ok / tot) * 1000) / 10 : 0;
        let summaryNote = `${ok}/${tot} lines within PDF-vs-JSON tolerance (wider for salary; still verify in portal).`;
        if (score >= 85) summaryNote = 'Strong TIS-ITR alignment — still verify in the portal before filing.';
        else if (score >= 55) summaryNote = 'Mixed alignment — typical when PDF spacing or labels differ from ITR JSON.';
        else summaryNote = 'Large gaps — re-check password, PDF export, or compare line-by-line in the portal.';

        // Emit one flat card per line (compatible with the AIS-vs-ITR card format)
        for (const ln of lines) {
          const diff = Math.abs((ln.tis ?? 0) - (ln.itr ?? 0));
          const tol = aisTolerance(ln.label, ln.tis ?? 0, ln.itr ?? 0);
          let matchLevel = 'ok';
          // Use "review" instead of "mismatch" — softer, more actionable language
          if (diff > tol * 5) matchLevel = 'review';
          else if (!ln.match) matchLevel = 'watch';
          deck.push({
            id: `tis-itr-${fy}-${ln.label.replace(/\s+/g, '-')}`,
            fy,
            category: ln.label,
            icon: ln.label.includes('Salary') ? 'account_balance_wallet' : ln.label.includes('interest') ? 'savings' : 'monetization_on',
            tisFormatted: ln.tisStr,
            itrFormatted: ln.itrStr,
            matchLevel,
            note: summaryNote,
            // Keep raw line data for any future deep use
            _line: ln,
            score,
          });
        }
      }

      // After TIS reconciliation lines, also emit ITR-based optimisation insights
      const itrInsights = buildItrInsightCards(fy, i, a ?? null);
      for (const card of itrInsights) deck.push(card);

      continue;
    }

    // ── AIS + ITR path (no TIS) — generate comparison cards ─────────────────
    if (a?.hasData && i?.hasData) {
      const cards = buildAisVsItrCard(fy, a, i);
      if (cards) {
        for (const card of cards) deck.push(card);
      }

      // Also emit ITR-based optimisation insights
      const itrInsights = buildItrInsightCards(fy, i, a);
      for (const card of itrInsights) deck.push(card);
    }

    // ── ITR only path (no AIS, no TIS) ───────────────────────────────────────
    if (i?.hasData && !a?.hasData && !t?.hasData) {
      const itrInsights = buildItrInsightCards(fy, i, null);
      for (const card of itrInsights) deck.push(card);
    }
  }

  deck.sort((a, b) => String(a.fy).localeCompare(String(b.fy)));
  return deck;
}
