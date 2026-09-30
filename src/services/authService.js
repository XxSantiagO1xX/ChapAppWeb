/**
 * ChapApp - Servicio de Autenticación y Control de Acceso por Roles (RBAC)
 * Gestión hermética de credenciales, sesiones y usuarios con hashing criptográfico SHA-256
 */

const STORAGE_KEY_USERS = 'chapapp_auth_users';
const STORAGE_KEY_SESSION = 'chapapp_session_user';

/**
 * Función auxiliar para hashear contraseñas usando la Web Crypto API (SHA-256)
 * @param {string} text - Contraseña en texto plano
 * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
 */
export const hashPassword = async (text) => {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple si Web Crypto no estuviera disponible (ej. entorno de pruebas)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
};

/**
 * Cuentas semilla iniciales por defecto:
 * 1. Administrador (Clave inicial: '1234') - Rol 'admin'
 * 2. Segundo al Mando (Clave inicial: '2345') - Rol 'operator'
 */
const getInitialSeedUsers = async () => [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'Administrador General',
    role: 'admin',
    avatar: null,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword('1234'),
  },
  {
    id: 'usr_segundo',
    username: 'segundo',
    name: 'Segundo al Mando',
    role: 'operator',
    avatar: null,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword('2345'),
  },
];

/**
 * Inicializa y retorna la lista de usuarios asegurando que existan las cuentas semilla
 */
export const initAuthUsers = async () => {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  if (!stored) {
    const seeds = await getInitialSeedUsers();
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seeds));
    return seeds;
  }

  try {
    const users = JSON.parse(stored);
    // Asegurar que al menos el admin y el segundo existan
    let updated = false;
    if (!users.some((u) => u.username === 'admin')) {
      users.push({
        id: 'usr_admin',
        username: 'admin',
        name: 'Administrador General',
        role: 'admin',
        avatar: null,
        createdAt: new Date().toISOString(),
        passwordHash: await hashPassword('1234'),
      });
      updated = true;
    }
    if (!users.some((u) => u.username === 'segundo')) {
      users.push({
        id: 'usr_segundo',
        username: 'segundo',
        name: 'Segundo al Mando',
        role: 'operator',
        avatar: null,
        createdAt: new Date().toISOString(),
        passwordHash: await hashPassword('2345'),
      });
      updated = true;
    }

    if (updated) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }
    return users;
  } catch (e) {
    console.error('[AuthService] Error parseando usuarios, reinicializando semillas:', e);
    const seeds = await getInitialSeedUsers();
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(seeds));
    return seeds;
  }
};

/**
 * Obtiene la lista actual de todos los usuarios registrados (solo metadatos seguros)
 */
export const getUsersList = async () => {
  const users = await initAuthUsers();
  return users.map(({ passwordHash, ...safeUser }) => safeUser);
};

/**
 * Obtiene el usuario actualmente en sesión
 */
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY_SESSION);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

/**
 * Autentica un usuario con username y password
 */
export const login = async (username, password) => {
  if (!username || !password) {
    throw new Error('Por favor ingresa usuario y contraseña.');
  }

  const users = await initAuthUsers();
  const normalizedUsername = username.trim().toLowerCase();
  const user = users.find(
    (u) => u.username.toLowerCase() === normalizedUsername || (normalizedUsername === 'administrador' && u.username === 'admin')
  );

  if (!user) {
    throw new Error('El usuario no existe o fue dado de baja.');
  }

  const inputHash = await hashPassword(password.trim());
  if (user.passwordHash !== inputHash) {
    throw new Error('Contraseña incorrecta. Por favor verifica tus credenciales.');
  }

  const sessionUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    avatar: user.avatar || null,
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
  return sessionUser;
};

/**
 * Cierra la sesión activa
 */
export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }
};

/**
 * Permite a cualquier usuario cambiar su propia contraseña verificando la anterior
 */
export const changePassword = async (userId, oldPassword, newPassword) => {
  if (!newPassword || newPassword.length < 3) {
    throw new Error('La nueva contraseña debe tener al menos 3 caracteres.');
  }

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  const users = stored ? JSON.parse(stored) : await initAuthUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  const oldHash = await hashPassword(oldPassword.trim());
  if (user.passwordHash !== oldHash) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  user.passwordHash = await hashPassword(newPassword.trim());
  user.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  // Actualizar sesión si corresponde
  const session = getCurrentUser();
  if (session && session.id === userId) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ ...session, updatedAt: user.updatedAt }));
  }

  return true;
};

/**
 * Restablecimiento de contraseña por parte del Administrador sin requerir la anterior
 */
export const adminResetPassword = async (targetUserId, newPassword) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede restablecer contraseñas.');
  }

  if (!newPassword || newPassword.length < 3) {
    throw new Error('La nueva contraseña debe tener al menos 3 caracteres.');
  }

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  const users = stored ? JSON.parse(stored) : await initAuthUsers();
  const user = users.find((u) => u.id === targetUserId);

  if (!user) {
    throw new Error('Usuario objetivo no encontrado.');
  }

  user.passwordHash = await hashPassword(newPassword.trim());
  user.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  return true;
};

/**
 * Dar de alta un nuevo usuario interno (Exclusivo Administrador)
 */
export const adminCreateUser = async ({ username, name, password, role = 'operator' }) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede crear usuarios.');
  }

  if (!username || !password || !name) {
    throw new Error('Todos los campos son obligatorios.');
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3) {
    throw new Error('El nombre de usuario debe tener al menos 3 caracteres (letras, números o guion bajo).');
  }

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  const users = stored ? JSON.parse(stored) : await initAuthUsers();

  if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`El nombre de usuario "${cleanUsername}" ya se encuentra registrado.`);
  }

  const newUser = {
    id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    username: cleanUsername,
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'operator',
    avatar: null,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(password.trim()),
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  const { passwordHash, ...safeUser } = newUser;
  return safeUser;
};

/**
 * Modificar rol o nombre de un usuario interno (Exclusivo Administrador)
 */
export const adminUpdateUser = async (userId, { name, role }) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede modificar usuarios.');
  }

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  const users = stored ? JSON.parse(stored) : await initAuthUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  // Prevenir que el admin principal se quite el rol de admin a sí mismo si es el único
  if (user.username === 'admin' && role !== 'admin') {
    throw new Error('No es posible revocar el rol de Administrador al usuario principal.');
  }

  if (name) user.name = name.trim();
  if (role) {
    user.role = role === 'admin' ? 'admin' : 'operator';
    user.avatar = null;
  }
  user.updatedAt = new Date().toISOString();

  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

  // Actualizar sesión si el modificado es el usuario actual
  if (current.id === userId) {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({ ...current, name: user.name, role: user.role, avatar: user.avatar })
    );
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

/**
 * Dar de baja a un usuario interno (Exclusivo Administrador)
 */
export const adminDeleteUser = async (userId) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede dar de baja usuarios.');
  }

  const stored = localStorage.getItem(STORAGE_KEY_USERS);
  const users = stored ? JSON.parse(stored) : await initAuthUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  if (user.username === 'admin' || user.id === current.id) {
    throw new Error('No es posible eliminar tu propia cuenta de Administrador principal.');
  }

  const filtered = users.filter((u) => u.id !== userId);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(filtered));
  return true;
};
