import { Exercise } from '@/types/workout';

// =====================================================================
// IRON BAMBINO: ELITE 24-WEEK PERIODIZED STRENGTH PROGRAM
// =====================================================================
// Designed for power hitter development with 4 cycles × 6 weeks each
// Schedule: Strength+Bat Speed → 2 days rest → Bat Speed Only → 2 days rest → Next Strength
// Every 4 days: 1 strength session + 1 bat speed only session
// =====================================================================

// =====================================================================
// CYCLE 1: CONCENTRIC-ISOMETRIC FOUNDATION (Weeks 1-6)
// Focus: Build base strength through concentric compound movements + isometric position strength
// =====================================================================

export const CYCLE_1_WORKOUT_A: Exercise[] = [
  // Full Body Concentric Power + Isometric Foundation
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Stand inside hex bar, grip handles at sides, drive through heels to stand tall. Hips and knees extend simultaneously. Explosive concentric, controlled descent.', 
    notes: 'Full hip extension at top' },
  { name: 'Barbell Back Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'Bar on upper traps, feet shoulder-width apart. Descend until hip crease below knee, then explode up through midfoot. Chest stays high throughout.', 
    notes: 'Break parallel, explosive drive' },
  { name: 'Bench Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Lie on bench with slight arch, grip bar just outside shoulders. Lower to mid-chest with control, pause briefly, then press explosively to lockout.', 
    notes: 'Pause at chest, drive through heels' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Hinge at hips 45°, grip bar outside knees. Pull to lower ribcage while retracting shoulder blades. Keep torso stable - no heaving.', 
    notes: 'Squeeze 1s at top, strict form' },
  { name: 'Landmine Rotational Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Bar anchored in corner. Start at shoulder with both hands, rotate hips explosively while pressing diagonally across body. Core drives the movement.', 
    notes: 'Each side, full hip rotation' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 4, holdTime: 8, 
    description: 'Back flat against wall, slide down until thighs parallel to floor. Press lower back into wall, engage quads maximally. Breathe steadily.', 
    notes: 'Thighs parallel, maximum quad tension' },
  { name: 'Isometric Pallof Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Cable/band at chest height, arms extended forward. Resist the rotational pull with your core - anti-rotation is the goal.', 
    notes: 'Each side, resist rotation' },
];

export const CYCLE_1_WORKOUT_B: Exercise[] = [
  // Full Body Concentric Strength + Positional Isometrics
  { name: 'Front Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, 
    description: 'Bar on front delts with clean grip or crossed arms. Keep elbows high, descend deep with upright torso, drive up explosively through midfoot.', 
    notes: 'Elbows up, deep depth' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'On 30° incline, press dumbbells from shoulder level to full lockout. Lower with control, slight pause at bottom, explode up.', 
    notes: '30° incline, full ROM' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Add weight via belt or vest. From dead hang, pull until chin clears bar. Control descent, pause at bottom. Full ROM every rep.', 
    notes: 'Dead hang start, add weight' },
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Bar at hip height, push hips back while keeping slight knee bend. Lower until hamstring stretch, then drive hips forward to return.', 
    notes: 'Hip hinge, hamstring stretch' },
  { name: 'Cable Woodchop High-to-Low', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'High cable attachment, feet shoulder-width. Pull diagonally down across body with hip rotation. Arms stay extended, core drives the movement.', 
    notes: 'Each side, explosive rotation' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 4, holdTime: 8, 
    description: 'Lower to mid-position of push-up (elbows at 90°). Hold steady without sinking or rising. Engage chest, triceps, and core maximally.', 
    notes: 'Mid-position, max tension' },
  { name: 'Isometric Single-Leg Glute Bridge', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'One foot planted, other leg extended. Drive hip up, hold at top with straight line from knee to shoulder. Maximum glute squeeze.', 
    notes: 'Each leg, hip locked high' },
];

export const CYCLE_1_WORKOUT_C: Exercise[] = [
  // Full Body Power Development + Core Stability
  { name: 'Box Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'Squat back to box at parallel height. Pause briefly on box with tension maintained, then explode up. Teaches proper hip mechanics.', 
    notes: 'Pause on box, explode up' },
  { name: 'Close-Grip Bench Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Grip bar shoulder-width, elbows tucked at 45°. Lower to lower chest, pause, press explosively. Emphasizes tricep strength for finish.', 
    notes: 'Elbows tucked, tricep focus' },
  { name: 'Single-Arm Dumbbell Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'One hand and knee on bench, opposite foot planted wide. Row dumbbell to hip while actively resisting torso rotation. Control eccentric.', 
    notes: 'Each side, anti-rotation focus' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Rear foot elevated on bench behind you. Lower until front thigh parallel, then push through front heel to stand. Keep torso upright.', 
    notes: 'Each leg, rear foot elevated' },
  { name: 'Pallof Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, 
    description: 'Cable at chest height, stand perpendicular. Press hands forward slowly, hold 3s at extension while resisting rotation, return with control.', 
    notes: '3s hold at full extension' },
  { name: 'Isometric Inverted Row Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Under bar at chest height, pull up and hold with chest near bar. Body in straight line from ankles to shoulders. Squeeze shoulder blades.', 
    notes: 'Chest to bar position' },
  { name: 'Isometric Side Plank', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'On elbow and side of foot. Hold body in straight line with hips elevated off ground. Actively push through grounded elbow.', 
    notes: 'Each side, hips high' },
];

export const CYCLE_1_WORKOUT_D: Exercise[] = [
  // Full Body Compound Integration + Stability
  { name: 'Sumo Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Wide stance, grip inside knees. Drive through heels, push knees out, chest up. Lockout with hips through. Emphasizes hip power.', 
    notes: 'Wide stance, hips through' },
  { name: 'Overhead Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, 
    description: 'Bar at front shoulders, grip just outside shoulders. Brace core, press straight up while moving head back then forward. Full lockout overhead.', 
    notes: 'Strict press, full lockout' },
  { name: 'Lat Pulldown', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Wide grip on bar, pull down to upper chest while arching slightly. Squeeze lats at bottom, control return. Full stretch at top.', 
    notes: 'Wide grip, squeeze lats' },
  { name: 'Walking Lunge', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, 
    description: 'Dumbbells at sides, step forward into deep lunge position. Drive through front heel to step forward into next lunge. Continuous motion.', 
    notes: 'Each leg, continuous motion' },
  { name: 'Med Ball Rotational Slam', type: 'strength', sets: 3, reps: 5, percentOf1RM: 0, trackWeight: false, 
    description: 'Med ball at hip, rotate explosively and slam ball diagonally down. Chase the ball, reset, repeat. Maximum rotational power output.', 
    notes: 'Each side, max intent' },
  { name: 'Isometric Split Squat Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Bottom position of split squat, front thigh parallel. Hold position without moving, maintaining upright torso and engaged glutes.', 
    notes: 'Each leg, bottom position' },
  { name: 'Isometric Hollow Body Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Lie on back, lower back pressed into floor. Legs extended slightly off ground, arms overhead. Hold position without breaking core.', 
    notes: 'Lower back pressed down' },
];

// =====================================================================
// CYCLE 2: CONCENTRIC WEIGHTLIFTING FOCUS (Weeks 7-12)
// Focus: Prioritize concentric loading volume, isometrics become supplemental
// =====================================================================

export const CYCLE_2_WORKOUT_A: Exercise[] = [
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 5, reps: 3, percentOf1RM: 85, trackWeight: true, 
    description: 'Max strength concentric focus. Stand inside hex bar, explosive pull from floor to lockout. Reset completely between reps.', 
    notes: 'Max strength, full reset each rep' },
  { name: 'Box Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Concentric from dead stop. Sit back fully onto box, pause 1s with tension, then explode up without rocking forward.', 
    notes: 'Dead stop start, no momentum' },
  { name: 'Bench Press', type: 'strength', sets: 5, reps: 3, percentOf1RM: 85, trackWeight: true, 
    description: 'Heavy concentric pressing. Lower with control, brief pause at chest, explode to lockout. Maximum force production.', 
    notes: 'Heavy singles focus' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true, 
    description: 'Heavy pull from dead hang. Full range of motion, chin over bar at top. Add significant weight for strength gains.', 
    notes: 'Heavy, full ROM' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: 'Loaded single-leg work. Rear foot elevated, descend deep, drive through front heel explosively.', 
    notes: 'Each leg, heavy loading' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 3, holdTime: 6, 
    description: 'Reduced volume, maintenance. Thighs parallel, maximum tension hold.', 
    notes: 'Maintenance volume' },
  { name: 'Isometric Hip Flexor Hold', type: 'isometric', sets: 3, holdTime: 8, 
    description: 'Standing, pull knee to chest against resistance. Hold with hip flexor engaged at maximum contraction.', 
    notes: 'Each leg, hip health' },
];

export const CYCLE_2_WORKOUT_B: Exercise[] = [
  { name: 'Barbell Back Squat', type: 'strength', sets: 5, reps: 3, percentOf1RM: 85, trackWeight: true, 
    description: 'Heavy concentric squat. Deep depth, explosive drive out of the hole. Maximum force through midfoot.', 
    notes: 'Max strength, deep depth' },
  { name: 'Incline Barbell Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'On 30° incline with barbell. Lower to upper chest, pause, drive explosively. Upper chest emphasis.', 
    notes: '30° incline, heavy' },
  { name: 'Chest-Supported Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true, 
    description: 'Chest on incline bench, row dumbbells or bar to ribcage. Eliminates momentum, pure back strength.', 
    notes: 'No momentum, strict form' },
  { name: 'Dumbbell Shoulder Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Seated or standing, press dumbbells from shoulder level to full overhead lockout. Control descent.', 
    notes: 'Full lockout overhead' },
  { name: 'Cable Woodchop Low-to-High', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Low cable attachment. Pull diagonally up across body with explosive hip rotation. Upward power production.', 
    notes: 'Each side, explosive' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 3, holdTime: 6, 
    description: 'Maintenance volume. Mid-position hold with maximum tension.', 
    notes: 'Maintenance volume' },
  { name: 'Isometric Dead Hang', type: 'isometric', sets: 3, holdTime: 15, 
    description: 'Hang from pull-up bar with straight arms. Engages grip, stretches lats, decompresses spine.', 
    notes: 'Grip + shoulder health' },
];

export const CYCLE_2_WORKOUT_C: Exercise[] = [
  { name: 'Sumo Deadlift', type: 'strength', sets: 5, reps: 3, percentOf1RM: 85, trackWeight: true, 
    description: 'Heavy sumo pull. Wide stance, grip inside knees, explosive hip drive to lockout.', 
    notes: 'Max strength sumo' },
  { name: 'Dumbbell Bench Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true, 
    description: 'Independent arm pressing for balance and stability. Full range of motion, pause at bottom.', 
    notes: 'Independent arm work' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Heavy rowing with strict form. Pull to lower chest, squeeze, control descent. No heaving.', 
    notes: 'Heavy, strict form' },
  { name: 'Front Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'Anterior core demand with heavy loading. Keep elbows high, deep depth, explosive drive.', 
    notes: 'Heavy front loading' },
  { name: 'Pallof Press with Step', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Dynamic anti-rotation. Press hands forward while stepping laterally, increasing lever arm.', 
    notes: 'Each side, step out' },
  { name: 'Isometric Anti-Rotation Hold', type: 'isometric', sets: 3, holdTime: 8, 
    description: 'Cable/band at chest height. Arms extended, resist pull. Core stability maintenance.', 
    notes: 'Each side, core stability' },
  { name: 'Glute Bridge March', type: 'strength', sets: 3, reps: 10, percentOf1RM: 0, trackWeight: false, 
    description: 'Bridge position, alternate lifting knees while maintaining level hips. Dynamic hip stability.', 
    notes: 'Each leg, hips level' },
];

export const CYCLE_2_WORKOUT_D: Exercise[] = [
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Posterior chain emphasis. Hip hinge with slight knee bend, maximum hamstring stretch.', 
    notes: 'Hamstring stretch focus' },
  { name: 'Close-Grip Bench Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true, 
    description: 'Tricep-focused pressing. Shoulder-width grip, elbows tucked, explosive lockout.', 
    notes: 'Tricep emphasis' },
  { name: 'Lat Pulldown', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true, 
    description: 'Vertical pull variety. Wide grip, pull to upper chest, squeeze lats at bottom.', 
    notes: 'Wide grip, lat focus' },
  { name: 'Step-Up', type: 'strength', sets: 3, reps: 5, percentOf1RM: 68, trackWeight: true, 
    description: 'High box step-up with dumbbells. Drive through top leg, minimal push from back leg.', 
    notes: 'Each leg, high box' },
  { name: 'Landmine Rotational Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: 'Rotational pressing power. Full hip rotation driving the press.', 
    notes: 'Each side, full rotation' },
  { name: 'Isometric Lunge Hold', type: 'isometric', sets: 3, holdTime: 8, 
    description: 'Bottom of lunge position, hold with tension. Develops positional strength.', 
    notes: 'Each leg, bottom position' },
  { name: 'Plank with Shoulder Tap', type: 'strength', sets: 3, reps: 10, percentOf1RM: 0, trackWeight: false, 
    description: 'Plank position, alternate tapping shoulders while minimizing hip rotation. Core control.', 
    notes: 'Each side, hips stable' },
];

// =====================================================================
// CYCLE 3: CONCENTRIC-ISOMETRIC INTENSIFICATION (Weeks 13-18)
// Focus: Higher intensity on both modalities, refined movement patterns
// =====================================================================

export const CYCLE_3_WORKOUT_A: Exercise[] = [
  { name: 'Deficit Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true, 
    description: 'Stand on 2-3" platform inside hex bar. Increased ROM demands greater hip and leg drive. Explosive concentric.', 
    notes: '2-3" deficit, explosive' },
  { name: 'Pause Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, 
    description: '3-second pause at bottom of squat. Eliminates stretch reflex, builds strength from dead stop.', 
    notes: '3s pause at bottom' },
  { name: 'Spoto Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'Pause 1" off chest for 2 seconds, then press. Builds strength at sticking point without chest touch.', 
    notes: '1" off chest, 2s pause' },
  { name: 'Pendlay Row', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'From floor each rep, explosive row to lower chest. Dead stop start builds pure pulling power.', 
    notes: 'Dead stop each rep' },
  { name: 'Single-Leg Romanian Deadlift', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, 
    description: 'Hinge on one leg, other leg extends behind. Balance and hamstring work. Control throughout.', 
    notes: 'Each leg, balance focus' },
  { name: 'Isometric Wall Sit with Abduction', type: 'isometric', sets: 4, holdTime: 10, 
    description: 'Wall sit with band around knees, push out against band. Quad + glute med activation.', 
    notes: 'Push out against band' },
  { name: 'Isometric Pallof Hold Extended', type: 'isometric', sets: 3, holdTime: 12, 
    description: 'Pallof hold with arms fully extended, increasing lever arm. Maximum anti-rotation demand.', 
    notes: 'Each side, arms extended' },
];

export const CYCLE_3_WORKOUT_B: Exercise[] = [
  { name: 'Front Squat', type: 'strength', sets: 5, reps: 3, percentOf1RM: 82, trackWeight: true, 
    description: 'Heavy front loading with strict positioning. Elbows high, deep depth, explosive drive.', 
    notes: 'Heavy triples' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Heavy incline pressing. Full range of motion, controlled eccentric, explosive concentric.', 
    notes: 'Heavy, full ROM' },
  { name: 'Weighted Chin-Up', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true, 
    description: 'Underhand grip pull-up with added weight. Full range from dead hang to chin over bar.', 
    notes: 'Underhand, heavy' },
  { name: 'Good Morning', type: 'strength', sets: 3, reps: 5, percentOf1RM: 60, trackWeight: true, 
    description: 'Bar on back, hip hinge with slight knee bend. Loads posterior chain in stretched position.', 
    notes: 'Hip hinge focus' },
  { name: 'Half-Kneeling Cable Chop', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Kneeling position eliminates lower body compensation. Pure core rotation against cable.', 
    notes: 'Each side, core only' },
  { name: 'Isometric Push-Up Hold Bottom', type: 'isometric', sets: 4, holdTime: 8, 
    description: 'Hold at bottom of push-up, chest just off floor. Maximum stretch + tension.', 
    notes: 'Bottom position hold' },
  { name: 'Isometric Copenhagen Hold', type: 'isometric', sets: 3, holdTime: 8, 
    description: 'Side plank with top leg on bench. Adductor of bottom leg holds body up. Groin strength.', 
    notes: 'Each side, adductor work' },
];

export const CYCLE_3_WORKOUT_C: Exercise[] = [
  { name: 'Sumo Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 85, trackWeight: true, 
    description: 'Heavy sumo with focus on hip mobility and power. Wide stance, vertical torso, explosive.', 
    notes: 'Heavy, hips through' },
  { name: 'Floor Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true, 
    description: 'Lying on floor, press from triceps touching ground. Limited ROM isolates lockout strength.', 
    notes: 'Lockout focus' },
  { name: 'Meadows Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true, 
    description: 'Landmine row from staggered stance. Overhand grip on end of bar, row to hip.', 
    notes: 'Each side, landmine row' },
  { name: 'Rear Foot Elevated Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: 'Same as Bulgarian split squat but with increased depth emphasis. Full range of motion.', 
    notes: 'Each leg, deep depth' },
  { name: 'Anti-Rotation Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Pallof press variation with slow tempo - 3s out, 3s hold, 3s return.', 
    notes: 'Each side, slow tempo' },
  { name: 'Isometric Inverted Row Hold Supinated', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Underhand grip inverted row hold. Emphasizes biceps and lower lats.', 
    notes: 'Underhand grip' },
  { name: 'Isometric Glute Bridge Single-Leg', type: 'isometric', sets: 3, holdTime: 12, 
    description: 'Single-leg glute bridge hold at maximum hip extension. Maximum glute activation.', 
    notes: 'Each leg, max squeeze' },
];

export const CYCLE_3_WORKOUT_D: Exercise[] = [
  { name: 'Pause Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true, 
    description: 'Pause at knee height for 2s during pull. Eliminates momentum, builds positional strength.', 
    notes: '2s pause at knee' },
  { name: 'Overhead Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true, 
    description: 'Strict press from front rack to full lockout. No leg drive. Pure pressing strength.', 
    notes: 'Strict, no leg drive' },
  { name: 'Cable Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true, 
    description: 'Seated cable row with full stretch forward and full squeeze back. Constant tension.', 
    notes: 'Full ROM, constant tension' },
  { name: 'Goblet Squat', type: 'strength', sets: 3, reps: 8, percentOf1RM: 65, trackWeight: true, 
    description: 'Dumbbell held at chest. Deep squat with upright torso. Groove pattern and core engagement.', 
    notes: 'Deep depth, upright torso' },
  { name: 'Landmine Anti-Rotation', type: 'strength', sets: 3, reps: 5, percentOf1RM: 68, trackWeight: true, 
    description: 'Hold landmine at chest, resist rotation as it naturally wants to pull you sideways.', 
    notes: 'Each side, resist rotation' },
  { name: 'Isometric Side Plank with Hip Abduction', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Side plank with top leg raised. Lateral core and hip abductor work.', 
    notes: 'Each side, leg raised' },
  { name: 'Isometric Dead Bug Hold', type: 'isometric', sets: 3, holdTime: 12, 
    description: 'Dead bug position with opposite arm and leg extended. Hold without lumbar extension.', 
    notes: 'Each side, flat back' },
];

// =====================================================================
// CYCLE 4: ECCENTRIC FOCUS FOR MAXIMUM MUSCLE GROWTH (Weeks 19-24)
// Focus: Eccentric overload for hypertrophy and injury resilience
// Advanced techniques: 2-up/1-down, slow negatives, asymmetric loading
// =====================================================================

export const CYCLE_4_WORKOUT_A: Exercise[] = [
  { name: 'Barbell Squat with Lunge Descent', type: 'strength', sets: 4, reps: 4, percentOf1RM: 70, trackWeight: true, 
    description: 'Squat up with both legs, then step back into lunge and descend on single leg with 4s eccentric. Alternate legs.', 
    notes: '2 legs up, 1 leg eccentric' },
  { name: 'RDL with Single-Leg Eccentric', type: 'strength', sets: 4, reps: 4, percentOf1RM: 68, trackWeight: true, 
    description: 'Deadlift up with both legs, lower on single leg with 5s eccentric. Maximum hamstring loading.', 
    notes: 'Each leg, 5s negative' },
  { name: 'Bench Press with Slow Eccentric', type: 'strength', sets: 4, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: '5-second controlled lowering to chest, brief pause, then explosive press. Eccentric overload.', 
    notes: '5s negative, explode up' },
  { name: 'Weighted Pull-Up with Single-Arm Negative', type: 'strength', sets: 4, reps: 4, percentOf1RM: 0, trackWeight: false, 
    description: 'Pull up with both arms, remove one hand at top and lower with single arm over 5s. Alternate arms.', 
    notes: '2 arms up, 1 arm down' },
  { name: 'Nordic Curl Negative', type: 'strength', sets: 3, reps: 5, percentOf1RM: 0, trackWeight: false, 
    description: 'Kneel with feet anchored, lower torso toward ground as slowly as possible. Catch yourself at bottom.', 
    notes: 'Slow eccentric, max control' },
  { name: 'Calf Raise with 5s Negative', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false, 
    description: 'Rise on both calves, lower on single leg with 5-second eccentric. Achilles tendon health.', 
    notes: 'Each leg, slow negative' },
  { name: 'Isometric Nordic Hold', type: 'isometric', sets: 3, holdTime: 6, 
    description: 'Hold at 45° angle during Nordic curl. Maximum hamstring isometric tension.', 
    notes: 'Hold at 45°' },
];

export const CYCLE_4_WORKOUT_B: Exercise[] = [
  { name: 'Push-Up with Single-Arm Negative', type: 'strength', sets: 4, reps: 5, percentOf1RM: 0, trackWeight: false, 
    description: 'Push up with both arms, remove one hand and lower with single arm control. Alternate arms.', 
    notes: 'Each side, asymmetric' },
  { name: 'Cable Row with Single-Arm Eccentric', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Pull with both arms, release one hand and control return with single arm. Alternate arms.', 
    notes: '2 arms pull, 1 arm release' },
  { name: 'Front Squat with Slow Eccentric', type: 'strength', sets: 4, reps: 4, percentOf1RM: 70, trackWeight: true, 
    description: '5-second descent with front squat, pause at bottom, explosive drive up. Deep depth.', 
    notes: '5s negative, deep' },
  { name: 'Dumbbell Shoulder Press with Slow Eccentric', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Press explosively to lockout, lower with 4-second eccentric. Control throughout.', 
    notes: '4s negative' },
  { name: 'Step-Down with Control', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: false, 
    description: 'Stand on box, step down with single leg controlling descent over 4s. Pure eccentric leg work.', 
    notes: 'Each leg, 4s descent' },
  { name: 'Face Pull with Pause', type: 'strength', sets: 3, reps: 10, percentOf1RM: 65, trackWeight: true, 
    description: 'Pull to face level, pause 2s with external rotation, control return. Rear delt and rotator cuff.', 
    notes: '2s pause at contraction' },
  { name: 'Isometric Pull-Up Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Hold at top of pull-up position, chin over bar. Maximum lat and bicep isometric tension.', 
    notes: 'Top position hold' },
];

export const CYCLE_4_WORKOUT_C: Exercise[] = [
  { name: 'Trap Bar Deadlift with 5s Negative', type: 'strength', sets: 4, reps: 4, percentOf1RM: 70, trackWeight: true, 
    description: 'Explosive pull to lockout, then 5-second controlled descent to floor. Reset and repeat.', 
    notes: '5s lowering phase' },
  { name: 'Incline Press with Slow Eccentric', type: 'strength', sets: 4, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: '4-second lowering to upper chest, brief pause, explosive press. Incline angle.', 
    notes: '4s negative, incline' },
  { name: 'Single-Arm Row with Slow Release', type: 'strength', sets: 4, reps: 5, percentOf1RM: 72, trackWeight: true, 
    description: 'Explosive row to hip, 4-second eccentric release. Maximum time under tension.', 
    notes: 'Each side, 4s negative' },
  { name: 'Split Squat with 4s Descent', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true, 
    description: 'Static split squat with 4-second lowering phase. Control and depth emphasis.', 
    notes: 'Each leg, slow lower' },
  { name: 'Cable Woodchop with Slow Return', type: 'strength', sets: 4, reps: 5, percentOf1RM: 65, trackWeight: true, 
    description: 'Explosive chop action, then 4-second controlled return to start. Eccentric rotational control.', 
    notes: 'Each side, 4s eccentric' },
  { name: 'Hanging Leg Raise with Slow Lower', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false, 
    description: 'Raise legs explosively, then 4-second controlled lowering. Core eccentric strength.', 
    notes: '4s lowering phase' },
  { name: 'Isometric L-Sit Hold', type: 'isometric', sets: 3, holdTime: 8, 
    description: 'Hands on parallettes or dip bars, hold legs extended in L position. Core and hip flexor.', 
    notes: 'Legs parallel to floor' },
];

export const CYCLE_4_WORKOUT_D: Exercise[] = [
  { name: 'Sumo Deadlift with Slow Negative', type: 'strength', sets: 4, reps: 4, percentOf1RM: 70, trackWeight: true, 
    description: 'Explosive sumo pull, then 5-second controlled descent. Hip eccentric loading.', 
    notes: '5s eccentric phase' },
  { name: 'Dumbbell Bench Press with Slow Eccentric', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Independent arm pressing with 4-second lowering phase. Asymmetric loading and control.', 
    notes: '4s negative each arm' },
  { name: 'Lat Pulldown with Slow Release', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true, 
    description: 'Explosive pull to chest, 4-second controlled return to full stretch. Maximum lat stretch.', 
    notes: '4s negative, full stretch' },
  { name: 'Walking Lunge with Slow Descent', type: 'strength', sets: 3, reps: 5, percentOf1RM: 60, trackWeight: true, 
    description: 'Step forward and descend over 3 seconds, then drive explosively to next lunge.', 
    notes: 'Each leg, 3s descent' },
  { name: 'Pallof Hold with Reach', type: 'strength', sets: 4, reps: 6, percentOf1RM: 65, trackWeight: true, 
    description: 'Extended Pallof hold, reach arms overhead to increase lever arm. Maximum core demand.', 
    notes: 'Each side, reach overhead' },
  { name: 'Dead Bug with Band', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false, 
    description: 'Dead bug pattern with band resistance. Slow, controlled limb movements with stable core.', 
    notes: 'Each side, band tension' },
  { name: 'Isometric GHD Hold', type: 'isometric', sets: 3, holdTime: 10, 
    description: 'Hold at parallel position on GHD. Full posterior chain isometric tension.', 
    notes: 'Body parallel to floor' },
];

// =====================================================================
// BAT SPEED TRAINING EXERCISES
// These are included on strength days AND have dedicated bat speed only days
// =====================================================================

export const BAT_SPEED_EXERCISES: { [key: string]: Exercise } = {
  // Core Bat Speed Development
  'Speed swings - 10 reps': { name: 'Speed swings - 10 reps', type: 'skill', 
    description: 'Maximum intent swings focusing purely on bat speed, not contact quality. Swing as fast as possible to train fast-twitch muscle fibers.' },
  'Light bat max speed - 20 swings': { name: 'Light bat max speed - 20 swings', type: 'skill', 
    description: 'Use training bat 3-5 oz lighter than game bat, swing at absolute maximum speed. Develops fast-twitch patterns and overspeed adaptation.' },
  'Heavy-light contrast - 10 sets': { name: 'Heavy-light contrast - 10 sets', type: 'skill', 
    description: '2 heavy bat swings then 2 light bat swings immediately. Creates overspeed contrast training effect for neurological adaptation.' },
  'Velocity ladder swings': { name: 'Velocity ladder swings', type: 'skill', 
    description: '3 swings at 70% intent, 3 at 85%, 3 at 100%. Builds speed progressively and teaches intent differentiation for game situations.' },
  'Intent tee work - max effort': { name: 'Intent tee work - max effort', type: 'skill', 
    description: 'Every tee swing at 100% intent - no casual reps allowed. Train nervous system for maximum output every swing.' },
  
  // Quick Hands Development
  'Quick hands drill': { name: 'Quick hands drill', type: 'skill', 
    description: 'Start with bat touching back shoulder, fire hands to contact point as fast as possible. Develops hand path speed and quick trigger.' },
  'Wrist snap drill': { name: 'Wrist snap drill', type: 'skill', 
    description: 'Isolate wrist action at contact point with quick snap-through movements. Develops final-phase hand speed through the zone.' },
  'Fast hands reaction drill': { name: 'Fast hands reaction drill', type: 'skill', 
    description: 'Partner calls "now" at random intervals, fire hands instantly on command. Develops trigger speed and reaction time for live pitching.' },
  
  // Rotational Speed
  'Bat behind back rotations': { name: 'Bat behind back rotations', type: 'skill', 
    description: 'Bat placed behind back across shoulder blades. Rotate hips explosively to feel body-generated speed without arm involvement.' },
  'Rotational snap drill': { name: 'Rotational snap drill', type: 'skill', 
    description: 'Focus on hip snap speed without full swing. Isolates and maximizes rotational velocity from ground up for power generation.' },
  'No-stride speed swings': { name: 'No-stride speed swings', type: 'skill', 
    description: 'Eliminate stride completely, focus purely on rotational speed from set position. Isolates hip and hand speed for max output.' },
  
  // Connection & Efficiency
  'Connection ball drill': { name: 'Connection ball drill', type: 'skill', 
    description: 'Small ball or towel held between lead arm and torso during swing - drops when connected properly. Teaches efficient swing path for maximum speed.' },
  'Barrel speed focus drill': { name: 'Barrel speed focus drill', type: 'skill', 
    description: 'Visualize barrel racing to contact point ahead of hands. Mental cue for accelerating bat head speed through the zone.' },
  'One-handed speed swings': { name: 'One-handed speed swings', type: 'skill', 
    description: 'Single arm swings (lead hand then back hand separately) to develop arm-specific speed and identify weaker hand for targeted work.' },
  
  // Overload/Underload Training
  'Resistance band speed swings': { name: 'Resistance band speed swings', type: 'skill', 
    description: 'Band attached to bat or around waist, swing against resistance for 5 reps then immediately without for 5 reps. Creates overspeed training effect.' },
  'Overload/underload protocol': { name: 'Overload/underload protocol', type: 'skill', 
    description: 'Alternate heavy bat (3-5 swings), game bat (3-5), light bat (3-5). Builds power and speed through contrast training methodology.' },
  
  // Measurement & Competition
  'Swing speed measurement': { name: 'Swing speed measurement', type: 'skill', 
    description: 'Use speed device, app, or video to measure and track swing speed progress. Record baseline and improvements for objective tracking.' },
  'Exit speed competition': { name: 'Exit speed competition', type: 'skill', 
    description: 'Track exit velocity, compete to beat your personal best with each swing. Creates competitive intent focus for every rep.' },
  'Bat waggle speed drill': { name: 'Bat waggle speed drill', type: 'skill', 
    description: 'Rapid bat movement in stance before swing - small circles or back-and-forth waggle. Transfers into quick first move and activates fast-twitch muscles.' },
  'Bat flip speed drill': { name: 'Bat flip speed drill', type: 'skill', 
    description: 'After swing completion, flip bat up with quick wrist snap. Trains fast-twitch wrist action and bat control for acceleration through zone.' },
  'Speed tee work - 15 swings': { name: 'Speed tee work - 15 swings', type: 'skill', 
    description: 'Tee swings with maximum bat speed intent - quality contact is secondary. Focus purely on generating the fastest possible swing.' },
};

// Bat speed day exercises (5-7 exercises per session)
export const BAT_SPEED_DAY_1: string[] = [
  'Speed swings - 10 reps',
  'Quick hands drill', 
  'Bat behind back rotations',
  'Connection ball drill',
  'Velocity ladder swings',
  'Intent tee work - max effort',
];

export const BAT_SPEED_DAY_2: string[] = [
  'Light bat max speed - 20 swings',
  'Wrist snap drill',
  'Rotational snap drill',
  'One-handed speed swings',
  'Exit speed competition',
  'Swing speed measurement',
];

export const BAT_SPEED_DAY_3: string[] = [
  'Heavy-light contrast - 10 sets',
  'Fast hands reaction drill',
  'No-stride speed swings',
  'Barrel speed focus drill',
  'Speed tee work - 15 swings',
  'Overload/underload protocol',
];

export const BAT_SPEED_DAY_4: string[] = [
  'Resistance band speed swings',
  'Quick hands drill',
  'Bat waggle speed drill',
  'Connection ball drill',
  'Velocity ladder swings',
  'Exit speed competition',
];

// Strength day bat speed (3-4 exercises to add to strength days)
export const STRENGTH_DAY_BAT_SPEED: string[] = [
  'Speed swings - 10 reps',
  'Quick hands drill',
  'Rotational snap drill',
  'Intent tee work - max effort',
];

// =====================================================================
// CYCLE CONFIGURATION
// =====================================================================

export interface CycleInfo {
  id: number;
  name: string;
  focus: string;
  description: string;
  workouts: {
    A: Exercise[];
    B: Exercise[];
    C: Exercise[];
    D: Exercise[];
  };
}

export const CYCLES: CycleInfo[] = [
  {
    id: 1,
    name: 'Concentric-Isometric Foundation',
    focus: 'Build base strength through concentric compound movements + isometric position strength',
    description: 'Foundation cycle establishing movement patterns, building work capacity, and developing positional strength through strategic isometric holds.',
    workouts: {
      A: CYCLE_1_WORKOUT_A,
      B: CYCLE_1_WORKOUT_B,
      C: CYCLE_1_WORKOUT_C,
      D: CYCLE_1_WORKOUT_D,
    },
  },
  {
    id: 2,
    name: 'Concentric Weightlifting Focus',
    focus: 'Prioritize concentric loading volume with supplemental isometrics',
    description: 'Intensification cycle emphasizing heavy concentric movements. Increased loading with reduced isometric volume for strength peaking.',
    workouts: {
      A: CYCLE_2_WORKOUT_A,
      B: CYCLE_2_WORKOUT_B,
      C: CYCLE_2_WORKOUT_C,
      D: CYCLE_2_WORKOUT_D,
    },
  },
  {
    id: 3,
    name: 'Concentric-Isometric Intensification',
    focus: 'Higher intensity on both modalities with refined movement patterns',
    description: 'Advanced variations challenge movement competency. Pause reps, deficit work, and increased isometric demands for complete development.',
    workouts: {
      A: CYCLE_3_WORKOUT_A,
      B: CYCLE_3_WORKOUT_B,
      C: CYCLE_3_WORKOUT_C,
      D: CYCLE_3_WORKOUT_D,
    },
  },
  {
    id: 4,
    name: 'Eccentric Focus for Muscle Growth',
    focus: 'Eccentric overload for hypertrophy and injury resilience',
    description: 'Hypertrophy-focused cycle using advanced eccentric techniques: 2-up/1-down, slow negatives, and asymmetric loading for maximum muscle growth.',
    workouts: {
      A: CYCLE_4_WORKOUT_A,
      B: CYCLE_4_WORKOUT_B,
      C: CYCLE_4_WORKOUT_C,
      D: CYCLE_4_WORKOUT_D,
    },
  },
];

// Equipment list for Iron Bambino
export const HITTING_EQUIPMENT = [
  { id: 'bat', name: 'Game Bat', required: true, description: 'Your primary game bat' },
  { id: 'tee', name: 'Batting Tee', required: true, description: 'Adjustable height preferred' },
  { id: 'balls', name: 'Baseballs/Softballs', required: true, description: 'Minimum 12 balls' },
  { id: 'net', name: 'Hitting Net', required: true, description: 'For indoor/outdoor practice' },
  { id: 'barbell', name: 'Barbell & Plates', required: true, description: 'For compound lifts (45lb bar + plates)' },
  { id: 'dumbbells', name: 'Dumbbells', required: true, description: 'Various weights 10-80+ lbs' },
  { id: 'trap_bar', name: 'Trap/Hex Bar', required: true, description: 'For deadlifts - essential for program' },
  { id: 'cable_machine', name: 'Cable Machine', required: true, description: 'For woodchops, rows & pallof press' },
  { id: 'pullup_bar', name: 'Pull-Up Bar', required: true, description: 'For pull-ups & inverted rows' },
  { id: 'bench', name: 'Adjustable Bench', required: true, description: 'Flat & incline positions' },
  { id: 'weighted_bat', name: 'Weighted Training Bat', required: true, description: 'For overload training' },
  { id: 'speed_bat', name: 'Speed Training Bat', required: true, description: 'For underload training' },
  { id: 'resistance_bands', name: 'Resistance Bands', required: true, description: 'For hip, core & rotational work' },
  { id: 'med_ball', name: 'Medicine Ball', required: true, description: '6-10 lb for rotational power' },
  { id: 'box', name: 'Plyo Box/Step', required: false, description: 'For box squats & step-ups' },
  { id: 'landmine', name: 'Landmine Attachment', required: false, description: 'For rotational pressing' },
  { id: 'weighted_balls', name: 'Weighted Baseballs/Softballs', required: false, description: '2oz to 11oz for velocity development' },
  { id: 'therabands', name: 'Therabands/Resistance Tubes', required: false, description: 'For arm care and shoulder prehab' },
  { id: 'foam_roller', name: 'Foam Roller', required: false, description: 'For tissue capacity work and recovery' },
];

// =====================================================================
// ARM CARE BLOCK: Pre-Lift Arm Care (added to every workout day)
// =====================================================================

export const ARM_CARE_BLOCK: Exercise[] = [
  { name: 'Band Pull-Aparts', type: 'skill', sets: 3, reps: 15,
    description: 'Hold band at shoulder width with arms extended. Pull band apart by squeezing shoulder blades together. Scap retraction focus.',
    notes: 'Scap retraction, light band' },
  { name: 'Wall Slides', type: 'skill', sets: 3, reps: 10,
    description: 'Back and arms flat against wall, elbows at 90°. Slide arms overhead maintaining wall contact. Trains scapular upward rotation.',
    notes: 'Keep contact with wall throughout' },
  { name: 'Serratus Push-Up', type: 'skill', sets: 3, reps: 10,
    description: 'Standard push-up position. At the top, push further by protracting shoulder blades — rounding upper back. Activates serratus anterior.',
    notes: 'Protract at top, feel serratus' },
  { name: 'Prone Y-T-W Raises', type: 'skill', sets: 3, reps: 8,
    description: 'Lie face down on bench or floor. Raise arms into Y, T, then W positions with thumbs up. Rotator cuff progression.',
    notes: 'Each position, light weight or bodyweight' },
  { name: 'Side-Lying External Rotation', type: 'skill', sets: 3, reps: 12,
    description: 'Lie on side, elbow pinned to waist at 90°. Rotate forearm away from body against gravity. Strengthens external rotators.',
    notes: 'Each side, 2-5lb dumbbell' },
  { name: 'Prone I Raise', type: 'skill', sets: 3, reps: 10,
    description: 'Lie face down, arms extended overhead (I position). Raise arms off ground with thumbs up. Lower trap activation.',
    notes: 'Thumbs up, squeeze lower traps' },
  { name: 'Eccentric Wrist Flexor Curl', type: 'skill', sets: 3, reps: 10,
    description: 'Hold light dumbbell palm up. Use other hand to assist concentric, then slowly lower over 4 seconds. Builds deceleration tissue capacity.',
    notes: 'Each arm, 4s eccentric' },
  { name: '90/90 External Rotation Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Arm at 90° abduction, elbow at 90°. Rotate forearm back and hold. Isometric ER strengthening for throwing athletes.',
    notes: 'Each side, max tension' },
];

// =====================================================================
// DELOAD WEEK LOGIC
// =====================================================================

export const DELOAD_VOLUME_MODIFIER = 0.6;

export const isDeloadWeek = (weekNumber: number): boolean => {
  return weekNumber > 0 && weekNumber % 4 === 0;
};

// =====================================================================
// THROWING VELOCITY DEVELOPMENT BLOCKS
// =====================================================================

export const VELOCITY_DEV_BLOCK_A: Exercise[] = [
  { name: 'Hip-Lead Throws', type: 'skill', sets: 2, reps: 8,
    description: 'Using connection ball, initiate throw from hip rotation before arm action. Develops kinetic chain sequencing from ground up.',
    notes: 'Connection ball work, feel hip lead' },
  { name: 'Pivot Pickoffs', type: 'skill', sets: 2, reps: 8,
    description: 'From stretch position, pivot and throw to target. Develops hip-shoulder separation and quick transfer.',
    notes: 'Each side, hip-shoulder separation' },
  { name: 'Reverse Throws', type: 'skill', sets: 2, reps: 6,
    description: 'Face away from target, rotate and throw. Eccentric deceleration pattern training for arm health.',
    notes: 'Deceleration pattern, controlled' },
  { name: 'Lightweight Weighted Ball (3oz)', type: 'skill', sets: 3, reps: 8,
    description: '3oz weighted ball constraint drill. Lighter ball forces faster arm speed and cleaner mechanics.',
    notes: 'Constraint drill, focus on arm speed' },
  { name: 'Long Toss Progressive', type: 'skill', sets: 1, reps: 1,
    description: 'Build distance progressively to 120ft+. Track total throw count. Arc throws allowed — focus on building arm strength.',
    notes: 'Build to 120ft+, track throw count' },
];

export const VELOCITY_DEV_BLOCK_B: Exercise[] = [
  { name: 'Overload Weighted Ball (7-11oz)', type: 'skill', sets: 3, reps: 6,
    description: 'Heavy weighted ball thrown into wall or net. Overload builds arm strength and posterior chain loading.',
    notes: 'Into wall, controlled intent' },
  { name: 'Underload Weighted Ball (2-3oz)', type: 'skill', sets: 3, reps: 6,
    description: 'Lightweight ball thrown with max intent. Underload develops arm speed above game-speed threshold.',
    notes: 'Max intent throws, arm speed focus' },
  { name: 'Pull-Down Throws', type: 'skill', sets: 3, reps: 3,
    description: 'Running approach, throw into net with maximum effort. Develops peak velocity output and intent.',
    notes: 'Max effort, running start' },
  { name: 'Long Toss with Intent', type: 'skill', sets: 1, reps: 1,
    description: 'Build to max distance with intent on each throw. Line drives preferred over arcing. Track distance and throw count.',
    notes: 'Build to max distance, tracked' },
  { name: 'CNS Throw Count Tracker', type: 'skill', sets: 1, reps: 1,
    description: 'Record total throws × intensity coefficient for today. Feeds into weekly CNS budget. Baseball: overhand. Softball: position player overhand throws.',
    notes: 'Log total throws × intensity' },
];

// Sport-specific notes for velocity development
export const VELOCITY_SPORT_NOTES = {
  baseball: 'All throws overhand. Focus on mound mechanics transfer and arm slot consistency.',
  softball: 'Position player overhand throws. Focus on footwork patterns and transfer mechanics for defensive throws.',
};

// =====================================================================
// CNS BUDGET SYSTEM
// =====================================================================

export const CNS_BUDGET_DAILY = 100;

export interface CNSActivity {
  type: 'strength' | 'throwing' | 'sprinting' | 'bat_speed' | 'arm_care';
  intensity: 'low' | 'moderate' | 'high';
}

export const CNS_COSTS: Record<string, Record<string, number>> = {
  strength: { low: 25, moderate: 32, high: 40 },
  throwing: { low: 15, moderate: 22, high: 30 },
  sprinting: { low: 20, moderate: 27, high: 35 },
  bat_speed: { low: 10, moderate: 15, high: 20 },
  arm_care: { low: 5, moderate: 8, high: 10 },
};

export const calculateDailyCNS = (activities: CNSActivity[]): number => {
  return activities.reduce((total, activity) => {
    return total + (CNS_COSTS[activity.type]?.[activity.intensity] || 0);
  }, 0);
};

export const isOverBudget = (activities: CNSActivity[]): boolean => {
  return calculateDailyCNS(activities) > CNS_BUDGET_DAILY;
};

// Weekly template for 5Tool tier
export const FIVE_TOOL_WEEKLY_TEMPLATE = [
  { day: 1, title: 'Strength + Arm Care (Iron Bambino A)', cns: 40, activities: ['strength', 'arm_care', 'bat_speed'] },
  { day: 2, title: 'Speed Lab Sprint Session', cns: 30, activities: ['sprinting', 'arm_care'] },
  { day: 3, title: 'Throwing Velocity Development', cns: 25, activities: ['throwing', 'arm_care'] },
  { day: 4, title: 'REST', cns: 0, activities: [] },
  { day: 5, title: 'Strength + Arm Care (Iron Bambino B)', cns: 40, activities: ['strength', 'arm_care', 'bat_speed'] },
  { day: 6, title: 'Light Throwing + Active Recovery', cns: 15, activities: ['throwing'] },
  { day: 7, title: 'REST', cns: 0, activities: [] },
];
