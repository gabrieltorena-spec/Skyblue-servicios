// Skyblue Servicios · pantallas del huésped

import { C, pagina, encabezadoHuesped, esc, PLUMA_VERDE, WORDMARK } from './marca.js';
import * as D from './datos.js';
import { VAPID_PUBLICA } from './push.js';

const CATEGORIAS = [
  { clave: 'limpieza',      numeral: 'I',   titulo: 'Servicio de limpieza' },
  { clave: 'mantenimiento', numeral: 'II',  titulo: 'Mantenimiento' },
  { clave: 'recepcion',     numeral: 'III', titulo: 'Recepción' },
];

function saludo() {
  const h = Number(new Date().toLocaleString('es-UY', {
    timeZone: 'America/Montevideo', hour12: false, hour: '2-digit',
  }));
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function rangoTexto(h) {
  if (h.desde === '00:00' && (h.hasta === '00:00' || h.hasta === '23:59')) return 'a toda hora';
  return `${h.desde} a ${h.hasta === '00:00' ? 'medianoche' : h.hasta}`;
}

// ------------------------------------------------------------- ingreso
export async function pantallaIngreso(env, casa, { error = null } = {}) {
  const cuerpo = `
  <div style="padding:58px 34px 0;display:flex;flex-direction:column;align-items:center;gap:20px">
    <img src="${PLUMA_VERDE}" alt="" width="62" height="139" style="display:block">
    <img src="${WORDMARK}" alt="SKYBLUE PARK" width="232" height="17" style="display:block">
    <div style="width:54px;height:1px;background:${C.dorado}"></div>
    <div style="font-size:10px;letter-spacing:.3em;color:${C.apagado};padding-left:.3em">APARTAMENTO ${esc(String(Number(casa)))}</div>
  </div>

  <div style="padding:44px 34px 0">
    <div class="serif" style="font-size:40px;font-weight:300;line-height:1.08">Bienvenidos</div>
    <div style="margin-top:12px;font-size:13.5px;line-height:1.55;color:${C.arena}">Escribí el nombre de quien hizo la reserva para entrar.</div>
  </div>

  ${error ? `<div style="margin:22px 34px 0;padding:13px 15px;background:#2A1A1C;border-left:2px solid ${C.alerta};font-size:13px;line-height:1.5;color:#E8CFCB">${esc(error)}</div>` : ''}

  <form method="post" action="/casa/${esc(casa)}/entrar" style="padding:28px 34px 0;display:flex;flex-direction:column;gap:18px">
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="nombre" style="color:${C.apagado}">NOMBRE</label>
      <input id="nombre" name="nombre" autocomplete="given-name" required>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="apellido" style="color:${C.apagado}">APELLIDO</label>
      <input id="apellido" name="apellido" autocomplete="family-name" required>
    </div>
    <button class="btn" type="submit">ENTRAR</button>
  </form>

  <div class="espaciador"></div>

  <div style="padding:0 34px 34px;display:flex;flex-direction:column;gap:14px">
    <div class="filete"></div>
    <div style="font-size:12.5px;line-height:1.5;color:${C.apagado}">¿No podés entrar? Llamanos o escribinos.</div>
    <div style="display:flex;gap:10px">
      <a class="btn btn-sec" style="letter-spacing:normal;padding-left:13px;font-size:12.5px;min-height:46px;padding-top:13px" href="tel:+59891567200">Llamar</a>
      <a class="btn btn-sec" style="letter-spacing:normal;padding-left:13px;font-size:12.5px;min-height:46px;padding-top:13px" href="https://wa.me/59891567200">WhatsApp</a>
    </div>
  </div>`;
  return pagina({ titulo: `Apartamento ${Number(casa)}`, cuerpo });
}

// --------------------------------------------------------------- inicio
export async function pantallaInicio(env, estadia) {
  const avisos = await D.avisosVigentes(env);
  const enCurso = (await D.solicitudesDeEstadia(env, estadia.id))
    .filter((s) => !['finalizado', 'cancelado'].includes(s.estado));

  const horarios = {};
  for (const c of CATEGORIAS) horarios[c.clave] = await D.horario(env, c.clave);

  const filas = [];
  for (const c of CATEGORIAS) {
    if (c.clave === 'limpieza' && !estadia.incluye_mucama) continue;
    const h = horarios[c.clave];
    const extra = c.clave === 'mantenimiento' ? ' · urgencias a toda hora' : '';
    filas.push(`
      <a href="/casa/${esc(estadia.casa)}/${c.clave}" style="display:flex;align-items:baseline;gap:14px;padding:17px 26px 16px;border-top:1px solid ${C.fileteSuave}">
        <div class="serif" style="font-size:13px;font-weight:500;color:${C.doradoApagado};width:17px;flex-shrink:0">${c.numeral}</div>
        <div class="crece">
          <div class="serif" style="font-size:28px;font-weight:400;line-height:1.05;color:${C.marfil}">${esc(c.titulo)}</div>
          <div style="margin-top:6px;font-size:11.5px;color:${C.apagado}">${rangoTexto(h)}${extra}</div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.doradoApagado}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="align-self:center"><path d="M9 18l6-6-6-6"/></svg>
      </a>`);
  }

  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa) })}

  <div style="padding:24px 26px 0">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.08">${saludo()},<br>${esc(estadia.titular_nombre)}.</div>
  </div>

  ${avisos.length ? `
  <div style="padding:22px 26px 0">
    <a href="/casa/${esc(estadia.casa)}/avisos" style="display:flex;align-items:center;gap:14px;min-height:64px;padding:13px 16px;background:${C.superficie};border-left:2px solid ${C.dorado}">
      <div class="crece">
        <div style="font-size:8.5px;font-weight:500;letter-spacing:.26em;color:${C.dorado}">AVISOS</div>
        <div class="serif" style="margin-top:5px;font-size:20px;font-weight:400;line-height:1.2;color:${C.marfil}">${esc(avisos[0].titulo)}</div>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.apagado}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </a>
  </div>` : ''}

  <div style="padding:30px 0 0">
    <div style="padding:0 26px 12px" class="kicker">PEDIR UN SERVICIO</div>
    ${filas.join('')}
    <a href="/casa/${esc(estadia.casa)}/sugerencias" style="display:flex;align-items:baseline;gap:14px;padding:17px 26px 16px;border-top:1px solid #3E3520;border-bottom:1px solid ${C.fileteSuave}">
      <div style="width:17px;flex-shrink:0"></div>
      <div class="crece">
        <div class="serif" style="font-size:26px;font-weight:400;line-height:1.05;color:${C.marfil}">Sugerencias</div>
        <div style="margin-top:6px;font-size:11.5px;color:${C.dorado}">Las lee Gabriel, el dueño</div>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.doradoApagado}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="align-self:center"><path d="M9 18l6-6-6-6"/></svg>
    </a>
  </div>

  ${enCurso.length ? `
  <div style="padding:22px 26px 0">
    <div class="kicker">EN CURSO</div>
    ${enCurso.slice(0, 2).map((s) => `
    <a href="/casa/${esc(estadia.casa)}/pedido/${esc(s.id)}" style="margin-top:11px;display:flex;align-items:center;gap:14px;padding:14px 16px;background:${C.superficie};border-left:2px solid ${C.ok}">
      <div class="crece">
        <div style="font-size:13.5px;font-weight:400;color:${C.marfil}">${esc(s.nombre_huesped)}</div>
        <div style="margin-top:3px;font-size:12.5px;color:${C.ok}">${textoEstado(s)}</div>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.apagado}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </a>`).join('')}
  </div>` : ''}

  <div class="espaciador"></div>

  <div style="padding:26px 26px 28px">
    <a class="btn btn-sec" style="font-size:10px;letter-spacing:.26em;min-height:48px;padding:15px" href="/casa/${esc(estadia.casa)}/salida">AVISAR MI SALIDA</a>
  </div>`;
  return pagina({ titulo: 'Inicio', cuerpo });
}

export function textoEstado(s) {
  const limpieza = ['limpieza_integral', 'parrillero', 'residuos', 'vajilla', 'toallas'].includes(s.servicio);
  switch (s.estado) {
    case 'recibido':   return 'Recibimos tu pedido';
    case 'tomado':     return etaTexto(s) || 'Ya lo tomó nuestro equipo';
    case 'en_camino':  return etaTexto(s) || 'Estamos yendo a tu apartamento';
    case 'en_proceso': return limpieza ? 'Estamos limpiando tu apartamento' : 'Estamos trabajando en tu pedido';
    case 'finalizado': return limpieza ? 'Tu apartamento ya está limpio' : 'Tu pedido está resuelto';
    case 'cancelado':  return 'Pedido cancelado';
    default:           return 'Recibimos tu pedido';
  }
}

function etaTexto(s) {
  if (s.eta_minutos === null || s.eta_minutos === undefined) return null;
  if (s.eta_minutos === 0)  return 'Enseguida pasamos';
  if (s.eta_minutos === 60) return 'Pasamos en alrededor de una hora';
  return `Pasamos en unos ${s.eta_minutos} minutos`;
}

// ------------------------------------------------------ elegir servicio
export async function pantallaCategoria(env, estadia, categoria) {
  const servicios = await D.serviciosDe(env, categoria);
  const h = await D.horario(env, categoria);
  const cat = CATEGORIAS.find((c) => c.clave === categoria);
  const fuera = !h.abierto;

  const opciones = servicios.map((s, i) => `
    <label style="display:flex;align-items:center;gap:14px;min-height:54px;padding:13px 16px;background:${i === 0 ? C.superficieAlta : C.superficie};border:1px solid ${i === 0 ? C.dorado : C.filete};border-radius:2px;cursor:pointer">
      <input type="radio" name="servicio" value="${esc(s.clave)}" ${i === 0 ? 'checked' : ''} style="width:17px;height:17px;accent-color:${C.dorado};flex-shrink:0">
      <span style="flex-grow:1;font-size:15px;font-weight:${i === 0 ? 500 : 300};color:${C.marfil}">${esc(s.nombre_huesped)}</span>
    </label>`).join('');

  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa), volverA: `/casa/${estadia.casa}` })}

  <div style="padding:24px 26px 0">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.08">${esc(cat.titulo)}</div>
    <div style="margin-top:8px;font-size:11.5px;line-height:1.5;color:${C.apagado}">${rangoTexto(h)}${fuera ? ' · fuera de ese horario, escribinos por WhatsApp' : ''}</div>
  </div>

  ${fuera ? `
  <div style="margin:20px 26px 0;padding:15px 16px;background:${C.superficie};border-left:2px solid ${C.aviso}">
    <div style="font-size:13px;line-height:1.55;color:#E8D6B2">${categoria === 'limpieza'
      ? `El servicio de limpieza es de ${rangoTexto(h)}. Pedilo mañana a partir de las ${h.desde} y lo resolvemos.`
      : `Ahora estamos fuera de horario. Lo vemos a primera hora.`}</div>
    <a class="btn" style="margin-top:12px;min-height:46px;padding:14px;font-size:11px" href="https://wa.me/59891567200">ESCRIBIR POR WHATSAPP</a>
  </div>` : `
  <form method="post" action="/casa/${esc(estadia.casa)}/${esc(categoria)}">
    <div style="padding:20px 26px 0;display:flex;flex-direction:column;gap:8px">
      <div class="kicker">QUÉ NECESITÁS</div>
      ${opciones}
    </div>

    <div style="padding:20px 26px 0;display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="detalles">¿ALGO PARA AVISARNOS?</label>
      <textarea id="detalles" name="detalles" rows="2" placeholder="Por ejemplo: el nene duerme hasta las 11, o dejamos las toallas en el baño."></textarea>
      <div style="font-size:12px;line-height:1.45;color:${C.apagado}">Vamos en el momento. Si necesitás otra cosa, escribilo acá.</div>
    </div>

    <div class="espaciador"></div>

    <div style="padding:16px 26px 26px;display:flex;flex-direction:column;gap:14px">
      <label style="display:flex;align-items:center;gap:13px;padding:13px 15px;background:${C.superficie};font-size:13px;line-height:1.4;color:${C.arena};cursor:pointer">
        <input type="checkbox" name="aviso" value="1" checked style="width:19px;height:19px;accent-color:${C.dorado};flex-shrink:0">
        <span class="crece">Avisame al celular cuando esté listo</span>
      </label>
      <button class="btn" type="submit">ENVIAR PEDIDO</button>
    </div>
  </form>`}`;
  return pagina({ titulo: cat.titulo, cuerpo });
}

// ------------------------------------------------------- estado del pedido
export async function pantallaPedido(env, estadia, solicitud) {
  const pasos = [
    { k: 'recibido',   t: 'Recibimos tu pedido' },
    { k: 'tomado',     t: 'Ya lo tomó nuestro equipo' },
    { k: 'en_proceso', t: etaTexto(solicitud) || 'Estamos yendo a tu apartamento' },
    { k: 'finalizado', t: textoEstado({ ...solicitud, estado: 'finalizado' }) },
  ];
  const orden = ['recibido', 'tomado', 'en_camino', 'en_proceso', 'finalizado'];
  const actual = orden.indexOf(solicitud.estado === 'en_camino' ? 'en_proceso' : solicitud.estado);

  const hora = (iso) => iso
    ? new Date(iso).toLocaleTimeString('es-UY', { timeZone: 'America/Montevideo', hour12: false, hour: '2-digit', minute: '2-digit' })
    : '';

  const linea = pasos.map((p, i) => {
    const idx = orden.indexOf(p.k);
    const hecho = idx < actual, aqui = idx === actual || (p.k === 'en_proceso' && solicitud.estado === 'en_camino');
    const color = hecho || aqui ? C.ok : C.tenue;
    const punto = aqui
      ? `<div style="width:17px;height:17px;margin-left:-3px;border-radius:50%;background:${C.ok};border:4px solid #1D3A30"></div>`
      : hecho
        ? `<div style="width:11px;height:11px;border-radius:50%;background:${C.ok}"></div>`
        : `<div style="width:11px;height:11px;border-radius:50%;border:1.3px solid #4A5870;background:${C.navy}"></div>`;
    return `
    <div style="display:flex;gap:17px">
      <div style="display:flex;flex-direction:column;align-items:center;width:18px">
        ${punto}
        ${i < pasos.length - 1 ? `<div style="flex-grow:1;width:1px;background:${hecho ? '#3D5A4E' : C.filete}"></div>` : ''}
      </div>
      <div class="crece" style="padding-bottom:${i < pasos.length - 1 ? '28px' : '0'}">
        <div class="${aqui ? 'serif' : ''}" style="font-size:${aqui ? '24px' : '14.5px'};font-weight:${aqui ? 500 : 400};line-height:1.15;color:${hecho || aqui ? C.marfil : '#63708A'}">${esc(p.t)}</div>
        ${aqui && solicitud.eta_avisada_en ? `<div style="margin-top:3px;font-size:12px;color:${C.ok}">Avisado a las ${hora(solicitud.eta_avisada_en)}</div>` : ''}
        ${hecho ? `<div style="margin-top:3px;font-size:12px;color:${C.apagado}">${hora(p.k === 'recibido' ? solicitud.creada_en : solicitud.tomado_en)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa), volverA: `/casa/${estadia.casa}` })}

  <div style="padding:28px 28px 0">
    <div class="kicker">TU PEDIDO</div>
    <div class="serif" style="margin-top:10px;font-size:36px;font-weight:300;line-height:1.08">${esc(solicitud.nombre_huesped)}</div>
    <div style="margin-top:8px;font-size:12.5px;color:${C.apagado}">Enviado hoy a las ${hora(solicitud.creada_en)}</div>
  </div>

  <div style="padding:32px 28px 0">${linea}</div>

  <div class="espaciador"></div>

  <div style="padding:0 28px 30px;display:flex;flex-direction:column;gap:14px">
    <div class="filete"></div>
    <div id="ofrecer-aviso" style="display:none">
      <button id="quiero-aviso" class="btn btn-sec" style="font-size:10.5px;letter-spacing:.18em;min-height:48px;padding:15px">AVISARME EN ESTE CELULAR</button>
      <div style="margin-top:8px;font-size:11.5px;line-height:1.5;color:${C.tenue}">Opcional. Si no, mirá esta pantalla o escribinos.</div>
    </div>
    <a class="btn btn-sec" style="font-size:10.5px;letter-spacing:.22em;min-height:48px;padding:15px" href="https://wa.me/59891567200">HABLAR CON RECEPCIÓN</a>
  </div>

  ${solicitud.huesped_quiere_aviso ? guionPushHuesped(estadia.casa) : ''}`;
  return pagina({ titulo: 'Tu pedido', cuerpo, extraHead: refrescar(solicitud) });
}

// Al huésped no se le pide permiso de entrada: se le ofrece, discreto, y solo
// si el celular puede. En iPhone sin instalar no se ofrece nada, no serviría.
function guionPushHuesped(casa) {
  return `<script>
(function () {
  var caja = document.getElementById('ofrecer-aviso');
  var boton = document.getElementById('quiero-aviso');
  if (!caja || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  var instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (/iP(hone|ad|od)/.test(navigator.userAgent) && !instalada) return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'granted') { suscribir(); return; }

  caja.style.display = 'block';
  boton.addEventListener('click', function () {
    boton.disabled = true;
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') return suscribir();
      caja.style.display = 'none';
    });
  });

  function llave(b) {
    var s = (b + '='.repeat((4 - b.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }

  function suscribir() {
    navigator.serviceWorker.register('/sw-huesped.js', { scope: '/casa/${casa}/' })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) {
          return s || reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: llave(${JSON.stringify(VAPID_PUBLICA)}),
          });
        });
      })
      .then(function (sub) {
        return fetch('/casa/${casa}/push', {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(sub),
        });
      })
      .then(function () { caja.style.display = 'none'; })
      .catch(function () { caja.style.display = 'none'; });
  }
})();
</script>`;
}

// La pantalla del pedido se refresca sola mientras el pedido sigue abierto.
function refrescar(s) {
  if (['finalizado', 'cancelado'].includes(s.estado)) return '';
  return '<meta http-equiv="refresh" content="30">';
}

// --------------------------------------------------------------- avisos
export async function pantallaAvisos(env, estadia) {
  const avisos = await D.avisosVigentes(env);
  const fecha = (iso) => new Date(iso).toLocaleString('es-UY', {
    timeZone: 'America/Montevideo', hour12: false,
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa), volverA: `/casa/${estadia.casa}` })}

  <div style="padding:26px 26px 0">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.08">Avisos</div>
    <div style="margin-top:8px;font-size:12.5px;color:${C.apagado}">Novedades del hotel</div>
  </div>

  <div style="padding:26px 26px 0;display:flex;flex-direction:column;gap:14px">
    ${avisos.length ? avisos.map((a) => `
      <div style="padding:17px 18px;background:${C.superficie};border-left:2px solid ${C.dorado}">
        <div class="serif" style="font-size:23px;font-weight:400;line-height:1.15;color:${C.marfil}">${esc(a.titulo)}</div>
        <div style="margin-top:9px;font-size:13.5px;line-height:1.6;color:${C.arena};white-space:pre-wrap">${esc(a.cuerpo)}</div>
        <div style="margin-top:12px;font-size:11px;color:${C.tenue}">${fecha(a.publicado_en)}</div>
      </div>`).join('')
    : `<div style="padding:22px 18px;background:${C.superficie};font-size:13.5px;line-height:1.55;color:${C.apagado}">No hay avisos por ahora. Cuando publiquemos algo, lo vas a ver acá.</div>`}
  </div>

  <div class="espaciador"></div>
  <div style="padding:26px"></div>`;
  return pagina({ titulo: 'Avisos', cuerpo });
}

// ---------------------------------------------------------- sugerencias
export async function pantallaSugerencias(env, estadia, { enviada = false } = {}) {
  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa), volverA: `/casa/${estadia.casa}` })}

  ${enviada ? `
  <div style="padding:56px 30px 0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px">
    <div style="width:52px;height:52px;border-radius:50%;border:1px solid ${C.dorado};display:flex;align-items:center;justify-content:center">
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="${C.dorado}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <div class="serif" style="font-size:32px;font-weight:300;line-height:1.12">Gracias.</div>
    <div style="font-size:13.5px;line-height:1.6;color:${C.arena};max-width:290px">Lo leo yo, personalmente. Si hace falta que te responda, lo hago antes de que te vayas.</div>
    <div style="font-size:12px;letter-spacing:.14em;color:${C.dorado}">GABRIEL · SKYBLUE PARK</div>
    <a class="btn btn-sec" style="margin-top:14px;font-size:10.5px;letter-spacing:.22em;min-height:48px;padding:15px" href="/casa/${esc(estadia.casa)}">VOLVER AL INICIO</a>
  </div>
  <div class="espaciador"></div>`
  : `
  <div style="padding:26px 26px 0">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.08">Sugerencias</div>
    <div style="margin-top:10px;font-size:13.5px;line-height:1.6;color:${C.arena}">Las lee Gabriel, el dueño. No pasa por nadie más. Si algo se puede mejorar, preferimos saberlo mientras estás acá.</div>
  </div>

  <form method="post" action="/casa/${esc(estadia.casa)}/sugerencias">
    <div style="padding:26px 26px 0;display:flex;flex-direction:column;gap:8px">
      <div class="kicker">DE QUÉ SE TRATA</div>
      <label style="display:flex;align-items:center;gap:14px;min-height:54px;padding:13px 16px;background:${C.superficieAlta};border:1px solid ${C.dorado};border-radius:2px;cursor:pointer">
        <input type="radio" name="tipo" value="idea" checked style="width:17px;height:17px;accent-color:${C.dorado};flex-shrink:0">
        <span class="crece" style="font-size:15px;font-weight:500">Una idea para mejorar</span>
      </label>
      <label style="display:flex;align-items:center;gap:14px;min-height:54px;padding:13px 16px;background:${C.superficie};border:1px solid ${C.filete};border-radius:2px;cursor:pointer">
        <input type="radio" name="tipo" value="algo_mal" style="width:17px;height:17px;accent-color:${C.dorado};flex-shrink:0">
        <span class="crece" style="font-size:15px">Algo que no estuvo bien</span>
      </label>
    </div>

    <div style="padding:20px 26px 0;display:flex;flex-direction:column;gap:8px">
      <label class="kicker" for="texto">CONTANOS</label>
      <textarea id="texto" name="texto" rows="6" required placeholder="Escribí con confianza."></textarea>
    </div>

    <div class="espaciador"></div>

    <div style="padding:20px 26px 28px">
      <button class="btn" type="submit">ENVIAR</button>
    </div>
  </form>`}`;
  return pagina({ titulo: 'Sugerencias', cuerpo });
}

// --------------------------------------------------------------- salida
export async function pantallaSalida(env, estadia, { hecho = false } = {}) {
  const cuerpo = `
  ${encabezadoHuesped({ casa: Number(estadia.casa), volverA: hecho ? null : `/casa/${estadia.casa}` })}

  ${hecho ? `
  <div style="padding:60px 30px 0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px">
    <img src="${PLUMA_VERDE}" alt="" width="48" height="108" style="display:block">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.12">Buen viaje,<br>${esc(estadia.titular_nombre)}.</div>
    <div style="width:44px;height:1px;background:${C.dorado}"></div>
    <div style="font-size:13.5px;line-height:1.6;color:${C.arena};max-width:290px">Ya avisamos a mucama. Gracias por elegirnos: nos encantaría verte de vuelta.</div>
  </div>
  <div class="espaciador"></div>
  <div style="padding:0 30px 34px;text-align:center">
    <div class="kicker">SKYBLUE PARK · PUNTA COLORADA</div>
  </div>`
  : `
  <div style="padding:26px 26px 0">
    <div class="serif" style="font-size:34px;font-weight:300;line-height:1.08">Avisar mi salida</div>
    <div style="margin-top:10px;font-size:13.5px;line-height:1.6;color:${C.arena}">Cuando dejes el apartamento, tocá el botón. Con eso mucama sabe que puede entrar a preparar la casa y no te molestamos antes.</div>
    <div style="margin-top:14px;font-size:12.5px;line-height:1.55;color:${C.apagado}">Al avisar, este link deja de funcionar. Si te falta algo, pedilo antes.</div>
  </div>

  <div class="espaciador"></div>

  <form method="post" action="/casa/${esc(estadia.casa)}/salida" style="padding:20px 26px 28px;display:flex;flex-direction:column;gap:12px">
    <button class="btn" type="submit">YA DEJÉ EL APARTAMENTO</button>
    <a class="btn btn-sec" style="font-size:10.5px;letter-spacing:.22em;min-height:48px;padding:15px" href="/casa/${esc(estadia.casa)}">TODAVÍA NO</a>
  </form>`}`;
  return pagina({ titulo: 'Salida', cuerpo });
}
