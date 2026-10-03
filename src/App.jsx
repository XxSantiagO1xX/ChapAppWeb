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
import BackgroundScene from './components/common/BackgroundScene.jsx';

// Auth & Settings
import LoginScreen from './components/auth/LoginScreen.jsx';
import SettingsModal from './components/settings/SettingsModal.jsx';

// Views
import EventList from './components/events/EventList.jsx';
import EventDashboard from './components/dashboard/EventDashboard.jsx';
import DirectoryView from './components/directory/DirectoryView.jsx';

// Modals
import NewEventModal from './components/modals/NewEventModal.jsx';
import QuickExpenseModal from './components/modals/QuickExpenseModal.jsx';
import AddParticipantModal from './components/modals/AddParticipantModal.jsx';
import CsvImportModal from './components/modals/CsvImportModal.jsx';
import ImportParticipantsModal from './components/modals/ImportParticipantsModal.jsx';
import CutModal from './components/modals/CutModal.jsx';
import AnalyticsModal from './components/analytics/AnalyticsModal.jsx';

export const App = () => {
  const { currentView, activeEvent, currentUser } = useApp();
  const [filterTab, setFilterTab] = useState('active');

  // Si no hay usuario autenticado, renderizar la pantalla de Login con su background propio y dedicado
  if (!currentUser) {
    return (
      <div className="login-viewport-wrapper">
        <LoginScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Escena de Fondo 8K UHD y Microtextura Esmerilada */}
      <BackgroundScene />

      {/* Header Cápsula Lumina Glass (Scrollable con la página, no fijo) */}
      <Header />

      {/* Menú Deslizante (Drawer) */}
      <Drawer filterTab={filterTab} setFilterTab={setFilterTab} />

      {/* Contenido Dinámico: Pantalla Completa de Directorio, Dashboard del Evento o Lista de Eventos */}
      <main className="main-content-flow">
        {currentView === 'directory' ? (
          <DirectoryView />
        ) : activeEvent ? (
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
      <ImportParticipantsModal />
      <CutModal />
      <AnalyticsModal />
      <SettingsModal />
      <ConfirmModal />

      {/* Notificaciones Flotantes Toast */}
      <ToastContainer />
    </div>
  );
};

export default App;
