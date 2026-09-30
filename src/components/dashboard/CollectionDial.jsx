/**
 * ChapApp - Dial Circular Liquid Glass de Meta y Recaudación (CollectionDial) React
 */

import React from 'react';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

export const CollectionDial = ({ collected = 0, total = 0, percentage = 0 }) => {
  const size = 220;
  const center = size / 2; // 110
  const trackRadius = 74;
  const trackStrokeWidth = 14;
  const trackCircumference = 2 * Math.PI * trackRadius; // ~464.95
  const outerOrbitRadius = 96;
  const innerRingRadius = 54;

  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const clampedRatio = Math.max(0, Math.min(1, clampedPercent / 100));
  const isComplete = clampedPercent >= 100;
  const strokeDashoffset = trackCircumference - clampedRatio * trackCircumference;

  // Satélite / Rayo de progreso en la órbita
  const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
  const satelliteX = center + trackRadius * Math.cos(orbitAngle);
  const satelliteY = center + trackRadius * Math.sin(orbitAngle);

  const activeAccentColor = isComplete ? '#10B981' : clampedRatio > 0.5 ? '#A855F7' : '#00F0FF';

  return (
    <div className="glass-panel chart-liquid-card animate-fade-in">
      <div className="card-header-compact">
        <div className="header-icon-title-group">
          <div className="chart-icon-box" style={{ color: activeAccentColor }}>
            <Icon name="trending-up" size={18} />
          </div>
          <div>
            <h4 className="card-header-title">Meta y Recaudación</h4>
            <span className="card-header-sub">Flujo de fondos recaudados</span>
          </div>
        </div>

        <div className={`badge-status ${isComplete ? 'status-active' : 'badge-cyan'}`}>
          <span>{isComplete ? '✓ 100% CUBIERTO' : `${clampedPercent}% RECAUDADO`}</span>
        </div>
      </div>

      <div className="liquid-gauge-container">
        {/* Resplandor de fondo Liquid Glass */}
        <div className="liquid-glow-aura" style={{ '--accent-color': activeAccentColor }}></div>

        <div className="liquid-svg-wrapper">
          <svg className="liquid-dial-svg" viewBox={`0 0 ${size} ${size}`}>
            <defs>
              <linearGradient id="liquidCollectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="50%" stopColor="#C084FC" />
                <stop offset="100%" stopColor={isComplete ? '#10B981' : '#00E599'} />
              </linearGradient>

              <filter id="liquidRayGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Órbita exterior fina de radar */}
            <circle 
              className="orbit-ring" 
              cx={center} 
              cy={center} 
              r={outerOrbitRadius} 
              stroke="rgba(0, 240, 255, 0.18)" 
              strokeWidth="1" 
              fill="none" 
            />

            {/* 2. Rayos y elipses concéntricas de energía holográfica */}
            <ellipse 
              cx={center} 
              cy={center} 
              rx="92" 
              ry="82" 
              stroke="rgba(192, 132, 252, 0.20)" 
              strokeWidth="1" 
              fill="none" 
              transform={`rotate(-20 ${center} ${center})`} 
            />
            <ellipse 
              cx={center} 
              cy={center} 
              rx="86" 
              ry="76" 
              stroke="rgba(0, 240, 255, 0.22)" 
              strokeWidth="1" 
              fill="none" 
              transform={`rotate(30 ${center} ${center})`} 
            />
            <ellipse 
              cx={center} 
              cy={center} 
              rx="90" 
              ry="78" 
              stroke="rgba(245, 158, 11, 0.15)" 
              strokeWidth="0.8" 
              fill="none" 
              transform={`rotate(75 ${center} ${center})`} 
            />

            {/* 3. Carril base del anillo en cristal translúcido esmerilado */}
            <circle 
              className="track-glass-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth} 
              stroke="rgba(255, 255, 255, 0.08)" 
              fill="none" 
            />

            {/* 4. Barra fluida principal de progreso que sigue al indicador circular */}
            <circle 
              className="progress-liquid-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth}
              stroke="url(#liquidCollectionGrad)"
              fill="none"
              style={{
                stroke: 'url(#liquidCollectionGrad)',
                strokeDasharray: trackCircumference,
                strokeDashoffset: strokeDashoffset,
                strokeLinecap: 'round',
                transform: 'rotate(-90deg)',
                transformOrigin: `${center}px ${center}px`,
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />

            {/* 5. Guía concéntrica interior */}
            <circle 
              className="inner-guide-ring" 
              cx={center} 
              cy={center} 
              r={innerRingRadius} 
              stroke="rgba(255, 255, 255, 0.12)" 
              strokeWidth="1" 
              fill="none" 
            />

            {/* 6. Satélite indicador brillante */}
            {clampedPercent > 0 && (
              <g className="satellite-group">
                <circle cx={satelliteX} cy={satelliteY} r="8" fill={activeAccentColor} opacity="0.4" />
                <circle cx={satelliteX} cy={satelliteY} r="4.2" fill={activeAccentColor} stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            )}
          </svg>

          {/* Centro con Glassmorfismo y Tipografía Nítida */}
          <div className="liquid-hub-center glass-panel">
            <span className="hub-percentage-text">{clampedPercent}%</span>
            <span className="hub-ratio-sub">
              {formatCurrency(collected).split('.')[0]} / {formatCurrency(total).split('.')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Píldora inferior de balance monetario */}
      <div className="liquid-card-footer">
        <span>Cobrado <strong className="text-cyan">{formatCurrency(collected)}</strong></span>
        <span>Faltan <strong className="text-amber">{formatCurrency(Math.max(0, total - collected))}</strong></span>
      </div>
    </div>
  );
};

export default CollectionDial;
