/**
 * ChapApp - Modal de Analítica Histórica y Estadísticas Globales (AnalyticsModal) React
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { calculateHistoricalAnalytics, compareTwoEvents } from '../../utils/analytics.js';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

const CAT_COLORS = {
  Comida: '#F59E0B',
  Bebidas: '#00F0FF',
  Mantenimiento: '#38BDF8',
  Salarios: '#FF7A00',
  Transporte: '#38BDF8',
  Hospedaje: '#FF7A00',
  Varios: '#A855F7',
};

export const AnalyticsModal = () => {
  const { activeModal, closeModal, events = [], familyGroups } = useApp();

  const [compareIdA, setCompareIdA] = useState(() => (events.length > 1 ? events[1]?.id : events[0]?.id || ''));
  const [compareIdB, setCompareIdB] = useState(() => (events.length > 0 ? events[0]?.id : ''));

  if (activeModal !== 'analytics') return null;

  const analytics = calculateHistoricalAnalytics(events, familyGroups);

  const eventA = events.find((e) => e.id === compareIdA);
  const eventB = events.find((e) => e.id === compareIdB);
  const comparison = compareTwoEvents(eventA, eventB, familyGroups);

  const totalCatAmount = Object.values(analytics.categoryDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-lg animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge badge-cyan">TELEMETRÍA CONTABLE</span>
              <h3 className="dialog-title">Analítica Histórica y Estadísticas Globales</h3>
            </div>
            <button 
              type="button" 
              className="btn-icon-glass btn-close-dialog" 
              onClick={closeModal} 
              aria-label="Cerrar"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="analytics-modal-body">
            {/* 4 Métricas Macro Compactas con acento neón */}
            <div className="cut-modal-metrics-grid">
              <div className="cut-metric-box metric-accent-cyan">
                <div className="cut-metric-top">
                  <span>Total Histórico Gastado</span>
                  <Icon name="receipt" size={14} className="text-cyan" />
                </div>
                <strong>{formatCurrency(analytics.totalSpentHistorical)}</strong>
                <small className="cut-metric-sub">{analytics.totalEvents} eventos registrados</small>
              </div>

              <div className="cut-metric-box metric-accent-emerald">
                <div className="cut-metric-top">
                  <span>Recaudación Histórica</span>
                  <Icon name="trending-up" size={14} className="text-emerald" />
                </div>
                <strong className="text-emerald">{formatCurrency(analytics.totalCollectedHistorical)}</strong>
                <small className="cut-metric-sub">Fondo común consolidado</small>
              </div>

              <div className="cut-metric-box metric-accent-amber">
                <div className="cut-metric-top">
                  <span>Promedio por Evento</span>
                  <Icon name="chart" size={14} className="text-amber" />
                </div>
                <strong className="text-amber">{formatCurrency(analytics.averageSpentPerEvent)}</strong>
                <small className="cut-metric-sub">Por vacaciones anuales</small>
              </div>

              <div className="cut-metric-box metric-accent-purple">
                <div className="cut-metric-top">
                  <span>Asistencias Acumuladas</span>
                  <Icon name="users" size={14} className="text-cyan" />
                </div>
                <strong className="text-cyan">{analytics.totalParticipantsHistorical}</strong>
                <small className="cut-metric-sub">Padrón histórico total</small>
              </div>
            </div>

            {/* Sección 1: Distribución Global por Rubros */}
            <div className="analytics-section-card glass-panel">
              <div className="analytics-section-header">
                <div className="analytics-section-title">
                  <Icon name="receipt" size={16} className="text-cyan" />
                  <span>Distribución Acumulada por Categoría</span>
                </div>
                <span className="badge-pill badge-neutral">5 Rubros</span>
              </div>

              <div className="analytics-categories-list">
                {Object.entries(analytics.categoryDistribution).map(([cat, amt]) => {
                  const pct = totalCatAmount > 0 ? (amt / totalCatAmount) * 100 : 0;
                  const color = CAT_COLORS[cat] || '#00F0FF';
                  return (
                    <div key={cat} className="analytics-category-item">
                      <div className="analytics-category-row">
                        <span className="analytics-category-name">
                          <span
                            className="analytics-category-dot"
                            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                          />
                          {cat}
                        </span>
                        <span className="analytics-category-stats">
                          <strong>{formatCurrency(amt)}</strong>
                          <span className="analytics-category-pct">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="progress-track-glass" style={{ height: '6px' }}>
                        <div 
                          style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: color, 
                            boxShadow: `0 0 8px ${color}66`,
                            borderRadius: '9999px',
                            transition: 'width 0.6s ease',
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sección 2: Comparador de Eventos */}
            {events.length > 1 && (
              <div className="analytics-section-card glass-panel">
                <div className="analytics-section-header">
                  <div className="analytics-section-title">
                    <Icon name="chart" size={16} className="text-amber" />
                    <span>Comparador Directo entre Eventos</span>
                  </div>
                  <span className="badge-pill badge-cyan">A vs B</span>
                </div>

                <div className="form-row-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label>Evento Base (A):</label>
                    <select 
                      className="glass-select" 
                      value={compareIdA} 
                      onChange={(e) => setCompareIdA(e.target.value)}
                    >
                      {events.map((e) => (
                        <option key={e.id} value={e.id}>{e.title} ({e.year})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Evento a Comparar (B):</label>
                    <select 
                      className="glass-select" 
                      value={compareIdB} 
                      onChange={(e) => setCompareIdB(e.target.value)}
                    >
                      {events.map((e) => (
                        <option key={e.id} value={e.id}>{e.title} ({e.year})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {comparison && (
                  <div className="cut-modal-metrics-grid" style={{ marginBottom: 0 }}>
                    <div className="cut-metric-box">
                      <span>Total Evento A ({comparison.eventA.year})</span>
                      <strong>{formatCurrency(comparison.eventA.totals.totalExpenses)}</strong>
                    </div>
                    <div className="cut-metric-box">
                      <span>Total Evento B ({comparison.eventB.year})</span>
                      <strong>{formatCurrency(comparison.eventB.totals.totalExpenses)}</strong>
                    </div>
                    <div className="cut-metric-box">
                      <span>Variación en Gastos</span>
                      <strong className={comparison.diffSpent > 0 ? 'text-amber' : 'text-emerald'}>
                        {comparison.diffSpent > 0 ? '+' : ''}{formatCurrency(comparison.diffSpent)} ({comparison.percentChangeSpent.toFixed(1)}%)
                      </strong>
                    </div>
                    <div className="cut-metric-box">
                      <span>Variación de Asistencia</span>
                      <strong className="text-cyan">
                        {comparison.diffAttendees > 0 ? `+${comparison.diffAttendees}` : comparison.diffAttendees} personas
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección 3: Resumen Histórico por Subfamilia */}
            <div className="analytics-section-card glass-panel">
              <div className="analytics-section-header">
                <div className="analytics-section-title">
                  <Icon name="users" size={16} className="text-emerald" />
                  <span>Aportaciones y Participación por Subfamilia</span>
                </div>
                <span className="badge-pill badge-cyan">{analytics.subFamilyHistoricalStats.length} familias</span>
              </div>

              <div className="cut-table-scroll" style={{ maxHeight: '220px', marginTop: 0 }}>
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Subfamilia</th>
                      <th style={{ textAlign: 'center' }}>Eventos</th>
                      <th className="col-num">Compras Aportadas</th>
                      <th className="col-num">Cuota Asignada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.subFamilyHistoricalStats.map((sf) => (
                      <tr key={sf.subFamilyName}>
                        <td>
                          <div className="cut-sf-cell">
                            <Icon name="users" size={14} className="text-cyan" />
                            <strong>{sf.subFamilyName}</strong>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-pill badge-neutral">{sf.timesParticipated}</span>
                        </td>
                        <td className="col-num text-emerald">
                          <strong>{formatCurrency(sf.totalPaidPurchases)}</strong>
                        </td>
                        <td className="col-num">{formatCurrency(sf.totalAssignedQuota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="dialog-footer" style={{ marginTop: '14px' }}>
            <button type="button" className="btn-pill-primary" onClick={closeModal}>
              <Icon name="check" size={16} />
              <span>Cerrar Analítica</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
