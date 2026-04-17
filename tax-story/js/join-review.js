/**
 * AIS ↔ ITR join heuristics → review cards (informational, not tax advice).
 * @typedef {{ id: string, severity: 'review'|'watch'|'info'|'ok', title: string, body: string, fy?: string, tags: string[], amount?: number }} ReviewCard
 */

import { getRegimeDefaults } from './tax-engine.js';

/**
 * @param {{ years: Map<string, import('./model.js').YearRecord>, files: unknown[], reviewCards?: unknown[] }} state
 * @returns {ReviewCard[]}
 */
export function buildReviewCards(state) {
  /** @type {ReviewCard[]} */
  const cards = [];

  const years = state.years;
  if (!years || years.size === 0) return cards;

  /** @type {string[]} */
  const fyWithItr = [];
  /** @type {string[]} */
  const fyWithAis = [];
  for (const fy of years.keys()) {
    const row = years.get(fy);
    const src = row?.sources || [];
    if (src.some((s) => s.kind === 'itr_json' || s.kind === 'itr_xml')) fyWithItr.push(fy);
    if (src.some((s) => s.kind === 'ais_json')) fyWithAis.push(fy);
  }
  const fyOverlap = fyWithItr.filter((f) => fyWithAis.includes(f));

  if (fyWithItr.length && fyWithAis.length && fyOverlap.length === 0) {
    const sortFy = (a, b) => String(a).localeCompare(String(b));
    cards.push({
      id: 'cross-fy-itr-ais',
      severity: 'review',
      title: 'ITR and AIS are on different financial years',
      body: `ITR found for ${[...fyWithItr].sort(sortFy).join(', ')} — AIS for ${[...fyWithAis].sort(sortFy).join(', ')}. No single FY has both, so cross-checks and reconciliation stay locked. Export AIS from the portal for the same FY as your ITR (or vice versa).`,
      tags: ['FY', 'ITR', 'AIS'],
    });
  }

  // ─── Regime change detection across years ─────────────────────────────────
  // If regime shifts between consecutive years, flag it as noteworthy so users
  // know to review deductions (old regime) vs simplified slabs (new regime).
  const regimeByFy = new Map();
  for (const [fy, row] of years) {
    if (row.itr?.hasData && row.itr.taxRegimeKey) {
      regimeByFy.set(fy, row.itr.taxRegimeKey);
    }
  }
  if (regimeByFy.size >= 2) {
    const fysSorted = [...regimeByFy.keys()].sort();
    for (let idx = 1; idx < fysSorted.length; idx++) {
      const prevFy = fysSorted[idx - 1];
      const curFy = fysSorted[idx];
      const prevRegime = regimeByFy.get(prevFy);
      const curRegime = regimeByFy.get(curFy);
      if (prevRegime && curRegime && prevRegime !== curRegime) {
        const toLabel = curRegime === 'new' ? 'New regime' : 'Old regime';
        const fromLabel = prevRegime === 'new' ? 'New regime' : 'Old regime';
        cards.push({
          id: `regime-switch-${prevFy}-${curFy}`,
          severity: 'info',
          title: `Regime switch: ${fromLabel} (${prevFy}) → ${toLabel} (${curFy})`,
          body: `You switched from ${fromLabel} to ${toLabel} between ${prevFy} and ${curFy}. This is allowed once per year for salaried employees (Budget 2023). ${curRegime === 'new' ? 'In the new regime most deductions (80C, HRA, 80D) are not available but slabs are lower.' : 'In the old regime, ensure all deductions (80C, HRA, 80D, 24b) are claimed to maximise savings.'}`,
          tags: ['Regime', 'Tax Planning'],
        });
      }
    }
  }

  for (const [fy, row] of years) {
    const itr = row.itr;
    const ais = row.ais;
    const tis = row.tis;
    const sources = row.sources || [];
    const hasItrFile = sources.some((s) => s.kind === 'itr_json' || s.kind === 'itr_xml');
    const hasAisFile = sources.some((s) => s.kind === 'ais_json');
    const hasTisFile = sources.some((s) => s.kind === 'tis_pdf');
    const hasItrSnap = !!(itr && itr.hasData);
    const hasAisSnap = !!(ais && ais.hasData);
    const hasTisSnap = !!(tis && tis.hasData);

    // ─── File presence signals ──────────────────────────────────────────────
    if (hasItrFile && !hasAisFile && !hasTisFile) {
      cards.push({
        id: `join-ais-missing-${fy}`,
        severity: 'info',
        title: `AIS missing for ${fy}`,
        body: `ITR data found for ${fy} but no AIS. Download AIS JSON from the portal (Login → Services → AIS) to unlock interest/dividend/capital gains reconciliation and notice risk scoring.`,
        fy,
        tags: ['ITR', 'AIS'],
      });
    }

    if (!hasItrFile && hasAisFile) {
      cards.push({
        id: `join-itr-missing-${fy}`,
        severity: 'watch',
        title: `ITR missing for ${fy}`,
        body: `AIS is present for ${fy} but no ITR JSON/XML. Upload the ITR JSON from the portal (Login → e-File → View Filed Returns → Download JSON) to enable income arc, tax calculations, and full reconciliation.`,
        fy,
        tags: ['AIS', 'ITR'],
      });
    }

    if (!hasItrSnap && !hasAisSnap) continue;

    // ─── ITR + AIS linked checks ────────────────────────────────────────────
    if (hasItrFile && hasAisFile && hasItrSnap && hasAisSnap) {
      cards.push({
        id: `join-both-${fy}`,
        severity: 'ok',
        title: `ITR + AIS linked for ${fy}`,
        body: `Both streams loaded for ${fy}. The checks below compare what the portal knows about you (AIS) vs what you declared (ITR). Use as a pre-filing sanity pass — not a tax verdict.`,
        fy,
        tags: ['Joined'],
      });

      // ── Interest income ──────────────────────────────────────────────────
      // Normal differences: AIS may include PPF interest (tax-exempt), timing
      // differences in bank reporting, or savings bank interest within 80TTA limit.
      const aisInterest = ais?.interestTotal ?? null;
      const itrInterest = itr?.interestIncome ?? null;
      if (aisInterest != null && itrInterest != null && aisInterest > itrInterest * 1.2 && aisInterest - itrInterest > 2000) {
        const gap = aisInterest - itrInterest;
        // If the gap is within ₹10,000, it could entirely be the 80TTA exempt amount — soften the message.
        const likelySb80TTA = gap <= 10000;
        cards.push({
          id: `gap-interest-${fy}`,
          severity: gap > 50000 ? 'review' : 'watch',
          title: 'Interest income: AIS higher than ITR',
          body: likelySb80TTA
            ? `AIS aggregated interest: ${fmtINR(aisInterest)} — ITR declares: ${fmtINR(itrInterest)}. The gap of ${fmtINR(gap)} is within the ₹10,000 savings bank interest exempt under Section 80TTA — this is likely fine. Confirm the deduction is claimed in your ITR.`
            : `AIS aggregated interest: ${fmtINR(aisInterest)} — ITR declares: ${fmtINR(itrInterest)}. Gap of ${fmtINR(gap)} may include exempt savings bank interest, PPF interest (tax-free), or timing differences in bank reporting. Small gaps are normal — reconcile if the gap is large before filing to avoid a mismatch notice under Section 143(1).`,
          fy,
          tags: ['Interest', 'AIS', 'ITR'],
          amount: gap,
        });
      } else if (aisInterest != null && itrInterest != null && aisInterest > 5000) {
        cards.push({
          id: `interest-aligned-${fy}`,
          severity: 'ok',
          title: 'Interest income looks aligned',
          body: `AIS interest (${fmtINR(aisInterest)}) and ITR other-sources interest (${fmtINR(itrInterest)}) are in reasonable range. Small differences are normal — AIS can include PPF interest (tax-exempt), minor timing lags, or savings bank interest within the ₹10,000 exemption (Section 80TTA).`,
          fy,
          tags: ['Interest'],
        });
      }

      // ── Savings bank interest specific ────────────────────────────────────
      // 80TTA: up to ₹10,000 deductible for non-seniors; 80TTB: up to ₹50,000 for seniors.
      if ((ais?.interestSavings ?? 0) > 10000 && (itr?.deductions?.section80TTA ?? 0) === 0) {
        cards.push({
          id: `80tta-missed-${fy}`,
          severity: 'watch',
          title: 'Possible missed 80TTA deduction',
          body: `AIS shows savings bank interest of ${fmtINR(ais?.interestSavings ?? 0)} but no Section 80TTA deduction was detected in ITR. Savings bank interest up to ₹10,000 is deductible (₹50,000 for senior citizens under 80TTB). Verify this is claimed — it directly reduces taxable income.`,
          fy,
          tags: ['80TTA', 'Deduction', 'Interest'],
        });
      }

      // ── FD Interest ────────────────────────────────────────────────────────
      // FD interest is always fully taxable — banks report via TDS, AIS is authoritative here.
      if ((ais?.interestFD ?? 0) > 5000 && (itr?.interestIncome ?? 0) < (ais?.interestFD ?? 0) * 0.5) {
        cards.push({
          id: `fd-interest-${fy}`,
          severity: 'review',
          title: 'FD/deposit interest in AIS may be under-declared',
          body: `AIS shows fixed deposit interest of ${fmtINR(ais?.interestFD ?? 0)} but the declared interest income appears lower. FD interest is fully taxable (unlike savings bank interest under 80TTA). Banks report this to the IT department via TDS, so a large gap raises notice risk.`,
          fy,
          tags: ['FD', 'Interest', 'AIS'],
          amount: ais?.interestFD ?? undefined,
        });
      }

      // ── Dividend ─────────────────────────────────────────────────────────
      // Since FY 2020-21, dividends are taxable at slab rates. AIS is typically
      // accurate here since companies report dividends via SFT.
      const aisDividend = ais?.dividendTotal ?? null;
      const itrDividend = itr?.dividendIncome ?? null;
      if (aisDividend != null && aisDividend > 10000) {
        if (itrDividend == null || itrDividend < aisDividend * 0.7) {
          const gap = aisDividend - (itrDividend ?? 0);
          cards.push({
            id: `ais-dividends-${fy}`,
            severity: 'review',
            title: 'Dividend income: potential under-declaration',
            body: `AIS shows dividend income of ${fmtINR(aisDividend)}. ITR declared: ${fmtINR(itrDividend ?? 0)}. Since FY 2020-21, dividends are taxable at your slab rate and must appear in Schedule OS. A gap of ${fmtINR(gap)} may trigger a deficiency notice — verify using your broker/company dividend statements.`,
            fy,
            tags: ['Dividend', 'AIS'],
            amount: gap,
          });
        } else {
          cards.push({
            id: `dividend-aligned-${fy}`,
            severity: 'ok',
            title: 'Dividend income declared correctly',
            body: `AIS dividend (${fmtINR(aisDividend)}) and ITR declaration (${fmtINR(itrDividend ?? 0)}) are aligned. Small differences are normal when companies declare final dividends across reporting periods.`,
            fy,
            tags: ['Dividend'],
          });
        }
      }

      // ── Capital gains ─────────────────────────────────────────────────────
      // Capital gains are a common notice trigger. AIS pulls from broker SFT data.
      // Gaps can arise from FIFO vs LIFO accounting or grandfathering under 112A.
      const aisCG = ais?.capitalGainsTotal ?? null;
      const itrCG = itr?.capitalGains?.totalCg ?? null;
      if (aisCG != null && aisCG > 5000) {
        if (itrCG == null || itrCG < aisCG * 0.6) {
          const gap = aisCG - (itrCG ?? 0);
          cards.push({
            id: `capital-gains-gap-${fy}`,
            severity: gap > 50000 ? 'review' : 'watch',
            title: 'Capital gains in AIS not fully declared in ITR',
            body: `AIS shows capital gains of ${fmtINR(aisCG)} (MF: ${fmtINR(ais?.capitalGainsMF)}, Equity: ${fmtINR(ais?.capitalGainsEquity)}). ITR shows ${fmtINR(itrCG ?? 0)}. Capital gains must be declared in Schedule CG even if no tax is due. Note: Section 111A applies to STCG @15%; Section 112A applies to LTCG @10% above the ₹1L annual exemption. A difference of ${fmtINR(gap)} is a common notice trigger.`,
            fy,
            tags: ['Capital Gains', 'AIS', 'Schedule CG'],
            amount: gap,
          });
        }
      }

      if (itr?.capitalGains?.ltcg10pct != null && itr.capitalGains.ltcg10pct > 100000) {
        const exemptAmount = 100000;
        const taxableLtcg = itr.capitalGains.ltcg10pct - exemptAmount;
        if (taxableLtcg > 0) {
          cards.push({
            id: `ltcg-taxable-${fy}`,
            severity: 'info',
            title: `LTCG above ₹1L threshold — taxable portion: ${fmtINR(taxableLtcg)}`,
            body: `Long-term capital gains of ${fmtINR(itr.capitalGains.ltcg10pct)} detected. The first ₹1,00,000 per year is exempt under Section 112A (grandfathered from Jan 2018). The remaining ${fmtINR(taxableLtcg)} is taxable at 10% without indexation. Consider staggering redemptions across FYs to maximise the annual exemption.`,
            fy,
            tags: ['LTCG', '112A', 'Capital Gains'],
          });
        }
      }

      // ── TDS mismatch ──────────────────────────────────────────────────────
      // TDS differences are common and often not alarming: banks may report TDS
      // in a different quarter, or salary TDS may be booked in the next FY.
      const itrTds = itr?.tdsTotal ?? null;
      const aisTds = ais?.tdsTotal ?? null;
      if (itrTds != null && aisTds != null && Math.abs(itrTds - aisTds) > Math.max(5000, Math.max(itrTds, aisTds) * 0.08)) {
        const gap = Math.abs(itrTds - aisTds);
        cards.push({
          id: `tds-compare-${fy}`,
          severity: 'watch',
          title: 'TDS totals differ between AIS and ITR',
          body: `ITR TDS: ${fmtINR(itrTds)} — AIS TDS credits: ${fmtINR(aisTds)}. Gap: ${fmtINR(gap)}. This is often caused by timing differences (TDS deducted in one quarter but reflected in AIS later), PAN mapping errors by your employer/bank, or ITR form differences. Verify in Form 26AS that all TDS entries are credited before claiming a refund.`,
          fy,
          tags: ['TDS', 'Form 26AS'],
          amount: gap,
        });
      }

      // ── HRA exemption check ───────────────────────────────────────────────
      // HRA exemption in ITR without rent TDS in AIS is NORMAL — landlords with
      // rent < ₹50,000/month are not required to have TDS deducted (Section 194I).
      // Only flag if HRA is claimed but zero/no deductions overall (possible error).
      const hraExempt = itr?.deductions?.hraExemption ?? null;
      if (hraExempt != null && hraExempt > 0) {
        const aisRentTds = ais?.rentTotal ?? null;
        const noRentTdsInAis = aisRentTds == null || aisRentTds === 0;
        if (noRentTdsInAis) {
          cards.push({
            id: `hra-no-rent-tds-${fy}`,
            severity: 'ok',
            // Positive framing — this is the normal case
            title: `HRA exemption claimed: ${fmtINR(hraExempt)}`,
            body: `HRA exemption of ${fmtINR(hraExempt)} is shown in ITR with no corresponding rent TDS in AIS — this is completely normal. TDS on rent (Section 194IB) is required only when monthly rent exceeds ₹50,000. Retain rent receipts and the landlord's PAN (required if annual rent > ₹1L) as supporting documents.`,
            fy,
            tags: ['HRA', 'Exemption'],
          });
        } else {
          cards.push({
            id: `hra-with-rent-tds-${fy}`,
            severity: 'ok',
            title: `HRA exemption claimed with matching rent data`,
            body: `HRA exemption of ${fmtINR(hraExempt)} is shown in ITR and AIS reflects rental activity (${fmtINR(aisRentTds)}). The HRA exemption is the minimum of: actual HRA received, 50%/40% of basic salary (metro/non-metro), or rent paid minus 10% of basic salary. Verify the computation in your Form 16.`,
            fy,
            tags: ['HRA', 'Exemption'],
          });
        }
      }

      // ── Home loan interest (Section 24b) ──────────────────────────────────
      // A negative housePropertyIncome (up to -₹2L) is expected and valid for
      // self-occupied property under Section 24(b). This is not a data error.
      const hpIncome = itr?.housePropertyIncome ?? null;
      const homeLoanInterest = itr?.deductions?.homeLoanInterest ?? null;
      if (hpIncome != null && hpIncome <= -150000) {
        cards.push({
          id: `home-loan-24b-${fy}`,
          severity: 'ok',
          title: `Home loan deduction claimed: ${fmtINR(Math.abs(hpIncome))}`,
          body: `House property income shows ${fmtINR(hpIncome)}, which means interest on housing loan was deducted under Section 24(b). For a self-occupied property, this is capped at ₹2,00,000 per year — the remaining interest (if any) cannot be carried forward. Ensure your lender-issued interest certificate is kept on file.`,
          fy,
          tags: ['Home Loan', 'Section 24b', 'House Property'],
        });
      } else if (homeLoanInterest != null && homeLoanInterest > 0 && (hpIncome == null || hpIncome === 0)) {
        cards.push({
          id: `home-loan-not-in-hp-${fy}`,
          severity: 'watch',
          title: 'Home loan interest noted but house property income is zero',
          body: `Home loan interest of ${fmtINR(homeLoanInterest)} was found in deductions but the house property income schedule appears zero. For self-occupied property, Section 24(b) allows up to ₹2L deduction — this should reduce taxable income. Verify the ITR house property schedule is correctly filled.`,
          fy,
          tags: ['Home Loan', 'Section 24b'],
        });
      }

      // ── Rent income ──────────────────────────────────────────────────────
      const aisRent = ais?.rentTotal ?? null;
      // Only flag if there is a meaningful rent amount AND no HRA exemption
      // (HRA means the taxpayer is a tenant, not a landlord — rent in AIS could
      // be their own rent paid, not rental income received).
      const taxpayerHasHra = (itr?.deductions?.hraExemption ?? 0) > 0;
      if (aisRent != null && aisRent > 50000 && (hpIncome == null || hpIncome === 0) && !taxpayerHasHra) {
        cards.push({
          id: `rent-not-declared-${fy}`,
          severity: 'review',
          title: 'Rental income in AIS not reflected in ITR',
          body: `AIS shows rental income of ${fmtINR(aisRent)}. No house property income was detected in ITR. Rental income is taxable as House Property Income after a standard 30% deduction for repairs/maintenance. Failing to declare rental income is one of the more common triggers for notices under Section 148.`,
          fy,
          tags: ['Rent', 'House Property', 'AIS'],
          amount: aisRent,
        });
      }

      // ── Business income ───────────────────────────────────────────────────
      const aisBiz = ais?.businessTotal ?? null;
      const itrBiz = itr?.businessIncome ?? null;
      if (aisBiz != null && aisBiz > 50000 && (itrBiz == null || itrBiz === 0)) {
        cards.push({
          id: `business-not-declared-${fy}`,
          severity: 'review',
          title: 'Business income in AIS not declared in ITR',
          body: `AIS shows business-category transactions of ${fmtINR(aisBiz)}. No business income found in ITR. If you have freelance/consulting income or GST turnover reported, it must be declared under Business/Profession income head. Note that salaried individuals with freelance income may need to file ITR-3 instead of ITR-1.`,
          fy,
          tags: ['Business', 'AIS'],
          amount: aisBiz,
        });
      }

      // ── Foreign remittance ────────────────────────────────────────────────
      if ((ais?.foreignRemittance ?? 0) > 0) {
        cards.push({
          id: `foreign-remittance-${fy}`,
          severity: 'watch',
          title: 'Foreign remittance detected in AIS',
          body: `AIS shows outward foreign remittance of ${fmtINR(ais?.foreignRemittance ?? 0)}. If you transferred money abroad under LRS, ensure Schedule FA (foreign assets) and Schedule FSI (foreign source income) are correctly filed. TCS collected on LRS foreign remittances above ₹7L is creditable in your ITR.`,
          fy,
          tags: ['Foreign', 'LRS', 'AIS'],
        });
      }

      // ── Busy AIS ─────────────────────────────────────────────────────────
      if (ais && ais.lineCount > 100) {
        cards.push({
          id: `ais-busy-${fy}`,
          severity: 'info',
          title: `High AIS activity: ${ais.lineCount}+ transactions`,
          body: `${fy} has ${ais.lineCount}+ AIS-style entries. Filter by category in the portal AIS viewer to identify high-value transactions. Make sure each category maps to the correct ITR schedule.`,
          fy,
          tags: ['AIS', 'Transactions'],
        });
      }
    }

    // ─── TIS + ITR checks ──────────────────────────────────────────────────
    if (hasTisFile && hasItrFile && hasTisSnap && hasItrSnap) {
      cards.push({
        id: `join-tis-itr-${fy}`,
        severity: 'info',
        title: `TIS + ITR linked for ${fy}`,
        body: `TIS PDF text extracted for ${fy}. TIS is the government's aggregated view of your income — same source as ITR pre-fill. PDF parsing is approximate; use AIS JSON for precise numbers.`,
        fy,
        tags: ['TIS', 'ITR'],
      });

      const ts = tis?.salary ?? null;
      const is = itr?.salaryIncome ?? null;
      if (ts != null && is != null) {
        const tol = Math.max(2500, Math.abs(is) * 0.02);
        if (Math.abs(ts - is) > tol) {
          cards.push({
            id: `tis-salary-${fy}`,
            severity: 'watch',
            title: 'TIS vs ITR: salary figures differ',
            body: `TIS reads ~${fmtINR(ts)} salary vs ITR salary head ~${fmtINR(is)}. Possible reasons: employer breakdowns, perquisites, or PDF text layer parsing imprecision. Verify against your Form 16 — the Form 16 Part B total (gross salary after exemptions) should match the ITR salary schedule.`,
            fy,
            tags: ['TIS', 'ITR', 'Salary'],
            amount: Math.abs(ts - is),
          });
        }
      }

      const ti = tis?.savingsInterest ?? null;
      const ii = itr?.interestIncome ?? null;
      if (ti != null && ii != null && ti > ii * 1.2 && ti - ii > 1500) {
        cards.push({
          id: `tis-interest-${fy}`,
          severity: 'review',
          title: 'TIS savings interest higher than ITR interest',
          body: `TIS ~${fmtINR(ti)} vs ITR other-sources interest ~${fmtINR(ii)}. Ensure all bank interest (including amounts above the 80TTA ₹10,000 threshold) is accounted for in Schedule OS. Small gaps may reflect the exempt savings bank portion.`,
          fy,
          tags: ['TIS', 'ITR', 'Interest'],
          amount: ti - ii,
        });
      }

      // Capital gains in TIS
      if ((tis?.capitalGains ?? 0) > 0 && (itr?.capitalGains?.totalCg ?? 0) === 0) {
        cards.push({
          id: `tis-cg-${fy}`,
          severity: 'watch',
          title: 'TIS shows capital gains not found in ITR',
          body: `TIS reports capital gains of ~${fmtINR(tis?.capitalGains ?? 0)} but no capital gains schedule detected in ITR. Confirm whether MF/equity redemptions happened this FY. Even if gains are within the ₹1L LTCG exemption, Schedule CG must be filled.`,
          fy,
          tags: ['TIS', 'Capital Gains'],
        });
      }
    }

    if (hasTisFile && !hasItrFile) {
      cards.push({
        id: `tis-no-itr-${fy}`,
        severity: 'watch',
        title: `TIS without ITR for ${fy}`,
        body: `TIS PDF parsed for ${fy} but no ITR JSON/XML found. Add ITR to unlock salary cross-checks and the full comparison deck.`,
        fy,
        tags: ['TIS', 'ITR'],
      });
    }

    // ─── Deduction analysis signals ────────────────────────────────────────
    if (hasItrSnap && itr) {
      const d = itr.deductions;
      const regime = itr.taxRegimeKey;
      const totalIncome = itr.totalIncome ?? null;
      const grossIncome = itr.grossIncome ?? null;

      if (regime === 'old' && d) {
        // 80C under-utilisation
        if (d.section80C != null && d.section80C < 50000) {
          cards.push({
            id: `80c-low-${fy}`,
            severity: 'info',
            title: '80C deduction appears low for old regime',
            body: `Section 80C claimed: ${fmtINR(d.section80C)}. The limit is ₹1,50,000. Common instruments: EPF contribution (employer shares don't count), PPF, ELSS mutual funds (3-yr lock-in), life insurance premiums, or children's tuition fees. Each rupee you claim here saves tax at your marginal slab rate.`,
            fy,
            tags: ['80C', 'Deductions', 'Old Regime'],
          });
        } else if (d.section80C != null && d.section80C >= 140000) {
          cards.push({
            id: `80c-maxed-${fy}`,
            severity: 'ok',
            title: `80C fully utilised: ${fmtINR(d.section80C)}`,
            body: `Section 80C deduction of ${fmtINR(d.section80C)} is at or near the ₹1,50,000 cap — well done. If you haven't already, consider adding Section 80CCD(1B) NPS for an extra ₹50,000 deduction above the 80C limit.`,
            fy,
            tags: ['80C', 'Deductions', 'Old Regime'],
          });
        }

        // Standard deduction check
        // Old regime: reintroduced at ₹40,000 in FY 2018-19, raised to ₹50,000
        // from FY 2019-20 onwards. Not available for FY 2017-18 and earlier.
        const expectedStdDed = getRegimeDefaults(fy, 'old').stdDeduction;
        if (expectedStdDed > 0 && (d.standardDeduction ?? 0) === 0 && (itr.salaryIncome ?? 0) > 0) {
          cards.push({
            id: `std-deduct-${fy}`,
            severity: 'watch',
            title: 'Standard deduction not detected in ITR',
            body: `Salaried individuals under the old regime can claim ${fmtINR(expectedStdDed)} standard deduction for ${fy} — it reduces gross salary before computing taxable income. Verify this is reflected in your ITR's salary schedule. If your Form 16 shows it, the ITR prefill should include it automatically.`,
            fy,
            tags: ['Standard Deduction'],
          });
        } else if (expectedStdDed > 0 && (d.standardDeduction ?? 0) >= expectedStdDed && (itr.salaryIncome ?? 0) > 0) {
          cards.push({
            id: `std-deduct-ok-${fy}`,
            severity: 'ok',
            title: `Standard deduction claimed: ${fmtINR(d.standardDeduction ?? 0)}`,
            body: `Standard deduction of ${fmtINR(d.standardDeduction ?? 0)} correctly applied to salary income. This is a flat deduction with no receipts required.`,
            fy,
            tags: ['Standard Deduction'],
          });
        }

        // Section 80D health insurance
        // Old regime: ₹25,000 for self/family; ₹50,000 if self/spouse is senior citizen.
        // We can't know age from ITR alone, so just flag if it looks unclaimed.
        if ((d.section80D ?? 0) === 0 && grossIncome != null && grossIncome > 500000) {
          cards.push({
            id: `80d-unclaimed-${fy}`,
            severity: 'info',
            title: 'No Section 80D (health insurance) deduction detected',
            body: `Section 80D allows a deduction of up to ₹25,000 for health insurance premiums paid for self, spouse, and children (₹50,000 if the insured is a senior citizen). Premiums for parents can add another ₹25,000–₹50,000. If you pay health insurance premiums and are on the old regime, verify this is claimed in Schedule VI-A.`,
            fy,
            tags: ['80D', 'Health Insurance', 'Deductions'],
          });
        } else if ((d.section80D ?? 0) > 0) {
          cards.push({
            id: `80d-claimed-${fy}`,
            severity: 'ok',
            title: `Section 80D health insurance claimed: ${fmtINR(d.section80D ?? 0)}`,
            body: `Health insurance deduction of ${fmtINR(d.section80D ?? 0)} is claimed. The limits are ₹25,000 (self/family) + up to ₹50,000 for parents if they are senior citizens. Preventive health check-up costs up to ₹5,000 are included within this limit.`,
            fy,
            tags: ['80D', 'Health Insurance'],
          });
        }

        // NPS 80CCD(1B) — extra ₹50,000 above 80C ceiling
        if ((d.npsDeduction ?? 0) === 0) {
          cards.push({
            id: `80ccd1b-unclaimed-${fy}`,
            severity: 'info',
            title: 'Section 80CCD(1B) NPS deduction not claimed',
            body: `An additional ₹50,000 deduction is available under Section 80CCD(1B) for voluntary NPS contributions — this is over and above the ₹1.5L cap of Section 80C. For someone in the 30% tax bracket this alone saves ₹15,000+. Consider opening an NPS account (Tier I) if not already done.`,
            fy,
            tags: ['NPS', '80CCD(1B)', 'Deductions'],
          });
        } else {
          cards.push({
            id: `80ccd1b-claimed-${fy}`,
            severity: 'ok',
            title: `NPS 80CCD(1B) deduction: ${fmtINR(d.npsDeduction ?? 0)}`,
            body: `NPS voluntary contribution deduction of ${fmtINR(d.npsDeduction ?? 0)} claimed under Section 80CCD(1B). This is separate from the 80C limit — good use of an often-missed benefit.`,
            fy,
            tags: ['NPS', '80CCD(1B)'],
          });
        }
      }

      if (regime === 'new' && d) {
        // New regime std deduction history:
        //   FY 2020-21 → FY 2022-23: none.
        //   FY 2023-24:              ₹50,000.
        //   FY 2024-25 onwards:      ₹75,000.
        const newRegimeStdDed = getRegimeDefaults(fy, 'new').stdDeduction;
        if (newRegimeStdDed > 0 && (d.standardDeduction ?? 0) === 0 && (itr.salaryIncome ?? 0) > 0) {
          cards.push({
            id: `new-std-deduct-${fy}`,
            severity: 'watch',
            title: `Standard deduction not detected in ITR (new regime)`,
            body: `Salaried individuals on the new regime are entitled to ${fmtINR(newRegimeStdDed)} standard deduction for ${fy}. Verify this is applied in your salary schedule.`,
            fy,
            tags: ['Standard Deduction', 'New Regime'],
          });
        } else if (newRegimeStdDed > 0 && (d.standardDeduction ?? 0) >= newRegimeStdDed - 1000 && (itr.salaryIncome ?? 0) > 0) {
          cards.push({
            id: `new-std-deduct-ok-${fy}`,
            severity: 'ok',
            title: `Standard deduction claimed: ${fmtINR(d.standardDeduction ?? 0)} (new regime)`,
            body: `Standard deduction of ${fmtINR(d.standardDeduction ?? 0)} correctly applied under the new regime. Under the new regime most other deductions (80C, HRA, LTA) are not available, but the new slab rates are lower to compensate.`,
            fy,
            tags: ['Standard Deduction', 'New Regime'],
          });
        }
      }

      // ── Section 80CCD(2) — Employer NPS contribution ──────────────────────
      // Available in BOTH regimes. Employer NPS contribution is deductible under
      // 80CCD(2) up to 10% of basic salary (14% for Central Government employees).
      // We can't compute basic salary here, but if it's present we flag it positively.
      // The field isn't in DeductionSnapshot yet, but check via grossIncome heuristic.
      // (This will be more precise when adapters expose employerNps separately.)

      // ── Section 87A rebate check ──────────────────────────────────────────
      // Thresholds and rebate amounts vary by FY and regime — pull from the
      // central helper in tax-engine.js so the copy stays aligned with the
      // actual law of the year being filed.
      if (totalIncome != null && (regime === 'old' || regime === 'new')) {
        const { rebateThreshold, rebateMax } = getRegimeDefaults(fy, regime);
        const taxPayable = itr.taxLiability?.taxPayable ?? null;
        const netTaxPayable = itr.taxLiability?.netTaxPayable ?? null;
        const regimeLabel = regime === 'new' ? 'new regime' : 'old regime';
        const thresholdStr = fmtINR(rebateThreshold);
        const rebateStr = fmtINR(rebateMax);

        if (rebateThreshold > 0 && totalIncome <= rebateThreshold && taxPayable != null && taxPayable > 0) {
          if (netTaxPayable != null && netTaxPayable > 0) {
            cards.push({
              id: `87a-${regime}-regime-${fy}`,
              severity: 'watch',
              title: `Section 87A rebate — verify it was applied (${regimeLabel})`,
              body: `Total income of ${fmtINR(totalIncome)} is within the ${thresholdStr} threshold for the Section 87A rebate (${regimeLabel}, ${fy}). Tax liability up to ${rebateStr} should be fully rebated. Net tax payable of ${fmtINR(netTaxPayable)} is unexpected — verify the rebate is reflected in your computation.`,
              fy,
              tags: regime === 'new' ? ['87A', 'Rebate', 'New Regime'] : ['87A', 'Rebate'],
            });
          } else {
            cards.push({
              id: `87a-${regime}-regime-ok-${fy}`,
              severity: 'ok',
              title: `Section 87A rebate applied — zero tax for ${fy} (${regimeLabel})`,
              body: `Total income of ${fmtINR(totalIncome)} is within the ${thresholdStr} threshold (${regimeLabel}, ${fy}), and the Section 87A rebate (up to ${rebateStr}) correctly brings tax liability to nil.`,
              fy,
              tags: regime === 'new' ? ['87A', 'Rebate', 'New Regime'] : ['87A', 'Rebate'],
            });
          }
        }
      }

      // Refund signal — make this clearly positive
      const refund = itr.taxLiability?.refundDue ?? null;
      if (refund != null && refund > 0) {
        cards.push({
          id: `refund-${fy}`,
          severity: 'ok',
          title: `Refund due: ${fmtINR(refund)} for ${fy}`,
          body: `Your ITR shows a refund of ${fmtINR(refund)} — this is money owed back to you by the government. Refunds are processed after ITR verification (usually 2–4 months for e-verified returns). Ensure your bank account is pre-validated on the portal and the return is e-verified within 30 days of filing.`,
          fy,
          tags: ['Refund'],
          amount: refund,
        });
      }
    }
  }

  // ─── Sort: review → watch → info → ok ─────────────────────────────────────
  const order = { review: 0, watch: 1, info: 2, ok: 3 };
  cards.sort((a, b) => order[a.severity] - order[b.severity] || String(a.fy ?? '').localeCompare(String(b.fy ?? '')));

  return cards;
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
