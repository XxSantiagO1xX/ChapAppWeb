/**
 * ChapApp - Pantalla de Inicio de Sesión (Login) Liquid Glass 3D
 * Escena: Constelación y Raíces de Luz (Sin Pedestal) + Tarjeta Liquid Glass Translúcida + Título 3D Bubble Glass
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const LoginScreen = () => {
  const { loginUser, showToast, theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const user = await loginUser(username.trim(), password.trim());
      showToast(`¡Bienvenido, ${user.name}!`, 'success');
    } catch (err) {
      console.warn('[LoginScreen] Error de inicio de sesión:', err);
      setErrorMessage(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.');
      showToast('Credenciales incorrectas', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-viewport-container">
      {/* ============================================================== */}
      {/* ESCENA DE FONDO OPCIÓN B (SIN PEDESTAL): RAÍCES Y CONSTELACIÓN */}
      {/* ============================================================== */}
      <div className="login-constellation-backdrop" aria-hidden="true">
        <svg
          className="login-constellation-svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Resplandor Ambiental detrás del Árbol y detrás de la Tarjeta para que el Liquid Glass refracte luz */}
            <radialGradient id="treeCenterAmbient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.32' : '0.22'} />
              <stop offset="50%" stopColor="#10B981" stopOpacity={isDark ? '0.14' : '0.10'} />
              <stop offset="100%" stopColor={isDark ? '#040812' : '#EEF2F6'} stopOpacity="0" />
            </radialGradient>

            <radialGradient id="cardBackRefractionGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#38BDF8'} stopOpacity={isDark ? '0.36' : '0.28'} />
              <stop offset="45%" stopColor="#10B981" stopOpacity={isDark ? '0.24' : '0.18'} />
              <stop offset="80%" stopColor="#6366F1" stopOpacity={isDark ? '0.12' : '0.08'} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Degradados de las Raíces y Filamentos de Luz */}
            <linearGradient id="rootLineCyan" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity="0.08" />
              <stop offset="30%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.85' : '0.60'} />
              <stop offset="70%" stopColor="#10B981" stopOpacity={isDark ? '0.75' : '0.50'} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.10" />
            </linearGradient>

            <linearGradient id="rootLineEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
              <stop offset="40%" stopColor="#34D399" stopOpacity={isDark ? '0.80' : '0.55'} />
              <stop offset="75%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.70' : '0.45'} />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
            </linearGradient>

            {/* Halos para los Nodos de la Constelación */}
            <radialGradient id="nodeOrbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity="0.92" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="nodeEmeraldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor="#34D399" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Halos de Luz Volumétrica (Uno en el Árbol y otro justo detrás de la Tarjeta de Login) */}
          <ellipse cx="540" cy="540" rx="460" ry="420" fill="url(#treeCenterAmbient)" />
          <ellipse cx="1310" cy="540" rx="480" ry="440" fill="url(#cardBackRefractionGlow)" />

          {/* Raíces y Ramas de Luz que nacen directamente del centro del Árbol (540, 540) y cruzan detrás de la Tarjeta */}
          <g fill="none" strokeLinecap="round">
            {/* Ramas Principales hacia la derecha (Cruzan detrás del Liquid Glass Card) */}
            <path
              d="M 540 540 C 780 510, 980 350, 1260 390 C 1490 425, 1660 310, 1900 250"
              stroke="url(#rootLineCyan)"
              strokeWidth="2.8"
            />
            <path
              d="M 540 540 C 790 560, 1020 640, 1310 535 C 1540 450, 1710 580, 1920 510"
              stroke="url(#rootLineEmerald)"
              strokeWidth="3.2"
            />
            <path
              d="M 540 540 C 750 660, 990 810, 1290 710 C 1520 635, 1690 760, 1910 830"
              stroke="url(#rootLineCyan)"
              strokeWidth="2.6"
            />
            <path
              d="M 540 540 C 690 380, 920 190, 1220 220 C 1460 245, 1650 150, 1880 120"
              stroke="url(#rootLineEmerald)"
              strokeWidth="2.0"
            />
            <path
              d="M 540 540 C 710 740, 960 940, 1320 890 C 1560 855, 1740 940, 1920 970"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.8"
            />

            {/* Ramas hacia la izquierda del Árbol */}
            <path
              d="M 540 540 C 380 490, 220 360, 20 260"
              stroke="url(#rootLineCyan)"
              strokeWidth="2.4"
            />
            <path
              d="M 540 540 C 360 580, 190 680, -20 740"
              stroke="url(#rootLineEmerald)"
              strokeWidth="2.2"
            />
            <path
              d="M 540 540 C 420 710, 250 860, 40 950"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.8"
            />
            <path
              d="M 540 540 C 430 350, 280 190, 70 110"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.7"
            />

            {/* Red de Constelación (Filamentos geométricos finos detrás de la tarjeta de Login) */}
            <path
              d="M 960 430 L 1140 310 L 1380 395 L 1520 290"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              opacity="0.80"
            />
            <path
              d="M 960 430 L 1160 575 L 1310 535 L 1480 650"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.6"
              opacity="0.85"
            />
            <path
              d="M 1160 575 L 1290 710 L 1480 650 L 1640 520"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
              opacity="0.80"
            />
            <path
              d="M 1310 535 L 1380 395 L 1640 520"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.4"
              opacity="0.75"
            />
            <path
              d="M 290 430 L 190 590 L 350 720"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.3"
              strokeDasharray="4 4"
              opacity="0.70"
            />
          </g>

          {/* Nodos Luminosos de la Constelación (Brillan a través del cristal de la tarjeta) */}
          <g>
            {/* Nodos Cyan */}
            {[
              [960, 430, 10],
              [1140, 310, 11],
              [1260, 390, 13],
              [1380, 395, 11],
              [1310, 535, 15],
              [1480, 650, 12],
              [1640, 520, 10],
              [1220, 220, 9],
              [290, 430, 9],
              [350, 720, 9],
              [170, 340, 8],
            ].map(([cx, cy, r], idx) => (
              <g key={`cyan-node-${idx}`}>
                <circle cx={cx} cy={cy} r={r * 2.5} fill="url(#nodeOrbGlow)" opacity="0.75" />
                <circle cx={cx} cy={cy} r={r * 0.48} fill="#FFFFFF" />
              </g>
            ))}

            {/* Nodos Esmeralda */}
            {[
              [820, 585, 10],
              [1160, 575, 13],
              [1290, 710, 14],
              [1520, 290, 10],
              [1320, 890, 10],
              [1050, 760, 11],
              [190, 590, 9],
              [340, 260, 8],
              [1740, 720, 9],
            ].map(([cx, cy, r], idx) => (
              <g key={`emerald-node-${idx}`}>
                <circle cx={cx} cy={cy} r={r * 2.5} fill="url(#nodeEmeraldGlow)" opacity="0.75" />
                <circle cx={cx} cy={cy} r={r * 0.48} fill="#FFFFFF" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Botón flotante para cambiar tema Claro / Oscuro desde el Login */}
      <button
        type="button"
        onClick={toggleTheme}
        className="login-theme-toggle-btn"
        title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        aria-label="Cambiar tema"
      >
        <Icon name={isDark ? 'sun' : 'moon'} size={18} />
        <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
      </button>

      <div className="login-split-layout">
        {/* ============================================================== */}
        {/* LADO IZQUIERDO: EMBLEMA FAMILIAR CON ANILLOS (SIN PEDESTAL)    */}
        {/* ============================================================== */}
        <div className="login-visual-stage">
          <div className="login-emblem-showcase">
            <div className="login-emblem-aura" />
            <div className="login-orbital-ring ring-outer" aria-hidden="true" />
            <div className="login-orbital-ring ring-inner" aria-hidden="true" />
            <div className="login-emblem-capsule">
              <div className="login-emblem-glass-facet">
                <img 
                  src="/assets/logo_tree.png" 
                  alt="ChapApp" 
                  className="login-emblem-tree-img" 
                  onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
                />
              </div>
              <div className="login-emblem-specular-ring" />
            </div>
          </div>
        </div>

        {/* Divisor luminoso entre logo y formulario */}
        <div className="login-stage-divider" aria-hidden="true" />

        {/* ============================================================== */}
        {/* LADO DERECHO: TARJETA LIQUID GLASS REALMENTE TRANSLÚCIDA       */}
        {/* ============================================================== */}
        <div className="login-card-stage">
          <div className="liquid-glass-card animate-scale-in">
            {/* Encabezado con Título "ChapApp" Estilo Burbuja de Cristal 3D */}
            <div className="card-brand-header">
              <div className="chapapp-bubble-badge">
                <span className="bubble-gloss-reflection" aria-hidden="true" />
                <h1 className="chapapp-bubble-title" data-text="ChapApp">
                  ChapApp
                </h1>
              </div>
              <p className="card-brand-motto">Inicia sesión para continuar</p>
            </div>

            {/* Formulario de Login */}
            <form onSubmit={handleSubmit} className="login-form">
              {errorMessage && (
                <div className="login-alert-box animate-shake" role="alert">
                  <Icon name="alert" size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Input Usuario */}
              <div className="login-field-group">
                <label htmlFor="login-username" className="login-field-label">Usuario</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <Icon name="user" size={17} />
                  </span>
                  <input
                    type="text"
                    id="login-username"
                    className="glass-input login-input"
                    placeholder="Tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Input Contraseña */}
              <div className="login-field-group">
                <label htmlFor="login-password" className="login-field-label">Contraseña</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">
                    <Icon name="lock" size={17} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    className="glass-input login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              {/* Botón Primario de Ingreso */}
              <button
                type="submit"
                className="btn-login-gradient"
                disabled={loading}
              >
                <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
                <span className="btn-arrow-icon">
                  {loading ? <div className="spinner-sm" /> : <Icon name="arrow-right" size={18} />}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
