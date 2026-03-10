// ============================================================
// Stratify — Card Component Factories
// ============================================================

// ── Utility: format currency ──────────────────────────────────
function formatCurrency(value, compact = false) {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} %`;
}

// ── Icon map ──────────────────────────────────────────────────
const KPI_ICONS = {
  'trending-up': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  'trending-down': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  'wallet': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16v4"/><path d="M20 12a2 2 0 0 0-2 2 2 2 0 0 0 2 2h4v-4z"/><circle cx="20" cy="14" r="1" fill="currentColor"/></svg>`,
  'activity': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  'pie-chart': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  'shield': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  'arrow-up': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
  'arrow-down': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`,
};

// ── KPI Card ──────────────────────────────────────────────────
/**
 * @param {{
 *   title: string,
 *   value: number,
 *   subtitle?: string,
 *   trendValue?: number,
 *   trendLabel?: string,
 *   color?: 'secondary'|'success'|'accent'|'primary',
 *   icon?: string,
 *   valueIsPercent?: boolean,
 *   prefix?: string,
 * }} opts
 * @returns {string} HTML string
 */
export function createKPICard({ title, value, subtitle, trendValue, trendLabel, color = 'secondary', icon = 'trending-up', valueIsPercent = false, prefix }) {
  const formattedValue = valueIsPercent
    ? `${value.toFixed(1)} %`
    : (prefix ? `${prefix}${value.toLocaleString('fr-FR')}` : formatCurrency(value, true));

  const trendHtml = trendValue != null ? (() => {
    const up = trendValue >= 0;
    const cls = up ? 'trend-up' : 'trend-down';
    const arrow = up ? KPI_ICONS['arrow-up'] : KPI_ICONS['arrow-down'];
    const label = trendLabel || formatPercent(trendValue);
    return `<span class="trend ${cls}">${arrow}${label}</span>`;
  })() : '';

  return `
<div class="kpi-card color-${color}">
  <div class="kpi-header">
    <span class="kpi-label">${title}</span>
    <div class="kpi-icon color-${color}">${KPI_ICONS[icon] || KPI_ICONS['trending-up']}</div>
  </div>
  <div class="kpi-value">${formattedValue}</div>
  ${subtitle ? `<div class="kpi-sub">${subtitle}</div>` : ''}
  <div class="kpi-footer">
    ${trendHtml}
    ${trendLabel && trendValue == null ? `<span class="text-xs text-muted">${trendLabel}</span>` : ''}
  </div>
</div>`;
}

// ── Progress / Budget Card ────────────────────────────────────
/**
 * @param {{
 *   title: string,
 *   items: Array<{label: string, budgeted: number, actual: number, color: string}>
 * }} opts
 * @returns {string} HTML string
 */
export function createProgressCard({ title, items }) {
  const itemsHtml = items.map((item) => {
    const pct     = Math.round((item.actual / item.budgeted) * 100);
    const barPct  = Math.min(pct, 100);
    const overBgt = pct > 100;
    const nearBgt = pct >= 85 && pct <= 100;
    const pctCls  = overBgt ? 'over-budget' : (nearBgt ? 'near-budget' : 'under-budget');
    const barCls  = overBgt ? 'error' : (nearBgt ? 'warning' : '');

    return `
<div class="budget-item">
  <div class="budget-item-header">
    <div class="budget-label">
      <span class="category-dot" style="background:${item.color}"></span>
      ${item.label}
    </div>
    <div class="budget-amounts">
      <span class="budget-actual">${formatCurrency(item.actual, false).replace('€', '').trim()} €</span>
      <span class="budget-total">/ ${formatCurrency(item.budgeted, false).replace('€', '').trim()} €</span>
      <span class="budget-pct ${pctCls}">${pct} %</span>
    </div>
  </div>
  <div class="progress progress-sm">
    <div class="progress-bar ${barCls}" style="width:${barPct}%;background:${overBgt ? 'var(--color-error)' : item.color}"></div>
  </div>
</div>`;
  }).join('');

  const totalBudget = items.reduce((s, i) => s + i.budgeted, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  const remaining   = totalBudget - totalActual;

  return `
<div class="card" style="height:100%">
  <div class="card-header">
    <span class="card-title">Répartition du budget</span>
    <span class="badge badge-info">Mars 2026</span>
  </div>
  <div class="card-body">
    ${itemsHtml}
  </div>
  <div class="card-footer" style="display:flex;justify-content:space-between;align-items:center;">
    <span class="text-sm text-muted">Solde disponible</span>
    <span class="financial-number financial-number-sm" style="color:${remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)'}">
      ${remaining >= 0 ? '+' : ''}${formatCurrency(remaining)}
    </span>
  </div>
</div>`;
}

// ── Goals / Circular Progress Card ───────────────────────────
/**
 * @param {{ goals: Array<{label: string, progress: number, target: number, current: number, color: string}> }} opts
 * @returns {string} HTML string
 */
export function createGoalCard({ goals }) {
  const R        = 34;
  const C        = 2 * Math.PI * R;

  const goalsHtml = goals.map((goal) => {
    const pct        = Math.min(goal.progress, 100);
    const dashOffset = C - (pct / 100) * C;
    const formatted  = formatCurrency(goal.current, true);

    return `
<div class="goal-item">
  <div class="ring-progress">
    <svg width="80" height="80" viewBox="0 0 80 80">
      <!-- Track -->
      <circle cx="40" cy="40" r="${R}" fill="none" stroke="var(--border-color)" stroke-width="6"/>
      <!-- Progress -->
      <circle
        cx="40" cy="40" r="${R}"
        fill="none"
        stroke="${goal.color}"
        stroke-width="6"
        stroke-linecap="round"
        stroke-dasharray="${C}"
        stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 40 40)"
        style="transition:stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)"
      />
    </svg>
    <div class="ring-progress-inner">
      <span class="ring-pct">${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>
    </div>
  </div>
  <div class="goal-name">${goal.label}</div>
  <div class="goal-current">${formatted}</div>
</div>`;
  }).join('');

  return `
<div class="card" style="height:100%">
  <div class="card-header">
    <span class="card-title">Objectifs financiers</span>
    <a href="#" class="text-xs text-accent" style="text-decoration:none;font-weight:600;">Voir tout</a>
  </div>
  <div class="card-body">
    <div class="goals-grid">
      ${goalsHtml}
    </div>
  </div>
</div>`;
}

// ── Health Score Card ─────────────────────────────────────────
/**
 * @param {{ score: number, breakdown: Array<{label: string, score: number, max: number}> }} opts
 * @returns {string} HTML string
 */
export function createHealthScoreCard({ score, breakdown }) {
  // Score colour
  const scoreColor = score >= 80 ? 'var(--color-success)'
    : score >= 60 ? 'var(--color-accent)'
    : 'var(--color-error)';

  const scoreLabel = score >= 80 ? 'Excellent'
    : score >= 60 ? 'Bon'
    : 'À améliorer';

  const breakdownHtml = breakdown.map((row) => {
    const pct    = Math.round((row.score / row.max) * 100);
    const bColor = pct >= 70 ? 'var(--color-success)' : pct >= 45 ? 'var(--color-warning)' : 'var(--color-error)';
    return `
<div class="health-row">
  <span class="health-row-label">${row.label}</span>
  <div class="progress progress-sm" style="flex:1;max-width:80px;">
    <div class="progress-bar" style="width:${pct}%;background:${bColor}"></div>
  </div>
  <span class="health-row-score">${row.score}</span>
</div>`;
  }).join('');

  return `
<div class="kpi-card color-primary" style="height:100%">
  <div class="kpi-header">
    <span class="kpi-label">Score de santé</span>
    <div class="kpi-icon color-primary">
      ${KPI_ICONS.shield}
    </div>
  </div>
  <div style="display:flex;align-items:baseline;gap:8px;margin:4px 0 2px;">
    <span class="kpi-value" style="color:${scoreColor}">${score}</span>
    <span class="text-xs font-semibold" style="color:${scoreColor}">${scoreLabel}</span>
  </div>
  <div class="progress progress-sm" style="margin-bottom:12px;">
    <div class="progress-bar" style="width:${score}%;background:${scoreColor}"></div>
  </div>
  <div class="health-breakdown">
    ${breakdownHtml}
  </div>
</div>`;
}

// ── Insight Card ──────────────────────────────────────────────
/**
 * @param {{ icon: string, title: string, text: string, type?: 'tip'|'warning'|'alert'|'success' }} opts
 * @returns {string} HTML string
 */
export function createInsightCard({ icon, title, text, type = 'tip' }) {
  return `
<div class="insight-card ${type}">
  <div class="insight-icon">${icon}</div>
  <div>
    <div class="insight-title">${title}</div>
    <div class="insight-text">${text}</div>
  </div>
</div>`;
}
