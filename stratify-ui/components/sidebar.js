// ============================================================
// Stratify — Sidebar Component
// ============================================================

const ICONS = {
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,

  portfolio: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,

  strategy: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,

  banking: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,

  goals: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,

  dca: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,

  insights: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,

  logout: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
};

/**
 * Creates the sidebar HTML string.
 * @param {string} activeItem - The id of the active nav item.
 * @returns {string} HTML string for the sidebar.
 */
export function createSidebar(activeItem = 'dashboard') {
  const mainItems = [
    { id: 'dashboard', label: 'Dashboard',     icon: ICONS.home },
    { id: 'portfolio', label: 'Portfolio',     icon: ICONS.portfolio },
    { id: 'strategy',  label: 'Strategy Lab',  icon: ICONS.strategy },
    { id: 'banking',   label: 'Banque',        icon: ICONS.banking },
    { id: 'goals',     label: 'Objectifs',     icon: ICONS.goals },
    { id: 'dca',       label: 'DCA',           icon: ICONS.dca },
    { id: 'insights',  label: 'Insights',      icon: ICONS.insights },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Paramètres', icon: ICONS.settings },
  ];

  const renderNavItem = (item) => {
    const isActive = item.id === activeItem;
    return `
      <a href="#" class="nav-item${isActive ? ' active' : ''}" data-page="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>`;
  };

  return `
<aside class="sidebar" id="sidebar">
  <div class="sidebar-logo">
    <img src="../assets/logo.svg" alt="Stratify" class="logo-full">
    <img src="../assets/icon.svg" alt="S" class="logo-icon">
  </div>

  <nav class="sidebar-nav">
    <div class="nav-section">
      <span class="nav-section-label">Principal</span>
      ${mainItems.slice(0, 4).map(renderNavItem).join('')}
    </div>

    <div class="nav-section">
      <span class="nav-section-label">Épargne</span>
      ${mainItems.slice(4).map(renderNavItem).join('')}
    </div>

    <div class="nav-section">
      <span class="nav-section-label">Configuration</span>
      ${bottomItems.map(renderNavItem).join('')}
    </div>
  </nav>

  <div class="sidebar-footer">
    <div class="user-avatar-sidebar">
      <img src="https://ui-avatars.com/api/?name=C+D&background=0891B2&color=fff&size=36" alt="Cyprien D.">
    </div>
    <div class="user-info-sidebar">
      <div class="user-name-sidebar">Cyprien D.</div>
      <div class="user-role-sidebar">Investisseur</div>
    </div>
    <button class="logout-btn" title="Se déconnecter">
      ${ICONS.logout}
    </button>
  </div>
</aside>`;
}

/**
 * Initialises sidebar navigation click handlers and mobile toggle.
 */
export function initSidebarNav() {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.getElementById('sidebarToggle');
  let overlay    = document.querySelector('.sidebar-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  // Mobile toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      overlay.classList.toggle('visible', open);
    });
  }

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });

  // Nav item clicks (SPA-style active state)
  sidebar.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      sidebar.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      item.classList.add('active');

      // Close on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      }
    });
  });
}
