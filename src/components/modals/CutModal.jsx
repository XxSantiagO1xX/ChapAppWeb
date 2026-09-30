/**
 * ChapApp - Modal Corte de Caja y Liquidación (CutModal) React
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { downloadEventCsv } from '../../utils/reports.js';
import { Icon } from '../../utils/icons.jsx';

export const CutModal = () => {
  const { activeModal, closeModal, activeEvent } = useApp();

  if (activeModal !== 'cut' || !activeEvent) return null;

  const totals = calculateEventTotals(activeEvent);

  const handleDownloadCsv = () => {
    downloadEventCsv(activeEvent, totals);
  };

  const handlePrint = () => {
    window.print();
  };

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
              <span className="dialog-badge badge-emerald">CORTE DE CAJA Y LIQUIDACIÓN</span>
              <h3 className="dialog-title">
                Corte de Caja: {activeEvent.title} ({activeEvent.year})
              </h3>
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

          <div className="event-cut-body">
            {/* 4 Métricas principales del corte */}
            <div className="cut-modal-metrics-grid">
              <div className="cut-metric-box">
                <span>Total Gastado</span>
                <strong>{formatCurrency(totals.totalExpenses)}</strong>
              </div>
              <div className="cut-metric-box">
                <span>Recaudado en Caja</span>
                <strong className="text-emerald">{formatCurrency(totals.totalCollected)}</strong>
              </div>
              <div className="cut-metric-box">
                <span>Reembolsos Pagados</span>
                <strong className="text-amber">{formatCurrency(totals.totalRefunded)}</strong>
              </div>
              <div className="cut-metric-box">
                <span>Fondo Líquido en Mano</span>
                <strong className="text-cyan">{formatCurrency(totals.cashInHand)}</strong>
              </div>
            </div>

            <h4 style={{ margin: '20px 0 10px', fontSize: '1rem', fontWeight: 800 }}>
              Consolidado de Subfamilias
            </h4>

            <div className="cut-table-scroll" style={{ maxHeight: '320px' }}>
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Subfamilia</th>
                    <th>Asistentes</th>
                    <th className="col-num">Cuota</th>
                    <th className="col-num">Compras</th>
                    <th className="col-num">Saldo Neto</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.subFamilies.map((sf) => (
                    <tr key={sf.subFamilyName}>
                      <td>
                        <strong>
                          <Icon name="users" size={14} /> {sf.subFamilyName}
                        </strong>
                      </td>
                      <td>
                        {sf.attendingCount} de {sf.membersCount}
                      </td>
                      <td className="col-num">{formatCurrency(sf.proportionalShare)}</td>
                      <td className="col-num">{formatCurrency(sf.totalPaid)}</td>
                      <td 
                        className={`col-num ${
                          sf.finalBalance < 0 
                            ? 'text-refund' 
                            : sf.finalBalance > 0 
                            ? 'text-owed' 
                            : 'text-even'
                        }`}
                      >
                        <strong>
                          {sf.finalBalance < 0 
                            ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` 
                            : formatCurrency(sf.finalBalance)}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-status ${sf.isFullySettled ? 'status-active' : 'status-archived'}`}>
                          {sf.isFullySettled ? 'Liquidada' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-pill-glass btn-close-dialog" onClick={closeModal}>
              Cerrar
            </button>
            <button 
              type="button" 
              className="btn-pill-glass" 
              onClick={handleDownloadCsv}
            >
              <Icon name="download" size={16} />
              <span>Descargar CSV</span>
            </button>
            <button 
              type="button" 
              className="btn-pill-primary" 
              onClick={handlePrint}
            >
              <Icon name="print" size={16} />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CutModal;
