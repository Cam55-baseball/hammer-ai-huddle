/**
 * Elite Warmup Library — fascial / ECM / fast-twitch / mobility / activation / weightless coordination.
 *
 * Doctrine-forward warmup catalog inspired by:
 *   - FRC / CARs (Functional Range Conditioning — Andreo Spina)
 *   - DNS (Dynamic Neuromuscular Stabilization — Kolar)
 *   - Ido Portal movement culture
 *   - Kelly Starrett / Ready State — tissue prep
 *   - Ben Patrick (Knees Over Toes) durability
 *   - Marv Marinovich reflex/reactive drills
 *   - Cressey Sports Performance arm care
 *   - Driveline throwing prep
 *   - Verkhoshansky / Bosch fast-twitch neural priming
 *   - Anatomy Trains (Myers) fascial line preparation
 *   - Weightless Object Sport Training (WOST) — hand-eye, rhythm, fast-twitch CNS patterning without load
 */
import { guideFor, type MovementGuide } from "@/lib/hammer/prescription/movementGuide";

export type WarmupRole =
  | "breathwork"
  | "tissue_prep"
  | "fascial_rotation"
  | "cars"
  | "mobility_joint"
  | "activation"
  | "stability"
  | "neural_priming"
  | "fast_twitch"
  | "weightless_coordination"
  | "movement_bridge"
  | "arm_care";

export type WarmupContext =
  | "game_day"
  | "in_season_practice"
  | "in_season_default"
  | "speed_day"
  | "lift_day"
  | "throwing_day"
  | "hitting_day"
  | "offseason_extended"
  | "recovery_day"
  | "travel_day"
  | "default";

export type LifecycleClass = "youth" | "beginner" | "intermediate" | "advanced" | "elite";

export interface WarmupDrill {
  readonly slug: string;
  readonly name: string;
  readonly role: WarmupRole;
  readonly setup?: string;
  readonly cue?: string;
  readonly stopIf?: string;
  readonly gameDayLegal: boolean;
  readonly minLifecycle: LifecycleClass;
  readonly source: string;
  readonly baseDose: string;
  readonly beginnerDose?: string;
  readonly eliteDose?: string;
}

// ─── Library ────────────────────────────────────────────────────────────────
export const WARMUP_LIBRARY: WarmupDrill[] = [
  // Breathwork
  { slug: "wu_crocodile_breathing", name: "Crocodile breathing (prone diaphragm reset)", role: "breathwork", setup: "prone, forehead on hands", cue: "expand ribs 360°, exhale twice as long", gameDayLegal: true, minLifecycle: "youth", source: "DNS / PRI", baseDose: "8 slow breaths" },
  { slug: "wu_9020_reset", name: "90/90 breathing reset", role: "breathwork", setup: "back on floor, feet on wall, hips/knees 90°", cue: "ribs down, exhale fully before inhaling", gameDayLegal: true, minLifecycle: "youth", source: "PRI", baseDose: "6 breaths" },

  // Tissue prep / ECM
  { slug: "wu_foam_roll_tspine", name: "T-spine foam roll extensions", role: "tissue_prep", setup: "roller under mid-back", cue: "small ranges, exhale into extension", stopIf: "pinch or sharp pain", gameDayLegal: true, minLifecycle: "youth", source: "Kelly Starrett", baseDose: "8 slow reps" },
  { slug: "wu_lacrosse_ball_pec", name: "Lacrosse ball pec minor pin", role: "tissue_prep", setup: "ball against wall on pec minor", cue: "search-hold-move — arm slow figure-8", gameDayLegal: true, minLifecycle: "beginner", source: "Kelly Starrett", baseDose: "30-45 sec per side" },
  { slug: "wu_lacrosse_ball_glute", name: "Lacrosse ball glute pin-and-stretch", role: "tissue_prep", cue: "find a hotspot, then flex/extend hip", gameDayLegal: true, minLifecycle: "beginner", source: "Ready State", baseDose: "45 sec per side" },
  { slug: "wu_barefoot_towel_scrunch", name: "Barefoot towel scrunch (foot fascia)", role: "tissue_prep", setup: "towel under bare foot", cue: "drag toward you with toes — arch stays lifted", gameDayLegal: true, minLifecycle: "youth", source: "KOT / foot restoration", baseDose: "30 sec per foot" },
  { slug: "wu_calf_softball_pin", name: "Soleus ball pin (calf ECM hydration)", role: "tissue_prep", cue: "pin, then dorsiflex/plantarflex the ankle", gameDayLegal: true, minLifecycle: "beginner", source: "FRC tissue prep", baseDose: "45 sec per side" },

  // Fascial rotation
  { slug: "wu_spinal_wave_standing", name: "Standing spinal wave", role: "fascial_rotation", cue: "sequence segment by segment — no muscling", gameDayLegal: true, minLifecycle: "beginner", source: "Ido Portal", baseDose: "6 reps each direction", beginnerDose: "4 reps each direction" },
  { slug: "wu_arm_line_spiral", name: "Arm-line fascial spiral", role: "fascial_rotation", setup: "half-kneeling", cue: "reach across body, let ribcage rotate through", gameDayLegal: true, minLifecycle: "youth", source: "Anatomy Trains", baseDose: "6 per side" },
  { slug: "wu_thoracic_windmill", name: "Thoracic windmill (side-lying open book)", role: "fascial_rotation", setup: "side-lying, knees stacked at 90°", cue: "reach long, exhale into the twist", gameDayLegal: true, minLifecycle: "youth", source: "DNS / Cressey", baseDose: "8 per side" },
  { slug: "wu_thread_the_needle_slow", name: "Thread-the-needle slow flow", role: "fascial_rotation", cue: "quadruped rotate — chase length not depth", gameDayLegal: true, minLifecycle: "youth", source: "Ido Portal", baseDose: "6 per side" },
  { slug: "wu_lateral_line_reach", name: "Lateral line reach + side bend", role: "fascial_rotation", cue: "long from foot to fingertip — feel the whole side stretch", gameDayLegal: true, minLifecycle: "youth", source: "Anatomy Trains", baseDose: "5 per side" },
  { slug: "wu_medball_rot_toss_wall", name: "Med-ball rotational toss (fascial spring)", role: "fascial_rotation", setup: "6-8 lb ball vs wall", cue: "load the back hip, let fascia snap through", stopIf: "any rib/oblique tweak", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey rotational library", baseDose: "3 x 4 per side", beginnerDose: "2 x 3 per side", eliteDose: "3 x 5 per side max intent" },

  // CARs
  { slug: "wu_hip_cars", name: "Hip CARs (Controlled Articular Rotations)", role: "cars", cue: "biggest circle you own — no compensations", gameDayLegal: true, minLifecycle: "beginner", source: "FRC", baseDose: "2 per direction per side" },
  { slug: "wu_shoulder_cars", name: "Shoulder CARs", role: "cars", cue: "full end-range, no rib flare", gameDayLegal: true, minLifecycle: "beginner", source: "FRC", baseDose: "2 per direction per side" },
  { slug: "wu_spine_cars", name: "Segmental spine CARs", role: "cars", cue: "cat-cow then side bend then rotation — one segment at a time", gameDayLegal: true, minLifecycle: "intermediate", source: "FRC", baseDose: "3 slow reps" },
  { slug: "wu_ankle_cars", name: "Ankle CARs (seated)", role: "cars", cue: "maximum circle, keep shin still", gameDayLegal: true, minLifecycle: "youth", source: "FRC", baseDose: "5 per direction per side" },
  { slug: "wu_wrist_cars", name: "Wrist CARs", role: "cars", cue: "big circles, elbow locked", gameDayLegal: true, minLifecycle: "youth", source: "FRC", baseDose: "5 per direction per side" },
  { slug: "wu_scapular_cars", name: "Scapular CARs (elevation/depression/pro/retract)", role: "cars", cue: "trace a square with the shoulder blade only", gameDayLegal: true, minLifecycle: "beginner", source: "FRC / Cressey", baseDose: "5 per direction per side" },

  // Mobility
  { slug: "wu_90_90_switch", name: "90/90 hip switches", role: "mobility_joint", cue: "sit tall, drive knees down slowly — no hands", gameDayLegal: true, minLifecycle: "youth", source: "Ido Portal / DNS", baseDose: "8 per side" },
  { slug: "wu_shin_box_get_up", name: "Shin-box get-up", role: "mobility_joint", cue: "rise without hands — control both hips", gameDayLegal: true, minLifecycle: "intermediate", source: "Ido Portal", baseDose: "4 per side" },
  { slug: "wu_cossack_squat", name: "Cossack squat flow", role: "mobility_joint", cue: "shift weight foot-to-foot — heel of extended leg stays down", stopIf: "knee or groin sharp pain", gameDayLegal: true, minLifecycle: "beginner", source: "Ido Portal / KOT", baseDose: "6 per side" },
  { slug: "wu_worlds_greatest_stretch", name: "World's greatest stretch", role: "mobility_joint", cue: "elbow to instep, then reach up to open thorax", gameDayLegal: true, minLifecycle: "youth", source: "Blended elite programming", baseDose: "5 per side" },
  { slug: "wu_spiderman_reach", name: "Spiderman + rotational reach", role: "mobility_joint", cue: "reach the top hand for the ceiling — eyes chase it", gameDayLegal: true, minLifecycle: "youth", source: "Blended elite programming", baseDose: "5 per side" },
  { slug: "wu_frog_rock", name: "Frog stretch rock-back", role: "mobility_joint", setup: "quadruped, knees wide", cue: "rock slow, keep back flat", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey", baseDose: "8 slow rocks" },
  { slug: "wu_hip_airplane", name: "Hip airplanes (SL hinge + rotation)", role: "mobility_joint", cue: "square the hips, then open, then square — no wobble", gameDayLegal: true, minLifecycle: "intermediate", source: "Marinovich / DNS", baseDose: "5 per side", beginnerDose: "3 per side with wall support" },
  { slug: "wu_adductor_rock", name: "Adductor rock-back", role: "mobility_joint", setup: "half-kneeling, one leg extended lateral", cue: "hips back and down, chest tall", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "8 per side" },
  { slug: "wu_couch_stretch_active", name: "Active couch stretch + posterior tilt", role: "mobility_joint", setup: "rear foot elevated behind you", cue: "squeeze glute, tuck tail, breathe", gameDayLegal: true, minLifecycle: "beginner", source: "Kelly Starrett", baseDose: "30 sec + 5 reps per side" },
  { slug: "wu_tspine_open_book", name: "T-spine open book", role: "mobility_joint", cue: "reach long, follow with your eyes", gameDayLegal: true, minLifecycle: "youth", source: "Cressey / DNS", baseDose: "6 per side" },
  { slug: "wu_wall_hip_flexor_slide", name: "Wall-assisted hip flexor slide", role: "mobility_joint", cue: "posterior tilt drives the stretch, not the lean", gameDayLegal: true, minLifecycle: "beginner", source: "PRI / KOT", baseDose: "5 per side" },

  // Activation
  { slug: "wu_miniband_lat_walk", name: "Mini-band lateral walk", role: "activation", setup: "light mini-band above knees", cue: "knees track toes, hips stay level", stopIf: "knee tracking pain", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 10 steps each way" },
  { slug: "wu_miniband_monster_walk", name: "Mini-band monster walk", role: "activation", setup: "band above knees", cue: "athletic stance, small steps, tension the whole time", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 8 forward + 8 back" },
  { slug: "wu_glute_bridge_walkout", name: "Glute bridge walkout", role: "activation", setup: "hips up, walk feet out then back in", cue: "hips stay level, don't let one side drop", gameDayLegal: true, minLifecycle: "beginner", source: "PRI", baseDose: "2 x 6 steps" },
  { slug: "wu_deadbug_band_press", name: "Dead-bug w/ band overhead press iso", role: "activation", cue: "ribs locked down, exhale as leg extends", gameDayLegal: true, minLifecycle: "beginner", source: "DNS / Cressey", baseDose: "2 x 5 per side" },
  { slug: "wu_bird_dog_slow", name: "Bird-dog slow tempo", role: "activation", cue: "no hip shift when the leg extends", gameDayLegal: true, minLifecycle: "youth", source: "McGill", baseDose: "2 x 5 per side" },
  { slug: "wu_prone_hip_ext_iso", name: "Prone glute-only hip extension", role: "activation", cue: "lift the leg with the glute, not the low back", gameDayLegal: true, minLifecycle: "beginner", source: "Kelly Starrett", baseDose: "2 x 6 per side" },
  { slug: "wu_singleleg_glute_bridge", name: "Single-leg glute bridge", role: "activation", cue: "drive through the heel, keep hips level", gameDayLegal: true, minLifecycle: "beginner", source: "Blended elite programming", baseDose: "2 x 6 per side" },

  // Stability
  { slug: "wu_pallof_press_iso", name: "Pallof press iso (anti-rotation)", role: "stability", cue: "arms extend, ribs stay square to cable", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey", baseDose: "2 x 20 sec per side" },
  { slug: "wu_copenhagen_short_lever", name: "Short-lever Copenhagen plank", role: "stability", cue: "top knee on bench, drive it down into the pad", stopIf: "groin pain", gameDayLegal: true, minLifecycle: "intermediate", source: "Cressey adductor durability", baseDose: "2 x 15 sec per side", eliteDose: "2 x 25 sec per side" },
  { slug: "wu_sl_rdl_reach", name: "Single-leg RDL balance reach", role: "stability", cue: "hips square, reach long, no wobble", gameDayLegal: true, minLifecycle: "beginner", source: "Marinovich / Cressey", baseDose: "2 x 5 per side" },
  { slug: "wu_split_stance_iso_hold", name: "Split-stance iso hold + march", role: "stability", cue: "vertical shin, ribs stacked over pelvis", gameDayLegal: true, minLifecycle: "youth", source: "DNS", baseDose: "2 x 20 sec per side" },
  { slug: "wu_serratus_wall_slide", name: "Serratus wall slide", role: "stability", setup: "forearms on wall", cue: "reach long at the top, don't shrug", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 8" },

  // Neural priming
  { slug: "wu_ankle_bounce_series", name: "Ankle bounce series (stiff ankles)", role: "neural_priming", cue: "ground is hot, minimum contact time", gameDayLegal: true, minLifecycle: "youth", source: "Bosch / Verkhoshansky", baseDose: "3 x 15 sec" },
  { slug: "wu_line_hops_forward_back", name: "Line hops forward-back", role: "neural_priming", cue: "quick feet, both directions clean", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich", baseDose: "3 x 20 sec" },
  { slug: "wu_line_hops_lateral", name: "Line hops lateral", role: "neural_priming", cue: "stiff ankles, don't drift", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich", baseDose: "3 x 20 sec" },
  { slug: "wu_a_skip", name: "A-skip", role: "neural_priming", cue: "tall posture, front-side mechanics — knee up, toe up", gameDayLegal: true, minLifecycle: "youth", source: "Track & field canon", baseDose: "2 x 20 yards" },
  { slug: "wu_b_skip", name: "B-skip", role: "neural_priming", cue: "same as A, but paw the ground down and back", gameDayLegal: true, minLifecycle: "intermediate", source: "Track & field canon", baseDose: "2 x 20 yards" },
  { slug: "wu_wickets_low", name: "Low wicket runs (rhythm)", role: "neural_priming", setup: "Line up 8 mini hurdles (6-8 inches tall) in a straight line, exactly 5 feet apart — about 40 feet total. If you have no hurdles, use rolled towels or shoes as markers.", cue: "Jog in and start running at 75% speed as you hit the first hurdle. Stay tall (chest up, eyes forward). Let each foot land BETWEEN the hurdles — pick the knee straight up and let it cycle down under your hip. Do not stride out to reach for a hurdle. Walk back to the start between reps.", gameDayLegal: true, minLifecycle: "intermediate", source: "Alfred Chan / ALTIS", baseDose: "3 runs through — walk back between each" },
  { slug: "wu_reaction_ball_wall", name: "Reaction ball vs wall", role: "neural_priming", setup: "Stand 6-10 ft from a solid wall with a reaction ball (lumpy rubber ball) or a lacrosse/pinky ball. Feet shoulder-width, athletic stance.", cue: "Throw the ball into the wall, then catch it with two hands before it bounces twice. The ball will kick unpredictably — react early, stay light on your feet, and reset your stance between throws.", stopIf: "rolled ankle, shoulder pinch, or dizziness", gameDayLegal: true, minLifecycle: "beginner", source: "Marinovich reflex training", baseDose: "3 rounds of 20 sec — reset between" },

  // Fast-twitch primer
  { slug: "wu_pogo_double", name: "Pogo hops (double-leg)", role: "fast_twitch", cue: "stiff ankles, ground contact under 0.2s", stopIf: "shin or achilles pain", gameDayLegal: true, minLifecycle: "youth", source: "Verkhoshansky", baseDose: "3 x 12 contacts", beginnerDose: "2 x 8 contacts" },
  { slug: "wu_pogo_single", name: "Single-leg pogo (symmetry)", role: "fast_twitch", cue: "equal hop height both sides", stopIf: "any strain", gameDayLegal: true, minLifecycle: "intermediate", source: "Verkhoshansky", baseDose: "3 x 6 per side" },
  { slug: "wu_pogo_lateral", name: "Lateral pogo (skater rhythm)", role: "fast_twitch", cue: "stiff, quick — cover a foot each hop", gameDayLegal: true, minLifecycle: "intermediate", source: "KOT / Bosch", baseDose: "3 x 10 per side" },
  { slug: "wu_snap_jump", name: "Snap jump (rapid concentric)", role: "fast_twitch", cue: "quick tuck-and-load, explode out", gameDayLegal: false, minLifecycle: "advanced", source: "Cal Dietz Triphasic", baseDose: "3 x 4" },
  { slug: "wu_med_ball_scoop_toss", name: "Med-ball scoop toss (rear-hip explosive)", role: "fast_twitch", setup: "6-8 lb ball, athletic stance", cue: "drive from the rear hip, ball rockets up", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey / Driveline", baseDose: "3 x 4" },
  { slug: "wu_med_ball_shot_put", name: "Med-ball rotational shot-put", role: "fast_twitch", setup: "6-8 lb ball vs wall", cue: "wind the rear hip, unleash — 100% intent, small volume", gameDayLegal: true, minLifecycle: "intermediate", source: "Cressey rotational power", baseDose: "3 x 3 per side" },
  { slug: "wu_broad_jump_prep", name: "Broad jump — 60% intent primer", role: "fast_twitch", cue: "arm swing, land soft, no maximal effort here", gameDayLegal: false, minLifecycle: "beginner", source: "Blended elite programming", baseDose: "4 x 1" },
  { slug: "wu_altitude_drop", name: "Altitude drop landing (RSI primer)", role: "fast_twitch", setup: "6-12 inch box", cue: "land stiff-ankled, absorb-hold — no rebound today", gameDayLegal: false, minLifecycle: "advanced", source: "Verkhoshansky / Dietz", baseDose: "3 x 3" },
  { slug: "wu_falling_start", name: "Falling start (10 yd)", role: "fast_twitch", cue: "fall then explode — fastest step wins", gameDayLegal: true, minLifecycle: "intermediate", source: "ALTIS / sprint canon", baseDose: "3 x 10 yds" },
  { slug: "wu_split_snap_jump", name: "Split-stance snap-switch jump", role: "fast_twitch", cue: "quick switch, land stable — power comes from the ground", stopIf: "any knee pain", gameDayLegal: false, minLifecycle: "advanced", source: "Cal Dietz", baseDose: "3 x 4 per side" },

  // Weightless Object Sport Training (WOST) — coordination, hand-eye, rhythm, no load
  { slug: "wu_tennis_ball_reaction_toss", name: "Tennis ball reaction toss", role: "weightless_coordination", setup: "facing wall or partner 6-10 ft away", cue: "catch it on the first bounce — no extra steps", gameDayLegal: true, minLifecycle: "youth", source: "WOST / Marv Marinovich", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_tennis_ball_self_rally", name: "Tennis ball self-rally", role: "weightless_coordination", setup: "small space, one hand only", cue: "bounce, catch, repeat — smooth rhythm", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_tennis_ball_one_hand_catch", name: "Tennis ball one-hand catch", role: "weightless_coordination", setup: "toss and catch with one hand", cue: "no bobbling — stick the catch", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 12 per side", beginnerDose: "2 x 8 per side", eliteDose: "1 x 12 per side" },
  { slug: "wu_tennis_ball_cross_body_catch", name: "Tennis ball cross-body catch", role: "weightless_coordination", cue: "reach across the midline — let the ribcage rotate", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_tennis_ball_clap_catch", name: "Tennis ball clap-catch", role: "weightless_coordination", cue: "toss, clap, catch — one bounce", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_scarf_juggle", name: "Scarf juggling (2-3 scarves)", role: "weightless_coordination", cue: "toss slowly, track the arc with eyes", gameDayLegal: true, minLifecycle: "youth", source: "WOST / Ido Portal", baseDose: "3 x 30 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_scarf_cross_body_catch", name: "Scarf cross-body catch", role: "weightless_coordination", setup: "Stand tall with one light silk/juggling scarf (or a light cloth napkin) held in your RIGHT hand at hip level. Feet shoulder-width, hips facing forward — they stay facing forward the entire drill.", cue: "Toss the scarf up and across your body toward your LEFT shoulder so it floats above head height, then let it fall. Reach across your midline and catch it in your LEFT hand before it drops below your waist. Immediately toss it back across to the RIGHT and catch with the RIGHT hand. That is 1 rep per side. Keep hips square — only the arms and ribcage rotate. Slow, smooth, no missed catches.", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 sets x 8 catches per side", beginnerDose: "2 sets x 5 catches per side", eliteDose: "1 set x 8 catches per side" },
  { slug: "wu_scarf_toss_and_move", name: "Scarf toss and move under", role: "weightless_coordination", cue: "toss high, shuffle under it, catch at the peak", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 6", beginnerDose: "2 x 4", eliteDose: "1 x 6" },
  { slug: "wu_scarf_one_hand_snatch", name: "Scarf one-hand snatch", role: "weightless_coordination", cue: "snatch it out of the air with one hand — quick exchange", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 8 per side", beginnerDose: "2 x 5 per side", eliteDose: "1 x 8 per side" },
  { slug: "wu_balloon_keep_up", name: "Balloon keep-up", role: "weightless_coordination", setup: "hand or forearm only", cue: "keep it alive with minimal force — read the float", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 45 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 45 sec" },
  { slug: "wu_balloon_hand_switch", name: "Balloon hand-switch keep-up", role: "weightless_coordination", cue: "alternate hands, no double taps", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_balloon_partner_volley", name: "Balloon partner volley", role: "weightless_coordination", setup: "with a partner, no spiking", cue: "soft, controlled, read the arc", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 45 sec", beginnerDose: "2 x 30 sec", eliteDose: "1 x 45 sec" },
  { slug: "wu_beanbag_toss_and_catch", name: "Beanbag toss and catch", role: "weightless_coordination", cue: "catch it soft — no sound on landing", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 12", beginnerDose: "2 x 8", eliteDose: "1 x 12" },
  { slug: "wu_beanbag_balance_walk", name: "Beanbag balance walk", role: "weightless_coordination", setup: "beanbag on top of the head", cue: "tall posture, walk heel-to-toe", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 20 yds", beginnerDose: "2 x 10 yds", eliteDose: "1 x 20 yds" },
  { slug: "wu_beanbag_foot_flip", name: "Beanbag foot flip", role: "weightless_coordination", cue: "flip it up with the foot, catch it with the same-side hand", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 6 per side", beginnerDose: "2 x 4 per side", eliteDose: "1 x 6 per side" },
  { slug: "wu_reaction_drop_catch", name: "Reaction drop-catch", role: "weightless_coordination", setup: "partner drops the ball without warning", cue: "explode the hand — catch before the second bounce", gameDayLegal: true, minLifecycle: "youth", source: "WOST / Marinovich", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_coin_finger_roll", name: "Coin finger roll", role: "weightless_coordination", setup: "coin on back of hand, flip and catch", cue: "quiet fingers, smooth arc", gameDayLegal: true, minLifecycle: "beginner", source: "WOST", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_rhythm_ball_tap", name: "Rhythm ball tap", role: "weightless_coordination", setup: "bounce a tennis ball to a metronome or beat", cue: "same spot every bounce — no chasing", gameDayLegal: true, minLifecycle: "beginner", source: "WOST", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_mini_frisbee_toss", name: "Mini frisbee toss and catch", role: "weightless_coordination", cue: "soft throw, read the spin, clean catch", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 10", beginnerDose: "2 x 6", eliteDose: "1 x 10" },
  { slug: "wu_mini_frisbee_roll_catch", name: "Mini frisbee roll catch", role: "weightless_coordination", cue: "roll it, let it spin, catch it on the return", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 8", beginnerDose: "2 x 5", eliteDose: "1 x 8" },
  { slug: "wu_mirror_me_ball_toss", name: "Mirror-me partner ball toss", role: "weightless_coordination", setup: "face partner, mirror their movement as they toss", cue: "read the release, catch, mirror the next throw", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },
  { slug: "wu_light_bat_shadow_tap", name: "Light bat shadow tap", role: "weightless_coordination", setup: "light bat or dowel", cue: "tap the end of the bat to the wall with the eyes tracking", gameDayLegal: true, minLifecycle: "youth", source: "WOST / Arakawa", baseDose: "2 x 10 per side", beginnerDose: "2 x 6 per side", eliteDose: "1 x 10 per side" },
  { slug: "wu_shuttle_tap_up", name: "Badminton shuttle tap-up", role: "weightless_coordination", cue: "tap the shuttle straight up — no sideways drift", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 20 sec", beginnerDose: "2 x 15 sec", eliteDose: "1 x 20 sec" },
  { slug: "wu_partner_alternating_catch", name: "Partner alternating rapid catch", role: "weightless_coordination", setup: "two balls, two partners", cue: "catch one, toss the other — no gaps", gameDayLegal: true, minLifecycle: "youth", source: "WOST", baseDose: "2 x 30 sec", beginnerDose: "2 x 20 sec", eliteDose: "1 x 30 sec" },

  // Movement bridge
  { slug: "wu_dry_swing_progressive", name: "Progressive dry swings (intent ladder)", role: "movement_bridge", cue: "swing 1 at 50%, swing 2 at 75%, swing 3 at 100% — feel the elastic snap", gameDayLegal: true, minLifecycle: "youth", source: "Arakawa / Cressey rotational", baseDose: "3 x 3 per side" },
  { slug: "wu_mirror_throw_prep", name: "Dry throw arm-swing prep", role: "movement_bridge", cue: "half-speed rehearsal — pattern first, intent last", gameDayLegal: true, minLifecycle: "youth", source: "Driveline arm-care", baseDose: "2 x 6" },
  { slug: "wu_shuffle_change_direction", name: "Shuffle → change of direction", role: "movement_bridge", cue: "athletic stance, react like a defender", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich footwork", baseDose: "2 x 20 sec each way" },
  { slug: "wu_crossover_run", name: "Crossover run (open the hip)", role: "movement_bridge", cue: "cross over long, don't hop", gameDayLegal: true, minLifecycle: "beginner", source: "Track canon", baseDose: "2 x 15 yds each way" },

  // Arm care
  { slug: "wu_jband_full", name: "J-Band full arm-care chart", role: "arm_care", setup: "J-Band anchored at chest height", cue: "control the eccentric — every rep", stopIf: "shoulder sharp pain", gameDayLegal: true, minLifecycle: "youth", source: "Alan Jaeger / Driveline", baseDose: "full chart @ 1 x 10 each" },
  { slug: "wu_crossover_symmetry_full", name: "Crossover Symmetry activation chart", role: "arm_care", cue: "smooth reps, exhale on pull", gameDayLegal: true, minLifecycle: "youth", source: "Cressey / ASMI", baseDose: "full chart @ 1 x 10 each" },
  { slug: "wu_prone_tyw", name: "Prone T / Y / W", role: "arm_care", cue: "thumbs up, squeeze the shoulder blades", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 8 each letter" },
  { slug: "wu_er_at_90", name: "External rotation at 90°", role: "arm_care", setup: "band anchored elbow height", cue: "elbow high, slow eccentric", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey / ASMI", baseDose: "2 x 12 per side" },
  { slug: "wu_scap_pushup", name: "Scapular push-up", role: "arm_care", cue: "protract/retract only — no elbow bend", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 10" },
  { slug: "wu_face_pull_band", name: "Band face pull", role: "arm_care", setup: "band at eye level", cue: "elbows high, pull the band apart, external rotate", gameDayLegal: true, minLifecycle: "youth", source: "Cressey", baseDose: "2 x 12" },
  { slug: "wu_forearm_pump", name: "Forearm flexor/extensor pump", role: "arm_care", cue: "band or light weight, high reps to flush", gameDayLegal: true, minLifecycle: "youth", source: "Driveline recovery", baseDose: "1 x 20 each direction" },
];

// ─── Dose selector ──────────────────────────────────────────────────────────
export function doseFor(drill: WarmupDrill, lifecycle: LifecycleClass): string {
  if (lifecycle === "youth" || lifecycle === "beginner") return drill.beginnerDose ?? drill.baseDose;
  if (lifecycle === "elite") return drill.eliteDose ?? drill.baseDose;
  return drill.baseDose;
}

// ─── Templates ──────────────────────────────────────────────────────────────
const TEMPLATES: Record<WarmupContext, WarmupRole[]> = {
  game_day: [
    "breathwork", "tissue_prep", "cars", "fascial_rotation",
    "activation", "weightless_coordination", "neural_priming", "arm_care", "movement_bridge",
  ],
  in_season_practice: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "neural_priming", "fast_twitch", "movement_bridge", "arm_care",
  ],
  in_season_default: [
    "breathwork", "cars", "fascial_rotation", "activation",
    "weightless_coordination", "neural_priming", "arm_care",
  ],
  speed_day: [
    "tissue_prep", "cars", "mobility_joint", "activation",
    "weightless_coordination", "neural_priming", "fast_twitch", "fast_twitch", "movement_bridge",
  ],
  lift_day: [
    "breathwork", "tissue_prep", "cars", "mobility_joint",
    "activation", "weightless_coordination", "stability", "neural_priming", "fast_twitch",
  ],
  // Throwing days: arm care is OWNED BY THE THROWING BLOCK (EASS band prep + cooldown).
  // The warmup does NOT include arm_care on throwing days — that keeps arm care to exactly
  // one exposure per day. See ArmCareBudgetContext.
  throwing_day: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "movement_bridge",
  ],
  hitting_day: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "fast_twitch", "movement_bridge",
  ],
  offseason_extended: [
    "breathwork", "tissue_prep", "tissue_prep", "cars", "cars",
    "fascial_rotation", "mobility_joint", "mobility_joint", "activation", "stability",
    "weightless_coordination", "weightless_coordination", "neural_priming",
    "fast_twitch", "fast_twitch", "movement_bridge", "arm_care",
  ],
  recovery_day: [
    "breathwork", "tissue_prep", "cars", "mobility_joint", "activation",
  ],
  travel_day: [
    "breathwork", "cars", "mobility_joint", "activation",
    "weightless_coordination",
  ],
  default: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "neural_priming", "fast_twitch",
  ],
};

/**
 * Youth and beginner lifecycles get extra weightless coordination exposure
 * to maximize hand-eye / rhythm development before strength training age.
 * Elite gets only the single canonical slot so fast-twitch windows stay clean.
 */
function templateFor(context: WarmupContext, lifecycle: LifecycleClass): WarmupRole[] {
  const base = TEMPLATES[context] ?? TEMPLATES.default;
  const rank: Record<LifecycleClass, number> = { youth: 0, beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
  if (rank[lifecycle] > 1) return base;
  const out = [...base];
  const idx = out.indexOf("weightless_coordination");
  if (idx !== -1) out.splice(idx + 1, 0, "weightless_coordination", "weightless_coordination");
  else if (context !== "recovery_day") {
    const activationIdx = out.indexOf("activation");
    if (activationIdx !== -1) out.splice(activationIdx + 1, 0, "weightless_coordination", "weightless_coordination");
  }
  return out;
}

function pickForRole(role: WarmupRole, lifecycle: LifecycleClass, gameDay: boolean, seed: number): WarmupDrill | null {
  const rank: Record<LifecycleClass, number> = { youth: 0, beginner: 1, intermediate: 2, advanced: 3, elite: 4 };
  const pool = WARMUP_LIBRARY.filter((d) => {
    if (d.role !== role) return false;
    if (rank[lifecycle] < rank[d.minLifecycle]) return false;
    if (gameDay && !d.gameDayLegal) return false;
    return true;
  });
  if (pool.length === 0) return null;
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}

export interface BuildWarmupInput {
  readonly context: WarmupContext;
  readonly lifecycle: LifecycleClass;
  readonly gameDay: boolean;
  readonly daySeed?: number;
  /** When true, strip any arm_care role picks. Used when the throwing block already owns arm care. */
  readonly suppressArmCare?: boolean;
}

export interface BuiltWarmupDrill {
  readonly slug: string;
  readonly name: string;
  readonly role: WarmupRole;
  readonly setup?: string;
  readonly dosage: string;
  readonly cue?: string;
  readonly stopIf?: string;
  readonly source: string;
  readonly guide?: MovementGuide;
}

export interface BuiltWarmup {
  readonly context: WarmupContext;
  readonly drills: ReadonlyArray<BuiltWarmupDrill>;
  readonly estMinutes: number;
}

export function buildWarmup(input: BuildWarmupInput): BuiltWarmup {
  const roles = templateFor(input.context, input.lifecycle).filter(
    (r) => !(input.suppressArmCare && r === "arm_care"),
  );
  const seedBase = input.daySeed ?? 0;
  const seen = new Set<string>();
  const drills: BuiltWarmupDrill[] = [];
  roles.forEach((role, i) => {
    const seed = seedBase + i * 7 + role.length * 3;
    let pick = pickForRole(role, input.lifecycle, input.gameDay, seed);
    let attempt = 1;
    while (pick && seen.has(pick.slug) && attempt < 6) {
      pick = pickForRole(role, input.lifecycle, input.gameDay, seed + attempt * 11);
      attempt++;
    }
    if (!pick || seen.has(pick.slug)) return;
    seen.add(pick.slug);
    drills.push({
      slug: pick.slug,
      name: pick.name,
      role: pick.role,
      setup: pick.setup,
      dosage: doseFor(pick, input.lifecycle),
      cue: pick.cue,
      stopIf: pick.stopIf,
      source: pick.source,
      guide: guideFor(pick.slug) ?? guideFor(pick.name) ?? undefined,
    });
  });
  const est = Math.max(8, Math.round((drills.length * 90) / 60));
  return { context: input.context, drills, estMinutes: est };
}

// ─── Context resolver ───────────────────────────────────────────────────────
export interface ResolveContextInput {
  readonly seasonPhase: "off" | "pre" | "in" | "post" | null | undefined;
  readonly isGameDay: boolean;
  readonly isPracticeDay: boolean;
  readonly isTravelDay: boolean;
  readonly isRecoveryDay: boolean;
  readonly modalityBias?: "speed" | "lift" | "throwing" | "hitting" | null;
}

export function resolveWarmupContext(input: ResolveContextInput): WarmupContext {
  if (input.isGameDay) return "game_day";
  if (input.isRecoveryDay) return "recovery_day";
  if (input.isTravelDay) return "travel_day";
  if (input.modalityBias === "speed") return "speed_day";
  if (input.modalityBias === "lift") return "lift_day";
  if (input.modalityBias === "throwing") return "throwing_day";
  if (input.modalityBias === "hitting") return "hitting_day";
  if (input.seasonPhase === "off") return "offseason_extended";
  if (input.seasonPhase === "in") {
    return input.isPracticeDay ? "in_season_practice" : "in_season_default";
  }
  return "default";
}

export function lifecycleFor(band: string | null | undefined, liftingAgeYears: number | null): LifecycleClass {
  if (band === "u10" || band === "u12") return "youth";
  if (band === "u14") return "beginner";
  if (liftingAgeYears === null) return "beginner";
  if (liftingAgeYears >= 8) return "elite";
  if (liftingAgeYears >= 4) return "advanced";
  if (liftingAgeYears >= 2) return "intermediate";
  if (liftingAgeYears >= 1) return "beginner";
  return "youth";
}
