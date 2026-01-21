-- Data repair: Fix existing accepted coach activities that have broken recurrence
-- Note: recurring_days is JSONB, display_days is integer[]

-- First, update recurring_active to true for all accepted coach activity templates
UPDATE public.custom_activity_templates cat
SET 
  recurring_active = true,
  updated_at = now()
FROM public.sent_activity_templates sat
WHERE sat.accepted_template_id = cat.id
  AND sat.status = 'accepted'
  AND (cat.recurring_active IS NULL OR cat.recurring_active = false);

-- Second, for templates with empty/null recurring_days, copy from display_days
-- Convert integer[] to jsonb using to_jsonb
UPDATE public.custom_activity_templates cat
SET 
  recurring_days = to_jsonb(cat.display_days),
  updated_at = now()
FROM public.sent_activity_templates sat
WHERE sat.accepted_template_id = cat.id
  AND sat.status = 'accepted'
  AND (cat.recurring_days IS NULL OR cat.recurring_days = '[]'::jsonb OR jsonb_array_length(cat.recurring_days) = 0)
  AND cat.display_days IS NOT NULL
  AND array_length(cat.display_days, 1) > 0;