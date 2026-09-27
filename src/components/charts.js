/**
 * ChapApp - Gráficas Financieras Interactivas y 3D en SVG/CSS
 * Cero dependencias pesadas, máximo rendimiento 60fps
 */

import { formatCurrency } from '../utils/calculations.js';

const CATEGORY_COLORS = {
  Comida: '#10B981',      // Esmeralda
  Bebidas: '#00F0FF',     // Neon Cyan
  Transporte: '#3B82F6',  // Azul
  Hospedaje: '#F59E0B',   // Ámbar
  Varios: '#A855F7',      // Púrpura
  Rentas: '#F43F5E',      // Coral
};

/**
 * Renderiza el Dial Circular de Meta y Recaudación (SVG)
 */
export const renderCollectionDial = (collected, total, percentage) => {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return `
    <div class="chart-dial-card glass-panel">
      <div class="card-header-compact">
        <span class="card-header-title">Meta y Recaudación</span>
        <span class="badge-pill badge-cyan">${clampedPercent}% RECAUDADO</span>
      </div>
      <div class="dial-wrapper">
        <svg class="dial-svg" viewBox="0 0 160 160">
          <circle class="dial-track" cx="80" cy="80" r="${radius}" />
          <circle 
            class="dial-progress" 
            cx="80" 
            cy="80" 
            r="${radius}" 
            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"
          />
        </svg>
        <div class="dial-content">
          <span class="dial-percent">${clampedPercent}%</span>
          <span class="dial-subtext">${formatCurrency(collected)} de ${formatCurrency(total)}</span>
        </div>
      </div>
      <div class="dial-footer">
        <span>Cobrado <strong>${formatCurrency(collected)}</strong></span>
        <span>Faltan <strong>${formatCurrency(Math.max(0, total - collected))}</strong></span>
      </div>
    </div>
  `;
};

/**
 * Renderiza la Distribución Presupuestaria con Cilindros 3D Líquidos
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
    if (catTotals[cat] !== undefined) {
      catTotals[cat] += typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    } else {
      catTotals.Varios += typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
    }
  });

  const categories = Object.keys(catTotals);
  const barsHtml = categories.map((cat) => {
    const amount = catTotals[cat];
    const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
    const color = CATEGORY_COLORS[cat] || '#00F0FF';
    const heightPercent = Math.min(100, Math.max(8, percent));

    return `
      <div class="cylinder-bar-wrapper" title="${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)">
        <div class="cylinder-header-stat">
          <span class="cylinder-percent">${percent.toFixed(0)}%</span>
          <span class="cylinder-amount">${formatCurrency(amount)}</span>
        </div>
        <div class="cylinder-tube">
          <div 
            class="cylinder-liquid" 
            style="height: ${heightPercent}%; background: linear-gradient(180deg, ${color}, ${color}AA); box-shadow: 0 0 16px ${color}88;"
          >
            <div class="cylinder-cap" style="background: ${color};"></div>
          </div>
        </div>
        <div class="cylinder-label-group">
          <span class="cylinder-dot" style="background: ${color};"></span>
          <span class="cylinder-name">${cat}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="chart-cylinder-card glass-panel">
      <div class="card-header-compact">
        <span class="card-header-title">Distribución Presupuestaria</span>
        <span class="badge-pill badge-neutral">${expenses.length} compra${expenses.length === 1 ? '' : 's'}</span>
      </div>
      <div class="cylinders-grid">
        ${barsHtml}
      </div>
      <div class="cylinder-footer">
        <span>Gasto Total: <strong>${formatCurrency(totalExpenses)}</strong></span>
      </div>
    </div>
  `;
};
