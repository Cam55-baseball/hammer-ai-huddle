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

import { scaleDerivedPoints } from '@/lib/benchmarks/canonical';

export interface BenchmarkPoint {
  raw: number;
  grade: number;
}

export type AgeBand = '14u' | '18u' | 'college' | 'pro';

export type SportBenchmarks = Partial<Record<AgeBand, BenchmarkPoint[]>>;

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
 * For metrics where lower is better (times), benchmarks are listed
 * from highest raw (grade 20) to lowest raw (grade 80).
 * The grade engine handles interpolation direction automatically.
 */
export const GRADE_BENCHMARKS: BenchmarkTable = {
  // ── SPEED ──────────────────────────────────────────────
  ten_yard_dash: {
    source: 'PG/PBR event timing data, MLB Combine — baseball only',
    as_of: null,
    // Source: PG/PBR event timing data, MLB Combine — baseball only
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
        { raw: 1.9, grade: 20 }, { raw: 1.75, grade: 30 }, { raw: 1.62, grade: 45 },
        { raw: 1.52, grade: 55 }, { raw: 1.45, grade: 65 }, { raw: 1.35, grade: 80 },
      ],
      pro: [
        { raw: 1.85, grade: 20 }, { raw: 1.7, grade: 30 }, { raw: 1.55, grade: 45 },
        { raw: 1.48, grade: 55 }, { raw: 1.40, grade: 65 }, { raw: 1.30, grade: 80 },
      ],
    },
    softball: {},
  },

  seven_yard_dash: {
    source: 'PG/PBR softball event timing — softball acceleration test',
    as_of: null,
    // Source: PG/PBR softball event timing — softball acceleration test
    baseball: {},
    softball: {
      '14u': [
        { raw: 1.85, grade: 20 }, { raw: 1.70, grade: 30 }, { raw: 1.55, grade: 45 },
        { raw: 1.45, grade: 55 }, { raw: 1.38, grade: 65 }, { raw: 1.28, grade: 80 },
      ],
      '18u': [
        { raw: 1.70, grade: 20 }, { raw: 1.55, grade: 30 }, { raw: 1.42, grade: 45 },
        { raw: 1.34, grade: 55 }, { raw: 1.28, grade: 65 }, { raw: 1.18, grade: 80 },
      ],
      college: [
        { raw: 1.60, grade: 20 }, { raw: 1.48, grade: 30 }, { raw: 1.36, grade: 45 },
        { raw: 1.28, grade: 55 }, { raw: 1.22, grade: 65 }, { raw: 1.13, grade: 80 },
      ],
      pro: [
        { raw: 1.55, grade: 20 }, { raw: 1.43, grade: 30 }, { raw: 1.32, grade: 45 },
        { raw: 1.24, grade: 55 }, { raw: 1.18, grade: 65 }, { raw: 1.10, grade: 80 },
      ],
    },
  },

  thirty_yard_dash: {
    source: 'estimate',
    as_of: null,
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
        { raw: 4.5, grade: 20 }, { raw: 4.2, grade: 30 }, { raw: 3.85, grade: 45 },
        { raw: 3.65, grade: 55 }, { raw: 3.5, grade: 65 }, { raw: 3.3, grade: 80 },
      ],
      pro: [
        { raw: 4.3, grade: 20 }, { raw: 4.0, grade: 30 }, { raw: 3.75, grade: 45 },
        { raw: 3.55, grade: 55 }, { raw: 3.45, grade: 65 }, { raw: 3.20, grade: 80 },
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
    source: 'MLB Combine avg 2019-2023 — baseball only',
    as_of: '2023-12-31',
    // Source: MLB Combine avg 2019-2023 — baseball only
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
        { raw: 7.8, grade: 20 }, { raw: 7.3, grade: 30 }, { raw: 6.85, grade: 45 },
        { raw: 6.55, grade: 55 }, { raw: 6.35, grade: 65 }, { raw: 6.10, grade: 80 },
      ],
      pro: [
        { raw: 7.5, grade: 20 }, { raw: 7.1, grade: 30 }, { raw: 6.65, grade: 45 },
        { raw: 6.4, grade: 55 }, { raw: 6.3, grade: 65 }, { raw: 6.0, grade: 80 },
      ],
    },
    softball: {},
  },

  forty_yard_dash: {
    source: 'PG/PBR softball event timing — softball top-end speed test',
    as_of: null,
    // Source: PG/PBR softball event timing — softball top-end speed test
    baseball: {},
    softball: {
      '14u': [
        { raw: 6.8, grade: 20 }, { raw: 6.3, grade: 30 }, { raw: 5.85, grade: 45 },
        { raw: 5.55, grade: 55 }, { raw: 5.30, grade: 65 }, { raw: 4.95, grade: 80 },
      ],
      '18u': [
        { raw: 6.3, grade: 20 }, { raw: 5.85, grade: 30 }, { raw: 5.45, grade: 45 },
        { raw: 5.18, grade: 55 }, { raw: 4.95, grade: 65 }, { raw: 4.65, grade: 80 },
      ],
      college: [
        { raw: 5.95, grade: 20 }, { raw: 5.55, grade: 30 }, { raw: 5.20, grade: 45 },
        { raw: 4.95, grade: 55 }, { raw: 4.78, grade: 65 }, { raw: 4.50, grade: 80 },
      ],
      pro: [
        { raw: 5.75, grade: 20 }, { raw: 5.40, grade: 30 }, { raw: 5.05, grade: 45 },
        { raw: 4.85, grade: 55 }, { raw: 4.65, grade: 65 }, { raw: 4.40, grade: 80 },
      ],
    },
  },

  ten_thirty_split: {
    source: 'estimate',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'NFL/MLB Combine cross-reference, PG data',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'NSCA normative tables, PG data',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'NSCA, PG event data',
    as_of: null,
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
    source: 'NSCA normative tables',
    as_of: null,
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
    source: 'NSCA normative tables',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
    // Source: Estimate from rotational power research
    baseball: {
      '14u': [
        { raw: 14, grade: 20 }, { raw: 19, grade: 30 }, { raw: 25, grade: 45 },
        { raw: 29, grade: 55 }, { raw: 33, grade: 65 }, { raw: 40, grade: 80 },
      ],
      '18u': [
        { raw: 18, grade: 20 }, { raw: 24, grade: 30 }, { raw: 31, grade: 45 },
        { raw: 35, grade: 55 }, { raw: 39, grade: 65 }, { raw: 46, grade: 80 },
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
    source: 'estimate',
    as_of: null,
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
    source: 'MLB Combine, Driveline data, PG events',
    as_of: null,
    // UNSOURCED — needs a TEE-SPECIFIC figure (Driveline / Perfect Game).
    // Deliberately NOT re-anchored to the MLB ~88.5-89 mph average: that is an
    // IN-GAME exit velocity. Tee EV runs higher, so borrowing the game number
    // would make this scale too easy. Left untouched until a tee source exists.

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
    source: 'estimate',
    as_of: null,
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
    source: 'Statcast bat tracking, league-wide (MLB avg 71.5 mph, elite 78-80+)',
    as_of: '2026-01-01',
    // Source: Statcast bat tracking (ESPN/MLB league-wide). Confirmed 2026-09:
    // the pro average anchor of 71 already matches the published 71.5 mph
    // league average, so the numbers were NOT moved — only sourced and dated.

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
    source: 'Driveline, MLB Combine avg',
    as_of: null,
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
    source: 'Driveline, PG event data',
    as_of: null,
    // Source: Driveline, PG event data
    baseball: {
      '14u': [
        { raw: 80, grade: 20 }, { raw: 110, grade: 30 }, { raw: 150, grade: 45 },
        { raw: 175, grade: 55 }, { raw: 200, grade: 65 }, { raw: 250, grade: 80 },
      ],
      '18u': [
        { raw: 120, grade: 20 }, { raw: 160, grade: 30 }, { raw: 210, grade: 45 },
        { raw: 240, grade: 55 }, { raw: 270, grade: 65 }, { raw: 320, grade: 80 },
      ],
      college: [
        { raw: 150, grade: 20 }, { raw: 190, grade: 30 }, { raw: 250, grade: 45 },
        { raw: 290, grade: 55 }, { raw: 330, grade: 65 }, { raw: 380, grade: 80 },
      ],
      pro: [
        { raw: 170, grade: 20 }, { raw: 220, grade: 30 }, { raw: 280, grade: 45 },
        { raw: 320, grade: 55 }, { raw: 360, grade: 65 }, { raw: 420, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 60, grade: 20 }, { raw: 85, grade: 30 }, { raw: 115, grade: 45 },
        { raw: 135, grade: 55 }, { raw: 155, grade: 65 }, { raw: 190, grade: 80 },
      ],
      '18u': [
        { raw: 90, grade: 20 }, { raw: 120, grade: 30 }, { raw: 160, grade: 45 },
        { raw: 185, grade: 55 }, { raw: 215, grade: 65 }, { raw: 260, grade: 80 },
      ],
      college: [
        { raw: 110, grade: 20 }, { raw: 145, grade: 30 }, { raw: 190, grade: 45 },
        { raw: 220, grade: 55 }, { raw: 250, grade: 65 }, { raw: 290, grade: 80 },
      ],
      pro: [
        { raw: 125, grade: 20 }, { raw: 165, grade: 30 }, { raw: 210, grade: 45 },
        { raw: 240, grade: 55 }, { raw: 270, grade: 65 }, { raw: 310, grade: 80 },
      ],
    },
  },

  pitching_velocity: {
    source: 'MLB Combine avg 2019-2023, PG/PBR event data',
    as_of: '2023-12-31',
    // Source: MLB Combine avg 2019-2023, PG/PBR event data
    // PRO BAND RE-ANCHORED 2026-09-08 to `scale_reference.fastball_velocity`
    // (floor 84 / avg 94.7 / record 104.2, Statcast-reported four-seam
    // distribution). Grade 45 is set at 94.5 per owner direction ("94.7 today,
    // anchor 94.5+"); grades 30/55/65 are linear interpolations between the
    // three sourced anchors so the curve has no kink. Non-pro bands unchanged —
    // no source available to move them.

    baseball: {
      '14u': [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 65, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 75, grade: 65 }, { raw: 82, grade: 80 },
      ],
      '18u': [
        { raw: 62, grade: 20 }, { raw: 70, grade: 30 }, { raw: 80, grade: 45 },
        { raw: 84, grade: 55 }, { raw: 88, grade: 65 }, { raw: 94, grade: 80 },
      ],
      college: [
        { raw: 70, grade: 20 }, { raw: 77, grade: 30 }, { raw: 87, grade: 45 },
        { raw: 92, grade: 55 }, { raw: 96, grade: 65 }, { raw: 101, grade: 80 },
      ],
      pro: [
        { raw: 84, grade: 20 }, { raw: 88.2, grade: 30 }, { raw: 94.5, grade: 45 },
        { raw: 97.3, grade: 55 }, { raw: 100.1, grade: 65 }, { raw: 104.2, grade: 80 },

      ],
    },
    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 40, grade: 30 }, { raw: 47, grade: 45 },
        { raw: 51, grade: 55 }, { raw: 55, grade: 65 }, { raw: 62, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 48, grade: 30 }, { raw: 56, grade: 45 },
        { raw: 60, grade: 55 }, { raw: 65, grade: 65 }, { raw: 72, grade: 80 },
      ],
      college: [
        { raw: 48, grade: 20 }, { raw: 54, grade: 30 }, { raw: 63, grade: 45 },
        { raw: 67, grade: 55 }, { raw: 71, grade: 65 }, { raw: 76, grade: 80 },
      ],
      pro: [
        { raw: 52, grade: 20 }, { raw: 58, grade: 30 }, { raw: 66, grade: 45 },
        { raw: 70, grade: 55 }, { raw: 73, grade: 65 }, { raw: 78, grade: 80 },
      ],
    },
  },

  position_throw_velo: {
    source: 'PG/PBR published position player velo data',
    as_of: null,
    // Source: PG/PBR published position player velo data.
    // PRO BAND: owned by scale_reference `throw_velo_mph_infield` (dated,
    // position-specific). Youth bands stay age-appropriate here.
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
        { raw: 62, grade: 20 }, { raw: 70, grade: 30 }, { raw: 81, grade: 45 },
        { raw: 87, grade: 55 }, { raw: 92, grade: 65 }, { raw: 99, grade: 80 },
      ],
      pro: scaleDerivedPoints('throw_velo_mph_infield'),
    },

    softball: {
      '14u': [
        { raw: 35, grade: 20 }, { raw: 42, grade: 30 }, { raw: 50, grade: 45 },
        { raw: 55, grade: 55 }, { raw: 60, grade: 65 }, { raw: 68, grade: 80 },
      ],
      '18u': [
        { raw: 42, grade: 20 }, { raw: 50, grade: 30 }, { raw: 60, grade: 45 },
        { raw: 65, grade: 55 }, { raw: 71, grade: 65 }, { raw: 80, grade: 80 },
      ],
      college: [
        { raw: 48, grade: 20 }, { raw: 55, grade: 30 }, { raw: 66, grade: 45 },
        { raw: 71, grade: 55 }, { raw: 77, grade: 65 }, { raw: 85, grade: 80 },
      ],
      pro: [
        { raw: 52, grade: 20 }, { raw: 60, grade: 30 }, { raw: 70, grade: 45 },
        { raw: 75, grade: 55 }, { raw: 80, grade: 65 }, { raw: 88, grade: 80 },
      ],
    },
  },

  pulldown_velocity: {
    source: 'Driveline published pulldown data',
    as_of: null,
    // Source: Driveline published pulldown data
    baseball: {
      '18u': [
        { raw: 65, grade: 20 }, { raw: 73, grade: 30 }, { raw: 84, grade: 45 },
        { raw: 90, grade: 55 }, { raw: 95, grade: 65 }, { raw: 103, grade: 80 },
      ],
      pro: [
        { raw: 78, grade: 20 }, { raw: 86, grade: 30 }, { raw: 95, grade: 45 },
        { raw: 100, grade: 55 }, { raw: 104, grade: 65 }, { raw: 111, grade: 80 },
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
    source: 'estimate',
    as_of: null,
    // Source: MLB advanced fielding stats, Estimate
    baseball: {
      '18u': [
        { raw: 2.2, grade: 20 }, { raw: 1.8, grade: 30 }, { raw: 1.4, grade: 45 },
        { raw: 1.2, grade: 55 }, { raw: 1.05, grade: 65 }, { raw: 0.85, grade: 80 },
      ],
      // PRO BAND: owned by scale_reference `exchange_time_sec` (documented,
      // dated). The estimate that used to sit here no longer grades anyone.
      pro: scaleDerivedPoints('exchange_time_sec'),

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
    source: 'Baseball Savant pop time leaderboard (MLB avg 2.00s to 2B)',
    as_of: '2026-01-01',
    // Source: Baseball Savant pop time leaderboard, 2026. Published MLB range
    // 1.6-2.5s; league average 2.00, elite ~1.85, poor ~2.14.
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
      // Savant anchors: 2.50 floor, 2.14 poor, 2.00 league average,
      // 1.85 elite, 1.60 leaderboard best.
      pro: [
        { raw: 2.5, grade: 20 }, { raw: 2.14, grade: 30 }, { raw: 2.0, grade: 45 },
        { raw: 1.93, grade: 55 }, { raw: 1.85, grade: 65 }, { raw: 1.6, grade: 80 },
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
    source: 'estimate',
    as_of: null,
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
    source: 'Research - balance norms for athletes',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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
    source: 'NSCA normative tables',
    as_of: null,
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
    source: 'estimate',
    as_of: null,
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

  // ── FASCIAL ELASTICITY ─────────────────────────────────
  sl_3x_bound: {
    source: 'NSCA bound norms + sport-specific elastic output research',
    as_of: null,
    // Source: NSCA bound norms + sport-specific elastic output research.
    // Total distance for three consecutive single-leg bounds (per leg).
    baseball: {
      '14u': [
        { raw: 14, grade: 20 }, { raw: 18, grade: 30 }, { raw: 23, grade: 45 },
        { raw: 27, grade: 55 }, { raw: 31, grade: 65 }, { raw: 37, grade: 80 },
      ],
      '18u': [
        { raw: 18, grade: 20 }, { raw: 23, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 32, grade: 55 }, { raw: 36, grade: 65 }, { raw: 42, grade: 80 },
      ],
      college: [
        { raw: 21, grade: 20 }, { raw: 26, grade: 30 }, { raw: 31, grade: 45 },
        { raw: 35, grade: 55 }, { raw: 39, grade: 65 }, { raw: 45, grade: 80 },
      ],
      pro: [
        { raw: 23, grade: 20 }, { raw: 28, grade: 30 }, { raw: 33, grade: 45 },
        { raw: 37, grade: 55 }, { raw: 41, grade: 65 }, { raw: 47, grade: 80 },
      ],
    },
    softball: {
      '14u': [
        { raw: 12, grade: 20 }, { raw: 16, grade: 30 }, { raw: 20, grade: 45 },
        { raw: 24, grade: 55 }, { raw: 28, grade: 65 }, { raw: 33, grade: 80 },
      ],
      '18u': [
        { raw: 16, grade: 20 }, { raw: 20, grade: 30 }, { raw: 25, grade: 45 },
        { raw: 29, grade: 55 }, { raw: 33, grade: 65 }, { raw: 38, grade: 80 },
      ],
      college: [
        { raw: 19, grade: 20 }, { raw: 23, grade: 30 }, { raw: 28, grade: 45 },
        { raw: 32, grade: 55 }, { raw: 36, grade: 65 }, { raw: 41, grade: 80 },
      ],
      pro: [
        { raw: 21, grade: 20 }, { raw: 25, grade: 30 }, { raw: 30, grade: 45 },
        { raw: 34, grade: 55 }, { raw: 38, grade: 65 }, { raw: 43, grade: 80 },
      ],
    },
  },

  shoulder_rom_internal: {
    source: 'Research - GIRD norms, throwing athlete ROM studies',
    as_of: null,
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
    source: 'Research - throwing athlete ROM studies',
    as_of: null,
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
    source: 'Research - hip mobility norms for rotational athletes',
    as_of: null,
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
    source: 'Research - knee-to-wall test norms',
    as_of: null,
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
  // Health & Recovery categories removed — accounted for elsewhere in system.
};


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
    Object.keys(entry.softball ?? {}).length > 0 && !SOFTBALL_GRADED_METRICS.has(key))
  .map(([key]) => key);
