
-- 1. Relational parent_id
ALTER TABLE public.demo_registry
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.demo_registry(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_demo_registry_parent_id ON public.demo_registry(parent_id);

-- 2. Backfill parent_id from parent_slug
UPDATE public.demo_registry c
SET parent_id = p.id
FROM public.demo_registry p
WHERE c.parent_id IS NULL
  AND c.parent_slug IS NOT NULL
  AND p.slug = c.parent_slug
  AND (
    (c.node_type = 'category'  AND p.node_type = 'tier') OR
    (c.node_type = 'submodule' AND p.node_type = 'category')
  );

-- 3. Sync parent_slug from parent_id (denormalized cache for back-compat)
CREATE OR REPLACE FUNCTION public.sync_demo_registry_parent_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT slug INTO NEW.parent_slug FROM public.demo_registry WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_demo_registry_parent_slug ON public.demo_registry;
CREATE TRIGGER trg_sync_demo_registry_parent_slug
  BEFORE INSERT OR UPDATE OF parent_id ON public.demo_registry
  FOR EACH ROW EXECUTE FUNCTION public.sync_demo_registry_parent_slug();

-- 4. Rewrite hierarchy validator (uniqueness now handled by existing unique index)
CREATE OR REPLACE FUNCTION public.validate_demo_registry_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_type text;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    RAISE EXCEPTION 'demo_registry.slug is required';
  END IF;
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'demo_registry.title is required';
  END IF;
  IF NEW.node_type NOT IN ('tier','category','submodule') THEN
    RAISE EXCEPTION 'demo_registry.node_type invalid: %', NEW.node_type;
  END IF;

  IF NEW.node_type = 'tier' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'tier % must not have a parent', NEW.slug;
    END IF;
    RETURN NEW;
  END IF;

  -- For categories/submodules, prefer parent_id; fall back to parent_slug for legacy inserts
  IF NEW.parent_id IS NOT NULL THEN
    SELECT node_type INTO v_parent_type FROM public.demo_registry WHERE id = NEW.parent_id;
  ELSIF NEW.parent_slug IS NOT NULL THEN
    SELECT node_type INTO v_parent_type FROM public.demo_registry
      WHERE slug = NEW.parent_slug
        AND node_type = CASE NEW.node_type WHEN 'category' THEN 'tier' ELSE 'category' END
      LIMIT 1;
  END IF;

  IF v_parent_type IS NULL THEN
    RAISE EXCEPTION '% % has no resolvable parent (parent_id=%, parent_slug=%)',
      NEW.node_type, NEW.slug, NEW.parent_id, NEW.parent_slug;
  END IF;

  IF NEW.node_type = 'category' AND v_parent_type <> 'tier' THEN
    RAISE EXCEPTION 'category % must reference a tier (got %)', NEW.slug, v_parent_type;
  END IF;
  IF NEW.node_type = 'submodule' AND v_parent_type <> 'category' THEN
    RAISE EXCEPTION 'submodule % must reference a category (got %)', NEW.slug, v_parent_type;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Demo progress: prescription continuity
ALTER TABLE public.demo_progress
  ADD COLUMN IF NOT EXISTS prescribed_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sim_signatures   jsonb NOT NULL DEFAULT '{}'::jsonb;
