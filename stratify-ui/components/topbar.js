// ============================================================
// Stratify — Topbar Component
// ============================================================

const TOPBAR_ICONS = {
  hamburger: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,

  search: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,

  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,

  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,

  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,

  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
};

/**
 * Creates the topbar HTML string.
 * @returns {string} HTML string for the topbar.
 */
export function createTopbar() {
  return `
<header class="topbar" id="topbar">
  <div class="topbar-left">
    <button class="btn-icon sidebar-toggle" id="sidebarToggle" title="Menu" aria-label="Ouvrir le menu">
      ${TOPBAR_ICONS.hamburger}
    </button>

    <div class="topbar-search">
      ${TOPBAR_ICONS.search}
      <input
        type="text"
        placeholder="Rechercher un actif, une transaction..."
        class="search-input"
        id="globalSearch"
        autocomplete="off"
      >
    </div>
  </div>

  <div class="topbar-right">
    <button class="btn-icon" id="themeToggle" title="Changer de thème" aria-label="Basculer le thème">
      <span class="theme-icon-sun">${TOPBAR_ICONS.sun}</span>
      <span class="theme-icon-moon" style="display:none">${TOPBAR_ICONS.moon}</span>
    </button>

    <button class="btn-icon notification-btn" id="notificationBtn" title="Notifications" aria-label="Notifications">
      ${TOPBAR_ICONS.bell}
      <span class="notification-dot"></span>
    </button>

    <div class="user-avatar" id="userMenu" role="button" tabindex="0" aria-label="Menu utilisateur">
      <img
        src="https://ui-avatars.com/api/?name=C+D&background=0891B2&color=fff&size=32"
        alt="Cyprien D."
      >
      <span class="user-name">Cyprien D.</span>
      ${TOPBAR_ICONS.chevronDown}
    </div>
  </div>
</header>`;
}

/**
 * Initialises theme toggle logic for the topbar.
 * Call after topbar HTML is injected into the DOM.
 */
export function initTopbar() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const html       = document.documentElement;
  const sunIcon    = themeToggle.querySelector('.theme-icon-sun');
  const moonIcon   = themeToggle.querySelector('.theme-icon-moon');

  const applyTheme = (theme) => {
    html.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    if (sunIcon)  sunIcon.style.display  = isDark ? 'none'  : 'flex';
    if (moonIcon) moonIcon.style.display = isDark ? 'flex' : 'none';
    localStorage.setItem('stratify-theme', theme);
  };

  // Load saved preference
  const saved = localStorage.getItem('stratify-theme') || 'dark';
  applyTheme(saved);

  themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');

    // Trigger chart re-render event for theme-aware charts
    window.dispatchEvent(new CustomEvent('stratify:theme-change', {
      detail: { theme: html.getAttribute('data-theme') },
    }));
  });
}
