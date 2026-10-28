ALTER TABLE public.mind_item_logs DROP CONSTRAINT IF EXISTS mind_item_logs_kind_check;
ALTER TABLE public.mind_item_logs ADD CONSTRAINT mind_item_logs_kind_check CHECK (kind IN ('situations','film_study','tex_vision','breathing','focus_routine','journaling','owner_mind'));
ALTER TABLE public.mind_item_logs ADD COLUMN IF NOT EXISTS owner_drill_id uuid;