
ALTER TABLE public.custom_activity_templates
  ADD COLUMN IF NOT EXISTS completion_type text,
  ADD COLUMN IF NOT EXISTS completion_binding jsonb;

UPDATE public.custom_activity_templates
SET completion_type = 'manual',
    completion_binding = '{"kind":"manual","rule":{"type":"timer","min_seconds":120}}'::jsonb
WHERE id = 'e6120c59-965d-4301-82b0-a96c2503b05e';
