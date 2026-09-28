// Skyblue Servicios · notificaciones al celular (Web Push, VAPID)
//
// El aviso va SIN contenido: es un golpe en la puerta. El service worker lo
// recibe, le pregunta al servidor qué hay pendiente y recién ahí escribe el
// texto. Así no hay que cifrar nada y el mensaje nunca queda viejo.
//
// La clave privada vive en un secreto del worker (VAPID_PRIVADA), nunca acá.

import * as D from './datos.js';

export const VAPID_PUBLICA = 'BMV9Xj3ai8s2PTI73e2408vYff3Ganx_IpcZPZ-F3epTCVEQMLRbrNNbdlWKc7oUuDlcW5oqshX80v7wNqOlsWE';
const VAPID_X = 'xX1ePdqLyzY9Mjvd7bjTy9h9_cZqfH8ilxk9n4Xd6lM';
const VAPID_Y = 'CVEQMLRbrNNbdlWKc7oUuDlcW5oqshX80v7wNqOlsWE';
const CONTACTO = 'mailto:gabriel.torena@gmail.com';

function b64url(buf) {
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let clavePrivada = null;
async function firmante(env) {
  if (clavePrivada) return clavePrivada;
  if (!env.VAPID_PRIVADA) return null;
  clavePrivada = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: VAPID_X, y: VAPID_Y, d: env.VAPID_PRIVADA, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  return clavePrivada;
}

// Un JWT por servicio de push (Google, Apple, Mozilla), válido 12 horas.
const cacheJwt = new Map();
async function jwtPara(env, endpoint) {
  const origen = new URL(endpoint).origin;
  const guardado = cacheJwt.get(origen);
  if (guardado && guardado.vence > Date.now() + 60000) return guardado.jwt;

  const clave = await firmante(env);
  if (!clave) return null;

  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const cabecera = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const cuerpo = b64url(new TextEncoder().encode(JSON.stringify({ aud: origen, exp, sub: CONTACTO })));
  const sinFirma = `${cabecera}.${cuerpo}`;
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, clave, new TextEncoder().encode(sinFirma)
  );
  const jwt = `${sinFirma}.${b64url(firma)}`;
  cacheJwt.set(origen, { jwt, vence: exp * 1000 });
  return jwt;
}

// --------------------------------------------------------------- suscribir
export async function guardarSuscripcion(env, { duenioTipo, duenioId, sub }) {
  if (!sub || !sub.endpoint) return false;
  const ya = await env.DB.prepare(
    'SELECT id FROM push_subs WHERE endpoint = ? AND revocada_en IS NULL'
  ).bind(sub.endpoint).first();
  if (ya) {
    await env.DB.prepare('UPDATE push_subs SET duenio_tipo = ?, duenio_id = ? WHERE id = ?')
      .bind(duenioTipo, duenioId, ya.id).run();
    return true;
  }
  await env.DB.prepare(
    `INSERT INTO push_subs (id, duenio_tipo, duenio_id, endpoint, p256dh, auth, creada_en)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(D.id(), duenioTipo, duenioId, sub.endpoint,
         sub.keys?.p256dh || '', sub.keys?.auth || '', D.ahora()).run();
  return true;
}

// ------------------------------------------------------------------ enviar
async function golpear(env, fila) {
  const jwt = await jwtPara(env, fila.endpoint);
  if (!jwt) return 'sin-clave';
  try {
    const r = await fetch(fila.endpoint, {
      method: 'POST',
      headers: {
        TTL: '900',
        Urgency: 'high',
        'Content-Length': '0',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLICA}`,
      },
    });
    // 404 y 410: el celular desinstaló la app o limpió los permisos.
    if (r.status === 404 || r.status === 410) {
      await env.DB.prepare('UPDATE push_subs SET revocada_en = ? WHERE id = ?')
        .bind(D.ahora(), fila.id).run();
      return 'vencida';
    }
    if (!r.ok) {
      console.log('push falló', r.status, (await r.text()).slice(0, 180));
      return 'error';
    }
    return 'ok';
  } catch (e) {
    console.log('push cortado', String(e).slice(0, 180));
    return 'error';
  }
}

// Avisa a todos los empleados de un sector. Los admin reciben siempre.
export async function avisarSector(env, sector) {
  const roles = sector === 'recepcion' ? ['recepcion', 'admin'] : [sector, 'admin'];
  const marcas = roles.map(() => '?').join(',');
  const r = await env.DB.prepare(
    `SELECT p.id, p.endpoint FROM push_subs p
       JOIN empleados e ON e.id = p.duenio_id
      WHERE p.duenio_tipo = 'empleado' AND p.revocada_en IS NULL
        AND e.activo = 1 AND e.rol IN (${marcas})`
  ).bind(...roles).all();

  const filas = r.results || [];
  if (!filas.length) return 0;
  const resultados = await Promise.all(filas.map((f) => golpear(env, f)));
  return resultados.filter((x) => x === 'ok').length;
}

export async function avisarEmpleado(env, empleadoId) {
  const r = await env.DB.prepare(
    `SELECT id, endpoint FROM push_subs
      WHERE duenio_tipo = 'empleado' AND duenio_id = ? AND revocada_en IS NULL`
  ).bind(empleadoId).all();
  const filas = r.results || [];
  const resultados = await Promise.all(filas.map((f) => golpear(env, f)));
  return resultados.filter((x) => x === 'ok').length;
}

// El huésped solo recibe aviso si instaló la app en la pantalla de inicio.
// En iPhone, sin instalar, no llega nada: por eso WhatsApp sigue existiendo.
export async function avisarHuesped(env, estadiaId) {
  const r = await env.DB.prepare(
    `SELECT id, endpoint FROM push_subs
      WHERE duenio_tipo = 'huesped' AND duenio_id = ? AND revocada_en IS NULL`
  ).bind(estadiaId).all();
  const filas = r.results || [];
  const resultados = await Promise.all(filas.map((f) => golpear(env, f)));
  return resultados.filter((x) => x === 'ok').length;
}
