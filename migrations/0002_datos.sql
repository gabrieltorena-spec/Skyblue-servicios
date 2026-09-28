-- Skyblue Servicios · datos iniciales
-- Los tiempos y los nombres salen de la Matriz Operativa (27-sep-2026).

DELETE FROM servicios;

-- ------------------------------------------- Servicio de limpieza · 9 a 14
INSERT INTO servicios (clave, categoria, sector, nombre_huesped, nombre_interno, orden, min_toma, min_resolucion, escala_a, prioridad) VALUES
 ('limpieza_integral',  'limpieza', 'mucama', 'Limpieza integral',      'Parcial',             1, 15, 90, 'recepcion', 'normal'),
 ('parrillero',         'limpieza', 'mucama', 'Limpieza de parrillero', 'Limpiar parrillero',  2, 20, 60, 'recepcion', 'normal'),
 ('residuos',           'limpieza', 'mucama', 'Retiro de residuos',     'Sacar la basura',     3, 15, 45, 'recepcion', 'normal'),
 ('vajilla',            'limpieza', 'mucama', 'Lavar vajilla',          'Lavar vajilla',       4, 15, 60, 'recepcion', 'normal'),
 ('toallas',            'limpieza', 'mucama', 'Solo cambio de toallas', 'Cambio de toallas',   5, 10, 30, 'recepcion', 'normal');

-- --------------------------------------------- Mantenimiento · 8 a 20
INSERT INTO servicios (clave, categoria, sector, nombre_huesped, nombre_interno, orden, min_toma, min_resolucion, escala_a, prioridad) VALUES
 ('aire',        'mantenimiento', 'mantenimiento', 'Aire acondicionado',  'Aire',          1, 10, 120, 'admin',     'normal'),
 ('agua',        'mantenimiento', 'mantenimiento', 'Agua o baño',         'Agua o baño',   2,  5,  60, 'admin',     'urgente'),
 ('tv_wifi',     'mantenimiento', 'mantenimiento', 'TV o Wi-Fi',          'TV o Wi-Fi',    3, 15, 120, 'recepcion', 'normal'),
 ('electricidad','mantenimiento', 'mantenimiento', 'Electricidad',        'Electricidad',  4,  5,  60, 'admin',     'urgente'),
 ('otro_mant',   'mantenimiento', 'mantenimiento', 'Otro inconveniente',  'Otro',          5, 15, NULL,'recepcion', 'normal');

-- --------------------------------------------------- Recepción · 8 a 00
INSERT INTO servicios (clave, categoria, sector, nombre_huesped, nombre_interno, orden, min_toma, min_resolucion, escala_a, prioridad) VALUES
 ('lenia',     'recepcion', 'recepcion', 'Leña para la estufa',           'Leña',          1, 15, 45, 'admin', 'normal'),
 ('bebe',      'recepcion', 'recepcion', 'Cuna o artículo para bebé',     'Cuna',          2, 15, 60, 'admin', 'normal'),
 ('info',      'recepcion', 'recepcion', 'Información y recomendaciones', 'Info',          3, 20, NULL,NULL,    'normal'),
 ('hablar',    'recepcion', 'recepcion', 'Hablar con recepción',          'Hablar',        4, 10, NULL,'admin', 'normal'),
 ('otro_recep','recepcion', 'recepcion', 'Otro pedido',                   'Otro',          5, 20, NULL,'admin', 'normal');

-- ------------------------------------------------------------ parámetros
INSERT OR REPLACE INTO config (clave, valor) VALUES
 ('umbral_noches_mucama', '3'),
 ('horario_limpieza',      '09:00-14:00'),
 ('horario_mantenimiento', '08:00-20:00'),
 ('horario_recepcion',     '08:00-00:00'),
 ('telefono_recepcion',    '091567200'),
 ('wifi_red',              'Skyblue'),
 ('wifi_clave',            'Puntacolorada1519'),
 ('max_avisos_dia',        '2');
