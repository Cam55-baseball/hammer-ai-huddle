
ALTER TABLE public.custom_activity_templates
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS success_criteria text,
  ADD COLUMN IF NOT EXISTS source text;

UPDATE public.custom_activity_templates
SET title = 'Daily Mental Reset',
    description = 'Reset focus and clear mental fatigue before performance.',
    purpose = 'Reset focus and clear mental fatigue before performance.',
    action = 'Take 2 minutes to breathe slowly, clear your thoughts, and refocus on your next objective.',
    success_criteria = 'Completed a full uninterrupted 2-minute reset.',
    source = 'Phase 9'
WHERE id = 'e6120c59-965d-4301-82b0-a96c2503b05e';
