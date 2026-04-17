/**
 * Short regime-aware narrative from comparative snapshot (no LLM / no API).
 * @param {Awaited<ReturnType<import('./itr-comparative.js').buildComparativeFromState>>} snap
 */
export function buildComparativeNarrative(snap) {
  if (!snap?.yearLabels?.length) return '';
  const n = snap.yearLabels.length;
  const lines = [];
  const first = snap.yearLabels[0];
  const last = snap.yearLabels[n - 1];
  lines.push(
    `Comparative view spans ${first} through ${last} (${n} return${n > 1 ? 's' : ''}). GTI is the sum of salaries, house property, capital gains, and other sources as declared in each ITR.`
  );

  const regimes = snap.displayRows.find((r) => r.id === 'row-Tax Regime' || r.label === 'Tax regime');
  if (regimes?.cells?.length) {
    const uniq = [...new Set(regimes.cells)];
    if (uniq.length > 1) {
      lines.push(
        `Tax regime shifts across years (${uniq.join(' → ')}). Under the New Regime, most Chapter VI-A deductions are not applicable — lower 80C/80D figures in those years are expected, not missed planning.`
      );
    }
  }

  const gtiRow = snap.displayRows.find((r) => r.label === 'Gross Total Income');
  if (gtiRow && n >= 2) {
    const parseCell = (s) => {
      const t = String(s).replace(/[₹,\s]/g, '').trim();
      const v = parseFloat(t);
      return Number.isFinite(v) ? v : 0;
    };
    const v0 = parseCell(gtiRow.cells[0]);
    const v1 = parseCell(gtiRow.cells[n - 1]);
    if (v0 > 0 && v1 > 0) {
      const ch = Math.round(((v1 - v0) / v0) * 1000) / 10;
      lines.push(`Gross income grew ${ch >= 0 ? '+' : ''}${ch}% from ${first} to ${last}. Verify figures against your filed returns on the portal.`);
    }
  }

  lines.push(
    `"Post-tax capacity" is an illustrative proxy: (GTI − net tax liability) × 0.6, a rough estimate of take-home capacity — not a balance-sheet net worth figure.`
  );

  return lines.join('\n\n');
}
