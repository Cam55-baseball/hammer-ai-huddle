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
  | "ladder_quickness"
  | "single_leg_twitch"
  | "ground_force"
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

/** Movement axis — the twitch layer is single-leg dominant by law. */
export type WarmupAxis = "single_leg" | "bilateral";

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
  /** Equipment tokens this drill requires. Omitted → nothing but a floor. */
  readonly equipment?: readonly string[];
  /** Equipment-free sibling used when the athlete lacks the gear above. */
  readonly fallbackSlug?: string;
  /** Single-leg vs bilateral. Only meaningful for twitch roles. */
  readonly axis?: WarmupAxis;
  /** Body regions loaded — used to veto against reported injury regions. */
  readonly regions?: readonly string[];
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
  { slug: "wu_pogo_double", name: "Pogo hops (double-leg)", role: "fast_twitch", axis: "bilateral", regions: ["ankle", "calf", "achilles"], setup: "Stand tall on a firm, flat surface with feet hip-width, shoes on. Arms bent at your sides — they stay quiet the whole set.", cue: "Bounce straight up and down off the balls of both feet, keeping the knees almost locked so the ankle does the work. The ground is hot — get off it fast. Each contact should sound short and crisp, not a thud. Stop the set the moment contacts start getting slow or loud.", stopIf: "shin or achilles pain", gameDayLegal: true, minLifecycle: "youth", source: "Verkhoshansky", baseDose: "3 x 12 contacts", beginnerDose: "2 x 8 contacts" },
  { slug: "wu_pogo_single", name: "Single-leg pogo (symmetry)", role: "fast_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles", "knee"], setup: "Balance on one foot, other knee bent so the free foot is behind you. Fingertips can touch a wall for balance the first few reps.", cue: "Bounce in place on that one foot with a stiff ankle and a nearly straight knee. Hold the same spot on the floor — no drifting. Count the reps on each side and make the second side match the first in height and rhythm. If one side is clearly lower, that is the side telling you where your ground force is leaking.", stopIf: "any strain", gameDayLegal: true, minLifecycle: "intermediate", source: "Verkhoshansky", baseDose: "3 x 6 per side" },
  { slug: "wu_pogo_lateral", name: "Lateral pogo (skater rhythm)", role: "fast_twitch", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Stand tall with about 6 feet of clear floor to each side.", cue: "Hop sideways foot to foot, covering roughly one foot of ground each hop. Land on the ball of the foot with a stiff ankle and immediately push back the other way — no pausing between hops. Chest stays up, hips stay level.", gameDayLegal: true, minLifecycle: "intermediate", source: "KOT / Bosch", baseDose: "3 x 10 per side" },
  { slug: "wu_snap_jump", name: "Snap jump (rapid concentric)", role: "fast_twitch", axis: "bilateral", regions: ["knee", "hip"], setup: "Feet hip-width in an athletic stance with room overhead.", cue: "Drop fast into a quarter squat and reverse it instantly into a jump — the down and the up are one motion, not two. Land soft, reset your stance, then go again. Quality over count: end the set when the reversal stops feeling snappy.", gameDayLegal: false, minLifecycle: "advanced", source: "Cal Dietz Triphasic", baseDose: "3 x 4" },
  { slug: "wu_med_ball_scoop_toss", name: "Med-ball scoop toss (rear-hip explosive)", role: "fast_twitch", axis: "bilateral", equipment: ["med_ball"], fallbackSlug: "wu_sl_broad_hop_stick", regions: ["hip", "back"], setup: "6-8 lb med ball held low between the knees in an athletic stance, facing open space or a high wall.", cue: "Dip the hips, then rip them open and throw the ball straight up and forward like you are scooping it out of the ground. The arms are ropes — the hips do the work. Reset fully between reps.", gameDayLegal: true, minLifecycle: "beginner", source: "Cressey / Driveline", baseDose: "3 x 4" },
  { slug: "wu_med_ball_shot_put", name: "Med-ball rotational shot-put", role: "fast_twitch", axis: "bilateral", equipment: ["med_ball", "wall"], fallbackSlug: "wu_dry_swing_burst", regions: ["hip", "back", "shoulder"], setup: "6-8 lb med ball at the chest, standing side-on about 8 feet from a solid wall.", cue: "Load into the back hip, then turn the back hip through and shove the ball into the wall at full intent. Small volume, maximum quality — every throw is meant to be your hardest.", gameDayLegal: true, minLifecycle: "intermediate", source: "Cressey rotational power", baseDose: "3 x 3 per side" },
  { slug: "wu_broad_jump_prep", name: "Broad jump — 60% intent primer", role: "fast_twitch", axis: "bilateral", regions: ["knee", "hip", "hamstring"], setup: "Clear 10-12 feet of flat ground in front of you.", cue: "Swing the arms back, hinge the hips, and jump forward at about 60% of your best — this is a primer, not a test. Land in an athletic stance and hold the landing for a beat before walking back.", gameDayLegal: false, minLifecycle: "beginner", source: "Blended elite programming", baseDose: "4 x 1" },
  { slug: "wu_altitude_drop", name: "Altitude drop landing (RSI primer)", role: "fast_twitch", axis: "bilateral", equipment: ["box"], fallbackSlug: "wu_sl_curb_drop_stick", regions: ["knee", "ankle", "achilles"], setup: "Stand on a 6-12 inch box or sturdy step with the toes at the edge.", cue: "Step off — do not jump off — and land on both feet with stiff ankles and quiet knees. Absorb and freeze for two seconds. There is no rebound today; the goal is to teach the leg to accept force fast.", gameDayLegal: false, minLifecycle: "advanced", source: "Verkhoshansky / Dietz", baseDose: "3 x 3" },
  { slug: "wu_falling_start", name: "Falling start (10 yd)", role: "fast_twitch", axis: "single_leg", regions: ["hamstring", "calf"], setup: "Stand tall at one end of 15 yards of clear, flat ground.", cue: "Stay straight as a board and let yourself tip forward from the ankles. The instant you feel like you would fall, punch one foot into the ground and sprint 10 yards. Fastest first step wins. Walk all the way back before the next rep.", gameDayLegal: true, minLifecycle: "intermediate", source: "ALTIS / sprint canon", baseDose: "3 x 10 yds" },
  { slug: "wu_split_snap_jump", name: "Split-stance snap-switch jump", role: "fast_twitch", axis: "single_leg", regions: ["knee", "hip", "groin"], setup: "Start in a split stance — one foot forward, one back, both knees soft.", cue: "Jump just high enough to switch the feet in the air and land back in a split stance. Land quiet, immediately switch again. Power comes from pushing the ground away, not from lifting the knees.", stopIf: "any knee pain", gameDayLegal: false, minLifecycle: "advanced", source: "Cal Dietz", baseDose: "3 x 4 per side" },

  // ── Ladder quickness (Marinovich reflex canon / Zone28 · Pow3R Plus repeat bursts)
  { slug: "wu_ladder_one_in_each", name: "Ladder — one foot in each box", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_one_in_each", regions: ["ankle", "calf"], setup: "Lay an agility ladder flat on level ground and stand at one end with feet hip-width, weight on the balls of the feet, hands ready in front of your chest.", cue: "Run the ladder placing exactly one foot in every box — right, left, right, left — all the way to the far end. Stay tall, look up the ladder rather than down at your feet, and pump the arms in rhythm with the feet. Ground contacts should be light and fast, not stomps. Walk back to the start between runs and reset your posture before you go again.", stopIf: "ankle roll, shin pain, or feet losing their rhythm two runs in a row", gameDayLegal: true, minLifecycle: "youth", source: "Marv Marinovich footwork canon", baseDose: "4 runs — walk back between", beginnerDose: "3 runs — walk back between", eliteDose: "5 runs at maximum turnover" },
  { slug: "wu_ladder_two_in_each", name: "Ladder — two feet in each box (icky rhythm)", role: "ladder_quickness", axis: "bilateral", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_two_in_each", regions: ["ankle", "calf"], setup: "Ladder flat on the ground, standing at one end in an athletic stance with knees soft.", cue: "Put both feet into each box before moving to the next — right in, left in, right out, left out. Keep the hips low and square down the ladder and do not let the feet cross. Speed comes second: hit the pattern clean twice, then push the tempo on the remaining runs.", stopIf: "pattern breaks down or the feet start clipping the rungs", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich / Zone28 footwork", baseDose: "4 runs — walk back between", beginnerDose: "3 runs", eliteDose: "5 runs, last two at max turnover" },
  { slug: "wu_ladder_lateral_shuffle", name: "Ladder — lateral in-in-out-out", role: "ladder_quickness", axis: "bilateral", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_lateral", regions: ["ankle", "groin", "knee"], setup: "Stand side-on at one end of the ladder with the ladder running to your right, feet shoulder-width, hips low.", cue: "Step the lead foot in, the trail foot in, then the lead foot out beyond the ladder and the trail foot out — that is one box. Travel sideways down the whole ladder without ever turning the shoulders. Keep the chest up and the hips level; if you start bobbing up and down, slow down and reclaim the level hips. Run it down and back so both sides lead equally.", stopIf: "groin tightness or knees collapsing inward", gameDayLegal: true, minLifecycle: "beginner", source: "Marinovich lateral quickness", baseDose: "3 trips down and back", beginnerDose: "2 trips down and back", eliteDose: "4 trips down and back" },
  { slug: "wu_ladder_single_leg_hop_through", name: "Ladder — single-leg hop through", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_sl_hop", regions: ["ankle", "calf", "achilles", "knee"], setup: "Stand on one foot at the end of the ladder, other knee bent behind you, arms ready to help with rhythm.", cue: "Hop forward on that one foot, landing once in each box, all the way to the end. Land on the ball of the foot with a stiff ankle and get off the ground instantly — you are looking for a machine-gun rhythm, not big hops. Complete the run on one leg, walk back, then run it on the other leg. Both sides get the same number of runs, always.", stopIf: "any achilles, shin, or knee pain, or the landing side collapsing inward", gameDayLegal: false, minLifecycle: "intermediate", source: "Marinovich / Pow3R Plus single-leg reactivity", baseDose: "3 runs per leg — walk back between", beginnerDose: "2 runs per leg", eliteDose: "4 runs per leg at max turnover" },
  { slug: "wu_ladder_in_out_hops", name: "Ladder — single-leg in-out zig hops", role: "ladder_quickness", axis: "single_leg", equipment: ["ladder"], fallbackSlug: "wu_chalk_line_sl_zig", regions: ["ankle", "knee", "groin"], setup: "Stand on one foot beside the first box of the ladder.", cue: "Hop diagonally into the box, then diagonally out to the other side of the ladder, then back in — zig-zagging down the ladder on that single leg. Land on the ball of the foot each time and keep the knee tracking over the toe. This is the drill that teaches the ankle and hip to redirect force sideways at speed. Same number of runs on each leg.", stopIf: "knee caving in, ankle pain, or any landing you cannot control", gameDayLegal: false, minLifecycle: "advanced", source: "Zone28 / Pow3R Plus change-of-direction priming", baseDose: "2 runs per leg", beginnerDose: "1 run per leg", eliteDose: "3 runs per leg" },
  { slug: "wu_chalk_line_one_in_each", name: "Line pattern — one foot in each space (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "calf"], setup: "Mark 8-10 short lines about 18 inches apart on the ground using chalk, tape, sticks, socks, or shoes — anything that gives you a visual box. Stand at one end in an athletic stance.", cue: "Run the pattern putting exactly one foot in each space — right, left, right, left. Look ahead, stay tall on the balls of the feet, and pump the arms in rhythm. The markers are only a guide: what matters is fast, light, accurate feet. Walk back between runs.", stopIf: "ankle roll, shin pain, or rhythm falling apart", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich footwork — equipment-free variant", baseDose: "4 runs — walk back between", beginnerDose: "3 runs", eliteDose: "5 runs at max turnover" },
  { slug: "wu_chalk_line_two_in_each", name: "Line pattern — two feet in each space (no ladder)", role: "ladder_quickness", axis: "bilateral", regions: ["ankle", "calf"], setup: "Mark 8-10 spaces about 18 inches apart with chalk, tape, or any flat markers. Athletic stance at one end.", cue: "Both feet touch down in each space before you move on — right in, left in, right out, left out. Hips stay low and square, feet never cross. Clean pattern first, then speed on the later runs.", gameDayLegal: true, minLifecycle: "youth", source: "Zone28 footwork — equipment-free variant", baseDose: "4 runs — walk back between", beginnerDose: "3 runs", eliteDose: "5 runs" },
  { slug: "wu_chalk_line_lateral", name: "Line pattern — lateral in-in-out-out (no ladder)", role: "ladder_quickness", axis: "bilateral", regions: ["ankle", "groin", "knee"], setup: "Mark a straight line 10-15 feet long on the ground, or use a field chalk line, a seam in the floor, or a rope.", cue: "Stand side-on with the line to your right. Step both feet across the line, then both feet back — travelling down the line sideways without turning the shoulders. Chest up, hips level, quick and quiet feet. Travel down and back so both sides lead.", stopIf: "groin tightness or knees caving in", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich lateral quickness — equipment-free variant", baseDose: "3 trips down and back", beginnerDose: "2 trips", eliteDose: "4 trips" },
  { slug: "wu_chalk_line_sl_hop", name: "Line pattern — single-leg hop through (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "calf", "achilles", "knee"], setup: "Mark 6-8 spaces about 18 inches apart, or simply use a straight line on the ground. Stand on one foot at one end.", cue: "Hop forward on that one foot, touching down once per space, all the way through. Stiff ankle, ball of the foot, off the ground immediately — quick machine-gun rhythm, not big hops. Walk back and repeat on the other leg for the same number of runs.", stopIf: "achilles, shin, or knee pain, or the landing leg collapsing", gameDayLegal: false, minLifecycle: "intermediate", source: "Pow3R Plus reactivity — equipment-free variant", baseDose: "3 runs per leg", beginnerDose: "2 runs per leg", eliteDose: "4 runs per leg" },
  { slug: "wu_chalk_line_sl_zig", name: "Line pattern — single-leg zig-zag hops (no ladder)", role: "ladder_quickness", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Use any straight line on the ground — a chalk line, floor seam, rope, or a row of markers 10-12 feet long. Stand on one foot beside one end.", cue: "Hop diagonally across the line, then diagonally back, zig-zagging down the line on that single leg. Land on the ball of the foot, knee tracking over the toe, and redirect instantly. Same number of runs on each leg.", stopIf: "knee caving in, ankle pain, or any landing you cannot control", gameDayLegal: false, minLifecycle: "advanced", source: "Zone28 change-of-direction priming — equipment-free variant", baseDose: "2 runs per leg", beginnerDose: "1 run per leg", eliteDose: "3 runs per leg" },

  // ── Single-leg twitch (the majority of the twitch layer)
  { slug: "wu_sl_line_hop_fb", name: "Single-leg line hops — forward and back", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles"], setup: "Find any line on the ground — a floor seam, chalk line, or a piece of tape. Stand on one foot just behind it.", cue: "Hop forward over the line and immediately back, over and over, for the full time. Stay on the ball of the foot with a stiff ankle and the knee only slightly bent. The line should be crossed by inches, not feet — this is about speed off the ground, not distance. Equal time on both legs.", stopIf: "shin or achilles pain, or the hops getting slow and heavy", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich reflex training", baseDose: "3 x 12 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_sl_line_hop_lateral", name: "Single-leg line hops — lateral", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "knee", "groin"], setup: "Stand on one foot beside a line on the ground, hips square, arms ready.", cue: "Hop sideways over the line and straight back, again and again. Keep the knee tracking over the toe and refuse to let it cave inward — the moment it does, the set is over. Land quiet on the ball of the foot. Equal time on both legs.", stopIf: "knee caving in, groin tightness, or ankle pain", gameDayLegal: true, minLifecycle: "beginner", source: "Marinovich reflex training", baseDose: "3 x 12 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_sl_ankle_stiffness_bounce", name: "Single-leg ankle stiffness bounce", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "calf", "achilles"], setup: "Stand on one foot on a firm surface. Fingertips may rest on a wall for balance.", cue: "Bounce in place on that foot with a near-straight knee so the ankle alone stores and returns the energy. Tiny hops, maximum speed — you are trying to make the shortest possible time on the ground. Count the contacts and match the second leg exactly.", stopIf: "achilles or shin pain", gameDayLegal: true, minLifecycle: "youth", source: "Verkhoshansky / Bosch stiffness work", baseDose: "3 x 10 contacts per leg", beginnerDose: "2 x 8 contacts per leg", eliteDose: "3 x 15 contacts per leg" },
  { slug: "wu_sl_snap_hop_stick", name: "Single-leg snap hop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "ankle", "hip"], setup: "Stand on one foot with 3-4 feet of clear space in front of you.", cue: "Dip fast into a quarter-bend and immediately hop forward a short distance on that same leg, then stick the landing completely still for two full seconds. If you have to hop or stumble to catch the landing, the hop was too big — shorten it. Same reps both legs.", stopIf: "knee pain or any landing you cannot control", gameDayLegal: false, minLifecycle: "intermediate", source: "Cal Dietz / Pow3R Plus", baseDose: "3 x 4 per leg", beginnerDose: "2 x 3 per leg", eliteDose: "3 x 5 per leg" },
  { slug: "wu_sl_broad_hop_stick", name: "Single-leg broad hop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "hip", "hamstring"], setup: "Stand on one foot with 8-10 feet of clear, flat ground ahead.", cue: "Swing the arms, hinge slightly, and hop forward on one leg at about 70% of your maximum distance. Land on the same leg and freeze — chest up, knee over toe, no wobble. Walk back between reps. Equal reps both legs, and if one side cannot stick the landing, cut the distance on both.", stopIf: "knee or hamstring pain, or repeated failed landings", gameDayLegal: false, minLifecycle: "intermediate", source: "Pow3R Plus ground-force transfer", baseDose: "3 x 3 per leg", beginnerDose: "2 x 2 per leg", eliteDose: "3 x 4 per leg" },
  { slug: "wu_sl_curb_drop_stick", name: "Single-leg curb drop and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["ankle", "knee", "achilles"], setup: "Stand on a curb, low step, or 6-8 inch surface on one foot, toes near the edge.", cue: "Step off — never jump off — and land on that same single leg with a stiff ankle and a quiet knee. Freeze the landing for two seconds before stepping back up. This teaches the leg to accept force instantly, which is exactly what a first step and a hard cut demand. Equal reps both legs.", stopIf: "any knee, achilles, or ankle pain", gameDayLegal: false, minLifecycle: "intermediate", source: "Verkhoshansky / Dietz — low-height variant", baseDose: "3 x 3 per leg", beginnerDose: "2 x 2 per leg", eliteDose: "3 x 4 per leg" },
  { slug: "wu_sl_skater_bound_stick", name: "Skater bound and stick", role: "single_leg_twitch", axis: "single_leg", regions: ["knee", "groin", "ankle"], setup: "Stand on one foot with 6-8 feet of clear space to each side.", cue: "Push off the outside of the standing foot and bound sideways onto the other foot, then hold that landing completely still for two seconds. Chest up, hips level, knee over toe. Bound back the other way. This is the exact pattern of a hard lateral break in the field.", stopIf: "knee caving in, groin pain, or unstable landings", gameDayLegal: false, minLifecycle: "intermediate", source: "Marinovich / KOT lateral power", baseDose: "3 x 4 per side", beginnerDose: "2 x 3 per side", eliteDose: "3 x 5 per side" },
  { slug: "wu_sl_split_switch_burst", name: "Split-stance switch burst", role: "single_leg_twitch", axis: "single_leg", regions: ["hip", "knee", "groin"], setup: "Start in a split stance — one foot forward, one back, both knees soft, chest tall.", cue: "Jump just high enough to switch the feet in the air, land soft in a split stance, and switch again immediately. Short, quick switches — the power comes from pushing the ground away, not from lifting the knees. Keep the torso quiet the whole set.", stopIf: "knee or groin pain", gameDayLegal: false, minLifecycle: "advanced", source: "Pow3R Plus repeat-burst method", baseDose: "3 x 6 switches", beginnerDose: "2 x 4 switches", eliteDose: "3 x 8 switches" },
  { slug: "wu_sl_march_pop", name: "Single-leg march pop (ground-force march)", role: "single_leg_twitch", axis: "single_leg", regions: ["hip", "calf", "ankle"], setup: "Stand tall with 15 yards of clear ground ahead. Arms bent at 90 degrees.", cue: "March forward slowly but punch each foot into the ground hard enough that you pop slightly off the floor each step. Knee up, toe up, tall through the spine. This is a low-cost way to teach the leg to hit the ground hard without sprinting.", stopIf: "calf or hip flexor tightness", gameDayLegal: true, minLifecycle: "youth", source: "Marinovich / ALTIS", baseDose: "3 x 15 yds", beginnerDose: "2 x 10 yds", eliteDose: "3 x 20 yds" },

  // ── Ground force (short maximal contacts — the sport is a burst sport)
  { slug: "wu_gf_wall_drive_single", name: "Wall drive — single-leg punch", role: "ground_force", axis: "single_leg", equipment: ["wall"], fallbackSlug: "wu_gf_seated_start", regions: ["hip", "calf"], setup: "Lean into a wall with both hands at shoulder height, body in a straight line from head to heel at about a 45-degree angle. One knee is driven up to hip height.", cue: "Punch the down foot into the floor and switch legs, holding the new knee up for a full second. The body line never breaks — no sagging hips, no bending at the waist. Each punch should be violent and short. Alternate legs for the prescribed count.", stopIf: "hip flexor or calf strain", gameDayLegal: true, minLifecycle: "beginner", source: "ALTIS / sprint canon", baseDose: "3 x 6 per leg", beginnerDose: "2 x 4 per leg", eliteDose: "3 x 8 per leg" },
  { slug: "wu_gf_seated_start", name: "Seated-to-sprint start (8 yd)", role: "ground_force", axis: "single_leg", regions: ["hamstring", "calf", "hip"], setup: "Sit on the ground facing 15 yards of clear, flat running space, legs out in front, hands beside your hips.", cue: "From dead still, get up and sprint 8 yards as fast as you can. Because you start with zero momentum, every bit of speed has to come from how hard you hit the ground. Walk all the way back and rest until your breathing is normal before the next rep — this is a quality drill, not conditioning.", stopIf: "any hamstring or calf grab — shut the whole set down", gameDayLegal: false, minLifecycle: "intermediate", source: "Marinovich / Zone28 start work", baseDose: "3 x 8 yds — full rest between", beginnerDose: "2 x 8 yds", eliteDose: "4 x 8 yds" },
  { slug: "wu_gf_band_resisted_step", name: "Band-resisted first step", role: "ground_force", axis: "single_leg", equipment: ["bands", "partner"], fallbackSlug: "wu_gf_seated_start", regions: ["hip", "hamstring", "calf"], setup: "Loop a long resistance band around your waist with a partner holding the other end behind you, or anchor it to a fixed post. Set up in an athletic stance with the band already under light tension.", cue: "Drive out against the band for 3-4 hard steps, pushing the ground back at a forward body angle — not standing up tall. Each step is a separate maximal effort. Walk back to the start and let the band go slack before the next rep.", stopIf: "hamstring or hip strain, or the body angle collapsing upright", gameDayLegal: false, minLifecycle: "intermediate", source: "Zone28 / Pow3R Plus resisted starts", baseDose: "4 x 4 steps", beginnerDose: "3 x 3 steps", eliteDose: "5 x 4 steps" },
  { slug: "wu_gf_repeat_burst", name: "Repeat 5-second burst (Zone28 rhythm)", role: "ground_force", axis: "single_leg", regions: ["hamstring", "calf", "hip"], setup: "Clear 20 yards of flat ground. This drill mirrors the real demand of baseball and softball: an all-out burst, then a full reset.", cue: "Sprint hard for 5 seconds — roughly 20 yards — then walk back slowly and rest a full 45 seconds before the next one. Every burst should be as fast as the first. The second a burst is noticeably slower, the set is finished, no matter how many reps are left.", stopIf: "any grab in the hamstring or calf, or a burst that is clearly slower than the first", gameDayLegal: false, minLifecycle: "intermediate", source: "Zone28 repeat-effort method", baseDose: "4 bursts — 45 sec rest between", beginnerDose: "3 bursts", eliteDose: "5 bursts" },
  { slug: "wu_gf_hip_lock_hold", name: "Sprint hip-lock hold", role: "ground_force", axis: "single_leg", regions: ["hip", "calf"], setup: "Stand tall next to a wall or post you can touch for balance.", cue: "Drive one knee up to hip height with the toe pulled up, and hold that exact sprint position for the prescribed seconds while pushing the standing foot hard into the ground. Hips stay square and level, spine tall. Switch legs. This teaches the position your body has to hold at top speed.", gameDayLegal: true, minLifecycle: "youth", source: "ALTIS posture canon", baseDose: "3 x 10 sec per leg", beginnerDose: "2 x 8 sec per leg", eliteDose: "3 x 15 sec per leg" },
  { slug: "wu_dry_swing_burst", name: "Dry-swing burst ladder", role: "ground_force", axis: "bilateral", equipment: ["bat"], fallbackSlug: "wu_gf_hip_lock_hold", regions: ["hip", "back"], setup: "Take your bat into open space with room to swing safely in every direction.", cue: "Take three swings in a row: the first at 50%, the second at 75%, the third at 100% intent. The rear hip fires first on every one. Rest 20 seconds, then repeat the ladder. This wakes the rotational burst without spending your best swings.", stopIf: "any rib, oblique, or low-back tweak", gameDayLegal: true, minLifecycle: "youth", source: "Arakawa / Cressey rotational intent", baseDose: "3 ladders of 3 swings per side", beginnerDose: "2 ladders of 3 swings per side", eliteDose: "3 ladders of 3 swings per side at full intent" },



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

// ─── Equipment law ──────────────────────────────────────────────────────────
//
// A drill is never prescribed for gear the athlete does not have. Gear-bound
// drills declare an equipment-free sibling (`fallbackSlug`); when the sibling
// is also impossible the role is skipped rather than half-shipped.
//
// Requirements for pre-existing library rows live here so the catalog rows
// above stay readable. New rows may declare `equipment` inline.
const EQUIPMENT_OVERRIDES: Record<string, { equipment: string[]; fallbackSlug?: string }> = {
  wu_foam_roll_tspine: { equipment: ["foam_roller"], fallbackSlug: "wu_tspine_open_book" },
  wu_lacrosse_ball_pec: { equipment: ["massage_ball", "wall"], fallbackSlug: "wu_serratus_wall_slide" },
  wu_lacrosse_ball_glute: { equipment: ["massage_ball"], fallbackSlug: "wu_frog_rock" },
  wu_calf_softball_pin: { equipment: ["massage_ball"], fallbackSlug: "wu_barefoot_towel_scrunch" },
  wu_medball_rot_toss_wall: { equipment: ["med_ball", "wall"], fallbackSlug: "wu_thoracic_windmill" },
  wu_miniband_lat_walk: { equipment: ["mini_band"], fallbackSlug: "wu_glute_bridge_walkout" },
  wu_miniband_monster_walk: { equipment: ["mini_band"], fallbackSlug: "wu_singleleg_glute_bridge" },
  wu_deadbug_band_press: { equipment: ["bands"], fallbackSlug: "wu_bird_dog_slow" },
  wu_pallof_press_iso: { equipment: ["bands"], fallbackSlug: "wu_split_stance_iso_hold" },
  wu_copenhagen_short_lever: { equipment: ["bench"], fallbackSlug: "wu_sl_rdl_reach" },
  wu_wickets_low: { equipment: ["hurdles"], fallbackSlug: "wu_a_skip" },
  wu_reaction_ball_wall: { equipment: ["tennis_ball", "wall"], fallbackSlug: "wu_line_hops_lateral" },
  wu_couch_stretch_active: { equipment: ["bench"], fallbackSlug: "wu_wall_hip_flexor_slide" },
  wu_tennis_ball_reaction_toss: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_self_rally: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_one_hand_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_cross_body_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_tennis_ball_clap_catch: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_rhythm_ball_tap: { equipment: ["tennis_ball"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_reaction_drop_catch: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_juggle: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_cross_body_catch: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_toss_and_move: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_scarf_one_hand_snatch: { equipment: ["scarf"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_keep_up: { equipment: ["balloon"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_hand_switch: { equipment: ["balloon"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_balloon_partner_volley: { equipment: ["balloon", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_beanbag_toss_and_catch: { equipment: ["beanbag"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_beanbag_balance_walk: { equipment: ["beanbag"], fallbackSlug: "wu_crossover_run" },
  wu_beanbag_foot_flip: { equipment: ["beanbag"], fallbackSlug: "wu_crossover_run" },
  wu_mini_frisbee_toss: { equipment: ["frisbee"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_mini_frisbee_roll_catch: { equipment: ["frisbee"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_shuttle_tap_up: { equipment: ["shuttle"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_coin_finger_roll: { equipment: ["coin"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_mirror_me_ball_toss: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_partner_alternating_catch: { equipment: ["tennis_ball", "partner"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_light_bat_shadow_tap: { equipment: ["bat"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_dry_swing_progressive: { equipment: ["bat"], fallbackSlug: "wu_shuffle_change_direction" },
  wu_jband_full: { equipment: ["jband"], fallbackSlug: "wu_prone_tyw" },
  wu_crossover_symmetry_full: { equipment: ["bands"], fallbackSlug: "wu_prone_tyw" },
  wu_er_at_90: { equipment: ["bands"], fallbackSlug: "wu_prone_tyw" },
  wu_face_pull_band: { equipment: ["bands"], fallbackSlug: "wu_scap_pushup" },
  wu_forearm_pump: { equipment: ["bands"], fallbackSlug: "wu_scap_pushup" },
  wu_barefoot_towel_scrunch: { equipment: ["towel"] },
  wu_med_ball_scoop_toss: { equipment: ["med_ball"], fallbackSlug: "wu_sl_broad_hop_stick" },
  wu_med_ball_shot_put: { equipment: ["med_ball", "wall"], fallbackSlug: "wu_dry_swing_burst" },
  wu_altitude_drop: { equipment: ["box"], fallbackSlug: "wu_sl_curb_drop_stick" },
};

/** Always assumed present — a floor, a wall, and room to move. */
const BASELINE_EQUIPMENT = ["wall", "open_space", "floor", "towel"];

/** Venue tokens that imply a full kit. */
const VENUE_EXPANSIONS: Record<string, string[]> = {
  full_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "hurdles", "jband", "bat"],
  commercial_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "jband"],
  gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench"],
  home_gym: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "bench"],
  team_facility: ["foam_roller", "massage_ball", "mini_band", "bands", "med_ball", "box", "bench", "ladder", "hurdles", "jband", "bat", "tennis_ball", "partner"],
  field: ["bat", "tennis_ball", "partner", "ladder"],
  field_only: ["bat", "tennis_ball", "partner"],
  bands: ["bands", "mini_band", "jband"],
  hotel: [],
  travel: [],
  bodyweight: [],
};

const EQUIPMENT_SYNONYMS: Record<string, string> = {
  agility_ladder: "ladder",
  speed_ladder: "ladder",
  mini_hurdles: "hurdles",
  hurdle: "hurdles",
  resistance_bands: "bands",
  band: "bands",
  jbands: "jband",
  j_band: "jband",
  j_bands: "jband",
  crossover_symmetry: "bands",
  medicine_ball: "med_ball",
  medball: "med_ball",
  plyo_box: "box",
  jump_box: "box",
  step: "box",
  lacrosse_ball: "massage_ball",
  massage_gun: "massage_ball",
  roller: "foam_roller",
  bats: "bat",
  tennis_balls: "tennis_ball",
  training_partner: "partner",
  catch_partner: "partner",
};

function normalizeEquipmentToken(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return EQUIPMENT_SYNONYMS[t] ?? t;
}

/**
 * Expand the athlete's declared equipment + venue into the token set the
 * library gates against. Missingness is honest — an unknown athlete gets the
 * baseline (floor, wall, space) and therefore the equipment-free variants.
 */
export function expandEquipment(
  declared: ReadonlyArray<string> | null | undefined,
  venue?: string | null,
): Set<string> {
  const out = new Set<string>(BASELINE_EQUIPMENT);
  for (const raw of declared ?? []) {
    const token = normalizeEquipmentToken(String(raw));
    out.add(token);
    for (const extra of VENUE_EXPANSIONS[token] ?? []) out.add(extra);
  }
  if (venue) {
    const v = normalizeEquipmentToken(venue);
    out.add(v);
    for (const extra of VENUE_EXPANSIONS[v] ?? []) out.add(extra);
  }
  return out;
}

/** What a drill needs — inline declaration first, override table second. */
export function equipmentFor(drill: WarmupDrill): readonly string[] {
  return drill.equipment ?? EQUIPMENT_OVERRIDES[drill.slug]?.equipment ?? [];
}

function fallbackFor(drill: WarmupDrill): string | null {
  return drill.fallbackSlug ?? EQUIPMENT_OVERRIDES[drill.slug]?.fallbackSlug ?? null;
}

function bySlug(slug: string): WarmupDrill | null {
  return WARMUP_LIBRARY.find((d) => d.slug === slug) ?? null;
}

function hasEquipment(drill: WarmupDrill, available: Set<string>): boolean {
  return equipmentFor(drill).every((need) => available.has(need));
}

/** Athlete-facing "You need:" line. Empty when nothing beyond a floor. */
export function equipmentNoteFor(drill: WarmupDrill): string | undefined {
  const needs = equipmentFor(drill).filter((e) => !BASELINE_EQUIPMENT.includes(e));
  if (needs.length === 0) return undefined;
  const labels: Record<string, string> = {
    ladder: "agility ladder",
    hurdles: "mini hurdles",
    box: "box or step",
    bands: "resistance band",
    mini_band: "mini band",
    med_ball: "medicine ball",
    massage_ball: "lacrosse or massage ball",
    foam_roller: "foam roller",
    jband: "J-Band",
    tennis_ball: "tennis ball",
    beanbag: "beanbag",
    scarf: "juggling scarf",
    balloon: "balloon",
    frisbee: "mini frisbee",
    shuttle: "badminton shuttle",
    coin: "coin",
    bat: "bat",
    bench: "bench or chair",
    partner: "a partner",
  };
  return needs.map((n) => labels[n] ?? n.replace(/_/g, " ")).join(", ");
}

// ─── Templates ──────────────────────────────────────────────────────────────
//
// Twitch law: baseball and softball are burst sports. Every training day that
// can afford it gets ladder-style quick feet plus single-leg twitch, and the
// single-leg share of the twitch layer is enforced at build time.
const TEMPLATES: Record<WarmupContext, WarmupRole[]> = {
  game_day: [
    "breathwork", "tissue_prep", "cars", "fascial_rotation",
    "activation", "weightless_coordination", "ladder_quickness", "neural_priming", "arm_care", "movement_bridge",
  ],
  in_season_practice: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "ladder_quickness", "neural_priming",
    "single_leg_twitch", "movement_bridge", "arm_care",
  ],
  in_season_default: [
    "breathwork", "cars", "fascial_rotation", "activation",
    "weightless_coordination", "ladder_quickness", "neural_priming", "single_leg_twitch", "arm_care",
  ],
  speed_day: [
    "tissue_prep", "cars", "mobility_joint", "activation",
    "weightless_coordination", "neural_priming", "ladder_quickness",
    "single_leg_twitch", "single_leg_twitch", "ground_force", "fast_twitch", "movement_bridge",
  ],
  lift_day: [
    "breathwork", "tissue_prep", "cars", "mobility_joint",
    "activation", "weightless_coordination", "stability", "neural_priming",
    "ladder_quickness", "single_leg_twitch", "fast_twitch",
  ],
  // Throwing days: arm care is OWNED BY THE THROWING BLOCK (EASS band prep + cooldown).
  // The warmup does NOT include arm_care on throwing days — that keeps arm care to exactly
  // one exposure per day. See ArmCareBudgetContext.
  // Legs stay fresh for the arm: ladder quickness only, no ground-force bursts.
  throwing_day: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "ladder_quickness", "movement_bridge",
  ],
  hitting_day: [
    "tissue_prep", "cars", "fascial_rotation", "mobility_joint",
    "activation", "weightless_coordination", "ladder_quickness",
    "single_leg_twitch", "fast_twitch", "movement_bridge",
  ],
  offseason_extended: [
    "breathwork", "tissue_prep", "tissue_prep", "cars", "cars",
    "fascial_rotation", "mobility_joint", "mobility_joint", "activation", "stability",
    "weightless_coordination", "weightless_coordination", "neural_priming",
    "ladder_quickness", "ladder_quickness", "single_leg_twitch", "single_leg_twitch",
    "ground_force", "fast_twitch", "movement_bridge", "arm_care",
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
    "activation", "weightless_coordination", "neural_priming",
    "ladder_quickness", "single_leg_twitch", "fast_twitch",
  ],
};

/** Roles that make up the twitch layer, governed by the single-leg majority. */
export const TWITCH_ROLES: ReadonlyArray<WarmupRole> = [
  "ladder_quickness",
  "single_leg_twitch",
  "ground_force",
  "fast_twitch",
];

/** Minimum share of the twitch layer that must be single-leg. */
export const SINGLE_LEG_MIN_SHARE = 0.6;


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

const LIFECYCLE_RANK: Record<LifecycleClass, number> = {
  youth: 0, beginner: 1, intermediate: 2, advanced: 3, elite: 4,
};

interface PickFilters {
  readonly lifecycle: LifecycleClass;
  readonly gameDay: boolean;
  readonly available: Set<string>;
  readonly injuryRegions: ReadonlyArray<string>;
  /** When set, only drills on this axis are eligible. */
  readonly axis?: WarmupAxis;
}

function isEligible(d: WarmupDrill, f: PickFilters): boolean {
  if (LIFECYCLE_RANK[f.lifecycle] < LIFECYCLE_RANK[d.minLifecycle]) return false;
  if (f.gameDay && !d.gameDayLegal) return false;
  if (f.axis && (d.axis ?? "bilateral") !== f.axis) return false;
  if (d.regions && f.injuryRegions.length > 0) {
    if (d.regions.some((r) => f.injuryRegions.includes(r))) return false;
  }
  return true;
}

/** Replay-visible record of every honest swap or skip the engine made. */
export interface WarmupDiagnostic {
  readonly code:
    | "equipment_substitution"
    | "equipment_role_skipped"
    | "single_leg_swap"
    | "single_leg_short"
    | "twitch_suppressed"
    | "injury_veto";
  readonly role?: WarmupRole;
  readonly from?: string;
  readonly to?: string;
  readonly detail: string;
}

/**
 * Resolve a drill against the athlete's actual equipment. Gear-bound drills
 * fall back to their equipment-free sibling; if that is also ineligible the
 * caller must pick something else — nothing is ever prescribed blind.
 */
function resolveEquipmentSafe(
  d: WarmupDrill,
  f: PickFilters,
): { drill: WarmupDrill; substituted: boolean } | null {
  if (hasEquipment(d, f.available)) return { drill: d, substituted: false };
  const fb = fallbackFor(d);
  if (!fb) return null;
  const sib = bySlug(fb);
  if (!sib) return null;
  if (!isEligible(sib, { ...f, axis: undefined })) return null;
  return hasEquipment(sib, f.available) ? { drill: sib, substituted: true } : null;
}

function poolForRole(role: WarmupRole, f: PickFilters): WarmupDrill[] {
  return WARMUP_LIBRARY.filter((d) => d.role === role && isEligible(d, f));
}

function pickForRole(
  role: WarmupRole,
  f: PickFilters,
  seed: number,
  seen: Set<string>,
  diagnostics?: WarmupDiagnostic[],
): WarmupDrill | null {
  const pool = poolForRole(role, f);
  if (pool.length === 0) return null;
  const start = Math.abs(seed) % pool.length;
  // Deterministic scan from the seeded index — first equipment-legal,
  // not-yet-used candidate wins.
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    const resolved = resolveEquipmentSafe(candidate, f);
    if (!resolved || seen.has(resolved.drill.slug)) continue;
    if (resolved.substituted) {
      diagnostics?.push({
        code: "equipment_substitution",
        role,
        from: candidate.slug,
        to: resolved.drill.slug,
        detail: `${candidate.name} needs ${equipmentFor(candidate).join(", ")} — swapped to the equipment-free ${resolved.drill.name}.`,
      });
    }
    return resolved.drill;
  }
  return null;
}


export interface BuildWarmupInput {
  readonly context: WarmupContext;
  readonly lifecycle: LifecycleClass;
  readonly gameDay: boolean;
  readonly daySeed?: number;
  /** When true, strip any arm_care role picks. Used when the throwing block already owns arm care. */
  readonly suppressArmCare?: boolean;
  /** Athlete's declared equipment tokens (effective scope already resolved). */
  readonly equipment?: ReadonlyArray<string> | null;
  /** Canonical venue token — expands into an implied kit. */
  readonly venue?: string | null;
  /** Reported injury regions — twitch drills loading those regions are vetoed. */
  readonly injuryRegions?: ReadonlyArray<string>;
  /** True on low-readiness days: the twitch layer is dropped entirely. */
  readonly suppressTwitch?: boolean;
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
  /** Athlete-facing "You need:" line, when the drill needs gear. */
  readonly equipmentNote?: string;
  readonly axis?: WarmupAxis;
}

export interface BuiltWarmup {
  readonly context: WarmupContext;
  readonly drills: ReadonlyArray<BuiltWarmupDrill>;
  readonly estMinutes: number;
  /** Share of the twitch layer performed single-leg (0..1, null when none). */
  readonly singleLegShare: number | null;
  /** Every substitution, skip and veto — replay-visible, never silent. */
  readonly diagnostics: ReadonlyArray<WarmupDiagnostic>;
}

function toBuilt(d: WarmupDrill, lifecycle: LifecycleClass): BuiltWarmupDrill {
  return {
    slug: d.slug,
    name: d.name,
    role: d.role,
    setup: d.setup,
    dosage: doseFor(d, lifecycle),
    cue: d.cue,
    stopIf: d.stopIf,
    source: d.source,
    guide: guideFor(d.slug) ?? guideFor(d.name) ?? undefined,
    equipmentNote: equipmentNoteFor(d),
    axis: d.axis,
  };
}

export function buildWarmup(input: BuildWarmupInput): BuiltWarmup {
  const diagnostics: WarmupDiagnostic[] = [];
  const injuryRegions = (input.injuryRegions ?? []).map((r) => r.toLowerCase());
  const filtersBase: PickFilters = {
    lifecycle: input.lifecycle,
    gameDay: input.gameDay,
    available: expandEquipment(input.equipment, input.venue),
    injuryRegions,
  };
  if (injuryRegions.length > 0) {
    diagnostics.push({
      code: "injury_veto",
      detail: `Drills loading ${injuryRegions.join(", ")} were withheld — reported injury region.`,
    });
  }
  const fullTemplate = templateFor(input.context, input.lifecycle);
  const roles = fullTemplate.filter((r) => {
    if (input.suppressArmCare && r === "arm_care") return false;
    if (input.suppressTwitch && TWITCH_ROLES.includes(r)) return false;
    return true;
  });
  if (input.suppressTwitch && fullTemplate.some((r) => TWITCH_ROLES.includes(r))) {
    diagnostics.push({
      code: "twitch_suppressed",
      detail: "Fast-twitch layer withheld today — recovery, travel or low readiness. Prep only, no CNS spend.",
    });
  }
  const seedBase = input.daySeed ?? 0;
  const seen = new Set<string>();
  const drills: BuiltWarmupDrill[] = [];
  roles.forEach((role, i) => {
    const seed = seedBase + i * 7 + role.length * 3;
    const pick = pickForRole(role, filtersBase, seed, seen, diagnostics);
    if (!pick) {
      diagnostics.push({
        code: "equipment_role_skipped",
        role,
        detail: `No ${role.replace(/_/g, " ")} drill is legal with today's equipment, age and injury state — the role was skipped rather than half-shipped.`,
      });
      return;
    }
    seen.add(pick.slug);
    drills.push(toBuilt(pick, input.lifecycle));
  });

  // ── Single-leg majority law ───────────────────────────────────────────────
  // Twitch and ground force transfer through one leg at a time. At least
  // SINGLE_LEG_MIN_SHARE of the twitch layer must be single-leg; bilateral
  // picks are deterministically swapped out from the back until it holds.
  const twitchIdx = drills
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => TWITCH_ROLES.includes(d.role));
  if (twitchIdx.length > 0) {
    const needed = Math.ceil(twitchIdx.length * SINGLE_LEG_MIN_SHARE);
    let single = twitchIdx.filter(({ d }) => d.axis === "single_leg").length;
    const bilateral = twitchIdx
      .filter(({ d }) => d.axis !== "single_leg")
      .reverse();
    for (const { d, i } of bilateral) {
      if (single >= needed) break;
      const slFilters: PickFilters = { ...filtersBase, axis: "single_leg" };
      const replacement =
        pickForRole(d.role, slFilters, seedBase + i * 13 + 5, seen, diagnostics) ??
        pickForRole("single_leg_twitch", slFilters, seedBase + i * 13 + 5, seen, diagnostics);
      if (!replacement) continue;
      seen.delete(d.slug);
      seen.add(replacement.slug);
      drills[i] = toBuilt(replacement, input.lifecycle);
      diagnostics.push({
        code: "single_leg_swap",
        role: replacement.role,
        from: d.slug,
        to: replacement.slug,
        detail: `Single-leg majority law — ${d.name} swapped for ${replacement.name} so most of the twitch work runs through one leg.`,
      });
      single++;
    }
  }

  const twitchFinal = drills.filter((d) => TWITCH_ROLES.includes(d.role));
  const singleLegShare =
    twitchFinal.length === 0
      ? null
      : twitchFinal.filter((d) => d.axis === "single_leg").length / twitchFinal.length;
  if (singleLegShare !== null && singleLegShare < SINGLE_LEG_MIN_SHARE) {
    diagnostics.push({
      code: "single_leg_short",
      detail: `Single-leg share is ${Math.round(singleLegShare * 100)}% — no legal single-leg replacement was available today.`,
    });
  }

  const est = Math.max(8, Math.round((drills.length * 90) / 60));

  return { context: input.context, drills, estMinutes: est, singleLegShare, diagnostics };
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
