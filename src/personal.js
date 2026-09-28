// Skyblue Servicios · pantallas del personal
// Acá se usa SIEMPRE el nombre interno del servicio y "casa", no "apartamento".

import { C, pagina, esc, WORDMARK } from './marca.js';
import * as D from './datos.js';
import { VAPID_PUBLICA } from './push.js';

const ROLES = {
  admin:          { titulo: 'Central',       categorias: ['limpieza', 'mantenimiento', 'recepcion'] },
  recepcion:      { titulo: 'Recepción',     categorias: ['limpieza', 'mantenimiento', 'recepcion'] },
  mucama:         { titulo: 'Limpieza',      categorias: ['limpieza'] },
  mantenimiento:  { titulo: 'Mantenimiento', categorias: ['mantenimiento'] },
};

export const ETAS = [
  { min: 0,  texto: 'ENSEGUIDA VAMOS' },
  { min: 15, texto: '15 MINUTOS' },
  { min: 30, texto: '30 MINUTOS' },
  { min: 60, texto: '1 HORA' },
];

function hora(iso) {
  return iso ? new Date(iso).toLocaleTimeString('es-UY', {
    timeZone: 'America/Montevideo', hour12: false, hour: '2-digit', minute: '2-digit',
  }) : '';
}

function haceCuanto(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}

function encabezado(empleado, { volverA = null, titulo = null } = {}) {
  const atras = volverA
    ? `<a href="${esc(volverA)}" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin-left:-12px">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${C.arena}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
       </a>` : '';
  return `<div class="fila" style="padding:16px 22px;border-bottom:1px solid ${C.filete};background:${C.navyPersonal};position:sticky;top:0;z-index:5">
    ${atras}
    <div class="crece">
      <img src="${WORDMARK}" alt="SKYBLUE PARK" width="104" height="8" style="display:block;opacity:.85">
      <div style="margin-top:5px;font-size:12.5px;font-weight:500;color:${C.dorado}">${esc(titulo || ROLES[empleado.rol]?.titulo || 'Personal')}</div>
    </div>
    <a href="/personal/salir" style="font-size:10.5px;letter-spacing:.16em;color:${C.tenue}">SALIR</a>
  </div>`;
}

// ---------------------------------------------------------------- ingreso
export async function pantallaLogin(env, { error = null, usuario = '' } = {}) {
  const r = await env.DB.prepare(
    'SELECT usuario, nombre, rol FROM empleados WHERE activo = 1 ORDER BY rol, nombre'
  ).all();
  const gente = r.results || [];

  const cuerpo = `
  <div style="padding:52px 30px 0;display:flex;flex-direction:column;align-items:center;gap:16px">
    <img src="${WORDMARK}" alt="SKYBLUE PARK" width="210" height="16" style="display:block">
    <div style="width:48px;height:1px;background:${C.dorado}"></div>
    <div style="font-size:10px;letter-spacing:.3em;color:${C.apagado};padding-left:.3em">PERSONAL</div>
  </div>

  ${error ? `<div style="margin:26px 30px 0;padding:13px 15px;background:#2A1A1C;border-left:2px solid ${C.alerta};font-size:13.5px;line-height:1.5;color:#E8CFCB">${esc(error)}</div>` : ''}

  <form method="post" action="/personal" style="padding:34px 30px 0;display:flex;flex-direction:column;gap:20px">
    <div style="display:flex;flex-direction:column;gap:9px">
      <div class="kicker">QUIÉN SOS</div>
      <div style="display:flex;flex-wrap:wrap;gap:9px">
        ${gente.map((g, i) => `
        <label style="flex:1 1 calc(50% - 5px);display:flex;align-items:center;justify-content:center;min-height:58px;padding:12px;
                      background:${C.superficie};border:1px solid ${C.filete};border-radius:2px;cursor:pointer;font-size:16px">
          <input type="radio" name="usuario" value="${esc(g.usuario)}" ${(usuario ? usuario === g.usuario : i === 0) ? 'checked' : ''}
                 style="width:18px;height:18px;accent-color:${C.dorado};margin-right:11px">
          ${esc(g.nombre)}
        </label>`).join('')}
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:9px">
      <label class="kicker" for="pin">TU CLAVE</label>
      <input id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required
             style="font-size:26px;letter-spacing:.5em;text-align:center;padding:16px">
    </div>

    <button class="btn" type="submit">ENTRAR</button>
  </form>

  <div class="espaciador"></div>
  <div style="padding:0 30px 34px;font-size:12px;line-height:1.55;color:${C.tenue}">
    Si te olvidaste la clave, pedísela a Gabriel. Después de 5 intentos fallidos el usuario se bloquea 10 minutos.
  </div>`;
  return pagina({ titulo: 'Personal', cuerpo, fondo: C.navyPersonal });
}

// --------------------------------------------------------------- tablero
export async function pantallaTablero(env, empleado) {
  const cats = ROLES[empleado.rol]?.categorias || [];
  const marcas = cats.map(() => '?').join(',');

  const r = await env.DB.prepare(
    `SELECT s.*, sv.nombre_interno, sv.categoria, sv.sector, sv.min_resolucion,
            e.titular_nombre, e.titular_apellido, e.noches,
            emp.nombre AS tomado_nombre
       FROM solicitudes s
       JOIN servicios sv ON sv.clave = s.servicio
       JOIN estadias  e  ON e.id = s.estadia_id
       LEFT JOIN empleados emp ON emp.id = s.tomado_por
      WHERE sv.categoria IN (${marcas})
        AND s.estado NOT IN ('finalizado','cancelado')
      ORDER BY s.escalado DESC,
               CASE s.prioridad WHEN 'urgente' THEN 0 ELSE 1 END,
               s.creada_en ASC`
  ).bind(...cats).all();
  const abiertas = r.results || [];

  const t = await env.DB.prepare(
    `SELECT s.casa, sv.nombre_interno, s.finalizado_en, emp.nombre AS quien
       FROM solicitudes s
       JOIN servicios sv ON sv.clave = s.servicio
       LEFT JOIN empleados emp ON emp.id = s.finalizado_por
      WHERE s.estado = 'finalizado' AND sv.categoria IN (${marcas})
        AND s.finalizado_en > datetime('now','-8 hours')
      ORDER BY s.finalizado_en DESC LIMIT 8`
  ).bind(...cats).all();
  const cerradas = t.results || [];

  const esJefe = ['admin', 'recepcion'].includes(empleado.rol);

  const cuerpo = `
  ${encabezado(empleado)}

  <div style="padding:20px 22px 0">
    <div class="fila">
      <div class="crece">
        <div class="serif" style="font-size:30px;font-weight:300;line-height:1.05">Hola, ${esc(empleado.nombre)}.</div>
        <div style="margin-top:5px;font-size:13px;color:${C.apagado}">
          ${abiertas.length ? `${abiertas.length} pedido${abiertas.length > 1 ? 's' : ''} sin terminar` : 'No hay pedidos pendientes'}
        </div>
      </div>
      <div id="campana" style="font-size:11px;color:${C.tenue}"></div>
    </div>
  </div>

  <div id="banda-avisos" style="display:none;margin:18px 22px 0;padding:15px 16px;background:${C.superficie};border-left:3px solid ${C.aviso}">
    <div style="font-size:14px;line-height:1.55;color:#E8D6B2">
      Este celular todavía no suena cuando entra un pedido.
    </div>
    <button id="activar-avisos" class="btn" style="margin-top:12px;min-height:50px;padding:15px;font-size:11px">ACTIVAR LOS AVISOS</button>
    <div id="ayuda-avisos" style="margin-top:10px;font-size:12px;line-height:1.55;color:${C.apagado}"></div>
  </div>

  <div id="banda-probar" style="display:none;padding:14px 22px 0">
    <button id="probar-aviso" class="btn btn-sec" style="min-height:42px;padding:12px;font-size:10px;letter-spacing:.16em;color:${C.tenue}">PROBAR EL AVISO EN ESTE CELULAR</button>
    <div id="resultado-probar" style="margin-top:8px;font-size:12px;color:${C.apagado}"></div>
  </div>

  ${esJefe ? `
  <div style="padding:18px 22px 0;display:flex;gap:9px">
    <a class="btn btn-sec" style="font-size:10px;letter-spacing:.14em;min-height:46px;padding:14px 8px" href="/personal/central">CENTRAL</a>
    <a class="btn btn-sec" style="font-size:10px;letter-spacing:.14em;min-height:46px;padding:14px 8px" href="/personal/aviso">AVISO</a>
    <a class="btn btn-sec" style="font-size:10px;letter-spacing:.14em;min-height:46px;padding:14px 8px" href="/personal/sugerencias">BUZÓN</a>
  </div>` : ''}

  <div style="padding:20px 22px 0;display:flex;flex-direction:column;gap:13px">
    ${abiertas.length ? abiertas.map((s) => tarjeta(s, empleado)).join('')
      : `<div style="padding:30px 20px;background:${C.superficie};text-align:center;font-size:14px;line-height:1.6;color:${C.apagado}">
           Todo al día.<br>Cuando un huésped pida algo, aparece acá y suena.
         </div>`}
  </div>

  ${cerradas.length ? `
  <div style="padding:30px 22px 0">
    <div class="kicker">TERMINADO HOY</div>
    <div style="margin-top:10px;display:flex;flex-direction:column;gap:1px">
      ${cerradas.map((c) => `
      <div class="fila" style="padding:11px 0;border-bottom:1px solid ${C.fileteSuave};font-size:13px;color:${C.apagado}">
        <div class="crece">casa ${esc(String(Number(c.casa)))} · ${esc(c.nombre_interno)}</div>
        <div style="font-size:12px;color:${C.tenue}">${esc(c.quien || '')} ${hora(c.finalizado_en)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="espaciador"></div>
  <div style="padding:26px"></div>

  <script>
  // El tablero se refresca solo. Si aparece un pedido nuevo, suena.
  (function () {
    var abiertos = ${abiertas.length};
    var previo = Number(localStorage.getItem('sk_abiertos') || '0');
    localStorage.setItem('sk_abiertos', String(abiertos));
    if (abiertos > previo) sonar();
    function sonar() {
      try {
        var a = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.22].forEach(function (t) {
          var o = a.createOscillator(), g = a.createGain();
          o.type = 'sine'; o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, a.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.35, a.currentTime + t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.18);
          o.connect(g); g.connect(a.destination);
          o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2);
        });
        if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
      } catch (e) {}
    }
    setTimeout(function () { location.reload(); }, 20000);
  })();
  </script>

  ${guionPush()}`;
  return pagina({ titulo: 'Tablero', cuerpo, fondo: C.navyPersonal });
}

// El celular solo suena si el empleado instaló la app y dio permiso.
// En iPhone el permiso NO existe hasta que la app está en la pantalla de inicio:
// por eso el texto explica ese paso en lugar de fallar en silencio.
function guionPush() {
  return `<script>
(function () {
  var banda = document.getElementById('banda-avisos');
  var boton = document.getElementById('activar-avisos');
  var ayuda = document.getElementById('ayuda-avisos');
  if (!banda) return;

  var instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var iphone = /iP(hone|ad|od)/.test(navigator.userAgent);
  var sirve = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  if (iphone && !instalada) {
    banda.style.display = 'block';
    boton.style.display = 'none';
    ayuda.innerHTML = 'En iPhone hay que agregar la app a la pantalla de inicio: toc\\u00e1 el bot\\u00f3n de compartir abajo y despu\\u00e9s <b>Agregar a inicio</b>. Abrila desde ah\\u00ed y va a aparecer el bot\\u00f3n para activar.';
    return;
  }
  if (!sirve) { banda.style.display = 'none'; return; }
  if (Notification.permission === 'granted') {
    var p = document.getElementById('banda-probar');
    if (p) p.style.display = 'block';
    registrar();
    return;
  }
  if (Notification.permission === 'denied') {
    banda.style.display = 'block';
    boton.style.display = 'none';
    ayuda.textContent = 'Los avisos est\\u00e1n bloqueados en este celular. Hay que permitirlos desde la configuraci\\u00f3n del navegador.';
    return;
  }

  banda.style.display = 'block';
  boton.addEventListener('click', function () {
    boton.disabled = true; boton.textContent = 'ACTIVANDO...';
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') return registrar();
      boton.disabled = false; boton.textContent = 'ACTIVAR LOS AVISOS';
      ayuda.textContent = 'No se dio el permiso. Sin eso el celular no suena.';
    });
  });

  function llave(base64) {
    var s = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }

  function registrar() {
    navigator.serviceWorker.register('/sw-personal.js', { scope: '/personal/' })
      .then(function (reg) { return navigator.serviceWorker.ready.then(function () { return reg; }); })
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) {
          return s || reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: llave(${JSON.stringify(VAPID_PUBLICA)}),
          });
        });
      })
      .then(function (sub) {
        return fetch('/personal/push', {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sub),
        });
      })
      .then(function () {
        banda.style.display = 'none';
        var probar = document.getElementById('banda-probar');
        if (probar) probar.style.display = 'block';
      })
      .catch(function (e) {
        banda.style.display = 'block';
        boton.disabled = false; boton.textContent = 'PROBAR DE NUEVO';
        ayuda.textContent = 'No se pudo activar: ' + e.message;
      });
  }

  var probar = document.getElementById('probar-aviso');
  var res = document.getElementById('resultado-probar');
  if (probar) probar.addEventListener('click', function () {
    probar.disabled = true; res.textContent = 'Mandando...';
    fetch('/personal/push/probar', { method: 'POST', credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        res.textContent = d.enviados
          ? 'Mandado. Si no suena en unos segundos, revisá los avisos en la configuraci\\u00f3n del celular.'
          : 'No hay ning\\u00fan celular registrado para vos todav\\u00eda.';
        probar.disabled = false;
      })
      .catch(function () { res.textContent = 'No se pudo mandar.'; probar.disabled = false; });
  });
})();
</script>`;
}

// Una tarjeta por pedido, con los botones del momento.
function tarjeta(s, empleado) {
  const urgente = s.prioridad === 'urgente';
  const borde = s.escalado ? C.alerta : urgente ? C.aviso : C.dorado;
  const base = `/personal/pedido/${esc(s.id)}`;

  let acciones = '';
  if (s.estado === 'recibido' || s.estado === 'reabierto') {
    acciones = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
      ${ETAS.map((e, i) => `
      <form method="post" action="${base}/tomar" style="flex:1 1 ${i === 0 ? '100%' : 'calc(33.33% - 6px)'}">
        <input type="hidden" name="eta" value="${e.min}">
        <button class="btn" style="min-height:52px;padding:15px 4px;font-size:${i === 0 ? '11.5px' : '10.5px'};letter-spacing:.12em;
          ${i === 0 ? '' : `background:${C.superficieAlta};color:${C.champan};border:1px solid ${C.doradoApagado}`}">${e.texto}</button>
      </form>`).join('')}
    </div>`;
  } else if (s.estado === 'tomado' || s.estado === 'en_camino') {
    acciones = `
    <div style="display:flex;gap:8px;margin-top:14px">
      <form method="post" action="${base}/empezar" class="crece">
        <button class="btn" style="min-height:52px;padding:16px;font-size:11.5px">ESTOY EN LA CASA</button>
      </form>
    </div>`;
  } else if (s.estado === 'en_proceso') {
    acciones = `
    <div style="display:flex;gap:8px;margin-top:14px">
      <form method="post" action="${base}/terminar" class="crece">
        <button class="btn" style="min-height:52px;padding:16px;font-size:11.5px;background:${C.ok};color:#0B1F17">TERMINÉ</button>
      </form>
    </div>`;
  }

  const quien = s.tomado_nombre
    ? `<div style="margin-top:7px;font-size:12.5px;color:${C.ok}">Lo tomó ${esc(s.tomado_nombre)}${s.eta_minutos !== null ? ` · dijo ${s.eta_minutos === 0 ? 'enseguida' : s.eta_minutos + ' min'}` : ''}</div>`
    : '';

  const cancelar = ['admin', 'recepcion'].includes(empleado.rol)
    ? `<form method="post" action="${base}/cancelar" style="margin-top:9px">
         <button class="btn btn-sec" style="min-height:42px;padding:12px;font-size:10px;letter-spacing:.14em;color:${C.tenue}">CANCELAR PEDIDO</button>
       </form>` : '';

  return `
  <div style="padding:16px 17px;background:${C.superficie};border-left:3px solid ${borde}">
    <div class="fila" style="align-items:baseline">
      <div class="crece">
        <div style="font-size:11px;letter-spacing:.2em;color:${s.escalado ? C.alerta : C.apagado}">
          CASA ${esc(String(Number(s.casa)))}${urgente ? ' · URGENTE' : ''}${s.escalado ? ' · SIN ATENDER' : ''}
        </div>
        <div class="serif" style="margin-top:4px;font-size:27px;font-weight:400;line-height:1.1;color:${C.marfil}">${esc(s.nombre_interno)}</div>
      </div>
      <div style="font-size:11.5px;color:${C.tenue};white-space:nowrap">${haceCuanto(s.creada_en)}</div>
    </div>

    <div style="margin-top:7px;font-size:12.5px;color:${C.apagado}">
      ${esc(s.titular_nombre)} ${esc(s.titular_apellido)} · ${s.noches} noche${s.noches > 1 ? 's' : ''}
    </div>

    ${s.detalles ? `
    <div style="margin-top:11px;padding:11px 13px;background:${C.navyPersonal};border-left:2px solid ${C.filete};
                font-size:13.5px;line-height:1.55;color:${C.arena};white-space:pre-wrap">${esc(s.detalles)}</div>` : ''}

    ${quien}
    ${acciones}
    ${cancelar}
  </div>`;
}

// ---------------------------------------------------------------- central
export async function pantallaCentral(env, empleado, { error = null, ok = null } = {}) {
  const r = await env.DB.prepare(
    `SELECT * FROM estadias WHERE estado IN ('activa','salida_avisada') ORDER BY casa`
  ).all();
  const estadias = r.results || [];
  const porCasa = Object.fromEntries(estadias.map((e) => [e.casa, e]));

  const filas = D.CASAS.map((casa) => {
    const e = porCasa[casa];
    const n = Number(casa);
    if (!e) {
      return `
      <details style="border-bottom:1px solid ${C.fileteSuave}">
        <summary style="display:flex;align-items:center;gap:13px;padding:15px 22px;cursor:pointer;list-style:none">
          <div class="serif" style="font-size:22px;color:${C.tenue};width:30px">${n}</div>
          <div class="crece" style="font-size:13.5px;color:${C.tenue}">Libre · tocá para hacer el ingreso</div>
          <div style="font-size:11px;letter-spacing:.14em;color:${C.doradoApagado}">INGRESAR</div>
        </summary>
        <form method="post" action="/personal/central/ingreso" style="padding:4px 22px 20px;display:flex;flex-direction:column;gap:10px">
          <input type="hidden" name="casa" value="${esc(casa)}">
          <div class="kicker">COMO FIGURA EN LA RESERVA</div>
          <input name="nombre" placeholder="Nombre" required autocomplete="off">
          <input name="apellido" placeholder="Apellido" required autocomplete="off">
          <div class="fila" style="gap:12px">
            <div class="kicker crece">CUÁNTAS NOCHES</div>
            <input name="noches" type="number" min="1" max="60" value="3" required inputmode="numeric"
                   style="width:92px;text-align:center;font-size:19px">
          </div>
          <div style="font-size:12px;line-height:1.5;color:${C.apagado}">De 3 noches en adelante la casa lleva parcial todos los días. La app lo calcula sola.</div>
          <button class="btn" type="submit" style="min-height:50px;padding:15px">DAR DE ALTA</button>
        </form>
      </details>`;
    }
    const salida = e.estado === 'salida_avisada';
    return `
    <div class="fila" style="padding:15px 22px;border-bottom:1px solid ${C.fileteSuave};gap:13px">
      <div class="serif" style="font-size:22px;color:${salida ? C.aviso : C.dorado};width:30px">${n}</div>
      <div class="crece">
        <div style="font-size:14.5px;color:${C.marfil}">${esc(e.titular_nombre)} ${esc(e.titular_apellido)}</div>
        <div style="margin-top:3px;font-size:12px;color:${salida ? C.aviso : C.apagado}">
          ${salida ? 'Avisó la salida · la casa se puede preparar' : `${e.noches} noche${e.noches > 1 ? 's' : ''} · ${e.incluye_mucama ? 'con parcial' : 'sin parcial'}`}
        </div>
      </div>
      <form method="post" action="/personal/central/cerrar">
        <input type="hidden" name="id" value="${esc(e.id)}">
        <button class="btn btn-sec" style="min-height:40px;padding:11px 13px;font-size:10px;letter-spacing:.14em;width:auto;color:${C.tenue}">CERRAR</button>
      </form>
    </div>`;
  }).join('');

  const cuerpo = `
  ${encabezado(empleado, { volverA: '/personal/tablero', titulo: 'Central · casas' })}

  ${ok ? `<div style="margin:18px 22px 0;padding:13px 15px;background:#152A22;border-left:2px solid ${C.ok};font-size:13.5px;color:#CFE5DA">${esc(ok)}</div>` : ''}
  ${error ? `<div style="margin:18px 22px 0;padding:13px 15px;background:#2A1A1C;border-left:2px solid ${C.alerta};font-size:13.5px;color:#E8CFCB">${esc(error)}</div>` : ''}

  <div style="padding:20px 22px 12px">
    <div class="serif" style="font-size:30px;font-weight:300;line-height:1.05">Las 13 casas</div>
    <div style="margin-top:6px;font-size:12.5px;line-height:1.5;color:${C.apagado}">Dar de alta a un huésped es lo único que hay que hacer a mano. Sin eso, el QR de la casa no lo deja entrar.</div>
  </div>

  <div style="border-top:1px solid ${C.filete}">${filas}</div>

  <div class="espaciador"></div>
  <div style="padding:26px"></div>`;
  return pagina({ titulo: 'Central', cuerpo, fondo: C.navyPersonal });
}

// ----------------------------------------------------------------- aviso
export async function pantallaAviso(env, empleado, { ok = false } = {}) {
  const r = await env.DB.prepare(
    `SELECT a.*, e.nombre AS quien FROM avisos a
       LEFT JOIN empleados e ON e.id = a.publicado_por
      ORDER BY a.publicado_en DESC LIMIT 6`
  ).all();
  const previos = r.results || [];
  const vigente = (a) => new Date(a.vence_en) > new Date();

  const cuerpo = `
  ${encabezado(empleado, { volverA: '/personal/tablero', titulo: 'Publicar un aviso' })}

  ${ok ? `<div style="margin:18px 22px 0;padding:13px 15px;background:#152A22;border-left:2px solid ${C.ok};font-size:13.5px;color:#CFE5DA">Publicado. Ya lo ven las 13 casas.</div>` : ''}

  <form method="post" action="/personal/aviso" style="padding:20px 22px 0;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="titulo">TÍTULO</label>
      <input id="titulo" name="titulo" required maxlength="90" placeholder="Corte de agua el jueves de 9 a 11">
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="cuerpo">EL AVISO</label>
      <textarea id="cuerpo" name="cuerpo" rows="5" required maxlength="900" placeholder="Escribilo como se lo dirías en la cara al huésped."></textarea>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="horas">HASTA CUÁNDO SE VE</label>
      <select id="horas" name="horas" style="width:100%;padding:14px 16px;background:${C.superficie};border:1px solid ${C.filete};border-radius:2px">
        <option value="12">12 horas</option>
        <option value="24" selected>Un día</option>
        <option value="72">Tres días</option>
        <option value="168">Una semana</option>
      </select>
    </div>
    <div style="font-size:12px;line-height:1.55;color:${C.apagado}">
      El aviso aparece en la pantalla de todos los huéspedes. Se muestra hasta dos avisos por día: si publicás más, el huésped deja de leerlos.
    </div>
    <button class="btn" type="submit">PUBLICAR</button>
  </form>

  ${previos.length ? `
  <div style="padding:30px 22px 0">
    <div class="kicker">ÚLTIMOS AVISOS</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
      ${previos.map((a) => `
      <div style="padding:13px 15px;background:${C.superficie};border-left:2px solid ${vigente(a) ? C.dorado : C.filete}">
        <div class="fila">
          <div class="crece" style="font-size:14px;color:${vigente(a) ? C.marfil : C.tenue}">${esc(a.titulo)}</div>
          ${vigente(a) ? `<form method="post" action="/personal/aviso/bajar"><input type="hidden" name="id" value="${esc(a.id)}">
            <button class="btn btn-sec" style="width:auto;min-height:34px;padding:9px 11px;font-size:9.5px;letter-spacing:.14em;color:${C.tenue}">BAJAR</button></form>` : ''}
        </div>
        <div style="margin-top:5px;font-size:11.5px;color:${C.tenue}">${esc(a.quien || '')} · ${hora(a.publicado_en)} · ${vigente(a) ? 'en pantalla' : 'vencido'}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="espaciador"></div>
  <div style="padding:26px"></div>`;
  return pagina({ titulo: 'Aviso', cuerpo, fondo: C.navyPersonal });
}

// ------------------------------------------------------------ sugerencias
export async function pantallaBuzon(env, empleado) {
  const r = await env.DB.prepare(
    `SELECT s.*, e.titular_nombre, e.titular_apellido FROM sugerencias s
       JOIN estadias e ON e.id = s.estadia_id
      ORDER BY s.creada_en DESC LIMIT 60`
  ).all();
  const items = r.results || [];

  const cuerpo = `
  ${encabezado(empleado, { volverA: '/personal/tablero', titulo: 'Buzón del dueño' })}

  <div style="padding:20px 22px 0">
    <div class="serif" style="font-size:30px;font-weight:300;line-height:1.05">Lo que escriben</div>
    <div style="margin-top:6px;font-size:12.5px;color:${C.apagado}">Esto no lo ve nadie más. Si algo se puede arreglar antes de que se vayan, se arregla.</div>
  </div>

  <div style="padding:20px 22px 0;display:flex;flex-direction:column;gap:12px">
    ${items.length ? items.map((s) => `
    <div style="padding:15px 16px;background:${C.superficie};border-left:3px solid ${s.tipo === 'algo_mal' ? C.alerta : C.dorado}">
      <div class="fila">
        <div class="crece" style="font-size:11px;letter-spacing:.18em;color:${s.tipo === 'algo_mal' ? C.alerta : C.doradoApagado}">
          ${s.tipo === 'algo_mal' ? 'ALGO NO ESTUVO BIEN' : 'IDEA'} · CASA ${esc(String(Number(s.casa)))}
        </div>
        <div style="font-size:11.5px;color:${C.tenue}">${haceCuanto(s.creada_en)}</div>
      </div>
      <div style="margin-top:10px;font-size:14.5px;line-height:1.6;color:${C.marfil};white-space:pre-wrap">${esc(s.texto)}</div>
      <div style="margin-top:10px;font-size:12px;color:${C.apagado}">${esc(s.titular_nombre)} ${esc(s.titular_apellido)}</div>
    </div>`).join('')
    : `<div style="padding:30px 20px;background:${C.superficie};text-align:center;font-size:14px;color:${C.apagado}">Todavía no escribió nadie.</div>`}
  </div>

  <div class="espaciador"></div>
  <div style="padding:26px"></div>`;
  return pagina({ titulo: 'Buzón', cuerpo, fondo: C.navyPersonal });
}
