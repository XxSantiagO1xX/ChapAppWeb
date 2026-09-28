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
  updateParticipantRole,
  toggleSubFamilyAttendance,
  deleteSubFamily,
  deleteParticipant, 
  settleSubFamily,
  addExpense,
  batchAddExpenses,
  deleteExpense,
  getGlobalDirectory,
  fetchGlobalDirectoryFromSupabase,
  saveGlobalDirectory,
  addDirectoryContact,
  deleteDirectoryContact,
  updateDirectoryContactRole,
  subscribeToEventsListRealtime,
  generateUUID
} from './services/database.js';
import { formatCurrency, calculateEventTotals } from './utils/calculations.js';
import { renderIcon } from './utils/icons.js';
import { parseExpensesCsv, SAMPLE_CSV_TEMPLATE } from './utils/csvParser.js';
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
    this.parsedCsvExpenses = [];
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
      await this.syncWithSupabase(false);
    });

    // Sincronizar al volver a la pestaña o enfocar ventana
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncWithSupabase(false);
      }
    });

    window.addEventListener('focus', () => {
      this.syncWithSupabase(false);
    });

    // 7. Configurar listeners globales
    this.setupGlobalListeners();
    this.setupCsvModalListeners();

    // 8. Enrutar ruta actual
    this.handleRoute();

    // 9. Configurar soporte iPad
    this.setupIPadFullscreen();
  }

  async syncWithSupabase(showNotification = false) {
    try {
      const updatedEvents = await getAllEvents();
      const currentEvents = store.getState().events || [];
      const { activeEvent } = store.getState();
      
      const hasChanged = JSON.stringify(currentEvents) !== JSON.stringify(updatedEvents);

      if (hasChanged) {
        let refreshedActive = null;
        if (activeEvent) {
          refreshedActive = updatedEvents.find((e) => e.id === activeEvent.id || e.slug === activeEvent.id) || null;
        }

        store.setState({ 
          events: updatedEvents, 
          ...(refreshedActive ? { activeEvent: refreshedActive } : {}) 
        });

        // Si el modal del directorio está abierto, refrescar su lista
        const dirModal = document.getElementById('modal-global-directory');
        if (dirModal && dirModal.open) {
          const freshDir = await fetchGlobalDirectoryFromSupabase();
          const importBtn = document.getElementById('btn-import-selected-to-active-event');
          const isImport = importBtn && importBtn.style.display !== 'none';
          this.renderDirectoryList(freshDir, isImport ? 'import' : 'manage');
        }
      }

      if (showNotification) {
        showToast('Sincronizado con Supabase Cloud', 'success');
      }
    } catch (err) {
      console.warn('[Sync] Error sincronizando con Supabase:', err);
    }
  }

  setupIPadFullscreen() {
    const isIPad = /iPad/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIPad) {
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

    const wallpaperImg = theme === 'dark' ? '/assets/backgrounds/dark_bg.jpg' : '/assets/backgrounds/light_bg.jpg';

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

    // Estado del Drawer
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
      // 0. Sincronización Manual con Supabase Cloud
      if (e.target.closest('#btn-sync-cloud')) {
        await this.syncWithSupabase(true);
        return;
      }

      // 1. Toggle de Tema
      if (e.target.closest('#btn-toggle-theme') || e.target.closest('#btn-drawer-theme')) {
        store.toggleTheme();
        return;
      }

      // 2. Drawer
      if (e.target.closest('#btn-open-drawer')) {
        store.setState({ isDrawerOpen: true });
        return;
      }
      if (e.target.closest('#btn-close-drawer') || e.target.closest('#drawer-backdrop')) {
        store.setState({ isDrawerOpen: false });
        return;
      }

      // 3. Nuevo Evento Modal
      if (
        e.target.closest('#btn-open-new-event') || 
        e.target.closest('#btn-drawer-new-event') || 
        e.target.closest('#btn-empty-new-event')
      ) {
        store.setState({ isDrawerOpen: false });
        this.openNewEventModal();
        return;
      }

      // 4. Directorio Global Modal
      if (
        e.target.closest('#btn-open-directory') || 
        e.target.closest('#btn-drawer-directory') ||
        e.target.closest('#btn-open-directory-import')
      ) {
        store.setState({ isDrawerOpen: false });
        this.openDirectoryModal(e.target.closest('#btn-open-directory-import') ? 'import' : 'manage');
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

      // 6. Limpiar búsqueda en Home
      if (e.target.closest('#btn-clear-search')) {
        store.setState({ searchQuery: '' });
        return;
      }

      // 7. Archivar / Desarchivar
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

      // 8. Eliminar evento
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

      // 9. Pestañas del Dashboard y Menú Cápsula
      const dashTabBtn = e.target.closest('.dash-tab-btn');
      if (dashTabBtn) {
        const tab = dashTabBtn.getAttribute('data-tab');
        store.setState({ activeDashboardTab: tab });
        return;
      }

      // 9.1 Toggle de Colapso de Barra Lateral en Cápsula
      if (e.target.closest('#btn-toggle-capsule-sidebar')) {
        const { isSidebarCollapsed } = store.getState();
        store.setState({ isSidebarCollapsed: !isSidebarCollapsed });
        return;
      }

      // 9.2 Accesos Rápidos desde la Barra Lateral en Cápsula
      if (e.target.closest('#btn-capsule-add-expense')) {
        this.openQuickExpenseModal();
        return;
      }
      if (e.target.closest('#btn-capsule-directory')) {
        this.openDirectoryModal('import');
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
      const toggleSfSettleBtn = e.target.closest('#btn-toggle-sf-settle') || e.target.closest('.btn-family-toggle-settle');
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

      // 11.1 Alternar Asistencia de toda una Subfamilia
      const toggleFamilyAttendBtn = e.target.closest('.btn-family-toggle-attendance');
      if (toggleFamilyAttendBtn) {
        const sfName = toggleFamilyAttendBtn.getAttribute('data-subfamily');
        const eventId = toggleFamilyAttendBtn.getAttribute('data-event-id');
        const targetAttending = toggleFamilyAttendBtn.getAttribute('data-target-attending') === 'true';

        await toggleSubFamilyAttendance(eventId, sfName, targetAttending);
        const refreshed = await getEventById(eventId);
        store.setState({ activeEvent: refreshed });
        showToast(targetAttending ? `Familia "${sfName}" marcada como asistente` : `Familia "${sfName}" marcada como ausente`, 'info');
        return;
      }

      // 11.2 Eliminar una Subfamilia completa
      const deleteFamilyBtn = e.target.closest('.btn-family-delete');
      if (deleteFamilyBtn) {
        const sfName = deleteFamilyBtn.getAttribute('data-subfamily');
        const eventId = deleteFamilyBtn.getAttribute('data-event-id');

        openConfirmModal({
          title: `¿Eliminar "${sfName}"?`,
          message: `Se eliminarán todos los integrantes de esta subfamilia del evento.`,
          variant: 'danger',
          onConfirm: async () => {
            await deleteSubFamily(eventId, sfName);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast(`Subfamilia "${sfName}" eliminada`, 'success');
          }
        });
        return;
      }

      // 12. Toggle de Rol / Tarifa de Integrante ('adulto' 1.0 <-> 'nino' 0.5)
      const toggleRoleBtn = e.target.closest('.btn-toggle-member-role');
      if (toggleRoleBtn) {
        const pId = toggleRoleBtn.getAttribute('data-participant-id');
        const currentCat = toggleRoleBtn.getAttribute('data-category') || 'adulto';
        const newCat = currentCat === 'nino' ? 'adulto' : 'nino';
        const newWeight = newCat === 'nino' ? 0.5 : 1.0;

        const { activeEvent } = store.getState();
        if (activeEvent) {
          await updateParticipantRole(activeEvent.id, pId, newCat, newWeight);
          const refreshed = await getEventById(activeEvent.id);
          store.setState({ activeEvent: refreshed });
          showToast(`Tarifa cambiada a ${newCat === 'nino' ? 'Niño (0.5)' : 'Adulto (1.0)'}`, 'info');
        }
        return;
      }

      // 12.1 Toggle de Liquidación individual de un integrante
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

      // 13. Toggle de Asistencia (Asiste / Falta desde botón clásico)
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

      // 13.1 Abrir / Cerrar Formulario de Invitado Temporal en POS Ticket
      if (e.target.closest('#btn-open-add-guest-form')) {
        const formEl = document.getElementById('form-inline-add-guest');
        if (formEl) {
          const isCurrentlyHidden = formEl.style.display === 'none' || !formEl.style.display;
          formEl.style.display = isCurrentlyHidden ? 'block' : 'none';
          const nameInput = document.getElementById('input-guest-name');
          if (nameInput && isCurrentlyHidden) {
            nameInput.value = '';
            nameInput.focus();
          }
        }
        return;
      }

      if (e.target.closest('#btn-cancel-add-guest')) {
        const formEl = document.getElementById('form-inline-add-guest');
        if (formEl) formEl.style.display = 'none';
        return;
      }

      // 13.2 Guardar Invitado Temporal en POS Ticket
      const saveGuestBtn = e.target.closest('#btn-save-add-guest');
      if (saveGuestBtn) {
        const sfName = saveGuestBtn.getAttribute('data-subfamily');
        const nameInput = document.getElementById('input-guest-name');
        const catSelect = document.getElementById('select-guest-category');
        const daysInput = document.getElementById('input-guest-days');

        const name = nameInput?.value?.trim();
        if (!name) {
          showToast('Ingresa un nombre o referencia para el invitado', 'error');
          if (nameInput) nameInput.focus();
          return;
        }

        const category = catSelect?.value || 'adulto';
        const weight = category === 'nino' ? 0.5 : 1.0;
        const daysCount = Math.max(1, parseInt(daysInput?.value, 10) || 1);

        const { ticketGuests = {}, activeEvent } = store.getState();
        const eventKey = activeEvent?.id || 'default';
        const currentEventMap = ticketGuests[eventKey] || {};
        const currentList = currentEventMap[sfName] || ticketGuests[sfName] || [];

        const newGuest = {
          id: generateUUID(),
          name,
          category,
          weight,
          daysCount,
          subFamily: sfName
        };

        const updatedSfList = [...currentList, newGuest];
        const updatedEventMap = {
          ...currentEventMap,
          [sfName]: updatedSfList,
        };

        const updatedTicketGuests = {
          ...ticketGuests,
          [eventKey]: updatedEventMap,
          [sfName]: updatedSfList, // Mantener acceso plano compatible
        };

        store.setState({ ticketGuests: updatedTicketGuests });

        // Limpiar inputs y cerrar formulario
        if (nameInput) nameInput.value = '';
        const formEl = document.getElementById('form-inline-add-guest');
        if (formEl) formEl.style.display = 'none';

        showToast(`Invitado temporal "${name}" agregado al cálculo`, 'success');
        return;
      }

      // 13.3 Eliminar Invitado Temporal
      const removeGuestBtn = e.target.closest('.btn-remove-guest');
      if (removeGuestBtn) {
        const guestId = removeGuestBtn.getAttribute('data-guest-id');
        const sfName = removeGuestBtn.getAttribute('data-subfamily');

        const { ticketGuests = {}, activeEvent } = store.getState();
        const eventKey = activeEvent?.id || 'default';
        const currentEventMap = ticketGuests[eventKey] || {};
        const currentList = currentEventMap[sfName] || ticketGuests[sfName] || [];
        const updatedSfList = currentList.filter((g) => g.id !== guestId);

        const updatedEventMap = {
          ...currentEventMap,
          [sfName]: updatedSfList,
        };

        const updatedTicketGuests = {
          ...ticketGuests,
          [eventKey]: updatedEventMap,
          [sfName]: updatedSfList,
        };

        store.setState({ ticketGuests: updatedTicketGuests });
        showToast('Invitado temporal eliminado del cálculo', 'info');
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
        e.target.closest('#btn-add-expense-tab') ||
        e.target.closest('#btn-fab-add-expense')
      ) {
        this.openQuickExpenseModal();
        return;
      }

      // 17. Abrir Modal de Importar CSV
      if (e.target.closest('#btn-open-csv-modal')) {
        this.openCsvImportModal();
        return;
      }

      // 18. Eliminar Gasto
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

      // 19. Abrir Modal Corte General
      if (
        e.target.closest('#btn-open-cut-modal') || 
        e.target.closest('#btn-open-cut-modal-shortcut')
      ) {
        this.openEventCutModal();
        return;
      }

      // 20. Compartir Reporte por WhatsApp
      if (e.target.closest('#btn-share-whatsapp-summary') || e.target.closest('#btn-share-whatsapp-cut')) {
        const { activeEvent } = store.getState();
        if (activeEvent) {
          const reportText = generateEventReportPlainText(activeEvent);
          shareViaWhatsApp(reportText);
        }
        return;
      }

      // 21. Compartir Ticket POS de Subfamilia por WhatsApp
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

      // 22. Descargar CSV del Corte
      if (e.target.closest('#btn-download-csv-cut')) {
        const { activeEvent } = store.getState();
        if (activeEvent) {
          downloadEventCsv(activeEvent);
          showToast('CSV descargado con éxito', 'success');
        }
        return;
      }

      // 23. Imprimir Corte General / PDF
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

      // 24. Abrir Modal Agregar Integrante
      if (e.target.closest('#btn-add-participant-modal')) {
        const dialog = document.getElementById('modal-add-participant');
        if (dialog) dialog.showModal();
        return;
      }

      // 25. Alternar Categoría Niño <-> Adulto en el Directorio Maestro
      const toggleDirCatBtn = e.target.closest('.btn-toggle-dir-category');
      if (toggleDirCatBtn) {
        const id = toggleDirCatBtn.getAttribute('data-id');
        const currentCat = toggleDirCatBtn.getAttribute('data-category');
        const isChild = currentCat === 'nino';
        const newCat = isChild ? 'adulto' : 'nino';
        const newWeight = isChild ? 1.0 : 0.5;

        await updateDirectoryContactRole(id, newCat, newWeight);
        const importBtn = document.getElementById('btn-import-selected-to-active-event');
        const isImport = importBtn && importBtn.style.display !== 'none';
        this.openDirectoryModal(isImport ? 'import' : 'manage');
        showToast(`Rol cambiado a ${newCat === 'nino' ? 'Niño (0.5 ud)' : 'Adulto (1.0 ud)'}`, 'success');
        return;
      }

      // 26. Eliminar Contacto del Directorio
      const delDirBtn = e.target.closest('.btn-delete-dir-contact');
      if (delDirBtn) {
        const id = delDirBtn.getAttribute('data-id');
        const name = delDirBtn.getAttribute('data-name');
        openConfirmModal({
          title: `¿Eliminar a ${name}?`,
          message: 'Se removerá del directorio global maestro y de la base de datos.',
          variant: 'danger',
          onConfirm: async () => {
            await deleteDirectoryContact(id, name);
            const importBtn = document.getElementById('btn-import-selected-to-active-event');
            const isImport = importBtn && importBtn.style.display !== 'none';
            this.openDirectoryModal(isImport ? 'import' : 'manage');
            showToast('Contacto eliminado del directorio', 'info');
          }
        });
        return;
      }

      // 26. Formulario Inline Directorio (Abrir/Cerrar/Guardar)
      if (e.target.closest('#btn-toggle-add-contact-form')) {
        const f = document.getElementById('form-inline-add-contact-wrapper');
        if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
        return;
      }
      if (e.target.closest('#btn-cancel-inline-contact')) {
        const f = document.getElementById('form-inline-add-contact-wrapper');
        if (f) f.style.display = 'none';
        return;
      }
      if (e.target.closest('#btn-save-inline-contact')) {
        const name = document.getElementById('dir-contact-name').value.trim();
        const sf = document.getElementById('dir-contact-subfamily').value.trim() || 'Familia General';
        const cat = document.getElementById('dir-contact-category').value;
        const weight = parseFloat(document.getElementById('dir-contact-weight').value) || (cat === 'nino' ? 0.5 : 1.0);

        if (!name) {
          showToast('Ingresa el nombre completo del participante', 'error');
          return;
        }

        await addDirectoryContact({
          name,
          subFamily: sf,
          category: cat,
          weight,
        });

        document.getElementById('dir-contact-name').value = '';
        document.getElementById('form-inline-add-contact-wrapper').style.display = 'none';
        this.openDirectoryModal('manage');
        showToast(`"${name}" agregado al directorio y guardado en Supabase`, 'success');
        return;
      }

      // 27. Importar Seleccionados del Directorio al Evento Activo
      if (e.target.closest('#btn-import-selected-to-active-event')) {
        const { activeEvent } = store.getState();
        if (!activeEvent) return;

        const checkedBoxes = document.querySelectorAll('#directory-items-list input[type="checkbox"]:checked');
        const directory = getGlobalDirectory();
        let addedCount = 0;

        for (const cb of checkedBoxes) {
          const contact = directory.find((d) => d.id === cb.value);
          if (contact) {
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
        const allEvents = await getAllEvents();
        store.setState({ activeEvent: refreshed, events: allEvents });
        showToast(`${addedCount} integrantes importados al evento`, 'success');
        return;
      }

      // 28. Imprimir Ticket POS Individual
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

    // Switches de Asistencia en Ticket POS y Formularios
    document.addEventListener('change', async (e) => {
      const attendanceSwitch = e.target.closest('.toggle-member-attendance');
      if (attendanceSwitch) {
        const pId = attendanceSwitch.getAttribute('data-participant-id');
        const eventId = attendanceSwitch.getAttribute('data-event-id');
        const isAttending = attendanceSwitch.checked;

        const { activeEvent } = store.getState();
        if (activeEvent) {
          const part = activeEvent.participants?.find((p) => p.id === pId);
          if (part) {
            part.isAttending = isAttending;
            await updateParticipant(eventId, part);
            const refreshed = await getEventById(eventId);
            store.setState({ activeEvent: refreshed });
            showToast(isAttending ? `${part.name} marcado como asistente` : `${part.name} marcado como ausente`, 'info');
          }
        }
      }
    });

    // Filtros de búsqueda en tiempo real
    document.addEventListener('input', (e) => {
      // Búsqueda de Eventos en Home
      if (e.target.id === 'events-search-input') {
        store.setState({ searchQuery: e.target.value });
      }

      // Búsqueda en Directorio
      if (e.target.id === 'directory-search-input') {
        const q = e.target.value.toLowerCase().trim();
        const contactCards = document.querySelectorAll('.directory-contact-card');
        contactCards.forEach((card) => {
          const text = card.textContent.toLowerCase();
          card.style.display = text.includes(q) ? 'flex' : 'none';
        });
      }

      // Búsqueda en Subfamilias (Tab 2)
      if (e.target.id === 'subfamilies-search-input') {
        const q = e.target.value.toLowerCase().trim();
        const sfCards = document.querySelectorAll('.subfamily-group-card');
        sfCards.forEach((card) => {
          const sfName = card.getAttribute('data-sf-name') || '';
          const members = card.querySelectorAll('.participant-card-item');
          let hasVisibleMember = false;

          members.forEach((m) => {
            const mName = m.getAttribute('data-member-name') || '';
            const match = !q || mName.includes(q) || sfName.includes(q);
            m.style.display = match ? 'flex' : 'none';
            if (match) hasVisibleMember = true;
          });

          card.style.display = hasVisibleMember ? 'flex' : 'none';
        });
      }

      // Búsqueda en Gastos (Tab 3)
      if (e.target.id === 'expenses-search-input') {
        const q = e.target.value.toLowerCase().trim();
        const expCards = document.querySelectorAll('.expense-card-item');
        expCards.forEach((card) => {
          const title = card.getAttribute('data-expense-title') || '';
          const payer = card.getAttribute('data-payer-name') || '';
          const match = !q || title.includes(q) || payer.includes(q);
          card.style.display = match ? 'flex' : 'none';
        });
      }

      // Búsqueda en Lista Maestra de Subfamilias POS
      if (e.target.id === 'pos-master-search') {
        const q = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.pos-master-item');
        items.forEach((item) => {
          const sf = (item.getAttribute('data-subfamily') || '').toLowerCase();
          const members = (item.getAttribute('data-members') || '').toLowerCase();
          const match = !q || sf.includes(q) || members.includes(q);
          item.style.display = match ? 'flex' : 'none';
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
          paidBy: payerId === 'caja_comun' ? null : payerId,
        });

        const dialog = document.getElementById('modal-quick-expense');
        if (dialog) dialog.close();

        const refreshed = await getEventById(activeEvent.id);
        const allEvents = await getAllEvents();
        store.setState({ activeEvent: refreshed, events: allEvents });
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

        const nameInput = document.getElementById('participant-name');
        const name = nameInput ? nameInput.value.trim() : '';
        const category = document.getElementById('participant-category').value;
        const weight = parseFloat(document.getElementById('participant-weight').value) || (category === 'nino' ? 0.5 : 1.0);
        const subFamily = document.getElementById('participant-subfamily').value.trim() || 'Familia General';

        if (!name) return;

        showToast(`Guardando "${name}" en Supabase...`, 'info');

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

        if (nameInput) nameInput.value = '';

        const refreshed = await getEventById(activeEvent.id);
        const allEvents = await getAllEvents();
        store.setState({ activeEvent: refreshed, events: allEvents });
        showToast(`✅ "${name}" agregado al evento y guardado en la nube`, 'success');
      });
    }
  }

  setupCsvModalListeners() {
    const csvInput = document.getElementById('csv-text-input');
    const loadSampleBtn = document.getElementById('btn-load-sample-csv');
    const uploadFileInput = document.getElementById('input-csv-file');
    const confirmImportBtn = document.getElementById('btn-confirm-import-csv');

    const updatePreview = (text) => {
      const { activeEvent } = store.getState();
      const participants = activeEvent?.participants || [];
      const res = parseExpensesCsv(text, participants);
      this.parsedCsvExpenses = res.expenses;

      const titleEl = document.getElementById('csv-preview-title');
      const totalEl = document.getElementById('csv-preview-total');
      const containerEl = document.getElementById('csv-preview-table-container');

      if (titleEl) titleEl.textContent = `Vista Previa de Gastos (${res.expenses.length} detectados)`;
      if (totalEl) totalEl.textContent = formatCurrency(res.totalAmount);

      if (confirmImportBtn) {
        confirmImportBtn.disabled = res.expenses.length === 0;
      }

      if (containerEl) {
        if (res.expenses.length === 0) {
          containerEl.innerHTML = `<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Pega datos CSV válidos para generar la vista previa.</p>`;
          return;
        }

        containerEl.innerHTML = `
          <table class="pos-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Pagador</th>
                <th class="col-num">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${res.expenses.map((exp) => `
                <tr>
                  <td><strong>${exp.title}</strong></td>
                  <td><span class="badge-pill badge-category">${exp.category}</span></td>
                  <td>${renderIcon('user', { size: 14 })} ${exp.payerName}</td>
                  <td class="col-num text-primary"><strong>${formatCurrency(exp.amount)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    };

    if (csvInput) {
      csvInput.addEventListener('input', (e) => updatePreview(e.target.value));
    }

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        if (csvInput) {
          csvInput.value = SAMPLE_CSV_TEMPLATE;
          updatePreview(SAMPLE_CSV_TEMPLATE);
        }
      });
    }

    if (uploadFileInput) {
      uploadFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          if (csvInput) {
            csvInput.value = content;
            updatePreview(content);
          }
        };
        reader.readAsText(file);
      });
    }

    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', async () => {
        const { activeEvent } = store.getState();
        if (!activeEvent || this.parsedCsvExpenses.length === 0) return;

        await batchAddExpenses(activeEvent.id, this.parsedCsvExpenses);

        const dialog = document.getElementById('modal-csv-import');
        if (dialog) dialog.close();

        const refreshed = await getEventById(activeEvent.id);
        store.setState({ activeEvent: refreshed });
        showToast(`Se importaron ${this.parsedCsvExpenses.length} compras exitosamente`, 'success');
        this.parsedCsvExpenses = [];
        if (csvInput) csvInput.value = '';
      });
    }
  }

  openCsvImportModal() {
    const dialog = document.getElementById('modal-csv-import');
    const csvInput = document.getElementById('csv-text-input');
    if (csvInput) csvInput.value = '';
    const confirmImportBtn = document.getElementById('btn-confirm-import-csv');
    if (confirmImportBtn) confirmImportBtn.disabled = true;

    const titleEl = document.getElementById('csv-preview-title');
    const totalEl = document.getElementById('csv-preview-total');
    const containerEl = document.getElementById('csv-preview-table-container');
    if (titleEl) titleEl.textContent = 'Vista Previa de Gastos (0 detectados)';
    if (totalEl) totalEl.textContent = '$0.00';
    if (containerEl) {
      containerEl.innerHTML = `<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Pega datos CSV para generar la vista previa.</p>`;
    }

    if (dialog && !dialog.open) dialog.showModal();
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

    if (dialog && !dialog.open) dialog.showModal();
  }

  openQuickExpenseModal() {
    const dialog = document.getElementById('modal-quick-expense');
    const { activeEvent } = store.getState();
    const payerSelect = document.getElementById('expense-payer');

    if (payerSelect && activeEvent) {
      const attending = (activeEvent.participants || []).filter((p) => p.isAttending !== false);
      const groupedBySf = {};
      attending.forEach((p) => {
        const sf = p.subFamily || 'Familia General';
        if (!groupedBySf[sf]) groupedBySf[sf] = [];
        groupedBySf[sf].push(p);
      });

      let optionsHtml = `
        <option value="caja_comun">💳 Fondo Común / Gasto General (Sin reembolso individual)</option>
      `;

      Object.keys(groupedBySf).sort().forEach((sf) => {
        optionsHtml += `<optgroup label="📍 ${sf}">`;
        groupedBySf[sf].forEach((p) => {
          optionsHtml += `<option value="${p.id}">👤 ${p.name} (${sf})</option>`;
        });
        optionsHtml += `</optgroup>`;
      });

      payerSelect.innerHTML = optionsHtml;
    }

    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-title').value = '';

    // Resetear categoría por defecto a "Comida"
    const catPills = document.querySelectorAll('#expense-category-pills .cat-pill-btn');
    catPills.forEach((p) => {
      if (p.getAttribute('data-cat') === 'Comida') {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (dialog && !dialog.open) dialog.showModal();
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
                  <td><strong>${renderIcon('users', { size: 14 })} ${sf.subFamilyName}</strong></td>
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

    if (dialog && !dialog.open) dialog.showModal();
  }

  renderDirectoryList(directory, mode = 'import') {
    const listMount = document.getElementById('directory-items-list');
    if (!listMount) return;

    // Agrupar directorio por subfamilia
    const grouped = {};
    directory.forEach((d) => {
      const sf = d.subFamily || 'Familia General';
      if (!grouped[sf]) grouped[sf] = [];
      grouped[sf].push(d);
    });

    if (directory.length === 0) {
      listMount.innerHTML = `
        <div class="glass-panel" style="padding: 24px; text-align: center; color: var(--text-secondary);">
          <p style="font-size: 0.95rem; margin-bottom: 8px;">No hay contactos en el directorio maestro.</p>
          <p style="font-size: 0.80rem; color: var(--text-muted);">Toca "+ Nuevo Contacto" para registrar integrantes.</p>
        </div>
      `;
      return;
    }

    listMount.innerHTML = Object.keys(grouped).sort().map((sfName) => {
      const contacts = grouped[sfName];
      return `
        <div class="subfamily-group-card glass-panel" style="padding: 16px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle);">
            <strong style="font-size: 1.0rem; color: var(--color-primary); display: inline-flex; align-items: center; gap: 8px; font-weight: 800;">
              ${renderIcon('users', { size: 16 })} ${sfName}
            </strong>
            <span class="badge-pill badge-neutral">${contacts.length} integrante${contacts.length === 1 ? '' : 's'}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${contacts.map((d) => {
              const isChild = d.category === 'nino';
              return `
                <div class="directory-contact-card glass-panel">
                  <div class="dir-contact-left">
                    ${mode === 'import' ? `<input type="checkbox" value="${d.id}" checked class="dir-import-checkbox" style="accent-color: var(--color-primary); width: 18px; height: 18px; cursor: pointer;" />` : ''}
                    
                    <div class="contact-avatar-circle ${isChild ? 'avatar-child' : 'avatar-adult'}">
                      ${renderIcon(isChild ? 'smile' : 'user', { size: 16 })}
                    </div>

                    <div class="contact-info-col">
                      <span class="contact-name">${d.name}</span>
                      <span class="contact-sf-sub">${sfName} • ${d.weight || (isChild ? 0.5 : 1.0)} ud ponderada</span>
                    </div>
                  </div>

                  <div class="dir-contact-right">
                    <!-- Botón para Alternar / Editar entre Niño y Adulto -->
                    <button 
                      type="button" 
                      class="btn-toggle-dir-category ${isChild ? 'role-child' : 'role-adult'}" 
                      data-id="${d.id}"
                      data-category="${d.category}"
                      title="Clic para alternar entre Adulto (1.0 ud) y Niño (0.5 ud)"
                    >
                      ${renderIcon(isChild ? 'smile' : 'user', { size: 13 })}
                      <span>${isChild ? 'Niño (0.5)' : 'Adulto (1.0)'}</span>
                    </button>

                    <!-- Botón para Eliminar del Directorio -->
                    <button 
                      type="button" 
                      class="btn-delete-dir-contact" 
                      data-id="${d.id}" 
                      data-name="${d.name}" 
                      title="Eliminar del directorio maestro"
                    >
                      ${renderIcon('trash', { size: 15 })}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  openDirectoryModal(mode = 'import') {
    const dialog = document.getElementById('modal-global-directory');
    const importBtn = document.getElementById('btn-import-selected-to-active-event');
    const initialDirectory = getGlobalDirectory();

    if (importBtn) {
      importBtn.style.display = mode === 'import' ? 'inline-flex' : 'none';
    }

    // 1. Renderizado instantáneo desde memoria/caché
    this.renderDirectoryList(initialDirectory, mode);
    if (dialog && !dialog.open) dialog.showModal();

    // 2. Sincronización transparente en segundo plano desde Supabase
    fetchGlobalDirectoryFromSupabase().then((freshDirectory) => {
      this.renderDirectoryList(freshDirectory, mode);
    });
  }
}

// Iniciar aplicación de forma inmediata y resiliente
const initApp = () => {
  try {
    const app = new App();
    app.init().catch((err) => {
      console.error('[ChapApp] Error fatal durante init():', err);
    });
  } catch (err) {
    console.error('[ChapApp] Error instanciando App:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
