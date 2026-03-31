-- =====================================================
-- CASTINGAPP - Horas adicionales para Proyectos y Castings
-- =====================================================

-- 1. Columnas de hora para Proyectos
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS prueba_vestuario_hora TIME;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS travel_ida_hora TIME;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS travel_vuelta_hora TIME;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_inicio_hora TIME;

-- 2. Columna de hora para PPM en Castings
ALTER TABLE castings ADD COLUMN IF NOT EXISTS ppm_hora TIME DEFAULT '12:00';
