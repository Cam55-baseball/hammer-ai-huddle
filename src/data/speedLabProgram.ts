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
  minSessionNumber?: number; // Only available after this session
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
  /** Percentage range of world-class reference (lower bound) */
  minPercent: number;
  /** Percentage range of world-class reference (upper bound) */
  maxPercent: number;
}

export interface SessionFocus {
  icon: string;
  message: string;
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

  // Calculate average percentage of world-class across all distances with PBs
  const percentages: number[] = [];
  for (const d of distances) {
    const pb = personalBests[d.key];
    const ref = refs[d.key];
    if (pb && ref) {
      // Lower time = better. Percentage = ref/pb * 100 (capped at 100)
      const pct = Math.min((ref / pb) * 100, 100);
      percentages.push(pct);
    }
  }

  if (percentages.length === 0) return SPEED_TRACKS[0];

  const avgPct = percentages.reduce((a, b) => a + b, 0) / percentages.length;

  // Find the matching tier
  for (let i = SPEED_TRACKS.length - 1; i >= 0; i--) {
    if (avgPct >= SPEED_TRACKS[i].minPercent) {
      return SPEED_TRACKS[i];
    }
  }

  return SPEED_TRACKS[0];
}

// ─── Professional Drill Library ─────────────────────────────────────────────

export const ACTIVATION_DRILLS: DrillData[] = [
  { id: 'ankle_circles', name: 'Barefoot Ankle Circles + Toe Grips', category: 'activation', cues: ['Slow circles', 'Grip the ground with toes'], setsReps: '10 each direction' },
  { id: 'a_skips', name: 'A-Skips (Low Amplitude)', category: 'activation', cues: ['Quick ground contact', 'Knee drive'], setsReps: '2 × 20 yards' },
  { id: 'b_skips', name: 'B-Skips', category: 'activation', cues: ['Extend and snap down', 'Stay tall'], setsReps: '2 × 20 yards' },
  { id: 'ankling', name: 'Ankling Drills', category: 'activation', cues: ['Stiff ankles', 'Quick turnover'], setsReps: '2 × 15 yards' },
  { id: 'skip_height', name: 'Light Skipping for Height', category: 'activation', cues: ['Push off the ground', 'Reach with knee'], setsReps: '2 × 20 yards' },
  { id: 'leg_swings', name: 'Dynamic Leg Swings', category: 'activation', cues: ['Front-to-back + side-to-side', 'Controlled swing'], setsReps: '10 each leg each direction' },
];

export const ISOMETRIC_DRILLS: DrillData[] = [
  { id: 'iso_ankle', name: 'ISO Ankle Hold (Single-Leg)', category: 'isometric', cues: ['Balance on one foot', 'Hold strong'], setsReps: '8 sec each side', duration: '8s' },
  { id: 'iso_split_squat', name: 'ISO Split Squat Hold', category: 'isometric', cues: ['Back knee off ground', 'Stay tall'], setsReps: '8 sec each side', duration: '8s' },
  { id: 'iso_wall_push', name: 'ISO Wall Push (Hip Extension)', category: 'isometric', cues: ['Drive into wall', 'Full hip extension'], setsReps: '8 sec each side', duration: '8s' },
  { id: 'iso_calf', name: 'ISO Calf Raise Hold', category: 'isometric', cues: ['High on toes', 'Squeeze at top'], setsReps: '8 sec each side', duration: '8s' },
];

export const SPRINT_MECHANICS_DRILLS: DrillData[] = [
  { id: 'wall_drives', name: 'Wall Drives (A-Position)', category: 'sprint_mechanics', cues: ['Drive knee up', 'Snap it back down'], setsReps: '3 × 8 each leg' },
  { id: 'wall_drive_march', name: 'Wall Drive + March-Out', category: 'sprint_mechanics', cues: ['Drive, then march away from wall', 'Stay on toes'], setsReps: '3 × 5 each' },
  { id: 'falling_starts', name: 'Falling Starts (10y)', category: 'sprint_mechanics', cues: ['Lean forward until you fall', 'Explode out'], setsReps: '3 × 10 yards' },
  { id: 'three_point_starts', name: '3-Point Starts', category: 'sprint_mechanics', cues: ['Low start position', 'Drive arms hard'], setsReps: '3 × 10 yards' },
  { id: 'standing_starts', name: 'Standing Starts (Arm Drive)', category: 'sprint_mechanics', cues: ['Arms drive the legs', 'Punch forward'], setsReps: '3 × 10 yards' },
  { id: 'wicket_runs', name: 'Wicket Runs', category: 'sprint_mechanics', cues: ['Step over each wicket', 'Stay tall at speed'], setsReps: '3 × 30 yards' },
  { id: 'buildups', name: 'Build-Up Sprints (60-70-80-90%)', category: 'sprint_mechanics', cues: ['Gradually increase speed', 'Smooth acceleration'], setsReps: '3 × 40 yards' },
];

export const PLYOMETRIC_DRILLS: DrillData[] = [
  { id: 'pogo_hops', name: 'Pogo Hops (Ankle Stiffness)', category: 'plyometric', cues: ['Stiff ankles', 'Quick bounce'], setsReps: '3 × 10 hops' },
  { id: 'sl_pogo', name: 'Single-Leg Pogo Hops', category: 'plyometric', cues: ['Same stiffness, one leg', 'Stay balanced'], setsReps: '3 × 8 each leg' },
  { id: 'broad_jump', name: 'Broad Jump + Stick', category: 'plyometric', cues: ['Explode forward', 'Stick the landing'], setsReps: '3 × 3 jumps' },
  { id: 'bounding', name: 'Bounding (3-5 Contacts)', category: 'plyometric', cues: ['Big push-off each step', 'Cover distance'], setsReps: '3 × 5 contacts' },
  { id: 'depth_drops', name: 'Depth Drops (6-12" Box)', category: 'plyometric', cues: ['Step off, land soft', 'Absorb quietly'], setsReps: '3 × 5 drops' },
  { id: 'hurdle_hops', name: 'Mini Hurdle Hops', category: 'plyometric', cues: ['Quick over each hurdle', 'Stiff ankles'], setsReps: '3 × 5 hurdles' },
];

export const RESISTED_DRILLS: DrillData[] = [
  { id: 'sled_push', name: 'Sled Push (Light, 10y)', category: 'resisted', cues: ['Stay low', 'Drive hard'], setsReps: '3 × 10 yards', minSessionNumber: 7 },
  { id: 'band_starts', name: 'Band-Resisted Starts', category: 'resisted', cues: ['Fight the band', 'Explode out'], setsReps: '3 × 10 yards', minSessionNumber: 7 },
  { id: 'partner_march', name: 'Partner-Resisted March', category: 'resisted', cues: ['Partner holds your hips', 'Drive knees high'], setsReps: '3 × 15 yards', minSessionNumber: 7 },
  { id: 'overspeed', name: 'Overspeed Downhill Runs (2-3% Grade)', category: 'resisted', cues: ['Use the slope', 'Stay relaxed at speed'], setsReps: '3 × 30 yards', minSessionNumber: 10 },
];

export const COOL_DOWN_DRILLS: DrillData[] = [
  { id: 'walking_mechanics', name: 'Walking Mechanics Drill', category: 'cool_down', cues: ['Heel-to-toe emphasis', 'Smooth and controlled'], setsReps: '2 × 30 yards' },
  { id: 'osc_swings', name: 'Light Oscillatory Leg Swings', category: 'cool_down', cues: ['Gentle swing', 'No forcing range'], setsReps: '10 each direction' },
  { id: 'foam_roll', name: 'Foam Rolling', category: 'cool_down', cues: ['Calves, hamstrings, quads', 'Slow rolls'], setsReps: '30 sec each area' },
  { id: 'hip_stretch', name: '90/90 Hip Stretch', category: 'cool_down', cues: ['Front and back knee at 90°', 'Breathe deeply'], setsReps: '30 sec each side' },
  { id: 'box_breathing', name: 'Box Breathing', category: 'cool_down', cues: ['4 sec in, 4 hold, 4 out, 4 hold', 'Close your eyes'], setsReps: '4 rounds' },
];

export const BREAK_DAY_DRILLS: DrillData[] = [
  { id: 'break_elastic', name: 'Elastic Holds (Ankles & Hips)', category: 'break_day', cues: ['Hold positions gently', 'Feel the stretch'], setsReps: '15 sec each' },
  { id: 'break_skips', name: 'Light Skips (50% Effort)', category: 'break_day', cues: ['Easy does it', 'Just get moving'], setsReps: '2 × 20 yards' },
  { id: 'break_cars', name: 'Mobility with Intent (Hip & Ankle CARs)', category: 'break_day', cues: ['Slow controlled circles', 'Full range of motion'], setsReps: '5 each direction' },
  { id: 'break_breathing', name: 'Breathing & Posture', category: 'break_day', cues: ['Diaphragmatic breathing', 'Thoracic extension'], setsReps: '3 min' },
  { id: 'break_lunge', name: 'Walking Lunge Flow', category: 'break_day', cues: ['Slow and controlled', 'Open up the hips'], setsReps: '2 × 10 each leg' },
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

/**
 * Generate a session's drill set based on the session number.
 * Rotation ensures variety across sessions within a week.
 */
export function generateSessionDrills(sessionNumber: number): SessionTemplate {
  const idx = (sessionNumber - 1) % 7; // Rotate through 7 patterns

  // Activation: always 3-4 drills
  const activation = pickRotated(ACTIVATION_DRILLS, idx, 3);

  // Isometric: always 2-3
  const isometric = pickRotated(ISOMETRIC_DRILLS, idx, 2);

  // Sprint mechanics: 2-3, rotated
  const sprint = pickRotated(SPRINT_MECHANICS_DRILLS, idx, 2);

  // Plyometric: 1-2
  const plyo = pickRotated(PLYOMETRIC_DRILLS, idx, 1);

  // Resisted: 1 per session, only after session 7
  const resisted = sessionNumber >= 7
    ? pickRotated(RESISTED_DRILLS.filter(d => !d.minSessionNumber || sessionNumber >= d.minSessionNumber), idx, 1)
    : [];

  // Cool-down: always 3-4
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
  { icon: '⚡', message: 'Today we build explosive first steps.' },
  { icon: '🔥', message: 'Today we develop top-end speed.' },
  { icon: '🎯', message: 'Today we sharpen acceleration mechanics.' },
  { icon: '💨', message: 'Today we train fast & relaxed.' },
  { icon: '🏃', message: 'Today we develop stride power.' },
  { icon: '⚡', message: 'Today we build springy speed.' },
  { icon: '🔋', message: 'Today we build elastic energy.' },
];

export function getSessionFocus(sessionNumber: number): SessionFocus {
  return SESSION_FOCUSES[(sessionNumber - 1) % SESSION_FOCUSES.length];
}

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
export const PLATEAU_THRESHOLD_SESSIONS = 4; // Sessions without PB improvement before auto-adjust
export const READINESS_BREAK_THRESHOLD = 40; // Below this score = break day
