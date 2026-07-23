/**
 * Elite Warmup Library — fascial / ECM / fast-twitch / mobility / activation.
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
 *
 * Every drill scales from beginner to pro via a dose selector — no athlete is
 * blocked; intensity is expressed in volume, tempo, and complexity.
 */

export type WarmupRole =
  | "breathwork"
  | "tissue_prep"        // foam roll, ECM hydration, joint capsule prep
  | "fascial_rotation"   // Anatomy Trains spirals, spinal waves
  | "cars"               // Controlled Articular Rotations (FRC)
  | "mobility_joint"     // 90/90, cossacks, world's greatest stretch
  | "activation"         // mini-band, glute bridges, dead-bug
  | "stability"          // Copenhagen, Pallof, single-leg reach
  | "neural_priming"     // low-amplitude reactive prep
  | "fast_twitch"        // pogos, snap jumps, reactive bounds
  | "movement_bridge"    // sport-pattern rehearsal
  | "arm_care";          // J-Band, crossover symmetry, prone T/Y/W

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
  readonly minLifecycle: LifecycleClass; // beginners can do everything at/above this bar
  readonly source: string;
  /** Dose format: `${sets} x ${reps}` OR `${duration}`. Selector adapts by class. */
  readonly baseDose: string;
  /** Beginner-friendly dose override (fewer reps, slower tempo). */
  readonly beginnerDose?: string;
  /** Elite-facing dose (higher intent, shorter contacts). */
  readonly eliteDose?: string;
}

// ─── Library ────────────────────────────────────────────────────────────────
export const WARMUP_LIBRARY: WarmupDrill[] = [
  // Breathwork (opens ribcage, primes diaphragm, downshifts CNS pre-load)
  { slug: "wu_crocodile_breathing", name: "Crocodile breathing (prone diaphragm reset)", role: "breathwork", setup: "prone, forehead on hands", cue: "expand ribs 360°, exhale twice as long", gameDayLegal: true, minLifecycle: "youth", source: "DNS / PRI", baseDose: "8 slow breaths" },
  { slug: "wu_9020_reset", name: "90/90 breathing reset", role: "breathwork", setup: "back on floor, feet on wall, hips/knees 90°", cue: "ribs down, exhale fully before inhaling", gameDayLegal: true, minLifecycle: "youth", source: "PRI", baseDose: "6 breaths" },

  // Tissue prep / ECM hydration
  { slug: "wu_foam_roll_tspine", name: "T-spine foam roll extensions", role: "tissue_prep", setup: "roller under mid-back", cue: "small ranges, exhale into extension", stopIf: "pinch or sharp pain", gameDayLegal: true, minLifecycle: "youth", source: "Kelly Starrett", baseDose: "8 slow reps" },
  { slug: "wu_lacrosse_ball_pec", name: "Lacrosse ball pec minor pin", role: "tissue_prep", setup: "ball against wall on pec minor", cue: "search-hold-move — arm slow figure-8", gameDayLegal: true, minLifecycle: "beginner", source: "Kelly Starrett", baseDose: "30-45 sec per side" },
  { slug: "wu_lacrosse_ball_glute", name: "Lacrosse ball glute pin-and-stretch", role: "tissue_prep", cue: "find a hotspot, then flex/extend hip", gameDayLegal: true, minLifecycle: "beginner", source: "Ready State", baseDose: "45 sec per side" },
  { slug: "wu_barefoot_towel_scrunch", name: "Barefoot towel scrunch (foot fascia)", role: "tissue_prep", setup: "towel under bare foot", cue: "drag toward you with toes — arch stays lifted", gameDayLegal: true, minLifecycle: "youth", source: "KOT / foot restoration", baseDose: "30 sec per foot" },
  { slug: "wu_calf_softball_pin", name: "Soleus ball pin (calf ECM hydration)", role: "tissue_prep", cue: "pin, then dorsiflex/plantarflex the ankle", gameDayLegal: true, minLifecycle: "beginner", source: "FRC tissue prep", baseDose: "45 sec per side" },

  // Fascial rotation — Anatomy Trains inspired
  { slug: "wu_spinal_wave_standing", name: "Standing spinal wave", role: "fascial_rotation", cue: "sequence segment by segment — no muscling", gameDayLegal: true, minLifecycle: "beginner", source: "Ido Portal", baseDose: "6 reps each direction", beginnerDose: "4 reps each direction" },
  { slug: "wu_arm_line_spiral", name: "Arm-line fascial spiral", role: "fascial_rotation", setup: "half-kneeling", cue: "reach across body, let ribcage rotate through", gameDayLegal: true, minLifecycle: "youth", source: "Anatomy Trains", baseDose: "6 per side" },
  { slug: "wu_thoracic_windmill", name: "Thoracic windmill (side-lying open book)", role: "fascial_rotation", setup: "side-lying, knees stacked at 90°", cue: "reach long, exhale into the twist", gameDayLegal: true, minLifecycle: "youth", source: "DNS / Cressey", baseDose: "8 per side" },
  { slug: "wu_thread_the_needle_slow", name: "Thread-the-needle slow flow", role: "fascial_rotation", cue: "quadruped rotate — chase length not depth", gameDayLegal: true, minLifecycle: "youth", source: "Ido Portal", baseDose: "6 per side" },
  { slug: "wu_lateral_line_reach", name: "Lateral line reach + side bend", role: "fascial_rotation", cue: "long from foot to fingertip — feel the whole side stretch", gameDayLegal: true, minLifecycle: "youth", source: "Anatomy Trains", baseDose: "5 per side" },
  { slug: "wu_medball_rot_toss_wall", name: "Med-ball rotational toss (fascial spring)", role: "fascial_rotation", setup: "6-8 lb ball vs wall", cue: "load the back hip, let fascia snap through", stopIf: "any rib/oblique tweak", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey rotational library", baseDose: "3 x 4 per side", beginnerDose: "2 x 3 per side", eliteDose: "3 x 5 per side max intent" },

  // CARs — Functional Range Conditioning
  { slug: "wu_hip_cars", name: "Hip CARs (Controlled Articular Rotations)", role: "cars", cue: "biggest circle you own — no compensations", gameDayLegal: true, minLifecycle: "beginner", source: "FRC", baseDose: "2 per direction per side" },
  { slug: "wu_shoulder_cars", name: "Shoulder CARs", role: "cars", cue: "full end-range, no rib flare", gameDayLegal: true, minLifecycle: "beginner", source: "FRC", baseDose: "2 per direction per side" },
  { slug: "wu_spine_cars", name: "Segmental spine CARs", role: "cars", cue: "cat-cow then side bend then rotation — one segment at a time", gameDayLegal: true, minLifecycle: "intermediate", source: "FRC", baseDose: "3 slow reps" },
  { slug: "wu_ankle_cars", name: "Ankle CARs (seated)", role: "cars", cue: "maximum circle, keep shin still", gameDayLegal: true, minLifecycle: "youth", source: "FRC", baseDose: "5 per direction per side" },
  { slug: "wu_wrist_cars", name: "Wrist CARs", role: "cars", cue: "big circles, elbow locked", gameDayLegal: true, minLifecycle: "youth", source: "FRC", baseDose: "5 per direction per side" },
  { slug: "wu_scapular_cars", name: "Scapular CARs (elevation/depression/pro/retract)", role: "cars", cue: "trace a square with the shoulder blade only", gameDayLegal: true, minLifecycle: "beginner", source: "FRC / Cressey", baseDose: "5 per direction per side" },

  // Mobility / joint
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

  // Neural priming — low amplitude
  { slug: "wu_ankle_bounce_series", name: "Ankle bounce series (stiff ankles)", role: "neural_priming", cue: "ground is hot, minimum contact time", gameDayLegal: true, minLifecycle: "youth", source: "Bosch / Verkhoshansky", baseDose: "3 x 15 sec" },
  { slug: "wu_line_hops_forward_back", name: "Line hops forward-back", role: "neural_priming", cue: "quick feet, both directions clean", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich", baseDose: "3 x 20 sec" },
  { slug: "wu_line_hops_lateral", name: "Line hops lateral", role: "neural_priming", cue: "stiff ankles, don't drift", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich", baseDose: "3 x 20 sec" },
  { slug: "wu_a_skip", name: "A-skip", role: "neural_priming", cue: "tall posture, front-side mechanics — knee up, toe up", gameDayLegal: true, minLifecycle: "youth", source: "Track & field canon", baseDose: "2 x 20 yards" },
  { slug: "wu_b_skip", name: "B-skip", role: "neural_priming", cue: "same as A, but paw the ground down and back", gameDayLegal: true, minLifecycle: "intermediate", source: "Track & field canon", baseDose: "2 x 20 yards" },
  { slug: "wu_wickets_low", name: "Low wicket runs (rhythm)", role: "neural_priming", setup: "6-8 inch hurdles evenly spaced", cue: "tall, cyclical, don't reach", gameDayLegal: true, minLifecycle: "intermediate", source: "Alfred Chan / ALTIS", baseDose: "3 x through" },
  { slug: "wu_reaction_ball_wall", name: "Reaction ball vs wall", role: "neural_priming", cue: "athletic stance, hands ready — read early", gameDayLegal: true, minLifecycle: "beginner", source: "Marinovich reflex training", baseDose: "3 x 20 sec" },

  // Fast-twitch primer — CNS wake-up
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

  // Movement bridge — sport pattern rehearsal
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

// ─── Template composer ──────────────────────────────────────────────────────
/**
 * Ordered role plans per context — deterministic, additive, and legibly
 * elite. Roles map to picks from the library filtered by legality.
 */
const TEMPLATES: Record<WarmupContext, WarmupRole[]> = {
  game_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "activation",
    "neural_priming",
    "arm_care",
    "movement_bridge",
  ],
  in_season_practice: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "neural_priming",
    "fast_twitch",
    "movement_bridge",
    "arm_care",
  ],
  in_season_default: [
    "breathwork",
    "cars",
    "fascial_rotation",
    "activation",
    "neural_priming",
    "arm_care",
  ],
  speed_day: [
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation",
    "neural_priming",
    "fast_twitch",
    "fast_twitch",
    "movement_bridge",
  ],
  lift_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation",
    "stability",
    "neural_priming",
    "fast_twitch",
  ],
  throwing_day: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "arm_care",
    "arm_care",
    "movement_bridge",
  ],
  hitting_day: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "fast_twitch",
    "movement_bridge",
  ],
  offseason_extended: [
    "breathwork",
    "tissue_prep",
    "tissue_prep",
    "cars",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "mobility_joint",
    "activation",
    "stability",
    "neural_priming",
    "fast_twitch",
    "fast_twitch",
    "movement_bridge",
    "arm_care",
  ],
  recovery_day: [
    "breathwork",
    "tissue_prep",
    "cars",
    "mobility_joint",
    "activation",
  ],
  travel_day: [
    "breathwork",
    "cars",
    "mobility_joint",
    "activation",
    "arm_care",
  ],
  default: [
    "tissue_prep",
    "cars",
    "fascial_rotation",
    "mobility_joint",
    "activation",
    "neural_priming",
    "fast_twitch",
  ],
};

// Deterministic per-role picks — cycles through the pool by role hash so
// different athletes/days don't see the exact same drill order every time.
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
}

export interface BuiltWarmup {
  readonly context: WarmupContext;
  readonly drills: ReadonlyArray<BuiltWarmupDrill>;
  readonly estMinutes: number;
}

export function buildWarmup(input: BuildWarmupInput): BuiltWarmup {
  const roles = TEMPLATES[input.context] ?? TEMPLATES.default;
  const seedBase = input.daySeed ?? 0;
  const seen = new Set<string>();
  const drills: BuiltWarmupDrill[] = [];
  roles.forEach((role, i) => {
    // Rotate seed per role occurrence so repeated roles pick different drills.
    const seed = seedBase + i * 7 + role.length * 3;
    let pick = pickForRole(role, input.lifecycle, input.gameDay, seed);
    // Avoid duplicates within a single warm-up.
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
    });
  });
  // Estimate ~90 sec per drill on average.
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
