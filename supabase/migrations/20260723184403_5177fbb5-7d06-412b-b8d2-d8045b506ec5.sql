
UPDATE public.wk_movement_catalog
SET default_sets = 1,
    default_reps = 1,
    default_total_reps = 9,
    dosage_unit = 'innings',
    cue = 'Sit 3–5 minutes to simulate the between-inning rest, then fire one all-out sprint. Repeat for the number of innings prescribed.'
WHERE slug = 'inning_restart_sim_bb';

UPDATE public.wk_movement_catalog
SET default_sets = 1,
    default_reps = 1,
    default_total_reps = 7,
    dosage_unit = 'innings',
    cue = 'Sit 3–5 minutes to simulate the between-inning rest, then fire one all-out sprint. Repeat for the number of innings prescribed.'
WHERE slug = 'inning_restart_sim_sb';
