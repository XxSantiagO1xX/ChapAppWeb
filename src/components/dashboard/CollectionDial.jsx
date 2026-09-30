/**
 * ChapApp - Dial Circular Liquid Glass de Meta y Recaudación (CollectionDial) React
 * Paleta 2: Contraste Místico Multicromático (Hilos orbitales entrelazados en turquesa menta, violeta amatista y ámbar cálido)
 */

import React from 'react';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

export const CollectionDial = ({ collected = 0, total = 0, percentage = 0 }) => {
  const size = 220;
  const center = size / 2; // 110
  const trackRadius = 76;
  const trackStrokeWidth = 12;
  const trackCircumference = 2 * Math.PI * trackRadius; // ~477.52

  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const clampedRatio = Math.max(0, Math.min(1, clampedPercent / 100));
  const isComplete = clampedPercent >= 100;
  const strokeDashoffset = trackCircumference * (1 - clampedRatio);

  // Coordenadas exactas para la punta iluminada (beacon) que acompaña al trazo
  const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
  const tipX = center + trackRadius * Math.cos(orbitAngle);
  const tipY = center + trackRadius * Math.sin(orbitAngle);

  const remainingAmount = Math.max(0, total - collected);

  return (
    <div className="glass-panel chart-liquid-card animate-fade-in">
      {/* Cabecera de la tarjeta */}
      <div className="card-header-compact">
        <div className="header-icon-title-group">
          <div className="chart-icon-box" style={{ color: '#00F0FF', background: 'rgba(0, 240, 255, 0.12)' }}>
            <Icon name="trending-up" size={18} />
          </div>
          <div>
            <h4 className="card-header-title">Meta y Recaudación</h4>
            <span className="card-header-sub">Flujo de fondos recaudados</span>
          </div>
        </div>

        <div className={`badge-pill ${isComplete ? 'badge-emerald' : 'badge-cyan'}`}>
          <span>{isComplete ? '✓ 100% Cubierto' : `${clampedPercent}% Recaudado`}</span>
        </div>
      </div>

      {/* Contenedor del Dial Circular Centrado */}
      <div className="liquid-gauge-container">
        {/* Aura difuminada mística multicromática */}
        <div 
          className="liquid-glow-aura" 
          style={{ background: 'radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, rgba(192, 132, 252, 0.12) 45%, transparent 70%)' }} 
        />

        <div className="liquid-svg-wrapper">
          <svg className="liquid-dial-svg" viewBox={`0 0 ${size} ${size}`}>
            <defs>
              {/* Degradado Barra de Progreso Turquesa Menta -> Cian Neón */}
              <linearGradient id="liquidProgressMystic" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#00F0FF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
              </linearGradient>

              {/* Degradados Multicromáticos para los Hilos Orbitales Entrelazados */}
              {/* Hilo 1: Ámbar Oro Solar */}
              <linearGradient id="threadAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.80" />
                <stop offset="100%" stopColor="#FB923C" stopOpacity="0.50" />
              </linearGradient>

              {/* Hilo 2: Turquesa Menta Neón */}
              <linearGradient id="threadTurquoise" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.45" />
              </linearGradient>

              {/* Hilo 3: Violeta Amatista Mística */}
              <linearGradient id="threadViolet" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.80" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.40" />
              </linearGradient>

              {/* Hilo 4: Esmeralda Menta */}
              <linearGradient id="threadEmerald" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.35" />
              </linearGradient>

              {/* Filtro de resplandor para el beacon */}
              <filter id="beaconGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Hilos orbitales entrelazados (Réplica exacta de la referencia multicromática) */}
            <ellipse 
              cx={center} 
              cy={center} 
              rx="93" 
              ry="82" 
              stroke="url(#threadAmber)" 
              strokeWidth="1.1" 
              fill="none" 
              transform={`rotate(-22 ${center} ${center})`} 
            />
            <ellipse 
              cx={center} 
              cy={center} 
              rx="88" 
              ry="76" 
              stroke="url(#threadTurquoise)" 
              strokeWidth="1.2" 
              fill="none" 
              transform={`rotate(28 ${center} ${center})`} 
            />
            <ellipse 
              cx={center} 
              cy={center} 
              rx="91" 
              ry="80" 
              stroke="url(#threadViolet)" 
              strokeWidth="1.1" 
              fill="none" 
              transform={`rotate(72 ${center} ${center})`} 
            />
            <ellipse 
              cx={center} 
              cy={center} 
              rx="86" 
              ry="78" 
              stroke="url(#threadEmerald)" 
              strokeWidth="0.9" 
              fill="none" 
              transform={`rotate(-60 ${center} ${center})`} 
            />

            {/* Carril base circular muy sutil */}
            <circle 
              className="track-glass-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth} 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeLinecap="round"
              fill="none" 
            />

            {/* Barra fluida principal de progreso (Cian / Turquesa Menta) */}
            <circle 
              className="progress-liquid-ring" 
              cx={center} 
              cy={center} 
              r={trackRadius} 
              strokeWidth={trackStrokeWidth}
              stroke="url(#liquidProgressMystic)"
              fill="none"
              strokeDasharray={trackCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                stroke: 'url(#liquidProgressMystic)',
                transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />

            {/* Indicador de punta (Beacon) con anillo exterior neón y núcleo blanco */}
            {clampedPercent > 0 && (
              <g className="progress-head-beacon" filter="url(#beaconGlowFilter)">
                <circle cx={tipX} cy={tipY} r="8.5" fill="#00F0FF" opacity="0.4" />
                <circle cx={tipX} cy={tipY} r="5" fill="#0A1626" stroke="#00F0FF" strokeWidth="2" />
                <circle cx={tipX} cy={tipY} r="2" fill="#FFFFFF" />
              </g>
            )}
          </svg>

          {/* Núcleo central limpio sin bloqueos opacos */}
          <div className="liquid-hub-center-clean">
            <span className="hub-percentage-text-clean">{clampedPercent}%</span>
            <span className="hub-ratio-sub-clean">
              {formatCurrency(collected).split('.')[0]} / {formatCurrency(total).split('.')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Píldoras de balance monetario inferiores alineadas y con amplio espacio */}
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
