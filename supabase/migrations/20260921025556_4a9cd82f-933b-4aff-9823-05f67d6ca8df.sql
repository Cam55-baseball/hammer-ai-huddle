UPDATE public.wk_movement_catalog
SET cue = btrim(regexp_replace(cue, '\s*Run 60 feet,\s*3 sets,\s*full rest between reps\.\s*$', '', 'i')),
    updated_at = now()
WHERE cue ~* 'Run 60 feet,\s*3 sets,\s*full rest between reps\.\s*$';

UPDATE public.wk_movement_catalog
SET category = 'trunk',
    movement_category = 'core',
    speed_category = NULL,
    updated_at = now()
WHERE slug = 'sp_copenhagen_plank';