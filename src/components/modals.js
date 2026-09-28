/**
 * ChapApp - Modales Nativos HTML5 (<dialog>)
 * Soporte para cierre nativo, light-dismiss, formularios accesibles, Gemini AI Scanner y Csv Import
 */

import { renderIcon } from '../utils/icons.js';
import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { extractDataFromReceipt, getGeminiApiKey, setGeminiApiKey } from '../services/geminiScanner.js';
import { getGlobalDirectory, saveGlobalDirectory } from '../services/database.js';
import { parseExpensesCsv, SAMPLE_CSV_TEMPLATE } from '../utils/csvParser.js';
import { showToast } from './toast.js';

/**
 * Inicializa y renderiza los contenedores de todos los modales <dialog> en el DOM.
 */
export const mountModals = () => {
  let container = document.getElementById('modals-mount');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modals-mount';
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <!-- 1. Modal Nuevo Evento -->
    <dialog id="modal-new-event" class="glass-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge">NUEVO EVENTO</span>
            <h3 class="dialog-title">Crear Evento Anual</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>
        <form id="form-new-event" class="dialog-form">
          <div class="form-group">
            <label for="new-event-title">Nombre del Evento / Vacaciones *</label>
            <input type="text" id="new-event-title" class="glass-input" placeholder="ej. Vacaciones Chapantongo 2026" required />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="new-event-year">Año *</label>
              <input type="number" id="new-event-year" class="glass-input" value="${new Date().getFullYear()}" required />
            </div>
            <div class="form-group">
              <label for="new-event-days">Número de Días Cobrables</label>
              <input type="number" id="new-event-days" class="glass-input" value="4" min="1" max="30" required />
            </div>
          </div>

          <div class="directory-picker-section">
            <div class="picker-header">
              <span class="picker-title">Importar Integrantes del Directorio Global</span>
              <button type="button" id="btn-select-all-directory" class="btn-link-cyan">Seleccionar Todos</button>
            </div>
            <div id="new-event-directory-list" class="directory-checklist-scroll"></div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-pill-glass btn-close-dialog">Cancelar</button>
            <button type="submit" id="btn-submit-new-event" class="btn-pill-primary">
              ${renderIcon('plus', { size: 16 })}
              <span>Crear Evento</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- 2. Modal Gasto Rápido (+ Escáner con IA Google Gemini) -->
    <!-- 2. Modal Gasto Rápido (+ Escáner con IA Google Gemini) -->
    <dialog id="modal-quick-expense" class="glass-dialog modal-md">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge badge-cyan">REGISTRO DE GASTO</span>
            <h3 class="dialog-title">Registrar Nueva Compra</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>

        <!-- Botón de Escaneo Inteligente con IA (Compacto y Elegante) -->
        <div class="ai-scanner-banner glass-panel">
          <div class="ai-scanner-info">
            <span class="ai-badge">${renderIcon('sparkles', { size: 13 })} Google Gemini Vision</span>
            <p class="ai-scanner-desc">Sube foto de tu ticket o nota para autocompletar monto y concepto.</p>
          </div>
          <div class="ai-scanner-actions">
            <button type="button" id="btn-config-gemini-key" class="btn-config-key" title="Configurar API Key de Google Gemini" aria-label="Configurar API Key">
              ${renderIcon('key', { size: 14 })}
            </button>
            <label class="btn-pill-cyan ai-upload-btn" id="lbl-scan-ticket">
              ${renderIcon('camera', { size: 14 })}
              <span>Escanear Ticket</span>
              <input type="file" id="input-receipt-file" accept="image/*" capture="environment" style="display: none;" />
            </label>
          </div>
        </div>

        <div id="ai-scanning-loader" class="ai-loading-box" style="display: none;">
          <div class="spinner-glass"></div>
          <p>Analizando ticket con Google Gemini Flash...</p>
        </div>

        <form id="form-quick-expense" class="dialog-form">
          <div class="expense-form-split-grid">
            <!-- Columna Izquierda: Datos del Gasto -->
            <div class="expense-fields-col">
              <div class="form-group">
                <label for="expense-amount">Monto Total ($ MXN) *</label>
                <div class="amount-input-wrapper">
                  <span class="amount-currency-prefix">$</span>
                  <input type="number" step="0.01" id="expense-amount" class="glass-input expense-amount-input" placeholder="10000.50" required inputmode="decimal" />
                </div>
              </div>

              <div class="form-group">
                <label for="expense-title">Concepto / Comercio *</label>
                <input type="text" id="expense-title" class="glass-input" placeholder="ej. Supermercado, Gasolina" required />
              </div>

              <div class="form-group payer-selector-group">
                <label class="payer-main-label">¿Quién pagó este gasto? *</label>
                <input type="hidden" id="expense-payer" name="expensePayer" value="caja_comun" />

                <!-- Selector de Tipo de Pago (Fondo Común vs Integrante) -->
                <div class="payer-type-toggle-bar">
                  <button type="button" class="payer-type-btn active" id="btn-payer-type-common" data-type="common">
                    ${renderIcon('credit-card', { size: 14 })}
                    <span>Fondo Común</span>
                  </button>
                  <button type="button" class="payer-type-btn" id="btn-payer-type-member" data-type="member">
                    ${renderIcon('user', { size: 14 })}
                    <span>Integrante</span>
                  </button>
                </div>

                <!-- Estado 1: Tarjeta Informativa de Fondo Común -->
                <div id="payer-common-box" class="payer-common-banner glass-panel">
                  <div class="common-banner-icon">💳</div>
                  <div class="common-banner-text">
                    <strong>Gasto General / Fondo Común</strong>
                    <span>Se divide entre todos sin generar saldo a favor personal.</span>
                  </div>
                </div>

                <!-- Estado 2: Buscador Predictivo de Integrante (70+ personas) -->
                <div id="payer-member-picker" class="payer-member-picker-box" style="display: none;">
                  <!-- Tarjeta del integrante seleccionado -->
                  <div id="payer-selected-card" class="payer-selected-card glass-panel" style="display: none;">
                    <div class="selected-member-left">
                      <div class="selected-avatar-circle" id="selected-payer-avatar">👤</div>
                      <div class="selected-member-info">
                        <strong id="selected-payer-name">Nombre</strong>
                        <span id="selected-payer-subfamily">Subfamilia</span>
                      </div>
                    </div>
                    <button type="button" id="btn-change-selected-payer" class="btn-pill-glass btn-sm-pill">
                      Cambiar
                    </button>
                  </div>

                  <!-- Buscador y Filtros -->
                  <div id="payer-search-section" class="payer-search-section">
                    <!-- Input de búsqueda con icono -->
                    <div class="payer-search-input-box">
                      <span class="payer-search-icon">${renderIcon('search', { size: 14 })}</span>
                      <input 
                        type="text" 
                        id="payer-live-search" 
                        class="glass-input payer-search-input" 
                        placeholder="Escribe nombre o familia..." 
                        autocomplete="off"
                      />
                    </div>

                    <!-- Filtro Rápido de Chips de Subfamilias -->
                    <div id="payer-subfamily-chips" class="payer-subfamily-chips-scroll"></div>

                    <!-- Lista de resultados filtrables en tiempo real -->
                    <div id="payer-results-list" class="payer-results-list-scroll"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Selector Vertical de Categorías con Colores Presupuestarios -->
            <div class="expense-category-col">
              <label class="category-col-label">Categoría del Gasto</label>
              <div class="category-vertical-selector" id="expense-category-pills">
                <button type="button" class="cat-pill-btn cat-comida active" data-cat="Comida">
                  <span class="cat-color-dot" style="background: #F59E0B; box-shadow: 0 0 8px rgba(245, 158, 11, 0.65);"></span>
                  <span>Comida</span>
                </button>
                <button type="button" class="cat-pill-btn cat-bebidas" data-cat="Bebidas">
                  <span class="cat-color-dot" style="background: #00F0FF; box-shadow: 0 0 8px rgba(0, 240, 255, 0.65);"></span>
                  <span>Bebidas</span>
                </button>
                <button type="button" class="cat-pill-btn cat-transporte" data-cat="Transporte">
                  <span class="cat-color-dot" style="background: #38BDF8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.65);"></span>
                  <span>Transporte</span>
                </button>
                <button type="button" class="cat-pill-btn cat-hospedaje" data-cat="Hospedaje">
                  <span class="cat-color-dot" style="background: #FF7A00; box-shadow: 0 0 8px rgba(255, 122, 0, 0.65);"></span>
                  <span>Hospedaje</span>
                </button>
                <button type="button" class="cat-pill-btn cat-varios" data-cat="Varios">
                  <span class="cat-color-dot" style="background: #A855F7; box-shadow: 0 0 8px rgba(168, 85, 247, 0.65);"></span>
                  <span>Varios</span>
                </button>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-pill-glass btn-close-dialog">Cancelar</button>
            <button type="submit" id="btn-submit-expense" class="btn-pill-primary">
              ${renderIcon('check', { size: 16 })}
              <span>Guardar Gasto</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- 3. Modal Agregar Participante -->
    <dialog id="modal-add-participant" class="glass-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge">ASISTENCIA</span>
            <h3 class="dialog-title">Agregar Integrante al Evento</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>
        <form id="form-add-participant" class="dialog-form">
          <div class="form-group">
            <label for="participant-name">Nombre Completo *</label>
            <input type="text" id="participant-name" class="glass-input" placeholder="ej. Don Carlos Santiago" required />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label for="participant-category">Categoría</label>
              <select id="participant-category" class="glass-select">
                <option value="adulto">Adulto (1.0 ud)</option>
                <option value="nino">Niño (0.5 ud)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="participant-weight">Ponderación (Factor)</label>
              <input type="number" step="0.1" id="participant-weight" class="glass-input" value="1.0" min="0.1" max="5.0" />
            </div>
          </div>
          <div class="form-group">
            <label for="participant-subfamily">Subfamilia / Grupo Familiar *</label>
            <input type="text" id="participant-subfamily" class="glass-input" placeholder="ej. Familia Santiago Chapantongo" required list="subfamily-suggestions" />
            <datalist id="subfamily-suggestions">
              <option value="Familia Santiago Chapantongo" />
              <option value="Familia Santiago Velázquez" />
              <option value="Familia Santiago Morales" />
              <option value="Amigos y Primos" />
              <option value="Familia General" />
            </datalist>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-pill-glass btn-close-dialog">Cancelar</button>
            <button type="submit" class="btn-pill-primary">
              ${renderIcon('plus', { size: 16 })}
              <span>Agregar Integrante</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- 4. Modal Importar Gastos por CSV (Completo con Preview) -->
    <dialog id="modal-csv-import" class="glass-dialog modal-lg">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge badge-cyan">IMPORTACIÓN MASIVA</span>
            <h3 class="dialog-title">Importar Gastos e Insumos por CSV</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>

        <div class="csv-import-modal-body">
          <div class="ai-scanner-banner glass-panel">
            <div class="ai-scanner-info">
              <span class="ai-badge">${renderIcon('file', { size: 14 })} Formato CSV</span>
              <p class="ai-scanner-desc">Columnas: <strong>Nombre, Categoría, Monto, PagadoPor</strong> (se vincula automáticamente al integrante).</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btn-load-sample-csv" class="btn-pill-glass" style="font-size: 0.8rem;">
                ${renderIcon('file', { size: 14 })}
                <span>Cargar Ejemplo</span>
              </button>
              <label class="btn-pill-cyan" style="font-size: 0.8rem; cursor: pointer;">
                ${renderIcon('upload', { size: 14 })}
                <span>Subir .CSV</span>
                <input type="file" id="input-csv-file" accept=".csv,.txt" style="display: none;" />
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="csv-text-input">Pega o edita el contenido CSV aquí:</label>
            <textarea id="csv-text-input" class="glass-input" rows="5" placeholder="Nombre,Categoría,Monto,PagadoPor..."></textarea>
          </div>

          <div id="csv-preview-section" style="margin-top: 14px;">
            <div class="picker-header">
              <span class="picker-title" id="csv-preview-title">Vista Previa de Gastos (0 detectados)</span>
              <span class="badge-pill badge-emerald" id="csv-preview-total">$0.00</span>
            </div>
            <div id="csv-preview-table-container" class="cut-table-scroll" style="max-height: 200px;">
              <p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Pega datos CSV para generar la vista previa.</p>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-pill-glass btn-close-dialog">Cancelar</button>
          <button type="button" id="btn-confirm-import-csv" class="btn-pill-primary" disabled>
            ${renderIcon('check', { size: 16 })}
            <span>Confirmar e Importar</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- 5. Modal Directorio Global -->
    <dialog id="modal-global-directory" class="glass-dialog modal-lg">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge">DIRECTORIO MAESTRO</span>
            <h3 class="dialog-title">Directorio Global de Participantes</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>

        <div class="directory-modal-body">
          <div class="directory-top-actions">
            <input type="text" id="directory-search-input" class="glass-input" placeholder="Buscar participante o subfamilia..." />
            <button type="button" id="btn-toggle-add-contact-form" class="btn-pill-primary">
              ${renderIcon('user-plus', { size: 16 })}
              <span>+ Nuevo Contacto</span>
            </button>
          </div>

          <!-- Formulario Plegable para Agregar Contacto -->
          <div id="form-inline-add-contact-wrapper" class="glass-panel" style="display: none; padding: 20px; margin: 14px 0; border-radius: 18px; border: 1px solid var(--border-neon-cyan);">
            <h4 style="font-size: 1.0rem; font-weight: 800; margin-bottom: 14px; color: var(--text-primary);">Agregar Nuevo Integrante al Directorio</h4>
            <div class="form-row-2">
              <div class="form-group">
                <label for="dir-contact-name">Nombre Completo *</label>
                <input type="text" id="dir-contact-name" class="glass-input" placeholder="ej. Carlos Santiago" />
              </div>
              <div class="form-group">
                <label for="dir-contact-subfamily">Subfamilia *</label>
                <input type="text" id="dir-contact-subfamily" class="glass-input" placeholder="ej. Familia Santiago Morales" list="subfamily-suggestions" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label for="dir-contact-category">Categoría</label>
                <select id="dir-contact-category" class="glass-select">
                  <option value="adulto">Adulto (1.0)</option>
                  <option value="nino">Niño (0.5)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="dir-contact-weight">Ponderación</label>
                <input type="number" step="0.1" id="dir-contact-weight" class="glass-input" value="1.0" />
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
              <button type="button" id="btn-cancel-inline-contact" class="btn-pill-glass">Cancelar</button>
              <button type="button" id="btn-save-inline-contact" class="btn-pill-cyan">Guardar en Directorio</button>
            </div>
          </div>

          <div id="directory-items-list" class="directory-cards-list-container" style="margin-top: 12px;"></div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-pill-glass btn-close-dialog">Cerrar</button>
          <button type="button" id="btn-import-selected-to-active-event" class="btn-pill-cyan" style="display: none;">
            ${renderIcon('check', { size: 16 })}
            <span id="btn-import-count-text">Importar Seleccionados</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- 6. Modal Corte General del Evento -->
    <dialog id="modal-event-cut" class="glass-dialog modal-lg">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge badge-emerald">CORTE DE CAJA Y LIQUIDACIÓN</span>
            <h3 class="dialog-title" id="cut-modal-event-title">Resumen Financiero del Evento</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>

        <div class="event-cut-body" id="event-cut-content-mount"></div>

        <div class="dialog-footer">
          <button type="button" class="btn-pill-glass btn-close-dialog">Cerrar</button>
          <button type="button" id="btn-download-csv-cut" class="btn-pill-glass">
            ${renderIcon('download', { size: 16 })}
            <span>Descargar CSV</span>
          </button>
          <button type="button" id="btn-print-cut-pdf" class="btn-pill-primary">
            ${renderIcon('print', { size: 16 })}
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- 7. Modal Confirmación Estilizado -->
    <dialog id="modal-confirm" class="glass-dialog modal-sm">
      <div class="dialog-content" style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px;">
        <div class="confirm-icon-box" id="confirm-icon-mount" style="color: var(--color-coral); margin-top: 8px;">
          ${renderIcon('alert', { size: 40 })}
        </div>
        <h3 class="confirm-title" id="confirm-title" style="font-size: 1.25rem; font-weight: 800;">¿Estás seguro?</h3>
        <p class="confirm-message" id="confirm-message" style="font-size: 0.88rem; color: var(--text-secondary);">Esta acción no se puede deshacer.</p>
        <div class="dialog-footer confirm-footer" style="width: 100%; justify-content: center;">
          <button type="button" class="btn-pill-glass" id="btn-confirm-cancel">Cancelar</button>
          <button type="button" class="btn-pill-danger" id="btn-confirm-accept">Confirmar</button>
        </div>
      </div>
    </dialog>
  `;

  // Añadir eventos de cierre para botones con clase .btn-close-dialog
  container.querySelectorAll('.btn-close-dialog').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const dialog = e.target.closest('dialog');
      if (dialog) dialog.close();
    });
  });

  // Light-dismiss para cerrar al hacer click fuera del contenido del dialog
  container.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  });

  // Listener para configurar la API Key de Google Gemini
  const btnConfigKey = document.getElementById('btn-config-gemini-key');
  if (btnConfigKey) {
    btnConfigKey.addEventListener('click', () => {
      const currentKey = getGeminiApiKey();
      const newKey = window.prompt('Ingresa tu Google Gemini API Key (obtén tu clave gratuita en aistudio.google.com):', currentKey || '');
      if (newKey !== null) {
        if (newKey.trim()) {
          setGeminiApiKey(newKey.trim());
          showToast('API Key de Google Gemini guardada con éxito', 'success');
        } else {
          localStorage.removeItem('chapapp_gemini_api_key');
          showToast('API Key de Gemini eliminada', 'info');
        }
      }
    });
  }

  // Listener para el Escáner de Tickets con Google Gemini
  const receiptFileInput = document.getElementById('input-receipt-file');
  const aiLoader = document.getElementById('ai-scanning-loader');

  if (receiptFileInput) {
    receiptFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      let apiKey = getGeminiApiKey();
      if (!apiKey) {
        const userKey = window.prompt('Para escanear tickets con IA, ingresa tu API Key de Google Gemini (puedes obtenerla gratis en aistudio.google.com):');
        if (userKey && userKey.trim()) {
          setGeminiApiKey(userKey.trim());
          apiKey = userKey.trim();
        } else {
          showToast('Se requiere una API Key de Gemini para escanear tickets', 'info');
          receiptFileInput.value = '';
          return;
        }
      }

      try {
        if (aiLoader) aiLoader.style.display = 'flex';
        const extracted = await extractDataFromReceipt(file);

        if (extracted.amount > 0) {
          document.getElementById('expense-amount').value = extracted.amount;
        }
        if (extracted.title) {
          document.getElementById('expense-title').value = extracted.title;
        }
        if (extracted.category) {
          const catPills = document.querySelectorAll('#expense-category-pills .cat-pill-btn');
          catPills.forEach((p) => {
            if (p.getAttribute('data-cat') === extracted.category) {
              p.classList.add('active');
            } else {
              p.classList.remove('active');
            }
          });
        }

        showToast(`Ticket analizado con éxito: ${extracted.title} ($${extracted.amount})`, 'success');
      } catch (err) {
        console.error('Error analizando ticket con Gemini:', err);
        if (err.message === 'MISSING_API_KEY') {
          showToast('Por favor configura tu API Key de Google Gemini', 'error');
        } else {
          showToast(`Error al procesar ticket: ${err.message || 'Error de conexión'}. Por favor ingresa los datos manuales.`, 'error');
        }
      } finally {
        if (aiLoader) aiLoader.style.display = 'none';
        receiptFileInput.value = '';
      }
    });
  }

  // Selector de categorías en el modal de gasto
  const categoryPillsContainer = document.getElementById('expense-category-pills');
  if (categoryPillsContainer) {
    categoryPillsContainer.querySelectorAll('.cat-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        categoryPillsContainer.querySelectorAll('.cat-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
};

/**
 * Muestra el modal de confirmación con callbacks seguros
 */
export const openConfirmModal = ({ title, message, variant = 'danger', onConfirm }) => {
  const dialog = document.getElementById('modal-confirm');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const acceptBtn = document.getElementById('btn-confirm-accept');
  const cancelBtn = document.getElementById('btn-confirm-cancel');

  if (!dialog) return;

  if (titleEl) titleEl.textContent = title || '¿Confirmar acción?';
  if (msgEl) msgEl.textContent = message || 'Esta acción no se puede revertir.';

  if (acceptBtn) {
    acceptBtn.className = variant === 'danger' ? 'btn-pill-danger' : 'btn-pill-primary';
    acceptBtn.onclick = () => {
      dialog.close();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => dialog.close();
  }

  dialog.showModal();
};
