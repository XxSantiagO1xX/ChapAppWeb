/**
 * ChapApp - Pantalla de Inicio de Sesión (Login) Liquid Glass 3D
 * Inspirada en la estética visual de cristal translúcido, pedestal orbital y diseño hermético
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Icon } from '../../utils/icons.jsx';

export const LoginScreen = () => {
  const { loginUser, showToast } = useApp();

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
      showToast(`¡Bienvenido de vuelta, ${user.name}!`, 'success');
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
      {/* Fondo inmersivo con gradientes de nebulosa y destellos */}
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />
      <div className="login-bg-glow login-bg-glow-3" />

      <div className="login-split-layout">
        {/* ============================================================== */}
        {/* LADO IZQUIERDO: ESCENA 3D DEL EMBLEMA PROTAGÓNICO EN PEDESTAL */}
        {/* ============================================================== */}
        <div className="login-visual-stage">
          <div className="stage-top-brand">
            <div className="brand-pill-badge">
              <span className="brand-dot-pulse" />
              <span>ChapApp • Sistema Financiero Familiar</span>
            </div>
          </div>

          <div className="stage-scene-3d">
            {/* Anillos de luz orbitales neón */}
            <div className="scene-orbital-ring scene-orbital-ring-1" />
            <div className="scene-orbital-ring scene-orbital-ring-2" />
            <div className="scene-orbital-ring scene-orbital-ring-3" />

            {/* Destellos geométricos flotantes secundarios */}
            <div className="floating-gem floating-gem-1">
              <Icon name="sparkles" size={18} color="rgba(0, 240, 255, 0.85)" />
            </div>
            <div className="floating-gem floating-gem-2">
              <Icon name="sparkles" size={14} color="rgba(168, 85, 247, 0.85)" />
            </div>
            <div className="floating-gem floating-gem-3">
              <Icon name="sparkles" size={16} color="rgba(99, 102, 241, 0.85)" />
            </div>

            {/* Cristal Prisma Central Protagónico que alberga el árbol de ChapApp */}
            <div className="crystal-core-prism animate-levitate">
              <div className="prism-glass-facet facet-front">
                <img 
                  src="/assets/logo_tree.png" 
                  alt="ChapApp Emblema Protagónico" 
                  className="prism-emblem-tree" 
                  onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
                />
              </div>
              <div className="prism-inner-light" />
            </div>

            {/* Pedestal cilíndrico metálico con resplandor en la base */}
            <div className="scene-pedestal-platform">
              <div className="pedestal-top-disc" />
              <div className="pedestal-cylinder-body" />
              <div className="pedestal-glow-ground" />
            </div>

            {/* Niebla / niebla luminosa ambiental */}
            <div className="scene-mist-layer" />
          </div>

          <div className="stage-bottom-info">
            <h2 className="stage-title">ChapApp</h2>
            <p className="stage-tagline">
              Gestión contable, cálculo de cuotas ponderadas y auditoría de gastos en tiempo real.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LADO DERECHO: PANEL DE VIDRIO LÍQUIDO TRANSLÚCIDO (LOGIN CARD) */}
        {/* ============================================================== */}
        <div className="login-card-stage">
          <div className="liquid-glass-card animate-scale-in">
            {/* Header de la tarjeta */}
            <div className="card-brand-header">
              <div className="card-floating-emblem">
                <img 
                  src="/assets/logo_tree.png" 
                  alt="Logo" 
                  className="card-tree-icon" 
                  onError={(e) => { e.target.src = './assets/logo_tree.png'; }} 
                />
              </div>
              <h1 className="card-brand-name">ChapApp</h1>
              <p className="card-brand-motto">Acceso al Sistema Privado</p>
            </div>

            {/* Formulario de Login Hermético */}
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
                    placeholder="ej. admin o segundo"
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

              {/* Botón Primario de Ingreso con Degradado Neón */}
              <button
                type="submit"
                className="btn-login-gradient"
                disabled={loading}
              >
                <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
                <span className="btn-arrow-icon">
                  {loading ? <div className="spinner-sm" /> : <Icon name="arrow-right" size={18} />}
                </span>
              </button>
            </form>

            {/* Paginación / Puntos de estado visual inspirados en la referencia */}
            <div className="card-bottom-indicators">
              <span className="indicator-line" />
              <span className="indicator-dot active" />
              <span className="indicator-dot" />
              <span className="indicator-dot" />
              <span className="indicator-line" />
            </div>

            <div className="card-security-badge">
              <Icon name="shield" size={13} />
              <span>Autenticación Criptográfica Local & Nube</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
