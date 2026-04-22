-- =====================================================
-- CASTINGINFO - Script de base de datos para Supabase
-- Ejecutar en el SQL Editor de Supabase
-- =====================================================

-- ─── CASTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS castings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  proyecto        TEXT NOT NULL,
  personaje       TEXT NOT NULL DEFAULT '',
  tipo_proyecto   TEXT NOT NULL CHECK (tipo_proyecto IN ('serie','cine','publicidad','teatro','doblaje')),
  director_casting TEXT,
  productora      TEXT,
  plataforma_cliente TEXT,
  fecha_casting   DATE NOT NULL,
  tipo_casting    TEXT NOT NULL CHECK (tipo_casting IN ('self_tape','presencial','callback','quimica')),
  estado          TEXT NOT NULL CHECK (estado IN ('enviado','callback','opcionado','seleccionado','descartado')) DEFAULT 'enviado',
  resultado_final TEXT,
  actor_seleccionado TEXT,
  enlace_self_tape TEXT,
  enlace_guion    TEXT,
  notas           TEXT,
  fuente_casting  TEXT NOT NULL CHECK (fuente_casting IN ('representante','director_casting','autocasting','contacto')) DEFAULT 'representante'
);

-- ─── PROYECTOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyectos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  casting_id      UUID REFERENCES castings(id) ON DELETE SET NULL,
  proyecto        TEXT NOT NULL,
  personaje       TEXT NOT NULL DEFAULT '',
  tipo_proyecto   TEXT NOT NULL CHECK (tipo_proyecto IN ('serie','cine','publicidad','teatro','doblaje')),
  productora      TEXT,
  director        TEXT,
  fecha_inicio    DATE,
  fecha_fin       DATE,
  notas           TEXT
);

-- ─── FINANZAS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finanzas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  proyecto_id     UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre TEXT NOT NULL,
  tipo_ingreso    TEXT NOT NULL CHECK (tipo_ingreso IN ('nomina','derechos_imagen','buyout','royalties')),
  cantidad        NUMERIC(10,2) NOT NULL DEFAULT 0,
  fecha_factura   DATE,
  fecha_pago      DATE,
  estado_pago     TEXT NOT NULL CHECK (estado_pago IN ('pendiente','pagado','parcial')) DEFAULT 'pendiente',
  comision_representante NUMERIC(10,2),
  impuestos_estimados    NUMERIC(10,2),
  importe_neto           NUMERIC(10,2),
  otros_impuestos        JSONB,
  notas           TEXT
);

-- ─── CONTACTOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contactos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  nombre          TEXT NOT NULL,
  tipo_contacto   TEXT NOT NULL CHECK (tipo_contacto IN ('director_casting','representante','productor','director')),
  empresa         TEXT,
  email           TEXT,
  telefono        TEXT,
  notas           TEXT
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────
-- Habilitar RLS (puedes añadir políticas si usas autenticación)
ALTER TABLE castings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE finanzas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos  ENABLE ROW LEVEL SECURITY;

-- Política pública (sin auth, uso personal) - permite todo
-- En producción restringir a usuarios autenticados
CREATE POLICY "Allow all" ON castings  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON proyectos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON finanzas  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON contactos FOR ALL USING (true) WITH CHECK (true);

-- ─── ÍNDICES ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_castings_fecha    ON castings(fecha_casting DESC);
CREATE INDEX IF NOT EXISTS idx_castings_estado   ON castings(estado);
CREATE INDEX IF NOT EXISTS idx_finanzas_factura  ON finanzas(fecha_factura DESC);
CREATE INDEX IF NOT EXISTS idx_contactos_nombre  ON contactos(nombre ASC);

-- ─── DATOS DE EJEMPLO (opcional) ──────────────────────
-- INSERT INTO castings (proyecto, personaje, tipo_proyecto, director_casting, productora, fecha_casting, tipo_casting, estado, fuente_casting)
-- VALUES ('La Casa de Papel 5', 'Inspector García', 'serie', 'Aitor Villena', 'Vancouver Media', '2025-03-01', 'presencial', 'callback', 'representante');
