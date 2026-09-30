/**
 * ChapApp - Vista del Dashboard del Evento (EventDashboard) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';
import CapsuleSidebar from './CapsuleSidebar.jsx';
import CollectionDial from './CollectionDial.jsx';
import Category3DBars from './Category3DBars.jsx';
import PosTicketView from './PosTicketView.jsx';
import SubfamiliesTab from './SubfamiliesTab.jsx';
import ExpensesList from './ExpensesList.jsx';

export const EventDashboard = () => {
  const { activeEvent, activeDashboardTab, isSidebarCollapsed, openModal, selectEvent } = useApp();

  if (!activeEvent) {
    return (
      <div className="empty-state-box glass-panel animate-fade-in">
        <div className="empty-icon-circle">
          <Icon name="alert" size={36} />
        </div>
        <h3 className="empty-title">Evento no encontrado</h3>
        <p className="empty-description">El evento seleccionado no existe o fue eliminado.</p>
        <button type="button" onClick={() => selectEvent(null)} className="btn-pill-primary">
          Volver al inicio
        </button>
      </div>
    );
  }

  const totals = calculateEventTotals(activeEvent);
  const collectionPercent =
    totals.totalToCollect > 0
      ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
      : 100;

  return (
    <div className={`dashboard-layout-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <CapsuleSidebar />

      <main className="dashboard-main-content">
        {activeDashboardTab === 'summary' && (
          <div className="tab-summary-content animate-fade-in">
            {/* 4 Tarjetas HUD Métricas Superiores */}
            <div className="hud-metrics-grid">
              <div className="hud-metric-card glass-panel metric-cyan">
                <div className="hud-header">
                  <span className="hud-label">TOTAL GASTADO</span>
                  <span className="hud-icon"><Icon name="receipt" size={16} /></span>
                </div>
                <div className="hud-value">{formatCurrency(totals.totalExpenses)}</div>
                <div className="hud-sub">{activeEvent.expenses?.length || 0} compras registradas</div>
              </div>

              <div className="hud-metric-card glass-panel metric-emerald">
                <div className="hud-header">
                  <span className="hud-label">RECAUDADO</span>
                  <span className="hud-icon"><Icon name="trending-up" size={16} /></span>
                </div>
                <div className="hud-value text-emerald">{formatCurrency(totals.totalCollected)}</div>
                <div className="hud-sub">
                  <span className="badge-emerald">{collectionPercent}% de la meta</span>
                </div>
              </div>

              <div className="hud-metric-card glass-panel metric-amber">
                <div className="hud-header">
                  <span className="hud-label">PENDIENTE POR COBRAR</span>
                  <span className="hud-icon"><Icon name="wallet" size={16} /></span>
                </div>
                <div className="hud-value text-amber">{formatCurrency(totals.totalPendingToCollect)}</div>
                <div className="hud-sub">
                  {totals.subFamilies.filter((sf) => !sf.isFullySettled).length} familias pendientes
                </div>
              </div>

              <div className="hud-metric-card glass-panel metric-purple">
                <div className="hud-header">
                  <span className="hud-label">EN CAJA (FONDO EN MANO)</span>
                  <span className="hud-icon"><Icon name="cash" size={16} /></span>
                </div>
                <div className="hud-value text-cyan">{formatCurrency(totals.cashInHand)}</div>
                <div className="hud-sub">Líquido disponible</div>
              </div>
            </div>

            {/* 2 Gráficas HUD Liquid Glass 3D */}
            <div className="charts-row-grid">
              <CollectionDial 
                collected={totals.totalCollected} 
                total={totals.totalExpenses} 
                percentage={collectionPercent} 
              />
              <Category3DBars 
                expenses={activeEvent.expenses || []} 
                totalExpenses={totals.totalExpenses} 
              />
            </div>

            {/* Cuentas y Tickets de Cobro POS */}
            <div className="section-title-box">
              <h3 className="section-heading">Cuentas y Tickets de Cobro POS</h3>
              <p className="section-subheading">Panel interactivo de subfamilias y emisión de tickets de cobro individuales.</p>
            </div>

            <PosTicketView />
          </div>
        )}

        {activeDashboardTab === 'subfamilies' && <SubfamiliesTab />}

        {activeDashboardTab === 'expenses' && <ExpensesList />}
      </main>

      {/* Botón de Acción Flotante (+ Gasto Rápido) Fijo Permanentemente en la parte inferior */}
      <button 
        type="button"
        id="btn-fab-add-expense" 
        onClick={() => openModal('quickExpense')}
        className="floating-fab-btn btn-pill-cyan animate-bounce-subtle" 
        title="Registrar Gasto Rápido con IA"
        aria-label="Registrar Gasto Rápido"
      >
        <Icon name="plus" size={18} />
        <span>Gasto Rápido</span>
      </button>
    </div>
  );
};

export default EventDashboard;
