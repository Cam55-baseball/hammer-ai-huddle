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

-- ============================================================
-- Step 10, parts 3 and 4 (coverage-gap rows, unit and metadata cleanup)
-- ============================================================

-- 3. Remove the 48 inactive coverage-gap rows.
delete from wk_movement_catalog where source_philosophy = 'coverage_gap_fill';

-- 4a. Sled consolidation — put the five retired duplicates back.
update wk_movement_catalog set superseded_by = null, is_active = true
 where slug in ('lift_sled_backward','sp_backwards_sled','sp_prowler_push_10','ws_prowler_sprint','sp_sled_march_heavy');

-- 4b. Unit, category and name fixes on the sprint rows.
update wk_movement_catalog set category='speed_lab', dosage_unit='feet', default_sets=3, default_reps=null,
       default_duration_seconds=null, default_distance_feet=60, name='Copenhagen Plank 3×30s' where slug='sp_copenhagen_plank';
update wk_movement_catalog set category='speed_lab', dosage_unit='feet', default_sets=3, default_reps=null,
       default_distance_feet=60, name='Nordic Hamstring Curl 3×5' where slug='sp_nordic_hamstring';
update wk_movement_catalog set category='speed_lab', dosage_unit='feet', default_sets=3, default_duration_seconds=null,
       default_distance_feet=60, name='Single-Leg RDL Iso 3×20s ea' where slug='sp_sl_rdl_iso';
update wk_movement_catalog set category='speed_lab', dosage_unit='feet', default_sets=3, default_reps=null,
       default_distance_feet=60, name='Tibialis Raise 3×20' where slug='sp_tibialis_raise';
update wk_movement_catalog set dosage_unit='feet', default_sets=3, default_reps=null, default_distance_feet=60,
       name='Hurdle Hop Series 4×5' where slug='sp_hurdle_hop_series';
update wk_movement_catalog set dosage_unit='feet', default_sets=3, default_reps=null, default_distance_feet=60,
       name='Double-Leg Pogo x20' where slug='sp_pogo_double';
update wk_movement_catalog set dosage_unit='feet', default_sets=3, default_reps=null, default_distance_feet=60,
       name='Single-Leg Pogo x10ea' where slug='sp_pogo_single';
update wk_movement_catalog set dosage_unit='feet', default_distance_feet=60
 where slug in ('sp_altitude_drop','sp_continuous_broad','sp_box_jump_to_sprint','sp_tuck_to_sprint',
                'sp_medball_scoop_sprint','sp_wall_drive_iso','sp_wall_iso_to_sprint');
update wk_movement_catalog set name='RDL Cluster (5×2 @ 30s)',
       coach_cue = nullif(replace(coalesce(coach_cue,''), 'Cluster set: 30 seconds rest between the pairs.', ''), '')
 where slug='lift_rdl_cluster';

-- 4c. Clear the metadata populated in this step.
update wk_movement_catalog set plyo_tier = null;
update wk_movement_catalog set surface_hint = null;
update wk_movement_catalog set contacts_per_rep = null where exposure_channel <> 'UB_PLYO';
update wk_movement_catalog set exposure_channel = null where exposure_channel <> 'UB_PLYO';

-- 4d. The plyo_tier column itself (schema), if a full revert is wanted:
-- alter table public.wk_movement_catalog drop column plyo_tier;
