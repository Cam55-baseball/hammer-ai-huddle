
-- 1. Normalize drill_positions.position to canonical scorecard short codes.
--    Insert canonical form first (idempotent via unique key), then delete legacy rows.
WITH normalized AS (
  SELECT drill_id, CASE lower(position)
    WHEN 'pitcher'          THEN 'P'
    WHEN 'catcher'          THEN 'C'
    WHEN 'first_base'       THEN '1B'
    WHEN 'second_base'      THEN '2B'
    WHEN 'third_base'       THEN '3B'
    WHEN 'shortstop'        THEN 'SS'
    WHEN 'left_field'       THEN 'LF'
    WHEN 'center_field'     THEN 'CF'
    WHEN 'right_field'      THEN 'RF'
    WHEN 'infield'          THEN 'IF'
    WHEN 'outfield'         THEN 'OF'
    WHEN 'middle_infield'   THEN 'MI'
    WHEN 'corner_infield'   THEN 'CI'
    WHEN 'pitcher_fielding' THEN 'PFP'
    WHEN '1b' THEN '1B'
    WHEN '2b' THEN '2B'
    WHEN '3b' THEN '3B'
    WHEN 'ss' THEN 'SS'
    WHEN 'lf' THEN 'LF'
    WHEN 'cf' THEN 'CF'
    WHEN 'rf' THEN 'RF'
    WHEN 'p'  THEN 'P'
    WHEN 'c'  THEN 'C'
    ELSE upper(position)
  END AS canonical
  FROM public.drill_positions
)
INSERT INTO public.drill_positions (drill_id, position)
SELECT DISTINCT drill_id, canonical
FROM normalized
WHERE canonical IS NOT NULL AND canonical <> ''
ON CONFLICT (drill_id, position) DO NOTHING;

DELETE FROM public.drill_positions
WHERE position NOT IN ('P','C','1B','2B','3B','SS','LF','CF','RF','IF','OF','MI','CI','PFP','UTIL');

-- 2. Backfill `success_markers` on every defensive drill so the standardized
--    elite-clarity structure (What / Setup / Execution / Cues / Mistakes /
--    Success markers / Progressions) is complete across the library.
UPDATE public.drills
SET instructions = jsonb_set(
  coalesce(instructions, '{}'::jsonb),
  '{success_markers}',
  '["Reps executed on-line with no wasted motion", "Clean rhythm across a full set — no rushed or lazy reps", "Coach or self-scored ≥80% technically-correct reps before progressing"]'::jsonb,
  true
),
updated_at = now()
WHERE module IN ('fielding','throwing')
  AND (instructions IS NULL OR (instructions->'success_markers') IS NULL);
