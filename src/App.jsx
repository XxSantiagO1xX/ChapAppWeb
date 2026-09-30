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

// Modals
import NewEventModal from './components/modals/NewEventModal.jsx';
import QuickExpenseModal from './components/modals/QuickExpenseModal.jsx';
import AddParticipantModal from './components/modals/AddParticipantModal.jsx';
import CsvImportModal from './components/modals/CsvImportModal.jsx';
import DirectoryModal from './components/modals/DirectoryModal.jsx';
import CutModal from './components/modals/CutModal.jsx';
import AnalyticsModal from './components/analytics/AnalyticsModal.jsx';

export const App = () => {
  const { activeEvent, currentUser } = useApp();
  const [filterTab, setFilterTab] = useState('active');

  // Si no hay usuario autenticado, renderizar la pantalla de Login Liquid Glass 3D
  if (!currentUser) {
    return (
      <div className="app-container login-mode">
        <BackgroundScene />
        <LoginScreen />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Escena de Fondo 8K UHD y Microtextura Esmerilada */}
      <BackgroundScene />

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
      <AnalyticsModal />
      <SettingsModal />
      <ConfirmModal />

      {/* Notificaciones Flotantes Toast */}
      <ToastContainer />
    </div>
  );
};

export default App;
