/**
 * ChapApp - Dial Circular Liquid Glass de Meta y Recaudación (CollectionDial) React
 * Rediseño armónico en tonos ámbar, cobre y oro líquido neón sin distorsiones ni elementos desalineados
 */

import React from 'react';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

export const CollectionDial = ({ collected = 0, total = 0, percentage = 0 }) => {
  const size = 220;
  const center = size / 2; // 110
  const trackRadius = 76;
  const trackStrokeWidth = 13;
  const trackCircumference = 2 * Math.PI * trackRadius; // ~477.52

  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const clampedRatio = Math.max(0, Math.min(1, clampedPercent / 100));
  const isComplete = clampedPercent >= 100;
  const strokeDashoffset = trackCircumference * (1 - clampedRatio);

  // Coordenadas exactas para la punta iluminada (beacon) que acompaña al trazo
  const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
  const tipX = center + trackRadius * Math.cos(orbitAngle);
  const tipY = center + trackRadius * Math.sin(orbitAngle);

  // Paleta cálida líquida: Ámbar / Cobre / Oro Neón (o Esmeralda si está cubierto al 100%)
  const primaryGlow = isComplete ? '#10B981' : '#F59E0B';
  const remainingAmount = Math.max(0, total - collected);

  return (
    <div className="glass-panel chart-liquid-card animate-fade-in">
      {/* Cabecera de la tarjeta */}
      <div className="card-header-compact">
        <div className="header-icon-title-group">
          <div className="chart-icon-box" style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}>
            <Icon name="trending-up" size={18} />
          </div>
          <div>
            <h4 className="card-header-title">Meta y Recaudación</h4>
            <span className="card-header-sub">Flujo de fondos recaudados</span>
          </div>
        </div>

        <div className={`badge-pill ${isComplete ? 'badge-emerald' : 'badge-amber'}`}>
          <span>{isComplete ? '✓ 100% Cubierto' : `${clampedPercent}% Recaudado`}</span>
        </div>
      </div>

      {/* Contenedor del Dial Circular Centrado */}
      <div className="liquid-gauge-container">
        {/* Aura difuminada cálida */}
        <div 
          className="liquid-glow-aura" 
          style={{ background: `radial-gradient(circle, ${isComplete ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.22)'} 0%, transparent 70%)` }} 
        />

        <div className="liquid-svg-wrapper">
          <svg className="liquid-dial-svg" viewBox={`0 0 ${size} ${size}`}>
            <defs>
              {/* Degradado Cobre -> Ámbar -> Oro Líquido */}
              <linearGradient id="liquidAmberCopperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                {isComplete ? (
                  <>
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10B981" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#EA580C" />
                    <stop offset="45%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FDE047" />
                  </>
                )}
              </linearGradient>

              {/* Filtro de resplandor para la punta del anillo */}
              <filter id="liquidAmberTipGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Anillo exterior sutil concéntrico */}
            <circle 
              cx={center} 
              cy={center} 
              r={94} 
              stroke="rgba(245, 158, 11, 0.15)" 
              strokeWidth="1" 
              strokeDasharray="4 6"
              fill="none" 
            />

            {/* 2. Carril base translúcido (Track) */}
            <circle 
              className="track-glass-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth} 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeLinecap="round"
              fill="none" 
            />

            {/* 3. Anillo de progreso fluido continuo */}
            <circle 
              className="progress-liquid-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth}
              stroke="url(#liquidAmberCopperGrad)"
              fill="none"
              strokeDasharray={trackCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />

            {/* 4. Punta luminosa sincronizada en el extremo del arco */}
            {clampedPercent > 0 && (
              <g className="progress-head-beacon" filter="url(#liquidAmberTipGlow)">
                <circle cx={tipX} cy={tipY} r="8.5" fill={primaryGlow} opacity="0.4" />
                <circle cx={tipX} cy={tipY} r="4.5" fill={isComplete ? '#10B981' : '#FDE047'} stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            )}
          </svg>

          {/* Núcleo central con Glassmorphism y tipografía ámbar/oro */}
          <div className="liquid-hub-center glass-panel">
            <span 
              className="hub-percentage-text" 
              style={{ 
                color: isComplete ? '#10B981' : '#FDE047',
                textShadow: isComplete ? '0 0 18px rgba(16, 185, 129, 0.45)' : '0 0 18px rgba(245, 158, 11, 0.45)' 
              }}
            >
              {clampedPercent}%
            </span>
            <span className="hub-ratio-sub">
              {formatCurrency(collected).split('.')[0]} / {formatCurrency(total).split('.')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Píldoras de balance monetario inferiores alineadas y con amplio espacio */}
      <div className="liquid-card-footer-pills">
        <div className="balance-stat-col">
          <span className="balance-stat-label">Cobrado</span>
          <span className="balance-stat-val text-emerald-bright">{formatCurrency(collected)}</span>
        </div>
        <div className="balance-stat-divider" />
        <div className="balance-stat-col text-right">
          <span className="balance-stat-label">Faltan por cobrar</span>
          <span className="balance-stat-val text-amber-bright">{formatCurrency(remainingAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default CollectionDial;
