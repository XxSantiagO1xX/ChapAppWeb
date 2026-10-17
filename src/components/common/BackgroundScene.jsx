/**
 * ChapApp - Escena de Fondo Vectorial 100% SVG (Flor de Loto de Cristal Soplado)
 * Resolución matemática infinita (0% pixelación en 4K, Retina y Móvil)
 * Soporta Modo Oscuro ( Negro profundo + Cristal Ámbar/Rubí encendido )
 * y Modo Claro ( Marfil Cálido + Cristal Ámbar/Champán con cáusticas de luz )
 */

import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * Genera un par simétrico (izquierdo y derecho) de pétalos de cristal soplado
 * más su nervadura de refracción interna y doble filo especular.
 */
const SymmetricPetalPair = ({
  baseX = 954,
  baseY = 948,
  tipX,
  tipY,
  outerCtrl1,
  outerCtrl2,
  innerCtrl1,
  innerCtrl2,
  ribCtrl1,
  ribCtrl2,
  fillUrl,
  rimUrl,
  innerRimColor,
  specularUrl,
  opacity = 0.92,
  blendMode = 'normal',
}) => {
  const mirrorX = (x) => 1920 - x;

  // Path izquierdo: desde la base -> curva exterior hasta la punta -> curva interior de regreso a la base
  const leftPath = `
    M ${baseX} ${baseY}
    C ${outerCtrl1[0]} ${outerCtrl1[1]}, ${outerCtrl2[0]} ${outerCtrl2[1]}, ${tipX} ${tipY}
    C ${innerCtrl1[0]} ${innerCtrl1[1]}, ${innerCtrl2[0]} ${innerCtrl2[1]}, ${baseX + 4} ${baseY - 6}
    Z
  `;

  // Path derecho reflejado exactamente sobre el eje X = 960
  const rightPath = `
    M ${mirrorX(baseX)} ${baseY}
    C ${mirrorX(outerCtrl1[0])} ${outerCtrl1[1]}, ${mirrorX(outerCtrl2[0])} ${outerCtrl2[1]}, ${mirrorX(tipX)} ${tipY}
    C ${mirrorX(innerCtrl1[0])} ${innerCtrl1[1]}, ${mirrorX(innerCtrl2[0])} ${innerCtrl2[1]}, ${mirrorX(baseX + 4)} ${baseY - 6}
    Z
  `;

  // Curva de reflejo especular interno (brillo curvo en el vientre del pétalo)
  const leftSpecular = ribCtrl1 && ribCtrl2
    ? `M ${baseX - 2} ${baseY - 18} C ${ribCtrl1[0]} ${ribCtrl1[1]}, ${ribCtrl2[0]} ${ribCtrl2[1]}, ${tipX + 18} ${tipY + 26}`
    : null;

  const rightSpecular = ribCtrl1 && ribCtrl2
    ? `M ${mirrorX(baseX - 2)} ${baseY - 18} C ${mirrorX(ribCtrl1[0])} ${ribCtrl1[1]}, ${mirrorX(ribCtrl2[0])} ${ribCtrl2[1]}, ${mirrorX(tipX + 18)} ${tipY + 26}`
    : null;

  return (
    <g style={{ mixBlendMode: blendMode }} opacity={opacity}>
      {/* Pétalo Izquierdo */}
      <path d={leftPath} fill={fillUrl} />
      <path
        d={leftPath}
        fill="none"
        stroke={innerRimColor}
        strokeWidth="6.5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {leftSpecular && (
        <path
          d={leftSpecular}
          fill="none"
          stroke={specularUrl}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.65"
        />
      )}
      <path
        d={leftPath}
        fill="none"
        stroke={rimUrl}
        strokeWidth="1.85"
        strokeLinejoin="round"
      />

      {/* Pétalo Derecho */}
      <path d={rightPath} fill={fillUrl} />
      <path
        d={rightPath}
        fill="none"
        stroke={innerRimColor}
        strokeWidth="6.5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {rightSpecular && (
        <path
          d={rightSpecular}
          fill="none"
          stroke={specularUrl}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.65"
        />
      )}
      <path
        d={rightPath}
        fill="none"
        stroke={rimUrl}
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
    </g>
  );
};

/**
 * Pétalo Central Simétrico (Domo Superior, Cáliz Medio y Escudo Frontal)
 */
const CenterDomePetal = ({
  baseY = 946,
  topY,
  halfWidth,
  shoulderY,
  waistWidth,
  waistY,
  fillUrl,
  rimUrl,
  innerRimColor,
  specularUrl,
  opacity = 0.95,
  showRibs = true,
}) => {
  const cx = 960;
  const d = `
    M ${cx} ${baseY}
    C ${cx - waistWidth} ${waistY}, ${cx - halfWidth} ${shoulderY}, ${cx} ${topY}
    C ${cx + halfWidth} ${shoulderY}, ${cx + waistWidth} ${waistY}, ${cx} ${baseY}
    Z
  `;

  const leftRib = `M ${cx} ${baseY - 12} C ${cx - waistWidth * 0.55} ${waistY}, ${cx - halfWidth * 0.48} ${shoulderY + 30}, ${cx} ${topY + 8}`;
  const rightRib = `M ${cx} ${baseY - 12} C ${cx + waistWidth * 0.55} ${waistY}, ${cx + halfWidth * 0.48} ${shoulderY + 30}, ${cx} ${topY + 8}`;

  return (
    <g opacity={opacity}>
      <path d={d} fill={fillUrl} />
      <path
        d={d}
        fill="none"
        stroke={innerRimColor}
        strokeWidth="7"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {showRibs && (
        <>
          <path
            d={leftRib}
            fill="none"
            stroke={specularUrl}
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d={rightRib}
            fill="none"
            stroke={specularUrl}
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.6"
          />
        </>
      )}
      <path
        d={d}
        fill="none"
        stroke={rimUrl}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  );
};

export const BackgroundScene = () => {
  const { theme = 'dark' } = useApp();
  const isLight = theme === 'light';

  return (
    <div className="app-backdrop-scene" aria-hidden="true" data-theme={theme}>
      <svg
        className="lotus-vector-svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* ============================================================== */}
          {/* DEGRADADOS DINÁMICOS DE CRISTAL SOPLADO (OSCURO VS CLARO)      */}
          {/* ============================================================== */}

          {/* Halo Volumétrico de Fondo */}
          <radialGradient id="lotusAmbientGlow" cx="50%" cy="66%" r="48%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#FB923C" stopOpacity="0.38" />
                <stop offset="42%" stopColor="#F59E0B" stopOpacity="0.16" />
                <stop offset="75%" stopColor="#FDE68A" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#F6F1EA" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FF5500" stopOpacity="0.45" />
                <stop offset="35%" stopColor="#B91C1C" stopOpacity="0.24" />
                <stop offset="68%" stopColor="#450A0A" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </>
            )}
          </radialGradient>

          {/* Cáustica de Luz en el Suelo (Especial Modo Claro y Reflejo Base) */}
          <radialGradient id="floorCausticGlow" cx="50%" cy="50%" r="50%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.34" />
                <stop offset="45%" stopColor="#D97706" stopOpacity="0.18" />
                <stop offset="80%" stopColor="#9A3412" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#F6F1EA" stopOpacity="0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.28" />
                <stop offset="55%" stopColor="#7C2D12" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </>
            )}
          </radialGradient>

          {/* 1. Cristal Corona Exterior (Pétalos Traseros y Alas Laterales) */}
          <linearGradient id="outerPetalGlass" x1="50%" y1="0%" x2="50%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#FDECE1" stopOpacity="0.52" />
                <stop offset="35%" stopColor="#FDBA8C" stopOpacity="0.64" />
                <stop offset="72%" stopColor="#FB923C" stopOpacity="0.78" />
                <stop offset="100%" stopColor="#C2410C" stopOpacity="0.88" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#2A120B" stopOpacity="0.55" />
                <stop offset="30%" stopColor="#7C2D12" stopOpacity="0.68" />
                <stop offset="68%" stopColor="#C2410C" stopOpacity="0.82" />
                <stop offset="92%" stopColor="#FB923C" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.95" />
              </>
            )}
          </linearGradient>

          {/* 2. Cristal Corona Media (Ámbar Cobrizo / Coral Translúcido) */}
          <linearGradient id="midPetalGlass" x1="50%" y1="0%" x2="50%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#FED7AA" stopOpacity="0.68" />
                <stop offset="32%" stopColor="#FB923C" stopOpacity="0.78" />
                <stop offset="68%" stopColor="#EA580C" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#9A3412" stopOpacity="0.95" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#450A0A" stopOpacity="0.68" />
                <stop offset="28%" stopColor="#991B1B" stopOpacity="0.78" />
                <stop offset="62%" stopColor="#EA580C" stopOpacity="0.88" />
                <stop offset="90%" stopColor="#FB923C" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FEF08A" stopOpacity="0.98" />
              </>
            )}
          </linearGradient>

          {/* 3. Cristal Corazón Rubí Profundo (Cáliz Interior) */}
          <linearGradient id="rubyCoreGlass" x1="50%" y1="0%" x2="50%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#FCA5A5" stopOpacity="0.78" />
                <stop offset="28%" stopColor="#DC2626" stopOpacity="0.88" />
                <stop offset="65%" stopColor="#991B1B" stopOpacity="0.94" />
                <stop offset="92%" stopColor="#EA580C" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.98" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#450A0A" stopOpacity="0.82" />
                <stop offset="25%" stopColor="#7F1D1D" stopOpacity="0.90" />
                <stop offset="58%" stopColor="#DC2626" stopOpacity="0.94" />
                <stop offset="86%" stopColor="#F97316" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#FEF08A" stopOpacity="1" />
              </>
            )}
          </linearGradient>

          {/* 4. Cristal Frontal Incandescente (Núcleo de Luz) */}
          <radialGradient id="frontHeartGlass" cx="50%" cy="68%" r="62%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.96" />
                <stop offset="28%" stopColor="#FB923C" stopOpacity="0.90" />
                <stop offset="62%" stopColor="#DC2626" stopOpacity="0.86" />
                <stop offset="100%" stopColor="#991B1B" stopOpacity="0.92" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.98" />
                <stop offset="22%" stopColor="#FDBA74" stopOpacity="0.95" />
                <stop offset="52%" stopColor="#EA580C" stopOpacity="0.90" />
                <stop offset="82%" stopColor="#B91C1C" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.94" />
              </>
            )}
          </radialGradient>

          {/* Filo Especular de Cristal (Borde Fino Brillante de cada Pétalo) */}
          <linearGradient id="crystalRimStroke" x1="50%" y1="0%" x2="50%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#7C2D12" stopOpacity="0.72" />
                <stop offset="25%" stopColor="#9A3412" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0.90" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFF7ED" stopOpacity="0.92" />
                <stop offset="30%" stopColor="#FED7AA" stopOpacity="0.82" />
                <stop offset="70%" stopColor="#FB923C" stopOpacity="0.78" />
                <stop offset="100%" stopColor="#FEF08A" stopOpacity="0.96" />
              </>
            )}
          </linearGradient>

          {/* Nervadura Especular Interna (Reflejo Curvo de Vidrio) */}
          <linearGradient id="innerSpecularStreak" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.10" />
            <stop offset="35%" stopColor="#FFF7ED" stopOpacity="0.65" />
            <stop offset="75%" stopColor="#FDBA74" stopOpacity="0.80" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* 0. FONDO Y CÁUSTICAS DE LUZ                                    */}
        {/* ============================================================== */}
        <rect
          width="1920"
          height="1080"
          fill={isLight ? '#F5F0E6' : '#000000'}
        />

        {/* Halo Volumétrico Central */}
        <ellipse
          cx="960"
          cy="640"
          rx="820"
          ry="480"
          fill="url(#lotusAmbientGlow)"
        />

        {/* Sombra y Cáustica de Refracción en la Base */}
        <ellipse
          cx="820"
          cy="968"
          rx="260"
          ry="44"
          fill="url(#floorCausticGlow)"
        />
        <ellipse
          cx="1100"
          cy="968"
          rx="260"
          ry="44"
          fill="url(#floorCausticGlow)"
        />

        {/* ============================================================== */}
        {/* 1. CORONA TRASERA EXTERIOR (PÉTALOS MÁS ALTOS Y ABIERTOS)       */}
        {/* ============================================================== */}

        {/* Domo Central Superior Trasero */}
        <CenterDomePetal
          baseY={942}
          topY={38}
          halfWidth={260}
          shoulderY={110}
          waistWidth={230}
          waistY={560}
          fillUrl="url(#outerPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#EA580C' : '#F97316'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.74}
        />

        {/* Par 1B: Pétalos Altos Traseros Medios */}
        <SymmetricPetalPair
          baseX={952}
          baseY={944}
          tipX={585}
          tipY={140}
          outerCtrl1={[510, 740]}
          outerCtrl2={[430, 290]}
          innerCtrl1={[735, 130]}
          innerCtrl2={[845, 550]}
          ribCtrl1={[590, 680]}
          ribCtrl2={[530, 340]}
          fillUrl="url(#outerPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#EA580C' : '#FB923C'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.78}
        />

        {/* Par 1C: Pétalos Altos Laterales */}
        <SymmetricPetalPair
          baseX={950}
          baseY={946}
          tipX={385}
          tipY={222}
          outerCtrl1={[450, 820]}
          outerCtrl2={[230, 420]}
          innerCtrl1={[575, 195]}
          innerCtrl2={[740, 590]}
          ribCtrl1={[500, 730]}
          ribCtrl2={[360, 420]}
          fillUrl="url(#outerPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#EA580C' : '#FB923C'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.84}
        />

        {/* Par 1D: Alas Laterales Medias */}
        <SymmetricPetalPair
          baseX={946}
          baseY={950}
          tipX={195}
          tipY={418}
          outerCtrl1={[410, 890]}
          outerCtrl2={[110, 610]}
          innerCtrl1={[385, 380]}
          innerCtrl2={[665, 685]}
          ribCtrl1={[440, 800]}
          ribCtrl2={[245, 570]}
          fillUrl="url(#outerPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#C2410C' : '#F97316'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.88}
        />

        {/* Par 1E: Alas Inferiores Extendidas (Base Exterior) */}
        <SymmetricPetalPair
          baseX={942}
          baseY={954}
          tipX={218}
          tipY={622}
          outerCtrl1={[470, 995]}
          outerCtrl2={[135, 795]}
          innerCtrl1={[395, 575]}
          innerCtrl2={[665, 795]}
          ribCtrl1={[470, 900]}
          ribCtrl2={[280, 725]}
          fillUrl="url(#outerPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#C2410C' : '#FB923C'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.92}
        />

        {/* ============================================================== */}
        {/* 2. CORONA MEDIA (CÁLIZ ACOPADO DE CRISTAL ÁMBAR/COBRE)          */}
        {/* ============================================================== */}

        {/* Par 2A: Pétalos Superiores de Corona Media */}
        <SymmetricPetalPair
          baseX={954}
          baseY={944}
          tipX={725}
          tipY={66}
          outerCtrl1={[565, 680]}
          outerCtrl2={[530, 175]}
          innerCtrl1={[870, 60]}
          innerCtrl2={[915, 520]}
          ribCtrl1={[670, 620]}
          ribCtrl2={[645, 250]}
          fillUrl="url(#midPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#C2410C' : '#FB923C'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.90}
        />

        {/* Domo Central Interior (Segundo Nivel) */}
        <CenterDomePetal
          baseY={944}
          topY={122}
          halfWidth={270}
          shoulderY={220}
          waistWidth={240}
          waistY={610}
          fillUrl="url(#rubyCoreGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#DC2626' : '#F97316'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.93}
        />

        {/* Par 2B: Pétalos Acopados Laterales Superiores */}
        <SymmetricPetalPair
          baseX={952}
          baseY={946}
          tipX={608}
          tipY={232}
          outerCtrl1={[540, 770]}
          outerCtrl2={[520, 395]}
          innerCtrl1={[720, 220]}
          innerCtrl2={[820, 595]}
          ribCtrl1={[620, 700]}
          ribCtrl2={[595, 385]}
          fillUrl="url(#midPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor={isLight ? '#EA580C' : '#FDBA74'}
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.92}
        />

        {/* ============================================================== */}
        {/* 3. CORAZÓN RUBÍ PROFUNDO (PÉTALOS CENTRALES VERTICALES)         */}
        {/* ============================================================== */}

        {/* Par 3A: Pétalos Rubí Interiores Altos */}
        <SymmetricPetalPair
          baseX={955}
          baseY={944}
          tipX={725}
          tipY={248}
          outerCtrl1={[640, 735]}
          outerCtrl2={[620, 360]}
          innerCtrl1={[845, 240]}
          innerCtrl2={[915, 595]}
          ribCtrl1={[725, 675]}
          ribCtrl2={[705, 390]}
          fillUrl="url(#rubyCoreGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#F97316"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.95}
        />

        {/* Par 3B: Pétalos Rubí Centrales (Cáliz Íntimo) */}
        <SymmetricPetalPair
          baseX={956}
          baseY={944}
          tipX={795}
          tipY={268}
          outerCtrl1={[710, 740]}
          outerCtrl2={[705, 410]}
          innerCtrl1={[895, 285]}
          innerCtrl2={[942, 650]}
          ribCtrl1={[785, 680]}
          ribCtrl2={[775, 415]}
          fillUrl="url(#rubyCoreGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#FB923C"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.97}
        />

        {/* ============================================================== */}
        {/* 4. CORONA FRONTAL Y BASE LUMINOSA                              */}
        {/* ============================================================== */}

        {/* Par 4A: Pétalos Diagonales Frontales Medios */}
        <SymmetricPetalPair
          baseX={952}
          baseY={948}
          tipX={478}
          tipY={448}
          outerCtrl1={[535, 865]}
          outerCtrl2={[415, 620]}
          innerCtrl1={[640, 485]}
          innerCtrl2={[815, 735]}
          ribCtrl1={[590, 795]}
          ribCtrl2={[495, 575]}
          fillUrl="url(#midPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#FDBA74"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.94}
        />

        {/* Escudo Central Frontal (Corazón Iluminado) */}
        <CenterDomePetal
          baseY={944}
          topY={488}
          halfWidth={230}
          shoulderY={535}
          waistWidth={165}
          waistY={765}
          fillUrl="url(#frontHeartGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#FDE68A"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.96}
          showRibs={true}
        />

        {/* Par 4B: Pétalos Frontales de Cuna (Abrazan el Centro) */}
        <SymmetricPetalPair
          baseX={954}
          baseY={948}
          tipX={645}
          tipY={465}
          outerCtrl1={[675, 855]}
          outerCtrl2={[595, 635]}
          innerCtrl1={[765, 535]}
          innerCtrl2={[895, 765]}
          ribCtrl1={[720, 795]}
          ribCtrl2={[655, 595]}
          fillUrl="url(#frontHeartGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#FEF08A"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.95}
        />

        {/* Par 4C: Pétalos Frontales Inferiores (Cierre del Cáliz) */}
        <SymmetricPetalPair
          baseX={953}
          baseY={952}
          tipX={452}
          tipY={592}
          outerCtrl1={[575, 945]}
          outerCtrl2={[395, 755]}
          innerCtrl1={[625, 650]}
          innerCtrl2={[825, 840]}
          ribCtrl1={[615, 875]}
          ribCtrl2={[495, 705]}
          fillUrl="url(#midPetalGlass)"
          rimUrl="url(#crystalRimStroke)"
          innerRimColor="#FDE68A"
          specularUrl="url(#innerSpecularStreak)"
          opacity={0.96}
        />

        {/* Núcleo de Luz Incandescente en la Base del Cáliz */}
        <ellipse
          cx="960"
          cy="835"
          rx="115"
          ry="95"
          fill="url(#lotusAmbientGlow)"
          style={{ mixBlendMode: 'screen' }}
        />
      </svg>
    </div>
  );
};

export default BackgroundScene;
