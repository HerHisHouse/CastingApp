ALTER TABLE IF EXISTS public.finanzas ADD COLUMN IF NOT EXISTS pagos_extra jsonb DEFAULT '[]'::jsonb;
