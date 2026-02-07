// Speed Lab Program Data
// Professional drill library, sport-specific distances, session templates, goal tiers

export type SportType = 'baseball' | 'softball';

export interface DistanceConfig {
  key: string;
  label: string;
  yards: number;
}

export interface DrillData {
  id: string;
  name: string;
  category: DrillCategory;
  cues: string[];
  setsReps: string;
  duration?: string;
  minSessionNumber?: number;
  description: string;
  whyItHelps: string;
  barefootLevel?: number;
}

export type DrillCategory = 
  | 'activation'
  | 'isometric'
  | 'sprint_mechanics'
  | 'plyometric'
  | 'resisted'
  | 'cool_down'
  | 'break_day';

export interface SpeedTrackTier {
  key: string;
  label: string;
  nextTier: string | null;
  goalText: string;
  minPercent: number;
  maxPercent: number;
}

export interface SessionFocus {
  icon: string;
  messageKey: string;
}

// ─── Sport-Specific Distance Configs ─────────────────────────────────────────

export const BASEBALL_DISTANCES: DistanceConfig[] = [
  { key: '10y', label: '10 Yard', yards: 10 },
  { key: '30y', label: '30 Yard', yards: 30 },
  { key: '60y', label: '60 Yard', yards: 60 },
];

export const SOFTBALL_DISTANCES: DistanceConfig[] = [
  { key: '7y', label: '⅓ Base (~7 yd)', yards: 7 },
  { key: '20y', label: '1 Base (~20 yd)', yards: 20 },
  { key: '40y', label: '2 Bases (~40 yd)', yards: 40 },
];

export function getDistancesForSport(sport: SportType): DistanceConfig[] {
  return sport === 'baseball' ? BASEBALL_DISTANCES : SOFTBALL_DISTANCES;
}

// ─── World-Class Reference Tables (Internal Only) ───────────────────────────

export const WORLD_CLASS_REFERENCE: Record<SportType, Record<string, number>> = {
  baseball: { '10y': 1.41, '30y': 3.30, '60y': 6.40 },
  softball: { '7y': 1.00, '20y': 2.20, '40y': 4.25 },
};

// ─── Speed Track Tiers ──────────────────────────────────────────────────────

export const SPEED_TRACKS: SpeedTrackTier[] = [
  {
    key: 'building_speed',
    label: 'Building Speed',
    nextTier: 'competitive_speed',
    goalText: 'Move into Competitive Speed',
    minPercent: 0,
    maxPercent: 60,
  },
  {
    key: 'competitive_speed',
    label: 'Competitive Speed',
    nextTier: 'elite_speed',
    goalText: 'Move into Elite Speed',
    minPercent: 60,
    maxPercent: 80,
  },
  {
    key: 'elite_speed',
    label: 'Elite Speed',
    nextTier: 'world_class',
    goalText: 'Move into World Class',
    minPercent: 80,
    maxPercent: 95,
  },
  {
    key: 'world_class',
    label: 'World Class',
    nextTier: null,
    goalText: 'Maintain World Class',
    minPercent: 95,
    maxPercent: 100,
  },
];

export function getTrackForTimes(
  sport: SportType,
  personalBests: Record<string, number>
): SpeedTrackTier {
  const refs = WORLD_CLASS_REFERENCE[sport];
  const distances = getDistancesForSport(sport);

  const percentages: number[] = [];
  for (const d of distances) {
    const pb = personalBests[d.key];
    const ref = refs[d.key];
    if (pb && ref) {
      const pct = Math.min((ref / pb) * 100, 100);
      percentages.push(pct);
    }
  }

  if (percentages.length === 0) return SPEED_TRACKS[0];

  const avgPct = percentages.reduce((a, b) => a + b, 0) / percentages.length;

  for (let i = SPEED_TRACKS.length - 1; i >= 0; i--) {
    if (avgPct >= SPEED_TRACKS[i].minPercent) {
      return SPEED_TRACKS[i];
    }
  }

  return SPEED_TRACKS[0];
}

// ─── Professional Drill Library ─────────────────────────────────────────────

export const ACTIVATION_DRILLS: DrillData[] = [
  {
    id: 'ankle_circles', name: 'Barefoot Ankle Circles + Toe Grips', category: 'activation',
    cues: ['Slow circles', 'Grip the ground with toes'], setsReps: '10 each direction',
    description: 'Take off your shoes and slowly roll your ankles in circles. Then squeeze the ground with your toes like you\'re picking up a marble.',
    whyItHelps: 'Strong feet and ankles are the foundation of fast running.',
  },
  {
    id: 'a_skips', name: 'A-Skips (Low Amplitude)', category: 'activation',
    cues: ['Quick ground contact', 'Knee drive'], setsReps: '2 × 20 yards',
    description: 'Skip forward but focus on driving your knee up quickly and hitting the ground fast. Think "quick feet!"',
    whyItHelps: 'Quick ground contact teaches your feet to push off the ground faster.',
  },
  {
    id: 'b_skips', name: 'B-Skips', category: 'activation',
    cues: ['Extend and snap down', 'Stay tall'], setsReps: '2 × 20 yards',
    description: 'Like A-Skips, but extend your leg out in front before snapping it back down. Stay tall!',
    whyItHelps: 'The snap-down motion trains the same leg action you use when sprinting.',
  },
  {
    id: 'ankling', name: 'Ankling Drills', category: 'activation',
    cues: ['Stiff ankles', 'Quick turnover'], setsReps: '2 × 15 yards',
    description: 'Walk forward on your toes with stiff ankles, bouncing quickly off the ground like a pogo stick.',
    whyItHelps: 'Stiff ankles act like springs — they bounce energy back into every step.',
  },
  {
    id: 'skip_height', name: 'Light Skipping for Height', category: 'activation',
    cues: ['Push off the ground', 'Reach with knee'], setsReps: '2 × 20 yards',
    description: 'Skip forward and try to get as high as you can with each skip. Push hard off the ground!',
    whyItHelps: 'Training your legs to push hard builds the power behind each sprint step.',
  },
  {
    id: 'leg_swings', name: 'Dynamic Leg Swings', category: 'activation',
    cues: ['Front-to-back + side-to-side', 'Controlled swing'], setsReps: '10 each leg each direction',
    description: 'Hold onto something and swing one leg front-to-back, then side-to-side. Keep it smooth.',
    whyItHelps: 'Loose hips move faster — this opens up your stride.',
  },
];

export const ISOMETRIC_DRILLS: DrillData[] = [
  {
    id: 'iso_ankle', name: 'ISO Ankle Hold (Single-Leg)', category: 'isometric',
    cues: ['Balance on one foot', 'Hold strong'], setsReps: '8 sec each side', duration: '8s',
    description: 'Stand on one foot and hold still. Don\'t wobble! Try to stay balanced like a statue.',
    whyItHelps: 'Stable ankles prevent injuries and help you push off the ground harder.',
  },
  {
    id: 'iso_split_squat', name: 'ISO Split Squat Hold', category: 'isometric',
    cues: ['Back knee off ground', 'Stay tall'], setsReps: '8 sec each side', duration: '8s',
    description: 'Stand in a lunge with your back knee just off the ground. Hold still and stay tall.',
    whyItHelps: 'Strong legs in the sprint position = faster starts.',
  },
  {
    id: 'iso_wall_push', name: 'ISO Wall Push (Hip Extension)', category: 'isometric',
    cues: ['Drive into wall', 'Full hip extension'], setsReps: '8 sec each side', duration: '8s',
    description: 'Put your hands on a wall and drive one leg back like you\'re pushing the wall away.',
    whyItHelps: 'This strengthens the hip push-off that powers every stride.',
  },
  {
    id: 'iso_calf', name: 'ISO Calf Raise Hold', category: 'isometric',
    cues: ['High on toes', 'Squeeze at top'], setsReps: '8 sec each side', duration: '8s',
    description: 'Stand on your toes as high as you can and hold it. Squeeze your calf muscles tight!',
    whyItHelps: 'Strong calves are the springs that make you bounce off the ground faster.',
  },
];

export const SPRINT_MECHANICS_DRILLS: DrillData[] = [
  {
    id: 'wall_drives', name: 'Wall Drives (A-Position)', category: 'sprint_mechanics',
    cues: ['Drive knee up', 'Snap it back down'], setsReps: '3 × 8 each leg',
    description: 'Lean into a wall with your hands. Drive one knee up high, then snap it back down fast. Repeat!',
    whyItHelps: 'This teaches the knee-drive pattern your body uses when sprinting.',
  },
  {
    id: 'wall_drive_march', name: 'Wall Drive + March-Out', category: 'sprint_mechanics',
    cues: ['Drive, then march away from wall', 'Stay on toes'], setsReps: '3 × 5 each',
    description: 'Do a wall drive, then walk away from the wall keeping the same tall posture.',
    whyItHelps: 'Transitioning from wall to ground teaches proper sprint posture.',
  },
  {
    id: 'falling_starts', name: 'Falling Starts (10y)', category: 'sprint_mechanics',
    cues: ['Lean forward until you fall', 'Explode out'], setsReps: '3 × 10 yards',
    description: 'Stand tall, then lean forward until you start to fall — then EXPLODE into a sprint!',
    whyItHelps: 'Learning to use gravity gives you faster reaction starts.',
  },
  {
    id: 'three_point_starts', name: '3-Point Starts', category: 'sprint_mechanics',
    cues: ['Low start position', 'Drive arms hard'], setsReps: '3 × 10 yards',
    description: 'Get low with one hand on the ground. On "go," drive your arms and legs as hard as you can!',
    whyItHelps: 'A powerful start position means faster first steps.',
  },
  {
    id: 'standing_starts', name: 'Standing Starts (Arm Drive)', category: 'sprint_mechanics',
    cues: ['Arms drive the legs', 'Punch forward'], setsReps: '3 × 10 yards',
    description: 'Stand tall, then sprint — focus on pumping your arms hard to drive your legs.',
    whyItHelps: 'Your arms control your legs — fast arms = fast legs.',
  },
  {
    id: 'wicket_runs', name: 'Wicket Runs', category: 'sprint_mechanics',
    cues: ['Step over each wicket', 'Stay tall at speed'], setsReps: '3 × 30 yards',
    description: 'Place small markers every few steps and run over them at speed, stepping over each one.',
    whyItHelps: 'This locks in your ideal stride length at top speed.',
  },
  {
    id: 'buildups', name: 'Build-Up Sprints (60-70-80-90%)', category: 'sprint_mechanics',
    cues: ['Gradually increase speed', 'Smooth acceleration'], setsReps: '3 × 40 yards',
    description: 'Start jogging and gradually increase to almost full speed — smooth and relaxed.',
    whyItHelps: 'Teaching your body to accelerate smoothly prevents injuries and builds top speed.',
  },
];

export const PLYOMETRIC_DRILLS: DrillData[] = [
  {
    id: 'pogo_hops', name: 'Pogo Hops (Ankle Stiffness)', category: 'plyometric',
    cues: ['Stiff ankles', 'Quick bounce'], setsReps: '3 × 10 hops',
    description: 'Bounce up and down on both feet with stiff ankles — like a pogo stick! Quick, quick, quick!',
    whyItHelps: 'Stiff-ankle bouncing trains the elastic energy in your tendons.',
  },
  {
    id: 'sl_pogo', name: 'Single-Leg Pogo Hops', category: 'plyometric',
    cues: ['Same stiffness, one leg', 'Stay balanced'], setsReps: '3 × 8 each leg',
    description: 'Same bouncing as Pogo Hops, but on one leg. Stay balanced!',
    whyItHelps: 'Single-leg power is what you actually use when sprinting.',
  },
  {
    id: 'broad_jump', name: 'Broad Jump + Stick', category: 'plyometric',
    cues: ['Explode forward', 'Stick the landing'], setsReps: '3 × 3 jumps',
    description: 'Jump forward as far as you can and stick the landing. No wobbling!',
    whyItHelps: 'Explosive horizontal power translates directly to faster sprints.',
  },
  {
    id: 'bounding', name: 'Bounding (3-5 Contacts)', category: 'plyometric',
    cues: ['Big push-off each step', 'Cover distance'], setsReps: '3 × 5 contacts',
    description: 'Take big, powerful strides like a deer running — push off hard with each step!',
    whyItHelps: 'Bounding builds the push-off strength behind every sprint stride.',
  },
  {
    id: 'depth_drops', name: 'Depth Drops (6-12" Box)', category: 'plyometric',
    cues: ['Step off, land soft', 'Absorb quietly'], setsReps: '3 × 5 drops',
    description: 'Step off a low box and land softly. Absorb the landing like a cat.',
    whyItHelps: 'Landing quietly teaches your muscles to absorb force — key to injury prevention.',
  },
  {
    id: 'hurdle_hops', name: 'Mini Hurdle Hops', category: 'plyometric',
    cues: ['Quick over each hurdle', 'Stiff ankles'], setsReps: '3 × 5 hurdles',
    description: 'Hop over small hurdles quickly with stiff ankles. Stay bouncy!',
    whyItHelps: 'Quick reactions over hurdles train your legs to be fast and springy.',
  },
];

export const RESISTED_DRILLS: DrillData[] = [
  {
    id: 'sled_push', name: 'Sled Push (Light, 10y)', category: 'resisted',
    cues: ['Stay low', 'Drive hard'], setsReps: '3 × 10 yards', minSessionNumber: 7,
    description: 'Push a light sled for 10 yards — stay low and drive hard with your legs.',
    whyItHelps: 'Pushing against resistance makes regular sprints feel easier.',
  },
  {
    id: 'band_starts', name: 'Band-Resisted Starts', category: 'resisted',
    cues: ['Fight the band', 'Explode out'], setsReps: '3 × 10 yards', minSessionNumber: 7,
    description: 'Attach a band around your waist and sprint against the pull. Fight it!',
    whyItHelps: 'Resisting the band builds explosive starting power.',
  },
  {
    id: 'partner_march', name: 'Partner-Resisted March', category: 'resisted',
    cues: ['Partner holds your hips', 'Drive knees high'], setsReps: '3 × 15 yards', minSessionNumber: 7,
    description: 'Have a partner hold your hips while you march forward with high knees.',
    whyItHelps: 'Extra resistance on your hips builds stronger drive muscles.',
  },
  {
    id: 'overspeed', name: 'Overspeed Downhill Runs (2-3% Grade)', category: 'resisted',
    cues: ['Use the slope', 'Stay relaxed at speed'], setsReps: '3 × 30 yards', minSessionNumber: 10,
    description: 'Run downhill on a gentle slope — let gravity help you run faster than normal!',
    whyItHelps: 'Running faster than usual teaches your legs to move at higher speeds.',
  },
];

export const COOL_DOWN_DRILLS: DrillData[] = [
  {
    id: 'walking_mechanics', name: 'Walking Mechanics Drill', category: 'cool_down',
    cues: ['Heel-to-toe emphasis', 'Smooth and controlled'], setsReps: '2 × 30 yards',
    description: 'Walk slowly, focusing on landing heel-to-toe. Smooth and controlled.',
    whyItHelps: 'Slow walking resets your body\'s movement patterns after hard sprinting.',
  },
  {
    id: 'osc_swings', name: 'Light Oscillatory Leg Swings', category: 'cool_down',
    cues: ['Gentle swing', 'No forcing range'], setsReps: '10 each direction',
    description: 'Gently swing your legs front-to-back and side-to-side. No forcing it!',
    whyItHelps: 'Gentle swinging helps your muscles relax and recover faster.',
  },
  {
    id: 'foam_roll', name: 'Foam Rolling', category: 'cool_down',
    cues: ['Calves, hamstrings, quads', 'Slow rolls'], setsReps: '30 sec each area',
    description: 'Roll slowly over your calves, hamstrings, and quads. Spend time on tight spots.',
    whyItHelps: 'Rolling out tight muscles helps blood flow and speeds recovery.',
  },
  {
    id: 'hip_stretch', name: '90/90 Hip Stretch', category: 'cool_down',
    cues: ['Front and back knee at 90°', 'Breathe deeply'], setsReps: '30 sec each side',
    description: 'Sit with both knees at 90° angles and hold. Breathe deeply and relax into it.',
    whyItHelps: 'Open hips allow for longer, more powerful sprint strides.',
  },
  {
    id: 'box_breathing', name: 'Box Breathing', category: 'cool_down',
    cues: ['4 sec in, 4 hold, 4 out, 4 hold', 'Close your eyes'], setsReps: '4 rounds',
    description: 'Breathe in for 4 seconds, hold 4, breathe out 4, hold 4. Close your eyes.',
    whyItHelps: 'Controlled breathing calms your nervous system so you recover faster.',
  },
];

export const BREAK_DAY_DRILLS: DrillData[] = [
  {
    id: 'break_elastic', name: 'Elastic Holds (Ankles & Hips)', category: 'break_day',
    cues: ['Hold positions gently', 'Feel the stretch'], setsReps: '15 sec each',
    description: 'Hold gentle stretching positions for your ankles and hips. No bouncing!',
    whyItHelps: 'Gentle holds keep your body springy without adding stress.',
  },
  {
    id: 'break_skips', name: 'Light Skips (50% Effort)', category: 'break_day',
    cues: ['Easy does it', 'Just get moving'], setsReps: '2 × 20 yards',
    description: 'Skip around at half effort. Just get your body moving and blood flowing.',
    whyItHelps: 'Light movement helps your body recover faster than sitting still.',
  },
  {
    id: 'break_cars', name: 'Mobility with Intent (Hip & Ankle CARs)', category: 'break_day',
    cues: ['Slow controlled circles', 'Full range of motion'], setsReps: '5 each direction',
    description: 'Slowly make big circles with your hips and ankles. Full range, no rushing.',
    whyItHelps: 'CARs maintain your joint mobility so you\'re ready for the next session.',
  },
  {
    id: 'break_breathing', name: 'Breathing & Posture', category: 'break_day',
    cues: ['Diaphragmatic breathing', 'Thoracic extension'], setsReps: '3 min',
    description: 'Sit tall and breathe using your belly. Fill up your lungs completely.',
    whyItHelps: 'Deep breathing activates your recovery system.',
  },
  {
    id: 'break_lunge', name: 'Walking Lunge Flow', category: 'break_day',
    cues: ['Slow and controlled', 'Open up the hips'], setsReps: '2 × 10 each leg',
    description: 'Walk forward in slow lunges, opening up your hips with each step.',
    whyItHelps: 'Slow lunges flush blood through your leg muscles and reduce stiffness.',
  },
];

export const ALL_DRILLS: DrillData[] = [
  ...ACTIVATION_DRILLS,
  ...ISOMETRIC_DRILLS,
  ...SPRINT_MECHANICS_DRILLS,
  ...PLYOMETRIC_DRILLS,
  ...RESISTED_DRILLS,
  ...COOL_DOWN_DRILLS,
  ...BREAK_DAY_DRILLS,
];

// ─── Session Templates ──────────────────────────────────────────────────────

export interface SessionTemplate {
  activationDrills: DrillData[];
  isometricDrills: DrillData[];
  sprintDrills: DrillData[];
  plyoDrills: DrillData[];
  resistedDrills: DrillData[];
  coolDownDrills: DrillData[];
}

export function generateSessionDrills(sessionNumber: number): SessionTemplate {
  const idx = (sessionNumber - 1) % 7;

  const activation = pickRotated(ACTIVATION_DRILLS, idx, 3);
  const isometric = pickRotated(ISOMETRIC_DRILLS, idx, 2);
  const sprint = pickRotated(SPRINT_MECHANICS_DRILLS, idx, 2);
  const plyo = pickRotated(PLYOMETRIC_DRILLS, idx, 1);
  const resisted = sessionNumber >= 7
    ? pickRotated(RESISTED_DRILLS.filter(d => !d.minSessionNumber || sessionNumber >= d.minSessionNumber), idx, 1)
    : [];
  const coolDown = pickRotated(COOL_DOWN_DRILLS, idx, 3);

  return {
    activationDrills: activation,
    isometricDrills: isometric,
    sprintDrills: sprint,
    plyoDrills: plyo,
    resistedDrills: resisted,
    coolDownDrills: coolDown,
  };
}

function pickRotated<T>(arr: T[], offset: number, count: number): T[] {
  if (arr.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < Math.min(count, arr.length); i++) {
    result.push(arr[(offset + i) % arr.length]);
  }
  return result;
}

// ─── Session Focus Messages ─────────────────────────────────────────────────

const SESSION_FOCUSES: SessionFocus[] = [
  { icon: '⚡', messageKey: 'focus1' },
  { icon: '🔥', messageKey: 'focus2' },
  { icon: '🎯', messageKey: 'focus3' },
  { icon: '💨', messageKey: 'focus4' },
  { icon: '🏃', messageKey: 'focus5' },
  { icon: '⚡', messageKey: 'focus6' },
  { icon: '🔋', messageKey: 'focus7' },
];

export function getSessionFocus(sessionNumber: number): SessionFocus {
  return SESSION_FOCUSES[(sessionNumber - 1) % SESSION_FOCUSES.length];
}

// ─── Focus Message Fallbacks (English) ──────────────────────────────────────

export const FOCUS_MESSAGE_FALLBACKS: Record<string, string> = {
  focus1: 'Today we build explosive first steps.',
  focus2: 'Today we develop top-end speed.',
  focus3: 'Today we sharpen acceleration mechanics.',
  focus4: 'Today we train fast & relaxed.',
  focus5: 'Today we develop stride power.',
  focus6: 'Today we build springy speed.',
  focus7: 'Today we build elastic energy.',
};

// ─── RPE Labels ─────────────────────────────────────────────────────────────

export const RPE_LABELS: Record<number, string> = {
  1: 'Super Easy',
  2: 'Very Easy',
  3: 'Easy',
  4: 'Moderate',
  5: 'Somewhat Hard',
  6: 'Hard',
  7: 'Very Hard',
  8: 'Really Hard',
  9: 'Almost Max',
  10: 'Max Effort',
};

// ─── Constants ──────────────────────────────────────────────────────────────

export const SPEED_UNLOCK_DELAY_MS = 12 * 60 * 60 * 1000; // 12 hours
export const PLATEAU_THRESHOLD_SESSIONS = 4;
export const READINESS_BREAK_THRESHOLD = 40;
export const GAME_READY_SPRINT_TARGET = 16;

// ─── Readiness Calculation ──────────────────────────────────────────────────

export function calculateReadiness(sleepRating: number, bodyFeel: string, painAreas: string[]): number {
  let score = 50;
  score += (sleepRating - 3) * 10;
  if (bodyFeel === 'good') score += 15;
  else if (bodyFeel === 'okay') score += 0;
  else if (bodyFeel === 'tight') score -= 15;
  score -= painAreas.length * 5;
  return Math.max(0, Math.min(100, score));
}

// ─── Best Time Helper ───────────────────────────────────────────────────────

export function getBestTime(val: number | number[] | undefined): number {
  if (!val) return 0;
  if (Array.isArray(val)) {
    const valid = val.filter(t => t > 0);
    return valid.length > 0 ? Math.min(...valid) : 0;
  }
  return val;
}

// ─── Sprint Rep Progression ─────────────────────────────────────────────────

const SPRINT_REP_TIERS = [
  { maxSession: 3, reps: [2, 1, 1] },
  { maxSession: 6, reps: [3, 2, 1] },
  { maxSession: 9, reps: [3, 2, 2] },
  { maxSession: 14, reps: [4, 3, 2] },
  { maxSession: 19, reps: [4, 3, 3] },
  { maxSession: 24, reps: [5, 4, 3] },
  { maxSession: Infinity, reps: [6, 5, 5] },
];

export function getSprintRepsForSession(
  sessionNumber: number,
  readinessScore: number,
  distances: DistanceConfig[]
): Record<string, number> {
  const tier = SPRINT_REP_TIERS.find(t => sessionNumber <= t.maxSession)!;
  const result: Record<string, number> = {};
  distances.forEach((d, i) => {
    result[d.key] = tier.reps[Math.min(i, tier.reps.length - 1)] || 1;
  });

  if (readinessScore < 40) {
    for (const key of Object.keys(result)) {
      result[key] = Math.max(1, Math.round(result[key] * 0.6));
    }
  } else if (readinessScore < 60) {
    for (const key of Object.keys(result)) {
      result[key] = Math.max(1, Math.round(result[key] * 0.75));
    }
  }

  return result;
}

// ─── Barefoot Progression ───────────────────────────────────────────────────

export function getBarefootStage(sessionNumber: number, readinessScore: number): string {
  if (sessionNumber >= 20 && readinessScore >= 60) return 'advanced';
  if (sessionNumber >= 15 && readinessScore >= 60) return 'integration';
  if (sessionNumber >= 10) return 'introduction';
  return 'foundation';
}

export function isBarefootSprintAllowed(
  sessionNumber: number,
  readinessScore: number,
  distanceKey: string
): boolean {
  const stage = getBarefootStage(sessionNumber, readinessScore);
  if (stage === 'advanced') return true;
  if (stage === 'integration') {
    return distanceKey.includes('10') || distanceKey.includes('7');
  }
  return false;
}
