// ============================================================
// Stratify — Chart.js Wrapper Components
// Requires Chart.js 4.x loaded globally as `Chart`
// ============================================================

export const CHART_COLORS = {
  primary:   '#1E4096',
  secondary: '#0891B2',
  accent:    '#F59E0B',
  success:   '#10B981',
  error:     '#EF4444',
  neutral:   '#6B7280',
  purple:    '#8B5CF6',
};

// ── Theme helper ──────────────────────────────────────────────
function getChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    isDark,
    gridColor:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    textColor:   isDark ? '#64748B' : '#94A3B8',
    tickColor:   isDark ? '#475569' : '#CBD5E1',
    tooltipBg:   isDark ? '#1E293B' : '#FFFFFF',
    tooltipBorder: isDark ? '#334155' : '#E2E8F0',
    tooltipText: isDark ? '#F8FAFC' : '#0F172A',
  };
}

// ── Common defaults ───────────────────────────────────────────
function baseTooltip(theme) {
  return {
    backgroundColor:  theme.tooltipBg,
    borderColor:      theme.tooltipBorder,
    borderWidth:      1,
    titleColor:       theme.tooltipText,
    bodyColor:        theme.textColor,
    padding:          12,
    cornerRadius:     10,
    displayColors:    true,
    usePointStyle:    true,
    boxPadding:       4,
  };
}

// ── Store for re-creation on theme change ─────────────────────
const _chartRegistry = new Map(); // canvasId → { type, config }

function registerChart(canvasId, type, config) {
  _chartRegistry.set(canvasId, { type, config });
}

// ── Line chart (portfolio performance) ───────────────────────
/**
 * @param {string} canvasId
 * @param {{
 *   labels: string[],
 *   values: number[],
 *   label?: string,
 * }} data
 * @returns {Chart}
 */
export function createLineChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Destroy existing chart on this canvas
  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();

  const ctx   = canvas.getContext('2d');
  const theme = getChartTheme();

  // Gradient fill
  const grad  = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 300);
  grad.addColorStop(0,   'rgba(8,145,178,0.25)');
  grad.addColorStop(0.5, 'rgba(8,145,178,0.08)');
  grad.addColorStop(1,   'rgba(8,145,178,0.00)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label:           data.label || 'Patrimoine',
        data:            data.values,
        borderColor:     CHART_COLORS.secondary,
        backgroundColor: grad,
        borderWidth:     2.5,
        pointRadius:     4,
        pointHoverRadius: 6,
        pointBackgroundColor: CHART_COLORS.secondary,
        pointBorderColor:    theme.tooltipBg,
        pointBorderWidth:    2,
        tension:         0.4,
        fill:            true,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip(theme),
          callbacks: {
            label: (ctx) => {
              const val = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ctx.parsed.y);
              return `  ${ctx.dataset.label}: ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          border: { display: false },
          ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 } },
        },
        y: {
          position: 'right',
          grid:  { color: theme.gridColor, drawBorder: false },
          border: { display: false, dash: [4, 4] },
          ticks: {
            color: theme.textColor,
            font:  { family: 'IBM Plex Mono', size: 10 },
            callback: (v) => new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v),
          },
        },
      },
    },
  });

  registerChart(canvasId, 'line', { data });
  return chart;
}

// ── Bar chart (cashflow) ──────────────────────────────────────
/**
 * @param {string} canvasId
 * @param {{
 *   labels: string[],
 *   income: number[],
 *   expenses: number[],
 * }} data
 * @returns {Chart}
 */
export function createBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();

  const ctx   = canvas.getContext('2d');
  const theme = getChartTheme();

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label:           'Revenus',
          data:            data.income,
          backgroundColor: 'rgba(16,185,129,0.75)',
          hoverBackgroundColor: 'rgba(16,185,129,0.95)',
          borderRadius:    6,
          borderSkipped:   false,
        },
        {
          label:           'Dépenses',
          data:            data.expenses.map((v) => -v),
          backgroundColor: 'rgba(239,68,68,0.65)',
          hoverBackgroundColor: 'rgba(239,68,68,0.85)',
          borderRadius:    6,
          borderSkipped:   false,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display:  true,
          position: 'top',
          align:    'end',
          labels: {
            color:    theme.textColor,
            font:     { family: 'Inter', size: 11 },
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 3,
            usePointStyle: true,
            pointStyle: 'rect',
          },
        },
        tooltip: {
          ...baseTooltip(theme),
          callbacks: {
            label: (ctx) => {
              const val = Math.abs(ctx.parsed.y);
              const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
              return `  ${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          grid:   { display: false },
          border: { display: false },
          ticks:  { color: theme.textColor, font: { family: 'Inter', size: 11 } },
        },
        y: {
          stacked: false,
          grid:    { color: theme.gridColor },
          border:  { display: false, dash: [4, 4] },
          ticks: {
            color: theme.textColor,
            font:  { family: 'IBM Plex Mono', size: 10 },
            callback: (v) => {
              const abs = Math.abs(v);
              return `${v < 0 ? '-' : ''}${new Intl.NumberFormat('fr-FR', { notation: 'compact', style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(abs)}`;
            },
          },
        },
      },
    },
  });

  registerChart(canvasId, 'bar', { data });
  return chart;
}

// ── Donut chart (asset allocation) ───────────────────────────
/**
 * @param {string} canvasId
 * @param {{
 *   labels: string[],
 *   values: number[],
 *   colors?: string[],
 *   total?: number,
 * }} data
 * @returns {Chart}
 */
export function createDonutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const existing = Chart.getChart(canvasId);
  if (existing) existing.destroy();

  const ctx    = canvas.getContext('2d');
  const theme  = getChartTheme();
  const colors = data.colors || [
    CHART_COLORS.secondary,
    CHART_COLORS.primary,
    CHART_COLORS.success,
    CHART_COLORS.accent,
    CHART_COLORS.neutral,
    CHART_COLORS.purple,
  ];

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   data.labels,
      datasets: [{
        data:            data.values,
        backgroundColor: colors.map((c) => c + 'CC'), // slight transparency
        hoverBackgroundColor: colors,
        borderColor:     theme.tooltipBg,
        borderWidth:     2,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      cutout:              '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip(theme),
          callbacks: {
            label: (ctx) => {
              const pct = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return `  ${ctx.label}: ${((pct / total) * 100).toFixed(1)} %`;
            },
          },
        },
      },
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        const totalVal = data.total != null
          ? data.total
          : data.values.reduce((a, b) => a + b, 0);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textCol = isDark ? '#F8FAFC' : '#0F172A';
        const subCol  = isDark ? '#64748B' : '#94A3B8';

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (data.total != null) {
          // Show currency total
          ctx.font = "bold 16px 'IBM Plex Mono', monospace";
          ctx.fillStyle = textCol;
          ctx.fillText(
            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalVal),
            cx, cy - 8
          );
          ctx.font = "11px 'Inter', sans-serif";
          ctx.fillStyle = subCol;
          ctx.fillText('Patrimoine', cx, cy + 12);
        } else {
          ctx.font = "bold 18px 'IBM Plex Mono', monospace";
          ctx.fillStyle = textCol;
          ctx.fillText(`${totalVal} %`, cx, cy - 6);
          ctx.font = "11px 'Inter', sans-serif";
          ctx.fillStyle = subCol;
          ctx.fillText('Répartition', cx, cy + 12);
        }

        ctx.restore();
      },
    }],
  });

  registerChart(canvasId, 'donut', { data });
  return chart;
}

// ── Rebuild all charts on theme change ────────────────────────
window.addEventListener('stratify:theme-change', () => {
  // Small delay to let CSS vars update
  setTimeout(() => {
    _chartRegistry.forEach(({ type, config }, canvasId) => {
      if (type === 'line')  createLineChart(canvasId, config.data);
      if (type === 'bar')   createBarChart(canvasId, config.data);
      if (type === 'donut') createDonutChart(canvasId, config.data);
    });
  }, 50);
});

// ── Generate donut legend HTML ────────────────────────────────
/**
 * @param {string[]} labels
 * @param {number[]} values
 * @param {string[]} colors
 * @returns {string} HTML string
 */
export function createDonutLegend(labels, values, colors) {
  const total = values.reduce((a, b) => a + b, 0);
  return `
<div class="donut-legend">
  ${labels.map((label, i) => `
  <div class="donut-legend-item">
    <div class="donut-legend-left">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      <span class="donut-legend-label">${label}</span>
    </div>
    <div>
      <span class="donut-legend-value">${values[i]} %</span>
    </div>
  </div>`).join('')}
</div>`;
}
