/**
 * ChapApp - Componente de Fondo Dinámico 8K UHD y Microtextura de Cristal (BackgroundScene)
 * Renderizado ultra-fluido acelerado por hardware con soporte de múltiples presets y fotos personalizadas
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

export const BackgroundScene = () => {
  const { backgroundTheme = 'nebulosa', customBgUrl } = useApp();

  return (
    <div className="app-backdrop-scene" aria-hidden="true" data-bg-theme={backgroundTheme}>
      {backgroundTheme === 'custom' && customBgUrl ? (
        <>
          <div 
            className="backdrop-custom-image" 
            style={{ backgroundImage: `url(${customBgUrl})` }} 
          />
          <div className="backdrop-custom-overlay" />
        </>
      ) : (
        <div className="backdrop-mesh-canvas">
          <div className="mesh-orb mesh-orb-1" />
          <div className="mesh-orb mesh-orb-2" />
          <div className="mesh-orb mesh-orb-3" />
        </div>
      )}

      {/* Microtextura esmerilada de cuarzo físico 8K UHD */}
      <div className="backdrop-crystal-noise" />
    </div>
  );
};

export default BackgroundScene;
