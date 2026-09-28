// Skyblue Servicios · router
// Un solo lugar donde se decide qué pantalla responde a cada dirección.

import * as D from './datos.js';
import * as H from './huesped.js';
import * as P from './personal.js';
import * as Push from './push.js';
import { C, pagina, esc } from './marca.js';

const CATEGORIAS = ['limpieza', 'mantenimiento', 'recepcion'];

// --------------------------------------------------------------- helpers
function html(cuerpo, estado = 200) {
  return new Response(cuerpo, {
    status: estado,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
      'x-content-type-options': 'nosniff',
    },
  });
}

function irA(destino, cookie = null) {
  const h = { location: destino, 'cache-control': 'no-store' };
  if (cookie) h['set-cookie'] = cookie;
  return new Response(null, { status: 303, headers: h });
}

function cookieSesion(casa, token) {
  return `sk_sesion=${token}; Path=/casa/${casa}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

function cookieBorrada(casa) {
  return `sk_sesion=; Path=/casa/${casa}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function noEncontrado() {
  return html(pagina({
    titulo: 'No encontrado',
    cuerpo: `<div style="padding:70px 34px;display:flex;flex-direction:column;gap:16px">
      <div class="serif" style="font-size:34px;font-weight:300">Esta página no existe.</div>
      <div style="font-size:13.5px;line-height:1.6;color:${C.arena}">Escaneá de nuevo el código QR que está sobre la mesa de tu apartamento.</div>
      <a class="btn btn-sec" style="margin-top:12px;font-size:10.5px;letter-spacing:.22em;min-height:48px;padding:15px" href="https://wa.me/59891567200">ESCRIBIR A RECEPCIÓN</a>
    </div>`,
  }), 404);
}

// Acepta /casa/7 y /casa/07: siempre trabajamos con dos dígitos.
function normalizarCasa(bruto) {
  if (!/^\d{1,2}$/.test(bruto)) return null;
  const n = String(Number(bruto)).padStart(2, '0');
  return D.CASAS.includes(n) ? n : null;
}

async function campos(request) {
  const f = await request.formData();
  const o = {};
  for (const [k, v] of f.entries()) o[k] = typeof v === 'string' ? v : '';
  return o;
}

// -------------------------------------------------------------- manifest
function manifiesto() {
  return new Response(JSON.stringify({
    name: 'Skyblue Park · Servicios',
    short_name: 'Skyblue',
    start_url: '/',
    display: 'standalone',
    background_color: C.navy,
    theme_color: C.navy,
    lang: 'es',
    icons: [
      { src: '/static/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/static/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/static/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }), { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
}

// =========================================================== enrutamiento
export async function enrutar(request, env, ctx) {
  const url = new URL(request.url);
  const partes = url.pathname.split('/').filter(Boolean);
  const metodo = request.method;

  if (url.pathname === '/manifest.webmanifest') return manifiesto();
  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });
  }
  if (url.pathname === '/salud') {
    return new Response('ok ' + D.ahora(), { headers: { 'content-type': 'text/plain' } });
  }

  // La raíz no tiene pantalla propia: el huésped siempre llega por su QR.
  if (partes.length === 0) return irA('/personal');

  if (partes[0] === 'casa') return rutasHuesped(request, env, partes, metodo, ctx);
  if (partes[0] === 'personal') return rutasPersonal(request, env, partes, metodo, ctx);

  return noEncontrado();
}

// ------------------------------------------------------------- el personal
function cookiePersonal(token) {
  return `sk_personal=${token}; Path=/personal; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600`;
}

async function rutasPersonal(request, env, partes, metodo, ctx) {
  const resto = partes.slice(1);

  // 1. Ingreso con usuario y clave.
  if (resto.length === 0) {
    if (metodo === 'GET') {
      const yaEsta = await D.empleadoDe(request, env);
      if (yaEsta) return irA('/personal/tablero');
      return html(await P.pantallaLogin(env));
    }
    if (metodo === 'POST') {
      const { usuario = '', pin = '' } = await campos(request);
      const r = await D.verificarEmpleado(env, usuario, pin);
      if (r.error) return html(await P.pantallaLogin(env, { error: r.error, usuario }));
      const t = await D.crearSesionEmpleado(env, r.empleado.id);
      return irA('/personal/tablero', cookiePersonal(t));
    }
  }

  if (resto[0] === 'salir') {
    await D.revocarSesionEmpleado(request, env);
    return new Response(null, {
      status: 303,
      headers: {
        location: '/personal',
        'set-cookie': 'sk_personal=; Path=/personal; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
  }

  // 2. De acá en adelante hace falta estar identificado.
  const empleado = await D.empleadoDe(request, env);
  if (!empleado) return metodo === 'GET' ? html(await P.pantallaLogin(env)) : irA('/personal');
  const esJefe = ['admin', 'recepcion'].includes(empleado.rol);

  if (resto[0] === 'tablero' && metodo === 'GET') {
    return html(await P.pantallaTablero(env, empleado));
  }

  // 2.b Este celular quiere sonar.
  if (resto[0] === 'push' && resto.length === 1 && metodo === 'POST') {
    let sub = null;
    try { sub = await request.json(); } catch (e) { /* nada */ }
    const ok = await Push.guardarSuscripcion(env, {
      duenioTipo: 'empleado', duenioId: empleado.id, sub,
    });
    return new Response(JSON.stringify({ ok }), { headers: { 'content-type': 'application/json' } });
  }

  // 2.b.2 Probar que este celular suena de verdad.
  if (resto[0] === 'push' && resto[1] === 'probar' && metodo === 'POST') {
    const enviados = await Push.avisarEmpleado(env, empleado.id);
    return new Response(JSON.stringify({ enviados }), { headers: { 'content-type': 'application/json' } });
  }

  // 2.c El texto del aviso se arma en el momento en que suena, no antes.
  if (resto[0] === 'aviso-push' && metodo === 'GET') {
    const cats = empleado.rol === 'mucama' ? ['limpieza']
      : empleado.rol === 'mantenimiento' ? ['mantenimiento']
      : ['limpieza', 'mantenimiento', 'recepcion'];
    const marcas = cats.map(() => '?').join(',');
    const r = await env.DB.prepare(
      `SELECT s.casa, s.estado, s.escalado, sv.nombre_interno FROM solicitudes s
         JOIN servicios sv ON sv.clave = s.servicio
        WHERE sv.categoria IN (${marcas}) AND s.estado NOT IN ('finalizado','cancelado')
        ORDER BY s.creada_en ASC`
    ).bind(...cats).all();
    const abiertas = r.results || [];
    const sinTomar = abiertas.filter((s) => ['recibido', 'reabierto'].includes(s.estado));
    const primera = sinTomar[0] || abiertas[0];

    const aviso = primera
      ? {
          titulo: primera.escalado
            ? `Sin atender · casa ${Number(primera.casa)}`
            : `Casa ${Number(primera.casa)} · ${primera.nombre_interno}`,
          cuerpo: sinTomar.length > 1
            ? `Hay ${sinTomar.length} pedidos esperando.`
            : 'Tocá para tomarlo.',
          url: '/personal/tablero',
        }
      : { titulo: 'Skyblue', cuerpo: 'Todo al día.', url: '/personal/tablero' };
    return new Response(JSON.stringify(aviso), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  // 3. Acciones sobre un pedido.
  if (resto[0] === 'pedido' && resto[1] && resto[2] && metodo === 'POST') {
    return accionPedido(request, env, empleado, resto[1], resto[2], ctx);
  }

  // 4. Central: alta y cierre de estadías.
  if (resto[0] === 'central') {
    if (!esJefe) return irA('/personal/tablero');

    if (resto.length === 1 && metodo === 'GET') {
      const p = new URL(request.url).searchParams;
      return html(await P.pantallaCentral(env, empleado, {
        ok: p.get('ok'), error: p.get('error'),
      }));
    }

    if (resto[1] === 'ingreso' && metodo === 'POST') {
      const { casa = '', nombre = '', apellido = '', noches = '1' } = await campos(request);
      const c = normalizarCasa(casa);
      if (!c) return irA('/personal/central?error=Esa+casa+no+existe');
      if (await D.estadiaActiva(env, c)) {
        return irA(`/personal/central?error=La+casa+${Number(c)}+ya+tiene+gente.+Cerrá+la+estadía+anterior+primero.`);
      }
      if (!nombre.trim() || !apellido.trim()) {
        return irA('/personal/central?error=Falta+el+nombre+o+el+apellido');
      }
      const e = await D.activarEstadia(env, { casa: c, nombre, apellido, noches });
      const texto = `Casa ${Number(c)} lista: ${e.titular_nombre} ${e.titular_apellido}, ${e.noches} noches, ${e.incluye_mucama ? 'con parcial diario' : 'sin parcial'}.`;
      return irA('/personal/central?ok=' + encodeURIComponent(texto));
    }

    if (resto[1] === 'cerrar' && metodo === 'POST') {
      const { id = '' } = await campos(request);
      const t = D.ahora();
      await env.DB.prepare(`UPDATE estadias SET estado = 'cerrada', cerrada_en = ? WHERE id = ?`).bind(t, id).run();
      await env.DB.prepare(
        `UPDATE solicitudes SET estado = 'cancelado', actualizada_en = ?
          WHERE estadia_id = ? AND estado NOT IN ('finalizado','cancelado')`
      ).bind(t, id).run();
      await D.revocarSesiones(env, id);
      return irA('/personal/central?ok=' + encodeURIComponent('Estadía cerrada. El QR de esa casa vuelve a pedir nombre.'));
    }
  }

  // 5. Avisos del hotel.
  if (resto[0] === 'aviso') {
    if (!esJefe) return irA('/personal/tablero');

    if (resto.length === 1 && metodo === 'GET') {
      return html(await P.pantallaAviso(env, empleado, {
        ok: new URL(request.url).searchParams.get('ok') === '1',
      }));
    }

    if (resto.length === 1 && metodo === 'POST') {
      const { titulo = '', cuerpo = '', horas = '24' } = await campos(request);
      if (!titulo.trim() || !cuerpo.trim()) return irA('/personal/aviso');
      const h = Math.min(336, Math.max(1, Number(horas) || 24));
      await env.DB.prepare(
        `INSERT INTO avisos (id, titulo, cuerpo, publicado_por, publicado_en, vence_en, notificar)
         VALUES (?,?,?,?,?,?,1)`
      ).bind(D.id(), titulo.trim().slice(0, 120), cuerpo.trim().slice(0, 1200), empleado.id,
             D.ahora(), new Date(Date.now() + h * 3600000).toISOString()).run();
      return irA('/personal/aviso?ok=1');
    }

    if (resto[1] === 'bajar' && metodo === 'POST') {
      const { id = '' } = await campos(request);
      await env.DB.prepare('UPDATE avisos SET vence_en = ? WHERE id = ?').bind(D.ahora(), id).run();
      return irA('/personal/aviso');
    }
  }

  // 6. Buzón de sugerencias: solo el dueño.
  if (resto[0] === 'sugerencias' && metodo === 'GET') {
    if (!esJefe) return irA('/personal/tablero');
    return html(await P.pantallaBuzon(env, empleado));
  }

  return noEncontrado();
}

// Los cuatro movimientos de un pedido: tomarlo, llegar, terminar, cancelar.
async function accionPedido(request, env, empleado, solicitudId, accion, ctx) {
  const s = await env.DB.prepare(
    `SELECT s.*, sv.min_resolucion FROM solicitudes s
       JOIN servicios sv ON sv.clave = s.servicio
      WHERE s.id = ?`
  ).bind(solicitudId).first();
  if (!s) return irA('/personal/tablero');
  if (['finalizado', 'cancelado'].includes(s.estado)) return irA('/personal/tablero');

  const t = D.ahora();

  if (accion === 'tomar') {
    const { eta = '0' } = await campos(request);
    const minutos = [0, 15, 30, 60].includes(Number(eta)) ? Number(eta) : 0;
    // El reloj de resolución arranca recién cuando alguien se hace cargo.
    const venceResolucion = s.min_resolucion
      ? new Date(Date.now() + (minutos + s.min_resolucion) * 60000).toISOString()
      : null;
    await env.DB.prepare(
      `UPDATE solicitudes SET estado = 'tomado', tomado_por = ?, tomado_en = ?,
              eta_minutos = ?, eta_avisada_en = ?, vence_resolucion_en = ?,
              escalado = 0, escalado_en = NULL, actualizada_en = ?
        WHERE id = ?`
    ).bind(empleado.id, t, minutos, t, venceResolucion, t, s.id).run();
    await D.registrarEvento(env, { solicitudId: s.id, anterior: s.estado, nuevo: 'tomado', empleadoId: empleado.id });
    if (s.huesped_quiere_aviso) ctx?.waitUntil(Push.avisarHuesped(env, s.estadia_id));
    return irA('/personal/tablero');
  }

  if (accion === 'empezar') {
    await env.DB.prepare(
      `UPDATE solicitudes SET estado = 'en_proceso', en_proceso_en = ?, actualizada_en = ? WHERE id = ?`
    ).bind(t, t, s.id).run();
    await D.registrarEvento(env, { solicitudId: s.id, anterior: s.estado, nuevo: 'en_proceso', empleadoId: empleado.id });
    return irA('/personal/tablero');
  }

  if (accion === 'terminar') {
    await env.DB.prepare(
      `UPDATE solicitudes SET estado = 'finalizado', finalizado_por = ?, finalizado_en = ?,
              escalado = 0, actualizada_en = ? WHERE id = ?`
    ).bind(empleado.id, t, t, s.id).run();
    await D.registrarEvento(env, { solicitudId: s.id, anterior: s.estado, nuevo: 'finalizado', empleadoId: empleado.id });
    if (s.huesped_quiere_aviso) ctx?.waitUntil(Push.avisarHuesped(env, s.estadia_id));
    return irA('/personal/tablero');
  }

  if (accion === 'cancelar' && ['admin', 'recepcion'].includes(empleado.rol)) {
    await env.DB.prepare(
      `UPDATE solicitudes SET estado = 'cancelado', actualizada_en = ? WHERE id = ?`
    ).bind(t, s.id).run();
    await D.registrarEvento(env, { solicitudId: s.id, anterior: s.estado, nuevo: 'cancelado', empleadoId: empleado.id });
    return irA('/personal/tablero');
  }

  return irA('/personal/tablero');
}

// ------------------------------------------------------------- el huésped
async function rutasHuesped(request, env, partes, metodo, ctx) {
  const casa = normalizarCasa(partes[1] || '');
  if (!casa) return noEncontrado();
  const resto = partes.slice(2);
  const base = `/casa/${casa}`;

  // 1. Entrar: nombre y apellido contra la estadía activa de esa casa.
  if (resto[0] === 'entrar' && metodo === 'POST') {
    const { nombre = '', apellido = '' } = await campos(request);
    const estadia = await D.estadiaActiva(env, casa);

    if (!estadia) {
      return html(await H.pantallaIngreso(env, casa, {
        error: 'Todavía no tenemos tu reserva cargada en el sistema. Escribinos por WhatsApp y lo resolvemos en un minuto.',
      }));
    }
    if (D.normalizar(`${nombre} ${apellido}`) !== estadia.identidad) {
      return html(await H.pantallaIngreso(env, casa, {
        error: 'Ese nombre no coincide con la reserva de este apartamento. Escribilo como figura en la reserva, o avisanos por WhatsApp.',
      }));
    }
    if (estadia.estado !== 'activa') {
      return html(await H.pantallaIngreso(env, casa, {
        error: 'Esta estadía ya está cerrada. Si seguís en el apartamento, avisanos por WhatsApp.',
      }));
    }

    const token = await D.crearSesion(env, estadia.id);
    return irA(base, cookieSesion(casa, token));
  }

  // 2. Todo lo demás exige sesión. Sin sesión: pantalla de ingreso.
  const estadia = await D.sesionDe(request, env, casa);
  if (!estadia) {
    if (metodo !== 'GET') return irA(base);
    return html(await H.pantallaIngreso(env, casa));
  }

  // 3. Inicio.
  if (resto.length === 0 && metodo === 'GET') {
    return html(await H.pantallaInicio(env, estadia));
  }

  // 4. Avisos del hotel.
  if (resto[0] === 'avisos' && resto.length === 1 && metodo === 'GET') {
    return html(await H.pantallaAvisos(env, estadia));
  }

  // 5. Sugerencias: las lee el dueño.
  if (resto[0] === 'sugerencias' && resto.length === 1) {
    if (metodo === 'GET') {
      const enviada = new URL(request.url).searchParams.get('ok') === '1';
      return html(await H.pantallaSugerencias(env, estadia, { enviada }));
    }
    if (metodo === 'POST') {
      const { tipo = 'idea', texto = '' } = await campos(request);
      const limpio = texto.trim();
      if (!limpio) return irA(`${base}/sugerencias`);
      await env.DB.prepare(
        `INSERT INTO sugerencias (id, estadia_id, casa, tipo, texto, creada_en) VALUES (?,?,?,?,?,?)`
      ).bind(D.id(), estadia.id, casa, tipo === 'algo_mal' ? 'algo_mal' : 'idea',
             limpio.slice(0, 4000), D.ahora()).run();
      return irA(`${base}/sugerencias?ok=1`);
    }
  }

  // 6. Avisar la salida: cierra la estadía y corta el acceso al link.
  if (resto[0] === 'salida' && resto.length === 1) {
    if (metodo === 'GET') return html(await H.pantallaSalida(env, estadia));
    if (metodo === 'POST') {
      const t = D.ahora();
      await env.DB.prepare(
        `UPDATE estadias SET estado = 'salida_avisada', salida_avisada_en = ? WHERE id = ?`
      ).bind(t, estadia.id).run();
      // El pedido que quedó abierto se cancela: ya no hay nadie en la casa.
      await env.DB.prepare(
        `UPDATE solicitudes SET estado = 'cancelado', actualizada_en = ?
          WHERE estadia_id = ? AND estado NOT IN ('finalizado','cancelado')`
      ).bind(t, estadia.id).run();
      await D.revocarSesiones(env, estadia.id);
      const cuerpo = await H.pantallaSalida(env, estadia, { hecho: true });
      return new Response(cuerpo, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'set-cookie': cookieBorrada(casa),
        },
      });
    }
  }

  // 6.b El celular del huésped pide que le avisemos.
  if (resto[0] === 'push' && metodo === 'POST') {
    let sub = null;
    try { sub = await request.json(); } catch (e) { /* nada */ }
    const ok = await Push.guardarSuscripcion(env, {
      duenioTipo: 'huesped', duenioId: estadia.id, sub,
    });
    return new Response(JSON.stringify({ ok }), { headers: { 'content-type': 'application/json' } });
  }

  // 6.c Qué decirle al huésped cuando le golpeamos la puerta.
  if (resto[0] === 'aviso-push' && metodo === 'GET') {
    const s = await env.DB.prepare(
      `SELECT s.*, sv.nombre_huesped FROM solicitudes s
         JOIN servicios sv ON sv.clave = s.servicio
        WHERE s.estadia_id = ? AND s.estado <> 'cancelado'
        ORDER BY s.actualizada_en DESC LIMIT 1`
    ).bind(estadia.id).first();

    const aviso = s
      ? { titulo: 'Skyblue Park', cuerpo: `${s.nombre_huesped}: ${H.textoEstado(s).toLowerCase()}.`, url: `${base}/pedido/${s.id}` }
      : { titulo: 'Skyblue Park', cuerpo: 'Hay un aviso nuevo del hotel.', url: `${base}/avisos` };
    return new Response(JSON.stringify(aviso), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  // 7. Estado de un pedido.
  if (resto[0] === 'pedido' && resto[1] && metodo === 'GET') {
    const s = await env.DB.prepare(
      `SELECT s.*, sv.nombre_huesped FROM solicitudes s
         JOIN servicios sv ON sv.clave = s.servicio
        WHERE s.id = ? AND s.estadia_id = ?`
    ).bind(resto[1], estadia.id).first();
    if (!s) return irA(base);
    return html(await H.pantallaPedido(env, estadia, s));
  }

  // 8. Pedir un servicio.
  if (CATEGORIAS.includes(resto[0]) && resto.length === 1) {
    const categoria = resto[0];
    if (categoria === 'limpieza' && !estadia.incluye_mucama) return irA(base);

    if (metodo === 'GET') return html(await H.pantallaCategoria(env, estadia, categoria));

    if (metodo === 'POST') {
      const { servicio = '', detalles = '', aviso = '' } = await campos(request);
      const sv = await D.servicio(env, servicio);
      if (!sv || sv.categoria !== categoria) return irA(`${base}/${categoria}`);

      // Fuera de horario no se toma el pedido: el huésped va por WhatsApp.
      const h = await D.horario(env, categoria);
      if (!h.abierto && sv.prioridad !== 'urgente') return irA(`${base}/${categoria}`);

      // Si ya hay un pedido igual abierto, no se duplica: se muestra el que hay.
      const abierto = await env.DB.prepare(
        `SELECT id FROM solicitudes
          WHERE estadia_id = ? AND servicio = ? AND estado NOT IN ('finalizado','cancelado')
          ORDER BY creada_en DESC LIMIT 1`
      ).bind(estadia.id, sv.clave).first();
      if (abierto) return irA(`${base}/pedido/${abierto.id}`);

      const nueva = await D.crearSolicitud(env, {
        estadia,
        servicioClave: sv.clave,
        detalles,
        quiereAviso: aviso === '1',
      });
      // El celular del sector suena ahora, sin hacer esperar al huésped.
      ctx?.waitUntil(Push.avisarSector(env, sv.sector));
      return irA(`${base}/pedido/${nueva.id}`);
    }
  }

  return noEncontrado();
}
