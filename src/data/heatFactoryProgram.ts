import { Exercise } from '@/types/workout';

// =====================================================================
// HEAT FACTORY: ELITE 24-WEEK PERIODIZED PITCHING DEVELOPMENT PROGRAM
// =====================================================================
// Designed for velocity development, arm care, and elite pitcher development
// Schedule: Strength+Throwing → Rest → Velocity/Pitch Dev → Rest → Strength+Command
// 4 cycles × 6 weeks each with progressive intensity
// =====================================================================

// =====================================================================
// CYCLE 1: FOUNDATION & ARM HEALTH (Weeks 1-6)
// Focus: Build arm care base, mobility, mechanics foundation, tissue resilience
// =====================================================================

export const CYCLE_1_PITCHING_WORKOUT_A: Exercise[] = [
  // Lower Body Power + Hip Drive Development
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Stand inside hex bar, drive through heels to stand tall. Develops posterior chain power crucial for leg drive off the mound.',
    notes: 'Explosive drive, hip extension focus' },
  { name: 'Front Squat', type: 'strength', sets: 4, reps: 5, percentOf1RM: 72, trackWeight: true,
    description: 'Bar on front delts, deep squat with upright torso. Builds quad strength for landing leg stability.',
    notes: 'Deep depth, chest up' },
  { name: 'Single-Leg Romanian Deadlift', type: 'strength', sets: 3, reps: 6, percentOf1RM: 60, trackWeight: true,
    description: 'Hinge on drive leg, other leg extends behind. Develops single-leg stability essential for push-off.',
    notes: 'Each leg, balance focus' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Rear foot elevated, descend deep on front leg. Builds landing leg strength for deceleration.',
    notes: 'Each leg, rear foot elevated' },
  { name: 'Pallof Press', type: 'strength', sets: 3, reps: 8, percentOf1RM: 60, trackWeight: true,
    description: 'Cable at chest height, press forward resisting rotation. Core anti-rotation strength for trunk stability.',
    notes: 'Each side, 3s hold at extension' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 3, holdTime: 20,
    description: 'Thighs parallel to floor, back against wall. Builds quad endurance for repeated pitching efforts.',
    notes: 'Maximum tension, breathe steadily' },
];

export const CYCLE_1_PITCHING_WORKOUT_B: Exercise[] = [
  // Upper Body Push/Pull + Rotational Core
  { name: 'Dumbbell Bench Press', type: 'strength', sets: 4, reps: 6, percentOf1RM: 72, trackWeight: true,
    description: 'Independent arm pressing for shoulder stability and pec strength. Balanced development prevents imbalances.',
    notes: 'Full ROM, pause at bottom' },
  { name: 'Chest-Supported Row', type: 'strength', sets: 4, reps: 6, percentOf1RM: 70, trackWeight: true,
    description: 'Chest on incline bench, row dumbbells to ribcage. Pure back strength without momentum.',
    notes: 'Squeeze shoulder blades, strict form' },
  { name: 'Face Pulls', type: 'strength', sets: 3, reps: 12, percentOf1RM: 55, trackWeight: true,
    description: 'Cable at face height, pull to ears with external rotation. Crucial for posterior shoulder health.',
    notes: 'Elbows high, external rotation at finish' },
  { name: 'Landmine Press', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Single-arm press with landmine bar. Scapular-friendly overhead pressing with rotational element.',
    notes: 'Each arm, stable core' },
  { name: 'Cable Woodchop High-to-Low', type: 'strength', sets: 3, reps: 8, percentOf1RM: 60, trackWeight: true,
    description: 'High cable, pull diagonally across body with hip rotation. Mimics pitching rotation pattern.',
    notes: 'Each side, explosive rotation' },
  { name: 'Isometric Side Plank', type: 'isometric', sets: 3, holdTime: 20,
    description: 'On elbow and side of foot, maintain straight body line. Lateral core stability for trunk control.',
    notes: 'Each side, hips high' },
];

export const CYCLE_1_PITCHING_WORKOUT_C: Exercise[] = [
  // Single-Leg Strength + Anti-Rotation
  { name: 'Barbell Hip Thrust', type: 'strength', sets: 4, reps: 6, percentOf1RM: 75, trackWeight: true,
    description: 'Bar across hips, drive hips up. Maximum glute power for drive phase of pitching motion.',
    notes: 'Full hip extension, squeeze at top' },
  { name: 'Step-Up', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'High box step-up with dumbbells. Single-leg strength for explosive push-off.',
    notes: 'Each leg, minimal push from trail leg' },
  { name: 'Lat Pulldown', type: 'strength', sets: 4, reps: 6, percentOf1RM: 70, trackWeight: true,
    description: 'Wide grip pull to upper chest. Lat strength for arm deceleration and throwing power.',
    notes: 'Full stretch at top, squeeze lats' },
  { name: 'Dumbbell Shoulder Press', type: 'strength', sets: 3, reps: 6, percentOf1RM: 68, trackWeight: true,
    description: 'Seated or standing, press dumbbells overhead. Shoulder strength for arm acceleration.',
    notes: 'Full lockout, controlled descent' },
  { name: 'Half-Kneeling Cable Anti-Rotation', type: 'strength', sets: 3, reps: 8, percentOf1RM: 55, trackWeight: true,
    description: 'Half-kneel position, cable at chest height, resist rotation. Trains trunk stability.',
    notes: 'Each side, maintain upright posture' },
  { name: 'Isometric Glute Bridge Hold', type: 'isometric', sets: 3, holdTime: 20,
    description: 'Hips elevated, single or double leg. Glute endurance for repeated drive phase activation.',
    notes: 'Full hip extension, maximum squeeze' },
];

export const CYCLE_1_PITCHING_WORKOUT_D: Exercise[] = [
  // Total Body Power + Arm Care Integration
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 6, percentOf1RM: 70, trackWeight: true,
    description: 'Hip hinge with slight knee bend, maximum hamstring stretch. Posterior chain for power generation.',
    notes: 'Hip hinge, hamstring stretch' },
  { name: 'Push-Up Variations', type: 'strength', sets: 3, reps: 10, percentOf1RM: 0, trackWeight: false,
    description: 'Standard, diamond, or archer push-ups. Shoulder stability with bodyweight control.',
    notes: 'Full ROM, core engaged' },
  { name: 'Single-Arm Dumbbell Row', type: 'strength', sets: 3, reps: 6, percentOf1RM: 68, trackWeight: true,
    description: 'Row dumbbell to hip while resisting torso rotation. Back strength with anti-rotation.',
    notes: 'Each arm, maintain flat back' },
  { name: 'Lateral Lunge', type: 'strength', sets: 3, reps: 6, percentOf1RM: 60, trackWeight: true,
    description: 'Step wide laterally into deep lunge. Hip mobility and lateral strength for stride phase.',
    notes: 'Each leg, sit back into hip' },
  { name: 'Med Ball Rotational Slam', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: false,
    description: 'Rotate and slam med ball diagonally. Explosive rotational power development.',
    notes: 'Each side, max intent' },
  { name: 'Isometric Hollow Body Hold', type: 'isometric', sets: 3, holdTime: 20,
    description: 'Lower back pressed to floor, limbs extended. Total core stability for trunk control.',
    notes: 'Lower back pressed down' },
];

// =====================================================================
// CYCLE 2: VELOCITY DEVELOPMENT (Weeks 7-12)
// Focus: Progressive overload for velocity, long toss progressions, weighted balls
// =====================================================================

export const CYCLE_2_PITCHING_WORKOUT_A: Exercise[] = [
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 5, reps: 3, percentOf1RM: 85, trackWeight: true,
    description: 'Heavy pulls for maximum posterior chain strength. Foundation for explosive leg drive.',
    notes: 'Max strength, full reset each rep' },
  { name: 'Box Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true,
    description: 'Sit back to box, explode up. Teaches rate of force development from dead stop.',
    notes: 'Dead stop start, no momentum' },
  { name: 'Walking Lunge', type: 'strength', sets: 3, reps: 5, percentOf1RM: 68, trackWeight: true,
    description: 'Continuous forward lunges with dumbbells. Single-leg strength and hip mobility.',
    notes: 'Each leg, continuous motion' },
  { name: 'Hip Thrust', type: 'strength', sets: 4, reps: 5, percentOf1RM: 80, trackWeight: true,
    description: 'Heavy hip thrusts for glute power. Maximal drive phase force production.',
    notes: 'Heavy loading, full extension' },
  { name: 'Pallof Press with Step', type: 'strength', sets: 4, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Dynamic anti-rotation with lateral step. Increased core demand.',
    notes: 'Each side, step out at extension' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Maintenance isometric for quad endurance.',
    notes: 'Reduced volume, max tension' },
];

export const CYCLE_2_PITCHING_WORKOUT_B: Exercise[] = [
  { name: 'Barbell Bench Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true,
    description: 'Heavy pressing for upper body power. Chest and tricep strength for acceleration.',
    notes: 'Pause at chest, explosive drive' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true,
    description: 'Add weight for heavy pulling. Lat strength for deceleration and arm health.',
    notes: 'Dead hang start, chin over bar' },
  { name: 'Face Pulls', type: 'strength', sets: 4, reps: 10, percentOf1RM: 58, trackWeight: true,
    description: 'Maintain rear delt and external rotator strength. Critical for arm health.',
    notes: 'High volume, external rotation focus' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Upper chest development with independent arms. Shoulder-friendly pressing.',
    notes: '30° incline, full ROM' },
  { name: 'Cable Woodchop Low-to-High', type: 'strength', sets: 4, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Upward rotational power. Mimics trunk rotation in pitching.',
    notes: 'Each side, explosive' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Mid-position hold for shoulder stability.',
    notes: 'Mid-position, max tension' },
];

export const CYCLE_2_PITCHING_WORKOUT_C: Exercise[] = [
  { name: 'Sumo Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true,
    description: 'Wide stance pulling for hip and adductor strength. Hip power development.',
    notes: 'Wide stance, hips through' },
  { name: 'Front Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true,
    description: 'Anterior core demand with heavy loading. Quad strength for landing leg.',
    notes: 'Deep depth, elbows up' },
  { name: 'Single-Leg Hip Thrust', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: true,
    description: 'Unilateral glute power development. Isolates drive leg strength.',
    notes: 'Each leg, full extension' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Heavy rowing for back thickness. Balanced pulling for shoulder health.',
    notes: 'Strict form, squeeze at top' },
  { name: 'Landmine Rotational Press', type: 'strength', sets: 3, reps: 6, percentOf1RM: 68, trackWeight: true,
    description: 'Rotational pressing power with hip drive.',
    notes: 'Each side, full hip rotation' },
  { name: 'Isometric Anti-Rotation Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Static anti-rotation for core stability.',
    notes: 'Each side, resist rotation' },
];

export const CYCLE_2_PITCHING_WORKOUT_D: Exercise[] = [
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Posterior chain emphasis for hamstring and glute development.',
    notes: 'Hip hinge, hamstring stretch' },
  { name: 'Close-Grip Bench Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Tricep-focused pressing for arm acceleration strength.',
    notes: 'Elbows tucked, explosive lockout' },
  { name: 'Lat Pulldown', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Vertical pulling for lat strength. Arm deceleration support.',
    notes: 'Wide grip, squeeze lats' },
  { name: 'Step-Up', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true,
    description: 'High box single-leg strength. Push-off power development.',
    notes: 'Each leg, high box' },
  { name: 'Med Ball Scoop Toss', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: false,
    description: 'Explosive hip extension with med ball throw. Power transfer drill.',
    notes: 'Max intent, hip extension focus' },
  { name: 'Plank with Shoulder Tap', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false,
    description: 'Dynamic plank with anti-rotation demand.',
    notes: 'Each side, hips stable' },
];

// =====================================================================
// CYCLE 3: PITCH ARSENAL DEVELOPMENT (Weeks 13-18)
// Focus: Breaking ball mastery, changeup refinement, tunneling
// =====================================================================

export const CYCLE_3_PITCHING_WORKOUT_A: Exercise[] = [
  { name: 'Deficit Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true,
    description: 'Stand on 2-3" platform for increased ROM. Greater hip and leg drive development.',
    notes: '2-3" deficit, explosive' },
  { name: 'Pause Squat', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true,
    description: '3-second pause at bottom eliminates stretch reflex. Pure strength from dead stop.',
    notes: '3s pause at bottom' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 72, trackWeight: true,
    description: 'Heavy single-leg work for drive leg strength.',
    notes: 'Each leg, heavy loading' },
  { name: 'Barbell Hip Thrust', type: 'strength', sets: 4, reps: 5, percentOf1RM: 82, trackWeight: true,
    description: 'Heavy hip thrusts for maximum glute power.',
    notes: 'Max squeeze at top' },
  { name: 'Half-Kneeling Cable Chop', type: 'strength', sets: 4, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Rotational power from half-kneeling. Hip and core integration.',
    notes: 'Each side, explosive' },
  { name: 'Isometric Split Squat Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Bottom position hold for positional strength.',
    notes: 'Each leg, bottom position' },
];

export const CYCLE_3_PITCHING_WORKOUT_B: Exercise[] = [
  { name: 'Spoto Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true,
    description: 'Pause 1" off chest for 2 seconds. Builds strength at sticking point.',
    notes: '1" off chest, 2s pause' },
  { name: 'Pendlay Row', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true,
    description: 'From floor each rep, explosive row. Dead stop builds pure pulling power.',
    notes: 'Dead stop each rep' },
  { name: 'Face Pulls with External Rotation', type: 'strength', sets: 4, reps: 10, percentOf1RM: 60, trackWeight: true,
    description: 'Added external rotation at peak contraction. Maximum posterior shoulder work.',
    notes: 'Pause and rotate at end' },
  { name: 'Z-Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true,
    description: 'Seated on floor pressing. Eliminates leg drive, pure upper body strength.',
    notes: 'Legs extended, strict press' },
  { name: 'Cable Low-to-High Rotation', type: 'strength', sets: 4, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Upward rotation pattern with full hip engagement.',
    notes: 'Each side, full rotation' },
  { name: 'Isometric Inverted Row Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Chest to bar position hold. Upper back isometric strength.',
    notes: 'Chest to bar position' },
];

export const CYCLE_3_PITCHING_WORKOUT_C: Exercise[] = [
  { name: 'Sumo Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 85, trackWeight: true,
    description: 'Heavy sumo pulling for hip strength.',
    notes: 'Max strength sumo' },
  { name: 'Front Squat with Pause', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true,
    description: '2-second pause at bottom. Core stability with heavy load.',
    notes: '2s pause, elbows up' },
  { name: 'Single-Leg Hip Thrust', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: true,
    description: 'Unilateral glute power at higher intensity.',
    notes: 'Each leg, max squeeze' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 4, reps: 4, percentOf1RM: 82, trackWeight: true,
    description: 'Heavy vertical pulling for lat strength.',
    notes: 'Heavy, full ROM' },
  { name: 'Half-Kneeling Cable Lift', type: 'strength', sets: 3, reps: 6, percentOf1RM: 62, trackWeight: true,
    description: 'Low-to-high lift pattern from half-kneel.',
    notes: 'Each side, full range' },
  { name: 'Isometric Dead Bug Hold', type: 'isometric', sets: 3, holdTime: 15,
    description: 'Limbs extended, lower back pressed down. Core stability hold.',
    notes: 'Opposite arm/leg extended' },
];

export const CYCLE_3_PITCHING_WORKOUT_D: Exercise[] = [
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true,
    description: 'Heavier RDL for posterior chain development.',
    notes: 'Control throughout' },
  { name: 'Incline Barbell Press', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true,
    description: 'Heavy incline pressing for upper chest and shoulder.',
    notes: '30° incline, pause at bottom' },
  { name: 'Chest-Supported Row', type: 'strength', sets: 4, reps: 5, percentOf1RM: 78, trackWeight: true,
    description: 'Strict rowing for back development.',
    notes: 'No momentum, squeeze lats' },
  { name: 'Lateral Lunge', type: 'strength', sets: 3, reps: 5, percentOf1RM: 65, trackWeight: true,
    description: 'Lateral strength for hip mobility and adductor strength.',
    notes: 'Each leg, deep lunge' },
  { name: 'Med Ball Rotational Throw', type: 'strength', sets: 4, reps: 5, percentOf1RM: 0, trackWeight: false,
    description: 'Rotational power throw against wall. Max intent rotation.',
    notes: 'Each side, max velocity' },
  { name: 'Plank with Reach', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false,
    description: 'Plank with alternating arm reach. Dynamic core stability.',
    notes: 'Each arm, hips stable' },
];

// =====================================================================
// CYCLE 4: GAME READINESS & MAINTENANCE (Weeks 19-24)
// Focus: Simulated games, in-season conditioning, peak performance
// =====================================================================

export const CYCLE_4_PITCHING_WORKOUT_A: Exercise[] = [
  { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 3, percentOf1RM: 88, trackWeight: true,
    description: 'Peak strength pulling. Maximum force production.',
    notes: 'Peak intensity, perfect form' },
  { name: 'Back Squat', type: 'strength', sets: 4, reps: 3, percentOf1RM: 85, trackWeight: true,
    description: 'Heavy squatting for leg strength maintenance.',
    notes: 'Deep, controlled reps' },
  { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 4, percentOf1RM: 75, trackWeight: true,
    description: 'Single-leg strength at peak intensity.',
    notes: 'Each leg, heavy' },
  { name: 'Hip Thrust', type: 'strength', sets: 4, reps: 4, percentOf1RM: 85, trackWeight: true,
    description: 'Peak glute power development.',
    notes: 'Max load, full extension' },
  { name: 'Pallof Press with Rotation', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Dynamic anti-rotation with controlled rotation element.',
    notes: 'Each side, controlled' },
  { name: 'Isometric Wall Sit', type: 'isometric', sets: 2, holdTime: 20,
    description: 'Maintenance quad endurance.',
    notes: 'Reduced volume' },
];

export const CYCLE_4_PITCHING_WORKOUT_B: Exercise[] = [
  { name: 'Bench Press', type: 'strength', sets: 4, reps: 3, percentOf1RM: 85, trackWeight: true,
    description: 'Peak pressing strength.',
    notes: 'Heavy, controlled' },
  { name: 'Weighted Pull-Up', type: 'strength', sets: 4, reps: 3, percentOf1RM: 85, trackWeight: true,
    description: 'Peak pulling strength for lat development.',
    notes: 'Heavy, full ROM' },
  { name: 'Face Pulls', type: 'strength', sets: 4, reps: 12, percentOf1RM: 55, trackWeight: true,
    description: 'High volume rear delt work for arm health maintenance.',
    notes: 'Volume focus, external rotation' },
  { name: 'Dumbbell Shoulder Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 72, trackWeight: true,
    description: 'Shoulder strength maintenance.',
    notes: 'Full lockout, controlled' },
  { name: 'Cable Woodchop', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Rotational power maintenance.',
    notes: 'Each side, explosive' },
  { name: 'Isometric Push-Up Hold', type: 'isometric', sets: 2, holdTime: 15,
    description: 'Shoulder stability maintenance.',
    notes: 'Mid-position hold' },
];

export const CYCLE_4_PITCHING_WORKOUT_C: Exercise[] = [
  { name: 'Sumo Deadlift', type: 'strength', sets: 4, reps: 3, percentOf1RM: 85, trackWeight: true,
    description: 'Peak sumo strength.',
    notes: 'Max strength' },
  { name: 'Front Squat', type: 'strength', sets: 4, reps: 3, percentOf1RM: 82, trackWeight: true,
    description: 'Peak front squat strength.',
    notes: 'Heavy, upright torso' },
  { name: 'Single-Leg RDL', type: 'strength', sets: 3, reps: 5, percentOf1RM: 68, trackWeight: true,
    description: 'Single-leg posterior chain strength.',
    notes: 'Each leg, balance' },
  { name: 'Barbell Row', type: 'strength', sets: 4, reps: 4, percentOf1RM: 80, trackWeight: true,
    description: 'Heavy rowing for back strength.',
    notes: 'Strict form' },
  { name: 'Half-Kneeling Cable Press', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
    description: 'Single-arm pressing with core engagement.',
    notes: 'Each arm, stable hips' },
  { name: 'Isometric Glute Bridge', type: 'isometric', sets: 2, holdTime: 20,
    description: 'Glute endurance maintenance.',
    notes: 'Single or double leg' },
];

export const CYCLE_4_PITCHING_WORKOUT_D: Exercise[] = [
  { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 78, trackWeight: true,
    description: 'Posterior chain maintenance.',
    notes: 'Control, full stretch' },
  { name: 'Incline Dumbbell Press', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Upper chest and shoulder pressing.',
    notes: '30° incline' },
  { name: 'Lat Pulldown', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
    description: 'Vertical pulling maintenance.',
    notes: 'Wide grip, full stretch' },
  { name: 'Step-Up', type: 'strength', sets: 3, reps: 4, percentOf1RM: 70, trackWeight: true,
    description: 'Single-leg strength maintenance.',
    notes: 'Each leg, high box' },
  { name: 'Med Ball Slam', type: 'strength', sets: 3, reps: 6, percentOf1RM: 0, trackWeight: false,
    description: 'Full body power expression.',
    notes: 'Max intent' },
  { name: 'Dead Bug', type: 'strength', sets: 3, reps: 8, percentOf1RM: 0, trackWeight: false,
    description: 'Core stability with contralateral movement.',
    notes: 'Each side, lower back flat' },
];

// =====================================================================
// ARM CARE EXERCISES
// Essential for pitcher health - performed daily
// =====================================================================

export const ARM_CARE_EXERCISES: { [key: string]: Exercise } = {
  // J-Band Series
  'J-Band Internal Rotation': { name: 'J-Band Internal Rotation', type: 'skill',
    description: 'Band anchored at elbow height, internally rotate forearm across body. Strengthens subscapularis for throwing arm health.' },
  'J-Band External Rotation': { name: 'J-Band External Rotation', type: 'skill',
    description: 'Band anchored at elbow height, externally rotate forearm away from body. Strengthens infraspinatus and teres minor for arm deceleration.' },
  'J-Band Scap Retraction': { name: 'J-Band Scap Retraction', type: 'skill',
    description: 'Pull band straight back squeezing shoulder blades together. Scapular stability for proper arm path.' },
  'J-Band High Pulls': { name: 'J-Band High Pulls', type: 'skill',
    description: 'Band at waist, pull to face height with elbows high. Posterior shoulder and upper back strength.' },
  'J-Band Throwing Motion': { name: 'J-Band Throwing Motion', type: 'skill',
    description: 'Simulate throwing motion against band resistance. Builds arm speed through throwing-specific pattern.' },

  // Stretching & Mobility
  'Sleeper Stretch': { name: 'Sleeper Stretch', type: 'skill',
    description: 'Lie on throwing side, internally rotate forearm toward floor. Stretches posterior shoulder capsule for improved internal rotation.' },
  'Cross-Body Stretch': { name: 'Cross-Body Stretch', type: 'skill',
    description: 'Pull throwing arm across chest with opposite hand. Stretches posterior deltoid and capsule.' },
  'Doorway Pec Stretch': { name: 'Doorway Pec Stretch', type: 'skill',
    description: 'Forearm on doorframe, lean forward to stretch chest. Opens anterior shoulder for proper throwing mechanics.' },
  'Lat Stretch': { name: 'Lat Stretch', type: 'skill',
    description: 'Arm overhead, lean away to stretch lat. Improves overhead mobility for arm path.' },
  'Thoracic Spine Rotation': { name: 'Thoracic Spine Rotation', type: 'skill',
    description: 'Quadruped or seated rotation of upper back. Improves trunk rotation for throwing power.' },

  // Wrist & Forearm
  'Wrist Flexion/Extension': { name: 'Wrist Flexion/Extension', type: 'skill',
    description: 'Light dumbbell wrist curls and extensions. Forearm strength for grip and wrist snap.' },
  'Pronation/Supination': { name: 'Pronation/Supination', type: 'skill',
    description: 'Rotate forearm palm up/down with light weight. Forearm rotator strength for pronation at release.' },
  'Rice Bucket Dig': { name: 'Rice Bucket Dig', type: 'skill',
    description: 'Dig and squeeze through bucket of rice. Full forearm and grip strengthening.' },
  'Ball Squeezes': { name: 'Ball Squeezes', type: 'skill',
    description: 'Squeeze stress ball or tennis ball. Grip endurance and forearm activation.' },

  // Rhythmic Stabilization
  'Rhythmic Stabilization': { name: 'Rhythmic Stabilization', type: 'skill',
    description: 'Partner or self-applied perturbations in various arm positions. Trains rotator cuff reactive stability.' },
};

// =====================================================================
// VELOCITY DEVELOPMENT EXERCISES
// Progressive throwing programs for velocity gains
// =====================================================================

export const VELOCITY_EXERCISES: { [key: string]: Exercise } = {
  // Long Toss Progressions
  'Long Toss Warm-Up - 60ft': { name: 'Long Toss Warm-Up - 60ft', type: 'skill',
    description: 'Easy catch play at 60 feet. Loose arm action, building to 70% effort by end of set.' },
  'Long Toss Build - 90ft': { name: 'Long Toss Build - 90ft', type: 'skill',
    description: '90-foot throws with moderate arc. 75-80% effort, feeling arm extension.' },
  'Long Toss Extension - 120ft': { name: 'Long Toss Extension - 120ft', type: 'skill',
    description: 'Extended throws at 120 feet. Arc allowed, building toward max effort.' },
  'Long Toss Max - 150-200ft': { name: 'Long Toss Max - 150-200ft', type: 'skill',
    description: 'Maximum distance throws at 90-100% effort. Full body engagement, letting it eat.' },
  'Pull-Down Phase': { name: 'Pull-Down Phase', type: 'skill',
    description: 'After max distance, work back in on a line. Carry long toss intent to shorter distances.' },

  // Weighted Ball Protocols
  'Weighted Ball - 4oz Underload': { name: 'Weighted Ball - 4oz Underload', type: 'skill',
    description: 'Lighter ball for overspeed training. Swing faster, train nervous system for higher velocity.' },
  'Weighted Ball - 5oz Standard': { name: 'Weighted Ball - 5oz Standard', type: 'skill',
    description: 'Regular ball work for baseline velocity and command.' },
  'Weighted Ball - 7oz Overload': { name: 'Weighted Ball - 7oz Overload', type: 'skill',
    description: 'Heavy ball for building arm strength. Controlled throws, feel the resistance.' },
  'Weighted Ball - 9oz Overload': { name: 'Weighted Ball - 9oz Overload', type: 'skill',
    description: 'Heavy constraint throws for maximum arm strength. Short tosses, focus on arm path.' },
  'Weighted Ball - 11oz Max': { name: 'Weighted Ball - 11oz Max', type: 'skill',
    description: 'Maximum overload throws for tissue adaptation. Very short tosses, arm care focus.' },
  'Contrast Throws': { name: 'Contrast Throws', type: 'skill',
    description: '3 heavy ball, 3 light ball, 3 regular ball. Creates overspeed effect through contrast.' },

  // Intent Throwing
  'Max Intent Bullpen': { name: 'Max Intent Bullpen', type: 'skill',
    description: 'All pitches at 95-100% effort. Training nervous system for max velocity. Limited pitch count.' },
  'Velo Day - Gun Readings': { name: 'Velo Day - Gun Readings', type: 'skill',
    description: 'Radar gun sessions tracking max and average velocity. Data collection for progress.' },
  'Crow Hop Throws': { name: 'Crow Hop Throws', type: 'skill',
    description: 'Running crow hop into throw for momentum-based velocity. Teaches force transfer.' },
  'Rocker Throws': { name: 'Rocker Throws', type: 'skill',
    description: 'Rock back and throw, generating power from weight shift. Timing and sequencing work.' },

  // PlyoCare Work
  'PlyoCare Pivot Pickoffs': { name: 'PlyoCare Pivot Pickoffs', type: 'skill',
    description: 'Quick rotation throws with PlyoCare ball. Develops quick arm and hip separation.' },
  'PlyoCare Roll-Ins': { name: 'PlyoCare Roll-Ins', type: 'skill',
    description: 'Roll ball in toward body, throw on the move. Dynamic arm action development.' },
  'PlyoCare Reverse Throws': { name: 'PlyoCare Reverse Throws', type: 'skill',
    description: 'Back to target, rotate and throw. Extreme hip/shoulder separation.' },
};

// =====================================================================
// PITCH DEVELOPMENT EXERCISES
// Breaking ball and off-speed development
// =====================================================================

export const PITCH_DEV_EXERCISES: { [key: string]: Exercise } = {
  // Curveball Development
  'Curveball Grip Work': { name: 'Curveball Grip Work', type: 'skill',
    description: 'Practice grip variations, finding comfortable finger pressure and seam orientation.' },
  'Curveball Spin Drills': { name: 'Curveball Spin Drills', type: 'skill',
    description: 'Short distance spins focusing on tight rotation and axis. See the spin.' },
  'Curveball Shape Focus': { name: 'Curveball Shape Focus', type: 'skill',
    description: 'Full distance curves, focusing on consistent break shape and depth.' },

  // Slider Development
  'Slider Grip Work': { name: 'Slider Grip Work', type: 'skill',
    description: 'Practice slider grip with finger pressure on inner seam. Find your comfort zone.' },
  'Slider Wrist Action': { name: 'Slider Wrist Action', type: 'skill',
    description: 'Isolate slider release action. Bullet spin with tight dot.' },
  'Slider Tunnel Drill': { name: 'Slider Tunnel Drill', type: 'skill',
    description: 'Throw slider through fastball tunnel, late break for deception.' },

  // Changeup Development
  'Changeup Grip Work': { name: 'Changeup Grip Work', type: 'skill',
    description: 'Circle change, 3-finger, or other grip variations. Find what works.' },
  'Changeup Arm Speed Matching': { name: 'Changeup Arm Speed Matching', type: 'skill',
    description: 'Match fastball arm speed with changeup grip. Deception is key.' },
  'Changeup Feel Drills': { name: 'Changeup Feel Drills', type: 'skill',
    description: 'Short distance changeups developing touch and feel for speed differential.' },

  // Command Work
  'Quadrant Work': { name: 'Quadrant Work', type: 'skill',
    description: 'Hit specific quadrants of strike zone. Build precision command.' },
  'Glove Side/Arm Side': { name: 'Glove Side/Arm Side', type: 'skill',
    description: 'Work both edges of plate. Develop horizontal command.' },
  'Up/Down Ladder': { name: 'Up/Down Ladder', type: 'skill',
    description: 'Work top and bottom of zone. Vertical command development.' },
  'Pitch Sequencing': { name: 'Pitch Sequencing', type: 'skill',
    description: 'Practice 2 and 3 pitch sequences. Build game-like patterns.' },
  'Tunnel Drills': { name: 'Tunnel Drills', type: 'skill',
    description: 'Throw different pitches through same tunnel. Develop deception.' },
};

// =====================================================================
// DAILY THROWING PROGRAMS BY DAY TYPE
// =====================================================================

// Arm Care Only (Rest Days)
export const ARM_CARE_DAY: string[] = [
  'J-Band Internal Rotation',
  'J-Band External Rotation',
  'J-Band Scap Retraction',
  'Sleeper Stretch',
  'Cross-Body Stretch',
  'Wrist Flexion/Extension',
];

// Velocity Development Day 1
export const VELOCITY_DAY_1: string[] = [
  'Long Toss Warm-Up - 60ft',
  'Long Toss Build - 90ft',
  'Long Toss Extension - 120ft',
  'Long Toss Max - 150-200ft',
  'Pull-Down Phase',
  'Velo Day - Gun Readings',
];

// Velocity Development Day 2
export const VELOCITY_DAY_2: string[] = [
  'Weighted Ball - 7oz Overload',
  'Weighted Ball - 5oz Standard',
  'Weighted Ball - 4oz Underload',
  'Contrast Throws',
  'Crow Hop Throws',
  'Max Intent Bullpen',
];

// Velocity Development Day 3
export const VELOCITY_DAY_3: string[] = [
  'PlyoCare Pivot Pickoffs',
  'PlyoCare Roll-Ins',
  'PlyoCare Reverse Throws',
  'Rocker Throws',
  'Long Toss Max - 150-200ft',
  'Pull-Down Phase',
];

// Pitch Development Day 1
export const PITCH_DEV_DAY_1: string[] = [
  'Curveball Grip Work',
  'Curveball Spin Drills',
  'Curveball Shape Focus',
  'Quadrant Work',
  'Pitch Sequencing',
  'Tunnel Drills',
];

// Pitch Development Day 2
export const PITCH_DEV_DAY_2: string[] = [
  'Slider Grip Work',
  'Slider Wrist Action',
  'Slider Tunnel Drill',
  'Changeup Grip Work',
  'Changeup Arm Speed Matching',
  'Pitch Sequencing',
];

// Pitch Development Day 3
export const PITCH_DEV_DAY_3: string[] = [
  'Changeup Feel Drills',
  'Glove Side/Arm Side',
  'Up/Down Ladder',
  'Quadrant Work',
  'Tunnel Drills',
  'Pitch Sequencing',
];

// Strength Day Arm Care (Post-Lift)
export const STRENGTH_DAY_ARM_CARE: string[] = [
  'J-Band Internal Rotation',
  'J-Band External Rotation',
  'J-Band High Pulls',
  'Sleeper Stretch',
];

// =====================================================================
// CYCLE CONFIGURATION
// =====================================================================

export interface PitchingCycleInfo {
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

export const PITCHING_CYCLES: PitchingCycleInfo[] = [
  {
    id: 1,
    name: 'Foundation & Arm Health',
    focus: 'Build arm care base, mobility, mechanics foundation, tissue resilience',
    description: 'Foundation cycle establishing arm health habits, building work capacity, and developing movement patterns for pitching longevity.',
    workouts: {
      A: CYCLE_1_PITCHING_WORKOUT_A,
      B: CYCLE_1_PITCHING_WORKOUT_B,
      C: CYCLE_1_PITCHING_WORKOUT_C,
      D: CYCLE_1_PITCHING_WORKOUT_D,
    },
  },
  {
    id: 2,
    name: 'Velocity Development',
    focus: 'Progressive overload for velocity with long toss and weighted ball protocols',
    description: 'Velocity-focused cycle using progressive long toss, weighted ball training, and max intent throwing to push velocity ceiling.',
    workouts: {
      A: CYCLE_2_PITCHING_WORKOUT_A,
      B: CYCLE_2_PITCHING_WORKOUT_B,
      C: CYCLE_2_PITCHING_WORKOUT_C,
      D: CYCLE_2_PITCHING_WORKOUT_D,
    },
  },
  {
    id: 3,
    name: 'Pitch Arsenal Development',
    focus: 'Breaking ball mastery, changeup refinement, tunneling and command',
    description: 'Arsenal development cycle focusing on secondary pitches, tunneling concepts, and building a complete pitch mix.',
    workouts: {
      A: CYCLE_3_PITCHING_WORKOUT_A,
      B: CYCLE_3_PITCHING_WORKOUT_B,
      C: CYCLE_3_PITCHING_WORKOUT_C,
      D: CYCLE_3_PITCHING_WORKOUT_D,
    },
  },
  {
    id: 4,
    name: 'Game Readiness & Peak',
    focus: 'Simulated games, in-season conditioning, peak performance',
    description: 'Peak performance cycle with simulated game situations, pitch count management, and competition preparation.',
    workouts: {
      A: CYCLE_4_PITCHING_WORKOUT_A,
      B: CYCLE_4_PITCHING_WORKOUT_B,
      C: CYCLE_4_PITCHING_WORKOUT_C,
      D: CYCLE_4_PITCHING_WORKOUT_D,
    },
  },
];

// =====================================================================
// EQUIPMENT LIST
// =====================================================================

export const PITCHING_EQUIPMENT = [
  { id: 'glove', name: 'Pitching Glove', required: true, description: 'Game-ready pitching glove' },
  { id: 'balls', name: 'Baseballs/Softballs', required: true, description: 'Minimum 24 balls for volume work' },
  { id: 'mound', name: 'Pitching Mound', required: true, description: 'Regulation or portable mound' },
  { id: 'jbands', name: 'J-Bands/Resistance Bands', required: true, description: 'For daily arm care routine' },
  { id: 'target', name: 'Strike Zone Target', required: true, description: 'For command work' },
  { id: 'barbell', name: 'Barbell & Plates', required: true, description: 'For compound lifts' },
  { id: 'dumbbells', name: 'Dumbbells', required: true, description: 'Various weights 10-80+ lbs' },
  { id: 'cable_machine', name: 'Cable Machine', required: true, description: 'For rotational and pulling exercises' },
  { id: 'pullup_bar', name: 'Pull-Up Bar', required: true, description: 'For pull-ups and hanging work' },
  { id: 'bench', name: 'Adjustable Bench', required: true, description: 'Flat and incline positions' },
  { id: 'trap_bar', name: 'Trap/Hex Bar', required: true, description: 'For deadlifts' },
  { id: 'weighted_balls', name: 'Weighted Baseballs', required: true, description: 'Set of 4oz, 5oz, 7oz, 9oz, 11oz' },
  { id: 'plyocare', name: 'PlyoCare Balls', required: true, description: 'Set of 5 weighted plyo balls' },
  { id: 'foam_roller', name: 'Foam Roller', required: true, description: 'For soft tissue work' },
  { id: 'med_ball', name: 'Medicine Ball', required: true, description: '4-10 lb for rotational power' },
  { id: 'radar_gun', name: 'Radar Gun/Pocket Radar', required: false, description: 'For velocity tracking' },
  { id: 'rice_bucket', name: 'Rice Bucket', required: false, description: 'For forearm and grip work' },
  { id: 'lacrosse_ball', name: 'Lacrosse Ball', required: false, description: 'For trigger point release' },
];
