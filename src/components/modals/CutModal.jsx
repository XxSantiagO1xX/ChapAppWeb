/**
 * ChapApp - Modal Corte de Caja y Liquidación (CutModal) React
 * Con soporte para Excel Multi-Hoja Estructurado y PDF Ejecutivo
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, calculateEventTotals } from '../../utils/calculations.js';
import { downloadEventCsv } from '../../utils/reports.js';
import { downloadExecutiveExcel } from '../../utils/excelExporter.js';
import { openExecutivePrintReport } from '../../utils/pdfReport.js';
import { Icon } from '../../utils/icons.jsx';

export const CutModal = () => {
  const { activeModal, closeModal, activeEvent, showToast, familyGroups } = useApp();

  if (activeModal !== 'cut' || !activeEvent) return null;

  const totals = calculateEventTotals(activeEvent, null, familyGroups);
  const settledCount = totals.subFamilies.filter((sf) => sf.isFullySettled).length;
  const totalFamilies = totals.subFamilies.length;
  const collectionPercent =
    totals.totalToCollect > 0
      ? Math.min(100, Math.round((totals.totalCollected / totals.totalToCollect) * 100))
      : 100;

  const handleDownloadExcel = () => {
    try {
      downloadExecutiveExcel(activeEvent, totals);
      showToast('Libro de Excel generado y descargado exitosamente', 'success');
    } catch (err) {
      console.error('Error generando Excel:', err);
      showToast('Error al generar archivo Excel', 'error');
    }
  };

  const handleDownloadCsv = () => {
    downloadEventCsv(activeEvent, totals);
    showToast('Archivo CSV descargado', 'info');
  };

  const handlePrintExecutivePdf = () => {
    openExecutivePrintReport(activeEvent, totals);
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
            {/* 4 Métricas principales del corte con acento neón */}
            <div className="cut-modal-metrics-grid">
              <div className="cut-metric-box metric-accent-cyan">
                <div className="cut-metric-top">
                  <span>Total Gastado</span>
                  <Icon name="receipt" size={14} className="text-cyan" />
                </div>
                <strong>{formatCurrency(totals.totalExpenses)}</strong>
                <small className="cut-metric-sub">
                  {formatCurrency(totals.dailyAdultCost)} / día adulto
                </small>
              </div>
              <div className="cut-metric-box metric-accent-emerald">
                <div className="cut-metric-top">
                  <span>Recaudado en Caja</span>
                  <Icon name="trending-up" size={14} className="text-emerald" />
                </div>
                <strong className="text-emerald">{formatCurrency(totals.totalCollected)}</strong>
                <small className="cut-metric-sub">{collectionPercent}% de la meta cobrada</small>
              </div>
              <div className="cut-metric-box metric-accent-amber">
                <div className="cut-metric-top">
                  <span>Reembolsos Pagados</span>
                  <Icon name="wallet" size={14} className="text-amber" />
                </div>
                <strong className="text-amber">{formatCurrency(totals.totalRefunded)}</strong>
                <small className="cut-metric-sub">Saldos a favor liquidados</small>
              </div>
              <div className="cut-metric-box metric-accent-purple">
                <div className="cut-metric-top">
                  <span>Fondo Líquido en Mano</span>
                  <Icon name="cash" size={14} className="text-cyan" />
                </div>
                <strong className="text-cyan">{formatCurrency(totals.cashInHand)}</strong>
                <small className="cut-metric-sub">
                  {totals.pendingToCollect > 0.01
                    ? `Pendiente: ${formatCurrency(totals.pendingToCollect)}`
                    : 'Cuentas al 100%'}
                </small>
              </div>
            </div>

            {/* Tarjeta de Consolidado de Subfamilias */}
            <div className="analytics-section-card glass-panel">
              <div className="analytics-section-header">
                <div className="analytics-section-title">
                  <Icon name="users" size={16} className="text-cyan" />
                  <span>Consolidado de Liquidación por Subfamilia</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge-pill badge-emerald">
                    {settledCount} de {totalFamilies} liquidadas
                  </span>
                </div>
              </div>

              <div className="cut-table-scroll" style={{ maxHeight: '310px', marginTop: 0 }}>
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Subfamilia</th>
                      <th>Asistentes</th>
                      <th className="col-num">Cuota</th>
                      <th className="col-num">Compras</th>
                      <th className="col-num">Abonado</th>
                      <th className="col-num">Saldo / Resta</th>
                      <th style={{ textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totals.subFamilies.map((sf) => (
                      <tr key={sf.subFamilyName}>
                        <td>
                          <div className="cut-sf-cell">
                            <Icon name="users" size={14} className="text-cyan" />
                            <div>
                              <strong>{sf.subFamilyName}</strong>
                              {sf.hasMultipleNuclei && (
                                <div className="cut-rollup-sub">
                                  🔗 Roll-up ({sf.subGroups.length} núcleos)
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-pill badge-neutral">
                            {sf.attendingCount} / {sf.membersCount}
                          </span>
                        </td>
                        <td className="col-num">{formatCurrency(sf.proportionalShare)}</td>
                        <td className="col-num">{formatCurrency(sf.totalPaid)}</td>
                        <td className="col-num text-cyan">
                          {sf.partialPayment > 0 ? formatCurrency(sf.partialPayment) : '$0.00'}
                        </td>
                        <td 
                          className={`col-num ${
                            sf.isFullySettled
                              ? 'text-even'
                              : sf.finalBalance < 0 
                              ? 'text-refund' 
                              : sf.finalBalance > 0 
                              ? 'text-owed' 
                              : 'text-even'
                          }`}
                        >
                          <strong>
                            {sf.isFullySettled
                              ? '$0.00'
                              : sf.finalBalance < 0 
                              ? `Reembolso ${formatCurrency(Math.abs(sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance))}` 
                              : formatCurrency(sf.hasPartialPayment ? sf.remainingBalance : sf.finalBalance)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-status ${sf.isFullySettled ? 'status-active' : 'status-archived'}`}>
                            {sf.isFullySettled
                              ? 'Liquidada'
                              : sf.hasPartialPayment
                              ? `Abono ${sf.paymentProgressPercent}%`
                              : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="dialog-footer" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
            <button type="button" className="btn-pill-glass btn-close-dialog" onClick={closeModal}>
              Cerrar
            </button>
            <button 
              type="button" 
              className="btn-pill-glass" 
              onClick={handleDownloadCsv}
              title="Descargar datos en texto separado por comas"
            >
              <Icon name="download" size={16} />
              <span>Descargar CSV</span>
            </button>
            <button 
              type="button" 
              className="btn-pill-cyan" 
              onClick={handleDownloadExcel}
              title="Descargar libro estructurado con 4 hojas"
            >
              <Icon name="file" size={16} />
              <span>Excel Profesional</span>
            </button>
            <button 
              type="button" 
              className="btn-pill-primary" 
              onClick={handlePrintExecutivePdf}
              title="Generar vista ejecutiva para imprimir o guardar en PDF"
            >
              <Icon name="print" size={16} />
              <span>PDF Ejecutivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CutModal;
