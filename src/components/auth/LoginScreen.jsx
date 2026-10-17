/**
 * ChapApp - Pantalla de Inicio de Sesión (Login) Liquid Glass 3D
 * Escena Opción B: Pedestal de Cristal 3D + Raíces y Constelación Familiar de Luz
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
      {/* ESCENA DE FONDO VECTORIAL: PEDESTAL, RAÍCES Y CONSTELACIÓN     */}
      {/* ============================================================== */}
      <div className="login-constellation-backdrop" aria-hidden="true">
        <svg
          className="login-constellation-svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Luz del Pilar Central bajo el Árbol */}
            <radialGradient id="pedestalCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.42' : '0.26'} />
              <stop offset="45%" stopColor="#10B981" stopOpacity={isDark ? '0.18' : '0.12'} />
              <stop offset="100%" stopColor={isDark ? '#040812' : '#EEF2F6'} stopOpacity="0" />
            </radialGradient>

            {/* Haz de Luz Vertical Ascendente */}
            <linearGradient id="pillarBeamGrad" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.32' : '0.20'} />
              <stop offset="45%" stopColor="#10B981" stopOpacity={isDark ? '0.12' : '0.08'} />
              <stop offset="100%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity="0" />
            </linearGradient>

            {/* Degradado para Raíces de Luz y Ramas de Constelación */}
            <linearGradient id="rootLineCyan" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity="0.04" />
              <stop offset="30%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.65' : '0.45'} />
              <stop offset="65%" stopColor="#10B981" stopOpacity={isDark ? '0.45' : '0.35'} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.05" />
            </linearGradient>

            <linearGradient id="rootLineEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#10B981" stopOpacity={isDark ? '0.55' : '0.40'} />
              <stop offset="75%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity={isDark ? '0.40' : '0.30'} />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>

            {/* Halo para Nodos Familiares */}
            <radialGradient id="nodeOrbGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor={isDark ? '#00F0FF' : '#0284C7'} stopOpacity="0.85" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="nodeEmeraldGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor="#34D399" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Horizonte Arquitectónico Curvo */}
          <path
            d="M -100 840 Q 960 690 2020 840"
            fill="none"
            stroke="url(#rootLineCyan)"
            strokeWidth="1.5"
            opacity="0.55"
          />
          <path
            d="M -100 910 Q 960 740 2020 910"
            fill="none"
            stroke="url(#rootLineEmerald)"
            strokeWidth="1"
            opacity="0.35"
          />

          {/* 2. Haz de Luz Vertical del Pedestal hacia el Árbol (Lado Izquierdo) */}
          <polygon
            points="390,820 770,820 690,220 470,220"
            fill="url(#pillarBeamGrad)"
          />

          {/* Resplandor Base del Pedestal */}
          <ellipse
            cx="580"
            cy="810"
            rx="420"
            ry="135"
            fill="url(#pedestalCoreGlow)"
          />

          {/* 3. Anillos Elípticos del Pedestal de Cristal en Perspectiva */}
          <ellipse
            cx="580"
            cy="810"
            rx="310"
            ry="68"
            fill="none"
            stroke="url(#rootLineCyan)"
            strokeWidth="1.8"
            strokeDasharray="8 6"
            opacity="0.7"
          />
          <ellipse
            cx="580"
            cy="810"
            rx="235"
            ry="48"
            fill="none"
            stroke="url(#rootLineEmerald)"
            strokeWidth="2.2"
            opacity="0.85"
          />
          <ellipse
            cx="580"
            cy="810"
            rx="155"
            ry="30"
            fill="none"
            stroke={isDark ? '#00F0FF' : '#0284C7'}
            strokeWidth="2.5"
            opacity="0.9"
          />

          {/* 4. Raíces de Luz y Constelación Familiar (Fluyen desde el Pedestal hacia toda la escena) */}
          <g fill="none" strokeLinecap="round">
            {/* Raíz Principal 1: Conecta el árbol con el panel de Login derecho */}
            <path
              d="M 580 810 C 760 810, 920 690, 1180 640 C 1380 600, 1580 660, 1820 560"
              stroke="url(#rootLineCyan)"
              strokeWidth="2.2"
            />
            {/* Raíz Principal 2: Rama superior de la constelación */}
            <path
              d="M 580 810 C 710 730, 860 440, 1140 360 C 1360 295, 1560 350, 1850 240"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.8"
            />
            {/* Raíz Principal 3: Rama inferior extendida */}
            <path
              d="M 580 810 C 740 870, 990 920, 1290 850 C 1510 800, 1680 860, 1890 920"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.8"
            />
            {/* Raíces Izquierdas (Hacia el borde izquierdo y arriba) */}
            <path
              d="M 580 810 C 420 800, 260 720, 60 610"
              stroke="url(#rootLineCyan)"
              strokeWidth="2"
            />
            <path
              d="M 580 810 C 390 740, 250 480, 80 310"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.6"
            />
            <path
              d="M 580 810 C 430 880, 240 940, 40 980"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.5"
            />

            {/* Filamentos Secundarios de Conexión (Red de Nodos Familiares) */}
            <path
              d="M 885 732 L 965 535 L 1140 360"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.1"
              strokeDasharray="4 4"
              opacity="0.65"
            />
            <path
              d="M 965 535 L 1180 640 L 1290 850"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.1"
              strokeDasharray="4 4"
              opacity="0.65"
            />
            <path
              d="M 1180 640 L 1440 480 L 1590 620"
              stroke="url(#rootLineCyan)"
              strokeWidth="1.2"
              opacity="0.55"
            />
            <path
              d="M 310 745 L 245 540 L 420 390"
              stroke="url(#rootLineEmerald)"
              strokeWidth="1.1"
              strokeDasharray="3 5"
              opacity="0.55"
            />
          </g>

          {/* 5. Nodos Luminosos de la Constelación (Representando Familias y Subfamilias) */}
          <g>
            {/* Nodos Principales Cyan */}
            {[
              [885, 732, 9],
              [965, 535, 11],
              [1140, 360, 10],
              [1180, 640, 12],
              [1440, 480, 9],
              [1590, 620, 10],
              [310, 745, 9],
              [245, 540, 10],
              [420, 390, 8],
              [160, 385, 7],
              [1690, 305, 8],
            ].map(([cx, cy, r], idx) => (
              <g key={`cyan-node-${idx}`}>
                <circle cx={cx} cy={cy} r={r * 2.2} fill="url(#nodeOrbGlow)" opacity="0.55" />
                <circle cx={cx} cy={cy} r={r * 0.45} fill="#FFFFFF" />
              </g>
            ))}

            {/* Nodos Esmeralda */}
            {[
              [745, 635, 8],
              [1040, 865, 9],
              [1290, 850, 11],
              [1350, 330, 8],
              [1720, 585, 9],
              [190, 680, 8],
              [730, 290, 7],
            ].map(([cx, cy, r], idx) => (
              <g key={`emerald-node-${idx}`}>
                <circle cx={cx} cy={cy} r={r * 2.2} fill="url(#nodeEmeraldGlow)" opacity="0.55" />
                <circle cx={cx} cy={cy} r={r * 0.45} fill="#FFFFFF" />
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
        {/* LADO IZQUIERDO: EMBLEMA FAMILIAR SOBRE PEDESTAL DE CRISTAL     */}
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

          {/* Pedestal de Cristal 3D Físico debajo del Medallón */}
          <div className="login-pedestal-base" aria-hidden="true">
            <div className="pedestal-light-cone" />
            <div className="pedestal-glass-disc disc-top" />
            <div className="pedestal-glass-disc disc-bottom" />
          </div>
        </div>

        {/* Divisor luminoso entre logo y formulario */}
        <div className="login-stage-divider" aria-hidden="true" />

        {/* ============================================================== */}
        {/* LADO DERECHO: PANEL DE VIDRIO LÍQUIDO TRANSLÚCIDO (LOGIN CARD) */}
        {/* ============================================================== */}
        <div className="login-card-stage">
          <div className="liquid-glass-card animate-scale-in">
            {/* Encabezado limpio sin repetir el logo */}
            <div className="card-brand-header">
              <h1 className="card-brand-name">ChapApp</h1>
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
