/**
 * UDL (Unbeatable Development Layer) — Default Constraints & Prescriptions
 * 
 * Hybrid config: these are code-based defaults.
 * Owner can override any threshold or prescription via the
 * `udl_constraint_overrides` table in the database.
 */

export interface ConstraintDefinition {
  key: string;
  label: string;
  category: 'timing' | 'decision' | 'execution' | 'reaction' | 'explosiveness' | 'readiness';
  threshold: number; // Score below this triggers the constraint (0-100)
  severity_weight: number; // Higher = more important when ranking constraints
  description: string;
}

export interface DrillTemplate {
  drill_key: string;
  drill_name: string;
  setup: string;
  execution: string;
  constraints: string[];
  reps: string;
  goal_metric: string;
  difficulty_level: number; // 1-5
  is_high_intensity: boolean;
}

export interface PrescriptionMapping {
  constraint_key: string;
  drills: DrillTemplate[];
}

export interface ReadinessAdjustment {
  condition: string;
  volume_modifier: number; // e.g., 0.7 = reduce volume by 30%
  skip_high_intensity: boolean;
  note: string;
}

// ─── Constraint Definitions (scored 0-100, lower = worse) ───

export const DEFAULT_CONSTRAINTS: ConstraintDefinition[] = [
  {
    key: 'late_timing_vs_velocity',
    label: 'Late Timing vs Velocity',
    category: 'timing',
    threshold: 45,
    severity_weight: 9,
    description: 'Consistently late on fastballs or higher velocity pitches.',
  },
  {
    key: 'early_timing_offspeed',
    label: 'Early Timing on Off-Speed',
    category: 'timing',
    threshold: 45,
    severity_weight: 8,
    description: 'Pulling off or committing early against breaking balls and changeups.',
  },
  {
    key: 'poor_pitch_selection',
    label: 'Poor Pitch Selection',
    category: 'decision',
    threshold: 40,
    severity_weight: 10,
    description: 'Swinging at pitches outside the zone or taking hittable pitches.',
  },
  {
    key: 'low_contact_quality',
    label: 'Low Contact Quality',
    category: 'execution',
    threshold: 42,
    severity_weight: 8,
    description: 'Weak contact, poor barrel accuracy, or mis-hits on centered pitches.',
  },
  {
    key: 'slow_reaction_time',
    label: 'Slow Reaction Time',
    category: 'reaction',
    threshold: 40,
    severity_weight: 7,
    description: 'CNS reaction speed below baseline, affecting pitch recognition and defensive plays.',
  },
  {
    key: 'low_explosiveness',
    label: 'Low Explosiveness',
    category: 'explosiveness',
    threshold: 38,
    severity_weight: 6,
    description: 'Sprint and first-step speed below development targets.',
  },
  {
    key: 'fatigue_risk',
    label: 'Neurological Fatigue Risk',
    category: 'readiness',
    threshold: 35,
    severity_weight: 10,
    description: 'CNS readiness and recovery indicators suggest elevated fatigue.',
  },
  {
    key: 'execution_inconsistency',
    label: 'Execution Inconsistency',
    category: 'execution',
    threshold: 44,
    severity_weight: 7,
    description: 'High variance in execution grades across recent sessions.',
  },
];

// ─── Prescription Mappings ───

export const DEFAULT_PRESCRIPTIONS: PrescriptionMapping[] = [
  {
    constraint_key: 'late_timing_vs_velocity',
    drills: [
      {
        drill_key: 'high_velo_inner_third',
        drill_name: 'High Velocity Inner Third',
        setup: 'Machine or live arm at 85-95 MPH, inner third of the plate.',
        execution: 'Start load before release point. Focus on getting the barrel to the ball early. Aggressive hip rotation.',
        constraints: ['No stride delay', 'Attack early', 'Stay inside the ball'],
        reps: '3 rounds × 8 swings',
        goal_metric: '≥75% on-time contact',
        difficulty_level: 4,
        is_high_intensity: true,
      },
      {
        drill_key: 'timing_trigger_drill',
        drill_name: 'Timing Trigger Drill',
        setup: 'Front toss at varied speeds. Partner calls "now" at simulated release.',
        execution: 'Initiate load on the trigger call. Maintain rhythm regardless of pitch speed.',
        constraints: ['Consistent load timing', 'Smooth tempo'],
        reps: '3 rounds × 10 swings',
        goal_metric: 'Load initiated within 50ms of trigger',
        difficulty_level: 3,
        is_high_intensity: false,
      },
    ],
  },
  {
    constraint_key: 'early_timing_offspeed',
    drills: [
      {
        drill_key: 'changeup_recognition',
        drill_name: 'Changeup Recognition & Adjustment',
        setup: 'Mixed fastball/changeup sequence. 60-40 ratio favoring off-speed.',
        execution: 'Hold stride longer. Let the ball travel deeper. Focus on spin recognition out of the hand.',
        constraints: ['Stay back', 'Read spin first', 'No lunging'],
        reps: '3 rounds × 10 pitches',
        goal_metric: '≥70% correct swing/take decisions',
        difficulty_level: 4,
        is_high_intensity: false,
      },
      {
        drill_key: 'two_speed_tracking',
        drill_name: 'Two-Speed Tracking',
        setup: 'Alternate between fastball and off-speed every 2 pitches.',
        execution: 'Maintain the same load timing. Adjust only with the hands, not the lower half.',
        constraints: ['Same load rhythm', 'Hands adjust, not feet'],
        reps: '2 rounds × 12 pitches',
        goal_metric: 'Consistent barrel path on both speeds',
        difficulty_level: 3,
        is_high_intensity: false,
      },
    ],
  },
  {
    constraint_key: 'poor_pitch_selection',
    drills: [
      {
        drill_key: 'zone_discipline_drill',
        drill_name: 'Zone Discipline Drill',
        setup: 'Live pitching or machine. Call ball/strike before the pitch arrives at the plate.',
        execution: 'Pre-commit to zone quadrants. Only swing at pitches in your designated zone.',
        constraints: ['No chasing', 'Pre-pitch plan', 'Stick to the zone'],
        reps: '3 rounds × 12 pitches',
        goal_metric: '≥80% correct take/swing decisions',
        difficulty_level: 3,
        is_high_intensity: false,
      },
      {
        drill_key: 'pitch_recognition_flash',
        drill_name: 'Pitch Recognition Flash Cards',
        setup: 'Video-based or Tex Vision spin recognition module.',
        execution: 'Identify pitch type and location within 200ms of release.',
        constraints: ['Speed over perfection', 'Trust first instinct'],
        reps: '50 reps',
        goal_metric: '≥85% identification accuracy',
        difficulty_level: 2,
        is_high_intensity: false,
      },
    ],
  },
  {
    constraint_key: 'low_contact_quality',
    drills: [
      {
        drill_key: 'barrel_precision_tee',
        drill_name: 'Barrel Precision Tee Work',
        setup: 'Tee set at various heights and depths. Use training bat or game bat.',
        execution: 'Focus on center-barrel contact. Feel the sweet spot on every swing.',
        constraints: ['Center contact', 'Controlled swing', 'Full extension'],
        reps: '4 rounds × 10 swings',
        goal_metric: '≥80% barrel contact',
        difficulty_level: 2,
        is_high_intensity: false,
      },
      {
        drill_key: 'live_bp_quality_focus',
        drill_name: 'Live BP – Quality Focus',
        setup: 'Standard BP with emphasis on quality over distance.',
        execution: 'Hit line drives. No home run swings. Rate each contact 1-5.',
        constraints: ['Line drives only', 'Self-rate each swing'],
        reps: '3 rounds × 8 swings',
        goal_metric: 'Average self-rating ≥ 3.5',
        difficulty_level: 3,
        is_high_intensity: true,
      },
    ],
  },
  {
    constraint_key: 'slow_reaction_time',
    drills: [
      {
        drill_key: 'reaction_ball_work',
        drill_name: 'Reaction Ball Work',
        setup: 'Reaction ball against wall. Start from ready position.',
        execution: 'React and catch with both hands. Increase distance as speed improves.',
        constraints: ['Athletic stance', 'Soft hands', 'Quick first step'],
        reps: '3 rounds × 2 minutes',
        goal_metric: '≥80% catch rate',
        difficulty_level: 2,
        is_high_intensity: false,
      },
      {
        drill_key: 'light_board_reaction',
        drill_name: 'Light Board Reaction Training',
        setup: 'BlazePod, Tex Vision, or similar reaction light system.',
        execution: 'Touch each light as fast as possible. Focus on first-step speed.',
        constraints: ['Stay balanced', 'Quick hands'],
        reps: '3 rounds × 30 seconds',
        goal_metric: 'Average reaction < 400ms',
        difficulty_level: 3,
        is_high_intensity: true,
      },
    ],
  },
  {
    constraint_key: 'low_explosiveness',
    drills: [
      {
        drill_key: 'sprint_acceleration_work',
        drill_name: 'Sprint Acceleration Work',
        setup: '10-yard and 20-yard sprint starts from various positions.',
        execution: 'Explosive first step. Drive knees. Full arm swing.',
        constraints: ['Max effort', 'Full recovery between reps'],
        reps: '6 × 10 yards, 4 × 20 yards',
        goal_metric: 'Improve 10-yard time by 0.05s',
        difficulty_level: 4,
        is_high_intensity: true,
      },
      {
        drill_key: 'plyometric_box_jumps',
        drill_name: 'Plyometric Box Jumps',
        setup: 'Box at knee to hip height. Stable surface.',
        execution: 'Explosive jump. Soft landing. Step down, do not jump down.',
        constraints: ['Full hip extension', 'Quiet landing'],
        reps: '3 rounds × 6 jumps',
        goal_metric: 'Consistent height across all sets',
        difficulty_level: 3,
        is_high_intensity: true,
      },
    ],
  },
  {
    constraint_key: 'fatigue_risk',
    drills: [
      {
        drill_key: 'active_recovery_movement',
        drill_name: 'Active Recovery Movement',
        setup: 'Light movement flow. No equipment needed.',
        execution: 'Dynamic stretching, foam rolling, light band work. Focus on mobility.',
        constraints: ['Keep heart rate low', 'No maximal effort'],
        reps: '15-20 minutes',
        goal_metric: 'Complete without fatigue increase',
        difficulty_level: 1,
        is_high_intensity: false,
      },
      {
        drill_key: 'visual_focus_meditation',
        drill_name: 'Visual Focus & Meditation',
        setup: 'Quiet space. Use app-guided meditation or breathing exercises.',
        execution: 'Box breathing (4-4-4-4). Visualization of next practice scenarios.',
        constraints: ['Stay present', 'No distractions'],
        reps: '10-15 minutes',
        goal_metric: 'Reduced perceived fatigue score',
        difficulty_level: 1,
        is_high_intensity: false,
      },
    ],
  },
  {
    constraint_key: 'execution_inconsistency',
    drills: [
      {
        drill_key: 'controlled_rep_tracking',
        drill_name: 'Controlled Rep Tracking',
        setup: 'Tee or soft toss. Self-grade each rep immediately.',
        execution: 'Rate every swing 1-5. Aim for consistency, not perfection. Log results.',
        constraints: ['Honest self-assessment', 'Focus on process'],
        reps: '4 rounds × 10 swings',
        goal_metric: 'Standard deviation < 1.0 across all reps',
        difficulty_level: 2,
        is_high_intensity: false,
      },
      {
        drill_key: 'pressure_simulation_set',
        drill_name: 'Pressure Simulation Set',
        setup: 'Live BP with at-bat scenarios (2 strikes, runner on third, etc.).',
        execution: 'Execute the situational approach. Quality contact over power.',
        constraints: ['Situational hitting', 'Approach first'],
        reps: '3 × 6 at-bats',
        goal_metric: '≥65% quality at-bats',
        difficulty_level: 4,
        is_high_intensity: true,
      },
    ],
  },
];

// ─── Readiness Adjustment Rules ───

export const READINESS_ADJUSTMENTS: ReadinessAdjustment[] = [
  {
    condition: 'fatigue_flag',
    volume_modifier: 0.7,
    skip_high_intensity: true,
    note: 'Volume reduced due to elevated fatigue indicators.',
  },
  {
    condition: 'low_readiness',
    volume_modifier: 0.85,
    skip_high_intensity: true,
    note: 'Volume reduced due to low recovery readiness.',
  },
  {
    condition: 'low_sleep',
    volume_modifier: 0.8,
    skip_high_intensity: true,
    note: 'Explosive drills removed due to low sleep quality.',
  },
];

// ─── Normalization Helpers ───

/** Clamp value between 0-100 */
export function clampScore(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

/** Convert reaction time in ms to a 0-100 score (lower ms = higher score) */
export function reactionMsToScore(ms: number): number {
  // 200ms = 100 score, 600ms = 0 score
  if (ms <= 200) return 100;
  if (ms >= 600) return 0;
  return clampScore(Math.round(((600 - ms) / 400) * 100));
}

/** Convert sprint time (seconds for 60yd) to explosiveness score */
export function sprintToScore(seconds: number): number {
  // 6.5s = 100, 8.5s = 0
  if (seconds <= 6.5) return 100;
  if (seconds >= 8.5) return 0;
  return clampScore(Math.round(((8.5 - seconds) / 2.0) * 100));
}
