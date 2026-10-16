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
  Mantenimiento: {
    hex: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.08)',
    border: 'rgba(56, 189, 248, 0.35)',
    glow: 'rgba(56, 189, 248, 0.16)',
  },
  Salarios: {
    hex: '#FF7A00',
    bg: 'rgba(255, 122, 0, 0.08)',
    border: 'rgba(255, 122, 0, 0.35)',
    glow: 'rgba(255, 122, 0, 0.16)',
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

const CANONICAL_CATEGORIES = [
  { key: 'Comida', label: 'Comida', color: '#F59E0B' },
  { key: 'Bebidas', label: 'Bebidas', color: '#00F0FF' },
  { key: 'Mantenimiento', label: 'Mantenimiento', color: '#38BDF8' },
  { key: 'Salarios', label: 'Salarios', color: '#FF7A00' },
  { key: 'Varios', label: 'Varios', color: '#A855F7' },
];

const normalizeCategory = (cat) => {
  if (!cat) return 'Varios';
  if (cat === 'Transporte') return 'Mantenimiento';
  if (cat === 'Hospedaje') return 'Salarios';
  return CANONICAL_CATEGORIES.some((c) => c.key === cat) ? cat : 'Varios';
};

export const ExpensesList = () => {
  const { activeEvent, refreshActiveEvent, openModal, showToast, familyGroups } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPayer, setSelectedPayer] = useState('ALL');

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent, null, familyGroups);
  const expenses = activeEvent.expenses || [];
  const participants = activeEvent.participants || [];

  const handleEditExpense = (exp) => {
    openModal('quickExpense', { expense: exp });
  };

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

  // Conteos por categoría normalizada
  const categoryCounts = expenses.reduce((acc, exp) => {
    const normCat = normalizeCategory(exp.category);
    acc[normCat] = (acc[normCat] || 0) + 1;
    return acc;
  }, {});

  // Pagadores con gastos registrados en este evento
  const commonCount = expenses.filter(
    (exp) => !exp.paidBy || exp.paidBy === 'caja_comun' || !participants.some((p) => p.id === exp.paidBy)
  ).length;

  const activePayers = participants
    .map((p) => {
      const count = expenses.filter((exp) => exp.paidBy === p.id).length;
      return { id: p.id, name: p.name, count };
    })
    .filter((p) => p.count > 0);

  const filteredExpenses = expenses.filter((exp) => {
    // 1. Filtro por Categoría
    if (selectedCategory !== 'ALL') {
      const normCat = normalizeCategory(exp.category);
      if (normCat !== selectedCategory) return false;
    }

    // 2. Filtro por Pagador
    if (selectedPayer !== 'ALL') {
      const isCommon = !exp.paidBy || exp.paidBy === 'caja_comun' || !participants.some((p) => p.id === exp.paidBy);
      if (selectedPayer === 'caja_comun') {
        if (!isCommon) return false;
      } else if (exp.paidBy !== selectedPayer) {
        return false;
      }
    }

    // 3. Filtro por Texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = (exp.title || '').toLowerCase().includes(q);
      const payer = participants.find((p) => p.id === exp.paidBy);
      const payerName = payer ? payer.name.toLowerCase() : 'caja general';
      const catLabel = normalizeCategory(exp.category).toLowerCase();
      return matchTitle || payerName.includes(q) || catLabel.includes(q);
    }

    return true;
  });

  const filteredSubtotal = filteredExpenses.reduce(
    (sum, exp) => sum + (parseFloat(exp.amount) || 0),
    0
  );

  const hasActiveFilters =
    selectedCategory !== 'ALL' || selectedPayer !== 'ALL' || Boolean(searchTerm.trim());

  const clearAllFilters = () => {
    setSelectedCategory('ALL');
    setSelectedPayer('ALL');
    setSearchTerm('');
  };

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
      <div className="search-input-box" style={{ marginBottom: '12px' }}>
        <span className="search-icon">
          <Icon name="search" size={18} />
        </span>
        <input 
          type="text" 
          id="expenses-search-input" 
          className="glass-input-search" 
          placeholder="Buscar por concepto, rubro o quién pagó..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoComplete="off"
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

      {/* Panel de Filtros Rápidos: Categoría y Pagador */}
      {expenses.length > 0 && (
        <div className="expenses-filters-panel glass-panel">
          {/* Fila 1: Chips de Categoría / Rubro */}
          <div className="expense-filter-row">
            <span className="expense-filter-group-label">Rubro:</span>
            <div className="expense-filter-chips-scroll">
              <button
                type="button"
                className={`expense-filter-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('ALL')}
              >
                <span>Todos</span>
                <span className="chip-count-pill">{expenses.length}</span>
              </button>
              {CANONICAL_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.key] || 0;
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`expense-filter-chip ${isActive ? 'active' : ''}`}
                    style={
                      isActive
                        ? {
                            '--chip-accent': cat.color,
                            borderColor: cat.color,
                            boxShadow: `0 0 12px ${cat.color}33`,
                          }
                        : { '--chip-accent': cat.color }
                    }
                    onClick={() => setSelectedCategory(isActive ? 'ALL' : cat.key)}
                  >
                    <span
                      className="chip-category-dot"
                      style={{ background: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
                    ></span>
                    <span>{cat.label}</span>
                    {count > 0 && <span className="chip-count-pill">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 2: Chips de Pagador */}
          <div className="expense-filter-row">
            <span className="expense-filter-group-label">Pagó:</span>
            <div className="expense-filter-chips-scroll">
              <button
                type="button"
                className={`expense-filter-chip ${selectedPayer === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedPayer('ALL')}
              >
                <span>Todos</span>
              </button>
              {commonCount > 0 && (
                <button
                  type="button"
                  className={`expense-filter-chip ${selectedPayer === 'caja_comun' ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedPayer(selectedPayer === 'caja_comun' ? 'ALL' : 'caja_comun')
                  }
                >
                  <span>💳 Caja General</span>
                  <span className="chip-count-pill">{commonCount}</span>
                </button>
              )}
              {activePayers.map((payer) => {
                const isActive = selectedPayer === payer.id;
                return (
                  <button
                    key={payer.id}
                    type="button"
                    className={`expense-filter-chip ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedPayer(isActive ? 'ALL' : payer.id)}
                  >
                    <Icon name="user" size={12} />
                    <span>{payer.name}</span>
                    <span className="chip-count-pill">{payer.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de resumen cuando hay algún filtro activo */}
          {hasActiveFilters && (
            <div className="expenses-filter-summary animate-fade-in">
              <span className="expenses-filter-summary-text">
                Mostrando <strong>{filteredExpenses.length}</strong> de {expenses.length}{' '}
                {expenses.length === 1 ? 'compra' : 'compras'} • Subtotal:{' '}
                <strong className="text-cyan">{formatCurrency(filteredSubtotal)}</strong>
              </span>
              <button
                type="button"
                className="btn-clear-filters-pill"
                onClick={clearAllFilters}
              >
                <Icon name="close" size={12} />
                <span>Limpiar filtros</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="expenses-list-container">
        {filteredExpenses.length === 0 ? (
          <p className="empty-text">No se han registrado compras ni gastos que coincidan.</p>
        ) : (
          filteredExpenses.map((exp) => {
            const payer = participants.find((p) => p.id === exp.paidBy);
            const payerName = payer ? payer.name : 'Caja General';
            const categoryKey = exp.category || 'Varios';
            const normCategory = normalizeCategory(categoryKey);
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
                  <div className="expense-card-actions">
                    <button 
                      type="button"
                      className="btn-icon-edit-subtle"
                      onClick={() => handleEditExpense(exp)}
                      title="Editar gasto"
                      aria-label="Editar gasto"
                    >
                      <Icon name="edit" size={13} />
                    </button>
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
                  <span
                    className="expense-category-tag"
                    style={{
                      color: theme.hex,
                      borderColor: theme.border,
                      background: theme.bg,
                    }}
                  >
                    {normCategory}
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
