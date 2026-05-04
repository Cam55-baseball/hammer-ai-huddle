
ALTER TABLE public.demo_progress
  ADD COLUMN IF NOT EXISTS viewed_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS incomplete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_path text;

ALTER TABLE public.demo_registry
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_order int,
  ADD COLUMN IF NOT EXISTS requires_features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_app_version text;

-- Mark the first category under each tier as recommended (idempotent best-effort).
UPDATE public.demo_registry r
SET is_recommended = true, recommended_order = 1
WHERE node_type = 'category'
  AND id IN (
    SELECT DISTINCT ON (parent_slug) id
    FROM public.demo_registry
    WHERE node_type = 'category' AND is_active = true
    ORDER BY parent_slug, display_order ASC, id ASC
  );
