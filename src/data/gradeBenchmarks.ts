// =====================================================================
// GRADE BENCHMARKS — Age-Banded 20-80 Scale Conversion Tables
// =====================================================================
// Each metric maps raw values to 20-80 scout grades.
// 45 = MLB/AUSL average, 80 = elite, 20 = floor.
//
// Sources documented inline:
//   MLB Combine  = Perfect Game / MLB Draft Combine published data
//   PG/PBR       = Perfect Game / Prep Baseball Report event averages
//   NSCA         = NSCA normative strength/power tables
//   Research     = Published peer-reviewed research
//   Estimate     = Interpolated from available data points
// =====================================================================

export interface BenchmarkPoint {
  raw: number;
  grade: number;
}

export type AgeBand = '14u' | '18u' | 'college' | 'pro';

export type SportBenchmarks = Partial<Record<AgeBand, BenchmarkPoint[]>>;

export type BenchmarkTable = Record<string, {
  baseball: SportBenchmarks;
  softball: SportBenchmarks;
}>;

/**
 * For metrics where lower is better (times), benchmarks are listed
 * from highest raw (grade 20) to lowest raw (grade 80).
 * The grade engine handles interpolation direction automatically.
 */
export const GRADE_BENCHMARKS: BenchmarkTable = {
  // ── SPEED ──────────────────────────────────────────────
  ten_yard_dash: {
    // Source: PG/PBR event timing data, MLB Combine
    baseball: {
      '14u': [
        { raw: 2.2, grade: 20 }, { raw: 2.0, grade: 30 }, { raw: 1.85, grade: 45 },
        { raw: 1.75, grade: 55 }, { raw: 1.65, grade: 65 }, { raw: 1.55, grade: 80 },
      ],
      '18u': [
        { raw: 2.0, grade: 20 }, { raw: 1.85, grade: 30 }, { raw: 1.7, grade: 45 },
        { raw: 1.6, grade: 55 }, { raw: 1.55, grade: 65 }, { raw: 1.45, grade: 80 },
      ],
      college: [
        { raw: 1.9, grade: 20 }, { raw: 1.75, grade: 30 }, { raw: 1.65, grade: 45 },
        { raw: 1.55, grade: 55 }, { raw: 1.5, grade: 65 }, { raw: 1.4, grade: 80 },
      ],
      pro: [
        { raw: 1.85, grade: 20 }, { raw: 1.7, grade: 30 }, { raw: 1.6, grade: 45 },
        { raw: 1.52, grade: 55 }, { raw: 1.47, grade: 65 }, { raw: 1.38, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 2.3, grade: 20 }, { raw: 2.1, grade: 30 }, { raw: 1.95, grade: 45 },
        { raw: 1.85, grade: 55 }, { raw: 1.75, grade: 65 }, { raw: 1.65, grade: 80 },
      ],
      '18u': [
        { raw: 2.1, grade: 20 }, { raw: 1.95, grade: 30 }, { raw: 1.8, grade: 45 },
        { raw: 1.7, grade: 55 }, { raw: 1.63, grade: 65 }, { raw: 1.55, grade: 80 },
      ],
      college: [
        { raw: 2.0, grade: 20 }, { raw: 1.85, grade: 30 }, { raw: 1.72, grade: 45 },
        { raw: 1.63, grade: 55 }, { raw: 1.57, grade: 65 }, { raw: 1.48, grade: 80 },
      ],
      pro: [
        { raw: 1.95, grade: 20 }, { raw: 1.8, grade: 30 }, { raw: 1.68, grade: 45 },
        { raw: 1.6, grade: 55 }, { raw: 1.53, grade: 65 }, { raw: 1.45, grade: 80 },
      ],
    },
  },

  thirty_yard_dash: {
    // Source: PG event data, Estimate
    baseball: {
      '14u': [
        { raw: 5.2, grade: 20 }, { raw: 4.8, grade: 30 }, { raw: 4.4, grade: 45 },
        { raw: 4.15, grade: 55 }, { raw: 3.95, grade: 65 }, { raw: 3.7, grade: 80 },
      ],
      '18u': [
        { raw: 4.8, grade: 20 }, { raw: 4.4, grade: 30 }, { raw: 4.1, grade: 45 },
        { raw: 3.9, grade: 55 }, { raw: 3.7, grade: 65 }, { raw: 3.5, grade: 80 },
      ],
      college: [
        { raw: 4.5, grade: 20 }, { raw: 4.2, grade: 30 }, { raw: 3.9, grade: 45 },
        { raw: 3.75, grade: 55 }, { raw: 3.6, grade: 65 }, { raw: 3.4, grade: 80 },
      ],
      pro: [
        { raw: 4.3, grade: 20 }, { raw: 4.0, grade: 30 }, { raw: 3.8, grade: 45 },
        { raw: 3.65, grade: 55 }, { raw: 3.5, grade: 65 }, { raw: 3.3, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 5.5, grade: 20 }, { raw: 5.1, grade: 30 }, { raw: 4.7, grade: 45 },
        { raw: 4.4, grade: 55 }, { raw: 4.2, grade: 65 }, { raw: 3.9, grade: 80 },
      ],
      '18u': [
        { raw: 5.1, grade: 20 }, { raw: 4.7, grade: 30 }, { raw: 4.3, grade: 45 },
        { raw: 4.1, grade: 55 }, { raw: 3.9, grade: 65 }, { raw: 3.7, grade: 80 },
      ],
      college: [
        { raw: 4.8, grade: 20 }, { raw: 4.4, grade: 30 }, { raw: 4.1, grade: 45 },
        { raw: 3.9, grade: 55 }, { raw: 3.75, grade: 65 }, { raw: 3.55, grade: 80 },
      ],
      pro: [
        { raw: 4.6, grade: 20 }, { raw: 4.3, grade: 30 }, { raw: 4.0, grade: 45 },
        { raw: 3.8, grade: 55 }, { raw: 3.65, grade: 65 }, { raw: 3.45, grade: 80 },
      ],
    },
  },

  sixty_yard_dash: {
    // Source: MLB Combine avg 2019-2023
    baseball: {
      '14u': [
        { raw: 9.0, grade: 20 }, { raw: 8.3, grade: 30 }, { raw: 7.6, grade: 45 },
        { raw: 7.2, grade: 55 }, { raw: 6.9, grade: 65 }, { raw: 6.5, grade: 80 },
      ],
      '18u': [
        { raw: 8.2, grade: 20 }, { raw: 7.6, grade: 30 }, { raw: 7.1, grade: 45 },
        { raw: 6.8, grade: 55 }, { raw: 6.6, grade: 65 }, { raw: 6.3, grade: 80 },
      ],
      college: [
        { raw: 7.8, grade: 20 }, { raw: 7.3, grade: 30 }, { raw: 6.9, grade: 45 },
        { raw: 6.65, grade: 55 }, { raw: 6.5, grade: 65 }, { raw: 6.3, grade: 80 },
      ],
      pro: [
        { raw: 7.5, grade: 20 }, { raw: 7.1, grade: 30 }, { raw: 6.7, grade: 45 },
        { raw: 6.5, grade: 55 }, { raw: 6.4, grade: 65 }, { raw: 6.2, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 9.5, grade: 20 }, { raw: 8.8, grade: 30 }, { raw: 8.1, grade: 45 },
        { raw: 7.7, grade: 55 }, { raw: 7.3, grade: 65 }, { raw: 6.8, grade: 80 },
      ],
      '18u': [
        { raw: 8.8, grade: 20 }, { raw: 8.2, grade: 30 }, { raw: 7.6, grade: 45 },
        { raw: 7.2, grade: 55 }, { raw: 6.9, grade: 65 }, { raw: 6.5, grade: 80 },
      ],
      college: [
        { raw: 8.3, grade: 20 }, { raw: 7.8, grade: 30 }, { raw: 7.3, grade: 45 },
        { raw: 7.0, grade: 55 }, { raw: 6.7, grade: 65 }, { raw: 6.3, grade: 80 },
      ],
      pro: [
        { raw: 8.0, grade: 20 }, { raw: 7.5, grade: 30 }, { raw: 7.1, grade: 45 },
        { raw: 6.8, grade: 55 }, { raw: 6.5, grade: 65 }, { raw: 6.1, grade: 80 },
      ],
    },
  },

  ten_thirty_split: {
    // Source: Estimate derived from 10yd and 30yd data
    baseball: {
      '18u': [
        { raw: 3.5, grade: 20 }, { raw: 3.1, grade: 30 }, { raw: 2.7, grade: 45 },
        { raw: 2.5, grade: 55 }, { raw: 2.3, grade: 65 }, { raw: 2.1, grade: 80 },
      ],
      pro: [
        { raw: 3.0, grade: 20 }, { raw: 2.7, grade: 30 }, { raw: 2.4, grade: 45 },
        { raw: 2.25, grade: 55 }, { raw: 2.1, grade: 65 }, { raw: 1.9, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 3.7, grade: 20 }, { raw: 3.3, grade: 30 }, { raw: 2.9, grade: 45 },
        { raw: 2.7, grade: 55 }, { raw: 2.5, grade: 65 }, { raw: 2.3, grade: 80 },
      ],
      pro: [
        { raw: 3.3, grade: 20 }, { raw: 3.0, grade: 30 }, { raw: 2.6, grade: 45 },
        { raw: 2.45, grade: 55 }, { raw: 2.3, grade: 65 }, { raw: 2.1, grade: 80 },
      ],
    },
  },

  thirty_sixty_split: {
    // Source: Estimate
    baseball: {
      '18u': [
        { raw: 3.8, grade: 20 }, { raw: 3.4, grade: 30 }, { raw: 3.0, grade: 45 },
        { raw: 2.8, grade: 55 }, { raw: 2.65, grade: 65 }, { raw: 2.4, grade: 80 },
      ],
      pro: [
        { raw: 3.4, grade: 20 }, { raw: 3.1, grade: 30 }, { raw: 2.8, grade: 45 },
        { raw: 2.65, grade: 55 }, { raw: 2.5, grade: 65 }, { raw: 2.3, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 4.0, grade: 20 }, { raw: 3.6, grade: 30 }, { raw: 3.2, grade: 45 },
        { raw: 3.0, grade: 55 }, { raw: 2.8, grade: 65 }, { raw: 2.6, grade: 80 },
      ],
      pro: [
        { raw: 3.7, grade: 20 }, { raw: 3.3, grade: 30 }, { raw: 3.0, grade: 45 },
        { raw: 2.8, grade: 55 }, { raw: 2.65, grade: 65 }, { raw: 2.45, grade: 80 },
      ],
    },
  },

  // ── QUICKNESS ──────────────────────────────────────────
  pro_agility: {
    // Source: NFL/MLB Combine cross-reference, PG data
    baseball: {
      '14u': [
        { raw: 5.8, grade: 20 }, { raw: 5.4, grade: 30 }, { raw: 5.0, grade: 45 },
        { raw: 4.7, grade: 55 }, { raw: 4.5, grade: 65 }, { raw: 4.2, grade: 80 },
      ],
      '18u': [
        { raw: 5.4, grade: 20 }, { raw: 5.0, grade: 30 }, { raw: 4.6, grade: 45 },
        { raw: 4.4, grade: 55 }, { raw: 4.2, grade: 65 }, { raw: 3.9, grade: 80 },
      ],
      college: [
        { raw: 5.1, grade: 20 }, { raw: 4.7, grade: 30 }, { raw: 4.4, grade: 45 },
        { raw: 4.2, grade: 55 }, { raw: 4.05, grade: 65 }, { raw: 3.8, grade: 80 },
      ],
      pro: [
        { raw: 4.9, grade: 20 }, { raw: 4.6, grade: 30 }, { raw: 4.3, grade: 45 },
        { raw: 4.1, grade: 55 }, { raw: 3.95, grade: 65 }, { raw: 3.7, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 6.0, grade: 20 }, { raw: 5.6, grade: 30 }, { raw: 5.2, grade: 45 },
        { raw: 4.9, grade: 55 }, { raw: 4.7, grade: 65 }, { raw: 4.4, grade: 80 },
      ],
      '18u': [
        { raw: 5.6, grade: 20 }, { raw: 5.2, grade: 30 }, { raw: 4.8, grade: 45 },
        { raw: 4.55, grade: 55 }, { raw: 4.35, grade: 65 }, { raw: 4.1, grade: 80 },
      ],
      college: [
        { raw: 5.3, grade: 20 }, { raw: 4.9, grade: 30 }, { raw: 4.6, grade: 45 },
        { raw: 4.4, grade: 55 }, { raw: 4.2, grade: 65 }, { raw: 3.95, grade: 80 },
      ],
      pro: [
        { raw: 5.1, grade: 20 }, { raw: 4.8, grade: 30 }, { raw: 4.5, grade: 45 },
        { raw: 4.3, grade: 55 }, { raw: 4.1, grade: 65 }, { raw: 3.85, grade: 80 },
      ],
    },
  },

  lateral_shuffle: {
    // Source: Estimate from agility/quickness norms
    baseball: {
      '18u': [
        { raw: 4.0, grade: 20 }, { raw: 3.6, grade: 30 }, { raw: 3.2, grade: 45 },
        { raw: 3.0, grade: 55 }, { raw: 2.8, grade: 65 }, { raw: 2.5, grade: 80 },
      ],
      pro: [
        { raw: 3.6, grade: 20 }, { raw: 3.3, grade: 30 }, { raw: 2.9, grade: 45 },
        { raw: 2.75, grade: 55 }, { raw: 2.6, grade: 65 }, { raw: 2.35, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 4.2, grade: 20 }, { raw: 3.8, grade: 30 }, { raw: 3.4, grade: 45 },
        { raw: 3.2, grade: 55 }, { raw: 3.0, grade: 65 }, { raw: 2.7, grade: 80 },
      ],
      pro: [
        { raw: 3.8, grade: 20 }, { raw: 3.5, grade: 30 }, { raw: 3.1, grade: 45 },
        { raw: 2.9, grade: 55 }, { raw: 2.75, grade: 65 }, { raw: 2.5, grade: 80 },
      ],
    },
  },

  first_step_5yd: {
    // Source: Estimate
    baseball: {
      '18u': [
        { raw: 1.6, grade: 20 }, { raw: 1.4, grade: 30 }, { raw: 1.2, grade: 45 },
        { raw: 1.1, grade: 55 }, { raw: 1.0, grade: 65 }, { raw: 0.85, grade: 80 },
      ],
      pro: [
        { raw: 1.4, grade: 20 }, { raw: 1.25, grade: 30 }, { raw: 1.1, grade: 45 },
        { raw: 1.0, grade: 55 }, { raw: 0.92, grade: 65 }, { raw: 0.8, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 1.7, grade: 20 }, { raw: 1.5, grade: 30 }, { raw: 1.3, grade: 45 },
        { raw: 1.2, grade: 55 }, { raw: 1.1, grade: 65 }, { raw: 0.95, grade: 80 },
      ],
      pro: [
        { raw: 1.5, grade: 20 }, { raw: 1.35, grade: 30 }, { raw: 1.2, grade: 45 },
        { raw: 1.1, grade: 55 }, { raw: 1.0, grade: 65 }, { raw: 0.87, grade: 80 },
      ],
    },
  },

  // ── POWER — LOWER BODY ─────────────────────────────────
  sl_broad_jump: {
    // Source: NSCA normative tables, PG data
    baseball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 45, grade: 30 }, { raw: 55, grade: 45 },
        { raw: 62, grade: 55 }, { raw: 70, grade: 65 }, { raw: 82, grade: 80 },
      ],
      '18u': [
        { raw: 45, grade: 20 }, { raw: 55, grade: 30 }, { raw: 68, grade: 45 },
        { raw: 75, grade: 55 }, { raw: 82, grade: 65 }, { raw: 95, grade: 80 },
      ],
      college: [
        { raw: 50, grade: 20 }, { raw: 60, grade: 30 }, { raw: 72, grade: 45 },
        { raw: 80, grade: 55 }, { raw: 88, grade: 65 }, { raw: 100, grade: 80 },
      ],
      pro: [
        { raw: 55, grade: 20 }, { raw: 65, grade: 30 }, { raw: 76, grade: 45 },
        { raw: 84, grade: 55 }, { raw: 92, grade: 65 }, { raw: 105, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 30, grade: 20 }, { raw: 40, grade: 30 }, { raw: 50, grade: 45 },
        { raw: 57, grade: 55 }, { raw: 65, grade: 65 }, { raw: 76, grade: 80 },
      ],
      '18u': [
        { raw: 40, grade: 20 }, { raw: 50, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 69, grade: 55 }, { raw: 76, grade: 65 }, { raw: 88, grade: 80 },
      ],
      college: [
        { raw: 45, grade: 20 }, { raw: 55, grade: 30 }, { raw: 66, grade: 45 },
        { raw: 74, grade: 55 }, { raw: 82, grade: 65 }, { raw: 94, grade: 80 },
      ],
      pro: [
        { raw: 48, grade: 20 }, { raw: 58, grade: 30 }, { raw: 70, grade: 45 },
        { raw: 78, grade: 55 }, { raw: 86, grade: 65 }, { raw: 98, grade: 80 },
      ],
    },
  },

  sl_lateral_broad_jump: {
    // Source: NSCA, Estimate
    baseball: {
      '14u': [
        { raw: 30, grade: 20 }, { raw: 38, grade: 30 }, { raw: 48, grade: 45 },
        { raw: 55, grade: 55 }, { raw: 62, grade: 65 }, { raw: 74, grade: 80 },
      ],
      '18u': [
        { raw: 38, grade: 20 }, { raw: 48, grade: 30 }, { raw: 58, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 72, grade: 65 }, { raw: 84, grade: 80 },
      ],
      college: [
        { raw: 42, grade: 20 }, { raw: 52, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 78, grade: 65 }, { raw: 90, grade: 80 },
      ],
      pro: [
        { raw: 45, grade: 20 }, { raw: 55, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 73, grade: 55 }, { raw: 81, grade: 65 }, { raw: 93, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 28, grade: 20 }, { raw: 36, grade: 30 }, { raw: 44, grade: 45 },
        { raw: 51, grade: 55 }, { raw: 58, grade: 65 }, { raw: 68, grade: 80 },
      ],
      '18u': [
        { raw: 35, grade: 20 }, { raw: 44, grade: 30 }, { raw: 54, grade: 45 },
        { raw: 61, grade: 55 }, { raw: 68, grade: 65 }, { raw: 78, grade: 80 },
      ],
      college: [
        { raw: 39, grade: 20 }, { raw: 48, grade: 30 }, { raw: 58, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 73, grade: 65 }, { raw: 84, grade: 80 },
      ],
      pro: [
        { raw: 42, grade: 20 }, { raw: 51, grade: 30 }, { raw: 61, grade: 45 },
        { raw: 68, grade: 55 }, { raw: 76, grade: 65 }, { raw: 87, grade: 80 },
      ],
    },
  },

  sl_vert_jump: {
    // Source: NSCA, PG event data
    baseball: {
      '14u': [
        { raw: 12, grade: 20 }, { raw: 16, grade: 30 }, { raw: 20, grade: 45 },
        { raw: 23, grade: 55 }, { raw: 26, grade: 65 }, { raw: 30, grade: 80 },
      ],
      '18u': [
        { raw: 15, grade: 20 }, { raw: 19, grade: 30 }, { raw: 24, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 30, grade: 65 }, { raw: 35, grade: 80 },
      ],
      college: [
        { raw: 17, grade: 20 }, { raw: 21, grade: 30 }, { raw: 26, grade: 45 },
        { raw: 29, grade: 55 }, { raw: 32, grade: 65 }, { raw: 37, grade: 80 },
      ],
      pro: [
        { raw: 18, grade: 20 }, { raw: 22, grade: 30 }, { raw: 27, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 33, grade: 65 }, { raw: 38, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 10, grade: 20 }, { raw: 14, grade: 30 }, { raw: 18, grade: 45 },
        { raw: 21, grade: 55 }, { raw: 24, grade: 65 }, { raw: 28, grade: 80 },
      ],
      '18u': [
        { raw: 13, grade: 20 }, { raw: 17, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 25, grade: 55 }, { raw: 28, grade: 65 }, { raw: 32, grade: 80 },
      ],
      college: [
        { raw: 15, grade: 20 }, { raw: 19, grade: 30 }, { raw: 24, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 30, grade: 65 }, { raw: 34, grade: 80 },
      ],
      pro: [
        { raw: 16, grade: 20 }, { raw: 20, grade: 30 }, { raw: 25, grade: 45 },
        { raw: 28, grade: 55 }, { raw: 31, grade: 65 }, { raw: 35, grade: 80 },
      ],
    },
  },

  vertical_jump: {
    // Source: NSCA normative tables
    baseball: {
      '14u': [
        { raw: 14, grade: 20 }, { raw: 18, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 25, grade: 55 }, { raw: 28, grade: 65 }, { raw: 33, grade: 80 },
      ],
      '18u': [
        { raw: 18, grade: 20 }, { raw: 22, grade: 30 }, { raw: 27, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 33, grade: 65 }, { raw: 38, grade: 80 },
      ],
      college: [
        { raw: 20, grade: 20 }, { raw: 24, grade: 30 }, { raw: 29, grade: 45 },
        { raw: 32, grade: 55 }, { raw: 35, grade: 65 }, { raw: 40, grade: 80 },
      ],
      pro: [
        { raw: 22, grade: 20 }, { raw: 26, grade: 30 }, { raw: 31, grade: 45 },
        { raw: 34, grade: 55 }, { raw: 37, grade: 65 }, { raw: 42, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 12, grade: 20 }, { raw: 16, grade: 30 }, { raw: 20, grade: 45 },
        { raw: 23, grade: 55 }, { raw: 26, grade: 65 }, { raw: 30, grade: 80 },
      ],
      '18u': [
        { raw: 16, grade: 20 }, { raw: 20, grade: 30 }, { raw: 24, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 30, grade: 65 }, { raw: 35, grade: 80 },
      ],
      college: [
        { raw: 18, grade: 20 }, { raw: 22, grade: 30 }, { raw: 26, grade: 45 },
        { raw: 29, grade: 55 }, { raw: 32, grade: 65 }, { raw: 37, grade: 80 },
      ],
      pro: [
        { raw: 19, grade: 20 }, { raw: 23, grade: 30 }, { raw: 27, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 33, grade: 65 }, { raw: 38, grade: 80 },
      ],
    },
  },

  standing_broad_jump: {
    // Source: NSCA normative tables
    baseball: {
      '18u': [
        { raw: 60, grade: 20 }, { raw: 72, grade: 30 }, { raw: 85, grade: 45 },
        { raw: 93, grade: 55 }, { raw: 100, grade: 65 }, { raw: 115, grade: 80 },
      ],
      pro: [
        { raw: 70, grade: 20 }, { raw: 82, grade: 30 }, { raw: 95, grade: 45 },
        { raw: 103, grade: 55 }, { raw: 110, grade: 65 }, { raw: 125, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 55, grade: 20 }, { raw: 66, grade: 30 }, { raw: 78, grade: 45 },
        { raw: 86, grade: 55 }, { raw: 93, grade: 65 }, { raw: 106, grade: 80 },
      ],
      pro: [
        { raw: 62, grade: 20 }, { raw: 74, grade: 30 }, { raw: 87, grade: 45 },
        { raw: 95, grade: 55 }, { raw: 102, grade: 65 }, { raw: 116, grade: 80 },
      ],
    },
  },

  // ── POWER — UPPER BODY / ROTATIONAL ────────────────────
  mb_situp_throw: {
    // Source: NSCA, Estimate
    baseball: {
      '14u': [
        { raw: 10, grade: 20 }, { raw: 15, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 32, grade: 65 }, { raw: 40, grade: 80 },
      ],
      '18u': [
        { raw: 15, grade: 20 }, { raw: 22, grade: 30 }, { raw: 30, grade: 45 },
        { raw: 35, grade: 55 }, { raw: 40, grade: 65 }, { raw: 50, grade: 80 },
      ],
      college: [
        { raw: 18, grade: 20 }, { raw: 25, grade: 30 }, { raw: 33, grade: 45 },
        { raw: 38, grade: 55 }, { raw: 43, grade: 65 }, { raw: 52, grade: 80 },
      ],
      pro: [
        { raw: 20, grade: 20 }, { raw: 27, grade: 30 }, { raw: 35, grade: 45 },
        { raw: 40, grade: 55 }, { raw: 45, grade: 65 }, { raw: 55, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 8, grade: 20 }, { raw: 12, grade: 30 }, { raw: 18, grade: 45 },
        { raw: 23, grade: 55 }, { raw: 28, grade: 65 }, { raw: 35, grade: 80 },
      ],
      '18u': [
        { raw: 12, grade: 20 }, { raw: 18, grade: 30 }, { raw: 25, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 35, grade: 65 }, { raw: 43, grade: 80 },
      ],
      college: [
        { raw: 15, grade: 20 }, { raw: 21, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 33, grade: 55 }, { raw: 38, grade: 65 }, { raw: 46, grade: 80 },
      ],
      pro: [
        { raw: 17, grade: 20 }, { raw: 23, grade: 30 }, { raw: 30, grade: 45 },
        { raw: 35, grade: 55 }, { raw: 40, grade: 65 }, { raw: 48, grade: 80 },
      ],
    },
  },

  seated_chest_pass: {
    // Source: NSCA, Estimate
    baseball: {
      '14u': [
        { raw: 8, grade: 20 }, { raw: 12, grade: 30 }, { raw: 18, grade: 45 },
        { raw: 22, grade: 55 }, { raw: 26, grade: 65 }, { raw: 33, grade: 80 },
      ],
      '18u': [
        { raw: 12, grade: 20 }, { raw: 17, grade: 30 }, { raw: 24, grade: 45 },
        { raw: 28, grade: 55 }, { raw: 32, grade: 65 }, { raw: 39, grade: 80 },
      ],
      college: [
        { raw: 14, grade: 20 }, { raw: 19, grade: 30 }, { raw: 26, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 34, grade: 65 }, { raw: 41, grade: 80 },
      ],
      pro: [
        { raw: 16, grade: 20 }, { raw: 21, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 32, grade: 55 }, { raw: 36, grade: 65 }, { raw: 43, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 6, grade: 20 }, { raw: 10, grade: 30 }, { raw: 15, grade: 45 },
        { raw: 19, grade: 55 }, { raw: 23, grade: 65 }, { raw: 29, grade: 80 },
      ],
      '18u': [
        { raw: 10, grade: 20 }, { raw: 14, grade: 30 }, { raw: 20, grade: 45 },
        { raw: 24, grade: 55 }, { raw: 28, grade: 65 }, { raw: 34, grade: 80 },
      ],
      college: [
        { raw: 12, grade: 20 }, { raw: 16, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 26, grade: 55 }, { raw: 30, grade: 65 }, { raw: 36, grade: 80 },
      ],
      pro: [
        { raw: 13, grade: 20 }, { raw: 17, grade: 30 }, { raw: 23, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 31, grade: 65 }, { raw: 37, grade: 80 },
      ],
    },
  },

  mb_rotational_throw: {
    // Source: Estimate from rotational power research
    baseball: {
      '14u': [
        { raw: 14, grade: 20 }, { raw: 19, grade: 30 }, { raw: 25, grade: 45 },
        { raw: 29, grade: 55 }, { raw: 33, grade: 65 }, { raw: 40, grade: 80 },
      ],
      '18u': [
        { raw: 18, grade: 20 }, { raw: 23, grade: 30 }, { raw: 29, grade: 45 },
        { raw: 34, grade: 55 }, { raw: 39, grade: 65 }, { raw: 46, grade: 80 },
      ],
      pro: [
        { raw: 22, grade: 20 }, { raw: 28, grade: 30 }, { raw: 35, grade: 45 },
        { raw: 39, grade: 55 }, { raw: 43, grade: 65 }, { raw: 50, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 12, grade: 20 }, { raw: 17, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 26, grade: 55 }, { raw: 30, grade: 65 }, { raw: 36, grade: 80 },
      ],
      '18u': [
        { raw: 16, grade: 20 }, { raw: 21, grade: 30 }, { raw: 27, grade: 45 },
        { raw: 31, grade: 55 }, { raw: 35, grade: 65 }, { raw: 42, grade: 80 },
      ],
      pro: [
        { raw: 19, grade: 20 }, { raw: 25, grade: 30 }, { raw: 31, grade: 45 },
        { raw: 35, grade: 55 }, { raw: 39, grade: 65 }, { raw: 46, grade: 80 },
      ],
    },
  },

  mb_overhead_throw: {
    // Source: Estimate
    baseball: {
      '18u': [
        { raw: 18, grade: 20 }, { raw: 25, grade: 30 }, { raw: 33, grade: 45 },
        { raw: 38, grade: 55 }, { raw: 43, grade: 65 }, { raw: 52, grade: 80 },
      ],
      pro: [
        { raw: 22, grade: 20 }, { raw: 30, grade: 30 }, { raw: 38, grade: 45 },
        { raw: 43, grade: 55 }, { raw: 48, grade: 65 }, { raw: 57, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 15, grade: 20 }, { raw: 21, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 33, grade: 55 }, { raw: 38, grade: 65 }, { raw: 46, grade: 80 },
      ],
      pro: [
        { raw: 18, grade: 20 }, { raw: 25, grade: 30 }, { raw: 33, grade: 45 },
        { raw: 38, grade: 55 }, { raw: 43, grade: 65 }, { raw: 51, grade: 80 },
      ],
    },
  },

  // ── EXIT VELOCITY & BAT SPEED ──────────────────────────
  tee_exit_velocity: {
    // Source: MLB Combine, Driveline data, PG events
    baseball: {
      '14u': [
        { raw: 50, grade: 20 }, { raw: 58, grade: 30 }, { raw: 68, grade: 45 },
        { raw: 74, grade: 55 }, { raw: 80, grade: 65 }, { raw: 90, grade: 80 },
      ],
      '18u': [
        { raw: 60, grade: 20 }, { raw: 70, grade: 30 }, { raw: 82, grade: 45 },
        { raw: 87, grade: 55 }, { raw: 92, grade: 65 }, { raw: 100, grade: 80 },
      ],
      college: [
        { raw: 65, grade: 20 }, { raw: 74, grade: 30 }, { raw: 85, grade: 45 },
        { raw: 90, grade: 55 }, { raw: 95, grade: 65 }, { raw: 103, grade: 80 },
      ],
      pro: [
        { raw: 70, grade: 20 }, { raw: 78, grade: 30 }, { raw: 88, grade: 45 },
        { raw: 93, grade: 55 }, { raw: 98, grade: 65 }, { raw: 107, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 42, grade: 30 }, { raw: 50, grade: 45 },
        { raw: 55, grade: 55 }, { raw: 60, grade: 65 }, { raw: 68, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 50, grade: 30 }, { raw: 60, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 70, grade: 65 }, { raw: 78, grade: 80 },
      ],
      college: [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 75, grade: 65 }, { raw: 83, grade: 80 },
      ],
      pro: [
        { raw: 50, grade: 20 }, { raw: 58, grade: 30 }, { raw: 68, grade: 45 },
        { raw: 73, grade: 55 }, { raw: 78, grade: 65 }, { raw: 86, grade: 80 },
      ],
    },
  },

  max_tee_distance: {
    // Source: PG event data, Estimate
    baseball: {
      '14u': [
        { raw: 100, grade: 20 }, { raw: 150, grade: 30 }, { raw: 210, grade: 45 },
        { raw: 250, grade: 55 }, { raw: 290, grade: 65 }, { raw: 350, grade: 80 },
      ],
      '18u': [
        { raw: 150, grade: 20 }, { raw: 210, grade: 30 }, { raw: 280, grade: 45 },
        { raw: 310, grade: 55 }, { raw: 340, grade: 65 }, { raw: 400, grade: 80 },
      ],
      pro: [
        { raw: 200, grade: 20 }, { raw: 260, grade: 30 }, { raw: 330, grade: 45 },
        { raw: 360, grade: 55 }, { raw: 390, grade: 65 }, { raw: 450, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 70, grade: 20 }, { raw: 100, grade: 30 }, { raw: 140, grade: 45 },
        { raw: 165, grade: 55 }, { raw: 190, grade: 65 }, { raw: 230, grade: 80 },
      ],
      '18u': [
        { raw: 100, grade: 20 }, { raw: 140, grade: 30 }, { raw: 190, grade: 45 },
        { raw: 215, grade: 55 }, { raw: 240, grade: 65 }, { raw: 290, grade: 80 },
      ],
      pro: [
        { raw: 130, grade: 20 }, { raw: 175, grade: 30 }, { raw: 230, grade: 45 },
        { raw: 255, grade: 55 }, { raw: 280, grade: 65 }, { raw: 330, grade: 80 },
      ],
    },
  },

  bat_speed: {
    // Source: Blast Motion data, Driveline published ranges
    baseball: {
      '14u': [
        { raw: 40, grade: 20 }, { raw: 47, grade: 30 }, { raw: 55, grade: 45 },
        { raw: 60, grade: 55 }, { raw: 65, grade: 65 }, { raw: 73, grade: 80 },
      ],
      '18u': [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 64, grade: 45 },
        { raw: 69, grade: 55 }, { raw: 74, grade: 65 }, { raw: 82, grade: 80 },
      ],
      college: [
        { raw: 52, grade: 20 }, { raw: 59, grade: 30 }, { raw: 68, grade: 45 },
        { raw: 73, grade: 55 }, { raw: 78, grade: 65 }, { raw: 86, grade: 80 },
      ],
      pro: [
        { raw: 55, grade: 20 }, { raw: 62, grade: 30 }, { raw: 71, grade: 45 },
        { raw: 76, grade: 55 }, { raw: 81, grade: 65 }, { raw: 89, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 42, grade: 30 }, { raw: 50, grade: 45 },
        { raw: 55, grade: 55 }, { raw: 60, grade: 65 }, { raw: 68, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 49, grade: 30 }, { raw: 57, grade: 45 },
        { raw: 62, grade: 55 }, { raw: 67, grade: 65 }, { raw: 75, grade: 80 },
      ],
      college: [
        { raw: 46, grade: 20 }, { raw: 53, grade: 30 }, { raw: 61, grade: 45 },
        { raw: 66, grade: 55 }, { raw: 71, grade: 65 }, { raw: 79, grade: 80 },
      ],
      pro: [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 63, grade: 45 },
        { raw: 68, grade: 55 }, { raw: 73, grade: 65 }, { raw: 81, grade: 80 },
      ],
    },
  },

  avg_exit_velo_bp: {
    // Source: Driveline, MLB Combine avg
    baseball: {
      '18u': [
        { raw: 55, grade: 20 }, { raw: 65, grade: 30 }, { raw: 78, grade: 45 },
        { raw: 83, grade: 55 }, { raw: 88, grade: 65 }, { raw: 96, grade: 80 },
      ],
      pro: [
        { raw: 65, grade: 20 }, { raw: 75, grade: 30 }, { raw: 85, grade: 45 },
        { raw: 90, grade: 55 }, { raw: 95, grade: 65 }, { raw: 103, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 40, grade: 20 }, { raw: 48, grade: 30 }, { raw: 57, grade: 45 },
        { raw: 62, grade: 55 }, { raw: 67, grade: 65 }, { raw: 75, grade: 80 },
      ],
      pro: [
        { raw: 46, grade: 20 }, { raw: 54, grade: 30 }, { raw: 63, grade: 45 },
        { raw: 68, grade: 55 }, { raw: 73, grade: 65 }, { raw: 81, grade: 80 },
      ],
    },
  },

  // ── THROWING VELOCITY & ARM STRENGTH ───────────────────
  long_toss_distance: {
    // Source: Driveline, PG event data
    baseball: {
      '14u': [
        { raw: 80, grade: 20 }, { raw: 110, grade: 30 }, { raw: 150, grade: 45 },
        { raw: 175, grade: 55 }, { raw: 200, grade: 65 }, { raw: 250, grade: 80 },
      ],
      '18u': [
        { raw: 120, grade: 20 }, { raw: 155, grade: 30 }, { raw: 200, grade: 45 },
        { raw: 232, grade: 55 }, { raw: 270, grade: 65 }, { raw: 320, grade: 80 },
      ],
      college: [
        { raw: 150, grade: 20 }, { raw: 190, grade: 30 }, { raw: 240, grade: 45 },
        { raw: 270, grade: 55 }, { raw: 300, grade: 65 }, { raw: 350, grade: 80 },
      ],
      pro: [
        { raw: 170, grade: 20 }, { raw: 210, grade: 30 }, { raw: 260, grade: 45 },
        { raw: 290, grade: 55 }, { raw: 320, grade: 65 }, { raw: 370, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 60, grade: 20 }, { raw: 85, grade: 30 }, { raw: 115, grade: 45 },
        { raw: 135, grade: 55 }, { raw: 155, grade: 65 }, { raw: 190, grade: 80 },
      ],
      '18u': [
        { raw: 90, grade: 20 }, { raw: 120, grade: 30 }, { raw: 160, grade: 45 },
        { raw: 185, grade: 55 }, { raw: 210, grade: 65 }, { raw: 250, grade: 80 },
      ],
      college: [
        { raw: 110, grade: 20 }, { raw: 145, grade: 30 }, { raw: 185, grade: 45 },
        { raw: 210, grade: 55 }, { raw: 235, grade: 65 }, { raw: 275, grade: 80 },
      ],
      pro: [
        { raw: 125, grade: 20 }, { raw: 160, grade: 30 }, { raw: 200, grade: 45 },
        { raw: 225, grade: 55 }, { raw: 250, grade: 65 }, { raw: 290, grade: 80 },
      ],
    },
  },

  pitching_velocity: {
    // Source: MLB Combine avg 2019-2023, PG/PBR event data
    baseball: {
      '14u': [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 75, grade: 65 }, { raw: 82, grade: 80 },
      ],
      '18u': [
        { raw: 62, grade: 20 }, { raw: 69, grade: 30 }, { raw: 77, grade: 45 },
        { raw: 82, grade: 55 }, { raw: 88, grade: 65 }, { raw: 94, grade: 80 },
      ],
      college: [
        { raw: 70, grade: 20 }, { raw: 77, grade: 30 }, { raw: 86, grade: 45 },
        { raw: 90, grade: 55 }, { raw: 93, grade: 65 }, { raw: 98, grade: 80 },
      ],
      pro: [
        { raw: 75, grade: 20 }, { raw: 82, grade: 30 }, { raw: 90, grade: 45 },
        { raw: 93, grade: 55 }, { raw: 96, grade: 65 }, { raw: 100, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 40, grade: 30 }, { raw: 47, grade: 45 },
        { raw: 51, grade: 55 }, { raw: 55, grade: 65 }, { raw: 62, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 48, grade: 30 }, { raw: 56, grade: 45 },
        { raw: 60, grade: 55 }, { raw: 64, grade: 65 }, { raw: 70, grade: 80 },
      ],
      college: [
        { raw: 48, grade: 20 }, { raw: 54, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 66, grade: 55 }, { raw: 69, grade: 65 }, { raw: 74, grade: 80 },
      ],
      pro: [
        { raw: 52, grade: 20 }, { raw: 57, grade: 30 }, { raw: 64, grade: 45 },
        { raw: 68, grade: 55 }, { raw: 71, grade: 65 }, { raw: 76, grade: 80 },
      ],
    },
  },

  position_throw_velo: {
    // Source: PG/PBR published position player velo data
    baseball: {
      '14u': [
        { raw: 45, grade: 20 }, { raw: 52, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 67, grade: 55 }, { raw: 72, grade: 65 }, { raw: 80, grade: 80 },
      ],
      '18u': [
        { raw: 55, grade: 20 }, { raw: 63, grade: 30 }, { raw: 74, grade: 45 },
        { raw: 79, grade: 55 }, { raw: 84, grade: 65 }, { raw: 92, grade: 80 },
      ],
      college: [
        { raw: 62, grade: 20 }, { raw: 70, grade: 30 }, { raw: 80, grade: 45 },
        { raw: 85, grade: 55 }, { raw: 89, grade: 65 }, { raw: 96, grade: 80 },
      ],
      pro: [
        { raw: 68, grade: 20 }, { raw: 75, grade: 30 }, { raw: 84, grade: 45 },
        { raw: 88, grade: 55 }, { raw: 92, grade: 65 }, { raw: 98, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 42, grade: 30 }, { raw: 50, grade: 45 },
        { raw: 55, grade: 55 }, { raw: 60, grade: 65 }, { raw: 68, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 50, grade: 30 }, { raw: 60, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 70, grade: 65 }, { raw: 78, grade: 80 },
      ],
      college: [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 75, grade: 65 }, { raw: 83, grade: 80 },
      ],
      pro: [
        { raw: 52, grade: 20 }, { raw: 59, grade: 30 }, { raw: 68, grade: 45 },
        { raw: 73, grade: 55 }, { raw: 78, grade: 65 }, { raw: 86, grade: 80 },
      ],
    },
  },

  pulldown_velocity: {
    // Source: Driveline published pulldown data
    baseball: {
      '18u': [
        { raw: 65, grade: 20 }, { raw: 73, grade: 30 }, { raw: 83, grade: 45 },
        { raw: 88, grade: 55 }, { raw: 93, grade: 65 }, { raw: 100, grade: 80 },
      ],
      pro: [
        { raw: 78, grade: 20 }, { raw: 85, grade: 30 }, { raw: 93, grade: 45 },
        { raw: 97, grade: 55 }, { raw: 101, grade: 65 }, { raw: 108, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 63, grade: 45 },
        { raw: 67, grade: 55 }, { raw: 71, grade: 65 }, { raw: 78, grade: 80 },
      ],
      pro: [
        { raw: 55, grade: 20 }, { raw: 62, grade: 30 }, { raw: 70, grade: 45 },
        { raw: 74, grade: 55 }, { raw: 78, grade: 65 }, { raw: 84, grade: 80 },
      ],
    },
  },

  // ── FIELDING ───────────────────────────────────────────
  fielding_exchange_time: {
    // Source: MLB advanced fielding stats, Estimate
    baseball: {
      '18u': [
        { raw: 2.2, grade: 20 }, { raw: 1.8, grade: 30 }, { raw: 1.4, grade: 45 },
        { raw: 1.2, grade: 55 }, { raw: 1.05, grade: 65 }, { raw: 0.85, grade: 80 },
      ],
      pro: [
        { raw: 1.8, grade: 20 }, { raw: 1.5, grade: 30 }, { raw: 1.2, grade: 45 },
        { raw: 1.05, grade: 55 }, { raw: 0.9, grade: 65 }, { raw: 0.75, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 2.4, grade: 20 }, { raw: 2.0, grade: 30 }, { raw: 1.6, grade: 45 },
        { raw: 1.4, grade: 55 }, { raw: 1.2, grade: 65 }, { raw: 1.0, grade: 80 },
      ],
      pro: [
        { raw: 2.0, grade: 20 }, { raw: 1.7, grade: 30 }, { raw: 1.35, grade: 45 },
        { raw: 1.2, grade: 55 }, { raw: 1.05, grade: 65 }, { raw: 0.85, grade: 80 },
      ],
    },
  },

  pop_time: {
    // Source: MLB Statcast pop time data
    baseball: {
      '14u': [
        { raw: 2.4, grade: 20 }, { raw: 2.25, grade: 30 }, { raw: 2.1, grade: 45 },
        { raw: 2.0, grade: 55 }, { raw: 1.95, grade: 65 }, { raw: 1.85, grade: 80 },
      ],
      '18u': [
        { raw: 2.3, grade: 20 }, { raw: 2.15, grade: 30 }, { raw: 2.0, grade: 45 },
        { raw: 1.95, grade: 55 }, { raw: 1.9, grade: 65 }, { raw: 1.8, grade: 80 },
      ],
      college: [
        { raw: 2.2, grade: 20 }, { raw: 2.1, grade: 30 }, { raw: 1.95, grade: 45 },
        { raw: 1.9, grade: 55 }, { raw: 1.85, grade: 65 }, { raw: 1.78, grade: 80 },
      ],
      pro: [
        { raw: 2.15, grade: 20 }, { raw: 2.05, grade: 30 }, { raw: 1.93, grade: 45 },
        { raw: 1.88, grade: 55 }, { raw: 1.83, grade: 65 }, { raw: 1.75, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 2.5, grade: 20 }, { raw: 2.35, grade: 30 }, { raw: 2.2, grade: 45 },
        { raw: 2.1, grade: 55 }, { raw: 2.0, grade: 65 }, { raw: 1.9, grade: 80 },
      ],
      '18u': [
        { raw: 2.35, grade: 20 }, { raw: 2.2, grade: 30 }, { raw: 2.05, grade: 45 },
        { raw: 1.98, grade: 55 }, { raw: 1.9, grade: 65 }, { raw: 1.8, grade: 80 },
      ],
      college: [
        { raw: 2.25, grade: 20 }, { raw: 2.12, grade: 30 }, { raw: 2.0, grade: 45 },
        { raw: 1.93, grade: 55 }, { raw: 1.87, grade: 65 }, { raw: 1.78, grade: 80 },
      ],
      pro: [
        { raw: 2.2, grade: 20 }, { raw: 2.08, grade: 30 }, { raw: 1.96, grade: 45 },
        { raw: 1.9, grade: 55 }, { raw: 1.84, grade: 65 }, { raw: 1.75, grade: 80 },
      ],
    },
  },

  sixty_yard_shuttle: {
    // Source: Estimate
    baseball: {
      '18u': [
        { raw: 17, grade: 20 }, { raw: 15.5, grade: 30 }, { raw: 14, grade: 45 },
        { raw: 13.2, grade: 55 }, { raw: 12.5, grade: 65 }, { raw: 11.5, grade: 80 },
      ],
      pro: [
        { raw: 15.5, grade: 20 }, { raw: 14.2, grade: 30 }, { raw: 13, grade: 45 },
        { raw: 12.3, grade: 55 }, { raw: 11.7, grade: 65 }, { raw: 10.8, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 18, grade: 20 }, { raw: 16.5, grade: 30 }, { raw: 15, grade: 45 },
        { raw: 14.2, grade: 55 }, { raw: 13.5, grade: 65 }, { raw: 12.5, grade: 80 },
      ],
      pro: [
        { raw: 16.5, grade: 20 }, { raw: 15.2, grade: 30 }, { raw: 14, grade: 45 },
        { raw: 13.3, grade: 55 }, { raw: 12.7, grade: 65 }, { raw: 11.8, grade: 80 },
      ],
    },
  },

  // ── BODY CONTROL ───────────────────────────────────────
  sl_balance_eyes_closed: {
    // Source: Research - balance norms for athletes
    baseball: {
      '14u': [
        { raw: 5, grade: 20 }, { raw: 12, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 40, grade: 65 }, { raw: 60, grade: 80 },
      ],
      '18u': [
        { raw: 8, grade: 20 }, { raw: 16, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 38, grade: 55 }, { raw: 50, grade: 65 }, { raw: 75, grade: 80 },
      ],
      pro: [
        { raw: 10, grade: 20 }, { raw: 20, grade: 30 }, { raw: 35, grade: 45 },
        { raw: 48, grade: 55 }, { raw: 60, grade: 65 }, { raw: 90, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 5, grade: 20 }, { raw: 12, grade: 30 }, { raw: 22, grade: 45 },
        { raw: 30, grade: 55 }, { raw: 40, grade: 65 }, { raw: 60, grade: 80 },
      ],
      '18u': [
        { raw: 8, grade: 20 }, { raw: 16, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 38, grade: 55 }, { raw: 50, grade: 65 }, { raw: 75, grade: 80 },
      ],
      pro: [
        { raw: 10, grade: 20 }, { raw: 20, grade: 30 }, { raw: 35, grade: 45 },
        { raw: 48, grade: 55 }, { raw: 60, grade: 65 }, { raw: 90, grade: 80 },
      ],
    },
  },

  deceleration_10yd: {
    // Source: Estimate
    baseball: {
      '18u': [
        { raw: 3.2, grade: 20 }, { raw: 2.8, grade: 30 }, { raw: 2.3, grade: 45 },
        { raw: 2.1, grade: 55 }, { raw: 1.85, grade: 65 }, { raw: 1.6, grade: 80 },
      ],
      pro: [
        { raw: 2.8, grade: 20 }, { raw: 2.4, grade: 30 }, { raw: 2.0, grade: 45 },
        { raw: 1.8, grade: 55 }, { raw: 1.65, grade: 65 }, { raw: 1.4, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 3.4, grade: 20 }, { raw: 3.0, grade: 30 }, { raw: 2.5, grade: 45 },
        { raw: 2.3, grade: 55 }, { raw: 2.05, grade: 65 }, { raw: 1.8, grade: 80 },
      ],
      pro: [
        { raw: 3.0, grade: 20 }, { raw: 2.6, grade: 30 }, { raw: 2.2, grade: 45 },
        { raw: 2.0, grade: 55 }, { raw: 1.8, grade: 65 }, { raw: 1.55, grade: 80 },
      ],
    },
  },

  // ── ENERGY SYSTEM ──────────────────────────────────────
  three_hundred_yd_shuttle: {
    // Source: NSCA normative tables
    baseball: {
      '18u': [
        { raw: 75, grade: 20 }, { raw: 68, grade: 30 }, { raw: 60, grade: 45 },
        { raw: 56, grade: 55 }, { raw: 52, grade: 65 }, { raw: 47, grade: 80 },
      ],
      pro: [
        { raw: 68, grade: 20 }, { raw: 62, grade: 30 }, { raw: 55, grade: 45 },
        { raw: 52, grade: 55 }, { raw: 49, grade: 65 }, { raw: 44, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 80, grade: 20 }, { raw: 73, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 61, grade: 55 }, { raw: 57, grade: 65 }, { raw: 52, grade: 80 },
      ],
      pro: [
        { raw: 73, grade: 20 }, { raw: 67, grade: 30 }, { raw: 60, grade: 45 },
        { raw: 56, grade: 55 }, { raw: 53, grade: 65 }, { raw: 48, grade: 80 },
      ],
    },
  },

  sprint_repeat_avg: {
    // Source: Estimate from sprint conditioning norms
    baseball: {
      '18u': [
        { raw: 5.2, grade: 20 }, { raw: 4.8, grade: 30 }, { raw: 4.3, grade: 45 },
        { raw: 4.1, grade: 55 }, { raw: 3.9, grade: 65 }, { raw: 3.6, grade: 80 },
      ],
      pro: [
        { raw: 4.8, grade: 20 }, { raw: 4.4, grade: 30 }, { raw: 4.0, grade: 45 },
        { raw: 3.8, grade: 55 }, { raw: 3.65, grade: 65 }, { raw: 3.4, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 5.5, grade: 20 }, { raw: 5.1, grade: 30 }, { raw: 4.6, grade: 45 },
        { raw: 4.35, grade: 55 }, { raw: 4.15, grade: 65 }, { raw: 3.85, grade: 80 },
      ],
      pro: [
        { raw: 5.1, grade: 20 }, { raw: 4.7, grade: 30 }, { raw: 4.3, grade: 45 },
        { raw: 4.1, grade: 55 }, { raw: 3.9, grade: 65 }, { raw: 3.65, grade: 80 },
      ],
    },
  },

  // ── MOBILITY ───────────────────────────────────────────
  sit_and_reach: {
    // Source: NSCA normative tables
    baseball: {
      '14u': [
        { raw: -2, grade: 20 }, { raw: 2, grade: 30 }, { raw: 6, grade: 45 },
        { raw: 9, grade: 55 }, { raw: 12, grade: 65 }, { raw: 17, grade: 80 },
      ],
      '18u': [
        { raw: -1, grade: 20 }, { raw: 3, grade: 30 }, { raw: 7, grade: 45 },
        { raw: 10, grade: 55 }, { raw: 13, grade: 65 }, { raw: 18, grade: 80 },
      ],
      pro: [
        { raw: 0, grade: 20 }, { raw: 4, grade: 30 }, { raw: 8, grade: 45 },
        { raw: 11, grade: 55 }, { raw: 14, grade: 65 }, { raw: 19, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 0, grade: 20 }, { raw: 4, grade: 30 }, { raw: 8, grade: 45 },
        { raw: 11, grade: 55 }, { raw: 14, grade: 65 }, { raw: 19, grade: 80 },
      ],
      '18u': [
        { raw: 1, grade: 20 }, { raw: 5, grade: 30 }, { raw: 9, grade: 45 },
        { raw: 12, grade: 55 }, { raw: 15, grade: 65 }, { raw: 20, grade: 80 },
      ],
      pro: [
        { raw: 2, grade: 20 }, { raw: 6, grade: 30 }, { raw: 10, grade: 45 },
        { raw: 13, grade: 55 }, { raw: 16, grade: 65 }, { raw: 21, grade: 80 },
      ],
    },
  },

  shoulder_rom_internal: {
    // Source: Research - GIRD norms, throwing athlete ROM studies
    baseball: {
      '18u': [
        { raw: 25, grade: 20 }, { raw: 32, grade: 30 }, { raw: 42, grade: 45 },
        { raw: 48, grade: 55 }, { raw: 55, grade: 65 }, { raw: 65, grade: 80 },
      ],
      pro: [
        { raw: 28, grade: 20 }, { raw: 35, grade: 30 }, { raw: 45, grade: 45 },
        { raw: 52, grade: 55 }, { raw: 58, grade: 65 }, { raw: 68, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 28, grade: 20 }, { raw: 35, grade: 30 }, { raw: 45, grade: 45 },
        { raw: 52, grade: 55 }, { raw: 58, grade: 65 }, { raw: 68, grade: 80 },
      ],
      pro: [
        { raw: 30, grade: 20 }, { raw: 37, grade: 30 }, { raw: 47, grade: 45 },
        { raw: 54, grade: 55 }, { raw: 60, grade: 65 }, { raw: 70, grade: 80 },
      ],
    },
  },

  shoulder_rom_external: {
    // Source: Research - throwing athlete ROM studies
    baseball: {
      '18u': [
        { raw: 60, grade: 20 }, { raw: 70, grade: 30 }, { raw: 82, grade: 45 },
        { raw: 89, grade: 55 }, { raw: 95, grade: 65 }, { raw: 105, grade: 80 },
      ],
      pro: [
        { raw: 65, grade: 20 }, { raw: 75, grade: 30 }, { raw: 87, grade: 45 },
        { raw: 93, grade: 55 }, { raw: 99, grade: 65 }, { raw: 110, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 62, grade: 20 }, { raw: 72, grade: 30 }, { raw: 84, grade: 45 },
        { raw: 90, grade: 55 }, { raw: 96, grade: 65 }, { raw: 106, grade: 80 },
      ],
      pro: [
        { raw: 66, grade: 20 }, { raw: 76, grade: 30 }, { raw: 88, grade: 45 },
        { raw: 94, grade: 55 }, { raw: 100, grade: 65 }, { raw: 111, grade: 80 },
      ],
    },
  },

  hip_internal_rotation: {
    // Source: Research - hip mobility norms for rotational athletes
    baseball: {
      '18u': [
        { raw: 18, grade: 20 }, { raw: 24, grade: 30 }, { raw: 32, grade: 45 },
        { raw: 37, grade: 55 }, { raw: 42, grade: 65 }, { raw: 50, grade: 80 },
      ],
      pro: [
        { raw: 20, grade: 20 }, { raw: 26, grade: 30 }, { raw: 34, grade: 45 },
        { raw: 39, grade: 55 }, { raw: 44, grade: 65 }, { raw: 52, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 20, grade: 20 }, { raw: 26, grade: 30 }, { raw: 34, grade: 45 },
        { raw: 39, grade: 55 }, { raw: 44, grade: 65 }, { raw: 52, grade: 80 },
      ],
      pro: [
        { raw: 22, grade: 20 }, { raw: 28, grade: 30 }, { raw: 36, grade: 45 },
        { raw: 41, grade: 55 }, { raw: 46, grade: 65 }, { raw: 54, grade: 80 },
      ],
    },
  },

  ankle_dorsiflexion: {
    // Source: Research - knee-to-wall test norms
    baseball: {
      '18u': [
        { raw: 2.0, grade: 20 }, { raw: 2.8, grade: 30 }, { raw: 3.8, grade: 45 },
        { raw: 4.3, grade: 55 }, { raw: 4.8, grade: 65 }, { raw: 5.8, grade: 80 },
      ],
      pro: [
        { raw: 2.2, grade: 20 }, { raw: 3.0, grade: 30 }, { raw: 4.0, grade: 45 },
        { raw: 4.5, grade: 55 }, { raw: 5.0, grade: 65 }, { raw: 6.0, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 2.2, grade: 20 }, { raw: 3.0, grade: 30 }, { raw: 4.0, grade: 45 },
        { raw: 4.5, grade: 55 }, { raw: 5.0, grade: 65 }, { raw: 6.0, grade: 80 },
      ],
      pro: [
        { raw: 2.5, grade: 20 }, { raw: 3.2, grade: 30 }, { raw: 4.2, grade: 45 },
        { raw: 4.7, grade: 55 }, { raw: 5.2, grade: 65 }, { raw: 6.2, grade: 80 },
      ],
    },
  },

  // ── HEALTH ─────────────────────────────────────────────
  resting_heart_rate: {
    // Source: American Heart Association norms
    baseball: {
      '14u': [
        { raw: 90, grade: 20 }, { raw: 80, grade: 30 }, { raw: 70, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 60, grade: 65 }, { raw: 50, grade: 80 },
      ],
      '18u': [
        { raw: 85, grade: 20 }, { raw: 76, grade: 30 }, { raw: 66, grade: 45 },
        { raw: 62, grade: 55 }, { raw: 57, grade: 65 }, { raw: 48, grade: 80 },
      ],
      pro: [
        { raw: 80, grade: 20 }, { raw: 72, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 58, grade: 55 }, { raw: 53, grade: 65 }, { raw: 44, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 90, grade: 20 }, { raw: 80, grade: 30 }, { raw: 70, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 60, grade: 65 }, { raw: 50, grade: 80 },
      ],
      '18u': [
        { raw: 85, grade: 20 }, { raw: 76, grade: 30 }, { raw: 66, grade: 45 },
        { raw: 62, grade: 55 }, { raw: 57, grade: 65 }, { raw: 48, grade: 80 },
      ],
      pro: [
        { raw: 80, grade: 20 }, { raw: 72, grade: 30 }, { raw: 62, grade: 45 },
        { raw: 58, grade: 55 }, { raw: 53, grade: 65 }, { raw: 44, grade: 80 },
      ],
    },
  },

  body_weight: {
    // No grade scaling — body weight is tracked for monitoring, not graded
    baseball: {},
    softball: {},
  },

  body_fat_pct: {
    // Source: NSCA body composition norms for athletes
    baseball: {
      '18u': [
        { raw: 28, grade: 20 }, { raw: 22, grade: 30 }, { raw: 16, grade: 45 },
        { raw: 13, grade: 55 }, { raw: 10, grade: 65 }, { raw: 7, grade: 80 },
      ],
      pro: [
        { raw: 25, grade: 20 }, { raw: 20, grade: 30 }, { raw: 14, grade: 45 },
        { raw: 12, grade: 55 }, { raw: 9, grade: 65 }, { raw: 6, grade: 80 },
      ],
    },
    softball: {
      '18u': [
        { raw: 32, grade: 20 }, { raw: 27, grade: 30 }, { raw: 21, grade: 45 },
        { raw: 18, grade: 55 }, { raw: 15, grade: 65 }, { raw: 12, grade: 80 },
      ],
      pro: [
        { raw: 30, grade: 20 }, { raw: 25, grade: 30 }, { raw: 20, grade: 45 },
        { raw: 17, grade: 55 }, { raw: 14, grade: 65 }, { raw: 11, grade: 80 },
      ],
    },
  },

  // ── RECOVERY ───────────────────────────────────────────
  soreness_score: {
    // Lower is better (less sore)
    baseball: {
      '14u': [
        { raw: 9, grade: 20 }, { raw: 7, grade: 30 }, { raw: 5, grade: 45 },
        { raw: 4, grade: 55 }, { raw: 3, grade: 65 }, { raw: 1, grade: 80 },
      ],
      pro: [
        { raw: 9, grade: 20 }, { raw: 7, grade: 30 }, { raw: 5, grade: 45 },
        { raw: 4, grade: 55 }, { raw: 3, grade: 65 }, { raw: 1, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 9, grade: 20 }, { raw: 7, grade: 30 }, { raw: 5, grade: 45 },
        { raw: 4, grade: 55 }, { raw: 3, grade: 65 }, { raw: 1, grade: 80 },
      ],
      pro: [
        { raw: 9, grade: 20 }, { raw: 7, grade: 30 }, { raw: 5, grade: 45 },
        { raw: 4, grade: 55 }, { raw: 3, grade: 65 }, { raw: 1, grade: 80 },
      ],
    },
  },

  sleep_hours_avg: {
    // Higher is better (more sleep)
    baseball: {
      '14u': [
        { raw: 4, grade: 20 }, { raw: 5.5, grade: 30 }, { raw: 7, grade: 45 },
        { raw: 7.5, grade: 55 }, { raw: 8, grade: 65 }, { raw: 9.5, grade: 80 },
      ],
      pro: [
        { raw: 4, grade: 20 }, { raw: 5.5, grade: 30 }, { raw: 7, grade: 45 },
        { raw: 7.5, grade: 55 }, { raw: 8, grade: 65 }, { raw: 9.5, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 4, grade: 20 }, { raw: 5.5, grade: 30 }, { raw: 7, grade: 45 },
        { raw: 7.5, grade: 55 }, { raw: 8, grade: 65 }, { raw: 9.5, grade: 80 },
      ],
      pro: [
        { raw: 4, grade: 20 }, { raw: 5.5, grade: 30 }, { raw: 7, grade: 45 },
        { raw: 7.5, grade: 55 }, { raw: 8, grade: 65 }, { raw: 9.5, grade: 80 },
      ],
    },
  },

  recovery_score: {
    // Higher is better
    baseball: {
      '14u': [
        { raw: 2, grade: 20 }, { raw: 4, grade: 30 }, { raw: 6, grade: 45 },
        { raw: 7, grade: 55 }, { raw: 8, grade: 65 }, { raw: 10, grade: 80 },
      ],
      pro: [
        { raw: 2, grade: 20 }, { raw: 4, grade: 30 }, { raw: 6, grade: 45 },
        { raw: 7, grade: 55 }, { raw: 8, grade: 65 }, { raw: 10, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 2, grade: 20 }, { raw: 4, grade: 30 }, { raw: 6, grade: 45 },
        { raw: 7, grade: 55 }, { raw: 8, grade: 65 }, { raw: 10, grade: 80 },
      ],
      pro: [
        { raw: 2, grade: 20 }, { raw: 4, grade: 30 }, { raw: 6, grade: 45 },
        { raw: 7, grade: 55 }, { raw: 8, grade: 65 }, { raw: 10, grade: 80 },
      ],
    },
  },
};
