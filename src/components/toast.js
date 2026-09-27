/**
 * ChapApp - Sistema de Notificaciones Toast Glassmorphic
 */

import { renderIcon } from '../utils/icons.js';

export const showToast = (message, type = 'info', duration = 3500) => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
  const toast = document.createElement('div');
  toast.className = `toast-card toast-${type} animate-slide-in`;
  toast.innerHTML = `
    <div class="toast-icon-box">${renderIcon(iconName, { size: 18 })}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="Cerrar">${renderIcon('close', { size: 14 })}</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  };

  closeBtn.addEventListener('click', removeToast);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
};
