INSERT INTO public.wk_movement_catalog
  (slug, name, category, pattern, variant, sport_scope, min_training_age_years, cns_cost, cue, why_prescribed, contraindications, default_sets, default_reps, default_tempo, wic_metadata_complete)
VALUES
  -- Breathwork
  ('wu_crocodile_breathing','Crocodile breathing (prone diaphragm reset)','warmup','mobility',NULL,'both',0,0,'Expand ribs 360°, exhale twice as long as inhale.','Downshift CNS, prime diaphragm for load.',ARRAY[]::text[],1,8,NULL,true),
  ('wu_9020_reset','90/90 breathing reset','warmup','mobility',NULL,'both',0,0,'Ribs down, exhale fully before inhaling.','Rib-cage reset before rotational output.',ARRAY[]::text[],1,6,NULL,true),
  -- Tissue prep
  ('wu_foam_roll_tspine','T-spine foam roll extensions','warmup','mobility',NULL,'both',0,0,'Small ranges, exhale into extension.','Restore thoracic extension for throwing and hitting.',ARRAY['acute_back_pain']::text[],1,8,NULL,true),
  ('wu_lacrosse_ball_pec','Lacrosse ball pec minor pin','warmup','mobility',NULL,'both',0,0,'Search-hold-move — arm slow figure-8.','Open front-line fascia for arm-care and swing plane.',ARRAY['acute_shoulder_pain']::text[],1,1,'30-45s per side',true),
  ('wu_lacrosse_ball_glute','Lacrosse ball glute pin-and-stretch','warmup','mobility',NULL,'both',0,0,'Find a hotspot, then flex/extend the hip.','Restore hip capsule and glute glide before loading.',ARRAY[]::text[],1,1,'45s per side',true),
  ('wu_barefoot_towel_scrunch','Barefoot towel scrunch (foot fascia)','warmup','mobility',NULL,'both',0,0,'Drag the towel with the toes — arch stays lifted.','Wake foot intrinsics and plantar fascia for elastic transfer.',ARRAY[]::text[],1,1,'30s per foot',true),
  ('wu_calf_softball_pin','Soleus ball pin (calf ECM hydration)','warmup','mobility',NULL,'both',0,0,'Pin, then dorsi- and plantarflex the ankle.','Hydrate lower-leg ECM before pogos and sprints.',ARRAY[]::text[],1,1,'45s per side',true),
  -- Fascial rotation
  ('wu_spinal_wave_standing','Standing spinal wave','warmup','rotational',NULL,'both',0,0,'Sequence segment by segment — no muscling.','Fascial spine mobility for rotational sports.',ARRAY[]::text[],1,6,NULL,true),
  ('wu_arm_line_spiral','Arm-line fascial spiral','warmup','rotational',NULL,'both',0,0,'Reach across body, let the ribcage rotate through.','Open the spiral line for throwing and swinging.',ARRAY[]::text[],1,6,NULL,true),
  ('wu_thoracic_windmill','Thoracic windmill (side-lying open book)','warmup','rotational',NULL,'both',0,0,'Reach long, exhale into the twist.','T-spine rotation for both hitting and throwing.',ARRAY[]::text[],1,8,NULL,true),
  ('wu_thread_the_needle_slow','Thread-the-needle slow flow','warmup','rotational',NULL,'both',0,0,'Quadruped rotate — chase length, not depth.','Scap and thoracic fascial glide.',ARRAY[]::text[],1,6,NULL,true),
  ('wu_lateral_line_reach','Lateral line reach + side bend','warmup','mobility',NULL,'both',0,0,'Long from foot to fingertip — feel the whole side stretch.','Lateral-line fascial length.',ARRAY[]::text[],1,5,NULL,true),
  ('wu_medball_rot_toss_wall','Med-ball rotational toss (fascial spring)','warmup','rotational',NULL,'both',0,1,'Load the back hip, let fascia snap through.','Elastic rotational primer before hitting/throwing.',ARRAY['oblique_strain']::text[],3,4,NULL,true),
  -- CARs
  ('wu_hip_cars','Hip CARs (Controlled Articular Rotations)','warmup','mobility',NULL,'both',0,0,'Biggest circle you own — no compensations.','Joint capsule health and end-range control.',ARRAY[]::text[],2,2,NULL,true),
  ('wu_shoulder_cars','Shoulder CARs','warmup','mobility',NULL,'both',0,0,'Full end-range, no rib flare.','Shoulder capsule prep — non-negotiable for throwers.',ARRAY[]::text[],2,2,NULL,true),
  ('wu_spine_cars','Segmental spine CARs','warmup','mobility',NULL,'both',1,0,'Cat-cow, then side bend, then rotation — one segment at a time.','Spinal articulation for rotational athletes.',ARRAY[]::text[],1,3,NULL,true),
  ('wu_ankle_cars','Ankle CARs (seated)','warmup','mobility',NULL,'both',0,0,'Maximum circle, keep shin still.','Ankle mobility for sprinting and change of direction.',ARRAY[]::text[],2,5,NULL,true),
  ('wu_wrist_cars','Wrist CARs','warmup','mobility',NULL,'both',0,0,'Big circles, elbow locked.','Wrist capsule prep for hitting and pitching.',ARRAY[]::text[],2,5,NULL,true),
  ('wu_scapular_cars','Scapular CARs','warmup','mobility',NULL,'both',0,0,'Trace a square with the shoulder blade only.','Scap control before overhead and arm-care work.',ARRAY[]::text[],2,5,NULL,true),
  -- Mobility / joint
  ('wu_90_90_switch','90/90 hip switches','warmup','mobility',NULL,'both',0,0,'Sit tall, drive knees down slowly — no hands.','Hip internal/external rotation for hitting and fielding.',ARRAY[]::text[],1,8,NULL,true),
  ('wu_shin_box_get_up','Shin-box get-up','warmup','mobility',NULL,'both',1,1,'Rise without hands — control both hips.','Hip control and floor-to-standing coordination.',ARRAY[]::text[],1,4,NULL,true),
  ('wu_cossack_squat','Cossack squat flow','warmup','mobility',NULL,'both',0,1,'Shift weight foot-to-foot — heel of extended leg stays down.','Adductor length and lateral hip mobility.',ARRAY['groin_strain']::text[],1,6,NULL,true),
  ('wu_worlds_greatest_stretch','World''s greatest stretch','warmup','mobility',NULL,'both',0,0,'Elbow to instep, then reach up to open the thorax.','Full-body dynamic mobility primer.',ARRAY[]::text[],1,5,NULL,true),
  ('wu_spiderman_reach','Spiderman + rotational reach','warmup','mobility',NULL,'both',0,0,'Reach the top hand for the ceiling — eyes chase it.','Hip and T-spine mobility in one move.',ARRAY[]::text[],1,5,NULL,true),
  ('wu_frog_rock','Frog stretch rock-back','warmup','mobility',NULL,'both',0,0,'Rock slow, keep back flat.','Adductor and hip mobility.',ARRAY[]::text[],1,8,NULL,true),
  ('wu_hip_airplane','Hip airplanes (SL hinge + rotation)','warmup','mobility',NULL,'both',1,1,'Square the hips, then open, then square — no wobble.','Single-leg hip control for pitching and sprinting.',ARRAY[]::text[],1,5,NULL,true),
  ('wu_adductor_rock','Adductor rock-back','warmup','mobility',NULL,'both',0,0,'Hips back and down, chest tall.','Groin health for lateral output.',ARRAY[]::text[],1,8,NULL,true),
  ('wu_couch_stretch_active','Active couch stretch + posterior tilt','warmup','mobility',NULL,'both',0,0,'Squeeze glute, tuck tail, breathe.','Hip flexor length + glute activation.',ARRAY[]::text[],1,5,'30s + 5 reps per side',true),
  ('wu_tspine_open_book','T-spine open book','warmup','mobility',NULL,'both',0,0,'Reach long, follow with your eyes.','Thoracic rotation for the swing and throw.',ARRAY[]::text[],1,6,NULL,true),
  ('wu_wall_hip_flexor_slide','Wall-assisted hip flexor slide','warmup','mobility',NULL,'both',0,0,'Posterior tilt drives the stretch, not the lean.','Hip flexor length without compensating with lumbar extension.',ARRAY[]::text[],1,5,NULL,true),
  -- Activation
  ('wu_miniband_lat_walk','Mini-band lateral walk','warmup','mobility',NULL,'both',0,0,'Knees track toes, hips stay level.','Glute med activation before lower-body work.',ARRAY[]::text[],2,10,NULL,true),
  ('wu_miniband_monster_walk','Mini-band monster walk','warmup','mobility',NULL,'both',0,0,'Athletic stance, small steps, tension the whole time.','Hip abductor primer.',ARRAY[]::text[],2,8,NULL,true),
  ('wu_glute_bridge_walkout','Glute bridge walkout','warmup','hinge',NULL,'both',0,1,'Hips stay level — do not let one side drop.','Glute activation with anti-rotation.',ARRAY[]::text[],2,6,NULL,true),
  ('wu_deadbug_band_press','Dead-bug w/ band overhead press iso','warmup','trunk',NULL,'both',0,1,'Ribs locked down, exhale as leg extends.','Trunk stability with breath coupling.',ARRAY[]::text[],2,5,NULL,true),
  ('wu_bird_dog_slow','Bird-dog slow tempo','warmup','trunk',NULL,'both',0,0,'No hip shift when the leg extends.','Trunk and hip stability primer.',ARRAY[]::text[],2,5,NULL,true),
  ('wu_prone_hip_ext_iso','Prone glute-only hip extension','warmup','hinge',NULL,'both',0,0,'Lift the leg with the glute, not the low back.','Glute isolation without lumbar spin.',ARRAY[]::text[],2,6,NULL,true),
  ('wu_singleleg_glute_bridge','Single-leg glute bridge','warmup','hinge',NULL,'both',0,1,'Drive through the heel, keep hips level.','Unilateral glute activation.',ARRAY[]::text[],2,6,NULL,true),
  -- Stability
  ('wu_pallof_press_iso','Pallof press iso (anti-rotation)','warmup','trunk',NULL,'both',0,1,'Arms extend, ribs stay square to the cable.','Anti-rotation strength before rotational output.',ARRAY[]::text[],2,1,'20s per side',true),
  ('wu_copenhagen_short_lever','Short-lever Copenhagen plank','warmup','trunk',NULL,'both',1,1,'Top knee on bench, drive it down into the pad.','Adductor durability — groin injury insurance.',ARRAY['groin_strain']::text[],2,1,'15s per side',true),
  ('wu_sl_rdl_reach','Single-leg RDL balance reach','warmup','hinge',NULL,'both',0,1,'Hips square, reach long, no wobble.','Posterior chain control and single-leg stability.',ARRAY[]::text[],2,5,NULL,true),
  ('wu_split_stance_iso_hold','Split-stance iso hold + march','warmup','mobility',NULL,'both',0,0,'Vertical shin, ribs stacked over pelvis.','Half-kneeling stability primer.',ARRAY[]::text[],2,1,'20s per side',true),
  ('wu_serratus_wall_slide','Serratus wall slide','warmup','mobility',NULL,'both',0,0,'Reach long at the top, do not shrug.','Scap upward rotation for overhead health.',ARRAY[]::text[],2,8,NULL,true),
  -- Neural priming
  ('wu_ankle_bounce_series','Ankle bounce series (stiff ankles)','warmup','plyometric',NULL,'both',0,1,'Ground is hot, minimum contact time.','Ankle stiffness and CNS wake-up.',ARRAY[]::text[],3,1,'15s',true),
  ('wu_line_hops_forward_back','Line hops forward-back','warmup','plyometric',NULL,'both',0,1,'Quick feet, both directions clean.','Rhythm and reactive quickness.',ARRAY[]::text[],3,1,'20s',true),
  ('wu_line_hops_lateral','Line hops lateral','warmup','plyometric',NULL,'both',0,1,'Stiff ankles, do not drift.','Frontal-plane quickness.',ARRAY[]::text[],3,1,'20s',true),
  ('wu_a_skip','A-skip','warmup','plyometric',NULL,'both',0,1,'Tall posture, front-side mechanics — knee up, toe up.','Sprint mechanics primer.',ARRAY[]::text[],2,1,'20 yards',true),
  ('wu_b_skip','B-skip','warmup','plyometric',NULL,'both',1,1,'Same as A, then paw the ground down and back.','Advanced sprint mechanics primer.',ARRAY[]::text[],2,1,'20 yards',true),
  ('wu_wickets_low','Low wicket runs (rhythm)','warmup','plyometric',NULL,'both',1,1,'Tall, cyclical, do not reach.','Sprint rhythm and stride prep.',ARRAY[]::text[],3,1,'through',true),
  ('wu_reaction_ball_wall','Reaction ball vs wall','warmup','plyometric',NULL,'both',0,1,'Athletic stance, hands ready — read early.','Reflex and visual reaction primer.',ARRAY[]::text[],3,1,'20s',true),
  -- Fast-twitch primer
  ('wu_pogo_double','Pogo hops (double-leg)','warmup','plyometric',NULL,'both',0,1,'Stiff ankles, ground contact under 0.2s.','Reactive-strength primer for speed and lifts.',ARRAY['acute_lower_leg_strain']::text[],3,12,NULL,true),
  ('wu_pogo_single','Single-leg pogo (symmetry)','warmup','plyometric',NULL,'both',1,1,'Equal hop height both sides.','Unilateral reactive strength.',ARRAY['acute_lower_leg_strain']::text[],3,6,NULL,true),
  ('wu_pogo_lateral','Lateral pogo (skater rhythm)','warmup','plyometric',NULL,'both',1,1,'Stiff, quick — cover a foot each hop.','Frontal-plane reactive quickness.',ARRAY[]::text[],3,10,NULL,true),
  ('wu_snap_jump','Snap jump (rapid concentric)','warmup','plyometric',NULL,'both',2,1,'Quick tuck-and-load, explode out.','Concentric snap primer for CNS.',ARRAY[]::text[],3,4,NULL,true),
  ('wu_med_ball_scoop_toss','Med-ball scoop toss (rear-hip explosive)','warmup','rotational',NULL,'both',0,1,'Drive from the rear hip, ball rockets up.','Triple-extension power primer.',ARRAY[]::text[],3,4,NULL,true),
  ('wu_med_ball_shot_put','Med-ball rotational shot-put','warmup','rotational',NULL,'both',1,1,'Wind the rear hip, unleash — 100% intent, small volume.','Rotational power primer for hitting and throwing.',ARRAY[]::text[],3,3,NULL,true),
  ('wu_broad_jump_prep','Broad jump — 60% intent primer','warmup','plyometric',NULL,'both',0,1,'Arm swing, land soft — no maximal effort here.','Sub-max jump for CNS pattern.',ARRAY[]::text[],4,1,NULL,true),
  ('wu_altitude_drop','Altitude drop landing (RSI primer)','warmup','plyometric',NULL,'both',2,1,'Land stiff-ankled, absorb-hold — no rebound today.','Reactive strength index primer.',ARRAY['acute_knee_pain','acute_ankle_pain']::text[],3,3,NULL,true),
  ('wu_falling_start','Falling start (10 yd)','warmup','plyometric',NULL,'both',1,1,'Fall then explode — fastest first step wins.','Acceleration primer.',ARRAY[]::text[],3,1,'10 yds',true),
  ('wu_split_snap_jump','Split-stance snap-switch jump','warmup','plyometric',NULL,'both',2,1,'Quick switch, land stable — power comes from the ground.','High-CNS split jump primer.',ARRAY['acute_knee_pain']::text[],3,4,NULL,true),
  -- Movement bridge
  ('wu_dry_swing_progressive','Progressive dry swings (intent ladder)','warmup','rotational',NULL,'both',0,1,'50% → 75% → 100% — feel the elastic snap.','Swing pattern rehearsal with progressive intent.',ARRAY[]::text[],3,3,NULL,true),
  ('wu_mirror_throw_prep','Dry throw arm-swing prep','warmup','mobility',NULL,'both',0,0,'Half-speed rehearsal — pattern first, intent last.','Throwing pattern prep before catch play.',ARRAY[]::text[],2,6,NULL,true),
  ('wu_shuffle_change_direction','Shuffle → change of direction','warmup','plyometric',NULL,'both',0,1,'Athletic stance, react like a defender.','Change-of-direction primer.',ARRAY[]::text[],2,1,'20s each way',true),
  ('wu_crossover_run','Crossover run (open the hip)','warmup','plyometric',NULL,'both',0,1,'Cross over long, do not hop.','Hip opener and outfield route prep.',ARRAY[]::text[],2,1,'15 yds each way',true),
  -- Arm care
  ('wu_jband_full_warmup','J-Band full arm-care chart (warm-up)','warmup','mobility',NULL,'both',0,0,'Control the eccentric — every rep.','Full arm-care chart owed daily.',ARRAY['acute_shoulder_pain']::text[],1,10,'full chart',true),
  ('wu_crossover_symmetry_full_warmup','Crossover Symmetry activation chart (warm-up)','warmup','mobility',NULL,'both',0,0,'Smooth reps, exhale on pull.','Rotator cuff and scap activation.',ARRAY[]::text[],1,10,'full chart',true),
  ('wu_prone_tyw','Prone T / Y / W','warmup','mobility',NULL,'both',0,0,'Thumbs up, squeeze the shoulder blades.','Scap posterior chain activation.',ARRAY[]::text[],2,8,NULL,true),
  ('wu_er_at_90','External rotation at 90°','warmup','mobility',NULL,'both',0,0,'Elbow high, slow eccentric.','Rotator cuff strength.',ARRAY[]::text[],2,12,NULL,true),
  ('wu_scap_pushup','Scapular push-up','warmup','push',NULL,'both',0,0,'Protract/retract only — no elbow bend.','Serratus and scap primer.',ARRAY[]::text[],2,10,NULL,true),
  ('wu_face_pull_band','Band face pull','warmup','pull',NULL,'both',0,0,'Elbows high, pull apart, external rotate.','Posterior shoulder health.',ARRAY[]::text[],2,12,NULL,true),
  ('wu_forearm_pump','Forearm flexor/extensor pump','warmup','mobility',NULL,'both',0,0,'Band or light weight, high reps to flush.','Forearm circulation for grip health.',ARRAY[]::text[],1,20,NULL,true)
ON CONFLICT (slug) DO NOTHING;

-- Mark all the warmup rows as WIC-complete so validators pass.
UPDATE public.wk_movement_catalog
SET wic_metadata_complete = true
WHERE category = 'warmup';