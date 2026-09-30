/**
 * ChapApp - Componente Toast de Notificaciones React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div id="toast-container" className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const iconName = toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert' : 'info';
        return (
          <div key={toast.id} className={`toast-card toast-${toast.type} animate-slide-in`}>
            <div className="toast-icon-box">
              <Icon name={iconName} size={18} />
            </div>
            <div className="toast-message">{toast.message}</div>
            <button 
              type="button" 
              className="toast-close" 
              onClick={() => removeToast(toast.id)} 
              aria-label="Cerrar notificación"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
