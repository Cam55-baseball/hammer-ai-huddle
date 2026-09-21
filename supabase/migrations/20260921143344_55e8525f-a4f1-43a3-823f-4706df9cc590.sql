UPDATE public.wk_movement_catalog
SET name = regexp_replace(name, 'J-Band', 'Arm-Care Band', 'gi')
WHERE name ~* 'j-band';

UPDATE public.wk_movement_catalog
SET name = regexp_replace(name, 'Crossover Symmetry', 'Band Activation', 'gi')
WHERE name ~* 'crossover symmetry';

UPDATE public.wk_movement_catalog
SET cue = regexp_replace(regexp_replace(cue, 'J-Band', 'arm-care band', 'gi'), 'Crossover Symmetry', 'band activation', 'gi')
WHERE cue ~* 'j-band|crossover symmetry';