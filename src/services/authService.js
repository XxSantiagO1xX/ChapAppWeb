/**
 * ChapApp - Servicio de Autenticación y Control de Acceso por Roles (RBAC)
 * Sincronización bidireccional con Supabase Cloud + Respaldo en LocalStorage
 */

import { initSupabaseClient } from './supabase.js';

const STORAGE_KEY_USERS = 'chapapp_auth_users';
const STORAGE_KEY_SESSION = 'chapapp_session_user';
const AUTH_USER_PREFIX = '__AUTH_USER__:';

/**
 * Implementación pura en JS de SHA-256 para garantizar que el hash sea idéntico
 * incluso en contextos HTTP locales (ej. pruebas en celular por IP local) donde crypto.subtle no está activo.
 */
const sha256PureJS = (ascii) => {
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (let i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? 0 : '') + b.toString(16);
    }
  }
  return result;
};

/**
 * Convierte texto UTF-8 a bytes ASCII para sha256PureJS
 */
const utf8ToBinaryString = (str) => {
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return bin;
  }
  return unescape(encodeURIComponent(str));
};

/**
 * Función para hashear contraseñas con SHA-256 consistente en cualquier dispositivo/protocolo
 * @param {string} text - Contraseña en texto plano
 * @returns {Promise<string>} Hash hexadecimal de 64 caracteres
 */
export const hashPassword = async (text) => {
  const cleanText = String(text ?? '');
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(cleanText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback a implementación pura JS si falla Web Crypto
    }
  }
  return sha256PureJS(utf8ToBinaryString(cleanText));
};

/**
 * Normaliza un nombre de usuario quitando acentos y espacios laterales, siempre en minúsculas
 */
export const normalizeUsername = (raw = '') => {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_.-]/g, '');
};

/**
 * Genera un UUID v4 determinístico a partir del username para sincronizar sin duplicados en Supabase
 */
const getDeterministicUserUUID = (username) => {
  const hex = sha256PureJS(utf8ToBinaryString(`chapapp_auth_user_v1:${normalizeUsername(username)}`));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

/**
 * Cuentas semilla iniciales por defecto:
 * 1. Administrador (Clave inicial: '1234') - Rol 'admin'
 * 2. Segundo al Mando (Clave inicial: '2345') - Rol 'operator'
 */
const getInitialSeedUsers = async () => [
  {
    id: getDeterministicUserUUID('admin'),
    username: 'admin',
    name: 'Administrador General',
    role: 'admin',
    avatar: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    passwordHash: await hashPassword('1234'),
  },
  {
    id: getDeterministicUserUUID('segundo'),
    username: 'segundo',
    name: 'Segundo al Mando',
    role: 'operator',
    avatar: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    passwordHash: await hashPassword('2345'),
  },
];

const loadLocalUsers = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalUsers = (users) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.warn('[AuthService] No se pudo guardar en LocalStorage:', e);
  }
};

/**
 * Guarda o actualiza un usuario en Supabase Cloud (usando registro global en participants con event_id = null)
 */
const upsertUserInSupabase = async (userObj) => {
  const supabase = await initSupabaseClient();
  if (!supabase || !userObj || !userObj.username) return;

  const cleanUsername = normalizeUsername(userObj.username);
  const rowId = getDeterministicUserUUID(cleanUsername);
  const normalizedUser = {
    ...userObj,
    id: rowId,
    username: cleanUsername,
    updatedAt: userObj.updatedAt || new Date().toISOString(),
  };

  const payload = {
    id: rowId,
    event_id: null,
    name: `${AUTH_USER_PREFIX}${cleanUsername}`,
    category: 'adulto',
    weight: 1.0,
    active_days: {
      isAuthUser: true,
      user: normalizedUser,
    },
  };

  try {
    const { error } = await supabase.from('participants').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[AuthService] Advertencia sincronizando usuario en Supabase:', error.message);
    }
  } catch (err) {
    console.warn('[AuthService] Error de red al sincronizar usuario en Supabase:', err);
  }
};

/**
 * Elimina un usuario de Supabase Cloud
 */
const deleteUserFromSupabase = async (username) => {
  const supabase = await initSupabaseClient();
  if (!supabase || !username) return;

  const cleanUsername = normalizeUsername(username);
  const rowId = getDeterministicUserUUID(cleanUsername);
  try {
    await supabase.from('participants').delete().eq('id', rowId).is('event_id', null);
    await supabase.from('participants').delete().eq('name', `${AUTH_USER_PREFIX}${cleanUsername}`).is('event_id', null);
  } catch (err) {
    console.warn('[AuthService] Error eliminando usuario de Supabase:', err);
  }
};

/**
 * Descarga todos los usuarios registrados en Supabase Cloud
 */
const fetchUsersFromSupabase = async () => {
  const supabase = await initSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .is('event_id', null)
      .like('name', `${AUTH_USER_PREFIX}%`);

    if (error || !Array.isArray(data)) return null;

    const remoteUsers = [];
    data.forEach((row) => {
      const u = row.active_days?.user;
      if (u && u.username && u.passwordHash) {
        remoteUsers.push({
          ...u,
          id: getDeterministicUserUUID(u.username),
          username: normalizeUsername(u.username),
        });
      }
    });
    return remoteUsers;
  } catch (err) {
    console.warn('[AuthService] Error consultando usuarios en Supabase:', err);
    return null;
  }
};

/**
 * Inicializa, sincroniza con Supabase Cloud y retorna la lista actualizada de usuarios
 */
export const initAuthUsers = async () => {
  const seeds = await getInitialSeedUsers();
  const localUsers = loadLocalUsers();
  const remoteUsers = await fetchUsersFromSupabase();

  const mergedMap = new Map();

  // 1. Poner semillas base
  seeds.forEach((s) => {
    mergedMap.set(normalizeUsername(s.username), s);
  });

  // 2. Incorporar usuarios locales
  localUsers.forEach((u) => {
    if (!u || !u.username) return;
    const key = normalizeUsername(u.username);
    const normalized = {
      ...u,
      id: getDeterministicUserUUID(key),
      username: key,
    };
    mergedMap.set(key, normalized);
  });

  // 3. Incorporar usuarios de Supabase Cloud (priorizando el más reciente si existe en ambos)
  const remoteKeys = new Set();
  if (Array.isArray(remoteUsers)) {
    remoteUsers.forEach((ru) => {
      if (!ru || !ru.username) return;
      const key = normalizeUsername(ru.username);
      remoteKeys.add(key);
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, ru);
      } else {
        const remoteTime = new Date(ru.updatedAt || ru.createdAt || 0).getTime();
        const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (remoteTime >= localTime) {
          mergedMap.set(key, ru);
        }
      }
    });
  }

  const finalUsers = Array.from(mergedMap.values());
  saveLocalUsers(finalUsers);

  // 4. Si hay usuarios locales o semillas que aún no están en Supabase, subirlos en segundo plano
  if (Array.isArray(remoteUsers)) {
    for (const u of finalUsers) {
      if (!remoteKeys.has(u.username)) {
        upsertUserInSupabase(u);
      }
    }
  }

  return finalUsers;
};

/**
 * Obtiene la lista actual de todos los usuarios registrados (sincronizada con Supabase)
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
 * Verifica si una contraseña coincide con el hash guardado, tolerando que el teclado móvil
 * haya forzado la primera letra a mayúscula o minúscula.
 */
const verifyPasswordMatch = async (rawPassword, targetHash) => {
  const trimmed = String(rawPassword ?? '').trim();
  if (!trimmed || !targetHash) return false;

  const candidates = new Set([
    trimmed,
    trimmed.charAt(0).toLowerCase() + trimmed.slice(1),
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
    trimmed.toLowerCase(),
  ]);

  for (const candidate of candidates) {
    const h = await hashPassword(candidate);
    if (h === targetHash) return true;
  }
  return false;
};

/**
 * Autentica un usuario con username y password consultando Supabase Cloud + caché local
 */
export const login = async (username, password) => {
  if (!username || !password) {
    throw new Error('Por favor ingresa usuario y contraseña.');
  }

  const users = await initAuthUsers();
  const rawInput = username.trim().toLowerCase().replace(/^@/, '');
  const normalizedInput = normalizeUsername(rawInput);

  const user = users.find((u) => {
    const uNorm = normalizeUsername(u.username);
    const nameNorm = normalizeUsername(u.name);
    return (
      uNorm === normalizedInput ||
      u.username.toLowerCase() === rawInput ||
      (u.name && u.name.trim().toLowerCase() === rawInput) ||
      (nameNorm && nameNorm === normalizedInput) ||
      (normalizedInput === 'administrador' && uNorm === 'admin')
    );
  });

  if (!user) {
    throw new Error('El usuario no existe o fue dado de baja.');
  }

  const isPasswordValid = await verifyPasswordMatch(password, user.passwordHash);
  if (!isPasswordValid) {
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

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
  }
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
  if (!newPassword || newPassword.trim().length < 3) {
    throw new Error('La nueva contraseña debe tener al menos 3 caracteres.');
  }

  const users = await initAuthUsers();
  const currentSession = getCurrentUser();
  const user = users.find(
    (u) => u.id === userId || (currentSession && normalizeUsername(u.username) === normalizeUsername(currentSession.username))
  );

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  const isOldValid = await verifyPasswordMatch(oldPassword, user.passwordHash);
  if (!isOldValid) {
    throw new Error('La contraseña actual es incorrecta.');
  }

  user.passwordHash = await hashPassword(newPassword.trim());
  user.updatedAt = new Date().toISOString();

  saveLocalUsers(users);
  await upsertUserInSupabase(user);

  const session = getCurrentUser();
  if (session && (session.id === user.id || session.username === user.username)) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify({ ...session, id: user.id, updatedAt: user.updatedAt }));
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

  if (!newPassword || newPassword.trim().length < 3) {
    throw new Error('La nueva contraseña debe tener al menos 3 caracteres.');
  }

  const users = await initAuthUsers();
  const user = users.find((u) => u.id === targetUserId);

  if (!user) {
    throw new Error('Usuario objetivo no encontrado.');
  }

  user.passwordHash = await hashPassword(newPassword.trim());
  user.updatedAt = new Date().toISOString();

  saveLocalUsers(users);
  await upsertUserInSupabase(user);
  return true;
};

/**
 * Dar de alta un nuevo usuario interno y sincronizarlo con Supabase Cloud (Exclusivo Administrador)
 */
export const adminCreateUser = async ({ username, name, password, role = 'operator' }) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede crear usuarios.');
  }

  if (!username || !password || !name) {
    throw new Error('Todos los campos son obligatorios.');
  }

  const cleanUsername = normalizeUsername(username);
  if (cleanUsername.length < 3) {
    throw new Error('El nombre de usuario debe tener al menos 3 caracteres.');
  }

  const users = await initAuthUsers();

  if (users.some((u) => normalizeUsername(u.username) === cleanUsername)) {
    throw new Error(`El nombre de usuario "${cleanUsername}" ya se encuentra registrado.`);
  }

  const now = new Date().toISOString();
  const newUser = {
    id: getDeterministicUserUUID(cleanUsername),
    username: cleanUsername,
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'operator',
    avatar: null,
    createdAt: now,
    updatedAt: now,
    passwordHash: await hashPassword(password.trim()),
  };

  users.push(newUser);
  saveLocalUsers(users);
  await upsertUserInSupabase(newUser);

  const { passwordHash, ...safeUser } = newUser;
  return safeUser;
};

/**
 * Modificar rol o nombre de un usuario interno y sincronizarlo con Supabase (Exclusivo Administrador)
 */
export const adminUpdateUser = async (userId, { name, role }) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede modificar usuarios.');
  }

  const users = await initAuthUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  if (user.username === 'admin' && role !== 'admin') {
    throw new Error('No es posible revocar el rol de Administrador al usuario principal.');
  }

  if (name) user.name = name.trim();
  if (role) {
    user.role = role === 'admin' ? 'admin' : 'operator';
    user.avatar = null;
  }
  user.updatedAt = new Date().toISOString();

  saveLocalUsers(users);
  await upsertUserInSupabase(user);

  if (current.id === userId || current.username === user.username) {
    localStorage.setItem(
      STORAGE_KEY_SESSION,
      JSON.stringify({ ...current, id: user.id, name: user.name, role: user.role, avatar: user.avatar })
    );
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

/**
 * Dar de baja a un usuario interno en Supabase y LocalStorage (Exclusivo Administrador)
 */
export const adminDeleteUser = async (userId) => {
  const current = getCurrentUser();
  if (!current || current.role !== 'admin') {
    throw new Error('Acción no autorizada. Solo un administrador puede dar de baja usuarios.');
  }

  const users = await initAuthUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) {
    throw new Error('Usuario no encontrado.');
  }

  if (user.username === 'admin' || user.id === current.id || user.username === current.username) {
    throw new Error('No es posible eliminar tu propia cuenta de Administrador principal.');
  }

  const filtered = users.filter((u) => u.id !== userId && u.username !== user.username);
  saveLocalUsers(filtered);
  await deleteUserFromSupabase(user.username);
  return true;
};
