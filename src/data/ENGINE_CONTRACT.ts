/**
 * ENGINE CONTRACT v1.0 — Immutable
 * 
 * Single source of truth for every locked logic decision in the MPI engine.
 * No gray area. No "should." No "maybe."
 * 
 * Any change to these values requires a versioned migration and full regression pass.
 */
export const ENGINE_CONTRACT = {
  version: '1.0',
  locked: true,

  // Retroactive window
  RETROACTIVE_MAX_DAYS: 7,

  // MPI composite weights (must sum to 1.0)
  MPI_WEIGHTS: { bqi: 0.25, fqi: 0.15, pei: 0.20, decision: 0.20, competitive: 0.20 },

  // Game session weight multiplier
  GAME_SESSION_WEIGHT: 1.5,

  // Scout blend weight
  SCOUT_BLEND_WEIGHT: 0.20,

  // Overload dampening thresholds (checked in order, first match wins)
  OVERLOAD_THRESHOLDS: [
    { days: 28, multiplier: 0.80 },
    { days: 21, multiplier: 0.85 },
    { days: 14, multiplier: 0.90 },
  ],

  // Absent-day dampening
  ABSENT_DAMPENING: { days7_threshold: 2, mult7: 0.95, days14_threshold: 4, mult14: 0.85 },

  // Consistency recovery threshold
  CONSISTENCY_RECOVERY_PCT: 80,

  // Release penalties (graduated)
  RELEASE_PENALTIES: [
    { release: 1, pct: 12 },
    { release: 2, pct: 18 },
    { release: 3, pct: 25 },
    { release: 4, pct: 30 },
  ],

  // Contract modifiers
  CONTRACT_MODIFIERS: {
    active: 1.0,
    free_agent: 0.95,
    released: 'penalty_table' as const,
    injured_list: 0.9,
    retired: 0,
  },

  // Pro probability caps
  PRO_PROB_CAP_NON_VERIFIED: 99,
  PRO_PROB_CAP_VERIFIED: 100,

  // HoF requirements
  HOF_MIN_SEASONS: 5,
  HOF_MIN_PRO_PROB: 100,
  HOF_BASEBALL_LEAGUES: ['mlb'],
  HOF_SOFTBALL_LEAGUES: ['mlb', 'ausl'],

  // Velocity thresholds (high velocity definition per sport)
  HIGH_VELOCITY_BASEBALL_MPH: 100,
  HIGH_VELOCITY_SOFTBALL_MPH: 70,

  // BP distance power thresholds
  BP_DISTANCE_POWER_BASEBALL_FT: 300,
  BP_DISTANCE_POWER_SOFTBALL_FT: 150,

  // Governance flag integrity penalties
  INTEGRITY_PENALTIES: { critical: -15, warning: -5, info: -2 },

  // Injury hold lookback
  INJURY_HOLD_LOOKBACK_DAYS: 7,

  // Session edit/delete windows
  SESSION_EDIT_WINDOW_HOURS: 48,
  SESSION_DELETE_WINDOW_HOURS: 24,

  // Verified stat rules
  VERIFIED_STAT_REQUIRE_ADMIN: true,
  VERIFIED_STAT_IMMUTABLE_AFTER_APPROVAL: true,

  // Nightly process
  NIGHTLY_CRON_UTC: '05:00',
  NIGHTLY_SESSION_WINDOW_DAYS: 90,

  // Governance abuse thresholds
  RETROACTIVE_ABUSE_THRESHOLD: 3,
  VOLUME_SPIKE_MULTIPLIER: 3,
  GRADE_INFLATION_DELTA: 12,
  GAME_INFLATION_DELTA: 15,

  // Pitch distance difficulty modeling
  PITCH_DISTANCE_REFERENCE_FT: 60,
  PITCH_DISTANCE_MODIFIER_PER_FT: 0.005,

  // Season weighting
  SEASON_WEIGHTS: { in_season: 1.0, preseason: 0.85, off_season: 0.70 } as const,

  // Coach verification bonus
  COACH_VERIFIED_INTEGRITY_BONUS: 3,
  COACH_VERIFIED_WEIGHT_BONUS: 1.05,

  // Micro-field composite influence weights
  MICRO_WEIGHTS: {
    // BQI modifiers
    spin_direction: { topspin: -2, backspin: 3, sidespin: 1, knuckle: 0, backspin_tail: 4 },
    whiff_pct_penalty: 0.1,
    in_zone_contact_bonus: 0.1,
    // FQI blends
    footwork_grade_weight: 0.20,
    clean_field_pct_weight: 0.15,
    throw_spin_quality: { carry: 5, tail: 2, cut: 2, neutral: 0 },
    exchange_time: { fast: 5, average: 0, slow: -5 },
    // PEI modifiers
    zone_pct_bonus: 0.1,
    pitch_whiff_bonus: 0.08,
    pitch_chase_bonus: 0.05,
    // Decision modifiers
    chase_pct_penalty: 0.15,
    // FQI fielding quality modifiers
    route_efficiency: { routine: 0, plus: 3, elite: 6 },
    play_probability: { routine: 0, plus: 3, elite: 6 },
    receiving_quality: { poor: -3, average: 0, elite: 5 },
  },
} as const;

export type EngineContract = typeof ENGINE_CONTRACT;
