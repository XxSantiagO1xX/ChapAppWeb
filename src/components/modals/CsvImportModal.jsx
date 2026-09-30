/**
 * ChapApp - Modal Importar Gastos por CSV (CsvImportModal) React
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { addExpense } from '../../services/database.js';
import { parseExpensesCsv, SAMPLE_CSV_TEMPLATE } from '../../utils/csvParser.js';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

export const CsvImportModal = () => {
  const { activeModal, closeModal, activeEvent, refreshActiveEvent, showToast } = useApp();

  const [csvText, setCsvText] = useState('');
  const [parsedExpenses, setParsedExpenses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeModal === 'csvImport') {
      setCsvText('');
      setParsedExpenses([]);
      setSubmitting(false);
    }
  }, [activeModal]);

  // Cada vez que cambie csvText, re-parsear
  useEffect(() => {
    if (!csvText.trim() || !activeEvent) {
      setParsedExpenses([]);
      return;
    }
    const results = parseExpensesCsv(csvText, activeEvent.participants || []);
    setParsedExpenses(results || []);
  }, [csvText, activeEvent]);

  if (activeModal !== 'csvImport' || !activeEvent) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        showToast('Archivo CSV cargado para vista previa', 'info');
      }
    };
    reader.readAsText(file, 'UTF-8');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = () => {
    setCsvText(SAMPLE_CSV_TEMPLATE);
    showToast('Plantilla de ejemplo cargada', 'info');
  };

  const totalImportAmount = parsedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleConfirmImport = async () => {
    if (parsedExpenses.length === 0) return;

    setSubmitting(true);
    try {
      for (const exp of parsedExpenses) {
        await addExpense(activeEvent.id, {
          title: exp.title,
          amount: exp.amount,
          category: exp.category,
          paidBy: exp.paidBy || 'caja_comun',
        });
      }

      await refreshActiveEvent();
      closeModal();
      showToast(`¡Se importaron ${parsedExpenses.length} compras exitosamente!`, 'success');
    } catch (err) {
      console.error('Error importando CSV:', err);
      showToast('Error al importar algunos gastos', 'error');
    } finally {
      setSubmitting(false);
    }
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
              <span className="dialog-badge badge-cyan">IMPORTACIÓN MASIVA</span>
              <h3 className="dialog-title">Importar Gastos e Insumos por CSV</h3>
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

          <div className="csv-import-modal-body">
            <div className="ai-scanner-banner glass-panel">
              <div className="ai-scanner-info">
                <span className="ai-badge">
                  <Icon name="file" size={14} /> Formato CSV
                </span>
                <p className="ai-scanner-desc">
                  Columnas: <strong>Nombre, Categoría, Monto, PagadoPor</strong> (se vincula automáticamente al integrante).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={handleLoadSample} 
                  className="btn-pill-glass" 
                  style={{ fontSize: '0.8rem' }}
                >
                  <Icon name="file" size={14} />
                  <span>Cargar Ejemplo</span>
                </button>
                <label className="btn-pill-cyan" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                  <Icon name="upload" size={14} />
                  <span>Subir .CSV</span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".csv,.txt" 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="csv-text-input">Pega o edita el contenido CSV aquí:</label>
              <textarea 
                id="csv-text-input" 
                className="glass-input" 
                rows={5} 
                placeholder="Nombre,Categoría,Monto,PagadoPor..."
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
            </div>

            <div id="csv-preview-section" style={{ marginTop: '14px' }}>
              <div className="picker-header">
                <span className="picker-title">
                  Vista Previa de Gastos ({parsedExpenses.length} detectados)
                </span>
                <span className="badge-pill badge-emerald">
                  Total: {formatCurrency(totalImportAmount)}
                </span>
              </div>

              <div className="cut-table-scroll" style={{ maxHeight: '200px' }}>
                {parsedExpenses.length === 0 ? (
                  <p style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Pega datos CSV para generar la vista previa.
                  </p>
                ) : (
                  <table className="pos-table">
                    <thead>
                      <tr>
                        <th>Concepto</th>
                        <th>Categoría</th>
                        <th>Pagado Por</th>
                        <th className="col-num">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedExpenses.map((exp, idx) => (
                        <tr key={idx}>
                          <td><strong>{exp.title}</strong></td>
                          <td><span className="badge-pill badge-category">{exp.category}</span></td>
                          <td>{exp.payerName || 'Caja General'}</td>
                          <td className="col-num"><strong>{formatCurrency(exp.amount)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button type="button" className="btn-pill-glass" onClick={closeModal}>
              Cancelar
            </button>
            <button 
              type="button" 
              className="btn-pill-primary" 
              onClick={handleConfirmImport}
              disabled={parsedExpenses.length === 0 || submitting}
            >
              <Icon name="check" size={16} />
              <span>{submitting ? 'Importando...' : `Confirmar e Importar (${parsedExpenses.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CsvImportModal;
