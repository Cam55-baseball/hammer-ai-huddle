// =====================================================================
// PERFORMANCE TEST METRIC REGISTRY — Single Source of Truth
// =====================================================================
// Every metric in the 6-Week Test system is defined here.
// Metric keys are IMMUTABLE once created — new metrics get new keys.
// =====================================================================

export interface MetricDefinition {
  key: string;
  category: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  higherIsBetter: boolean;
  tier: 'free' | 'paid' | 'elite';
  sports: ('baseball' | 'softball')[];
  modules: ('hitting' | 'pitching' | 'throwing' | 'general')[];
  instructions: string;
  bilateral?: boolean;
  bilateralType?: 'leg' | 'hand' | 'side';
}

export const METRIC_CATEGORIES = [
  'speed',
  'quickness',
  'power_lower',
  'power_upper',
  'exit_velocity',
  'throwing_velocity',
  'fielding',
  'body_control',
  'energy_system',
  'mobility',
] as const;

export type MetricCategory = typeof METRIC_CATEGORIES[number];

export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  speed: 'Speed',
  quickness: 'Quickness',
  power_lower: 'Power — Lower Body',
  power_upper: 'Power — Upper Body / Rotational',
  exit_velocity: 'Exit Velocity & Bat Speed',
  throwing_velocity: 'Throwing Velocity & Arm Strength',
  fielding: 'Fielding Mechanics & Range',
  body_control: 'Body Control',
  energy_system: 'Energy System Capacity',
  mobility: 'Fascial Elasticity',
};

export const PERFORMANCE_METRICS: MetricDefinition[] = [
  // ── SPEED ──────────────────────────────────────────────
  {
    key: 'ten_yard_dash', category: 'speed', label: '10-Yard Dash',
    unit: 's', min: 1.0, max: 3.0, step: 0.01, higherIsBetter: false,
    tier: 'free', sports: ['baseball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'From a standing start, sprint 10 yards. Time with stopwatch or laser.',
  },
  {
    key: 'seven_yard_dash', category: 'speed', label: '7-Yard Dash',
    unit: 's', min: 0.8, max: 2.5, step: 0.01, higherIsBetter: false,
    tier: 'free', sports: ['softball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'From a standing start, sprint 7 yards (home-to-first-step distance for softball acceleration). Time with stopwatch or laser.',
  },
  {
    key: 'thirty_yard_dash', category: 'speed', label: '30-Yard Dash',
    unit: 's', min: 3.0, max: 6.0, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'From a standing start, sprint 30 yards. Use electronic timing if available.',
  },
  {
    key: 'forty_yard_dash', category: 'speed', label: '40-Yard Dash',
    unit: 's', min: 4.0, max: 8.0, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['softball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'From a standing start, sprint 40 yards. Standard softball top-end speed test.',
  },
  {
    key: 'sixty_yard_dash', category: 'speed', label: '60-Yard Dash',
    unit: 's', min: 5.5, max: 10.0, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['baseball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'From a standing start, sprint 60 yards. Standard MLB combine distance.',
  },
  {
    key: 'ten_thirty_split', category: 'speed', label: '10-30 Split',
    unit: 's', min: 2.0, max: 5.0, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Time between 10-yard and 30-yard marks during a 60-yard sprint.',
  },
  {
    key: 'thirty_sixty_split', category: 'speed', label: '30-60 Split',
    unit: 's', min: 2.0, max: 5.0, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Time between 30-yard and 60-yard marks during a 60-yard sprint.',
  },

  // ── QUICKNESS ──────────────────────────────────────────
  {
    key: 'pro_agility', category: 'quickness', label: '5-10-5 Pro Agility',
    unit: 's', min: 3.5, max: 6.5, step: 0.01, higherIsBetter: false,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'Start at center cone, sprint 5 yards right, 10 yards left, 5 yards back to center.',
  },
  {
    key: 'lateral_shuffle', category: 'quickness', label: 'Lateral Shuffle (10yd)',
    unit: 's', min: 2.0, max: 5.0, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['throwing', 'general'],
    instructions: 'Shuffle laterally for 10 yards. Stay low, no crossover steps.',
  },
  {
    key: 'first_step_5yd', category: 'quickness', label: 'First Step (5yd)',
    unit: 's', min: 0.5, max: 2.0, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'React to stimulus and sprint 5 yards. Measures reaction + first step explosiveness.',
  },

  // ── POWER — LOWER BODY ─────────────────────────────────
  {
    key: 'sl_broad_jump', category: 'power_lower', label: 'SL Broad Jump',
    unit: 'in', min: 20, max: 120, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'Single-leg standing broad jump. Measure from take-off line to nearest heel contact.',
    bilateral: true, bilateralType: 'leg',
  },
  {
    key: 'sl_lateral_broad_jump', category: 'power_lower', label: 'SL Lateral Broad Jump',
    unit: 'in', min: 20, max: 100, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'Single-leg lateral jump. Land and stick on opposite leg.',
    bilateral: true, bilateralType: 'leg',
  },
  {
    key: 'sl_vert_jump', category: 'power_lower', label: 'SL Vertical Jump',
    unit: 'in', min: 10, max: 45, step: 0.5, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['pitching', 'throwing', 'general'],
    instructions: 'Single-leg vertical jump. Reach as high as possible. Measure difference from standing reach.',
    bilateral: true, bilateralType: 'leg',
  },
  {
    key: 'vertical_jump', category: 'power_lower', label: 'Vertical Jump',
    unit: 'in', min: 12, max: 48, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'throwing', 'general'],
    instructions: 'Two-leg vertical jump. Measure difference between standing reach and peak reach.',
  },
  {
    key: 'standing_broad_jump', category: 'power_lower', label: 'Standing Broad Jump',
    unit: 'in', min: 40, max: 130, step: 0.5, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Two-leg standing broad jump. Measure from take-off line to nearest heel contact.',
  },

  // ── POWER — UPPER BODY / ROTATIONAL ────────────────────
  {
    key: 'mb_situp_throw', category: 'power_upper', label: 'MB Situp Throw (5lb)',
    unit: 'ft', min: 5, max: 60, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'Lie on back, 5lb medicine ball overhead. Sit up and throw for distance.',
  },
  {
    key: 'seated_chest_pass', category: 'power_upper', label: 'Seated Chest Pass (5lb)',
    unit: 'ft', min: 5, max: 45, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'Seated with legs extended, 5lb medicine ball at chest. Push-pass for distance.',
  },
  {
    key: 'mb_rotational_throw', category: 'power_upper', label: 'MB Rotational Throw (5lb)',
    unit: 'ft', min: 10, max: 50, step: 0.5, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['hitting', 'general'],
    instructions: 'Standing perpendicular to wall, 5lb ball. Rotate trunk and throw for distance.',
    bilateral: true, bilateralType: 'side',
  },
  {
    key: 'mb_overhead_throw', category: 'power_upper', label: 'MB Overhead Throw (5lb)',
    unit: 'ft', min: 10, max: 60, step: 0.5, higherIsBetter: true,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Standing, 5lb ball overhead. Throw forward for distance using full body extension.',
  },

  // ── EXIT VELOCITY & BAT SPEED ──────────────────────────
  {
    key: 'tee_exit_velocity', category: 'exit_velocity', label: 'Tee Exit Velocity',
    unit: 'mph', min: 30, max: 120, step: 0.1, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting'],
    instructions: 'Hit off tee. Measure exit velocity with radar gun or HitTrax.',
  },
  {
    key: 'max_tee_distance', category: 'exit_velocity', label: 'Max Tee Distance',
    unit: 'ft', min: 50, max: 500, step: 1, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting'],
    instructions: 'Hit off tee for maximum distance. Measure carry + roll.',
  },
  {
    key: 'bat_speed', category: 'exit_velocity', label: 'Bat Speed',
    unit: 'mph', min: 30, max: 100, step: 0.1, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['hitting'],
    instructions: 'Measure bat speed with Blast Motion, Diamond Kinetics, or equivalent sensor.',
  },
  {
    key: 'avg_exit_velo_bp', category: 'exit_velocity', label: 'Avg Exit Velo (BP, 10 swings)',
    unit: 'mph', min: 30, max: 115, step: 0.1, higherIsBetter: true,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['hitting'],
    instructions: 'Take 10 swings in BP. Record average exit velocity.',
  },

  // ── THROWING VELOCITY & ARM STRENGTH ───────────────────
  {
    key: 'long_toss_distance', category: 'throwing_velocity', label: 'Long Toss Distance',
    unit: 'ft', min: 50, max: 450, step: 1, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['pitching', 'throwing', 'general'],
    instructions: 'Max long toss on a line. Measure total carry distance.',
  },
  {
    key: 'pitching_velocity', category: 'throwing_velocity', label: 'Pitching Velocity',
    unit: 'mph', min: 30, max: 105, step: 0.1, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['pitching'],
    instructions: 'Fastball velocity from the mound. Use radar gun, average of 3 pitches.',
  },
  {
    key: 'position_throw_velo', category: 'throwing_velocity', label: 'Position Player Throw Velo',
    unit: 'mph', min: 30, max: 105, step: 0.1, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['throwing', 'hitting', 'general'],
    instructions: 'Max effort throw from position (e.g., SS to 1B). Radar gun.',
  },
  {
    key: 'pulldown_velocity', category: 'throwing_velocity', label: 'Pulldown Velocity',
    unit: 'mph', min: 40, max: 110, step: 0.1, higherIsBetter: true,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['pitching'],
    instructions: 'Crow-hop throw at max effort into net or wall. Radar gun.',
  },

  // ── FIELDING ───────────────────────────────────────────
  {
    key: 'fielding_exchange_time', category: 'fielding', label: 'Fielding Exchange Time',
    unit: 's', min: 0.5, max: 3.0, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['throwing', 'general'],
    instructions: 'Time from ball entering glove to release on throw. Use video analysis.',
  },
  {
    key: 'pop_time', category: 'fielding', label: 'Pop Time (Catchers)',
    unit: 's', min: 1.5, max: 2.5, step: 0.01, higherIsBetter: false,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['throwing'],
    instructions: 'Time from pitch hitting mitt to ball reaching 2nd base (catchers only).',
  },
  {
    key: 'sixty_yard_shuttle', category: 'fielding', label: '60yd Shuttle',
    unit: 's', min: 10, max: 20, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Sprint 20 yards and back 3 times (60 total yards). Touch line each rep.',
  },

  // ── BODY CONTROL ───────────────────────────────────────
  {
    key: 'sl_balance_eyes_closed', category: 'body_control', label: 'SL Balance (Eyes Closed)',
    unit: 's', min: 0, max: 120, step: 1, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Stand on one leg, eyes closed. Time until loss of balance. Max 120s.',
    bilateral: true, bilateralType: 'leg',
  },
  {
    key: 'deceleration_10yd', category: 'body_control', label: 'Deceleration (10yd stop)',
    unit: 's', min: 1.0, max: 4.0, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Sprint 20 yards, decelerate to full stop by 10-yard mark. Time the stop zone.',
  },

  // ── ENERGY SYSTEM ──────────────────────────────────────
  {
    key: 'three_hundred_yd_shuttle', category: 'energy_system', label: '300yd Shuttle',
    unit: 's', min: 45, max: 90, step: 0.1, higherIsBetter: false,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Sprint 25 yards and back, 6 times (300 total). Full effort.',
  },
  {
    key: 'sprint_repeat_avg', category: 'energy_system', label: 'Sprint Repeatability (6×30yd avg)',
    unit: 's', min: 3.5, max: 6.0, step: 0.01, higherIsBetter: false,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Sprint 30 yards × 6 reps, 30s rest between. Record average time.',
  },

  // ── FASCIAL ELASTICITY ─────────────────────────────────
  {
    key: 'sl_3x_bound', category: 'mobility', label: 'Single Leg 3x Bound',
    unit: 'ft', min: 10, max: 80, step: 0.5, higherIsBetter: true,
    tier: 'free', sports: ['baseball', 'softball'], modules: ['hitting', 'pitching', 'throwing', 'general'],
    instructions: 'Three consecutive single-leg bounds for distance. Measure total distance from start line to final landing. Test each leg.',
    bilateral: true, bilateralType: 'leg',
  },
  {
    key: 'shoulder_rom_internal', category: 'mobility', label: 'Shoulder ROM Internal',
    unit: 'deg', min: 20, max: 90, step: 1, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['pitching', 'throwing', 'general'],
    instructions: 'Supine, 90° abduction. Rotate arm inward. Measure angle with goniometer.',
    bilateral: true, bilateralType: 'side',
  },
  {
    key: 'shoulder_rom_external', category: 'mobility', label: 'Shoulder ROM External',
    unit: 'deg', min: 50, max: 120, step: 1, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['pitching', 'throwing', 'general'],
    instructions: 'Supine, 90° abduction. Rotate arm outward. Measure angle with goniometer.',
    bilateral: true, bilateralType: 'side',
  },
  {
    key: 'hip_internal_rotation', category: 'mobility', label: 'Hip Internal Rotation',
    unit: 'deg', min: 15, max: 60, step: 1, higherIsBetter: true,
    tier: 'paid', sports: ['baseball', 'softball'], modules: ['hitting', 'pitching', 'general'],
    instructions: 'Seated, knee at 90°. Rotate foot outward (hip internally). Measure angle.',
    bilateral: true, bilateralType: 'side',
  },
  {
    key: 'ankle_dorsiflexion', category: 'mobility', label: 'Ankle Dorsiflexion',
    unit: 'in', min: 1, max: 8, step: 0.25, higherIsBetter: true,
    tier: 'elite', sports: ['baseball', 'softball'], modules: ['general'],
    instructions: 'Half-kneeling, toe 5" from wall. Knee-to-wall test. Measure max distance.',
    bilateral: true, bilateralType: 'leg',
  },
];

// Index by key for fast lookup
export const METRIC_BY_KEY: Record<string, MetricDefinition> = {};
PERFORMANCE_METRICS.forEach(m => { METRIC_BY_KEY[m.key] = m; });

/**
 * Get metrics filtered by sport, module, and subscription tier.
 * Tier mapping: free=1, paid=2-3, elite=4
 */
export function getMetricsForContext(
  sport: 'baseball' | 'softball',
  module: string,
  densityLevel: number
): MetricDefinition[] {
  return PERFORMANCE_METRICS.filter(m => {
    if (!m.sports.includes(sport)) return false;
    if (!m.modules.includes(module as any)) return false;
    // Tier gate
    if (m.tier === 'paid' && densityLevel < 2) return false;
    if (m.tier === 'elite' && densityLevel < 4) return false;
    return true;
  });
}

/**
 * Get all metrics for a given category.
 */
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return PERFORMANCE_METRICS.filter(m => m.category === category);
}
