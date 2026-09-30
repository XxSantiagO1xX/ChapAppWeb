/**
 * ChapApp - Modal Gasto Rápido con Escáner Google Gemini Vision (QuickExpenseModal) React
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { addExpense } from '../../services/database.js';
import { extractDataFromReceipt, getGeminiApiKey, setGeminiApiKey } from '../../services/geminiScanner.js';
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

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Comida');
  const [payerType, setPayerType] = useState('common'); // 'common' | 'member'
  const [selectedPayer, setSelectedPayer] = useState(null); // participant object or null
  const [payerSearch, setPayerSearch] = useState('');
  const [selectedSubFamilyFilter, setSelectedSubFamilyFilter] = useState('all');

  const [isAiScanning, setIsAiScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highlightInputs, setHighlightInputs] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeModal === 'quickExpense') {
      setAmount('');
      setTitle('');
      setCategory('Comida');
      setPayerType('common');
      setSelectedPayer(null);
      setPayerSearch('');
      setSelectedSubFamilyFilter('all');
      setIsAiScanning(false);
      setSubmitting(false);
      setHighlightInputs(false);
    }
  }, [activeModal]);

  if (activeModal !== 'quickExpense' || !activeEvent) return null;

  const participants = activeEvent.participants || [];

  // Subfamilias únicas para filtros
  const uniqueSubFamilies = Array.from(new Set(participants.map((p) => p.subFamily || 'General')));

  // Filtrado de participantes para buscador predictivo
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

  // Escaneo con Google Gemini
  const handleReceiptFileChange = async (e) => {
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
        if (extracted.amount > 0) {
          setAmount(String(extracted.amount));
        }
        if (extracted.title) {
          setTitle(extracted.title);
        }
        if (extracted.category && CATEGORIES.some((c) => c.name === extracted.category)) {
          setCategory(extracted.category);
        }

        setHighlightInputs(true);
        setTimeout(() => setHighlightInputs(false), 2000);
        showToast(`¡Ticket analizado!: "${extracted.title}" ($${Number(extracted.amount).toFixed(2)})`, 'success');
      }
    } catch (err) {
      console.error('Error analizando ticket con Gemini:', err);
      showToast(`Error al procesar ticket: ${err.message || 'Error de conexión'}. Ingresa los datos manuales.`, 'error');
    } finally {
      setIsAiScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Guardar Gasto
  const handleSubmit = async (e) => {
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

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-md animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className="dialog-badge badge-cyan">REGISTRO DE GASTO</span>
              <h3 className="dialog-title">Registrar Nueva Compra</h3>
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

          {/* Banner de Escaneo Inteligente con IA Google Gemini */}
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
                  ref={fileInputRef}
                  accept="image/*" 
                  capture="environment" 
                  style={{ display: 'none' }} 
                  onChange={handleReceiptFileChange}
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

          <form onSubmit={handleSubmit} className="dialog-form">
            <div className="expense-form-split-grid">
              {/* Columna Izquierda: Datos del Gasto */}
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

                  {/* Toggle Fondo Común vs Integrante */}
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

                  {/* Caso 1: Fondo Común */}
                  {payerType === 'common' && (
                    <div className="payer-common-banner glass-panel animate-fade-in">
                      <div className="common-banner-icon">💳</div>
                      <div className="common-banner-text">
                        <strong>Gasto General / Fondo Común</strong>
                        <span>Se divide entre todos sin generar saldo a favor personal.</span>
                      </div>
                    </div>
                  )}

                  {/* Caso 2: Integrante específico */}
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
                          {/* Buscador predictivo */}
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

                          {/* Chips de subfamilias para filtrar rápidamente */}
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

                          {/* Lista de resultados filtrables en tiempo real */}
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

              {/* Columna Derecha: Selector de Categorías con Colores */}
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
        </div>
      </div>
    </div>
  );
};

export default QuickExpenseModal;
