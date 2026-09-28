// Skyblue Servicios · acceso a datos y utilidades

export const CASAS = Array.from({ length: 13 }, (_, i) => String(i).padStart(2, '0'));

export function ahora() {
  return new Date().toISOString();
}

export function id() {
  return crypto.randomUUID();
}

// Nombre y apellido se comparan sin tildes, sin mayúsculas y sin espacios de más.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function huella(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function token() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ------------------------------------------------------------- parámetros
export async function config(env, clave, porDefecto = null) {
  const r = await env.DB.prepare('SELECT valor FROM config WHERE clave = ?').bind(clave).first();
  return r ? r.valor : porDefecto;
}

// --------------------------------------------------------------- estadías
export async function estadiaActiva(env, casa) {
  return env.DB.prepare(
    `SELECT * FROM estadias WHERE casa = ? AND estado IN ('activa','salida_avisada') LIMIT 1`
  ).bind(casa).first();
}

export async function activarEstadia(env, { casa, nombre, apellido, noches }) {
  const umbral = Number(await config(env, 'umbral_noches_mucama', '3'));
  const n = Math.max(1, Number(noches) || 1);
  const e = {
    id: id(),
    casa,
    titular_nombre: String(nombre).trim(),
    titular_apellido: String(apellido).trim(),
    identidad: normalizar(`${nombre} ${apellido}`),
    noches: n,
    incluye_mucama: n >= umbral ? 1 : 0,
    activada_en: ahora(),
  };
  await env.DB.prepare(
    `INSERT INTO estadias (id, casa, titular_nombre, titular_apellido, identidad, noches, incluye_mucama, activada_en)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(e.id, e.casa, e.titular_nombre, e.titular_apellido, e.identidad, e.noches, e.incluye_mucama, e.activada_en).run();
  return e;
}

// --------------------------------------------------------------- sesiones
export async function crearSesion(env, estadiaId) {
  const t = token();
  await env.DB.prepare('INSERT INTO sesiones (id, estadia_id, creada_en) VALUES (?,?,?)')
    .bind(await huella(t), estadiaId, ahora()).run();
  return t;
}

export async function sesionDe(request, env, casa) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)sk_sesion=([a-f0-9]{64})/);
  if (!m) return null;
  const fila = await env.DB.prepare(
    `SELECT s.id, e.* FROM sesiones s
      JOIN estadias e ON e.id = s.estadia_id
     WHERE s.id = ? AND s.revocada_en IS NULL AND e.estado = 'activa'`
  ).bind(await huella(m[1])).first();
  if (!fila) return null;
  if (casa && fila.casa !== casa) return null;
  return fila;
}

export async function revocarSesiones(env, estadiaId) {
  await env.DB.prepare('UPDATE sesiones SET revocada_en = ? WHERE estadia_id = ? AND revocada_en IS NULL')
    .bind(ahora(), estadiaId).run();
}

// -------------------------------------------------------------- empleados
// La clave se guarda como sha-256 de (sal + clave). La clave nunca se guarda.
export async function verificarEmpleado(env, usuario, pin) {
  const e = await env.DB.prepare('SELECT * FROM empleados WHERE usuario = ? AND activo = 1')
    .bind(String(usuario || '').trim()).first();
  if (!e) return { error: 'Ese usuario no existe.' };

  if (e.bloqueado_hasta && e.bloqueado_hasta > ahora()) {
    return { error: 'Usuario bloqueado por intentos fallidos. Probá en unos minutos.' };
  }

  const calculada = await huella(e.pin_salt + String(pin || ''));
  if (calculada !== e.pin_hash) {
    const intentos = (e.intentos || 0) + 1;
    const bloqueo = intentos >= 5
      ? new Date(Date.now() + 10 * 60000).toISOString()
      : null;
    await env.DB.prepare('UPDATE empleados SET intentos = ?, bloqueado_hasta = ? WHERE id = ?')
      .bind(intentos >= 5 ? 0 : intentos, bloqueo, e.id).run();
    return { error: bloqueo ? 'Cinco intentos fallidos. El usuario queda bloqueado 10 minutos.' : 'Clave incorrecta.' };
  }

  await env.DB.prepare('UPDATE empleados SET intentos = 0, bloqueado_hasta = NULL WHERE id = ?')
    .bind(e.id).run();
  return { empleado: e };
}

export async function crearSesionEmpleado(env, empleadoId) {
  const t = token();
  await env.DB.prepare('INSERT INTO sesiones_empleado (id, empleado_id, creada_en) VALUES (?,?,?)')
    .bind(await huella(t), empleadoId, ahora()).run();
  return t;
}

export async function empleadoDe(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)sk_personal=([a-f0-9]{64})/);
  if (!m) return null;
  return env.DB.prepare(
    `SELECT e.* FROM sesiones_empleado s
       JOIN empleados e ON e.id = s.empleado_id
      WHERE s.id = ? AND s.revocada_en IS NULL AND e.activo = 1`
  ).bind(await huella(m[1])).first();
}

export async function revocarSesionEmpleado(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)sk_personal=([a-f0-9]{64})/);
  if (!m) return;
  await env.DB.prepare('UPDATE sesiones_empleado SET revocada_en = ? WHERE id = ?')
    .bind(ahora(), await huella(m[1])).run();
}

// -------------------------------------------------------------- servicios
export async function serviciosDe(env, categoria) {
  const r = await env.DB.prepare(
    'SELECT * FROM servicios WHERE categoria = ? AND activo = 1 ORDER BY orden'
  ).bind(categoria).all();
  return r.results || [];
}

export async function servicio(env, clave) {
  return env.DB.prepare('SELECT * FROM servicios WHERE clave = ?').bind(clave).first();
}

// ------------------------------------------------------------ solicitudes
export async function crearSolicitud(env, { estadia, servicioClave, detalles, quiereAviso }) {
  const s = await servicio(env, servicioClave);
  if (!s) throw new Error('servicio desconocido: ' + servicioClave);
  const t = ahora();
  const venceToma = new Date(Date.now() + s.min_toma * 60000).toISOString();
  const fila = {
    id: id(), estadia_id: estadia.id, casa: estadia.casa, servicio: s.clave,
    detalles: (detalles || '').slice(0, 1000), prioridad: s.prioridad,
    vence_toma_en: venceToma, huesped_quiere_aviso: quiereAviso ? 1 : 0,
    creada_en: t, actualizada_en: t,
  };
  await env.DB.prepare(
    `INSERT INTO solicitudes (id, estadia_id, casa, servicio, detalles, prioridad, vence_toma_en, huesped_quiere_aviso, creada_en, actualizada_en)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(fila.id, fila.estadia_id, fila.casa, fila.servicio, fila.detalles, fila.prioridad,
         fila.vence_toma_en, fila.huesped_quiere_aviso, fila.creada_en, fila.actualizada_en).run();
  await registrarEvento(env, { solicitudId: fila.id, anterior: null, nuevo: 'recibido', automatico: 1 });
  return fila;
}

export async function registrarEvento(env, { solicitudId, anterior, nuevo, empleadoId = null, automatico = 0 }) {
  await env.DB.prepare(
    `INSERT INTO eventos_solicitud (id, solicitud_id, estado_anterior, estado_nuevo, empleado_id, automatico, ocurrido_en)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(id(), solicitudId, anterior, nuevo, empleadoId, automatico, ahora()).run();
}

export async function solicitudesDeEstadia(env, estadiaId) {
  const r = await env.DB.prepare(
    `SELECT s.*, sv.nombre_huesped FROM solicitudes s
       JOIN servicios sv ON sv.clave = s.servicio
      WHERE s.estadia_id = ? AND s.estado <> 'cancelado'
      ORDER BY s.creada_en DESC`
  ).bind(estadiaId).all();
  return r.results || [];
}

// ----------------------------------------------------------------- avisos
export async function avisosVigentes(env) {
  const r = await env.DB.prepare(
    'SELECT * FROM avisos WHERE vence_en > ? ORDER BY publicado_en DESC LIMIT 10'
  ).bind(ahora()).all();
  return r.results || [];
}

// -------------------------------------------------------------- horarios
// Devuelve {abierto, desde, hasta} para una categoría, en hora de Montevideo.
export async function horario(env, categoria) {
  const rango = await config(env, `horario_${categoria}`, '00:00-23:59');
  const [desde, hasta] = rango.split('-');
  const hm = new Date().toLocaleTimeString('es-UY', {
    timeZone: 'America/Montevideo', hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const min = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const d = min(desde), h = min(hasta) === 0 ? 1440 : min(hasta), n = min(hm);
  return { abierto: n >= d && n < h, desde, hasta };
}
