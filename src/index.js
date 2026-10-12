// Skyblue Servicios · worker principal
// Cloudflare Worker + D1. Sin framework: el HTML se arma en el servidor.

import { enrutar } from './rutas.js';
import { correrEscalacion } from './escalacion.js';
import { cerrarVencidas } from './datos.js';

export default {
  async fetch(request, env, ctx) {
    try {
      return await enrutar(request, env, ctx);
    } catch (err) {
      console.error('error no controlado', err);
      return new Response('Algo falló de nuestro lado. Probá de nuevo.', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  },

  // Cada minuto: escalar los pedidos que nadie tomó a tiempo, y cerrar las
  // estadías cuya fecha de salida ya pasó. El check-out no depende de que
  // nadie apriete un botón.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(correrEscalacion(env));
    ctx.waitUntil(cerrarVencidas(env));
  },
};
