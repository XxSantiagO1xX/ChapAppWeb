/**
 * ChapApp - Pantalla de Inicio de Sesión (Login) Liquid Glass 3D
 * Escena Opción C: Esferas y Prismas de Cristal Flotantes (Depth & Bokeh 3D)
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
      {/* ESCENA DE FONDO OPCIÓN C: PRISMAS Y ESFERAS DE CRISTAL 3D      */}
      {/* ============================================================== */}
      <div className="login-prisms-backdrop" aria-hidden="true">
        {/* Capa 1: Halos Bokeh Profundos de Luz Volumétrica */}
        <div className="bokeh-ambient-orb bokeh-cyan-left" />
        <div className="bokeh-ambient-orb bokeh-emerald-right" />
        <div className="bokeh-ambient-orb bokeh-sapphire-top" />

        {/* Capa 2: Esferas y Lentes de Cristal 3D con Refracción Especular */}
        {/* Esfera Grande detrás de la esquina superior derecha de la tarjeta */}
        <div className="crystal-sphere sphere-xl-card-top" />
        {/* Esfera Mediana Esmeralda asomando en la base izquierda de la tarjeta */}
        <div className="crystal-sphere sphere-lg-card-bottom" />
        {/* Esfera Flotante Superior Izquierda cerca del Emblema */}
        <div className="crystal-sphere sphere-md-emblem-top" />
        {/* Esfera Pequeña Nítida Inferior Izquierda */}
        <div className="crystal-sphere sphere-sm-emblem-bottom" />
        {/* Esfera Pequeña Derecha Media */}
        <div className="crystal-sphere sphere-xs-far-right" />
        {/* Prisma / Lente Elíptico Inclinado */}
        <div className="crystal-prism-lens lens-center-bridge" />
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
