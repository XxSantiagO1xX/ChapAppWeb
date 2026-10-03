/**
 * ChapApp - Pestaña 3: Gastos Registrados (ExpensesList) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { deleteExpense } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

const CATEGORY_THEME_COLORS = {
  Comida: {
    hex: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: 'rgba(245, 158, 11, 0.16)',
  },
  Bebidas: {
    hex: '#00F0FF',
    bg: 'rgba(0, 240, 255, 0.08)',
    border: 'rgba(0, 240, 255, 0.35)',
    glow: 'rgba(0, 240, 255, 0.16)',
  },
  Transporte: {
    hex: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.08)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.16)',
  },
  Hospedaje: {
    hex: '#FF7A00',
    bg: 'rgba(255, 122, 0, 0.08)',
    border: 'rgba(255, 122, 0, 0.35)',
    glow: 'rgba(255, 122, 0, 0.16)',
  },
  Varios: {
    hex: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.08)',
    border: 'rgba(168, 85, 247, 0.35)',
    glow: 'rgba(168, 85, 247, 0.16)',
  },
};

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
          <span className="tab-section-badge">REGISTRO DE GASTOS</span>
          <h3 className="section-heading">Gastos Registrados</h3>
          <p className="section-subheading">
            Total gastado: {formatCurrency(totals.totalExpenses)} en {expenses.length} {expenses.length === 1 ? 'compra' : 'compras'}.
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
            const categoryKey = exp.category || 'Varios';
            const theme = CATEGORY_THEME_COLORS[categoryKey] || CATEGORY_THEME_COLORS.Varios;

            return (
              <div 
                key={exp.id} 
                className="expense-card-item glass-panel animate-fade-in"
                style={{
                  '--cat-color': theme.hex,
                  '--cat-bg': theme.bg,
                  '--cat-border': theme.border,
                  '--cat-glow': theme.glow,
                }}
              >
                <div className="expense-card-header">
                  <h4 className="expense-title" title={exp.title}>
                    {exp.title}
                  </h4>
                  <button 
                    type="button"
                    className="btn-icon-danger-subtle btn-delete-expense"
                    onClick={() => handleDeleteExpense(exp)}
                    title="Eliminar gasto"
                    aria-label="Eliminar gasto"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>

                <div className="expense-payer-row">
                  <span className="expense-payer-label">Pagado por</span>
                  <span className="expense-payer-name" title={payerName}>
                    {payerName}
                  </span>
                </div>

                <div className="expense-card-footer">
                  <span className="expense-amount-val" style={{ color: theme.hex }}>
                    {formatCurrency(exp.amount)}
                  </span>
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
