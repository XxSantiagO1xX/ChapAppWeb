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
  Transporte: '#38BDF8',
  Hospedaje: '#FF7A00',
  Varios: '#A855F7',
};

export const AnalyticsModal = () => {
  const { activeModal, closeModal, events = [] } = useApp();

  const [compareIdA, setCompareIdA] = useState(() => (events.length > 1 ? events[1]?.id : events[0]?.id || ''));
  const [compareIdB, setCompareIdB] = useState(() => (events.length > 0 ? events[0]?.id : ''));

  if (activeModal !== 'analytics') return null;

  const analytics = calculateHistoricalAnalytics(events);

  const eventA = events.find((e) => e.id === compareIdA);
  const eventB = events.find((e) => e.id === compareIdB);
  const comparison = compareTwoEvents(eventA, eventB);

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

          <div className="analytics-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 4 Métricas Macro */}
            <div className="hud-metrics-grid">
              <div className="hud-metric-card glass-panel metric-cyan">
                <div className="hud-header">
                  <span className="hud-label">TOTAL HISTÓRICO GASTADO</span>
                  <span className="hud-icon"><Icon name="receipt" size={16} /></span>
                </div>
                <div className="hud-value">{formatCurrency(analytics.totalSpentHistorical)}</div>
                <div className="hud-sub">{analytics.totalEvents} eventos registrados</div>
              </div>

              <div className="hud-metric-card glass-panel metric-emerald">
                <div className="hud-header">
                  <span className="hud-label">RECAUDACIÓN TOTAL</span>
                  <span className="hud-icon"><Icon name="trending-up" size={16} /></span>
                </div>
                <div className="hud-value text-emerald">{formatCurrency(analytics.totalCollectedHistorical)}</div>
                <div className="hud-sub">Fondo común histórico</div>
              </div>

              <div className="hud-metric-card glass-panel metric-amber">
                <div className="hud-header">
                  <span className="hud-label">PROMEDIO POR EVENTO</span>
                  <span className="hud-icon"><Icon name="chart" size={16} /></span>
                </div>
                <div className="hud-value text-amber">{formatCurrency(analytics.averageSpentPerEvent)}</div>
                <div className="hud-sub">Por vacaciones anuales</div>
              </div>

              <div className="hud-metric-card glass-panel metric-purple">
                <div className="hud-header">
                  <span className="hud-label">INTEGRANTES TOTALES</span>
                  <span className="hud-icon"><Icon name="users" size={16} /></span>
                </div>
                <div className="hud-value text-cyan">{analytics.totalParticipantsHistorical}</div>
                <div className="hud-sub">Padrón consolidado</div>
              </div>
            </div>

            {/* Sección 1: Distribución Global por Rubros */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <strong style={{ fontSize: '1.0rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="receipt" size={16} /> Distribución Acumulada por Categoría
                </strong>
                <span className="badge-pill badge-neutral">5 Categorías</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(analytics.categoryDistribution).map(([cat, amt]) => {
                  const pct = totalCatAmount > 0 ? (amt / totalCatAmount) * 100 : 0;
                  const color = CAT_COLORS[cat] || '#00F0FF';
                  return (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                          {cat}
                        </span>
                        <span>
                          <strong>{formatCurrency(amt)}</strong> ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="progress-track-glass" style={{ height: '6px' }}>
                        <div 
                          style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: color, 
                            borderRadius: '9999px',
                            transition: 'width 0.8s ease',
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
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px' }}>
                <strong style={{ display: 'block', fontSize: '1.0rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  ⚖️ Comparador Directo entre Eventos
                </strong>

                <div className="form-row-2" style={{ marginBottom: '14px' }}>
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
                  <div className="cut-modal-metrics-grid">
                    <div className="cut-metric-box">
                      <span>Total Evento A</span>
                      <strong>{formatCurrency(comparison.eventA.totals.totalExpenses)}</strong>
                    </div>
                    <div className="cut-metric-box">
                      <span>Total Evento B</span>
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
            <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '1.0rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="users" size={16} /> Aportaciones y Participación por Subfamilia
                </strong>
                <span className="badge-pill badge-cyan">{analytics.subFamilyHistoricalStats.length} familias</span>
              </div>

              <div className="cut-table-scroll" style={{ maxHeight: '220px' }}>
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
                        <td><strong><Icon name="users" size={14} /> {sf.subFamilyName}</strong></td>
                        <td style={{ textAlign: 'center' }}>{sf.timesParticipated}</td>
                        <td className="col-num text-emerald"><strong>{formatCurrency(sf.totalPaidPurchases)}</strong></td>
                        <td className="col-num">{formatCurrency(sf.totalAssignedQuota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="dialog-footer" style={{ marginTop: '16px' }}>
            <button type="button" className="btn-pill-primary" onClick={closeModal}>
              Cerrar Analítica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
