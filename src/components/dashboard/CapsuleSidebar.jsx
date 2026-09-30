/**
 * ChapApp - Barra Lateral Flotante en Cápsula (CapsuleSidebar) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';

export const CapsuleSidebar = () => {
  const { 
    activeEvent, 
    activeDashboardTab, 
    setActiveDashboardTab, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed,
    openModal 
  } = useApp();

  if (!activeEvent) return null;

  const totals = calculateEventTotals(activeEvent);

  return (
    <aside 
      id="floating-capsule-sidebar" 
      className={`floating-capsule-sidebar glass-panel ${isSidebarCollapsed ? 'collapsed' : ''}`} 
      aria-label="Navegación del evento"
    >
      {/* Botón Colapsar / Expandir Barra Lateral (Destacado Neón) */}
      <button 
        type="button"
        id="btn-toggle-capsule-sidebar" 
        className="capsule-toggle-btn" 
        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
        title={isSidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'} 
        aria-label={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        <Icon name={isSidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
      </button>

      {/* Grupo de Pestañas en Cápsula */}
      <div className="capsule-tabs-group">
        {/* Tab 1: Corte y Tickets */}
        <button 
          type="button"
          className={`capsule-tab-item dash-tab-btn ${activeDashboardTab === 'summary' ? 'active' : ''}`} 
          onClick={() => setActiveDashboardTab('summary')}
          title="1. Corte y Tickets POS"
        >
          <div className="capsule-icon-box">
            <Icon name="grid" size={20} />
          </div>
          <div className="capsule-text-box">
            <span className="capsule-tab-title">Corte y Tickets</span>
            <span className="capsule-tab-sub">Métricas & POS</span>
          </div>
        </button>

        {/* Tab 2: Subfamilias y Asistencia */}
        <button 
          type="button"
          className={`capsule-tab-item dash-tab-btn ${activeDashboardTab === 'subfamilies' ? 'active' : ''}`} 
          onClick={() => setActiveDashboardTab('subfamilies')}
          title="2. Subfamilias y Asistencia"
        >
          <div className="capsule-icon-box">
            <Icon name="users" size={20} />
          </div>
          <div className="capsule-text-box">
            <span className="capsule-tab-title">Subfamilias</span>
            <span className="capsule-tab-sub">{totals.totalAttendingCount} de {activeEvent.participants?.length || 0} asisten</span>
          </div>
          <span className="capsule-count-badge">{activeEvent.participants?.length || 0}</span>
        </button>

        {/* Tab 3: Gastos e Insumos */}
        <button 
          type="button"
          className={`capsule-tab-item dash-tab-btn ${activeDashboardTab === 'expenses' ? 'active' : ''}`} 
          onClick={() => setActiveDashboardTab('expenses')}
          title="3. Gastos Registrados"
        >
          <div className="capsule-icon-box">
            <Icon name="folder" size={20} />
          </div>
          <div className="capsule-text-box">
            <span className="capsule-tab-title">Gastos</span>
            <span className="capsule-tab-sub">{formatCurrency(totals.totalExpenses)}</span>
          </div>
          <span className="capsule-count-badge">{activeEvent.expenses?.length || 0}</span>
        </button>
      </div>

      {/* Accesos Rápidos de Acción en la Cápsula */}
      <div className="capsule-shortcuts-group">
        <button 
          type="button"
          id="btn-capsule-directory" 
          className="capsule-shortcut-btn btn-pill-glass" 
          onClick={() => openModal('directory')}
          title="Directorio Global"
        >
          <div className="capsule-icon-box">
            <Icon name="user-plus" size={18} />
          </div>
          <span className="shortcut-label">Directorio</span>
        </button>
      </div>
    </aside>
  );
};

export default CapsuleSidebar;
