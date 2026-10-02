-- ==============================================================================
-- ChapApp - Migración: Modelo Híbrido de Jerarquía Familiar y Control Estricto
-- Fecha: Octubre 2026
-- ==============================================================================

-- 1. Crear tabla family_groups si no existe
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    nodo_padre_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
    es_independiente BOOLEAN NOT NULL DEFAULT false,
    color TEXT DEFAULT '#38BDF8',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en family_groups
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para family_groups (acceso público transparente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'family_groups' AND policyname = 'Permitir todo en family_groups'
    ) THEN
        CREATE POLICY "Permitir todo en family_groups" 
        ON public.family_groups FOR ALL 
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Modificar tabla participants con los nuevos campos requeridos
ALTER TABLE public.participants 
    ADD COLUMN IF NOT EXISTS nombre TEXT,
    ADD COLUMN IF NOT EXISTS apellido_paterno TEXT,
    ADD COLUMN IF NOT EXISTS apellido_materno TEXT,
    ADD COLUMN IF NOT EXISTS telefono TEXT,
    ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'adulto',
    ADD COLUMN IF NOT EXISTS ponderacion NUMERIC DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS grupo_familiar_id UUID REFERENCES public.family_groups(id) ON DELETE SET NULL;

-- 3. Migrar nombres existentes dividiendo el campo legado 'name'
UPDATE public.participants 
SET 
    nombre = COALESCE(NULLIF(nombre, ''), split_part(trim(name), ' ', 1)),
    apellido_paterno = COALESCE(NULLIF(apellido_paterno, ''), 
        CASE 
            WHEN array_length(string_to_array(trim(name), ' '), 1) >= 2 
            THEN split_part(trim(name), ' ', 2) 
            ELSE '' 
        END),
    apellido_materno = COALESCE(NULLIF(apellido_materno, ''), 
        CASE 
            WHEN array_length(string_to_array(trim(name), ' '), 1) >= 3 
            THEN array_to_string((string_to_array(trim(name), ' '))[3:], ' ') 
            ELSE '' 
        END),
    categoria = COALESCE(NULLIF(categoria, ''), category, 'adulto'),
    ponderacion = COALESCE(ponderacion, weight, 1.0)
WHERE (nombre IS NULL OR nombre = '') AND name IS NOT NULL;

-- 4. Habilitar RLS en participants y asegurar políticas abiertas
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'participants' AND policyname = 'Permitir todo en participants'
    ) THEN
        CREATE POLICY "Permitir todo en participants" 
        ON public.participants FOR ALL 
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Limpieza de registros temporales o de prueba previos
DELETE FROM public.participants 
WHERE name LIKE '__FG__%' 
   OR (active_days IS NOT NULL AND active_days->>'isFamilyGroup' = 'true');

-- 6. Habilitar publicación Realtime para family_groups
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.family_groups;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 7. Notificar recarga del esquema a PostgREST
NOTIFY pgrst, 'reload schema';
