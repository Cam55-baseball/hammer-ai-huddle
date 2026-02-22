import { Exercise } from '@/types/workout';
import { ARM_CARE_BLOCK, VELOCITY_DEV_BLOCK_A, VELOCITY_DEV_BLOCK_B } from './ironBambinoProgram';

// =====================================================================
// THE UNICORN: ELITE 24-WEEK MERGED PROGRAM
// =====================================================================
// Combines Heat Factory + Iron Bambino + Speed Lab
// 4 cycles × 6 weeks = 24 weeks, then loops
// 5 training days + 2 rest days per week
// =====================================================================

export interface UnicornDayTemplate {
  dayNumber: number;
  title: string;
  focus: string;
  cns: number;
  isRest: boolean;
  armCare: Exercise[];
  primaryExercises: Exercise[];
  secondaryExercises: Exercise[];
}

export interface UnicornCycle {
  id: number;
  name: string;
  intensityRange: string;
  description: string;
  days: UnicornDayTemplate[];
}

// Light arm care variant (reduced sets for recovery days)
const LIGHT_ARM_CARE: Exercise[] = ARM_CARE_BLOCK.map(e => ({
  ...e,
  sets: Math.max(1, (e.sets || 3) - 1),
  notes: e.notes ? `${e.notes} (light)` : '(light)',
}));

const REST_DAY: UnicornDayTemplate = {
  dayNumber: 0, title: 'REST', focus: 'Recovery', cns: 0, isRest: true,
  armCare: [], primaryExercises: [], secondaryExercises: [],
};

// =====================================================================
// CYCLE 1: FOUNDATION (75% intensity base)
// =====================================================================

const CYCLE_1_DAY_1: UnicornDayTemplate = {
  dayNumber: 1,
  title: 'Full Body Strength + Scap/Arm Care',
  focus: 'Strength',
  cns: 35,
  isRest: false,
  armCare: ARM_CARE_BLOCK,
  primaryExercises: [
    { name: 'Trap Bar Deadlift', type: 'strength', sets: 4, reps: 4, percentOf1RM: 75, trackWeight: true,
      description: 'Stand inside hex bar, drive through heels. Foundation cycle — build movement quality.', notes: 'Controlled tempo' },
    { name: 'Front Squat', type: 'strength', sets: 3, reps: 5, percentOf1RM: 70, trackWeight: true,
      description: 'Bar on front delts, deep depth with upright torso.', notes: 'Elbows high' },
    { name: 'Bench Press', type: 'strength', sets: 4, reps: 5, percentOf1RM: 75, trackWeight: true,
      description: 'Controlled descent, explosive press.', notes: 'Pause at chest' },
    { name: 'Barbell Row', type: 'strength', sets: 3, reps: 6, percentOf1RM: 70, trackWeight: true,
      description: 'Strict form, squeeze at top.', notes: '1s hold at top' },
  ],
  secondaryExercises: [
    { name: 'Pallof Press', type: 'strength', sets: 3, reps: 8, percentOf1RM: 60, trackWeight: true,
      description: 'Anti-rotation core stability.', notes: 'Each side' },
    { name: 'Isometric Wall Sit', type: 'isometric', sets: 3, holdTime: 10,
      description: 'Thighs parallel, maximum quad tension.', notes: 'Foundation hold' },
  ],
};

const CYCLE_1_DAY_2: UnicornDayTemplate = {
  dayNumber: 2,
  title: 'Pitching Velocity Development + Sprint Work',
  focus: 'Speed + Velocity',
  cns: 40,
  isRest: false,
  armCare: ARM_CARE_BLOCK,
  primaryExercises: VELOCITY_DEV_BLOCK_A,
  secondaryExercises: [
    { name: 'A-Skip Drill', type: 'skill', sets: 3, reps: 1,
      description: 'High knee drive with quick ground contact. Sprint mechanics foundation.', notes: '20 yards each' },
    { name: 'Wall Drives', type: 'skill', sets: 3, reps: 8,
      description: 'Hands on wall, drive knees alternately. Acceleration posture.', notes: 'Each leg' },
    { name: 'Falling Starts', type: 'skill', sets: 4, reps: 1,
      description: 'Lean forward until gravity pulls you into sprint. 10-20 yard bursts.', notes: '60-90% effort' },
    { name: 'Build-Up Sprints', type: 'skill', sets: 3, reps: 1,
      description: 'Gradual acceleration over 40-60 yards. Build to 90%.', notes: '60-90% intensity' },
  ],
};

const CYCLE_1_DAY_3: UnicornDayTemplate = {
  dayNumber: 3,
  title: 'Hitting Power (Bat Speed) + Active Recovery',
  focus: 'Power',
  cns: 25,
  isRest: false,
  armCare: LIGHT_ARM_CARE,
  primaryExercises: [
    { name: 'Overload Bat Swings', type: 'skill', sets: 3, reps: 10,
      description: 'Heavy bat, focus on hip drive and barrel path. Overload builds rotational strength.', notes: 'Controlled, quality reps' },
    { name: 'Underload Bat Swings', type: 'skill', sets: 3, reps: 10,
      description: 'Light bat, max hand speed. Trains fast-twitch muscle activation.', notes: 'Max speed intent' },
    { name: 'Game Bat Speed Swings', type: 'skill', sets: 3, reps: 8,
      description: 'Regular bat with max effort. Transfer from contrast training.', notes: 'Full intent' },
  ],
  secondaryExercises: [
    { name: 'Med Ball Rotational Slam', type: 'skill', sets: 3, reps: 6,
      description: 'Explosive hip rotation driving med ball into ground or wall.', notes: 'Each side' },
    { name: 'Foam Rolling & Mobility', type: 'skill', sets: 1, reps: 1,
      description: 'Full body foam rolling: quads, hamstrings, lats, thoracic spine. 60-90 seconds per area.', notes: '10-15 min total' },
  ],
};

const CYCLE_1_DAY_5: UnicornDayTemplate = {
  dayNumber: 5,
  title: 'Full Body Strength + Throwing Velocity',
  focus: 'Strength + Velocity',
  cns: 40,
  isRest: false,
  armCare: ARM_CARE_BLOCK,
  primaryExercises: [
    { name: 'Romanian Deadlift', type: 'strength', sets: 4, reps: 5, percentOf1RM: 70, trackWeight: true,
      description: 'Hip hinge with hamstring stretch focus.', notes: 'Controlled eccentric' },
    { name: 'Bulgarian Split Squat', type: 'strength', sets: 3, reps: 6, percentOf1RM: 65, trackWeight: true,
      description: 'Rear foot elevated, deep lunge.', notes: 'Each leg' },
    { name: 'Incline Dumbbell Press', type: 'strength', sets: 4, reps: 6, percentOf1RM: 72, trackWeight: true,
      description: '30° incline for upper chest and shoulder development.', notes: 'Full ROM' },
    { name: 'Weighted Pull-Up', type: 'strength', sets: 3, reps: 5, percentOf1RM: 75, trackWeight: true,
      description: 'Dead hang, chin over bar.', notes: 'Add weight progressively' },
  ],
  secondaryExercises: [
    { name: 'Cable Woodchop', type: 'strength', sets: 3, reps: 8, percentOf1RM: 65, trackWeight: true,
      description: 'Rotational power transfer from low to high.', notes: 'Each side' },
    ...VELOCITY_DEV_BLOCK_B,
  ],
};

const CYCLE_1_DAY_6: UnicornDayTemplate = {
  dayNumber: 6,
  title: 'Speed Lab + Light Arm Care',
  focus: 'Speed',
  cns: 25,
  isRest: false,
  armCare: LIGHT_ARM_CARE,
  primaryExercises: [
    { name: 'Pogo Hops', type: 'skill', sets: 3, reps: 15,
      description: 'Quick ground contact hops on balls of feet. Develops reactive stiffness.', notes: 'Minimize ground contact time' },
    { name: 'Depth Jumps', type: 'skill', sets: 3, reps: 5,
      description: 'Step off box, land and immediately jump up. Plyometric power.', notes: '12-18" box' },
    { name: 'Sprint Mechanics Drill', type: 'skill', sets: 4, reps: 1,
      description: 'Full sprint mechanics sequence: A-skip → B-skip → acceleration.', notes: '20 yards each' },
  ],
  secondaryExercises: [
    { name: 'Isometric Split Squat Hold', type: 'isometric', sets: 3, holdTime: 15,
      description: 'Bottom of split squat. Build positional strength.', notes: 'Each leg' },
    { name: 'Single-Leg Bound', type: 'skill', sets: 3, reps: 5,
      description: 'Single leg power bounds for distance. Horizontal force production.', notes: 'Each leg, max distance' },
  ],
};

// Build cycle helper
const buildCycle = (
  id: number, name: string, intensityRange: string, description: string,
  intensityModifier: number
): UnicornCycle => {
  // Apply intensity modifier to all strength exercises
  const modifyExercises = (exercises: Exercise[]): Exercise[] =>
    exercises.map(e => e.percentOf1RM ? { ...e, percentOf1RM: Math.round((e.percentOf1RM || 0) * intensityModifier) } : e);

  const modifyDay = (day: UnicornDayTemplate): UnicornDayTemplate => ({
    ...day,
    primaryExercises: modifyExercises(day.primaryExercises),
    secondaryExercises: modifyExercises(day.secondaryExercises),
  });

  return {
    id, name, intensityRange, description,
    days: [
      modifyDay(CYCLE_1_DAY_1),
      modifyDay(CYCLE_1_DAY_2),
      modifyDay(CYCLE_1_DAY_3),
      { ...REST_DAY, dayNumber: 4 },
      modifyDay(CYCLE_1_DAY_5),
      modifyDay(CYCLE_1_DAY_6),
      { ...REST_DAY, dayNumber: 7 },
    ],
  };
};

export const UNICORN_CYCLES: UnicornCycle[] = [
  buildCycle(1, 'Foundation', '75%', 'Build movement quality, establish base strength, learn velocity mechanics.', 1.0),
  buildCycle(2, 'Development', '80-85%', 'Increase loading across all modalities. Refine throwing mechanics.', 1.07),
  buildCycle(3, 'Intensification', '82-88%', 'Higher intensity, advanced exercise variations, increased sprint demands.', 1.12),
  buildCycle(4, 'Peaking', '85-90%', 'Peak performance phase. Highest loads, max intent throws, competition prep.', 1.17),
];

// =====================================================================
// CONSTANTS & HELPERS
// =====================================================================

export const UNICORN_WEEKLY_CNS_TARGET = 165;
export const UNICORN_DELOAD_MODIFIER = 0.6;
export const UNICORN_THROWING_THRESHOLD = 150;

export const UNICORN_RULES = [
  'Never pitch and throw max effort on the same day',
  'Never heavy lower body strength + max sprints on the same day',
  'Arm care integrated every training day',
  'Deload week every 4th week (all volume drops 40%)',
  'Throwing load tracked as pitch count equivalents',
  'Auto-suggests rest if weekly throwing exceeds threshold',
];

export const isUnicornDeloadWeek = (weekNumber: number): boolean => {
  return weekNumber > 0 && weekNumber % 4 === 0;
};

export const calculateUnicornWeeklyCNS = (dayCNSValues: number[]): number => {
  return dayCNSValues.reduce((sum, v) => sum + v, 0);
};
