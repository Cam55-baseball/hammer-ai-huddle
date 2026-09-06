ALTER TABLE public.wk_movement_catalog ADD COLUMN IF NOT EXISTS superseded_by text;

COMMENT ON COLUMN public.wk_movement_catalog.superseded_by IS 'Slug of the canonical movement that replaces this retired row. Null for live rows. Historical prescriptions are never rewritten; the resolver follows this pointer for rendering and substitution only.';