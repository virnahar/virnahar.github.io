/**
 * Multi-FY ITR comparative (Code.txt–style) — table + chart inputs, client-side only.
 * Reads ITR JSON files from app state (re-parses blobs); no AIS/TIS here.
 */

import { getByPath, toNum } from './itr-paths.js';

/** @typedef {{ kind: string, fy?: string }} FileEntryLike */

/** @type {Record<string, string[]>} */
const MAP = {
  AY: ['ITR.ITR1.Form_ITR1.AssessmentYear', 'ITR.ITR2.Form_ITR2.AssessmentYear'],
  FormName: ['ITR.ITR1.Form_ITR1.FormName', 'ITR.ITR2.Form_ITR2.FormName'],
  TaxRegimePath: [
    'ITR.ITR1.FilingStatus.OptOutNewTaxRegime',
    'ITR.ITR2.PartA_GEN1.FilingStatus.OptOutNewTaxRegime',
    'ITR.ITR2.FilingStatus.OptOutNewTaxRegime',
  ],
  Salaries: ['ITR.ITR1.ITR1_IncomeDeductions.IncomeFromSal', 'ITR.ITR2.ScheduleS.TotIncUnderHeadSalaries'],
  'House Property': ['ITR.ITR1.ITR1_IncomeDeductions.TotalIncomeOfHP', 'ITR.ITR2.PartB-TI.IncomeFromHP'],
  'Capital Gains': ['ITR.ITR2.PartB-TI.CapGain.TotalCapGains', 'ITR.ITR2.PartB-TI.CapGain'],
  'Other Sources': ['ITR.ITR1.ITR1_IncomeDeductions.IncomeOthSrc', 'ITR.ITR2.ScheduleOS.IncChargeable'],
  '80C': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80C', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80C'],
  '80D': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80D', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80D'],
  TotalChapVIADeductions: [
    'ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.TotalChapVIADeductions',
    'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.TotalChapVIADeductions',
  ],
  NetTaxLiability: ['ITR.ITR1.ITR1_TaxComputation.NetTaxLiability', 'ITR.ITR2.PartB_TTI.ComputationOfTaxLiability.NetTaxLiability'],
  RefundDue: ['ITR.ITR1.Refund.RefundDue', 'ITR.ITR2.PartB_TTI.Refund.RefundDue'],
  STCG: ['ITR.ITR2.ScheduleCGFor23.ShortTermCapGainFor23.TotalSTCG', 'ITR.ITR2.PartB-TI.CapGain.ShortTerm'],
  LTCG: ['ITR.ITR2.ScheduleCGFor23.LongTermCapGain23.TotalLTCG', 'ITR.ITR2.PartB-TI.CapGain.LongTerm'],
};

/** @type {Record<string, string[]>} */
const COND = {
  '80CCC': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCC', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80CCC'],
  '80CCD(1)': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCDEmployeeOrSE', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80CCDEmployeeOrSE'],
  '80CCD(1B)': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCD1B', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80CCD1B'],
  '80CCD(2)': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80CCDEmployer', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80CCDEmployer'],
  '80TTA': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80TTA', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80TTA'],
  '80G': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80G', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80G'],
  '80GG': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80GG', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80GG'],
  '80GGA': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80GGA', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80GGA'],
  '80DDB': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80DDB', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80DDB'],
  '80U': ['ITR.ITR1.ITR1_IncomeDeductions.DeductUndChapVIA.Section80U', 'ITR.ITR2.ScheduleVIA.DeductUndChapVIA.Section80U'],
};

/**
 * @param {unknown} v
 */
function normalizeFormName(v) {
  if (!v) return '—';
  const u = String(v).toUpperCase();
  if (u.includes('ITR2') || u.includes('ITR-2') || u === '2') return 'ITR-2';
  if (u.includes('ITR1') || u.includes('ITR-1') || u === '1') return 'ITR-1';
  return String(v).slice(0, 14);
}

/**
 * @param {unknown} obj
 * @param {string[]} paths
 */
function firstGet(obj, paths) {
  for (const p of paths) {
    const v = getByPath(obj, p);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/**
 * @param {number|null|undefined} n
 */
export function formatInrCell(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
}

/**
 * @param {string[]} keys
 */
function sortFyKeys(keys) {
  return [...keys].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });
}

/**
 * @param {unknown} obj
 */
function ayStartYear(obj) {
  const raw = String(firstGet(obj, MAP.AY) ?? '');
  const m = raw.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * @param {unknown} obj
 * @param {number} ayStart
 */
function taxRegimeLabel(obj, ayStart) {
  if (ayStart > 0 && ayStart <= 2023) return 'Old Regime';
  if (ayStart > 2023) {
    const opt = String(firstGet(obj, MAP.TaxRegimePath) ?? '')
      .trim()
      .toUpperCase();
    if (opt === 'Y' || opt === 'YES' || opt === 'TRUE') return 'Old Regime';
    return 'New Regime';
  }
  return '—';
}

/**
 * Build a synthetic ITR-JSON-compatible object from a parsed ItrSnapshot.
 * Fills both ITR1 and ITR2 path variants so firstGet() resolves correctly.
 * @param {import('./model.js').ItrSnapshot} itr
 * @param {string} fy  e.g. "2018-19"
 */
function snapshotToObj(itr, fy) {
  const m = String(fy).match(/(\d{4})/);
  const startYr = m ? parseInt(m[1]) : 0;
  const ayYear = String(startYr + 1); // "2018-19" → "2019"
  const isOld = itr.taxRegimeKey === 'old' || !itr.taxRegimeKey;
  const optOut = isOld ? 'Y' : 'N';
  const sal = itr.salaryIncome ?? 0;
  const hp = itr.housePropertyIncome ?? 0;
  const cg = itr.capitalGains?.totalCg ?? 0;
  const stcg = (itr.capitalGains?.stcg15pct ?? 0) + (itr.capitalGains?.stcgOther ?? 0);
  const ltcg = (itr.capitalGains?.ltcg10pct ?? 0) + (itr.capitalGains?.ltcg20pct ?? 0);
  const os = (itr.interestIncome ?? 0) + (itr.dividendIncome ?? 0);
  const s80C = itr.deductions?.section80C ?? 0;
  const s80D = itr.deductions?.section80D ?? 0;
  const totDed = itr.deductions?.totalDeductions ?? 0;
  const netTax = itr.taxLiability?.netTaxPayable ?? 0;
  const refund = itr.taxLiability?.refundDue ?? 0;
  const formName = itr.formLabel ?? 'ITR-1';
  const viaNode = { Section80C: s80C, Section80D: s80D, TotalChapVIADeductions: totDed };
  return {
    ITR: {
      ITR1: {
        Form_ITR1: { AssessmentYear: ayYear, FormName: formName },
        FilingStatus: { OptOutNewTaxRegime: optOut },
        ITR1_IncomeDeductions: {
          IncomeFromSal: sal, TotalIncomeOfHP: hp, IncomeOthSrc: os,
          DeductUndChapVIA: viaNode,
        },
        ITR1_TaxComputation: { NetTaxLiability: netTax },
        Refund: { RefundDue: refund },
      },
      ITR2: {
        Form_ITR2: { AssessmentYear: ayYear, FormName: formName },
        PartA_GEN1: { FilingStatus: { OptOutNewTaxRegime: optOut } },
        FilingStatus: { OptOutNewTaxRegime: optOut },
        ScheduleS: { TotIncUnderHeadSalaries: sal },
        'PartB-TI': {
          IncomeFromHP: hp,
          CapGain: { TotalCapGains: cg, ShortTerm: stcg, LongTerm: ltcg },
        },
        ScheduleOS: { IncChargeable: os },
        ScheduleVIA: { DeductUndChapVIA: viaNode },
        PartB_TTI: {
          ComputationOfTaxLiability: { NetTaxLiability: netTax },
          Refund: { RefundDue: refund },
        },
        ScheduleCGFor23: {
          ShortTermCapGainFor23: { TotalSTCG: stcg },
          LongTermCapGain23: { TotalLTCG: ltcg },
        },
      },
    },
  };
}

/**
 * @param {{ years: Map<string, import('./model.js').YearRecord>, files: Array<{ classification: { kind: string }, metadata?: { fy?: string }, blob?: Blob }> }} state
 */
export async function buildComparativeFromState(state) {
  const years = state?.years;
  const files = state?.files;
  if (!years?.size || !Array.isArray(files)) return null;

  /** @type {Map<string, unknown>} */
  const fyToObj = new Map();

  // Pass 1: read raw JSON blobs for itr_json files (real uploads have .blob)
  for (const f of files) {
    if (f.classification?.kind !== 'itr_json' || !f.blob) continue;
    const fy = f.metadata?.fy;
    if (!fy) continue;
    const yr = years.get(String(fy).trim());
    if (!yr?.sources?.some((s) => s.kind === 'itr_json')) continue;
    let text;
    try { text = await f.blob.text(); } catch { continue; }
    let obj;
    try { obj = JSON.parse(text); } catch { continue; }
    fyToObj.set(String(fy).trim(), obj);
  }

  // Pass 2: for FYs whose ITR source has no raw blob to re-parse (either
  // itr_xml from real uploads, or itr_json from demo mode which is in-memory
  // only), build a synthetic compatible object from the already-parsed
  // snapshot so the comparative table/charts still populate.
  for (const [fy, yr] of years) {
    if (fyToObj.has(fy)) continue; // already loaded via raw JSON
    const hasItrSource = yr.sources?.some((s) => s.kind === 'itr_xml' || s.kind === 'itr_json');
    if (!hasItrSource) continue;
    const itr = yr.itr;
    if (!itr?.hasData) continue;
    fyToObj.set(fy, snapshotToObj(itr, fy));
  }

  const sortedFys = sortFyKeys(Array.from(fyToObj.keys()));
  if (!sortedFys.length) return null;

  const n = sortedFys.length;
  /** @type {Record<string, Array<number|null|string>>} */
  const fd = {};
  const coreRows = [
    'FormName',
    'Tax Regime',
    'Salaries',
    'House Property',
    'Capital Gains',
    'Other Sources',
    'Gross Total Income',
    '80C',
    '80D',
    'TotalChapVIADeductions',
    'NetTaxLiability',
    'RefundDue',
    'NetWorth',
  ];
  coreRows.forEach((r) => {
    fd[r] = [];
  });
  const condKeys = Object.keys(COND);
  condKeys.forEach((k) => {
    fd[k] = [];
  });

  /** @type {Array<{ savings: number; dividend: number; other: number }>} */
  const otherBreakup = [];
  /** @type {Array<{ gross: number; hra: number; lta: number; ten14: number; others: number; ded16: number }>} */
  const salaryBreakup = [];
  /** @type {Array<{ stcg: number; ltcg: number }>} */
  const capgBreakup = [];

  for (const fy of sortedFys) {
    const obj = fyToObj.get(fy);
    if (!obj || typeof obj !== 'object') continue;

    const ay = ayStartYear(obj);
    fd.FormName.push(normalizeFormName(firstGet(obj, MAP.FormName)));
    fd['Tax Regime'].push(taxRegimeLabel(obj, ay));

    for (const k of ['Salaries', 'House Property', 'Capital Gains', 'Other Sources', '80C', '80D', 'TotalChapVIADeductions', 'NetTaxLiability', 'RefundDue']) {
      const paths = /** @type {string[]} */ (MAP[/** @type {keyof typeof MAP} */ (k)]);
      const raw = firstGet(obj, paths);
      fd[k].push(toNum(raw));
    }

    for (const ck of condKeys) {
      const raw = firstGet(obj, COND[ck]);
      fd[ck].push(toNum(raw));
    }

    /* Other sources breakup */
    let savings = 0;
    let dividend = 0;
    const idx = otherBreakup.length;
    let otherIncome = 0;
    const schOS = getByPath(obj, 'ITR.ITR2.ScheduleOS');
    if (schOS && typeof schOS === 'object') {
      const osNode = /** @type {Record<string, unknown>} */ (getByPath(schOS, 'IncOthThanOwnRaceHorse') || {});
      savings = toNum(osNode.IntrstFrmSavingBank) || 0;
      dividend = toNum(osNode.DividendGross) || 0;
      const totalOther = toNum(fd['Other Sources'][idx]) || 0;
      otherIncome = Math.max(0, totalOther - (savings + dividend));
    } else {
      const arr1 =
        getByPath(obj, 'ITR.ITR1.ITR1_IncomeDeductions.OthersInc.OthersIncDtlsOthSrc') ||
        getByPath(obj, 'ITR.ITR1.ITR1_IncomeDeductions.OthSrc') ||
        getByPath(obj, 'ITR.ITR1.ITR1_IncomeDeductions.OthersIncDtls');
      if (Array.isArray(arr1)) {
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
          if (nat.includes('DIV')) dividend += amt;
          else if (nat.includes('SAV')) savings += amt;
        }
      }
      const totalOther = toNum(fd['Other Sources'][idx]) || 0;
      otherIncome = Math.max(0, totalOther - (dividend + savings));
    }
    otherBreakup.push({ savings, dividend, other: otherIncome });

    /* Salary breakup */
    let grossSal =
      toNum(firstGet(obj, ['ITR.ITR2.ScheduleS.TotalGrossSalary', 'ITR.ITR1.ITR1_IncomeDeductions.GrossSalary', 'ITR.ITR1.GrossSalary'])) || 0;
    const totalAllwncExempt =
      toNum(
        firstGet(obj, ['ITR.ITR2.ScheduleS.AllwncExtentExemptUs10', 'ITR.ITR1.ITR1_IncomeDeductions.AllwncExemptUs10.TotalAllwncExemptUs10'])
      ) || 0;
    let hra = 0;
    let lta = 0;
    let ten14 = 0;
    const exArr =
      getByPath(obj, 'ITR.ITR2.ScheduleS.AllwncExemptUs10.AllwncExemptUs10Dtls') ||
      getByPath(obj, 'ITR.ITR1.ITR1_IncomeDeductions.AllwncExemptUs10.AllwncExemptUs10Dtls') ||
      [];
    if (Array.isArray(exArr)) {
      for (const itx of exArr) {
        if (!itx || typeof itx !== 'object') continue;
        const row = /** @type {Record<string, unknown>} */ (itx);
        const nat = String(row.SalNatureDesc || '').toUpperCase();
        const amt =
          toNum(row.SalOthAmount) ?? toNum(row.OthAmount) ?? toNum(row.Amount) ?? toNum(row.SalAmount) ?? 0;
        if (nat.includes('10(13A)')) hra += amt;
        else if (nat.includes('10(5)')) lta += amt;
        else if (nat.includes('10(14)')) ten14 += amt;
      }
    }
    const othersSal = Math.max(0, totalAllwncExempt - hra - lta - ten14);
    const ded16 =
      toNum(firstGet(obj, ['ITR.ITR2.ScheduleS.DeductionUS16', 'ITR.ITR1.ITR1_IncomeDeductions.DeductionUs16'])) || 0;
    const salHead = toNum(fd.Salaries[idx]) || 0;
    salaryBreakup.push({
      gross: grossSal > 0 ? grossSal : salHead,
      hra,
      lta,
      ten14,
      others: othersSal,
      ded16,
    });

    /* CG breakup */
    let stcg = toNum(firstGet(obj, MAP.STCG)) || 0;
    let ltcg = toNum(firstGet(obj, MAP.LTCG)) || 0;
    const capTotal = toNum(fd['Capital Gains'][idx]) || 0;
    if (!stcg && !ltcg && capTotal) ltcg = capTotal;
    capgBreakup.push({ stcg, ltcg });
  }

  fd['Gross Total Income'] = [];
  for (let i = 0; i < n; i++) {
    const s = toNum(fd.Salaries[i]) || 0;
    const hp = toNum(fd['House Property'][i]) || 0;
    const cg = toNum(fd['Capital Gains'][i]) || 0;
    const os = toNum(fd['Other Sources'][i]) || 0;
    fd['Gross Total Income'][i] = s + hp + cg + os;
  }

  fd.NetWorth = [];
  for (let i = 0; i < n; i++) {
    const gti = toNum(fd['Gross Total Income'][i]) || 0;
    const tax = toNum(fd.NetTaxLiability[i]) || 0;
    fd.NetWorth[i] = Math.round((gti - tax) * 0.6);
  }

  const condToShow = condKeys.filter((k) => fd[k] && fd[k].some((v) => toNum(v) > 0));

  const rowsToShow = [
    'FormName',
    'Tax Regime',
    'Salaries',
    'House Property',
    'Capital Gains',
    'Other Sources',
    'Gross Total Income',
    '80C',
    '80D',
    ...condToShow,
    'TotalChapVIADeductions',
    'NetTaxLiability',
    'RefundDue',
    'NetWorth',
  ];

  /** @type {Array<{ id: string; label: string; cells: string[]; total: string; rowClass: string; expand?: 'salary' | 'other' | 'cg' }>} */
  const displayRows = [];

  const sumNumericRow = (key) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += toNum(fd[key][i]) || 0;
    return formatInrCell(sum);
  };

  for (const r of rowsToShow) {
    let rowClass = 'comp-row';
    if (r === 'NetTaxLiability') rowClass += ' comp-row--tax';
    else if (r === 'RefundDue') rowClass += ' comp-row--refund';
    else if (r === 'Gross Total Income' || r === 'TotalChapVIADeductions' || r === 'NetWorth') rowClass += ' comp-row--emphasis';

    const displayName =
      r === 'FormName'
        ? 'Form name'
        : r === 'TotalChapVIADeductions'
          ? 'Total deductions (VI-A)'
          : r === 'Tax Regime'
            ? 'Tax regime'
            : r;

    const isText = r === 'FormName' || r === 'Tax Regime';
    /** @type {string[]} */
    const cells = [];
    for (let i = 0; i < n; i++) {
      if (isText) cells.push(String(fd[r][i] ?? '—'));
      else {
        const v = fd[r][i];
        cells.push(v == null || !Number.isFinite(v) ? '—' : formatInrCell(v));
      }
    }

    let total = '—';
    if (
      [
        'Salaries',
        'House Property',
        'Capital Gains',
        'Other Sources',
        'Gross Total Income',
        'TotalChapVIADeductions',
        'NetTaxLiability',
        'RefundDue',
        'NetWorth',
      ].includes(r)
    ) {
      total = sumNumericRow(r);
    }

    let expand;
    if (r === 'Salaries') expand = 'salary';
    else if (r === 'Other Sources') expand = 'other';
    else if (r === 'Capital Gains') expand = 'cg';

    displayRows.push({
      id: `row-${r}`,
      label: displayName,
      cells,
      total,
      rowClass,
      expand,
    });

    if (r === 'Gross Total Income') {
      /** @type {string[]} */
      const yoyCells = ['—'];
      const gti = fd['Gross Total Income'];
      for (let i = 1; i < n; i++) {
        const prev = toNum(gti[i - 1]) || 0;
        const curr = toNum(gti[i]) || 0;
        const pct = prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;
        yoyCells.push(`${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%`);
      }
      displayRows.push({
        id: 'row-gti-yoy',
        label: '% change (GTI YoY)',
        cells: yoyCells,
        total: '—',
        rowClass: 'comp-row comp-row--yoy',
      });
    }

    if (r === 'NetWorth') {
      /** @type {string[]} */
      const yoyCells = ['—'];
      const nw = fd.NetWorth;
      for (let i = 1; i < n; i++) {
        const prev = toNum(nw[i - 1]) || 0;
        const curr = toNum(nw[i]) || 0;
        const pct = prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;
        yoyCells.push(`${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%`);
      }
      displayRows.push({
        id: 'row-nw-yoy',
        label: '% change (net worth YoY)',
        cells: yoyCells,
        total: '—',
        rowClass: 'comp-row comp-row--yoy',
      });
    }
  }

  const last = n - 1;
  const pie = {
    salary: Math.max(0, toNum(fd.Salaries[last]) || 0),
    hp: Math.max(0, toNum(fd['House Property'][last]) || 0),
    cg: Math.max(0, toNum(fd['Capital Gains'][last]) || 0),
    os: Math.max(0, toNum(fd['Other Sources'][last]) || 0),
  };

  const gti = /** @type {number[]} */ (fd['Gross Total Income'].map((v) => toNum(v) || 0));
  const netTaxArr = /** @type {number[]} */ ((fd['NetTaxLiability'] || []).map((v) => Math.abs(toNum(v) || 0)));
  const nw = /** @type {number[]} */ (fd.NetWorth.map((v) => toNum(v) || 0));
  const cumNw = [];
  let acc = 0;
  for (let i = 0; i < nw.length; i++) {
    acc += nw[i];
    cumNw.push(acc);
  }

  return {
    yearLabels: sortedFys,
    displayRows,
    salarySubRows: [
      { label: 'Gross salary', key: 'gross', values: salaryBreakup.map((x) => x.gross), bracket: false },
      { label: 'HRA 10(13A)', key: 'hra', values: salaryBreakup.map((x) => x.hra), bracket: true },
      { label: 'LTA 10(5)', key: 'lta', values: salaryBreakup.map((x) => x.lta), bracket: true },
      { label: '10(14) allowances', key: 'ten14', values: salaryBreakup.map((x) => x.ten14), bracket: true },
      { label: 'Other exemptions', key: 'others', values: salaryBreakup.map((x) => x.others), bracket: true },
      { label: 'Deduction u/s 16', key: 'ded16', values: salaryBreakup.map((x) => x.ded16), bracket: true },
    ],
    otherSubRows: [
      { label: 'Savings bank interest', values: otherBreakup.map((x) => x.savings) },
      { label: 'Dividend', values: otherBreakup.map((x) => x.dividend) },
      { label: 'Other / residual', values: otherBreakup.map((x) => x.other) },
    ],
    cgSubRows: [
      { label: 'STCG', values: capgBreakup.map((x) => x.stcg) },
      { label: 'LTCG', values: capgBreakup.map((x) => x.ltcg) },
    ],
    charts: { gti, netTax: netTaxArr, cumNw, pie, pieFy: sortedFys[last] },
  };
}
