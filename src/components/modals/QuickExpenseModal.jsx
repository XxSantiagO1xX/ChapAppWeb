/**
 * ChapApp - Modal Gasto Rápido con Escáner Google Gemini Vision & Procesamiento por Lotes (Batch) React
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { addExpense, batchAddExpenses } from '../../services/database.js';
import { 
  extractDataFromReceipt, 
  batchExtractDataFromReceipts, 
  getGeminiApiKey, 
  setGeminiApiKey 
} from '../../services/geminiScanner.js';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

const CATEGORIES = [
  { name: 'Comida', color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.65)', class: 'cat-comida' },
  { name: 'Bebidas', color: '#00F0FF', glow: 'rgba(0, 240, 255, 0.65)', class: 'cat-bebidas' },
  { name: 'Transporte', color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.65)', class: 'cat-transporte' },
  { name: 'Hospedaje', color: '#FF7A00', glow: 'rgba(255, 122, 0, 0.65)', class: 'cat-hospedaje' },
  { name: 'Varios', color: '#A855F7', glow: 'rgba(168, 85, 247, 0.65)', class: 'cat-varios' },
];

export const QuickExpenseModal = () => {
  const { activeModal, closeModal, activeEvent, refreshActiveEvent, showToast } = useApp();

  // Modo: 'single' (Individual) | 'batch' (Lote Masivo con IA)
  const [mode, setMode] = useState('single');

  // Estado Modo Individual
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Comida');
  const [payerType, setPayerType] = useState('common'); // 'common' | 'member'
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [payerSearch, setPayerSearch] = useState('');
  const [selectedSubFamilyFilter, setSelectedSubFamilyFilter] = useState('all');

  // Estado Modo Lotes (Batch)
  const [batchItems, setBatchItems] = useState([]);
  const [batchProgress, setBatchProgress] = useState({ active: false, current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [isAiScanning, setIsAiScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highlightInputs, setHighlightInputs] = useState(false);

  const singleFileInputRef = useRef(null);
  const batchFileInputRef = useRef(null);

  useEffect(() => {
    if (activeModal === 'quickExpense') {
      setMode('single');
      setAmount('');
      setTitle('');
      setCategory('Comida');
      setPayerType('common');
      setSelectedPayer(null);
      setPayerSearch('');
      setSelectedSubFamilyFilter('all');
      setBatchItems([]);
      setBatchProgress({ active: false, current: 0, total: 0 });
      setIsAiScanning(false);
      setSubmitting(false);
      setHighlightInputs(false);
    }
  }, [activeModal]);

  if (activeModal !== 'quickExpense' || !activeEvent) return null;

  const participants = activeEvent.participants || [];
  const uniqueSubFamilies = Array.from(new Set(participants.map((p) => p.subFamily || 'General')));

  // Filtrado de participantes para buscador individual
  const filteredParticipants = participants.filter((p) => {
    if (selectedSubFamilyFilter !== 'all' && (p.subFamily || 'General') !== selectedSubFamilyFilter) {
      return false;
    }
    if (payerSearch.trim()) {
      const q = payerSearch.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSf = (p.subFamily || '').toLowerCase().includes(q);
      return matchName || matchSf;
    }
    return true;
  });

  // Configurar clave de Gemini
  const handleConfigKey = () => {
    const currentKey = getGeminiApiKey();
    const newKey = window.prompt(
      'Ingresa tu Google Gemini API Key (obtén tu clave gratuita en aistudio.google.com):',
      currentKey || ''
    );
    if (newKey !== null) {
      if (newKey.trim()) {
        setGeminiApiKey(newKey.trim());
        showToast('API Key de Google Gemini guardada con éxito', 'success');
      } else {
        localStorage.removeItem('chapapp_gemini_api_key');
        showToast('API Key de Gemini eliminada', 'info');
      }
    }
  };

  // Escaneo Individual con Google Gemini
  const handleSingleReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    try {
      let extracted = null;
      try {
        extracted = await extractDataFromReceipt(file);
      } catch (scanErr) {
        if (
          scanErr.message === 'MISSING_API_KEY' || 
          scanErr.code === 'INVALID_API_KEY' || 
          scanErr.message?.includes('inválida') || 
          scanErr.message?.includes('API key')
        ) {
          const currentKey = getGeminiApiKey();
          const userKey = window.prompt(
            'Ingresa tu API Key de Google Gemini para escanear tickets (obtén tu clave gratuita en aistudio.google.com):',
            currentKey || ''
          );
          if (userKey && userKey.trim()) {
            setGeminiApiKey(userKey.trim());
            extracted = await extractDataFromReceipt(file);
          } else {
            showToast('Se requiere una API Key de Gemini para autocompletar con IA', 'info');
            return;
          }
        } else {
          throw scanErr;
        }
      }

      if (extracted) {
        if (extracted.amount > 0) setAmount(String(extracted.amount));
        if (extracted.title) setTitle(extracted.title);
        if (extracted.category && CATEGORIES.some((c) => c.name === extracted.category)) {
          setCategory(extracted.category);
        }

        setHighlightInputs(true);
        setTimeout(() => setHighlightInputs(false), 2000);
        showToast(`¡Ticket analizado!: "${extracted.title}" ($${Number(extracted.amount).toFixed(2)})`, 'success');
      }
    } catch (err) {
      console.error('Error analizando ticket:', err);
      showToast(`Error al procesar ticket: ${err.message || 'Error de conexión'}. Ingresa datos manuales.`, 'error');
    } finally {
      setIsAiScanning(false);
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
    }
  };

  // Escaneo por Lotes (Batch) con Google Gemini
  const handleBatchFiles = async (filesList) => {
    const files = Array.from(filesList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      showToast('Selecciona archivos de imagen válidos (PNG, JPG, WEBP)', 'info');
      return;
    }

    setBatchProgress({ active: true, current: 0, total: files.length });

    try {
      const results = await batchExtractDataFromReceipts(files, ({ current, total, item }) => {
        setBatchProgress({ active: true, current, total });
        setBatchItems((prev) => [...prev, { ...item, paidBy: 'caja_comun' }]);
      });

      showToast(`¡Lote completado! ${results.filter((r) => r.status === 'success').length} de ${files.length} tickets leídos.`, 'success');
    } catch (err) {
      console.error('Error procesando lote:', err);
      showToast('Error procesando algunos tickets del lote', 'error');
    } finally {
      setBatchProgress((prev) => ({ ...prev, active: false }));
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    }
  };

  const handleBatchFileChange = (e) => {
    if (e.target.files) handleBatchFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) handleBatchFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Actualizar un campo en un item del lote
  const updateBatchItem = (id, field, value) => {
    setBatchItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeBatchItem = (id) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Guardar Gasto Individual
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Por favor ingresa un monto válido', 'info');
      return;
    }
    if (!title.trim()) {
      showToast('Por favor ingresa el concepto del gasto', 'info');
      return;
    }

    let paidById = 'caja_comun';
    if (payerType === 'member') {
      if (!selectedPayer) {
        showToast('Por favor selecciona qué integrante pagó esta compra', 'info');
        return;
      }
      paidById = selectedPayer.id;
    }

    setSubmitting(true);
    try {
      await addExpense(activeEvent.id, {
        title: title.trim(),
        amount: parsedAmount,
        category,
        paidBy: paidById,
      });

      await refreshActiveEvent();
      closeModal();
      showToast(`Gasto "${title.trim()}" registrado correctamente`, 'success');
    } catch (err) {
      console.error('Error guardando gasto:', err);
      showToast('Error al registrar gasto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Guardar Lote de Gastos
  const handleBatchSubmit = async () => {
    const toSave = batchItems.filter((item) => item.included && item.amount > 0 && item.title.trim());
    if (toSave.length === 0) {
      showToast('No hay compras válidas seleccionadas para guardar', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const expensesPayload = toSave.map((item) => ({
        title: item.title.trim(),
        amount: parseFloat(item.amount) || 0,
        category: item.category || 'Comida',
        paidBy: item.paidBy === 'caja_comun' ? null : item.paidBy,
      }));

      await batchAddExpenses(activeEvent.id, expensesPayload);
      await refreshActiveEvent();
      closeModal();
      showToast(`¡Se registraron ${toSave.length} compras exitosamente!`, 'success');
    } catch (err) {
      console.error('Error guardando lote de gastos:', err);
      showToast('Error al guardar las compras del lote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const batchTotalAmount = batchItems
    .filter((item) => item.included)
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className={`glass-dialog ${mode === 'batch' ? 'modal-lg' : 'modal-md'} animate-scale-in`} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge badge-cyan">REGISTRO DE GASTO</span>
              <h3 className="dialog-title">
                {mode === 'single' ? 'Registrar Nueva Compra' : 'Escaneo Masivo por Lotes (Batch)'}
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

          {/* Selector de Modo: Individual vs Lotes con IA */}
          <div className="payer-type-toggle-bar" style={{ marginBottom: '14px' }}>
            <button 
              type="button" 
              className={`payer-type-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => setMode('single')}
            >
              <Icon name="receipt" size={15} />
              <span>Gasto Individual</span>
            </button>
            <button 
              type="button" 
              className={`payer-type-btn ${mode === 'batch' ? 'active' : ''}`}
              onClick={() => setMode('batch')}
            >
              <Icon name="sparkles" size={15} />
              <span>Lote de Tickets IA (Batch)</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* MODO 1: GASTO INDIVIDUAL                                        */}
          {/* ============================================================== */}
          {mode === 'single' && (
            <>
              {/* Banner de Escaneo Inteligente Individual */}
              <div className="ai-scanner-banner glass-panel">
                <div className="ai-scanner-info">
                  <span className="ai-badge">
                    <Icon name="sparkles" size={13} /> Google Gemini Vision
                  </span>
                  <p className="ai-scanner-desc">Sube foto de tu ticket o nota para autocompletar monto y concepto.</p>
                </div>
                <div className="ai-scanner-actions">
                  <button 
                    type="button" 
                    onClick={handleConfigKey} 
                    className="btn-config-key" 
                    title="Configurar API Key de Google Gemini" 
                    aria-label="Configurar API Key"
                  >
                    <Icon name="key" size={14} />
                  </button>
                  <label className="btn-pill-cyan ai-upload-btn" style={{ cursor: 'pointer' }}>
                    <Icon name="camera" size={14} />
                    <span>Escanear Ticket</span>
                    <input 
                      type="file" 
                      ref={singleFileInputRef}
                      accept="image/*" 
                      capture="environment" 
                      style={{ display: 'none' }} 
                      onChange={handleSingleReceiptChange}
                    />
                  </label>
                </div>
              </div>

              {isAiScanning && (
                <div className="ai-loading-box animate-fade-in">
                  <div className="spinner-glass"></div>
                  <p>Analizando ticket con Google Gemini Flash...</p>
                </div>
              )}

              <form onSubmit={handleSingleSubmit} className="dialog-form">
                <div className="expense-form-split-grid">
                  <div className="expense-fields-col">
                    <div className="form-group">
                      <label htmlFor="expense-amount">Monto Total ($ MXN) *</label>
                      <div className="amount-input-wrapper">
                        <span className="amount-currency-prefix">$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          id="expense-amount" 
                          className={`glass-input expense-amount-input ${highlightInputs ? 'glow-highlight' : ''}`}
                          placeholder="1000.50" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required 
                          inputMode="decimal" 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="expense-title">Concepto / Comercio *</label>
                      <input 
                        type="text" 
                        id="expense-title" 
                        className={`glass-input ${highlightInputs ? 'glow-highlight' : ''}`}
                        placeholder="ej. Supermercado, Carnicería, Gasolina" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required 
                        autocomplete="off"
                      />
                    </div>

                    {/* Selector de Pagador */}
                    <div className="form-group payer-selector-group">
                      <label className="payer-main-label">¿Quién pagó este gasto? *</label>

                      <div className="payer-type-toggle-bar">
                        <button 
                          type="button" 
                          className={`payer-type-btn ${payerType === 'common' ? 'active' : ''}`}
                          onClick={() => {
                            setPayerType('common');
                            setSelectedPayer(null);
                          }}
                        >
                          <Icon name="credit-card" size={14} />
                          <span>Fondo Común</span>
                        </button>
                        <button 
                          type="button" 
                          className={`payer-type-btn ${payerType === 'member' ? 'active' : ''}`}
                          onClick={() => setPayerType('member')}
                        >
                          <Icon name="user" size={14} />
                          <span>Integrante</span>
                        </button>
                      </div>

                      {payerType === 'common' && (
                        <div className="payer-common-banner glass-panel animate-fade-in">
                          <div className="common-banner-icon">💳</div>
                          <div className="common-banner-text">
                            <strong>Gasto General / Fondo Común</strong>
                            <span>Se divide entre todos sin generar saldo a favor personal.</span>
                          </div>
                        </div>
                      )}

                      {payerType === 'member' && (
                        <div className="payer-member-picker-box animate-fade-in">
                          {selectedPayer ? (
                            <div className="payer-selected-card glass-panel">
                              <div className="selected-member-left">
                                <div className="selected-avatar-circle">👤</div>
                                <div className="selected-member-info">
                                  <strong>{selectedPayer.name}</strong>
                                  <span>{selectedPayer.subFamily || 'Familia General'}</span>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setSelectedPayer(null)} 
                                className="btn-pill-glass btn-sm-pill"
                              >
                                Cambiar
                              </button>
                            </div>
                          ) : (
                            <div className="payer-search-section">
                              <div className="payer-search-input-box">
                                <span className="payer-search-icon">
                                  <Icon name="search" size={14} />
                                </span>
                                <input 
                                  type="text" 
                                  className="glass-input payer-search-input" 
                                  placeholder="Escribe nombre o familia..." 
                                  value={payerSearch}
                                  onChange={(e) => setPayerSearch(e.target.value)}
                                  autocomplete="off"
                                />
                              </div>

                              {uniqueSubFamilies.length > 1 && (
                                <div className="payer-subfamily-chips-scroll">
                                  <button 
                                    type="button"
                                    className={`subfamily-filter-chip ${selectedSubFamilyFilter === 'all' ? 'active' : ''}`}
                                    onClick={() => setSelectedSubFamilyFilter('all')}
                                  >
                                    Todos
                                  </button>
                                  {uniqueSubFamilies.map((sf) => (
                                    <button 
                                      key={sf}
                                      type="button"
                                      className={`subfamily-filter-chip ${selectedSubFamilyFilter === 'all' ? '' : selectedSubFamilyFilter === sf ? 'active' : ''}`}
                                      onClick={() => setSelectedSubFamilyFilter(sf)}
                                    >
                                      {sf}
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="payer-results-list-scroll">
                                {filteredParticipants.length === 0 ? (
                                  <p className="empty-hint-text">No se encontraron integrantes.</p>
                                ) : (
                                  filteredParticipants.map((p) => (
                                    <div 
                                      key={p.id}
                                      className="payer-result-row"
                                      onClick={() => setSelectedPayer(p)}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      <div className="payer-row-avatar">👤</div>
                                      <div className="payer-row-text">
                                        <span className="payer-row-name">{p.name}</span>
                                        <span className="payer-row-sub">{p.subFamily || 'General'}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="expense-category-col">
                    <label className="category-col-label">Categoría del Gasto</label>
                    <div className="category-vertical-selector">
                      {CATEGORIES.map((cat) => (
                        <button 
                          key={cat.name}
                          type="button" 
                          className={`cat-pill-btn ${cat.class} ${category === cat.name ? 'active' : ''}`}
                          onClick={() => setCategory(cat.name)}
                        >
                          <span 
                            className="cat-color-dot" 
                            style={{ background: cat.color, boxShadow: `0 0 8px ${cat.glow}` }}
                          ></span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dialog-footer">
                  <button type="button" className="btn-pill-glass" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-pill-primary" 
                    disabled={submitting}
                  >
                    <Icon name="check" size={16} />
                    <span>{submitting ? 'Guardando...' : 'Guardar Gasto'}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ============================================================== */}
          {/* MODO 2: ESCANEO POR LOTES (BATCH PROCESSING)                   */}
          {/* ============================================================== */}
          {mode === 'batch' && (
            <div className="batch-processing-container animate-fade-in">
              {/* Dropzone de arrastre múltiple */}
              <div 
                className={`batch-dropzone glass-panel ${isDragging ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                  border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  background: isDragging ? 'rgba(0, 240, 255, 0.08)' : 'var(--surface-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition-normal)',
                }}
                onClick={() => batchFileInputRef.current?.click()}
              >
                <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
                  <Icon name="upload" size={32} />
                </div>
                <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Arrastra aquí varios tickets o haz clic para seleccionarlos
                </strong>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Procesa múltiples notas en paralelo con Google Gemini Vision.
                </p>
                <input 
                  type="file" 
                  ref={batchFileInputRef}
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleBatchFileChange}
                />
              </div>

              {/* Barra de progreso de lectura masiva */}
              {batchProgress.active && (
                <div className="batch-progress-box glass-panel animate-fade-in" style={{ marginTop: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                      Analizando ticket {batchProgress.current} de {batchProgress.total} con Gemini...
                    </span>
                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                  </div>
                  <div className="progress-track-glass" style={{ height: '8px' }}>
                    <div 
                      className="progress-fill-emerald" 
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tabla de Revisión Pre-Guardado */}
              {batchItems.length > 0 && (
                <div className="batch-review-section" style={{ marginTop: '16px' }}>
                  <div className="picker-header">
                    <span className="picker-title">
                      Tickets Analizados ({batchItems.filter((b) => b.included).length} seleccionados)
                    </span>
                    <span className="badge-pill badge-emerald">
                      Total Lote: {formatCurrency(batchTotalAmount)}
                    </span>
                  </div>

                  <div className="cut-table-scroll" style={{ maxHeight: '280px', marginTop: '8px' }}>
                    <table className="pos-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>✓</th>
                          <th>Concepto / Comercio</th>
                          <th style={{ width: '130px' }}>Categoría</th>
                          <th style={{ width: '150px' }}>Pagado Por</th>
                          <th className="col-num" style={{ width: '110px' }}>Monto ($)</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchItems.map((item) => (
                          <tr key={item.id} style={{ opacity: item.included ? 1 : 0.45 }}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={item.included}
                                onChange={(e) => updateBatchItem(item.id, 'included', e.target.checked)}
                                style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="glass-input sm" 
                                value={item.title}
                                onChange={(e) => updateBatchItem(item.id, 'title', e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td>
                              <select 
                                className="glass-select sm"
                                value={item.category}
                                onChange={(e) => updateBatchItem(item.id, 'category', e.target.value)}
                                style={{ padding: '4px 6px', fontSize: '0.80rem' }}
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select 
                                className="glass-select sm"
                                value={item.paidBy || 'caja_comun'}
                                onChange={(e) => updateBatchItem(item.id, 'paidBy', e.target.value)}
                                style={{ padding: '4px 6px', fontSize: '0.80rem' }}
                              >
                                <option value="caja_comun">Fondo Común</option>
                                {participants.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="col-num">
                              <input 
                                type="number" 
                                step="0.01"
                                className="glass-input sm" 
                                value={item.amount}
                                onChange={(e) => updateBatchItem(item.id, 'amount', e.target.value)}
                                style={{ padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn-icon-danger" 
                                onClick={() => removeBatchItem(item.id)}
                                title="Quitar de la lista"
                              >
                                <Icon name="trash" size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="dialog-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-pill-glass" onClick={closeModal}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-pill-primary" 
                  onClick={handleBatchSubmit}
                  disabled={batchItems.filter((b) => b.included).length === 0 || submitting}
                >
                  <Icon name="check" size={16} />
                  <span>
                    {submitting 
                      ? 'Registrando...' 
                      : `Guardar ${batchItems.filter((b) => b.included).length} Compras (${formatCurrency(batchTotalAmount)})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickExpenseModal;
