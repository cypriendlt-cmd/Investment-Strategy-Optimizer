// ============================================================
// Stratify — Transaction Table Component
// ============================================================

// ── Sort state ────────────────────────────────────────────────
let sortField = 'date';
let sortDir   = 'desc';
let _tableData = [];

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style:                'currency',
    currency:             'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}

const CATEGORY_COLORS = {
  'Alimentation':  '#10B981',
  'Revenus':       '#0891B2',
  'Transport':     '#F59E0B',
  'Loisirs':       '#8B5CF6',
  'Investissement':'#1E4096',
  'Shopping':      '#EC4899',
  'Logement':      '#6B7280',
  'Santé':         '#EF4444',
  'Abonnements':   '#F97316',
};

const CATEGORY_EMOJIS = {
  'Alimentation':  '🛒',
  'Revenus':       '💰',
  'Transport':     '🚆',
  'Loisirs':       '🎬',
  'Investissement':'📈',
  'Shopping':      '🛍️',
  'Logement':      '🏠',
  'Santé':         '⚕️',
  'Abonnements':   '📱',
};

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#6B7280';
}

function getCategoryEmoji(cat) {
  return CATEGORY_EMOJIS[cat] || '💳';
}

const SORT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 5 12 19"/><polyline points="6 8 12 2 18 8"/><polyline points="6 16 12 22 18 16"/></svg>`;
const SORT_UP   = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
const SORT_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

// ── Sort logic ────────────────────────────────────────────────
function sortTransactions(data, field, dir) {
  return [...data].sort((a, b) => {
    let av = a[field];
    let bv = b[field];
    if (field === 'amount') { av = Math.abs(av); bv = Math.abs(bv); }
    if (field === 'date')   { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Row renderer ─────────────────────────────────────────────
function renderRow(tx) {
  const isIncome   = tx.type === 'income';
  const amtClass   = isIncome ? 'amount-positive' : 'amount-negative';
  const amtSign    = isIncome ? '+' : '−';
  const catColor   = getCategoryColor(tx.category);
  const catEmoji   = getCategoryEmoji(tx.category);
  const initials   = tx.merchant.slice(0, 2).toUpperCase();

  return `
<tr>
  <td class="date-cell">${formatDate(tx.date)}</td>
  <td>
    <div class="merchant-cell">
      <div class="merchant-icon" style="background:${catColor}22;color:${catColor};">${catEmoji}</div>
      <span class="merchant-name">${tx.merchant}</span>
    </div>
  </td>
  <td>
    <span class="badge" style="background:${catColor}18;color:${catColor};">
      ${tx.category}
    </span>
  </td>
  <td class="${amtClass}">${amtSign} ${formatCurrency(tx.amount)}</td>
  <td><span class="account-pill">${tx.account}</span></td>
</tr>`;
}

// ── Table header renderer ─────────────────────────────────────
function renderHeader() {
  const cols = [
    { field: 'date',     label: 'Date',       sortable: true },
    { field: 'merchant', label: 'Marchand',   sortable: true },
    { field: 'category', label: 'Catégorie',  sortable: true },
    { field: 'amount',   label: 'Montant',    sortable: true },
    { field: 'account',  label: 'Compte',     sortable: false },
  ];

  return cols.map(({ field, label, sortable }) => {
    if (!sortable) return `<th>${label}</th>`;
    const isActive = sortField === field;
    const icon = isActive ? (sortDir === 'asc' ? SORT_UP : SORT_DOWN) : SORT_ICON;
    return `
<th class="sortable${isActive ? ' sort-active' : ''}" data-sort="${field}">
  ${label}<span class="sort-icon">${icon}</span>
</th>`;
  }).join('');
}

// ── Table HTML builder ────────────────────────────────────────
function buildTableHTML(data) {
  const sorted = sortTransactions(data, sortField, sortDir);
  return `
<div class="table-wrapper">
  <table class="data-table" id="txTable">
    <thead>
      <tr>${renderHeader()}</tr>
    </thead>
    <tbody>
      ${sorted.map(renderRow).join('')}
    </tbody>
  </table>
</div>`;
}

// ── Public API ────────────────────────────────────────────────
/**
 * Creates the full transaction table HTML, wrapped in a card.
 *
 * @param {Array<{date:string, merchant:string, category:string, amount:number, account:string, type:string}>} transactions
 * @returns {string} HTML string
 */
export function createTransactionTable(transactions) {
  _tableData = transactions;

  const totalIncome  = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);

  return `
<div class="card">
  <div class="table-section-header">
    <div>
      <h3 style="font-size:0.875rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">
        Transactions récentes
      </h3>
      <p style="font-size:0.8125rem;color:var(--text-muted);margin:0;">
        ${transactions.length} transactions · Mars 2026
      </p>
    </div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--color-success);flex-shrink:0;"></span>
        <span style="font-size:0.8125rem;color:var(--text-muted);">Revenus</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:0.8125rem;font-weight:700;color:var(--color-success);">
          +${new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(totalIncome)}
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--color-error);flex-shrink:0;"></span>
        <span style="font-size:0.8125rem;color:var(--text-muted);">Dépenses</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:0.8125rem;font-weight:700;color:var(--color-error);">
          −${new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(totalExpense)}
        </span>
      </div>
    </div>
  </div>
  <div id="txTableContainer">
    ${buildTableHTML(transactions)}
  </div>
</div>`;
}

/**
 * Attaches sort click handlers to the transaction table headers.
 * Must be called after the table HTML is in the DOM.
 */
export function initTableSort() {
  const container = document.getElementById('txTableContainer');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;

    const field = th.dataset.sort;
    if (sortField === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDir   = 'desc';
    }

    container.innerHTML = buildTableHTML(_tableData);
  });
}
