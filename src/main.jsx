/**
 * ChapApp - Entry Point React 18 + Vite
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';

// Import Global Stylesheets for Vite HMR and Bundling
import '../styles/theme.css';
import '../styles/glass.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/charts.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
} else {
  console.error('[ChapApp] Root element #root was not found in the DOM.');
}
