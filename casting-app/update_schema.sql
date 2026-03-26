-- =====================================================
-- CASTINGINFO - Actualización de esquema para Castings y Proyectos
-- Ejecutar en el Editor SQL de Supabase
-- =====================================================

-- 1. Añadir columnas faltantes a la tabla 'castings'
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fue_opcionado BOOLEAN DEFAULT FALSE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tuvo_callback BOOLEAN DEFAULT FALSE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tipo_callback TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS cobra_callback BOOLEAN DEFAULT FALSE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tarifa_callback NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS localizacion TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fechas_rodaje TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS prueba_vestuario_fecha DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS callback_fecha DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS callback_salario NUMERIC(10,2) DEFAULT 30;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS ppm_fecha DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS travel_fecha DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS travel_ida DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS travel_vuelta DATE;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS roles_seleccionados TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS ocp_tarifa_bruta NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS ocp_buyout NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS sec_tarifa_bruta NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS sec_buyout NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fe_tarifa_bruta NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS fe_buyout NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS rol_seleccionado TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tarifa_jornada NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS num_jornadas INTEGER DEFAULT 1;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS horas_fitting_extra NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tarifa_hora_extra NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS num_travel_days INTEGER;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS horas_extra_convenio NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS derechos_imagen NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS comision_pct NUMERIC(5,2) DEFAULT 10;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS importe_bruto NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS importe_neto NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tarifa_neta_jornada NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS tarifa_traslado NUMERIC(10,2);
ALTER TABLE castings ADD COLUMN IF NOT EXISTS num_takes INTEGER;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS nombre_agencia TEXT;
ALTER TABLE castings ADD COLUMN IF NOT EXISTS hora_casting TEXT;

-- 2. Actualizar o Añadir columnas a 'proyectos'
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_fin DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS prueba_vestuario_fecha DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS travel_ida DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS travel_vuelta DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS rol TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS tarifa_jornada NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS num_jornadas INTEGER;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS horas_fitting_extra NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS tarifa_hora_extra NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS num_travel_days INTEGER;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS horas_extra_convenio NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS derechos_imagen NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS comision_pct NUMERIC(5,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS facturado_via TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS tarifa_neta_jornada NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS tarifa_traslado NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS horas_extra_evento NUMERIC(10,2);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS estudio_doblaje TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS num_takes INTEGER;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_limite_cobro DATE;

-- 3. Actualizar Constraints
ALTER TABLE castings DROP CONSTRAINT IF EXISTS castings_tipo_proyecto_check;
ALTER TABLE castings ADD CONSTRAINT castings_tipo_proyecto_check 
    CHECK (tipo_proyecto IN ('serie','cine','publicidad','teatro','doblaje','tv','evento'));

ALTER TABLE castings DROP CONSTRAINT IF EXISTS castings_tipo_casting_check;
ALTER TABLE castings ADD CONSTRAINT castings_tipo_casting_check 
    CHECK (tipo_casting IN ('self_tape','presencial','callback_presencial','callback_zoom','quimica'));

ALTER TABLE castings DROP CONSTRAINT IF EXISTS castings_estado_check;
ALTER TABLE castings ADD CONSTRAINT castings_estado_check 
    CHECK (estado IN ('pendiente','enviado','callback','opcionado','seleccionado','descartado'));

ALTER TABLE castings DROP CONSTRAINT IF EXISTS castings_fuente_casting_check;
ALTER TABLE castings ADD CONSTRAINT castings_fuente_casting_check 
    CHECK (fuente_casting IN ('representante','director_casting','autocasting','contacto','agencia'));

ALTER TABLE finanzas DROP CONSTRAINT IF EXISTS finanzas_tipo_ingreso_check;
ALTER TABLE finanzas ADD CONSTRAINT finanzas_tipo_ingreso_check 
    CHECK (tipo_ingreso IN ('nomina','derechos_imagen','buyout','royalties','callback'));

-- 4. Garantizar integridad de datos
ALTER TABLE castings ALTER COLUMN personaje SET DEFAULT '';
UPDATE castings SET personaje = '' WHERE personaje IS NULL;
ALTER TABLE castings ALTER COLUMN personaje SET NOT NULL;

-- 5. Actualizar tabla de eventos de calendario
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS related_project_id UUID REFERENCES proyectos(id) ON DELETE CASCADE;
