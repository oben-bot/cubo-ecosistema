// Autenticacion local: contrasena con scrypt + sal, nunca texto plano.
// La recuperacion por correo no existe aqui: LoginScreen.jsx la desactiva
// honestamente hasta que se implemente de verdad (fuera del alcance E2).
const crypto = require('crypto');
const { get, run } = require('./database');

const LONGITUD_HASH = 64;
const CLAVE_HASH = 'password_hash';
const CLAVE_LEGADA = 'password'; // contrasena en texto plano de versiones anteriores

function hashContrasena(password) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, sal, LONGITUD_HASH).toString('hex');
  return `${sal}:${hash}`;
}

function coincideContrasena(password, almacenado) {
  if (!almacenado || !almacenado.includes(':')) return false;
  const [sal, hashGuardadoHex] = almacenado.split(':');
  const intento = crypto.scryptSync(password, sal, LONGITUD_HASH);
  const guardado = Buffer.from(hashGuardadoHex, 'hex');
  if (intento.length !== guardado.length) return false;
  return crypto.timingSafeEqual(intento, guardado);
}

async function leerConfig(clave) {
  const fila = await get('SELECT valor FROM configuraciones WHERE clave = ?', [clave]);
  return fila ? fila.valor : null;
}

async function guardarConfig(clave, valor) {
  return run(
    'INSERT OR REPLACE INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [clave, valor]
  );
}

/** true solo si hay una contrasena con hash real configurada. */
async function tieneContrasena() {
  const hash = await leerConfig(CLAVE_HASH);
  return !!hash;
}

/** Establece (o cambia) la contrasena. Elimina cualquier resto en texto plano. */
async function establecerContrasena(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }
  await guardarConfig(CLAVE_HASH, hashContrasena(password));
  await guardarConfig(CLAVE_LEGADA, '');
  return { ok: true };
}

/**
 * Verifica correo + contrasena. Una fila legada en texto plano (de antes de
 * este cambio) nunca permite entrar: se pide reconfigurar, no se compara en
 * texto plano.
 */
async function verificarCredenciales(email, password) {
  const emailGuardado = await leerConfig('user_email');
  const hashGuardado = await leerConfig(CLAVE_HASH);

  if (!hashGuardado) {
    return { ok: false, motivo: 'sin_configurar' };
  }
  if (email !== emailGuardado) {
    return { ok: false, motivo: 'correo_incorrecto' };
  }
  if (!coincideContrasena(password, hashGuardado)) {
    return { ok: false, motivo: 'contrasena_incorrecta' };
  }
  return { ok: true };
}

/** Cambia la contrasena solo si la actual es correcta. */
async function cambiarContrasena(actual, nueva) {
  const emailGuardado = await leerConfig('user_email');
  const verificacion = await verificarCredenciales(emailGuardado, actual);
  if (!verificacion.ok) {
    return {
      ok: false,
      motivo: verificacion.motivo === 'sin_configurar' ? 'sin_configurar' : 'contrasena_actual_incorrecta',
    };
  }
  await establecerContrasena(nueva);
  return { ok: true };
}

module.exports = {
  tieneContrasena,
  establecerContrasena,
  verificarCredenciales,
  cambiarContrasena,
  // exportadas para pruebas unitarias puras, sin base de datos
  _hashContrasena: hashContrasena,
  _coincideContrasena: coincideContrasena,
};
