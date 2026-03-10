// ============================================================
// Stratify — Input Component Factories
// ============================================================

/**
 * Creates a labelled text input group.
 *
 * @param {{ label: string, placeholder?: string, value?: string, type?: string, id: string, hint?: string }} opts
 * @returns {string} HTML string
 */
export function createTextInput({ label, placeholder = '', value = '', type = 'text', id, hint }) {
  return `
<div class="input-group">
  ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
  <input
    type="${type}"
    id="${id}"
    name="${id}"
    class="form-input"
    placeholder="${placeholder}"
    value="${value}"
    autocomplete="off"
  >
  ${hint ? `<span class="form-hint text-xs text-muted">${hint}</span>` : ''}
</div>`;
}

/**
 * Creates a labelled numeric input group (monospace, right-aligned).
 *
 * @param {{ label: string, value?: number, min?: number, max?: number, step?: number, id: string, prefix?: string, suffix?: string }} opts
 * @returns {string} HTML string
 */
export function createNumberInput({ label, value = '', min, max, step = 1, id, prefix, suffix }) {
  const minAttr  = min  != null ? `min="${min}"`  : '';
  const maxAttr  = max  != null ? `max="${max}"`  : '';
  const hasAffix = prefix || suffix;

  if (hasAffix) {
    return `
<div class="input-group">
  ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
  <div style="position:relative;display:flex;align-items:center;">
    ${prefix ? `<span style="position:absolute;left:12px;color:var(--text-muted);font-family:'IBM Plex Mono',monospace;font-size:0.875rem;">${prefix}</span>` : ''}
    <input
      type="number"
      id="${id}"
      name="${id}"
      class="form-input input-number"
      value="${value}"
      ${minAttr} ${maxAttr}
      step="${step}"
      style="${prefix ? 'padding-left:28px;' : ''}${suffix ? 'padding-right:36px;' : ''}"
    >
    ${suffix ? `<span style="position:absolute;right:12px;color:var(--text-muted);font-family:'IBM Plex Mono',monospace;font-size:0.875rem;">${suffix}</span>` : ''}
  </div>
</div>`;
  }

  return `
<div class="input-group">
  ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
  <input
    type="number"
    id="${id}"
    name="${id}"
    class="form-input input-number"
    value="${value}"
    ${minAttr} ${maxAttr}
    step="${step}"
  >
</div>`;
}

/**
 * Creates a labelled select dropdown.
 *
 * @param {{ label: string, options: Array<{value: string, label: string}>, value?: string, id: string }} opts
 * @returns {string} HTML string
 */
export function createSelect({ label, options = [], value = '', id }) {
  const optionsHtml = options
    .map((o) => `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`)
    .join('');

  return `
<div class="input-group">
  ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
  <select id="${id}" name="${id}" class="form-select">
    ${optionsHtml}
  </select>
</div>`;
}

/**
 * Creates a labelled date picker input.
 *
 * @param {{ label: string, value?: string, id: string }} opts
 * @returns {string} HTML string
 */
export function createDatePicker({ label, value = '', id }) {
  const calIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  return `
<div class="input-group">
  ${label ? `<label class="form-label" for="${id}">${label}</label>` : ''}
  <div style="position:relative;display:flex;align-items:center;">
    <span style="position:absolute;left:12px;color:var(--text-muted);pointer-events:none;">${calIcon}</span>
    <input
      type="date"
      id="${id}"
      name="${id}"
      class="form-input"
      value="${value}"
      style="padding-left:36px;"
    >
  </div>
</div>`;
}

/**
 * Creates a search input with built-in debounce.
 *
 * @param {{ placeholder?: string, id: string, onSearch: Function, debounce?: number }} opts
 * @returns {HTMLDivElement}
 */
export function createSearchInput({ placeholder = 'Rechercher...', id, onSearch, debounce = 300 }) {
  const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;display:flex;align-items:center;';
  wrapper.innerHTML = `
    <span style="position:absolute;left:12px;color:var(--text-muted);pointer-events:none;">${searchIcon}</span>
    <input type="text" id="${id}" class="form-input" placeholder="${placeholder}" style="padding-left:36px;" autocomplete="off">
  `;

  let timer;
  const input = wrapper.querySelector('input');
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => onSearch && onSearch(input.value), debounce);
  });

  return wrapper;
}
