-- Step 10 revert (rehearsed). Run top-to-bottom to undo every Step 10 data change.

-- 1. Branded category recategorisation (item 2)
update wk_movement_catalog set category = case category
 when 'shoulder_prep' then 'cressey_sp'
 when 'throwing_plyo' then 'driveline'
 when 'movement_patterning' then 'functional_patterning'
 when 'rotational_strength' then 'heenan'
 when 'movement_capacity' then 'ido_portal'
 when 'sprint_mechanics' then 'marinovich'
 when 'posterior_chain' then 'summers'
 when 'max_effort_strength' then 'westside'
 end
where category in ('shoulder_prep','throwing_plyo','movement_patterning','rotational_strength',
                   'movement_capacity','sprint_mechanics','posterior_chain','max_effort_strength');

-- 2. Displayed-name neutralisation (item 2)
update wk_movement_catalog set name = v.oldname from (values
 ('crossover_symmetry_full','Crossover Symmetry — Full List'),
 ('wu_crossover_symmetry_full_warmup','Crossover Symmetry activation chart (warm-up)'),
 ('ac_crossover_activation','Crossover Symmetry Activation Protocol'),
 ('ac_crossover_plyo','Crossover Symmetry Plyometric'),
 ('ac_crossover_recovery','Crossover Symmetry Recovery Protocol'),
 ('ac_jband_full_chart','J-Band Full Chart (Jaeger Complete)'),
 ('ac_jobes_full_series','Jobes Complete Series'),
 ('ac_oates_shoulder_tube_front','Oates Shoulder Tube — Front'),
 ('ac_oates_shoulder_tube_lateral','Oates Shoulder Tube — Lateral'),
 ('ac_oates_shoulder_tube_overhead','Oates Shoulder Tube — Overhead'),
 ('ac_oates_shoulder_tube_softball','Oates Tube — Windmill Path'),
 ('lift_triphasic_iso_squat','Triphasic Iso Squat 3s')
) as v(slug,oldname) where wk_movement_catalog.slug = v.slug;

-- 3. Hill / tow / overspeed tightening (item 5)
update wk_movement_catalog set
  min_age_years = v.age, min_training_age_years = v.ta,
  equipment = v.eq::text[], equipment_requirements = v.eqr::text[],
  training_age_legality = v.tal::jsonb
from (values
 ('overspeed_assist',0,2,'{open_space}','{open_space}','{"advanced":true,"beginner":false,"developing":false,"elite":true,"intermediate":true,"professional":true}'),
 ('sp_downhill_overspeed',0,0,'{}','{bodyweight}','{"advanced":true,"beginner":false,"developing":false,"elite":true,"intermediate":false,"professional":true}'),
 ('sp_hill_contrast',0,0,'{}','{bodyweight}','{"advanced":true,"beginner":false,"developing":true,"elite":true,"intermediate":true,"professional":true}'),
 ('sp_hill_short_10',0,0,'{}','{bodyweight}','{"advanced":true,"beginner":true,"developing":true,"elite":true,"intermediate":true,"professional":true}'),
 ('sp_pfaff_hill_long',0,0,'{}','{bodyweight}','{"advanced":true,"beginner":false,"developing":false,"elite":true,"intermediate":true,"professional":true}'),
 ('sp_tow_assisted_fly',0,0,'{}','{bodyweight}','{"advanced":true,"beginner":false,"developing":false,"elite":true,"intermediate":false,"professional":true}')
) as v(slug,age,ta,eq,eqr,tal) where wk_movement_catalog.slug = v.slug;
