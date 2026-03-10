// ============================================================
// Stratify — Notification System
// ============================================================

let notifContainer = null;

const NOTIF_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Initialises the notification container.
 * Must be called once after the DOM is ready.
 */
export function initNotifications() {
  // Use existing container if present
  notifContainer = document.getElementById('notifications');
  if (!notifContainer) {
    notifContainer = document.createElement('div');
    notifContainer.id = 'notifications';
    notifContainer.className = 'notification-container';
    document.body.appendChild(notifContainer);
  }
  notifContainer.className = 'notification-container';
}

/**
 * Shows a notification toast.
 *
 * @param {{
 *   title: string,
 *   message?: string,
 *   type?: 'success'|'warning'|'error'|'info',
 *   duration?: number,
 * }} opts
 */
export function showNotification({ title, message = '', type = 'info', duration = 4000 }) {
  if (!notifContainer) initNotifications();

  const notif  = document.createElement('div');
  notif.className = `notification notification-${type}`;
  notif.setAttribute('role', 'alert');
  notif.setAttribute('aria-live', 'polite');

  notif.innerHTML = `
    <div class="notification-icon">${NOTIF_ICONS[type] || NOTIF_ICONS.info}</div>
    <div class="notification-body">
      <div class="notification-title">${title}</div>
      ${message ? `<div class="notification-message">${message}</div>` : ''}
    </div>
    <button class="notification-close" aria-label="Fermer">${CLOSE_ICON}</button>
    <div class="notification-progress" style="animation-duration:${duration}ms"></div>
  `;

  notifContainer.appendChild(notif);

  // Close button
  notif.querySelector('.notification-close').addEventListener('click', () => dismiss(notif));

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(notif), duration);

  // Pause progress on hover
  notif.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    const bar = notif.querySelector('.notification-progress');
    if (bar) bar.style.animationPlayState = 'paused';
  });

  notif.addEventListener('mouseleave', () => {
    const bar = notif.querySelector('.notification-progress');
    if (bar) bar.style.animationPlayState = 'running';
    setTimeout(() => dismiss(notif), 1500);
  });

  return notif;
}

/**
 * Dismisses a notification with slide-out animation.
 * @param {HTMLElement} notif
 */
function dismiss(notif) {
  if (!notif || notif.classList.contains('hiding')) return;
  notif.classList.add('hiding');
  notif.addEventListener('animationend', () => {
    notif.remove();
  }, { once: true });
}

/**
 * Convenience wrappers.
 */
export const notify = {
  success: (title, message, duration)  => showNotification({ title, message, type: 'success', duration }),
  warning: (title, message, duration)  => showNotification({ title, message, type: 'warning', duration }),
  error:   (title, message, duration)  => showNotification({ title, message, type: 'error',   duration }),
  info:    (title, message, duration)  => showNotification({ title, message, type: 'info',    duration }),
};
