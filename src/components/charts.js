/**
 * ChapApp - Gráficas Financieras Liquid Glass 3D con Ondas Fluidas y Rayos de Luz
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
 * Genera trayectorias SVG ondulantes para simular líquido dentro del cristal (Liquid Glass Waves)
 */
function createFluidWavePath(cx, cy, baseRadius, amplitude, waves, phase = 0) {
  const steps = waves * 16;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const r = baseRadius + amplitude * Math.sin(waves * angle + phase);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  d += ' Z';
  return d;
}

/**
 * Renderiza el Dial Circular Liquid Glass de Meta y Recaudación
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

  // Ondas líquidas fluidas
  const waveRibbon1 = createFluidWavePath(center, center, 74, 8, 4, 0);
  const waveRibbon2 = createFluidWavePath(center, center, 74, 6, 5, Math.PI / 3);

  // Satélite / Rayo de progreso en la órbita
  const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
  const satelliteX = center + outerOrbitRadius * Math.cos(orbitAngle);
  const satelliteY = center + outerOrbitRadius * Math.sin(orbitAngle);

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

              <!-- Degradados de ondas translúcidas -->
              <linearGradient id="liquidWaveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.45" />
                <stop offset="50%" stop-color="#C084FC" stop-opacity="0.30" />
                <stop offset="100%" stop-color="#10B981" stop-opacity="0.40" />
              </linearGradient>

              <linearGradient id="liquidWaveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#A855F7" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#00F0FF" stop-opacity="0.25" />
              </linearGradient>

              <!-- Filtro de resplandor Neón -->
              <filter id="liquidRayGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- 1. Órbita exterior fina -->
            <circle class="orbit-ring" cx="${center}" cy="${center}" r="${outerOrbitRadius}" />

            <!-- 2. Ondas líquidas fluidas de cristal -->
            <path d="${waveRibbon1}" stroke="url(#liquidWaveGrad1)" stroke-width="1.8" fill="none" class="liquid-wave-path" />
            <path d="${waveRibbon2}" stroke="url(#liquidWaveGrad2)" stroke-width="1.2" fill="none" class="liquid-wave-path wave-delay" />

            <!-- 3. Carril base del anillo en cristal translúcido -->
            <circle class="track-glass-ring" cx="${center}" cy="${center}" r="${trackRadius}" stroke-width="${trackStrokeWidth}" />

            <!-- 4. Barra fluida principal de progreso con filtro de rayos -->
            <circle 
              class="progress-liquid-ring" 
              cx="${center}" 
              cy="${center}" 
              r="${trackRadius}" 
              stroke-width="${trackStrokeWidth}"
              style="stroke-dasharray: ${trackCircumference}; stroke-dashoffset: ${strokeDashoffset};"
            />

            <!-- 5. Guía concéntrica interior -->
            <circle class="inner-guide-ring" cx="${center}" cy="${center}" r="${innerRingRadius}" />

            <!-- 6. Satélite indicador brillante (Rayo / Destello orbital) -->
            ${clampedPercent > 0 ? `
              <g class="satellite-group">
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="7" fill="${activeAccentColor}" opacity="0.35" />
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="3.8" fill="${activeAccentColor}" stroke="#FFFFFF" stroke-width="1.2" />
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
            <!-- Menisco / Tapa Líquida Superior -->
            <div class="fluid-meniscus-cap">
              <div class="meniscus-flare"></div>
            </div>
            <!-- Brillo de fondo del líquido -->
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
