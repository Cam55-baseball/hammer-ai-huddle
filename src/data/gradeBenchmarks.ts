// =====================================================================
// GRADE BENCHMARKS — Single MLB-Anchored 20-80 Scale
// =====================================================================
// One curve per metric per sport. NOT age-adjusted: a 14-year-old is graded
// against the same scale as a big leaguer and scores low — that is the point
// of a scouting scale. Age bands (14u/18u/college/pro) were removed on
// 2026-09-08 because they contradicted the app's standing doctrine.
//
// 50 = MLB/professional average. 20 = floor, 80 = all-time record.
// Every curve is interpolated floor → average → record, so no curve kinks at
// the average anchor.
//
// Sources documented per entry (`source` / `as_of`):
//   MLB Combine  = Perfect Game / MLB Draft Combine published data
//   PG/PBR       = Perfect Game / Prep Baseball Report event averages
//   NSCA         = NSCA normative strength/power tables
//   Research     = Published peer-reviewed research
//   owner        = Owner-supplied figure, dated
//   estimate     = Interpolated from available data points — NOT a citation
// =====================================================================

export interface BenchmarkPoint {
  raw: number;
  grade: number;
}

/** One MLB-anchored curve per sport. Empty array = no benchmark for that sport. */
export type SportBenchmarks = BenchmarkPoint[];

export interface BenchmarkProvenance {
  /**
   * Where the anchors came from. `'estimate'` means interpolated from
   * neighbouring data points — NOT a citation, and surfaced as such to the
   * athlete. Never upgrade an estimate into a citation without a real source.
   */
  source: string;
  /**
   * Date the source figures describe (ISO). `null` = undated; the provenance
   * guard treats undated the same as unverifiable and reports it.
   */
  as_of: string | null;
}

export type BenchmarkEntry = BenchmarkProvenance & {
  baseball: SportBenchmarks;
  softball: SportBenchmarks;
};

export type BenchmarkTable = Record<string, BenchmarkEntry>;

/** True when a metric's anchors are interpolated rather than sourced. */
export function isEstimateBenchmark(metricKey: string): boolean {
  return GRADE_BENCHMARKS[metricKey]?.source === 'estimate';
}

/**
 * For metrics where lower is better (times), raw values descend as the grade
 * rises. The grade engine handles interpolation direction automatically.
 */
export const GRADE_BENCHMARKS: BenchmarkTable = {
  ten_yard_dash: {
    source: "PG/PBR event timing data, MLB Combine — baseball only",
    as_of: null,
    baseball: [
      { raw: 1.85, grade: 20 }, { raw: 1.75, grade: 30 }, { raw: 1.65, grade: 40 },
      { raw: 1.55, grade: 50 }, { raw: 1.467, grade: 60 }, { raw: 1.383, grade: 70 },
      { raw: 1.3, grade: 80 },
    ],
    softball: [],
  },

  seven_yard_dash: {
    source: "PG/PBR softball event timing — softball acceleration test",
    as_of: null,
    baseball: [],
    softball: [
      { raw: 1.55, grade: 20 }, { raw: 1.473, grade: 30 }, { raw: 1.397, grade: 40 },
      { raw: 1.32, grade: 50 }, { raw: 1.247, grade: 60 }, { raw: 1.173, grade: 70 },
      { raw: 1.1, grade: 80 },
    ],
  },

  thirty_yard_dash: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 4.3, grade: 20 }, { raw: 4.117, grade: 30 }, { raw: 3.933, grade: 40 },
      { raw: 3.75, grade: 50 }, { raw: 3.567, grade: 60 }, { raw: 3.383, grade: 70 },
      { raw: 3.2, grade: 80 },
    ],
    softball: [
      { raw: 4.6, grade: 20 }, { raw: 4.4, grade: 30 }, { raw: 4.2, grade: 40 },
      { raw: 4, grade: 50 }, { raw: 3.817, grade: 60 }, { raw: 3.633, grade: 70 },
      { raw: 3.45, grade: 80 },
    ],
  },

  sixty_yard_dash: {
    source: "owner",
    as_of: '2026-09-08',
    baseball: [
      { raw: 7.5, grade: 20 }, { raw: 7.267, grade: 30 }, { raw: 7.033, grade: 40 },
      { raw: 6.8, grade: 50 }, { raw: 6.533, grade: 60 }, { raw: 6.267, grade: 70 },
      { raw: 6, grade: 80 },
    ],
    softball: [],
  },

  forty_yard_dash: {
    source: "PG/PBR softball event timing — softball top-end speed test",
    as_of: null,
    baseball: [],
    softball: [
      { raw: 5.75, grade: 20 }, { raw: 5.517, grade: 30 }, { raw: 5.283, grade: 40 },
      { raw: 5.05, grade: 50 }, { raw: 4.833, grade: 60 }, { raw: 4.617, grade: 70 },
      { raw: 4.4, grade: 80 },
    ],
  },

  ten_thirty_split: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3, grade: 20 }, { raw: 2.8, grade: 30 }, { raw: 2.6, grade: 40 },
      { raw: 2.4, grade: 50 }, { raw: 2.233, grade: 60 }, { raw: 2.067, grade: 70 },
      { raw: 1.9, grade: 80 },
    ],
    softball: [
      { raw: 3.3, grade: 20 }, { raw: 3.067, grade: 30 }, { raw: 2.833, grade: 40 },
      { raw: 2.6, grade: 50 }, { raw: 2.433, grade: 60 }, { raw: 2.267, grade: 70 },
      { raw: 2.1, grade: 80 },
    ],
  },

  thirty_sixty_split: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3.4, grade: 20 }, { raw: 3.2, grade: 30 }, { raw: 3, grade: 40 },
      { raw: 2.8, grade: 50 }, { raw: 2.633, grade: 60 }, { raw: 2.467, grade: 70 },
      { raw: 2.3, grade: 80 },
    ],
    softball: [
      { raw: 3.7, grade: 20 }, { raw: 3.467, grade: 30 }, { raw: 3.233, grade: 40 },
      { raw: 3, grade: 50 }, { raw: 2.817, grade: 60 }, { raw: 2.633, grade: 70 },
      { raw: 2.45, grade: 80 },
    ],
  },

  pro_agility: {
    source: "NFL/MLB Combine cross-reference, PG data",
    as_of: null,
    baseball: [
      { raw: 4.9, grade: 20 }, { raw: 4.7, grade: 30 }, { raw: 4.5, grade: 40 },
      { raw: 4.3, grade: 50 }, { raw: 4.1, grade: 60 }, { raw: 3.9, grade: 70 },
      { raw: 3.7, grade: 80 },
    ],
    softball: [
      { raw: 5.1, grade: 20 }, { raw: 4.9, grade: 30 }, { raw: 4.7, grade: 40 },
      { raw: 4.5, grade: 50 }, { raw: 4.283, grade: 60 }, { raw: 4.067, grade: 70 },
      { raw: 3.85, grade: 80 },
    ],
  },

  lateral_shuffle: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 3.6, grade: 20 }, { raw: 3.367, grade: 30 }, { raw: 3.133, grade: 40 },
      { raw: 2.9, grade: 50 }, { raw: 2.717, grade: 60 }, { raw: 2.533, grade: 70 },
      { raw: 2.35, grade: 80 },
    ],
    softball: [
      { raw: 3.8, grade: 20 }, { raw: 3.567, grade: 30 }, { raw: 3.333, grade: 40 },
      { raw: 3.1, grade: 50 }, { raw: 2.9, grade: 60 }, { raw: 2.7, grade: 70 },
      { raw: 2.5, grade: 80 },
    ],
  },

  first_step_5yd: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 1.4, grade: 20 }, { raw: 1.3, grade: 30 }, { raw: 1.2, grade: 40 },
      { raw: 1.1, grade: 50 }, { raw: 1, grade: 60 }, { raw: 0.9, grade: 70 },
      { raw: 0.8, grade: 80 },
    ],
    softball: [
      { raw: 1.5, grade: 20 }, { raw: 1.4, grade: 30 }, { raw: 1.3, grade: 40 },
      { raw: 1.2, grade: 50 }, { raw: 1.09, grade: 60 }, { raw: 0.98, grade: 70 },
      { raw: 0.87, grade: 80 },
    ],
  },

  sl_broad_jump: {
    source: "NSCA normative tables, PG data",
    as_of: null,
    baseball: [
      { raw: 55, grade: 20 }, { raw: 62, grade: 30 }, { raw: 69, grade: 40 },
      { raw: 76, grade: 50 }, { raw: 85.667, grade: 60 }, { raw: 95.333, grade: 70 },
      { raw: 105, grade: 80 },
    ],
    softball: [
      { raw: 48, grade: 20 }, { raw: 55.333, grade: 30 }, { raw: 62.667, grade: 40 },
      { raw: 70, grade: 50 }, { raw: 79.333, grade: 60 }, { raw: 88.667, grade: 70 },
      { raw: 98, grade: 80 },
    ],
  },

  sl_lateral_broad_jump: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 45, grade: 20 }, { raw: 51.667, grade: 30 }, { raw: 58.333, grade: 40 },
      { raw: 65, grade: 50 }, { raw: 74.333, grade: 60 }, { raw: 83.667, grade: 70 },
      { raw: 93, grade: 80 },
    ],
    softball: [
      { raw: 42, grade: 20 }, { raw: 48.333, grade: 30 }, { raw: 54.667, grade: 40 },
      { raw: 61, grade: 50 }, { raw: 69.667, grade: 60 }, { raw: 78.333, grade: 70 },
      { raw: 87, grade: 80 },
    ],
  },

  sl_vert_jump: {
    source: "NSCA, PG event data",
    as_of: null,
    baseball: [
      { raw: 18, grade: 20 }, { raw: 21, grade: 30 }, { raw: 24, grade: 40 },
      { raw: 27, grade: 50 }, { raw: 30.667, grade: 60 }, { raw: 34.333, grade: 70 },
      { raw: 38, grade: 80 },
    ],
    softball: [
      { raw: 16, grade: 20 }, { raw: 19, grade: 30 }, { raw: 22, grade: 40 },
      { raw: 25, grade: 50 }, { raw: 28.333, grade: 60 }, { raw: 31.667, grade: 70 },
      { raw: 35, grade: 80 },
    ],
  },

  vertical_jump: {
    source: "NSCA normative tables",
    as_of: null,
    baseball: [
      { raw: 22, grade: 20 }, { raw: 25, grade: 30 }, { raw: 28, grade: 40 },
      { raw: 31, grade: 50 }, { raw: 34.667, grade: 60 }, { raw: 38.333, grade: 70 },
      { raw: 42, grade: 80 },
    ],
    softball: [
      { raw: 19, grade: 20 }, { raw: 21.667, grade: 30 }, { raw: 24.333, grade: 40 },
      { raw: 27, grade: 50 }, { raw: 30.667, grade: 60 }, { raw: 34.333, grade: 70 },
      { raw: 38, grade: 80 },
    ],
  },

  standing_broad_jump: {
    source: "NSCA normative tables",
    as_of: null,
    baseball: [
      { raw: 70, grade: 20 }, { raw: 78.333, grade: 30 }, { raw: 86.667, grade: 40 },
      { raw: 95, grade: 50 }, { raw: 105, grade: 60 }, { raw: 115, grade: 70 },
      { raw: 125, grade: 80 },
    ],
    softball: [
      { raw: 62, grade: 20 }, { raw: 70.333, grade: 30 }, { raw: 78.667, grade: 40 },
      { raw: 87, grade: 50 }, { raw: 96.667, grade: 60 }, { raw: 106.333, grade: 70 },
      { raw: 116, grade: 80 },
    ],
  },

  mb_situp_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 20, grade: 20 }, { raw: 25, grade: 30 }, { raw: 30, grade: 40 },
      { raw: 35, grade: 50 }, { raw: 41.667, grade: 60 }, { raw: 48.333, grade: 70 },
      { raw: 55, grade: 80 },
    ],
    softball: [
      { raw: 17, grade: 20 }, { raw: 21.333, grade: 30 }, { raw: 25.667, grade: 40 },
      { raw: 30, grade: 50 }, { raw: 36, grade: 60 }, { raw: 42, grade: 70 },
      { raw: 48, grade: 80 },
    ],
  },

  seated_chest_pass: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 16, grade: 20 }, { raw: 20, grade: 30 }, { raw: 24, grade: 40 },
      { raw: 28, grade: 50 }, { raw: 33, grade: 60 }, { raw: 38, grade: 70 },
      { raw: 43, grade: 80 },
    ],
    softball: [
      { raw: 13, grade: 20 }, { raw: 16.333, grade: 30 }, { raw: 19.667, grade: 40 },
      { raw: 23, grade: 50 }, { raw: 27.667, grade: 60 }, { raw: 32.333, grade: 70 },
      { raw: 37, grade: 80 },
    ],
  },

  mb_rotational_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 22, grade: 20 }, { raw: 26.333, grade: 30 }, { raw: 30.667, grade: 40 },
      { raw: 35, grade: 50 }, { raw: 40, grade: 60 }, { raw: 45, grade: 70 },
      { raw: 50, grade: 80 },
    ],
    softball: [
      { raw: 19, grade: 20 }, { raw: 23, grade: 30 }, { raw: 27, grade: 40 },
      { raw: 31, grade: 50 }, { raw: 36, grade: 60 }, { raw: 41, grade: 70 },
      { raw: 46, grade: 80 },
    ],
  },

  mb_overhead_throw: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 22, grade: 20 }, { raw: 27.333, grade: 30 }, { raw: 32.667, grade: 40 },
      { raw: 38, grade: 50 }, { raw: 44.333, grade: 60 }, { raw: 50.667, grade: 70 },
      { raw: 57, grade: 80 },
    ],
    softball: [
      { raw: 18, grade: 20 }, { raw: 23, grade: 30 }, { raw: 28, grade: 40 },
      { raw: 33, grade: 50 }, { raw: 39, grade: 60 }, { raw: 45, grade: 70 },
      { raw: 51, grade: 80 },
    ],
  },

  tee_exit_velocity: {
    source: "owner",
    as_of: '2026-09-08',
    baseball: [
      { raw: 70, grade: 20 }, { raw: 77.667, grade: 30 }, { raw: 85.333, grade: 40 },
      { raw: 93, grade: 50 }, { raw: 97.667, grade: 60 }, { raw: 102.333, grade: 70 },
      { raw: 107, grade: 80 },
    ],
    softball: [
      { raw: 50, grade: 20 }, { raw: 56, grade: 30 }, { raw: 62, grade: 40 },
      { raw: 68, grade: 50 }, { raw: 74, grade: 60 }, { raw: 80, grade: 70 },
      { raw: 86, grade: 80 },
    ],
  },

  max_tee_distance: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 200, grade: 20 }, { raw: 243.333, grade: 30 }, { raw: 286.667, grade: 40 },
      { raw: 330, grade: 50 }, { raw: 370, grade: 60 }, { raw: 410, grade: 70 },
      { raw: 450, grade: 80 },
    ],
    softball: [
      { raw: 130, grade: 20 }, { raw: 163.333, grade: 30 }, { raw: 196.667, grade: 40 },
      { raw: 230, grade: 50 }, { raw: 263.333, grade: 60 }, { raw: 296.667, grade: 70 },
      { raw: 330, grade: 80 },
    ],
  },

  bat_speed: {
    source: "Statcast bat tracking, league-wide (MLB avg 71.5 mph, elite 78-80+)",
    as_of: '2026-01-01',
    baseball: [
      { raw: 55, grade: 20 }, { raw: 60.333, grade: 30 }, { raw: 65.667, grade: 40 },
      { raw: 71, grade: 50 }, { raw: 77, grade: 60 }, { raw: 83, grade: 70 },
      { raw: 89, grade: 80 },
    ],
    softball: [
      { raw: 48, grade: 20 }, { raw: 53, grade: 30 }, { raw: 58, grade: 40 },
      { raw: 63, grade: 50 }, { raw: 69, grade: 60 }, { raw: 75, grade: 70 },
      { raw: 81, grade: 80 },
    ],
  },

  avg_exit_velo_bp: {
    source: "Driveline, MLB Combine avg",
    as_of: null,
    baseball: [
      { raw: 65, grade: 20 }, { raw: 71.667, grade: 30 }, { raw: 78.333, grade: 40 },
      { raw: 85, grade: 50 }, { raw: 91, grade: 60 }, { raw: 97, grade: 70 },
      { raw: 103, grade: 80 },
    ],
    softball: [
      { raw: 46, grade: 20 }, { raw: 51.667, grade: 30 }, { raw: 57.333, grade: 40 },
      { raw: 63, grade: 50 }, { raw: 69, grade: 60 }, { raw: 75, grade: 70 },
      { raw: 81, grade: 80 },
    ],
  },

  long_toss_distance: {
    source: "Driveline, PG event data",
    as_of: null,
    baseball: [
      { raw: 170, grade: 20 }, { raw: 206.667, grade: 30 }, { raw: 243.333, grade: 40 },
      { raw: 280, grade: 50 }, { raw: 326.667, grade: 60 }, { raw: 373.333, grade: 70 },
      { raw: 420, grade: 80 },
    ],
    softball: [
      { raw: 125, grade: 20 }, { raw: 153.333, grade: 30 }, { raw: 181.667, grade: 40 },
      { raw: 210, grade: 50 }, { raw: 243.333, grade: 60 }, { raw: 276.667, grade: 70 },
      { raw: 310, grade: 80 },
    ],
  },

  pitching_velocity: {
    source: "MLB Combine avg 2019-2023, PG/PBR event data",
    as_of: '2023-12-31',
    baseball: [
      { raw: 84, grade: 20 }, { raw: 87.5, grade: 30 }, { raw: 91, grade: 40 },
      { raw: 94.5, grade: 50 }, { raw: 97.733, grade: 60 }, { raw: 100.967, grade: 70 },
      { raw: 104.2, grade: 80 },
    ],
    softball: [
      { raw: 52, grade: 20 }, { raw: 56.667, grade: 30 }, { raw: 61.333, grade: 40 },
      { raw: 66, grade: 50 }, { raw: 70, grade: 60 }, { raw: 74, grade: 70 },
      { raw: 78, grade: 80 },
    ],
  },

  position_throw_velo: {
    source: "owner",
    as_of: '2026-09-08',
    baseball: [
      { raw: 75, grade: 20 }, { raw: 79.333, grade: 30 }, { raw: 83.667, grade: 40 },
      { raw: 88, grade: 50 }, { raw: 90.333, grade: 60 }, { raw: 92.667, grade: 70 },
      { raw: 95, grade: 80 },
    ],
    softball: [
      { raw: 52, grade: 20 }, { raw: 58, grade: 30 }, { raw: 64, grade: 40 },
      { raw: 70, grade: 50 }, { raw: 76, grade: 60 }, { raw: 82, grade: 70 },
      { raw: 88, grade: 80 },
    ],
  },

  pulldown_velocity: {
    source: "owner",
    as_of: '2026-09-08',
    baseball: [
      { raw: 78, grade: 20 }, { raw: 83, grade: 30 }, { raw: 88, grade: 40 },
      { raw: 93, grade: 50 }, { raw: 99, grade: 60 }, { raw: 105, grade: 70 },
      { raw: 111, grade: 80 },
    ],
    softball: [
      { raw: 55, grade: 20 }, { raw: 60, grade: 30 }, { raw: 65, grade: 40 },
      { raw: 70, grade: 50 }, { raw: 74.667, grade: 60 }, { raw: 79.333, grade: 70 },
      { raw: 84, grade: 80 },
    ],
  },

  fielding_exchange_time: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 0.85, grade: 20 }, { raw: 0.8, grade: 30 }, { raw: 0.75, grade: 40 },
      { raw: 0.7, grade: 50 }, { raw: 0.633, grade: 60 }, { raw: 0.567, grade: 70 },
      { raw: 0.5, grade: 80 },
    ],
    softball: [
      { raw: 2, grade: 20 }, { raw: 1.783, grade: 30 }, { raw: 1.567, grade: 40 },
      { raw: 1.35, grade: 50 }, { raw: 1.183, grade: 60 }, { raw: 1.017, grade: 70 },
      { raw: 0.85, grade: 80 },
    ],
  },

  pop_time: {
    source: "Baseball Savant pop time leaderboard (MLB avg 2.00s to 2B)",
    as_of: '2026-01-01',
    baseball: [
      { raw: 2.5, grade: 20 }, { raw: 2.333, grade: 30 }, { raw: 2.167, grade: 40 },
      { raw: 2, grade: 50 }, { raw: 1.867, grade: 60 }, { raw: 1.733, grade: 70 },
      { raw: 1.6, grade: 80 },
    ],
    softball: [
      { raw: 2.2, grade: 20 }, { raw: 2.12, grade: 30 }, { raw: 2.04, grade: 40 },
      { raw: 1.96, grade: 50 }, { raw: 1.89, grade: 60 }, { raw: 1.82, grade: 70 },
      { raw: 1.75, grade: 80 },
    ],
  },

  sixty_yard_shuttle: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 15.5, grade: 20 }, { raw: 14.667, grade: 30 }, { raw: 13.833, grade: 40 },
      { raw: 13, grade: 50 }, { raw: 12.267, grade: 60 }, { raw: 11.533, grade: 70 },
      { raw: 10.8, grade: 80 },
    ],
    softball: [
      { raw: 16.5, grade: 20 }, { raw: 15.667, grade: 30 }, { raw: 14.833, grade: 40 },
      { raw: 14, grade: 50 }, { raw: 13.267, grade: 60 }, { raw: 12.533, grade: 70 },
      { raw: 11.8, grade: 80 },
    ],
  },

  sl_balance_eyes_closed: {
    source: "Research - balance norms for athletes",
    as_of: null,
    baseball: [
      { raw: 10, grade: 20 }, { raw: 18.333, grade: 30 }, { raw: 26.667, grade: 40 },
      { raw: 35, grade: 50 }, { raw: 53.333, grade: 60 }, { raw: 71.667, grade: 70 },
      { raw: 90, grade: 80 },
    ],
    softball: [
      { raw: 10, grade: 20 }, { raw: 18.333, grade: 30 }, { raw: 26.667, grade: 40 },
      { raw: 35, grade: 50 }, { raw: 53.333, grade: 60 }, { raw: 71.667, grade: 70 },
      { raw: 90, grade: 80 },
    ],
  },

  deceleration_10yd: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 2.8, grade: 20 }, { raw: 2.533, grade: 30 }, { raw: 2.267, grade: 40 },
      { raw: 2, grade: 50 }, { raw: 1.8, grade: 60 }, { raw: 1.6, grade: 70 },
      { raw: 1.4, grade: 80 },
    ],
    softball: [
      { raw: 3, grade: 20 }, { raw: 2.733, grade: 30 }, { raw: 2.467, grade: 40 },
      { raw: 2.2, grade: 50 }, { raw: 1.983, grade: 60 }, { raw: 1.767, grade: 70 },
      { raw: 1.55, grade: 80 },
    ],
  },

  three_hundred_yd_shuttle: {
    source: "NSCA normative tables",
    as_of: null,
    baseball: [
      { raw: 68, grade: 20 }, { raw: 63.667, grade: 30 }, { raw: 59.333, grade: 40 },
      { raw: 55, grade: 50 }, { raw: 51.333, grade: 60 }, { raw: 47.667, grade: 70 },
      { raw: 44, grade: 80 },
    ],
    softball: [
      { raw: 73, grade: 20 }, { raw: 68.667, grade: 30 }, { raw: 64.333, grade: 40 },
      { raw: 60, grade: 50 }, { raw: 56, grade: 60 }, { raw: 52, grade: 70 },
      { raw: 48, grade: 80 },
    ],
  },

  sprint_repeat_avg: {
    source: "estimate",
    as_of: null,
    baseball: [
      { raw: 4.8, grade: 20 }, { raw: 4.533, grade: 30 }, { raw: 4.267, grade: 40 },
      { raw: 4, grade: 50 }, { raw: 3.8, grade: 60 }, { raw: 3.6, grade: 70 },
      { raw: 3.4, grade: 80 },
    ],
    softball: [
      { raw: 5.1, grade: 20 }, { raw: 4.833, grade: 30 }, { raw: 4.567, grade: 40 },
      { raw: 4.3, grade: 50 }, { raw: 4.083, grade: 60 }, { raw: 3.867, grade: 70 },
      { raw: 3.65, grade: 80 },
    ],
  },

  sl_3x_bound: {
    source: "NSCA bound norms + sport-specific elastic output research",
    as_of: null,
    baseball: [
      { raw: 23, grade: 20 }, { raw: 26.333, grade: 30 }, { raw: 29.667, grade: 40 },
      { raw: 33, grade: 50 }, { raw: 37.667, grade: 60 }, { raw: 42.333, grade: 70 },
      { raw: 47, grade: 80 },
    ],
    softball: [
      { raw: 21, grade: 20 }, { raw: 24, grade: 30 }, { raw: 27, grade: 40 },
      { raw: 30, grade: 50 }, { raw: 34.333, grade: 60 }, { raw: 38.667, grade: 70 },
      { raw: 43, grade: 80 },
    ],
  },

  shoulder_rom_internal: {
    source: "Research - GIRD norms, throwing athlete ROM studies",
    as_of: null,
    baseball: [
      { raw: 28, grade: 20 }, { raw: 33.667, grade: 30 }, { raw: 39.333, grade: 40 },
      { raw: 45, grade: 50 }, { raw: 52.667, grade: 60 }, { raw: 60.333, grade: 70 },
      { raw: 68, grade: 80 },
    ],
    softball: [
      { raw: 30, grade: 20 }, { raw: 35.667, grade: 30 }, { raw: 41.333, grade: 40 },
      { raw: 47, grade: 50 }, { raw: 54.667, grade: 60 }, { raw: 62.333, grade: 70 },
      { raw: 70, grade: 80 },
    ],
  },

  shoulder_rom_external: {
    source: "Research - throwing athlete ROM studies",
    as_of: null,
    baseball: [
      { raw: 65, grade: 20 }, { raw: 72.333, grade: 30 }, { raw: 79.667, grade: 40 },
      { raw: 87, grade: 50 }, { raw: 94.667, grade: 60 }, { raw: 102.333, grade: 70 },
      { raw: 110, grade: 80 },
    ],
    softball: [
      { raw: 66, grade: 20 }, { raw: 73.333, grade: 30 }, { raw: 80.667, grade: 40 },
      { raw: 88, grade: 50 }, { raw: 95.667, grade: 60 }, { raw: 103.333, grade: 70 },
      { raw: 111, grade: 80 },
    ],
  },

  hip_internal_rotation: {
    source: "Research - hip mobility norms for rotational athletes",
    as_of: null,
    baseball: [
      { raw: 20, grade: 20 }, { raw: 24.667, grade: 30 }, { raw: 29.333, grade: 40 },
      { raw: 34, grade: 50 }, { raw: 40, grade: 60 }, { raw: 46, grade: 70 },
      { raw: 52, grade: 80 },
    ],
    softball: [
      { raw: 22, grade: 20 }, { raw: 26.667, grade: 30 }, { raw: 31.333, grade: 40 },
      { raw: 36, grade: 50 }, { raw: 42, grade: 60 }, { raw: 48, grade: 70 },
      { raw: 54, grade: 80 },
    ],
  },

  ankle_dorsiflexion: {
    source: "Research - knee-to-wall test norms",
    as_of: null,
    baseball: [
      { raw: 2.2, grade: 20 }, { raw: 2.8, grade: 30 }, { raw: 3.4, grade: 40 },
      { raw: 4, grade: 50 }, { raw: 4.667, grade: 60 }, { raw: 5.333, grade: 70 },
      { raw: 6, grade: 80 },
    ],
    softball: [
      { raw: 2.5, grade: 20 }, { raw: 3.067, grade: 30 }, { raw: 3.633, grade: 40 },
      { raw: 4.2, grade: 50 }, { raw: 4.867, grade: 60 }, { raw: 5.533, grade: 70 },
      { raw: 6.2, grade: 80 },
    ],
  },};


// =====================================================================
// SOFTBALL GRADING — SUPPRESSED WHERE THE NUMBER IS A CONVERTED ONE
// =====================================================================
// Owner's rule: real numbers only, and no baseball-converted numbers for
// softball. Different game, different biology.
//
// AUSL is in its second season (six teams, 25-game schedule) and publishes no
// tracking-metric averages — there is no Statcast-equivalent leaderboard for
// professional softball. Every softball column below that has a baseball
// counterpart was produced by scaling the baseball figure by a constant, which
// is exactly the thing we will not grade an athlete against.
//
// So those metrics are MEASURED AND STORED but NOT GRADED. The raw value is
// still logged; the moment AUSL publishes, or the owner supplies figures, the
// grades light up from data we already have.
//
// A wrong grade is worse than an absent one.
//
// NOT suppressed, and why:
//   seven_yard_dash, forty_yard_dash  — softball-native tests (PG/PBR softball
//                                       event timing); no baseball table exists
//                                       to have been converted from.
//   shoulder_rom_*, hip_internal_rotation, ankle_dorsiflexion,
//   sl_balance_eyes_closed            — clinical mobility/balance norms from
//                                       human-movement research, not a
//                                       professional-league performance scale.
const SOFTBALL_GRADED_METRICS = new Set<string>([
  'seven_yard_dash',
  'forty_yard_dash',
  'shoulder_rom_internal',
  'shoulder_rom_external',
  'hip_internal_rotation',
  'ankle_dorsiflexion',
  'sl_balance_eyes_closed',
]);

/**
 * True when a softball athlete's raw value for this metric can honestly be
 * turned into a grade. False means: keep the number, withhold the grade, and
 * say why.
 */
export function isSoftballGradable(metricKey: string): boolean {
  return SOFTBALL_GRADED_METRICS.has(metricKey);
}

/** Every softball metric whose grade is withheld for want of a real benchmark. */
export const SOFTBALL_UNGRADED_METRICS: string[] = Object.entries(GRADE_BENCHMARKS)
  .filter(([key, entry]) =>
    (entry.softball?.length ?? 0) > 0 && !SOFTBALL_GRADED_METRICS.has(key))
  .map(([key]) => key);
