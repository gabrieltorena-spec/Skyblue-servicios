-- Skyblue Servicios · esquema inicial
-- 13 casas, numeradas 00 a 12.

-- ---------------------------------------------------------------- estadías
CREATE TABLE IF NOT EXISTS estadias (
  id                  TEXT PRIMARY KEY,
  casa                TEXT NOT NULL,              -- '00' .. '12'
  titular_nombre      TEXT NOT NULL,
  titular_apellido    TEXT NOT NULL,
  identidad           TEXT NOT NULL,              -- normalizada: sin tildes, minúsculas
  noches              INTEGER NOT NULL DEFAULT 1,
  incluye_mucama      INTEGER NOT NULL DEFAULT 0, -- calculado: noches >= umbral
  mucama_forzada_por  TEXT,
  idioma              TEXT NOT NULL DEFAULT 'es', -- es | pt | en
  estado              TEXT NOT NULL DEFAULT 'activa', -- activa | salida_avisada | cerrada
  activada_en         TEXT NOT NULL,
  salida_avisada_en   TEXT,
  cerrada_en          TEXT
);
CREATE INDEX IF NOT EXISTS idx_estadias_casa_estado ON estadias (casa, estado);

-- ------------------------------------------------------- sesiones huésped
CREATE TABLE IF NOT EXISTS sesiones (
  id          TEXT PRIMARY KEY,   -- huella sha-256 del token, nunca el token
  estadia_id  TEXT NOT NULL REFERENCES estadias (id),
  creada_en   TEXT NOT NULL,
  revocada_en TEXT
);
CREATE INDEX IF NOT EXISTS idx_sesiones_estadia ON sesiones (estadia_id);

-- ------------------------------------------------------------- empleados
CREATE TABLE IF NOT EXISTS empleados (
  id             TEXT PRIMARY KEY,
  usuario        TEXT NOT NULL UNIQUE,
  nombre         TEXT NOT NULL,
  rol            TEXT NOT NULL,              -- admin | recepcion | mucama | mantenimiento
  pin_hash       TEXT NOT NULL,
  pin_salt       TEXT NOT NULL,
  activo         INTEGER NOT NULL DEFAULT 1,
  intentos       INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta TEXT,
  creado_en      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones_empleado (
  id          TEXT PRIMARY KEY,
  empleado_id TEXT NOT NULL REFERENCES empleados (id),
  creada_en   TEXT NOT NULL,
  revocada_en TEXT
);

-- ------------------------------------------------------------- servicios
-- Dos nombres por servicio: el del huésped y el del personal.
CREATE TABLE IF NOT EXISTS servicios (
  clave            TEXT PRIMARY KEY,
  categoria        TEXT NOT NULL,     -- limpieza | mantenimiento | recepcion
  sector           TEXT NOT NULL,     -- mucama | mantenimiento | recepcion
  nombre_huesped   TEXT NOT NULL,
  nombre_interno   TEXT NOT NULL,
  orden            INTEGER NOT NULL,
  min_toma         INTEGER NOT NULL,
  min_resolucion   INTEGER,
  escala_a         TEXT,              -- recepcion | admin
  prioridad        TEXT NOT NULL DEFAULT 'normal', -- normal | urgente
  activo           INTEGER NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------ solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
  id                  TEXT PRIMARY KEY,
  numero              INTEGER,
  estadia_id          TEXT NOT NULL REFERENCES estadias (id),
  casa                TEXT NOT NULL,
  servicio            TEXT NOT NULL REFERENCES servicios (clave),
  detalles            TEXT,
  prioridad           TEXT NOT NULL DEFAULT 'normal',
  estado              TEXT NOT NULL DEFAULT 'recibido',
  -- recibido | tomado | en_camino | en_proceso | finalizado | reabierto | cancelado
  tomado_por          TEXT REFERENCES empleados (id),
  tomado_en           TEXT,
  en_camino_en        TEXT,
  en_proceso_en       TEXT,
  finalizado_por      TEXT REFERENCES empleados (id),
  finalizado_en       TEXT,
  eta_minutos         INTEGER,          -- 0 = enseguida | 15 | 30 | 60
  eta_avisada_en      TEXT,
  vence_toma_en       TEXT,
  vence_resolucion_en TEXT,
  escalado            INTEGER NOT NULL DEFAULT 0,
  escalado_en         TEXT,
  huesped_quiere_aviso INTEGER NOT NULL DEFAULT 0,
  creada_en           TEXT NOT NULL,
  actualizada_en      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes (estado, creada_en);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estadia ON solicitudes (estadia_id);

-- Auditoría: una fila por cambio de estado.
CREATE TABLE IF NOT EXISTS eventos_solicitud (
  id             TEXT PRIMARY KEY,
  solicitud_id   TEXT NOT NULL REFERENCES solicitudes (id),
  estado_anterior TEXT,
  estado_nuevo   TEXT NOT NULL,
  empleado_id    TEXT REFERENCES empleados (id),
  automatico     INTEGER NOT NULL DEFAULT 0,
  ocurrido_en    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eventos_solicitud ON eventos_solicitud (solicitud_id);

-- ---------------------------------------------------------------- avisos
CREATE TABLE IF NOT EXISTS avisos (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  cuerpo        TEXT NOT NULL,
  publicado_por TEXT NOT NULL REFERENCES empleados (id),
  publicado_en  TEXT NOT NULL,
  vence_en      TEXT NOT NULL,
  notificar     INTEGER NOT NULL DEFAULT 0,
  notificado_a  INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------- sugerencias
CREATE TABLE IF NOT EXISTS sugerencias (
  id         TEXT PRIMARY KEY,
  estadia_id TEXT NOT NULL REFERENCES estadias (id),
  casa       TEXT NOT NULL,
  tipo       TEXT NOT NULL,          -- idea | algo_mal
  texto      TEXT NOT NULL,
  leida_en   TEXT,
  creada_en  TEXT NOT NULL
);

-- -------------------------------------------------- suscripciones a push
CREATE TABLE IF NOT EXISTS push_subs (
  id          TEXT PRIMARY KEY,
  duenio_tipo TEXT NOT NULL,         -- empleado | huesped
  duenio_id   TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  creada_en   TEXT NOT NULL,
  revocada_en TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_duenio ON push_subs (duenio_tipo, duenio_id);

-- ------------------------------------------------------------ parámetros
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
