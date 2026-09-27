/**
 * ChapApp - Gráficas Financieras Futuristas 3D con Rayos de Luz y Núcleo de Energía
 * Estilo Cyberpunk / Arc Reactor / Columnas de Plasma 3D
 */

import { formatCurrency } from '../utils/calculations.js';

const CATEGORY_COLORS = {
  Comida: { hex: '#10B981', glow: 'rgba(16, 185, 129, 0.65)', name: 'Comida' },
  Bebidas: { hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.75)', name: 'Bebidas' },
  Transporte: { hex: '#3B82F6', glow: 'rgba(59, 130, 246, 0.65)', name: 'Transporte' },
  Hospedaje: { hex: '#F59E0B', glow: 'rgba(245, 158, 11, 0.65)', name: 'Hospedaje' },
  Varios: { hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.65)', name: 'Varios' },
};

/**
 * Renderiza el Núcleo Circular de Energía y Recaudación (Arc Reactor SVG)
 */
export const renderCollectionDial = (collected, total, percentage) => {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Ángulo para la cabeza emisora de luz láser
  const angle = (clampedPercent / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  const headX = 90 + radius * Math.cos(rad);
  const headY = 90 + radius * Math.sin(rad);

  return `
    <div class="cyber-chart-card chart-dial-cyber glass-panel">
      <!-- Brillo ambiental y textura de fibra de carbono -->
      <div class="cyber-card-glow-layer"></div>
      
      <div class="card-header-cyber">
        <div class="header-cyber-title-group">
          <span class="cyber-badge-energy">⚡ NÚCLEO DE RECAUDACIÓN</span>
          <h4 class="card-header-title">Avance de Meta</h4>
        </div>
        <div class="cyber-status-chip ${clampedPercent >= 100 ? 'status-complete' : 'status-charging'}">
          <span class="cyber-chip-pulse"></span>
          <span>${clampedPercent}% RECAUDADO</span>
        </div>
      </div>

      <div class="dial-reactor-container">
        <!-- Rayos de luz de fondo del reactor -->
        <div class="reactor-backlight-rays"></div>

        <div class="dial-svg-wrapper">
          <svg class="dial-reactor-svg" viewBox="0 0 180 180">
            <defs>
              <!-- Gradiente Neón del Rayo Principal -->
              <linearGradient id="cyberEnergyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#00F0FF" />
                <stop offset="60%" stop-color="#0284C7" />
                <stop offset="100%" stop-color="#10B981" />
              </linearGradient>

              <!-- Filtro de Resplandor Neón Intenso -->
              <filter id="energyLaserGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <!-- Filtro de Rayo de Punta -->
              <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- 1. Círculo exterior de marcas tácticas -->
            <circle class="dial-tactical-ticks" cx="90" cy="90" r="82" />

            <!-- 2. Pista base metálica con profundidad 3D -->
            <circle class="dial-track-chassis" cx="90" cy="90" r="${radius}" />

            <!-- 3. Rayo de Energía Principal Dinámico -->
            <circle 
              class="dial-energy-stroke animate-energy-fill" 
              cx="90" 
              cy="90" 
              r="${radius}" 
              style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"
            />

            <!-- 4. Cabeza Láser Emisora de Rayos en el extremo -->
            ${clampedPercent > 0 ? `
              <circle 
                class="dial-laser-head" 
                cx="${headX.toFixed(2)}" 
                cy="${headY.toFixed(2)}" 
                r="6.5" 
              />
              <circle 
                class="dial-laser-spark" 
                cx="${headX.toFixed(2)}" 
                cy="${headY.toFixed(2)}" 
                r="3" 
              />
            ` : ''}
          </svg>

          <!-- Núcleo Central con Datos Holográficos -->
          <div class="reactor-core-hud">
            <span class="core-tag">ENERGÍA</span>
            <span class="core-percentage">${clampedPercent}%</span>
            <div class="core-subtext-box">
              <span class="core-amount">${formatCurrency(collected)}</span>
              <span class="core-total-label">de ${formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pie de Telemetría Financiera -->
      <div class="cyber-telemetry-footer">
        <div class="telemetry-item">
          <span class="telemetry-label"><span class="dot-emerald"></span> Recaudado en Caja</span>
          <strong class="telemetry-val text-emerald">${formatCurrency(collected)}</strong>
        </div>
        <div class="telemetry-item item-right">
          <span class="telemetry-label"><span class="dot-amber"></span> Restante por Cubrir</span>
          <strong class="telemetry-val text-amber">${formatCurrency(Math.max(0, total - collected))}</strong>
        </div>
      </div>
    </div>
  `;
};

/**
 * Renderiza la Distribución Presupuestaria con Columnas de Plasma 3D y Rayos de Luz
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

  const columnsHtml = categories.map((cat, idx) => {
    const amount = catTotals[cat];
    const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    const catConfig = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Varios;
    const color = catConfig.hex;
    const glow = catConfig.glow;
    const heightPercent = Math.min(100, Math.max(6, percent));
    const animDelay = (idx * 0.12).toFixed(2);

    return `
      <div 
        class="plasma-column-wrapper" 
        style="--cat-color: ${color}; --cat-glow: ${glow}; --anim-delay: ${animDelay}s;"
        title="${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)"
      >
        <!-- Telemetría Superior: Porcentaje y Monto -->
        <div class="column-telemetry-stat">
          <span class="column-percent-tag">${percent.toFixed(0)}%</span>
          <span class="column-amount-val">${formatCurrency(amount)}</span>
        </div>

        <!-- Haz de Rayo de Luz Vertical Superior -->
        <div class="column-laser-ray-emitter">
          <div class="laser-vertical-beam" style="opacity: ${amount > 0 ? '0.85' : '0.15'};"></div>
        </div>

        <!-- Tubo Cilindro 3D con Cristal, Plasma Líquido y Bisel Metálico -->
        <div class="plasma-tube-chamber">
          <!-- Marcas de Nivel Holográficas (25%, 50%, 75%) -->
          <div class="tube-grid-lines">
            <span class="grid-notch notch-75"></span>
            <span class="grid-notch notch-50"></span>
            <span class="grid-notch notch-25"></span>
          </div>

          <!-- Reflejo Lateral de Cristal 3D -->
          <div class="tube-glass-reflection"></div>

          <!-- Columna Líquida de Plasma con Crecimiento Animado -->
          <div 
            class="plasma-liquid-fill animate-plasma-grow" 
            style="--target-height: ${heightPercent}%; height: ${heightPercent}%;"
          >
            <!-- Tapa de Plasma Neón Resplandeciente -->
            <div class="plasma-emitter-cap">
              <div class="cap-flare-ring"></div>
            </div>
            <!-- Brillo de fondo del plasma -->
            <div class="plasma-inner-glow"></div>
          </div>
        </div>

        <!-- Pedestal Metálico Inferior con LED -->
        <div class="column-base-pedestal">
          <span class="column-led-dot"></span>
          <span class="column-cat-name">${cat}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="cyber-chart-card chart-cylinders-cyber glass-panel">
      <!-- Brillo ambiental y textura de fibra de carbono -->
      <div class="cyber-card-glow-layer"></div>

      <div class="card-header-cyber">
        <div class="header-cyber-title-group">
          <span class="cyber-badge-energy badge-cyan">⚡ CONSUMO DE FONDOS 3D</span>
          <h4 class="card-header-title">Distribución por Categorías</h4>
        </div>
        <div class="cyber-status-chip status-active-laser">
          <span class="cyber-chip-pulse"></span>
          <span>${expenses.length} COMPRA${expenses.length === 1 ? '' : 'S'}</span>
        </div>
      </div>

      <!-- Cuadrícula de 5 Columnas de Plasma 3D -->
      <div class="plasma-columns-grid">
        ${columnsHtml}
      </div>

      <!-- Pie de Telemetría del Total -->
      <div class="cyber-telemetry-footer">
        <div class="telemetry-item">
          <span class="telemetry-label">Volumen Total Liquidado</span>
          <strong class="telemetry-val text-cyan">${formatCurrency(totalExpenses)}</strong>
        </div>
        <div class="telemetry-item item-right">
          <span class="telemetry-label">Balance de Partidas</span>
          <span class="badge-pill badge-neutral">5 Categorías Activas</span>
        </div>
      </div>
    </div>
  `;
};
