/**
 * Chart.js via global (UMD from index.html) — avoids ESM/CORS edge cases on file://.
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   labels: string[],
 *   values: number[],
 *   datasetLabel?: string,
 *   extraDatasets?: Array<Partial<import('chart.js').ChartDataset<'line'>> & { data: number[] }>,
 * }} series
 * @returns {Promise<import('chart.js').Chart | null>}
 */
export async function renderIncomeLineChart(canvas, series) {
  const ChartCtor = window.Chart;
  if (!ChartCtor || !series.labels.length) return null;

  const gold = getComputedStyle(document.documentElement).getPropertyValue('--accent-gold').trim() || '#d4af37';
  const teal = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#5ead9a';
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#828290';

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const extras = series.extraDatasets ?? [];
  const dualAxis = extras.length > 0;

  // Build a vertical Canvas gradient for the area fill — rich top, transparent bottom
  function makeGoldGradient(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'rgba(212,175,55,0.15)';
    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    grad.addColorStop(0, 'rgba(212,175,55,0.28)');
    grad.addColorStop(0.55, 'rgba(212,175,55,0.08)');
    grad.addColorStop(1, 'rgba(212,175,55,0)');
    return grad;
  }

  const primary = {
    label: series.datasetLabel ?? 'Per FY metric',
    data: series.values,
    yAxisID: 'y',
    borderColor: gold,
    backgroundColor(context) {
      const chart = context.chart;
      return makeGoldGradient(chart);
    },
    tension: 0.42,
    fill: true,
    pointRadius: 5,
    pointHoverRadius: 10,
    pointBackgroundColor: gold,
    pointBorderColor: 'rgba(6,6,8,0.95)',
    pointBorderWidth: 2.5,
    pointHoverBackgroundColor: '#f0d78c',
    pointHoverBorderColor: gold,
    pointHoverBorderWidth: 3,
    borderWidth: 2.5,
    borderCapStyle: 'round',
    borderJoinStyle: 'round',
    // Years with no ITR in this session must render as visual gaps, never
    // connected zero/fake lines. See CLAUDE.md §13.
    spanGaps: false,
    segment: {
      borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? [4, 4] : undefined),
    },
  };

  const datasets = [primary, ...extras.map((d, i) => ({
    ...d,
    yAxisID: d.yAxisID ?? 'y1',
    borderColor: d.borderColor ?? (i === 0 ? teal : 'rgba(212, 175, 55, 0.65)'),
    backgroundColor: d.backgroundColor ?? 'transparent',
    tension: d.tension ?? 0.35,
    fill: d.fill ?? false,
    pointRadius: d.pointRadius ?? 3,
    borderWidth: d.borderWidth ?? 2,
    borderCapStyle: 'round',
    borderJoinStyle: 'round',
  }))];

  // Fast path: if a line chart of the same shape already exists on this
  // canvas, mutate its data in place and call update('none'). Avoids the
  // ~10× cost of destroy + recreate on FY-selector changes. Falls back to
  // a full rebuild when axes/dataset count would change.
  // @ts-ignore
  const existing = canvas.chart;
  const structurallyCompatible =
    !!existing
    && existing.config?.type === 'line'
    && Array.isArray(existing.data?.labels)
    && existing.data.labels.length === series.labels.length
    && Array.isArray(existing.data?.datasets)
    && existing.data.datasets.length === datasets.length
    && !!existing.options?.scales?.y1 === dualAxis;

  if (structurallyCompatible) {
    existing.data.labels = series.labels;
    datasets.forEach((ds, i) => {
      const target = existing.data.datasets[i];
      Object.keys(ds).forEach((k) => {
        target[k] = ds[k];
      });
    });
    existing.update('none');
    return existing;
  }

  if (existing) {
    existing.destroy();
  }

  // @ts-ignore
  const chart = new ChartCtor(canvas, {
    type: 'line',
    data: { labels: series.labels, datasets },
    options: {
      layout: { padding: { top: 10, bottom: 6, left: 4, right: dualAxis ? 8 : 4 } },
      interaction: { mode: 'index', intersect: false },
      animation: reduce
        ? false
        : {
            duration: 2100,
            easing: 'easeOutQuart',
            delay(ctx) {
              if (ctx.type !== 'data' || ctx.mode !== 'default') return 0;
              const di = ctx.dataIndex ?? 0;
              const dsi = ctx.datasetIndex ?? 0;
              return di * 85 + dsi * 140;
            },
          },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: muted, padding: 16, usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          backgroundColor: 'rgba(14,14,18,0.96)',
          titleColor: '#f4f4f5',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(212,175,55,0.4)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 12,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              if (!Number.isFinite(v)) return ctx.dataset.label;
              const formatted = v >= 10000000
                ? `₹${(v / 10000000).toFixed(2)} Cr`
                : v >= 100000
                  ? `₹${(v / 100000).toFixed(2)} L`
                  : `₹${v.toLocaleString('en-IN')}`;
              return ` ${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: muted, font: { size: 12 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          position: 'left',
          ticks: {
            color: muted,
            font: { size: 12 },
            callback(value) {
              const n = Number(value);
              return formatYTickRupee(n);
            },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
        ...(dualAxis
          ? {
              y1: {
                position: 'right',
                grid: { drawOnChartArea: false, color: 'rgba(255,255,255,0.04)' },
                ticks: {
                  color: muted,
                  callback(value) {
                    const n = Number(value);
                    return formatYTickRupee(n);
                  },
                },
                beginAtZero: true,
              },
            }
          : {}),
      },
    },
  });

  // @ts-ignore
  canvas.chart = chart;
  return chart;
}

/**
 * @param {number} n
 */
function formatYTickRupee(n) {
  if (!Number.isFinite(n)) return String(n);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)} k`;
  return `₹${n}`;
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export function destroyChartOnCanvas(canvas) {
  if (!canvas) return;
  // @ts-ignore
  if (canvas.chart) {
    // @ts-ignore
    canvas.chart.destroy();
    // @ts-ignore
    canvas.chart = null;
  }
}

/**
 * Code.txt–style trio: GTI bar, cumulative net-worth line, latest-year income pie.
 * The GTI bar chart colors each bar by effective net-tax rate when `opts.netTax`
 * is supplied: green/teal ≤ 10 %, amber 10–20 %, red > 20 %.
 *
 * @param {{
 *   barCanvas: HTMLCanvasElement,
 *   lineCanvas: HTMLCanvasElement,
 *   pieCanvas: HTMLCanvasElement,
 *   yearLabels: string[],
 *   gti: number[],
 *   cumNetWorth: number[],
 *   pie: { salary: number, hp: number, cg: number, os: number },
 *   pieTitle?: string,
 *   netTax?: number[],
 * }} opts
 */
export async function renderItrComparativeCharts(opts) {
  const ChartCtor = window.Chart;
  if (!ChartCtor) return;
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#71717a';
  const gold = getComputedStyle(document.documentElement).getPropertyValue('--accent-gold').trim() || '#d4af37';
  const teal = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#5ead9a';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  destroyChartOnCanvas(opts.barCanvas);
  destroyChartOnCanvas(opts.lineCanvas);
  destroyChartOnCanvas(opts.pieCanvas);

  // Compute per-bar colors for the GTI chart based on net-tax / GTI ratio.
  // Falls back to uniform gold when netTax is not provided.
  const gtiBarColors = opts.gti.map((gtiVal, i) => {
    const tax = opts.netTax?.[i];
    if (tax == null || !gtiVal) return gold;
    const rate = (tax / gtiVal) * 100;
    if (rate > 20) return '#ef4444';      // red   — high burden
    if (rate > 10) return '#f59e0b';      // amber — medium burden
    return teal;                           // teal  — low burden
  });

  // @ts-ignore
  const barChart = new ChartCtor(opts.barCanvas, {
    type: 'bar',
    data: {
      labels: opts.yearLabels,
      datasets: [
        {
          label: 'Gross total income',
          data: opts.gti,
          backgroundColor: gtiBarColors,
          borderRadius: 8,
        },
        // Overlay net-tax as a thinner dataset only when provided
        ...(opts.netTax?.length
          ? [{
              label: 'Net tax',
              data: opts.netTax,
              backgroundColor: opts.netTax.map((tax, i) => {
                const gtiVal = opts.gti[i];
                if (!gtiVal) return 'rgba(255,255,255,0.3)';
                const rate = (tax / gtiVal) * 100;
                if (rate > 20) return 'rgba(239,68,68,0.55)';
                if (rate > 10) return 'rgba(245,158,11,0.55)';
                return 'rgba(94,173,154,0.55)';
              }),
              borderRadius: 4,
              borderSkipped: false,
              barPercentage: 0.45,
            }]
          : []),
      ],
    },
    options: {
      animation: reduce ? false : { duration: 1200, easing: 'easeOutQuart' },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !!(opts.netTax?.length),
          labels: { color: muted, usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 10 } },
        },
        title: {
          display: true,
          text: opts.netTax?.length ? 'GTI & net tax by FY' : 'GTI by FY (ITR JSON)',
          color: muted,
          font: { size: 12, weight: '600' },
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,28,0.94)',
          titleColor: '#f4f4f5',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(212,175,55,0.35)',
          borderWidth: 1,
          callbacks: {
            afterBody: (items) => {
              const i = items[0]?.dataIndex;
              if (i == null || !opts.netTax) return [];
              const gtiVal = opts.gti[i];
              const tax = opts.netTax[i];
              if (!gtiVal || tax == null) return [];
              const rate = ((tax / gtiVal) * 100).toFixed(1);
              return [`Effective rate: ${rate}%`];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: muted }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: {
          ticks: {
            color: muted,
            callback(v) {
              return formatYTickRupee(Number(v));
            },
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
      },
    },
  });
  // @ts-ignore
  opts.barCanvas.chart = barChart;

  // @ts-ignore
  const lineChart = new ChartCtor(opts.lineCanvas, {
    type: 'line',
    data: {
      labels: opts.yearLabels,
      datasets: [
        {
          label: 'Cumulative net worth (proxy)',
          data: opts.cumNetWorth,
          borderColor: teal,
          backgroundColor: 'rgba(94, 173, 154, 0.15)',
          tension: 0.35,
          fill: true,
          borderWidth: 2.5,
          pointRadius: 4,
        },
      ],
    },
    options: {
      animation: reduce ? false : { duration: 1300, easing: 'easeOutQuart' },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Cumulative (GTI − tax) × 0.6',
          color: muted,
          font: { size: 12, weight: '600' },
        },
      },
      scales: {
        x: { ticks: { color: muted }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: {
          ticks: {
            color: muted,
            callback(v) {
              return formatYTickRupee(Number(v));
            },
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
      },
    },
  });

  // @ts-ignore
  opts.lineCanvas.chart = lineChart;

  const { salary, hp, cg, os } = opts.pie;
  const pieData = [Math.max(0, salary), Math.max(0, hp), Math.max(0, cg), Math.max(0, os)];

  // @ts-ignore
  const pieChart = new ChartCtor(opts.pieCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Salary', 'House property', 'Capital gains', 'Other sources'],
      datasets: [
        {
          data: pieData,
          backgroundColor: [gold, '#f59e0b', '#a78bfa', '#38bdf8'],
          borderColor: 'rgba(6,6,8,0.95)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      animation: reduce ? false : { duration: 1100, easing: 'easeOutCubic' },
      responsive: true,
      maintainAspectRatio: false,
      cutout: '52%',
      plugins: {
        title: {
          display: true,
          text: opts.pieTitle ?? 'Income mix · latest FY in table',
          color: muted,
          font: { size: 12, weight: '600' },
        },
        legend: { position: 'bottom', labels: { color: muted, font: { size: 10 } } },
      },
    },
  });
  // @ts-ignore
  opts.pieCanvas.chart = pieChart;
}

/**
 * Radar chart for AIS vs ITR gap risk visualisation.
 * @param {HTMLCanvasElement} canvas
 * @param {{ labels: string[], values: number[], label?: string }} data
 */
export function renderRadarChart(canvas, data) {
  const ChartCtor = window.Chart;
  if (!ChartCtor) return null;

  const gold = getComputedStyle(document.documentElement).getPropertyValue('--accent-gold').trim() || '#d4af37';
  const danger = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim() || '#e07878';
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#71717a';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // @ts-ignore
  if (canvas.chart) { canvas.chart.destroy(); }

  // @ts-ignore
  const chart = new ChartCtor(canvas, {
    type: 'radar',
    data: {
      labels: data.labels,
      datasets: [{
        label: data.label ?? 'Risk gap',
        data: data.values,
        borderColor: danger,
        backgroundColor: 'rgba(224, 120, 120, 0.18)',
        borderWidth: 2,
        pointBackgroundColor: gold,
        pointBorderColor: 'rgba(6,6,8,0.95)',
        pointRadius: 4,
        pointHoverRadius: 7,
      }],
    },
    options: {
      animation: reduce ? false : { duration: 1400, easing: 'easeOutCubic' },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { color: muted, stepSize: 25, font: { size: 9 }, backdropColor: 'transparent' },
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: muted, font: { size: 11 } },
          angleLines: { color: 'rgba(255,255,255,0.1)' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(24,24,28,0.94)',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          borderColor: 'rgba(224,120,120,0.35)',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => `${ctx.raw?.toFixed(0)}% gap severity`,
          },
        },
      },
    },
  });

  // @ts-ignore
  canvas.chart = chart;
  return chart;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW CHART FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Donut chart breaking down the tax liability into components.
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   labels: string[],
 *   values: number[],
 *   colors?: string[],
 * }} opts
 * @returns {import('chart.js').Chart | null}
 */
export function renderTaxBreakdownDonut(canvas, { labels, values, colors }) {
  const ChartCtor = window.Chart;
  if (!ChartCtor || !labels.length) return null;

  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#71717a';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // @ts-ignore
  if (canvas.chart) { canvas.chart.destroy(); }

  const defaultColors = ['#d4af37', '#5ead9a', '#f59e0b', '#a78bfa', '#ef4444', '#38bdf8'];
  const bgColors = colors?.length ? colors : labels.map((_, i) => defaultColors[i % defaultColors.length]);

  // Filter out zero-value segments so the donut stays clean
  const filtered = labels
    .map((l, i) => ({ label: l, value: values[i] ?? 0, color: bgColors[i] }))
    .filter((s) => s.value > 0);

  if (!filtered.length) return null;

  // @ts-ignore
  const chart = new ChartCtor(canvas, {
    type: 'doughnut',
    data: {
      labels: filtered.map((s) => s.label),
      datasets: [{
        data: filtered.map((s) => s.value),
        backgroundColor: filtered.map((s) => s.color),
        borderColor: 'rgba(6,6,8,0.95)',
        borderWidth: 2,
        hoverOffset: 10,
      }],
    },
    options: {
      animation: reduce
        ? false
        : {
            duration: 800,
            easing: 'easeOutCubic',
            delay(ctx) {
              if (ctx.type === 'data' && ctx.mode === 'default') return (ctx.dataIndex ?? 0) * 90;
              return 0;
            },
          },
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: muted,
            padding: 10,
            font: { size: 11 },
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        title: {
          display: true,
          text: 'Tax breakdown',
          color: muted,
          font: { size: 12, weight: '600' },
          padding: { bottom: 8 },
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,28,0.94)',
          titleColor: '#f4f4f5',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(212,175,55,0.35)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw);
              const total = filtered.reduce((s, seg) => s + seg.value, 0);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return `${ctx.label}: ${formatYTickRupee(val)} (${pct}%)`;
            },
          },
        },
      },
    },
  });

  // @ts-ignore
  canvas.chart = chart;
  return chart;
}

/**
 * Renders a set of inline HTML horizontal progress bars for deduction utilisation.
 * NOT a canvas chart — pure DOM. The container is cleared and rebuilt on each call.
 *
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {{
 *   label: string,
 *   used: number,
 *   limit: number,
 *   color?: string,
 * }[]} deductions
 */
export function renderDeductionProgressBars(container, deductions) {
  if (!container || !deductions?.length) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const items = deductions.filter((d) => d.limit > 0);
  if (!items.length) return;

  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'deduction-pb-list';
  wrap.setAttribute('role', 'list');

  items.forEach((d) => {
    const pct = Math.min(100, d.limit > 0 ? (d.used / d.limit) * 100 : 0);
    const isFull = pct >= 95;
    const color = d.color || (isFull ? '#5ead9a' : '#d4af37');

    const row = document.createElement('div');
    row.className = 'deduction-pb-row';
    row.setAttribute('role', 'listitem');

    // Header row: label + amounts
    const header = document.createElement('div');
    header.className = 'deduction-pb-row__header';

    const labelEl = document.createElement('span');
    labelEl.className = 'deduction-pb-row__label';
    labelEl.textContent = d.label;

    const amtEl = document.createElement('span');
    amtEl.className = 'deduction-pb-row__amounts tabular';
    amtEl.innerHTML =
      `<strong>${formatYTickRupee(d.used)}</strong>` +
      `<span class="deduction-pb-sep"> / </span>` +
      `<span class="deduction-pb-limit">${formatYTickRupee(d.limit)}</span>` +
      `<span class="deduction-pb-pct"> \u2014 ${pct.toFixed(0)}%</span>`;

    header.appendChild(labelEl);
    header.appendChild(amtEl);

    // Track + fill
    const track = document.createElement('div');
    track.className = 'deduction-pb-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-label', `${d.label}: ${Math.round(pct)}% utilised`);

    const fill = document.createElement('div');
    fill.className = 'deduction-pb-fill' + (isFull ? ' deduction-pb-fill--full' : '');
    // Animate width from 0 → pct using a brief rAF delay.
    // Under reduced motion, paint final width immediately.
    fill.style.width = reduce ? `${pct}%` : '0%';
    fill.style.background = color;
    fill.style.transition = reduce ? 'none' : 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

    track.appendChild(fill);
    row.appendChild(header);
    row.appendChild(track);
    wrap.appendChild(row);

    // Trigger animation on next frame
    if (!reduce) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.width = `${pct}%`;
        });
      });
    }
  });

  container.appendChild(wrap);
}

/**
 * Waterfall-style bar chart (floating bars) showing income → deductions → taxable income.
 * Uses Chart.js bar type with [base, top] data for floating bars.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   labels: string[],
 *   values: number[],
 * }} opts
 * `values` contains signed deltas in order, e.g.:
 *   Gross Salary (+), HRA exempt (−), Standard deduction (−),
 *   Net Salary (+), Home loan interest (−), Other income (+),
 *   GTI (+), Deductions (−), Taxable Income (+).
 * Pass positive for additions, negative for subtractions.
 * The function accumulates the running total to build floating bar
 * coordinates automatically.
 * @returns {import('chart.js').Chart | null}
 */
export function renderIncomeWaterfallData(canvas, { labels, values }) {
  const ChartCtor = window.Chart;
  if (!ChartCtor || !labels.length) return null;

  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#71717a';
  const gold = '#d4af37';
  const teal = '#5ead9a';
  const amber = '#f59e0b';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // @ts-ignore
  if (canvas.chart) { canvas.chart.destroy(); }

  // Build [base, top] floating bars and per-bar colors
  /** @type {[number, number][]} */
  const floatingData = [];
  /** @type {string[]} */
  const barColors = [];

  let running = 0;
  values.forEach((delta) => {
    const base = delta >= 0 ? running : running + delta;
    const top = delta >= 0 ? running + delta : running;
    floatingData.push([base, top]);
    running += delta;

    // Subtractions (deductions/exemptions) → teal; additions → gold
    barColors.push(delta < 0 ? teal : gold);
  });

  // Last bar (Taxable Income final result) gets amber highlight
  if (barColors.length > 0) {
    barColors[barColors.length - 1] = amber;
  }

  // @ts-ignore
  const chart = new ChartCtor(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Income waterfall',
        data: floatingData,
        backgroundColor: barColors,
        borderRadius: 5,
        borderSkipped: false,
        borderWidth: 0,
      }],
    },
    options: {
      animation: reduce ? false : { duration: 800, easing: 'easeOutQuart' },
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10, bottom: 4, left: 4, right: 4 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Income \u2192 deductions \u2192 taxable income',
          color: muted,
          font: { size: 12, weight: '600' },
          padding: { bottom: 10 },
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,28,0.94)',
          titleColor: '#f4f4f5',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(212,175,55,0.35)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw;
              if (!Array.isArray(raw)) return '';
              const delta = values[ctx.dataIndex] ?? 0;
              const amt = Math.abs(delta);
              const sign = delta < 0 ? '\u2212' : '+';
              return `${sign}${formatYTickRupee(amt)} \u2192 ${formatYTickRupee(raw[1])}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: muted, font: { size: 10 }, maxRotation: 30, minRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          ticks: {
            color: muted,
            callback: (v) => formatYTickRupee(Number(v)),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
      },
    },
  });

  // @ts-ignore
  canvas.chart = chart;
  return chart;
}

/**
 * Grouped bar chart comparing old vs new tax regime.
 * The lower-tax bar is highlighted in gold; the higher one is muted.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   oldTax: number,
 *   newTax: number,
 *   savings: number,
 * }} opts
 * `savings` > 0 means new regime saves money; < 0 means old regime saves.
 * @returns {import('chart.js').Chart | null}
 */
export function renderRegimeComparisonBar(canvas, { oldTax, newTax, savings }) {
  const ChartCtor = window.Chart;
  if (!ChartCtor) return null;

  const muted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#71717a';
  const gold = '#d4af37';
  const mutedBar = 'rgba(255,255,255,0.18)';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // @ts-ignore
  if (canvas.chart) { canvas.chart.destroy(); }

  // Winner gets gold; higher-tax regime gets muted gray
  const oldColor = oldTax <= newTax ? gold : mutedBar;
  const newColor = newTax <= oldTax ? gold : mutedBar;

  const savingsLabel = Math.abs(savings) > 0
    ? `Save ${formatYTickRupee(Math.abs(savings))} with ${savings > 0 ? 'new' : 'old'} regime`
    : 'Regimes are equivalent';

  // @ts-ignore
  const chart = new ChartCtor(canvas, {
    type: 'bar',
    data: {
      labels: ['Tax liability'],
      datasets: [
        {
          label: 'Old regime',
          data: [Math.max(0, oldTax)],
          backgroundColor: oldColor,
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: 'New regime (115BAC)',
          data: [Math.max(0, newTax)],
          backgroundColor: newColor,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      animation: reduce ? false : { duration: 600, easing: 'easeOutQuart' },
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 8, bottom: 4, left: 8, right: 8 } },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: muted, usePointStyle: true, boxWidth: 8, padding: 14 },
        },
        title: {
          display: true,
          text: savingsLabel,
          color: muted,
          font: { size: 12, weight: '600' },
          padding: { bottom: 10 },
        },
        tooltip: {
          backgroundColor: 'rgba(24,24,28,0.94)',
          titleColor: '#f4f4f5',
          bodyColor: '#e4e4e7',
          borderColor: 'rgba(212,175,55,0.35)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatYTickRupee(Number(ctx.raw))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: muted },
          grid: { display: false },
        },
        y: {
          ticks: { color: muted, callback: (v) => formatYTickRupee(Number(v)) },
          grid: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        },
      },
    },
  });

  // @ts-ignore
  canvas.chart = chart;
  return chart;
}
