-- =====================================================
-- CASTINGAPP - Refinamiento de Notificaciones y Horarios
-- =====================================================

-- 1. Añadir columna de hora a los eventos del calendario para notificaciones precisas
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS event_time TIME;

-- 2. Limpiar log antiguo si fuera necesario (opcional)
-- TRUNCATE notification_log;
