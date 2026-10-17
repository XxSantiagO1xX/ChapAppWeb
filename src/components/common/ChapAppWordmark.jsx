/**
 * ChapApp - Logotipo Tipográfico Burbuja 3D ("ChapApp")
 * Renderiza cada letra inflada en 3D con iluminación especular SVG sin contenedor alrededor.
 * Soporta instancias múltiples en el DOM mediante prefijos únicos de ID (login, header, drawer).
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

export const ChapAppWordmark = ({ idPrefix = 'brand', className = '' }) => {
  const { theme } = useApp();
  const isLight = theme === 'light';
  const fillDarkId = `${idPrefix}-bubbleFillDark`;
  const fillLightId = `${idPrefix}-bubbleFillLight`;
  const strokeGradId = `${idPrefix}-bubbleStrokeGrad`;
  const filterId = `${idPrefix}-bubble3DEffect`;

  return (
    <svg
      className={`chapapp-bubble-svg ${className}`.trim()}
      viewBox="0 0 360 92"
      role="img"
      aria-label="ChapApp"
    >
      <defs>
        {/* Gradiente interno inflado para modo oscuro */}
        <linearGradient id={fillDarkId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#A5F3FC" />
          <stop offset="58%" stopColor="#22D3EE" />
          <stop offset="85%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Gradiente interno inflado para modo claro */}
        <linearGradient id={fillLightId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="38%" stopColor="#0284C7" />
          <stop offset="78%" stopColor="#0369A1" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Gradiente para el borde exterior de la letra burbuja */}
        <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#67E8F9" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0.85" />
        </linearGradient>

        {/* Filtro óptico 3D de iluminación especular para inflar cada letra como burbuja */}
        <filter id={filterId} x="-15%" y="-25%" width="130%" height="155%">
          <feDropShadow dx="0" dy="4" stdDeviation="1" floodColor="#0369A1" floodOpacity="0.95" result="extrudeShadow" />
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" result="dropShadow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="alphaBlur" />
          <feSpecularLighting
            in="alphaBlur"
            surfaceScale="6.5"
            specularConstant="1.45"
            specularExponent="26"
            lightingColor="#FFFFFF"
            result="specLight"
          >
            <fePointLight x="180" y="-45" z="135" />
          </feSpecularLighting>
          <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped" />
          <feComposite
            in="SourceGraphic"
            in2="specClipped"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="0.95"
            k4="0"
            result="glossyLetters"
          />
        </filter>
      </defs>

      {/* Capa base de extrusión suave para dar grosor 3D a cada letra */}
      <text
        x="180"
        y="66"
        textAnchor="middle"
        className="bubble-svg-extrude"
      >
        ChapApp
      </text>

      {/* Capa principal de letras burbuja infladas con filtro 3D especular */}
      <text
        x="180"
        y="62"
        textAnchor="middle"
        className="bubble-svg-main"
        fill={`url(#${isLight ? fillLightId : fillDarkId})`}
        stroke={isLight ? '#FFFFFF' : `url(#${strokeGradId})`}
        filter={`url(#${filterId})`}
      >
        ChapApp
      </text>
    </svg>
  );
};

export default ChapAppWordmark;
