/**
 * ChapApp - Pestaña 3: Gastos Registrados (ExpensesList) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { deleteExpense } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const ExpensesList = () => {
  const { activeEvent, refreshActiveEvent, openModal, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent);
  const expenses = activeEvent.expenses || [];
  const participants = activeEvent.participants || [];

  const handleDeleteExpense = (exp) => {
    openModal('confirm', {
      title: '¿Eliminar Gasto?',
      message: `¿Estás seguro de que deseas eliminar la compra "${exp.title}" por ${formatCurrency(exp.amount)}?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteExpense(activeEvent.id, exp.id);
          await refreshActiveEvent();
          showToast(`Gasto "${exp.title}" eliminado`, 'success');
        } catch (err) {
          console.error('Error eliminando gasto:', err);
          showToast('Error al eliminar gasto', 'error');
        }
      },
    });
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchTitle = (exp.title || '').toLowerCase().includes(q);
    const payer = participants.find((p) => p.id === exp.paidBy);
    const payerName = payer ? payer.name.toLowerCase() : 'caja general';
    return matchTitle || payerName.includes(q);
  });

  return (
    <div className="tab-expenses-content animate-fade-in">
      <div className="tab-actions-header">
        <div className="section-title-box">
          <h3 className="section-heading">Gastos Registrados</h3>
          <p className="section-subheading">
            Total gastado: {formatCurrency(totals.totalExpenses)} en {expenses.length} compras.
          </p>
        </div>
        <div className="tab-buttons-group">
          <button 
            type="button" 
            onClick={() => openModal('csvImport')} 
            className="btn-pill-glass"
          >
            <Icon name="upload" size={16} />
            <span>Importar CSV</span>
          </button>
        </div>
      </div>

      {/* Buscador de Gastos y Compras */}
      <div className="search-input-box" style={{ marginBottom: '16px' }}>
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input 
          type="text" 
          id="expenses-search-input" 
          className="glass-input-search" 
          placeholder="Buscar por concepto o quien pagó..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autocomplete="off"
        />
        {searchTerm && (
          <button 
            type="button" 
            className="btn-clear-search" 
            onClick={() => setSearchTerm('')}
            aria-label="Limpiar búsqueda"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div className="expenses-list-container">
        {filteredExpenses.length === 0 ? (
          <p className="empty-text">No se han registrado compras ni gastos que coincidan.</p>
        ) : (
          filteredExpenses.map((exp) => {
            const payer = participants.find((p) => p.id === exp.paidBy);
            const payerName = payer ? payer.name : 'Caja General';

            return (
              <div 
                key={exp.id} 
                className="expense-card-item glass-panel animate-fade-in"
              >
                <div className="expense-icon-box">
                  <Icon name="receipt" size={20} />
                </div>
                <div className="expense-details-col">
                  <h4 className="expense-title">{exp.title}</h4>
                  <div className="expense-meta-row">
                    <span className="badge-pill badge-category">{exp.category || 'Comida'}</span>
                    <span className="expense-payer">
                      Pagado por: <strong>{payerName}</strong>
                    </span>
                  </div>
                </div>
                <div className="expense-amount-col">
                  <span className="expense-amount-val">{formatCurrency(exp.amount)}</span>
                  <button 
                    type="button"
                    className="btn-icon-danger btn-delete-expense"
                    onClick={() => handleDeleteExpense(exp)}
                    title="Eliminar gasto"
                    aria-label="Eliminar gasto"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExpensesList;
