-- =====================================================
-- CASTINGAPP - Eventos Manuales en Calendario
-- =====================================================

-- 1. Añadir columna para distinguir eventos manuales y su color
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS custom_color VARCHAR(50);
