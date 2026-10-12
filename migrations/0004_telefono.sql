-- El teléfono de recepción estaba cargado con dos dígitos invertidos:
-- decía 091 567 200 y el número real es 091 657 200 (confirmado por Gabriel, 12-oct-2026).
-- La migración 0002 ya corrió en producción, así que el valor viejo hay que actualizarlo acá.

UPDATE config SET valor = '091657200' WHERE clave = 'telefono_recepcion';
