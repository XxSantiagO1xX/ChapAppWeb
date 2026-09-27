/**
 * ChapApp - Modales Nativos HTML5 (<dialog>)
 * Soporte para cierre nativo, light-dismiss, formularios accesibles y Gemini AI Scanner
 */

import { renderIcon } from '../utils/icons.js';
import { formatCurrency, calculateEventTotals } from '../utils/calculations.js';
import { extractDataFromReceipt } from '../services/geminiScanner.js';
import { getGlobalDirectory, saveGlobalDirectory } from '../services/database.js';
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
    <dialog id="modal-quick-expense" class="glass-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="dialog-title-group">
            <span class="dialog-badge badge-cyan">REGISTRO DE GASTO</span>
            <h3 class="dialog-title">Registrar Nueva Compra</h3>
          </div>
          <button class="btn-icon-glass btn-close-dialog" aria-label="Cerrar">${renderIcon('close', { size: 16 })}</button>
        </div>

        <!-- Botón de Escaneo Inteligente con IA -->
        <div class="ai-scanner-banner glass-panel">
          <div class="ai-scanner-info">
            <span class="ai-badge">${renderIcon('sparkles', { size: 14 })} Google Gemini Vision</span>
            <p class="ai-scanner-desc">Sube la foto de tu ticket o nota manuscrita para extraer monto y concepto automáticamente.</p>
          </div>
          <label class="btn-pill-cyan ai-upload-btn" id="lbl-scan-ticket">
            ${renderIcon('camera', { size: 16 })}
            <span>Escanear Ticket</span>
            <input type="file" id="input-receipt-file" accept="image/*" capture="environment" style="display: none;" />
          </label>
        </div>

        <div id="ai-scanning-loader" class="ai-loading-box" style="display: none;">
          <div class="spinner-glass"></div>
          <p>Analizando ticket con Google Gemini Flash...</p>
        </div>

        <form id="form-quick-expense" class="dialog-form">
          <div class="form-group">
            <label for="expense-amount">Monto Total ($ MXN) *</label>
            <input type="number" step="0.01" id="expense-amount" class="glass-input input-highlight-lg" placeholder="0.00" required inputmode="decimal" />
          </div>
          <div class="form-group">
            <label for="expense-title">Concepto / Comercio *</label>
            <input type="text" id="expense-title" class="glass-input" placeholder="ej. Supermercado, Cena día 1, Gasolina" required />
          </div>
          <div class="form-group">
            <label>Categoría del Gasto</label>
            <div class="category-pills-selector" id="expense-category-pills">
              <button type="button" class="cat-pill-btn active" data-cat="Comida">Comida</button>
              <button type="button" class="cat-pill-btn" data-cat="Bebidas">Bebidas</button>
              <button type="button" class="cat-pill-btn" data-cat="Transporte">Transporte</button>
              <button type="button" class="cat-pill-btn" data-cat="Hospedaje">Hospedaje</button>
              <button type="button" class="cat-pill-btn" data-cat="Varios">Varios</button>
            </div>
          </div>
          <div class="form-group">
            <label for="expense-payer">Pagado por (de su bolsillo) *</label>
            <select id="expense-payer" class="glass-select" required></select>
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

    <!-- 4. Modal Directorio Global -->
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
            <button id="btn-create-directory-contact" class="btn-pill-primary">
              ${renderIcon('user-plus', { size: 16 })}
              <span>Nuevo Contacto</span>
            </button>
          </div>

          <div id="directory-items-list" class="directory-cards-list-container"></div>
        </div>

        <div class="dialog-footer">
          <button type="button" class="btn-pill-glass btn-close-dialog">Cerrar</button>
          <button type="button" id="btn-import-selected-to-active-event" class="btn-pill-cyan" style="display: none;">
            ${renderIcon('check', { size: 16 })}
            <span>Importar Seleccionados al Evento</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- 5. Modal Corte General del Evento -->
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
          <button type="button" id="btn-share-whatsapp-cut" class="btn-pill-whatsapp">
            ${renderIcon('whatsapp', { size: 18 })}
            <span>Enviar por WhatsApp</span>
          </button>
          <button type="button" id="btn-print-cut-pdf" class="btn-pill-primary">
            ${renderIcon('print', { size: 16 })}
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- 6. Modal Confirmación Estilizado -->
    <dialog id="modal-confirm" class="glass-dialog modal-sm">
      <div class="dialog-content">
        <div class="confirm-icon-box" id="confirm-icon-mount">
          ${renderIcon('alert', { size: 32 })}
        </div>
        <h3 class="confirm-title" id="confirm-title">¿Estás seguro?</h3>
        <p class="confirm-message" id="confirm-message">Esta acción no se puede deshacer.</p>
        <div class="dialog-footer confirm-footer">
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

  // Listener para el Escáner de Tickets con Google Gemini
  const receiptFileInput = document.getElementById('input-receipt-file');
  const aiLoader = document.getElementById('ai-scanning-loader');

  if (receiptFileInput) {
    receiptFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

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
        console.error('Error analizando ticket:', err);
        showToast('No se pudo analizar el ticket automáticamente. Por favor ingresa los datos manuales.', 'error');
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
