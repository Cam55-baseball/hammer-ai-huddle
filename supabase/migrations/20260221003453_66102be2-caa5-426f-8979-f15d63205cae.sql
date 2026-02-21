ALTER TABLE public.sub_module_progress 
ADD COLUMN IF NOT EXISTS loops_completed integer DEFAULT 0;