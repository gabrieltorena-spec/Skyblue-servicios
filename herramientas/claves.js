// Genera el SQL para cargar o cambiar las claves del personal.
//
//   node herramientas/claves.js maria:1111 german:4444
//
// Imprime el INSERT/UPDATE listo para pegar en la consola de D1.
// La clave nunca queda guardada: se guarda sha-256 de (sal + clave).

const crypto = require('crypto');

const NOMBRES = {
  gabriel: ['Gabriel', 'admin'],
  maria: ['María', 'mucama'],
  rafaela: ['Rafaela', 'mucama'],
  anthony: ['Anthony', 'mucama'],
  german: ['German', 'mantenimiento'],
};

const pares = process.argv.slice(2);
if (!pares.length) {
  console.error('Uso: node herramientas/claves.js usuario:clave [usuario:clave ...]');
  process.exit(1);
}

for (const par of pares) {
  const [usuario, pin] = par.split(':');
  const [nombre, rol] = NOMBRES[usuario] || [usuario, 'mucama'];
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(sal + pin).digest('hex');
  console.log(
    `INSERT INTO empleados (id,usuario,nombre,rol,pin_hash,pin_salt,creado_en)\n` +
    `VALUES ('${crypto.randomUUID()}','${usuario}','${nombre}','${rol}','${hash}','${sal}',datetime('now'))\n` +
    `ON CONFLICT(usuario) DO UPDATE SET pin_hash=excluded.pin_hash, pin_salt=excluded.pin_salt,\n` +
    `  intentos=0, bloqueado_hasta=NULL, activo=1;\n`
  );
}
