/**
 * ChapApp - Pantalla de Inicio de Sesión (Login) Liquid Glass 3D
 * Escena Opción A: Ondas de Seda y Aurora Líquida en Movimiento Suave (Estilo Apple / macOS)
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
      {/* ESCENA DE FONDO OPCIÓN A: ONDAS DE SEDA Y AURORA LÍQUIDA       */}
      {/* ============================================================== */}
      <div className="login-silk-aurora-backdrop" aria-hidden="true">
        <div className="aurora-mesh-glow aurora-glow-1" />
        <div className="aurora-mesh-glow aurora-glow-2" />

        <svg
          className="login-silk-svg"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Onda de Seda 1: Turquesa / Cyan Profundo */}
            <linearGradient id="silkWaveCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="#0369A1" stopOpacity="0.05" />
                  <stop offset="35%" stopColor="#00F0FF" stopOpacity="0.34" />
                  <stop offset="70%" stopColor="#0284C7" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0F172A" stopOpacity="0.10" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.20" />
                  <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.42" />
                  <stop offset="75%" stopColor="#0284C7" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0.10" />
                </>
              )}
            </linearGradient>

            {/* Onda de Seda 2: Esmeralda / Menta Luminosa */}
            <linearGradient id="silkWaveEmerald" x1="100%" y1="0%" x2="0%" y2="100%">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="#064E3B" stopOpacity="0.08" />
                  <stop offset="42%" stopColor="#10B981" stopOpacity="0.32" />
                  <stop offset="75%" stopColor="#06B6D4" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#040812" stopOpacity="0.05" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.25" />
                  <stop offset="45%" stopColor="#34D399" stopOpacity="0.38" />
                  <stop offset="80%" stopColor="#38BDF8" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#ECFDF5" stopOpacity="0.10" />
                </>
              )}
            </linearGradient>

            {/* Onda de Seda 3: Zafiro / Índigo Real */}
            <linearGradient id="silkWaveSapphire" x1="0%" y1="100%" x2="100%" y2="0%">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.15" />
                  <stop offset="45%" stopColor="#4F46E5" stopOpacity="0.32" />
                  <stop offset="80%" stopColor="#00F0FF" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#090D1A" stopOpacity="0.05" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.30" />
                  <stop offset="50%" stopColor="#818CF8" stopOpacity="0.32" />
                  <stop offset="85%" stopColor="#38BDF8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.10" />
                </>
              )}
            </linearGradient>

            {/* Filo Especular de Seda (Cresta Brillante de cada Onda) */}
            <linearGradient id="silkCrestHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="25%" stopColor={isDark ? '#67E8F9' : '#0284C7'} stopOpacity={isDark ? '0.75' : '0.55'} />
              <stop offset="52%" stopColor="#FFFFFF" stopOpacity={isDark ? '0.92' : '0.85'} />
              <stop offset="78%" stopColor="#34D399" stopOpacity={isDark ? '0.70' : '0.50'} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Capa 1 (Fondo): Gran Pliegue de Seda Zafiro Diagonal */}
          <g className="silk-ribbon-layer silk-layer-back">
            <path
              d="M -180 280 C 340 40, 820 620, 1380 290 C 1690 110, 1920 240, 2120 160 L 2120 1180 L -180 1180 Z"
              fill="url(#silkWaveSapphire)"
            />
            <path
              d="M -180 280 C 340 40, 820 620, 1380 290 C 1690 110, 1920 240, 2120 160"
              fill="none"
              stroke="url(#silkCrestHighlight)"
              strokeWidth="1.8"
              opacity="0.7"
            />
          </g>

          {/* Capa 2 (Media): Onda de Seda Esmeralda / Turquesa */}
          <g className="silk-ribbon-layer silk-layer-mid">
            <path
              d="M -200 680 C 260 360, 740 840, 1260 510 C 1610 290, 1860 520, 2140 410 L 2140 1180 L -200 1180 Z"
              fill="url(#silkWaveEmerald)"
            />
            <path
              d="M -200 680 C 260 360, 740 840, 1260 510 C 1610 290, 1860 520, 2140 410"
              fill="none"
              stroke="url(#silkCrestHighlight)"
              strokeWidth="2.2"
              opacity="0.85"
            />
          </g>

          {/* Capa 3 (Frente): Velo de Seda Cyan Líquido */}
          <g className="silk-ribbon-layer silk-layer-front">
            <path
              d="M -160 860 C 420 980, 840 420, 1440 690 C 1740 825, 1940 680, 2120 740 L 2120 1180 L -160 1180 Z"
              fill="url(#silkWaveCyan)"
            />
            <path
              d="M -160 860 C 420 980, 840 420, 1440 690 C 1740 825, 1940 680, 2120 740"
              fill="none"
              stroke="url(#silkCrestHighlight)"
              strokeWidth="2.4"
            />
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
        {/* LADO IZQUIERDO: EMBLEMA FAMILIAR PROTAGÓNICO CON ANILLOS       */}
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
