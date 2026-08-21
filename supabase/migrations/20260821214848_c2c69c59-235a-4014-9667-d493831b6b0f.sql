ALTER TABLE public.scheduled_practice_sessions
  ADD COLUMN IF NOT EXISTS practice_kind text NOT NULL DEFAULT 'team',
  ADD COLUMN IF NOT EXISTS intensity text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

UPDATE public.scheduled_practice_sessions
SET practice_kind = CASE
  WHEN session_module = 'note' AND session_type IN ('travel') THEN 'travel'
  WHEN session_module = 'note' THEN 'other'
  WHEN session_type ILIKE '%trainer%' OR session_type ILIKE '%lesson%' THEN 'trainer'
  WHEN session_type ILIKE '%solo%' OR session_type ILIKE '%personal%' THEN 'solo'
  WHEN session_type ILIKE '%showcase%' OR session_type ILIKE '%camp%' OR session_type ILIKE '%tryout%' THEN 'showcase'
  ELSE 'team'
END
WHERE practice_kind = 'team';

CREATE INDEX IF NOT EXISTS scheduled_practice_sessions_user_date_idx
  ON public.scheduled_practice_sessions (user_id, scheduled_date);