/**
 * ChapApp - Componente Raíz de la Aplicación React
 */

import React, { useState } from 'react';
import { useApp } from './context/AppContext.jsx';

// Common
import Header from './components/common/Header.jsx';
import Drawer from './components/common/Drawer.jsx';
import ToastContainer from './components/common/Toast.jsx';
import ConfirmModal from './components/common/ConfirmModal.jsx';

// Views
import EventList from './components/events/EventList.jsx';
import EventDashboard from './components/dashboard/EventDashboard.jsx';

// Modals
import NewEventModal from './components/modals/NewEventModal.jsx';
import QuickExpenseModal from './components/modals/QuickExpenseModal.jsx';
import AddParticipantModal from './components/modals/AddParticipantModal.jsx';
import CsvImportModal from './components/modals/CsvImportModal.jsx';
import DirectoryModal from './components/modals/DirectoryModal.jsx';
import CutModal from './components/modals/CutModal.jsx';

export const App = () => {
  const { activeEvent } = useApp();
  const [filterTab, setFilterTab] = useState('active');

  return (
    <div className="app-container">
      {/* Header Fijo Liquid Glass con Emblema Central */}
      <Header />

      {/* Menú Deslizante (Drawer) */}
      <Drawer filterTab={filterTab} setFilterTab={setFilterTab} />

      {/* Contenido Dinámico: Dashboard del Evento o Lista de Eventos */}
      <main className="main-content-flow">
        {activeEvent ? (
          <EventDashboard />
        ) : (
          <EventList filterTab={filterTab} setFilterTab={setFilterTab} />
        )}
      </main>

      {/* Modales Centralizados */}
      <NewEventModal />
      <QuickExpenseModal />
      <AddParticipantModal />
      <CsvImportModal />
      <DirectoryModal />
      <CutModal />
      <ConfirmModal />

      {/* Notificaciones Flotantes Toast */}
      <ToastContainer />
    </div>
  );
};

export default App;
