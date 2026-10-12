-- Skyblue Servicios · el huésped completa sus propios datos
--
-- El personal abre la casa con lo que define plata e identidad: nombre,
-- apellido y noches. El huésped, al escanear, completa lo que sólo él sabe:
-- cuántos son y de dónde vienen.
--
-- La fecha de salida se guarda como fecha, no como "noches", porque es lo que
-- permite que la estadía se venza sola sin que nadie apriete nada.

ALTER TABLE estadias ADD COLUMN pasajeros     INTEGER;
ALTER TABLE estadias ADD COLUMN nacionalidad  TEXT;      -- UY | AR | BR | otro
ALTER TABLE estadias ADD COLUMN fecha_salida  TEXT;      -- 'AAAA-MM-DD'
ALTER TABLE estadias ADD COLUMN completada_en TEXT;      -- cuándo completó el huésped

CREATE INDEX IF NOT EXISTS idx_estadias_salida ON estadias (estado, fecha_salida);

-- Las estadías que ya estaban abiertas cuando salió esta versión no tienen
-- fecha de salida. Se la calculamos con las noches que se cargaron en el alta.
UPDATE estadias
   SET fecha_salida = date(substr(activada_en, 1, 10), '+' || noches || ' days')
 WHERE fecha_salida IS NULL;

-- El link de la reseña de Google. Se cambia con un UPDATE, sin tocar código.
-- El definitivo sale del panel de Google Business → Reseñas → "Recibir más reseñas".
INSERT OR REPLACE INTO config (clave, valor) VALUES
  ('link_resena_google', 'https://search.google.com/local/writereview?placeid=ChIJ9XSf6tppdZUR9TuvwQVrYFU'),
  ('hora_cierre_automatico', '11');
