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

// Helper para generar ondas armónicas sinusoidales (rayos de energía holográficos)
function createHarmonicSineWave(cx, cy, baseRadius, amplitude, lobes, phase = 0, points = 100) {
  let d = '';
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    const r = baseRadius + amplitude * Math.sin(lobes * theta + phase);
    const x = (cx + r * Math.cos(theta)).toFixed(2);
    const y = (cy + r * Math.sin(theta)).toFixed(2);
    if (i === 0) d += `M ${x} ${y}`;
    else d += ` L ${x} ${y}`;
  }
  return d + ' Z';
}

/**
 * Renderiza el Dial Circular Liquid Glass de Meta y Recaudación con Anillos de Rayos y Órbitas Concéntricas
 */
export const renderCollectionDial = (collected, total, percentage) => {
  const size = 220;
  const center = size / 2; // 110
  const trackRadius = 74;
  const trackStrokeWidth = 12;
  const trackCircumference = 2 * Math.PI * trackRadius; // ~464.95

  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const clampedRatio = Math.max(0, Math.min(1, clampedPercent / 100));
  const isComplete = clampedPercent >= 100;
  const strokeDashoffset = trackCircumference - clampedRatio * trackCircumference;

  // Satélite / Rayo de progreso en la órbita
  const orbitAngle = -Math.PI / 2 + clampedRatio * 2 * Math.PI;
  const satelliteX = center + trackRadius * Math.cos(orbitAngle);
  const satelliteY = center + trackRadius * Math.sin(orbitAngle);

  const activeAccentColor = isComplete ? '#10B981' : clampedRatio > 0.5 ? '#A855F7' : '#00F0FF';

  // Generar ondas armónicas sinusoidales de rayos de luz
  const wavePurple = createHarmonicSineWave(center, center, 74, 8, 3, 0.4);
  const waveCyan = createHarmonicSineWave(center, center, 72, 7, 4, 1.2);
  const waveAmber = createHarmonicSineWave(center, center, 68, 6, 3, 2.5);
  const waveMint = createHarmonicSineWave(center, center, 78, 5, 5, 3.8);

  return `
    <div class="glass-panel chart-liquid-card animate-fade-in">
      <div class="card-header-compact">
        <div class="header-icon-title-group">
          <div class="chart-icon-box">
            ${renderIcon('trending-up', { size: 18 })}
          </div>
          <div>
            <h4 class="card-header-title">Meta y Recaudación</h4>
            <span class="card-header-sub">Flujo de fondos recaudados</span>
          </div>
        </div>

        <div class="badge-recaudado-pill ${isComplete ? 'complete' : ''}">
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

            <!-- 1. Órbitas circulares concéntricas de radar -->
            <circle cx="${center}" cy="${center}" r="92" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" fill="none" />
            <circle cx="${center}" cy="${center}" r="62" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" fill="none" />
            <circle cx="${center}" cy="${center}" r="46" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" fill="none" />

            <!-- 2. Ondas armónicas sinusoidales de rayos y energía holográfica -->
            <path d="${wavePurple}" fill="none" stroke="rgba(192, 132, 252, 0.40)" stroke-width="1.2" />
            <path d="${waveCyan}" fill="none" stroke="rgba(0, 240, 255, 0.42)" stroke-width="1.2" />
            <path d="${waveAmber}" fill="none" stroke="rgba(245, 158, 11, 0.35)" stroke-width="1" />
            <path d="${waveMint}" fill="none" stroke="rgba(16, 185, 129, 0.30)" stroke-width="1" />

            <!-- 3. Carril base del anillo en cristal translúcido esmerilado -->
            <circle class="track-glass-ring" cx="${center}" cy="${center}" r="${trackRadius}" stroke-width="${trackStrokeWidth}" stroke="rgba(255, 255, 255, 0.08)" fill="none" />

            <!-- 4. Barra fluida principal de progreso con filtro de rayos neón -->
            ${clampedPercent > 0 ? `
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
            ` : ''}

            <!-- 5. Satélite indicador brillante (Rayo / Destello en punta activa) -->
            ${clampedPercent > 0 ? `
              <g class="satellite-group">
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="8" fill="${activeAccentColor}" opacity="0.4" />
                <circle cx="${satelliteX.toFixed(2)}" cy="${satelliteY.toFixed(2)}" r="4.2" fill="${activeAccentColor}" stroke="#FFFFFF" stroke-width="1.5" />
              </g>
            ` : ''}
          </svg>

          <!-- Centro con Glassmorfismo Transparente y Tipografía Nítida -->
          <div class="liquid-hub-center">
            <span class="hub-percentage-text">${clampedPercent}%</span>
            <span class="hub-ratio-sub">${formatCurrency(collected).split('.')[0]} / ${formatCurrency(total).split('.')[0]}</span>
          </div>
        </div>
      </div>

      <!-- Píldora inferior recesada de balance monetario (Image 1) -->
      <div class="liquid-recessed-footer">
        <span class="recessed-footer-text">Cobrado <strong class="text-cyan">${formatCurrency(collected)}</strong> de <strong>${formatCurrency(total)}</strong></span>
      </div>
    </div>
  `;
};

/**
 * Renderiza la Distribución Presupuestaria con Cilindros 3D Liquid Glass y Rayos Eléctricos
 */
export const renderCategory3DBars = (expenses = [], totalExpenses = 0) => {
  const catTotals = {
    Varios: 0,
    Bebidas: 0,
    Transporte: 0,
    Hospedaje: 0,
    Comida: 0,
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

  // Ordenar por importe descendente o mantener los 5 rubros estándar
  const categories = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  const barsHtml = categories.map((cat, idx) => {
    const amount = catTotals[cat];
    const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    const catConfig = LUMINOUS_3D_CATEGORY_COLORS[cat] || LUMINOUS_3D_CATEGORY_COLORS.Varios;
    const color = catConfig.hex;
    const glow = catConfig.glow;
    const heightPercent = Math.min(94, Math.max(6, percent));
    const animDelay = (idx * 0.12).toFixed(2);

    return `
      <div 
        class="liquid-cylinder-col" 
        style="--cat-color: ${color}; --cat-glow: ${glow}; --anim-delay: ${animDelay}s;"
        title="${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)"
      >
        <!-- Telemetría Superior -->
        <div class="cylinder-top-stat">
          <span class="cylinder-percent-text">${percent.toFixed(1)}%</span>
          <span class="cylinder-amount-text">${formatCurrency(amount)}</span>
        </div>

        <!-- Cámara del Cilindro 3D de Cristal Líquido (Image 1 & 2) -->
        <div class="liquid-cylinder-chamber">
          <!-- Borde / Aro 3D superior del cilindro de cristal -->
          <div class="chamber-top-rim"></div>

          <!-- Reflejo lateral de vidrio -->
          <div class="chamber-glass-shine"></div>

          <!-- Rayo / Hilo eléctrico vertical animado que baja al menisco -->
          <div class="cylinder-laser-thread" style="bottom: ${heightPercent}%;">
            <svg class="laser-thread-svg" viewBox="0 0 10 100" preserveAspectRatio="none">
              <path d="M5 0 Q3 25, 6 50 T5 100" fill="none" stroke="${color}" stroke-width="1.8" filter="url(#laserFilter_${idx})" />
              <defs>
                <filter id="laserFilter_${idx}">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>

          <!-- Fluido Líquido Animado -->
          <div 
            class="liquid-fluid-stream" 
            style="--target-h: ${heightPercent}%; height: ${heightPercent}%;"
          >
            <!-- Perla / Esfera Luminosa Flotante en la superficie del líquido -->
            <div class="fluid-luminous-pearl" style="background: #FFFFFF; box-shadow: 0 0 8px #FFFFFF, 0 0 16px ${color};"></div>

            <!-- Menisco / Tapa Líquida Superior -->
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
          <div class="chart-icon-box" style="color: #A855F7;">
            ${renderIcon('receipt', { size: 18 })}
          </div>
          <div>
            <h4 class="card-header-title">Distribución Presupuestaria</h4>
            <span class="card-header-sub">Desglose por rubro y categoría</span>
          </div>
        </div>
        <span class="badge-pill badge-neutral">${expenses.length} compras</span>
      </div>

      <!-- Cuadrícula de Cilindros 3D Liquid Glass -->
      <div class="liquid-cylinders-grid">
        ${barsHtml}
      </div>

      <!-- Barra Resumen Inferior Estilizada (Image 2) -->
      <div class="chart-summary-footer-bar">
        <span>Total <strong>${formatCurrency(totalExpenses)}</strong> • Promedio <strong class="text-purple">${formatCurrency(totalExpenses > 0 ? totalExpenses / 4 : 0)}/día</strong></span>
      </div>
    </div>
  `;
};
