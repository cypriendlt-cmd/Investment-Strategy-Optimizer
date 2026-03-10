// ============================================================
// Stratify — Button Component Factory
// ============================================================

/**
 * Creates a button DOM element.
 *
 * @param {string} text            - Button label text.
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {{ icon?: string, onClick?: Function, disabled?: boolean, loading?: boolean, type?: string }} options
 * @returns {HTMLButtonElement}
 */
export function createButton(text, variant = 'primary', size = 'md', options = {}) {
  const { icon, onClick, disabled = false, loading = false, type = 'button' } = options;

  const btn = document.createElement('button');
  btn.type = type;

  const sizeClass = size === 'md' ? '' : `btn-${size}`;
  btn.className = ['btn', `btn-${variant}`, sizeClass].filter(Boolean).join(' ');

  if (disabled || loading) {
    btn.disabled = true;
  }

  if (loading) {
    btn.innerHTML = `
      <svg class="btn-spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      ${text}
    `;
  } else if (icon) {
    btn.innerHTML = `${icon}<span>${text}</span>`;
  } else {
    btn.textContent = text;
  }

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}

/**
 * Creates an icon-only button.
 *
 * @param {string} iconSvg   - SVG string for the icon.
 * @param {string} title     - Tooltip / aria-label text.
 * @param {Function} onClick - Click handler.
 * @returns {HTMLButtonElement}
 */
export function createIconButton(iconSvg, title, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-icon';
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = iconSvg;

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}

/**
 * Creates a group of toggle/tab buttons.
 *
 * @param {Array<{id: string, label: string}>} items
 * @param {string} activeId
 * @param {Function} onChange - Called with the selected id.
 * @returns {HTMLDivElement}
 */
export function createButtonGroup(items, activeId, onChange) {
  const group = document.createElement('div');
  group.className = 'chart-tabs';

  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chart-tab${item.id === activeId ? ' active' : ''}`;
    btn.textContent = item.label;
    btn.dataset.id = item.id;

    btn.addEventListener('click', () => {
      group.querySelectorAll('.chart-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (onChange) onChange(item.id);
    });

    group.appendChild(btn);
  });

  return group;
}

// Inject spinner keyframes once
if (!document.getElementById('btn-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'btn-spinner-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
