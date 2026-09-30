/**
 * ChapApp - Modal de Configuración Avanzada y Gestión de Usuarios (SettingsModal) React
 * Segmentado por roles: Opciones básicas para 'operator' y herramientas completas para 'admin'
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { 
  getUsersList, 
  changePassword, 
  adminCreateUser, 
  adminUpdateUser, 
  adminDeleteUser, 
  adminResetPassword 
} from '../../services/authService.js';
import { CONFIG } from '../../config/config.js';
import { getAllEvents } from '../../services/database.js';
import { Icon } from '../../utils/icons.jsx';

export const SettingsModal = () => {
  const { 
    activeModal, 
    closeModal, 
    currentUser, 
    logoutUser, 
    theme, 
    toggleTheme, 
    backgroundTheme,
    changeBackgroundTheme,
    customBgUrl,
    changeCustomBgUrl,
    showToast,
    syncCloud,
    events = [] 
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  // Tabs: 'profile' (todos) | 'users' (solo admin) | 'system' (solo admin)
  const [activeTab, setActiveTab] = useState('profile');

  // Estado para cambio de contraseña propia
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Estado para gestión de usuarios (Admin)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('operator');
  const [creatingUser, setCreatingUser] = useState(false);

  // Manejador para subir foto de fondo personalizada
  const handleCustomImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP)', 'info');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        changeCustomBgUrl(dataUrl);
        changeBackgroundTheme('custom');
        showToast('Fondo personalizado aplicado con éxito', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Cargar lista de usuarios si es admin
  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const list = await getUsersList();
      setUsersList(list || []);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'settings') {
      setActiveTab('profile');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCreateUserForm(false);
      if (isAdmin) loadUsers();
    }
  }, [activeModal, isAdmin]);

  if (activeModal !== 'settings' || !currentUser) return null;

  // 1. Guardar cambio de contraseña propia
  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim()) {
      showToast('Por favor completa todos los campos de contraseña', 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('La nueva contraseña y la confirmación no coinciden', 'error');
      return;
    }
    if (newPassword.length < 3) {
      showToast('La nueva contraseña debe tener al menos 3 caracteres', 'info');
      return;
    }

    setPassLoading(true);
    try {
      await changePassword(currentUser.id, oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('¡Tu contraseña ha sido actualizada con éxito!', 'success');
    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      showToast(err.message || 'Error al cambiar contraseña', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // 2. Crear nuevo usuario (Admin)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      showToast('Todos los campos son requeridos', 'info');
      return;
    }

    setCreatingUser(true);
    try {
      await adminCreateUser({
        name: newUserName.trim(),
        username: newUserUsername.trim(),
        password: newUserPassword.trim(),
        role: newUserRole,
      });

      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('operator');
      setShowCreateUserForm(false);
      await loadUsers();
      showToast('Usuario interno creado exitosamente', 'success');
    } catch (err) {
      console.error('Error creando usuario:', err);
      showToast(err.message || 'Error creando usuario', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  // 3. Resetear contraseña de otro usuario (Admin)
  const handleAdminResetPassword = async (targetUser) => {
    const newPass = window.prompt(
      `Ingresa la nueva contraseña para el usuario "${targetUser.name}" (@${targetUser.username}):`,
      ''
    );
    if (!newPass || !newPass.trim()) return;

    try {
      await adminResetPassword(targetUser.id, newPass.trim());
      showToast(`Contraseña de @${targetUser.username} restablecida con éxito`, 'success');
    } catch (err) {
      showToast(err.message || 'Error restableciendo contraseña', 'error');
    }
  };

  // 4. Cambiar rol de usuario (Admin)
  const handleToggleRole = async (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'operator' : 'admin';
    try {
      await adminUpdateUser(targetUser.id, { role: nextRole });
      await loadUsers();
      showToast(`Rol de @${targetUser.username} actualizado a ${nextRole === 'admin' ? 'Administrador' : 'Segundo al Mando'}`, 'success');
    } catch (err) {
      showToast(err.message || 'Error actualizando rol', 'error');
    }
  };

  // 5. Eliminar usuario (Admin)
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`¿Estás seguro de dar de baja al usuario "${targetUser.name}" (@${targetUser.username})?`)) {
      return;
    }

    try {
      await adminDeleteUser(targetUser.id);
      await loadUsers();
      showToast(`Usuario @${targetUser.username} eliminado`, 'info');
    } catch (err) {
      showToast(err.message || 'Error eliminando usuario', 'error');
    }
  };

  // 6. Descargar Backup JSON Completo
  const handleDownloadBackup = async () => {
    try {
      const allData = {
        app: 'ChapApp',
        version: CONFIG.APP.VERSION,
        exportedAt: new Date().toISOString(),
        events: await getAllEvents(),
        directory: JSON.parse(localStorage.getItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY) || '[]'),
      };

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ChapApp_Backup_Completo_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad JSON descargada correctamente', 'success');
    } catch (err) {
      console.error('Error generando backup:', err);
      showToast('Error al generar la copia de seguridad', 'error');
    }
  };

  // 7. Limpiar Caché Local
  const handleClearCache = () => {
    if (window.confirm('¿Deseas vaciar la memoria caché local? Los datos se recargarán inmediatamente desde Supabase Cloud.')) {
      localStorage.removeItem(CONFIG.APP.STORAGE_KEYS.LOCAL_EVENTS);
      localStorage.removeItem(CONFIG.APP.STORAGE_KEYS.LOCAL_DIRECTORY);
      syncCloud();
      showToast('Caché local depurada y datos resincronizados', 'success');
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={closeModal}>
      <div 
        className="glass-dialog modal-lg animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="dialog-content">
          <div className="dialog-header">
            <div className="dialog-title-group">
              <span className={`dialog-badge ${isAdmin ? 'badge-amber' : 'badge-cyan'}`}>
                {isAdmin ? 'ADMINISTRADOR GENERAL' : 'SEGUNDO AL MANDO'}
              </span>
              <h3 className="dialog-title">Configuración del Sistema</h3>
            </div>
            <button 
              type="button" 
              className="btn-icon-glass btn-close-dialog" 
              onClick={closeModal} 
              aria-label="Cerrar"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Barra de Pestañas con Hermetismo por Roles */}
          <div className="payer-type-toggle-bar" style={{ marginBottom: '18px' }}>
            <button 
              type="button" 
              className={`payer-type-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <Icon name="user" size={15} />
              <span>Mi Perfil</span>
            </button>

            {isAdmin && (
              <>
                <button 
                  type="button" 
                  className={`payer-type-btn ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Icon name="users" size={15} />
                  <span>Gestión de Usuarios</span>
                </button>
                <button 
                  type="button" 
                  className={`payer-type-btn ${activeTab === 'system' ? 'active' : ''}`}
                  onClick={() => setActiveTab('system')}
                >
                  <Icon name="settings" size={15} />
                  <span>Diagnóstico & Respaldo</span>
                </button>
              </>
            )}
          </div>

          {/* ============================================================== */}
          {/* PESTAÑA 1: MI PERFIL (Para todos los usuarios)                 */}
          {/* ============================================================== */}
          {activeTab === 'profile' && (
            <div className="settings-tab-profile animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Tarjeta de Usuario Activo */}
              <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '2.4rem', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-subtle)', borderRadius: '50%', border: '1px solid var(--border-subtle)' }}>
                    {currentUser.avatar || (isAdmin ? '👑' : '🛡️')}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{currentUser.name}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{currentUser.username}</span>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge-pill ${isAdmin ? 'badge-amber' : 'badge-cyan'}`}>
                        {isAdmin ? 'Administrador Principal' : 'Segundo al Mando (Operador)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-pill-danger" 
                  onClick={() => {
                    closeModal();
                    logoutUser();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon name="logout" size={16} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>

              {/* Formulario de Cambio de Contraseña Propia */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
                <strong style={{ display: 'block', fontSize: '1.0rem', color: 'var(--text-primary)', marginBottom: '14px' }}>
                  🔒 Actualizar mi Contraseña
                </strong>

                <form onSubmit={handleChangeOwnPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group">
                    <label>Contraseña Actual *</label>
                    <input 
                      type="password" 
                      className="glass-input" 
                      placeholder="••••••••" 
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Nueva Contraseña *</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="Mínimo 3 caracteres" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirmar Nueva Contraseña *</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="Repite la nueva contraseña" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button type="submit" className="btn-pill-primary" disabled={passLoading}>
                      <Icon name="check" size={16} />
                      <span>{passLoading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Ajuste de Apariencia */}
              <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Tema de la Interfaz</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Actualmente en modo {theme === 'dark' ? 'Oscuro (Glassmorphism Neón)' : 'Claro (Vidrio Esmerilado)'}.
                  </p>
                </div>
                <button type="button" className="btn-pill-glass" onClick={toggleTheme}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
                  <span>Cambiar a {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>
              </div>

              {/* Selector de Fondos 8K UHD y Microtextura de Cristal */}
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '1.0rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="sparkles" size={16} /> Ambiente Visual & Fondo 8K UHD
                  </strong>
                  <span className="badge-pill badge-cyan">Microtextura Esmerilada Activa</span>
                </div>
                <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Lienzos orbitales ultra nítidos acelerados por GPU que realzan los reflejos Liquid Glass de la interfaz.
                </p>

                <div className="bg-selector-grid">
                  {/* Preset 1: Nebulosa Cósmica */}
                  <div 
                    className={`bg-preset-card ${backgroundTheme === 'nebulosa' ? 'active' : ''}`}
                    onClick={() => {
                      changeBackgroundTheme('nebulosa');
                      showToast('Ambiente "Nebulosa Cósmica 8K" activado', 'info');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div 
                      className="bg-preset-thumbnail" 
                      style={{ background: 'linear-gradient(135deg, #060A14 0%, #4338CA 50%, #00F0FF 100%)' }}
                    />
                    <span className="bg-preset-name">🌌 Nebulosa</span>
                    <span className="bg-preset-badge">Cian & Índigo</span>
                  </div>

                  {/* Preset 2: Aurora Boreal */}
                  <div 
                    className={`bg-preset-card ${backgroundTheme === 'aurora' ? 'active' : ''}`}
                    onClick={() => {
                      changeBackgroundTheme('aurora');
                      showToast('Ambiente "Aurora Boreal 8K" activado', 'info');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div 
                      className="bg-preset-thumbnail" 
                      style={{ background: 'linear-gradient(135deg, #031412 0%, #059669 50%, #00F0FF 100%)' }}
                    />
                    <span className="bg-preset-name">🌲 Aurora</span>
                    <span className="bg-preset-badge">Esmeralda</span>
                  </div>

                  {/* Preset 3: Obsidiana Pura */}
                  <div 
                    className={`bg-preset-card ${backgroundTheme === 'obsidiana' ? 'active' : ''}`}
                    onClick={() => {
                      changeBackgroundTheme('obsidiana');
                      showToast('Ambiente "Obsidiana Pura 8K" activado', 'info');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div 
                      className="bg-preset-thumbnail" 
                      style={{ background: 'linear-gradient(135deg, #04060A 0%, #1E293B 50%, #475569 100%)' }}
                    />
                    <span className="bg-preset-name">🌑 Obsidiana</span>
                    <span className="bg-preset-badge">Monocromo</span>
                  </div>

                  {/* Preset 4: Atardecer Crepuscular */}
                  <div 
                    className={`bg-preset-card ${backgroundTheme === 'sunset' ? 'active' : ''}`}
                    onClick={() => {
                      changeBackgroundTheme('sunset');
                      showToast('Ambiente "Atardecer Crepuscular 8K" activado', 'info');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div 
                      className="bg-preset-thumbnail" 
                      style={{ background: 'linear-gradient(135deg, #120914 0%, #D97706 50%, #E11D48 100%)' }}
                    />
                    <span className="bg-preset-name">🌅 Atardecer</span>
                    <span className="bg-preset-badge">Ámbar & Coral</span>
                  </div>

                  {/* Preset 5: Imagen Personalizada */}
                  <label 
                    className={`bg-preset-card ${backgroundTheme === 'custom' ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div 
                      className="bg-preset-thumbnail" 
                      style={{ 
                        background: customBgUrl ? `url(${customBgUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8'
                      }}
                    >
                      <Icon name="upload" size={18} />
                    </div>
                    <span className="bg-preset-name">🖼️ Tu Imagen</span>
                    <span className="bg-preset-badge">{customBgUrl ? 'Cargada' : 'Subir foto'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleCustomImageUpload} 
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 2: GESTIÓN DE USUARIOS (Exclusivo Administrador)        */}
          {/* ============================================================== */}
          {isAdmin && activeTab === 'users' && (
            <div className="settings-tab-users animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Padrón Interno de Usuarios</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Cuentas autorizadas para operar ChapApp.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn-pill-primary" 
                  onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                >
                  <Icon name={showCreateUserForm ? 'close' : 'plus'} size={15} />
                  <span>{showCreateUserForm ? 'Cancelar' : 'Alta de Nuevo Usuario'}</span>
                </button>
              </div>

              {/* Formulario de Alta de Usuario */}
              {showCreateUserForm && (
                <form onSubmit={handleCreateUser} className="glass-panel animate-scale-in" style={{ padding: '18px', borderRadius: '16px' }}>
                  <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '12px', color: 'var(--color-primary)' }}>
                    ✨ Registrar Nuevo Usuario Autorizado
                  </strong>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Nombre Completo *</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="ej. Tía Rosalía Santiago" 
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Usuario de Acceso *</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        placeholder="ej. rosalia" 
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-row-2" style={{ marginTop: '10px' }}>
                    <div className="form-group">
                      <label>Contraseña Inicial *</label>
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="••••••••" 
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Rol de Acceso *</label>
                      <select 
                        className="glass-select" 
                        value={newUserRole} 
                        onChange={(e) => setNewUserRole(e.target.value)}
                      >
                        <option value="operator">Segundo al Mando (Operador)</option>
                        <option value="admin">Administrador General (Control Total)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                    <button type="button" className="btn-pill-glass" onClick={() => setShowCreateUserForm(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-pill-primary" disabled={creatingUser}>
                      <Icon name="check" size={16} />
                      <span>{creatingUser ? 'Guardando...' : 'Crear Usuario'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Tabla de Usuarios */}
              <div className="cut-table-scroll" style={{ maxHeight: '280px' }}>
                <table className="pos-table">
                  <thead>
                    <tr>
                      <th>Usuario / Nombre</th>
                      <th>Rol Asignado</th>
                      <th>Fecha de Alta</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => {
                      const isRootAdmin = u.username === 'admin';
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{u.avatar || '👤'}</span>
                              <div>
                                <strong>{u.name}</strong>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge-pill ${u.role === 'admin' ? 'badge-amber' : 'badge-cyan'}`}>
                              {u.role === 'admin' ? 'Administrador' : 'Segundo al Mando'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Semilla'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button 
                                type="button" 
                                className="btn-pill-glass btn-sm-pill"
                                onClick={() => handleAdminResetPassword(u)}
                                title="Restablecer contraseña"
                              >
                                <Icon name="key" size={13} />
                                <span>Reset Clave</span>
                              </button>

                              {!isRootAdmin && (
                                <>
                                  <button 
                                    type="button" 
                                    className="btn-pill-glass btn-sm-pill"
                                    onClick={() => handleToggleRole(u)}
                                    title="Alternar rol admin / operador"
                                  >
                                    <Icon name="shield" size={13} />
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn-icon-danger" 
                                    onClick={() => handleDeleteUser(u)}
                                    title="Eliminar usuario"
                                  >
                                    <Icon name="trash" size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PESTAÑA 3: DIAGNÓSTICO Y RESPALDO (Exclusivo Administrador)   */}
          {/* ============================================================== */}
          {isAdmin && activeTab === 'system' && (
            <div className="settings-tab-system animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Estado de Supabase Cloud */}
              <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="database" size={16} /> Estado de Supabase Cloud
                  </strong>
                  <span className="badge-pill badge-emerald">En línea & Realtime Activo</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Endpoint:</strong> <code>{CONFIG.SUPABASE.URL}</code></div>
                  <div><strong>Eventos cargados:</strong> {events.length} eventos históricos</div>
                  <div><strong>Sincronización en vivo:</strong> Canales postgres_changes activos en events, participants y expenses</div>
                </div>
              </div>

              {/* Herramientas de Mantenimiento y Backup */}
              <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px' }}>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                  📦 Copias de Seguridad y Resguardo
                </strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Descarga una copia completa de toda la contabilidad, participantes y compras en formato JSON para resguardo seguro fuera de línea.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button type="button" className="btn-pill-primary" onClick={handleDownloadBackup}>
                    <Icon name="download" size={15} />
                    <span>Descargar Backup JSON Completo</span>
                  </button>

                  <button type="button" className="btn-pill-glass" onClick={handleClearCache}>
                    <Icon name="refresh" size={15} />
                    <span>Depurar Caché Local</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="dialog-footer" style={{ marginTop: '18px' }}>
            <button type="button" className="btn-pill-glass" onClick={closeModal}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
