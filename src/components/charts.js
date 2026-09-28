/**
 * ChapApp - Gráficas Financieras Liquid Glass 3D con Anillos de Energía y Rayos de Luz
 */

import { formatCurrency } from '../utils/calculations.js';
import { renderIcon } from '../utils/icons.js';

const LUMINOUS_3D_CATEGORY_COLORS = {
  Comida: { hex: '#F59E0B', glow: 'rgba(245, 158, 11, 0.60)', label: 'Comida' },
  Bebidas: { hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.65)', label: 'Bebidas' },
  Transporte: { hex: '#38BDF8', glow: 'rgba(56, 189, 248, 0.60)', label: 'Transporte' },
  Hospedaje: { hex: '#FF7A00', glow: 'rgba(255, 122, 0, 0.60)', label: 'Hospedaje' },
  Varios: { hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.60)', label: 'Varios' },
};

/**
 * Renderiza el Dial Circular Liquid Glass de Meta y Recaudación con Anillos de Rayos y Órbitas Concéntricas
 */
export const renderCollectionDial = (collected, total, percentage) => {
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

  return `
    <div class="glass-panel chart-liquid-card animate-fade-in">
      <div class="card-header-compact">
        <div class="header-icon-title-group">
          <div class="chart-icon-box" style="color: ${activeAccentColor};">
            ${renderIcon('trending-up', { size: 18 })}
          </div>
          <div>
            <h4 class="card-header-title">Meta y Recaudación</h4>
            <span class="card-header-sub">Flujo de fondos recaudados</span>
          </div>
        </div>

        <div class="badge-status ${isComplete ? 'status-active' : 'badge-cyan'}">
          <span>${isComplete ? '✓ 100% CUBIERTO' : `${clampedPercent}% RECAUDADO`}</span>
        </div>
      </div>

      <div class="liquid-gauge-container">
        <!-- Resplandor de fondo Liquid Glass -->
        <div class="liquid-glow-aura" style="--accent-color: ${activeAccentColor};"></div>

        <div class="liquid-svg-wrapper">
          <svg class="liquid-dial-svg" viewBox="0 0 ${size} ${size}">
            <defs>
              <!-- Degradado dinámico: Cian -> Lavanda -> Verde Menta -->
              <linearGradient id="liquidCollectionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00F0FF" />
                <stop offset="50%" stop-color="#C084FC" />
                <stop offset="100%" stop-color="${isComplete ? '#10B981' : '#00E599'}" />
              </linearGradient>

              <!-- Filtro de resplandor Neón y Rayos -->
              <filter id="liquidRayGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- 1. Órbita exterior fina de radar -->
            <circle class="orbit-ring" cx="${center}" cy="${center}" r="${outerOrbitRadius}" stroke="rgba(0, 240, 255, 0.18)" stroke-width="1" fill="none" />

            <!-- 2. Rayos y elipses concéntricas de energía holográfica -->
            <ellipse cx="${center}" cy="${center}" rx="92" ry="82" stroke="rgba(192, 132, 252, 0.20)" stroke-width="1" fill="none" transform="rotate(-20 ${center} ${center})" />
            <ellipse cx="${center}" cy="${center}" rx="86" ry="76" stroke="rgba(0, 240, 255, 0.22)" stroke-width="1" fill="none" transform="rotate(30 ${center} ${center})" />
            <ellipse cx="${center}" cy="${center}" rx="90" ry="78" stroke="rgba(245, 158, 11, 0.15)" stroke-width="0.8" fill="none" transform="rotate(75 ${center} ${center})" />

            <!-- 3. Carril base del anillo en cristal translúcido esmerilado -->
            <circle class="track-glass-ring" cx="${center}" cy="${center}" r="${trackRadius}" stroke-width="${trackStrokeWidth}" stroke="rgba(255, 255, 255, 0.08)" fill="none" />

            <!-- 4. Barra fluida principal de progreso con filtro de rayos neón -->
            <circle 
              class="progress-liquid-ring" 
              cx="${center}" 
              cy="${center}" 
              r="${trackRadius}" 
              stroke-width="${trackStrokeWidth}"
              stroke="url(#liquidCollectionGrad)"
              fill="none"
              filter="url(#liquidRayGlow)"
              style="stroke-dasharray: ${trackCircumference}; stroke-dashoffset: ${strokeDashoffset}; stroke-linecap: round; transform: rotate(-90deg); transform-origin: ${center}px ${center}px; transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);"
            />

            <!-- 5. Guía concéntrica interior -->
            <circle class="inner-guide-ring" cx="${center}" cy="${center}" r="${innerRingRadius}" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1" fill="none" />

            <!-- 6. Satélite indicador brillante (Rayo / Destello en punta activa) -->
            ${clampedPercent > 0 ? `
              <g class="satellite-group">
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="8" fill="${activeAccentColor}" opacity="0.4" />
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="4.2" fill="${activeAccentColor}" stroke="#FFFFFF" stroke-width="1.5" />
              </g>
            ` : ''}
          </svg>

          <!-- Centro con Glassmorfismo y Tipografía Nítida -->
          <div class="liquid-hub-center glass-panel">
            <span class="hub-percentage-text">${clampedPercent}%</span>
            <span class="hub-ratio-sub">${formatCurrency(collected).split('.')[0]} / ${formatCurrency(total).split('.')[0]}</span>
          </div>
        </div>
      </div>

      <!-- Píldora inferior de balance monetario -->
      <div class="liquid-card-footer">
        <span>Cobrado <strong class="text-cyan">${formatCurrency(collected)}</strong></span>
        <span>Faltan <strong class="text-amber">${formatCurrency(Math.max(0, total - collected))}</strong></span>
      </div>
    </div>
  `;
};

/**
 * Renderiza la Distribución Presupuestaria con Cilindros 3D Liquid Glass y Rayos
 */
export const renderCategory3DBars = (expenses = [], totalExpenses = 0) => {
  const catTotals = {
    Comida: 0,
    Bebidas: 0,
    Transporte: 0,
    Hospedaje: 0,
    Varios: 0,
  };

  expenses.forEach((exp) => {
    const cat = exp.category || 'Varios';
    const val = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    if (catTotals[cat] !== undefined) {
      catTotals[cat] += val;
    } else {
      catTotals.Varios += val;
    }
  });

  const categories = Object.keys(catTotals);

  const barsHtml = categories.map((cat, idx) => {
    const amount = catTotals[cat];
    const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    const catConfig = LUMINOUS_3D_CATEGORY_COLORS[cat] || LUMINOUS_3D_CATEGORY_COLORS.Varios;
    const color = catConfig.hex;
    const glow = catConfig.glow;
    const heightPercent = Math.min(100, Math.max(8, percent));
    const animDelay = (idx * 0.12).toFixed(2);

    return `
      <div 
        class="liquid-cylinder-col" 
        style="--cat-color: ${color}; --cat-glow: ${glow}; --anim-delay: ${animDelay}s;"
        title="${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)"
      >
        <!-- Telemetría Superior -->
        <div class="cylinder-top-stat">
          <span class="cylinder-percent-text">${percent.toFixed(0)}%</span>
          <span class="cylinder-amount-text">${formatCurrency(amount)}</span>
        </div>

        <!-- Haz de Rayo de Luz Superior -->
        <div class="cylinder-ray-emitter">
          <div class="laser-vertical-ray" style="opacity: ${amount > 0 ? '0.85' : '0.15'};"></div>
        </div>

        <!-- Cámara del Cilindro 3D de Cristal Líquido -->
        <div class="liquid-cylinder-chamber">
          <!-- Marcas Holográficas de Nivel -->
          <div class="chamber-level-marks">
            <span class="level-mark mark-75"></span>
            <span class="level-mark mark-50"></span>
            <span class="level-mark mark-25"></span>
          </div>

          <!-- Reflejo Lateral de Vidrio / Cristal Refractivo -->
          <div class="chamber-glass-shine"></div>

          <!-- Fluido Líquido Animado -->
          <div 
            class="liquid-fluid-stream" 
            style="--target-h: ${heightPercent}%; height: ${heightPercent}%;"
          >
            <!-- Menisco / Tapa Líquida Superior con Brillo Neón -->
            <div class="fluid-meniscus-cap">
              <div class="meniscus-flare"></div>
            </div>
            <!-- Brillo interior del líquido -->
            <div class="fluid-interior-glow"></div>
          </div>
        </div>

        <!-- Pedestal Inferior -->
        <div class="cylinder-bottom-pedestal">
          <span class="pedestal-dot"></span>
          <span class="pedestal-label">${cat}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="glass-panel chart-liquid-card animate-fade-in">
      <div class="card-header-compact">
        <div class="header-icon-title-group">
          <div class="chart-icon-box" style="color: #F59E0B;">
            ${renderIcon('food', { size: 18 })}
          </div>
          <div>
            <h4 class="card-header-title">Distribución Presupuestaria</h4>
            <span class="card-header-sub">Desglose por rubro y categoría</span>
          </div>
        </div>
        <span class="badge-pill badge-neutral">${expenses.length} compra${expenses.length === 1 ? '' : 's'}</span>
      </div>

      <!-- Cuadrícula de Cilindros 3D Liquid Glass -->
      <div class="liquid-cylinders-grid">
        ${barsHtml}
      </div>

      <!-- Pie de Gasto Total -->
      <div class="liquid-card-footer">
        <span>Gasto Total: <strong class="text-primary">${formatCurrency(totalExpenses)}</strong></span>
        <span>Rubros: <strong>5 Categorías</strong></span>
      </div>
    </div>
  `;
};
