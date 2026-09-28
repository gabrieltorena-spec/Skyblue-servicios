// Skyblue Servicios · escalación automática
// Corre una vez por minuto. No avisa al huésped: avisa hacia adentro.
//
// Dos relojes vencen acá:
//   vence_toma_en       · nadie tomó el pedido a tiempo
//   vence_resolucion_en · lo tomaron pero no lo terminaron a tiempo
//
// Si el sector está fuera de horario, el reloj se detiene: no tiene sentido
// escalar un pedido de mucama a las tres de la mañana.

import * as D from './datos.js';
import { avisarSector } from './push.js';

const ABIERTOS = ['recibido', 'tomado', 'en_camino', 'en_proceso', 'reabierto'];

export async function correrEscalacion(env) {
  const t = D.ahora();

  const r = await env.DB.prepare(
    `SELECT s.id, s.casa, s.estado, s.vence_toma_en, s.vence_resolucion_en,
            sv.categoria, sv.nombre_interno, sv.escala_a, sv.prioridad
       FROM solicitudes s
       JOIN servicios sv ON sv.clave = s.servicio
      WHERE s.escalado = 0
        AND s.estado IN (${ABIERTOS.map(() => '?').join(',')})
        AND (
              (s.estado IN ('recibido','reabierto') AND s.vence_toma_en IS NOT NULL AND s.vence_toma_en < ?)
           OR (s.vence_resolucion_en IS NOT NULL AND s.vence_resolucion_en < ?)
        )`
  ).bind(...ABIERTOS, t, t).all();

  const candidatas = r.results || [];
  if (!candidatas.length) return 0;

  // El horario de cada sector se consulta una sola vez por corrida.
  const horarios = {};
  for (const c of new Set(candidatas.map((x) => x.categoria))) {
    horarios[c] = await D.horario(env, c);
  }

  let escalados = 0;
  for (const s of candidatas) {
    const dentroDeHorario = horarios[s.categoria]?.abierto;
    // Las urgencias (agua, electricidad) escalan a cualquier hora.
    if (!dentroDeHorario && s.prioridad !== 'urgente') continue;

    const porToma = ['recibido', 'reabierto'].includes(s.estado);
    await env.DB.prepare(
      `UPDATE solicitudes SET escalado = 1, escalado_en = ?, actualizada_en = ?
        WHERE id = ? AND escalado = 0`
    ).bind(t, t, s.id).run();

    await D.registrarEvento(env, {
      solicitudId: s.id,
      anterior: s.estado,
      nuevo: porToma ? 'escalado_sin_tomar' : 'escalado_sin_resolver',
      automatico: 1,
    });

    console.log(
      `escalación · casa ${s.casa} · ${s.nombre_interno} · ` +
      `${porToma ? 'nadie lo tomó' : 'no se terminó'} · avisar a ${s.escala_a || 'recepcion'}`
    );
    // Suena el celular de quien tiene que destrabarlo.
    await avisarSector(env, s.escala_a || 'recepcion');
    escalados += 1;
  }

  return escalados;
}
