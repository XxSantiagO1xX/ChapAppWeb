/**
 * ChapApp - Distribución Presupuestaria 3D Liquid Glass (Category3DBars) React
 * Sin perlas ni aros blancos superiores, conservando el rayo láser de neón interior.
 */

import React from 'react';
import { formatCurrency } from '../../utils/calculations.js';
import { Icon } from '../../utils/icons.jsx';

const LUMINOUS_3D_CATEGORY_COLORS = {
  Comida: { hex: '#F59E0B', glow: 'rgba(245, 158, 11, 0.60)', label: 'Comida' },
  Bebidas: { hex: '#00F0FF', glow: 'rgba(0, 240, 255, 0.65)', label: 'Bebidas' },
  Transporte: { hex: '#38BDF8', glow: 'rgba(56, 189, 248, 0.60)', label: 'Transporte' },
  Hospedaje: { hex: '#FF7A00', glow: 'rgba(255, 122, 0, 0.60)', label: 'Hospedaje' },
  Varios: { hex: '#A855F7', glow: 'rgba(168, 85, 247, 0.60)', label: 'Varios' },
};

export const Category3DBars = ({ expenses = [], totalExpenses = 0 }) => {
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

  const categories = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  return (
    <div className="glass-panel chart-liquid-card animate-fade-in">
      <div className="card-header-compact">
        <div className="header-icon-title-group">
          <div className="chart-icon-box" style={{ color: '#A855F7' }}>
            <Icon name="receipt" size={18} />
          </div>
          <div>
            <h4 className="card-header-title">Distribución Presupuestaria</h4>
            <span className="card-header-sub">Desglose por rubro y categoría</span>
          </div>
        </div>
        <span className="badge-pill badge-neutral">{expenses.length} compras</span>
      </div>

      {/* Cuadrícula de Cilindros 3D Liquid Glass */}
      <div className="liquid-cylinders-grid">
        {categories.map((cat, idx) => {
          const amount = catTotals[cat];
          const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
          const catConfig = LUMINOUS_3D_CATEGORY_COLORS[cat] || LUMINOUS_3D_CATEGORY_COLORS.Varios;
          const color = catConfig.hex;
          const glow = catConfig.glow;
          const heightPercent = Math.min(94, Math.max(6, percent));
          const animDelay = (idx * 0.12).toFixed(2);

          return (
            <div 
              key={cat}
              className="liquid-cylinder-col" 
              style={{
                '--cat-color': color,
                '--cat-glow': glow,
                '--anim-delay': `${animDelay}s`,
              }}
              title={`${cat}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)`}
            >
              {/* Telemetría Superior */}
              <div className="cylinder-top-stat">
                <span className="cylinder-percent-text">{percent.toFixed(1)}%</span>
                <span className="cylinder-amount-text">{formatCurrency(amount)}</span>
              </div>

              {/* Cámara del Cilindro 3D de Cristal Líquido */}
              <div className="liquid-cylinder-chamber">
                {/* Reflejo lateral de vidrio */}
                <div className="chamber-glass-shine"></div>

                {/* Rayo / Hilo eléctrico vertical animado que baja al menisco */}
                <div className="cylinder-laser-thread" style={{ bottom: `${heightPercent}%` }}>
                  <svg className="laser-thread-svg" viewBox="0 0 10 100" preserveAspectRatio="none">
                    <defs>
                      <filter id={`laserFilterReact_${idx}`}>
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path 
                      d="M5 0 Q3 25, 6 50 T5 100" 
                      fill="none" 
                      stroke={color} 
                      strokeWidth="1.8" 
                      filter={`url(#laserFilterReact_${idx})`} 
                    />
                  </svg>
                </div>

                {/* Fluido Líquido Animado */}
                <div 
                  className="liquid-fluid-stream" 
                  style={{
                    '--target-h': `${heightPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                >
                  {/* Menisco / Tapa Líquida Superior limpia (sin borde/perla blanca) */}
                  <div className="fluid-meniscus-cap">
                    <div className="meniscus-flare"></div>
                  </div>
                  {/* Brillo interior del líquido */}
                  <div className="fluid-interior-glow"></div>
                </div>
              </div>

              {/* Pedestal Inferior */}
              <div className="cylinder-bottom-pedestal">
                <span className="pedestal-dot"></span>
                <span className="pedestal-label">{cat}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra Resumen Inferior Estilizada */}
      <div className="chart-summary-footer-bar">
        <span>
          Total <strong>{formatCurrency(totalExpenses)}</strong> • Promedio{' '}
          <strong className="text-purple">
            {formatCurrency(totalExpenses > 0 ? totalExpenses / 4 : 0)}/día
          </strong>
        </span>
      </div>
    </div>
  );
};

export default Category3DBars;
