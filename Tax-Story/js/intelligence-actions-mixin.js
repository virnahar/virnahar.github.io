import { compareRegimes, fmtAmount } from './tax-engine.js';

/**
 * Intelligence/action-center helpers extracted from main.js.
 * Methods are designed to run with `this` bound to the Alpine component.
 */
export function createIntelligenceActionsMixin() {
  return {
    dataConfidenceForFy(fy) {
      const row = this.state.years.get(fy);
      const itr = row?.itr;
      const ais = row?.ais;
      const tis = row?.tis;
      const hasItr = !!itr?.hasData;
      const hasAis = !!ais?.hasData;
      const hasTis = !!tis?.hasData;
      const score = (hasItr ? 50 : 0) + (hasAis ? 35 : 0) + (hasTis ? 15 : 0);
      let band = 'low';
      if (score >= 80) band = 'high';
      else if (score >= 55) band = 'medium';
      return { score, band, hasItr, hasAis, hasTis };
    },

    confidenceItems() {
      const fy = this.getSelectedFy();
      const c = this.dataConfidenceForFy(fy);
      return [
        { label: 'ITR source', value: c.hasItr ? 'Exact' : 'Missing', tone: c.hasItr ? 'ok' : 'warn' },
        { label: 'AIS source', value: c.hasAis ? 'Exact' : 'Missing', tone: c.hasAis ? 'ok' : 'warn' },
        { label: 'TIS source', value: c.hasTis ? 'Indicative' : 'Not loaded', tone: c.hasTis ? 'info' : 'muted' },
        { label: 'Confidence score', value: `${c.score}/100`, tone: c.band === 'high' ? 'ok' : (c.band === 'medium' ? 'info' : 'warn') },
      ];
    },

    _ensureScenarioSeed(fy) {
      if (!fy || this._scenarioSeedFy === fy) return;
      const itr = this.getItrForFy(fy);
      const d = itr?.deductions ?? {};
      this.scenario80C = Math.max(0, d.section80C ?? 0);
      this.scenario80D = Math.max(0, d.section80D ?? 0);
      this.scenarioNps = Math.max(0, d.npsDeduction ?? 0);
      this.scenarioHra = Math.min(400000, Math.max(0, d.hraExemption ?? 0));
      this.scenarioHomeLoan = Math.max(0, d.homeLoanInterest ?? 0);
      this._scenarioSeedFy = fy;
    },

    scenarioRecommendation() {
      const fy = this.getSelectedFy();
      const itr = this.getItrForFy(fy);
      if (!itr?.hasData || !itr.grossIncome) return null;
      this._ensureScenarioSeed(fy);
      let grossSalary = itr.grossSalaryIncome;
      if (grossSalary == null || !Number.isFinite(grossSalary) || grossSalary <= 0) {
        const sal = itr.salaryIncome ?? 0;
        const std = itr?.deductions?.standardDeduction ?? 0;
        const hraEx = itr?.deductions?.hraExemption ?? 0;
        grossSalary = sal + std + hraEx;
      }
      if (grossSalary <= 0) grossSalary = itr.grossIncome ?? 0;
      grossSalary = Math.max(0, grossSalary);
      const nonSalary = (itr.grossIncome ?? 0) - (itr.salaryIncome ?? 0);
      const specialRateCg = Math.max(0, itr.capitalGains?.totalCg ?? 0);
      const other = Math.max(0, nonSalary - specialRateCg);
      const sim = compareRegimes(grossSalary, other, {
        sec80C: Math.min(this.scenario80C, 150000),
        sec80D: Math.min(this.scenario80D, 25000),
        hra: Math.max(0, this.scenarioHra),
        nps80CCD: Math.min(this.scenarioNps, 50000),
        homeLoan: Math.min(this.scenarioHomeLoan, 200000),
        sec80TTA: itr?.deductions?.section80TTA ?? 0,
      }, fy);
      return sim;
    },

    actionCenterItems() {
      const fy = this.getSelectedFy();
      const rec = this.regimeComparison(fy);
      const ded = this.deductionAnalysis(fy);
      const risk = this.noticeRisk(fy);
      const items = [];
      if (rec) {
        items.push({
          title: `${rec.recommended === 'new' ? 'Switch to new regime' : 'Stay on old regime'}`,
          impact: `${fmtAmount(Math.abs(rec.savings ?? 0))} estimated`,
          detail: rec.reason || 'Based on current deductions and slab rates.',
          tone: 'gold',
        });
      }
      if (ded?.section80CRemaining > 5000) {
        items.push({
          title: 'Top-up Section 80C before filing',
          impact: `${fmtAmount(ded.section80CRemaining)} room left`,
          detail: 'PPF/ELSS/NPS can improve old-regime outcome.',
          tone: 'teal',
        });
      }
      if ((risk?.score ?? 0) >= 45) {
        items.push({
          title: 'Resolve AIS vs ITR gaps',
          impact: `${risk?.score ?? 0}/100 risk score`,
          detail: 'Reconcile interest/dividend/TDS mismatches first.',
          tone: 'red',
        });
      }
      const openReview = this.reviewCards().filter((c) => c.severity === 'review' || c.severity === 'watch').length;
      if (openReview > 0) {
        items.push({
          title: 'Close open reconciliation checks',
          impact: `${openReview} cards pending`,
          detail: 'Work through high-severity cards before export.',
          tone: 'purple',
        });
      }
      return items.slice(0, 5);
    },

    anomalyTimeline() {
      const keys = this.sortedFyKeys();
      const out = [];
      for (let i = 0; i < keys.length; i += 1) {
        const fy = keys[i];
        const itr = this.getItrForFy(fy);
        if (!itr?.hasData) continue;
        const prev = i > 0 ? this.getItrForFy(keys[i - 1]) : null;
        const g = itr.grossIncome ?? 0;
        const pg = prev?.grossIncome ?? 0;
        if (prev?.hasData && pg > 0) {
          const yoy = ((g - pg) / pg) * 100;
          if (Math.abs(yoy) >= 28) {
            out.push({ fy, label: 'Income jump', detail: `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% YoY` });
          }
        }
        const rr = this.noticeRisk(fy);
        if ((rr?.score ?? 0) >= 65) {
          out.push({ fy, label: 'High filing risk', detail: `${rr.score}/100 risk score` });
        }
        const liab = itr.taxLiability?.netTaxPayable ?? 0;
        const refund = itr.taxLiability?.refundDue ?? 0;
        if (refund > 0 && liab <= 0) {
          out.push({ fy, label: 'Refund year', detail: `${fmtAmount(refund)} expected refund` });
        }
      }
      return out.slice(-8);
    },
  };
}
