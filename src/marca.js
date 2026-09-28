// Skyblue Servicios · sistema de marca
// Navy noche, marfil, dorado. Cormorant Garamond + Poppins.
// El wordmark y la pluma son archivos, nunca tipografía viva ni dibujo.

export const C = {
  navy: '#0A111E',
  navyPersonal: '#070D17',
  superficie: '#141D2B',
  superficieAlta: '#17222F',
  filete: '#23304A',
  fileteSuave: '#1C2739',
  marfil: '#F5F1E8',
  arena: '#D2DBE8',
  apagado: '#7E8CA0',
  tenue: '#63708A',
  dorado: '#C8A870',
  doradoApagado: '#9B7E45',
  champan: '#E9CD96',
  ok: '#7FB89B',
  aviso: '#E0A94A',
  alerta: '#E08A7D',
};

export const FUENTES =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Poppins:wght@300;400;500;600&display=swap">';

// Los dos assets de marca viven en /static y se sirven desde el worker.
export const WORDMARK = '/static/wordmark.webp';       // marfil, para fondo navy
export const PLUMA_VERDE = '/static/pluma-verde.webp';   // app, uso corriente
export const PLUMA_HIBRIDA = '/static/pluma-hibrida.webp'; // impresos, premium

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function pagina({ titulo, cuerpo, fondo = C.navy, extraHead = '' }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${fondo}">
<title>${esc(titulo)} · Skyblue Park</title>
<link rel="manifest" href="/manifest.webmanifest">
${FUENTES}
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:${fondo};color:${C.marfil};
    font-family:'Poppins',system-ui,-apple-system,sans-serif;font-weight:300;
    -webkit-font-smoothing:antialiased;min-height:100dvh}
  a{color:${C.dorado};text-decoration:none}
  .env{max-width:430px;margin:0 auto;min-height:100dvh;display:flex;flex-direction:column}
  .serif{font-family:'Cormorant Garamond',Georgia,serif}
  .kicker{font-size:8.5px;font-weight:500;letter-spacing:.3em;color:${C.tenue}}
  .filete{height:1px;background:${C.filete}}
  input,textarea,button,select{font-family:inherit;font-size:16px;color:${C.marfil}}
  input,textarea{width:100%;padding:14px 16px;background:${C.superficie};
    border:1px solid ${C.filete};border-radius:2px;font-weight:300}
  input:focus,textarea:focus{outline:none;border-color:${C.doradoApagado}}
  textarea{resize:none;line-height:1.55}
  .btn{display:block;width:100%;min-height:54px;padding:17px;text-align:center;
    font-size:11.5px;font-weight:500;letter-spacing:.26em;padding-left:calc(17px + .26em);
    color:${C.navy};background:${C.dorado};border:none;border-radius:2px;cursor:pointer}
  .btn-sec{color:${C.arena};background:transparent;border:1px solid ${C.filete}}
  .fila{display:flex;align-items:center;gap:14px}
  .crece{flex-grow:1}
  .espaciador{flex-grow:1}
</style>
${extraHead}
</head>
<body>
<div class="env">${cuerpo}</div>
</body>
</html>`;
}

// Encabezado del huésped: wordmark solo, sin pluma. La casa a la derecha.
export function encabezadoHuesped({ casa, volverA = null }) {
  const atras = volverA
    ? `<a href="${esc(volverA)}" aria-label="Volver" style="display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin-left:-14px">
         <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="${C.arena}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
       </a>`
    : '';
  return `<div class="fila" style="padding:${volverA ? '18px' : '24px'} 26px 18px;border-bottom:1px solid ${C.filete}">
    ${atras}
    <div class="crece"><img src="${WORDMARK}" alt="SKYBLUE PARK" width="126" height="9" style="display:block"></div>
    <div style="font-size:9.5px;font-weight:400;letter-spacing:.2em;color:${C.apagado}">APTO. ${esc(casa)}</div>
  </div>`;
}
