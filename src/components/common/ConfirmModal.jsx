/**
 * ChapApp - Modal de Confirmación React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const ConfirmModal = () => {
  const { activeModal, modalProps, closeModal } = useApp();

  if (activeModal !== 'confirm') return null;

  const { title = '¿Estás seguro?', message = 'Esta acción no se puede deshacer.', variant = 'danger', onConfirm } = modalProps;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeModal();
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-sm animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="dialog-content" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div className="confirm-icon-box" style={{ color: variant === 'danger' ? 'var(--color-coral)' : 'var(--color-primary)', marginTop: '8px' }}>
            <Icon name="alert" size={40} />
          </div>
          <h3 className="confirm-title" id="confirm-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {title}
          </h3>
          <p className="confirm-message" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {message}
          </p>
          <div className="dialog-footer confirm-footer" style={{ width: '100%', justifyContent: 'center' }}>
            <button type="button" className="btn-pill-glass" onClick={closeModal}>
              Cancelar
            </button>
            <button 
              type="button" 
              className={variant === 'danger' ? 'btn-pill-danger' : 'btn-pill-primary'} 
              onClick={handleConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
