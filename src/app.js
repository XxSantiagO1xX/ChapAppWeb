/**
 * ChapApp - Aplicación Web Principal (Vanilla JS / DOM Nativo)
 */

import { store } from './state/store.js';
import { 
  getAllEvents, 
  getEventById, 
  createEvent, 
  archiveEvent, 
  deleteEvent, 
  addParticipant, 
  updateParticipant,
  deleteParticipant, 
  settleSubFamily,
  addExpense,
  deleteExpense,
  getGlobalDirectory,
  saveGlobalDirectory,
  subscribeToEventsListRealtime
} from './services/database.js';
import { formatCurrency, calculateEventTotals } from './utils/calculations.js';
import { renderIcon } from './utils/icons.js';
import { renderHeader } from './components/header.js';
import { renderDrawer } from './components/drawer.js';
import { renderEventList } from './components/eventList.js';
import { renderEventDashboard } from './components/eventDashboard.js';
import { mountModals, openConfirmModal } from './components/modals.js';
import { showToast } from './components/toast.js';
import { 
  generateEventReportPlainText, 
  generateSubfamilyWhatsAppText, 
  downloadEventCsv, 
  shareViaWhatsApp, 
  printReportHtml 
} from './utils/reports.js';

class App {
  constructor() {
    this.rootEl = document.getElementById('app');
  }

  async init() {
    // 1. Montar modales nativos <dialog>
    mountModals();

    // 2. Establecer tema inicial
    const { theme } = store.getState();
    document.documentElement.setAttribute('data-theme', theme);

    // 3. Suscribirse a cambios de estado para re-renderizar
    store.subscribe(() => this.render());

    // 4. Suscripción a cambios de hash / ruta (SPA)
    window.addEventListener('hashchange', () => this.handleRoute());

    // 5. Cargar eventos iniciales desde Supabase / LocalStorage
    store.setState({ loading: true });
    const events = await getAllEvents();
    store.setState({ events, loading: false });

    // 6. Configurar suscripción Realtime con Supabase
    subscribeToEventsListRealtime(async () => {
      console.log('[Realtime] Cambio detectado en Supabase, sincronizando...');
      const updatedEvents = await getAllEvents();
      store.setState({ events: updatedEvents });

      // Si hay un evento activo, recargarlo
      const { activeEvent } = store.getState();
      if (activeEvent) {
        const refreshed = updatedEvents.find((e) => e.id === activeEvent.id);
        if (refreshed) {
          store.setState({ activeEvent: refreshed });
        }
      }
    });

    // 7. Configurar listeners de interacción global
    this.setupGlobalListeners();

    // 8. Enrutar ruta actual
    this.handleRoute();

    // 9. Comprobar iPad y pantalla completa
    this.setupIPadFullscreen();
  }

  setupIPadFullscreen() {
    const isIPad = /iPad/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIPad) {
      console.log('[ChapApp] Dispositivo iPad detectado. Configurando soporte a pantalla completa.');
      const tryFullscreen = () => {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      };
      window.addEventListener('touchstart', tryFullscreen, { once: true });
    }
  }

  async handleRoute() {
    const hash = window.location.hash || '#/';
    const { events } = store.getState();

    if (hash.startsWith('#/event/')) {
      const eventId = hash.replace('#/event/', '').trim();
      let activeEvent = events.find((e) => e.id === eventId || e.slug === eventId);
      if (!activeEvent) {
        activeEvent = await getEventById(eventId);
      }
      store.setState({ activeEvent, activeDashboardTab: 'summary' });
    } else {
      store.setState({ activeEvent: null });
    }
  }

  render() {
    if (!this.rootEl) return;
    const { activeEvent, isDrawerOpen, theme } = store.getState();
    const isDashboard = Boolean(activeEvent);

    // Renderizar fondo ambiental
    const wallpaperImg = theme === 'dark' ? './assets/backgrounds/dark_bg.jpg' : './assets/backgrounds/light_bg.jpg';

    this.rootEl.innerHTML = `
      <div class="ambient-background-layer">
        <img src="${wallpaperImg}" alt="Fondo" class="ambient-wallpaper-img" />
      </div>

      <div class="app-container">
        ${renderHeader({ isDashboard, event: activeEvent })}
        <main id="main-content" class="main-content-flow">
          ${isDashboard ? renderEventDashboard(activeEvent) : renderEventList()}
        </main>
      </div>

      ${renderDrawer()}
    `;

    // Sincronizar estado del Drawer
    const drawerEl = document.getElementById('app-drawer');
    const backdropEl = document.getElementById('drawer-backdrop');
    if (drawerEl && backdropEl) {
      if (isDrawerOpen) {
        drawerEl.classList.add('open');
        backdropEl.classList.add('open');
      } else {
        drawerEl.classList.remove('open');
        backdropEl.classList.remove('open');
      }
    }
  }

  setupGlobalListeners() {
    document.addEventListener('click', async (e) => {
      // 1. Toggle de Tema
      if (e.target.closest('#btn-toggle-theme') || e.target.closest('#btn-drawer-theme')) {
        store.toggleTheme();
        return;
      }

      // 2. Abrir / Cerrar Drawer
      if (e.target.closest('#btn-open-drawer')) {
        store.setState({ isDrawerOpen: true });
        return;
      }
      if (e.target.closest('#btn-close-drawer') || e.target.closest('#drawer-backdrop')) {
        store.setState({ isDrawerOpen: false });
        return;
      }

      // 3. Abrir Modal Nuevo Evento
      if (
        e.target.closest('#btn-open-new-event') || 
        e.target.closest('#btn-drawer-new-event') || 
        e.target.closest('#btn-empty-new-event')
      ) {
        store.setState({ isDrawerOpen: false });
        this.openNewEventModal();
        return;
      }

      // 4. Abrir Modal Directorio Global
      if (
        e.target.closest('#btn-open-directory') || 
        e.target.closest('#btn-drawer-directory') ||
        e.target.closest('#btn-open-directory-import')
      ) {
        store.setState({ isDrawerOpen: false });
        this.openDirectoryModal(e.target.closest('#btn-open-directory-import') ? 'import' : 'view');
        return;
      }

      // 5. Filtros de Eventos en Home
      const filterBtn = e.target.closest('.filter-chip-btn');
      if (filterBtn) {
        const filter = filterBtn.getAttribute('data-filter');
        store.setState({ filterTab: filter });
        return;
      }
      const drawerFilterActive = e.target.closest('#btn-drawer-filter-active');
      if (drawerFilterActive) {
        store.setState({ filterTab: 'active', isDrawerOpen: false });
        window.location.hash = '#/';
        return;
      }
      const drawerFilterArchived = e.target.closest('#btn-drawer-filter-archived');
      if (drawerFilterArchived) {
        store.setState({ filterTab: 'archived', isDrawerOpen: false });
        window.location.hash = '#/';
        return;
      }

      // 6. Limpiar búsqueda
      if (e.target.closest('#btn-clear-search')) {
        store.setState({ searchQuery: '' });
        return;
      }

      // 7. Archivar / Desarchivar evento
      const archiveBtn = e.target.closest('.btn-toggle-archive-card');
      if (archiveBtn) {
        const eventId = archiveBtn.getAttribute('data-event-id');
        const isCurrentlyArchived = archiveBtn.getAttribute('data-archived') === 'true';
        await archiveEvent(eventId, !isCurrentlyArchived);
        const updated = await getAllEvents();
        store.setState({ events: updated });
        showToast(isCurrentlyArchived ? 'Evento desarchivado con éxito' : 'Evento archivado', 'info');
        return;
      }

      // 8. Eliminar evento (con confirmación)
      const deleteEventBtn = e.target.closest('.btn-delete-event-card');
      if (deleteEventBtn) {
        const eventId = deleteEventBtn.getAttribute('data-event-id');
        const title = deleteEventBtn.getAttribute('data-event-title');
        openConfirmModal({
          title: '¿Eliminar este evento?',
          message: `Se eliminarán permanentemente los gastos y registros de "${title}".`,
          variant: 'danger',
          onConfirm: async () => {
            await deleteEvent(eventId);
            const updated = await getAllEvents();
            store.setState({ events: updated });
            showToast('Evento eliminado', 'success');
          }
        });
        return;
      }

      // 9. Pestañas del Dashboard
      const dashTabBtn = e.target.closest('.dash-tab-btn');
      if (dashTabBtn) {
        const tab = dashTabBtn.getAttribute('data-tab');
        store.setState({ activeDashboardTab: tab });
        return;
      }

      // 10. Seleccionar Subfamilia en POS Tickets
      const sfPill = e.target.closest('.sf-pill-item');
      if (sfPill) {
        const sfName = sfPill.getAttribute('data-subfamily');
        store.setState({ selectedSubFamily: sfName });
        return;
      }

      // 11. Liquidar / Desmarcar Subfamilia completa
      const toggleSfSettleBtn = e.target.closest('#btn-toggle-sf-settle');
      if (toggleSfSettleBtn) {
        const sfName = toggleSfSettleBtn.getAttribute('data-subfamily');
        const eventId = toggleSfSettleBtn.getAttribute('data-event-id');
        const isCurrentlySettled = toggleSfSettleBtn.getAttribute('data-settled') === 'true';

        await settleSubFamily(eventId, sfName, !isCurrentlySettled);
        const refreshed = await getEventById(eventId);
        store.setState({ activeEvent: refreshed });
        showToast(isCurrentlySettled ? `Familia "${sfName}" marcada como pendiente` : `Familia "${sfName}" 100% liquidada`, 'success');
        return;
      }

      // 12. Toggle de Liquidación individual de un integrante
      const settlePartBtn = e.target.closest('.btn-toggle-settle');
      if (settlePartBtn) {
        const pId = settlePartBtn.getAttribute('data-participant-id');
        const eventId = settlePartBtn.getAttribute('data-event-id');
        const isCurrentlySettled = settlePartBtn.getAttribute('data-settled') === 'true';

        const { activeEvent } = store.getState();
        if (activeEvent) {
          const part = activeEvent.participants?.find((p) => p.id === pId);
          if (part) {
            part.isSettled = !isCurrentlySettled;
            await updateParticipant(eventId, part);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast(part.isSettled ? `Integrante liquidado` : `Integrante pendiente`, 'info');
          }
        }
        return;
      }

      // 13. Toggle de Asistencia (Asiste / Falta)
      const attendBtn = e.target.closest('.btn-toggle-attendance');
      if (attendBtn) {
        const pId = attendBtn.getAttribute('data-participant-id');
        const eventId = attendBtn.getAttribute('data-event-id');
        const isCurrentlyAttending = attendBtn.getAttribute('data-attending') === 'true';

        const { activeEvent } = store.getState();
        if (activeEvent) {
          const part = activeEvent.participants?.find((p) => p.id === pId);
          if (part) {
            part.isAttending = !isCurrentlyAttending;
            await updateParticipant(eventId, part);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast(part.isAttending ? `${part.name} marcado como asistente` : `${part.name} marcado como ausente`, 'info');
          }
        }
        return;
      }

      // 14. Toggle de Días Activos
      const dayChipBtn = e.target.closest('.day-chip-btn');
      if (dayChipBtn && !dayChipBtn.disabled) {
        const pId = dayChipBtn.getAttribute('data-participant-id');
        const day = dayChipBtn.getAttribute('data-day');
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const part = activeEvent.participants?.find((p) => p.id === pId);
          if (part) {
            part.activeDays = part.activeDays || [];
            if (part.activeDays.includes(day)) {
              part.activeDays = part.activeDays.filter((d) => d !== day);
            } else {
              part.activeDays.push(day);
            }
            await updateParticipant(activeEvent.id, part);
            const refreshed = await getEventById(activeEvent.id);
            store.setState({ activeEvent: refreshed });
          }
        }
        return;
      }

      // 15. Eliminar Integrante
      const deletePartBtn = e.target.closest('.btn-delete-participant');
      if (deletePartBtn) {
        const pId = deletePartBtn.getAttribute('data-participant-id');
        const pName = deletePartBtn.getAttribute('data-participant-name');
        const eventId = deletePartBtn.getAttribute('data-event-id');

        openConfirmModal({
          title: `¿Eliminar a ${pName}?`,
          message: 'Se removerá de la lista de asistencia y de los cálculos del evento.',
          variant: 'danger',
          onConfirm: async () => {
            await deleteParticipant(eventId, pId);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast('Integrante eliminado', 'success');
          }
        });
        return;
      }

      // 16. Abrir Modal de Gasto Rápido
      if (
        e.target.closest('#btn-open-expense-modal') || 
        e.target.closest('#btn-add-expense-tab')
      ) {
        this.openQuickExpenseModal();
        return;
      }

      // 17. Eliminar Gasto
      const deleteExpBtn = e.target.closest('.btn-delete-expense');
      if (deleteExpBtn) {
        const expId = deleteExpBtn.getAttribute('data-expense-id');
        const expTitle = deleteExpBtn.getAttribute('data-expense-title');
        const eventId = deleteExpBtn.getAttribute('data-event-id');

        openConfirmModal({
          title: `¿Eliminar gasto "${expTitle}"?`,
          message: 'Se recalcularán las cuotas y los saldos de todos los integrantes.',
          variant: 'danger',
          onConfirm: async () => {
            await deleteExpense(eventId, expId);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast('Gasto eliminado', 'success');
          }
        });
        return;
      }

      // 18. Abrir Modal Corte General
      if (
        e.target.closest('#btn-open-cut-modal') || 
        e.target.closest('#btn-open-cut-modal-shortcut')
      ) {
        this.openEventCutModal();
        return;
      }

      // 19. Compartir Reporte por WhatsApp
      if (e.target.closest('#btn-share-whatsapp-summary') || e.target.closest('#btn-share-whatsapp-cut')) {
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const reportText = generateEventReportPlainText(activeEvent);
          shareViaWhatsApp(reportText);
        }
        return;
      }

      // 20. Compartir Ticket POS de Subfamilia por WhatsApp
      const shareSfBtn = e.target.closest('#btn-share-sf-whatsapp');
      if (shareSfBtn) {
        const sfName = shareSfBtn.getAttribute('data-subfamily');
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const text = generateSubfamilyWhatsAppText(sfName, activeEvent);
          shareViaWhatsApp(text);
        }
        return;
      }

      // 21. Descargar CSV del Corte
      if (e.target.closest('#btn-download-csv-cut')) {
        const { activeEvent } = store.getState();
        if (activeEvent) {
          downloadEventCsv(activeEvent);
          showToast('CSV descargado con éxito', 'success');
        }
        return;
      }

      // 22. Imprimir Corte General / PDF
      if (e.target.closest('#btn-print-cut-pdf')) {
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const totals = calculateEventTotals(activeEvent);
          const html = `
            <h2>Corte General de Gastos: ${activeEvent.title} (${activeEvent.year})</h2>
            <p><strong>Total Gastado:</strong> ${formatCurrency(totals.totalExpenses)} | <strong>Asistencia:</strong> ${totals.totalAttendingCount} personas</p>
            <p><strong>Recaudado:</strong> ${formatCurrency(totals.totalCollected)} | <strong>En Caja:</strong> ${formatCurrency(totals.cashInHand)}</p>
            <hr/>
            <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse; margin-top:16px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th>Subfamilia</th>
                  <th>Integrantes</th>
                  <th>Cuota</th>
                  <th>Compras</th>
                  <th>Saldo Neto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${totals.subFamilies.map((sf) => `
                  <tr>
                    <td><strong>${sf.subFamilyName}</strong></td>
                    <td>${sf.attendingCount} de ${sf.membersCount}</td>
                    <td>${formatCurrency(sf.proportionalShare)}</td>
                    <td>${formatCurrency(sf.totalPaid)}</td>
                    <td><strong>${sf.finalBalance < 0 ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` : formatCurrency(sf.finalBalance)}</strong></td>
                    <td>${sf.isFullySettled ? 'LIQUIDADA' : 'PENDIENTE'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          printReportHtml(`Corte ${activeEvent.title}`, html);
        }
        return;
      }

      // 23. Abrir Modal Agregar Integrante
      if (e.target.closest('#btn-add-participant-modal')) {
        const dialog = document.getElementById('modal-add-participant');
        if (dialog) dialog.showModal();
        return;
      }

      // 24. Eliminar Contacto del Directorio
      const delDirBtn = e.target.closest('.btn-delete-dir-contact');
      if (delDirBtn) {
        const id = delDirBtn.getAttribute('data-id');
        let dir = getGlobalDirectory();
        dir = dir.filter((d) => d.id !== id);
        saveGlobalDirectory(dir);
        this.openDirectoryModal();
        showToast('Contacto eliminado del directorio', 'info');
        return;
      }

      // 25. Crear Contacto en el Directorio
      if (e.target.closest('#btn-create-directory-contact')) {
        const name = prompt('Nombre completo del nuevo integrante:');
        if (name && name.trim()) {
          const subFamily = prompt('Subfamilia (ej. Familia Santiago Morales):', 'Familia General') || 'Familia General';
          const isNino = confirm('¿Es menor/niño (ponderación 0.5)? Cancela para Adulto (1.0)');
          const dir = getGlobalDirectory();
          dir.push({
            id: 'dir_' + Date.now(),
            name: name.trim(),
            category: isNino ? 'nino' : 'adulto',
            weight: isNino ? 0.5 : 1.0,
            subFamily: subFamily.trim(),
          });
          saveGlobalDirectory(dir);
          this.openDirectoryModal();
          showToast(`Contacto ${name.trim()} guardado en el directorio`, 'success');
        }
        return;
      }

      // 26. Importar Participantes del Directorio al Evento Activo
      if (e.target.closest('#btn-import-selected-to-active-event')) {
        const { activeEvent } = store.getState();
        if (!activeEvent) return;

        const checkedBoxes = document.querySelectorAll('#directory-items-list input[type="checkbox"]:checked');
        const directory = getGlobalDirectory();
        let addedCount = 0;

        for (const cb of checkedBoxes) {
          const contact = directory.find((d) => d.id === cb.value);
          if (contact) {
            // Verificar si ya existe en el evento
            const exists = (activeEvent.participants || []).some(
              (p) => p.name.toLowerCase() === contact.name.toLowerCase()
            );
            if (!exists) {
              await addParticipant(activeEvent.id, {
                name: contact.name,
                category: contact.category,
                weight: contact.weight,
                subFamily: contact.subFamily,
                activeDays: [...(activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'])],
                isAttending: true,
                isSettled: false,
              });
              addedCount++;
            }
          }
        }

        const dialog = document.getElementById('modal-global-directory');
        if (dialog) dialog.close();

        const refreshed = await getEventById(activeEvent.id);
        store.setState({ activeEvent: refreshed });
        showToast(`${addedCount} integrantes importados al evento`, 'success');
        return;
      }

      // 27. Imprimir Ticket POS Individual
      const printSfBtn = e.target.closest('#btn-print-sf-ticket');
      if (printSfBtn) {
        const sfName = printSfBtn.getAttribute('data-subfamily');
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const totals = calculateEventTotals(activeEvent);
          const sf = totals.bySubFamily[sfName];
          if (sf) {
            const html = `
              <h2>Ticket de Cobro POS: ${sf.subFamilyName}</h2>
              <p><strong>Evento:</strong> ${activeEvent.title} (${activeEvent.year})</p>
              <p><strong>Integrantes:</strong> ${sf.attendingCount} asistentes de ${sf.membersCount}</p>
              <hr/>
              <p><strong>Cuota Proporcional:</strong> ${formatCurrency(sf.proportionalShare)}</p>
              <p><strong>Compras Pagadas:</strong> ${formatCurrency(sf.totalPaid)}</p>
              <h3>Saldo Neto: ${sf.finalBalance < 0 ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` : formatCurrency(sf.finalBalance)}</h3>
              <p><strong>Estatus:</strong> ${sf.isFullySettled ? 'LIQUIDADA' : 'PENDIENTE'}</p>
            `;
            printReportHtml(`Ticket_${sf.subFamilyName}`, html);
          }
        }
        return;
      }
    });

    // Eventos de Búsqueda de Eventos
    document.addEventListener('input', (e) => {
      if (e.target.id === 'events-search-input') {
        store.setState({ searchQuery: e.target.value });
      }
      if (e.target.id === 'directory-search-input') {
        const q = e.target.value.toLowerCase().trim();
        const contactCards = document.querySelectorAll('.directory-contact-card');
        contactCards.forEach((card) => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(q) ? 'flex' : 'none';
        });
      }
    });

    // Formulario Crear Nuevo Evento
    const formNewEvent = document.getElementById('form-new-event');
    if (formNewEvent) {
      formNewEvent.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-event-title').value.trim();
        const year = document.getElementById('new-event-year').value;
        const daysCount = parseInt(document.getElementById('new-event-days').value, 10) || 4;

        const availableDays = Array.from({ length: daysCount }, (_, i) => `Día ${i + 1}`);

        // Participantes seleccionados del checklist
        const checkedBoxes = document.querySelectorAll('#new-event-directory-list input[type="checkbox"]:checked');
        const directory = getGlobalDirectory();
        const selectedParts = Array.from(checkedBoxes).map((cb) => {
          const contact = directory.find((d) => d.id === cb.value);
          return {
            name: contact ? contact.name : cb.value,
            category: contact ? contact.category : 'adulto',
            weight: contact ? contact.weight : 1.0,
            subFamily: contact ? contact.subFamily : 'Familia General',
          };
        });

        const newEvent = await createEvent({
          title,
          year,
          availableDays,
          participants: selectedParts,
        });

        const dialog = document.getElementById('modal-new-event');
        if (dialog) dialog.close();

        const updated = await getAllEvents();
        store.setState({ events: updated });
        showToast(`Evento "${title}" creado exitosamente`, 'success');
        window.location.hash = `#/event/${newEvent.id}`;
      });
    }

    // Formulario Guardar Gasto Rápido
    const formQuickExpense = document.getElementById('form-quick-expense');
    if (formQuickExpense) {
      formQuickExpense.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { activeEvent } = store.getState();
        if (!activeEvent) return;

        const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        const title = document.getElementById('expense-title').value.trim();
        const payerId = document.getElementById('expense-payer').value;
        const activeCatPill = document.querySelector('#expense-category-pills .cat-pill-btn.active');
        const category = activeCatPill ? activeCatPill.getAttribute('data-cat') : 'Comida';

        if (amount <= 0 || !title || !payerId) {
          showToast('Por favor completa todos los campos del gasto', 'error');
          return;
        }

        await addExpense(activeEvent.id, {
          title,
          amount,
          category,
          paidBy: payerId,
        });

        const dialog = document.getElementById('modal-quick-expense');
        if (dialog) dialog.close();

        const refreshed = await getEventById(activeEvent.id);
        store.setState({ activeEvent: refreshed });
        showToast(`Gasto "${title}" guardado ($${amount})`, 'success');
      });
    }

    // Formulario Agregar Integrante
    const formAddPart = document.getElementById('form-add-participant');
    if (formAddPart) {
      formAddPart.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { activeEvent } = store.getState();
        if (!activeEvent) return;

        const name = document.getElementById('participant-name').value.trim();
        const category = document.getElementById('participant-category').value;
        const weight = parseFloat(document.getElementById('participant-weight').value) || 1.0;
        const subFamily = document.getElementById('participant-subfamily').value.trim() || 'Familia General';

        await addParticipant(activeEvent.id, {
          name,
          category,
          weight,
          subFamily,
          activeDays: [...(activeEvent.availableDays || ['Día 1', 'Día 2', 'Día 3', 'Día 4'])],
          isAttending: true,
          isSettled: false,
        });

        const dialog = document.getElementById('modal-add-participant');
        if (dialog) dialog.close();

        const refreshed = await getEventById(activeEvent.id);
        store.setState({ activeEvent: refreshed });
        showToast(`Integrante "${name}" agregado con éxito`, 'success');
      });
    }
  }

  openNewEventModal() {
    const dialog = document.getElementById('modal-new-event');
    const directory = getGlobalDirectory();
    const listEl = document.getElementById('new-event-directory-list');

    if (listEl) {
      listEl.innerHTML = directory.map((d) => `
        <label class="directory-check-item">
          <input type="checkbox" value="${d.id}" checked />
          <div class="check-item-info">
            <strong>${d.name}</strong>
            <span>${d.subFamily} • ${d.category.toUpperCase()}</span>
          </div>
        </label>
      `).join('');
    }

    const selectAllBtn = document.getElementById('btn-select-all-directory');
    if (selectAllBtn) {
      selectAllBtn.onclick = () => {
        const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
        checkboxes.forEach((cb) => (cb.checked = !allChecked));
        selectAllBtn.textContent = allChecked ? 'Seleccionar Todos' : 'Desmarcar Todos';
      };
    }

    if (dialog) dialog.showModal();
  }

  openQuickExpenseModal() {
    const dialog = document.getElementById('modal-quick-expense');
    const { activeEvent } = store.getState();
    const payerSelect = document.getElementById('expense-payer');

    if (payerSelect && activeEvent) {
      const attending = (activeEvent.participants || []).filter((p) => p.isAttending);
      payerSelect.innerHTML = attending.map((p) => `
        <option value="${p.id}">${p.name} (${p.subFamily})</option>
      `).join('');
    }

    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-title').value = '';

    if (dialog) dialog.showModal();
  }

  openEventCutModal() {
    const dialog = document.getElementById('modal-event-cut');
    const { activeEvent } = store.getState();
    if (!activeEvent || !dialog) return;

    const totals = calculateEventTotals(activeEvent);
    document.getElementById('cut-modal-event-title').textContent = `Corte de Caja: ${activeEvent.title} (${activeEvent.year})`;

    const contentMount = document.getElementById('event-cut-content-mount');
    if (contentMount) {
      contentMount.innerHTML = `
        <div class="cut-modal-metrics-grid">
          <div class="cut-metric-box">
            <span>Total Gastado</span>
            <strong>${formatCurrency(totals.totalExpenses)}</strong>
          </div>
          <div class="cut-metric-box">
            <span>Recaudado en Caja</span>
            <strong class="text-emerald">${formatCurrency(totals.totalCollected)}</strong>
          </div>
          <div class="cut-metric-box">
            <span>Reembolsos Pagados</span>
            <strong class="text-amber">${formatCurrency(totals.totalRefunded)}</strong>
          </div>
          <div class="cut-metric-box">
            <span>Fondo Líquido en Mano</span>
            <strong class="text-cyan">${formatCurrency(totals.cashInHand)}</strong>
          </div>
        </div>

        <h4 style="margin: 20px 0 10px; font-size: 1rem; font-weight: 800;">Consolidado de Subfamilias</h4>
        <div class="cut-table-scroll">
          <table class="pos-table">
            <thead>
              <tr>
                <th>Subfamilia</th>
                <th>Asistentes</th>
                <th class="col-num">Cuota</th>
                <th class="col-num">Compras</th>
                <th class="col-num">Saldo Neto</th>
                <th style="text-align: center;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${totals.subFamilies.map((sf) => `
                <tr>
                  <td><strong>🏡 ${sf.subFamilyName}</strong></td>
                  <td>${sf.attendingCount} de ${sf.membersCount}</td>
                  <td class="col-num">${formatCurrency(sf.proportionalShare)}</td>
                  <td class="col-num">${formatCurrency(sf.totalPaid)}</td>
                  <td class="col-num ${sf.finalBalance < 0 ? 'text-refund' : sf.finalBalance > 0 ? 'text-owed' : 'text-even'}">
                    <strong>${sf.finalBalance < 0 ? `Reembolso ${formatCurrency(Math.abs(sf.finalBalance))}` : formatCurrency(sf.finalBalance)}</strong>
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-status ${sf.isFullySettled ? 'status-active' : 'status-archived'}">
                      ${sf.isFullySettled ? 'Liquidada' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    dialog.showModal();
  }

  openDirectoryModal(mode = 'view') {
    const dialog = document.getElementById('modal-global-directory');
    const listMount = document.getElementById('directory-items-list');
    const importBtn = document.getElementById('btn-import-selected-to-active-event');
    const directory = getGlobalDirectory();

    if (importBtn) {
      importBtn.style.display = mode === 'import' ? 'inline-flex' : 'none';
    }

    if (listMount) {
      listMount.innerHTML = directory.map((d) => `
        <div class="directory-contact-card glass-panel">
          ${mode === 'import' ? `<input type="checkbox" value="${d.id}" checked class="dir-import-checkbox" />` : ''}
          <div class="contact-info-col">
            <span class="contact-name">👤 ${d.name}</span>
            <span class="contact-sub">${d.subFamily} • ${d.category.toUpperCase()} (${d.weight || 1.0})</span>
          </div>
          <button class="btn-icon-danger btn-delete-dir-contact" data-id="${d.id}" title="Eliminar del directorio">
            ${renderIcon('trash', { size: 16 })}
          </button>
        </div>
      `).join('');
    }

    if (dialog) dialog.showModal();
  }
}

// Iniciar aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
