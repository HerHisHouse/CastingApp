-- =====================================================
-- CASTINGAPP - Push Notifications Schema
-- Ejecutar en el Editor SQL de Supabase
-- =====================================================

-- 1. Tabla de suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
    ON push_subscriptions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Tabla de configuración de notificaciones por usuario
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT true,
    -- Tipos de evento
    notify_casting BOOLEAN DEFAULT true,
    notify_callback BOOLEAN DEFAULT true,
    notify_ppm BOOLEAN DEFAULT true,
    notify_fitting BOOLEAN DEFAULT true,
    notify_shooting BOOLEAN DEFAULT true,
    notify_travel BOOLEAN DEFAULT true,
    notify_finance BOOLEAN DEFAULT true,
    -- Tiempos de antelación (JSON array: ["24h", "2h", "same_day"])
    advance_times JSONB DEFAULT '["24h"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings"
    ON notification_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Log de notificaciones enviadas (para evitar duplicados)
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id TEXT NOT NULL,
    advance_type TEXT NOT NULL, -- '24h', '2h', 'same_day'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id, advance_type)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
-- Solo el service role puede insertar (cron job)
CREATE POLICY "Service role can manage notification log"
    ON notification_log FOR ALL
    USING (true)
    WITH CHECK (true);
