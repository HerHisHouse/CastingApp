-- Migración: Cambiar artist_type (texto) a artist_types (array de texto)

-- 1. Renombrar la columna antigua
ALTER TABLE public.user_profiles RENAME COLUMN artist_type TO old_artist_type;

-- 2. Añadir la nueva columna como array de texto
ALTER TABLE public.user_profiles ADD COLUMN artist_types TEXT[] DEFAULT '{}';

-- 3. Migrar los datos existentes (si los hay)
UPDATE public.user_profiles 
SET artist_types = ARRAY[old_artist_type] 
WHERE old_artist_type IS NOT NULL;

-- 4. Eliminar la columna antigua
ALTER TABLE public.user_profiles DROP COLUMN old_artist_type;
