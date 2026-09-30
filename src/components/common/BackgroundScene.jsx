/**
 * ChapApp - Componente de Fondo Oficial (BackgroundScene)
 * Alternancia automática y 100% nítida entre Modo Oscuro y Claro sin distorsión ni desenfoque (blur)
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import bgDark from '../../assets/bg_dark.jpg';
import bgLight from '../../assets/bg_light.jpg';

export const BackgroundScene = () => {
  const { theme = 'dark' } = useApp();
  const isLight = theme === 'light';

  return (
    <div className="app-backdrop-scene" aria-hidden="true" data-theme={theme}>
      {/* Capa de Flor de Loto Modo Oscuro */}
      <div 
        className={`app-background-layer bg-dark-layer ${!isLight ? 'active' : ''}`}
        style={{ backgroundImage: `url(${bgDark})` }}
      />
      {/* Capa de Flor de Loto Modo Claro */}
      <div 
        className={`app-background-layer bg-light-layer ${isLight ? 'active' : ''}`}
        style={{ backgroundImage: `url(${bgLight})` }}
      />
    </div>
  );
};

export default BackgroundScene;
