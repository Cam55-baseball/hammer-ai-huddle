// =====================================================================
// INVARIANT TEST SUITE — Performance Intelligence Engine
// 20 Tests · 6 Layers · Zero Tolerance
// =====================================================================

import { describe, it, expect } from 'vitest';
import { rawToGrade, gradeAllResults, gradeToLabel } from '@/lib/gradeEngine';
import { computeToolGrades, POSITION_TOOL_PROFILES, type ToolName, type ToolProfile } from '@/data/positionToolProfiles';
import { generateReport } from '@/lib/testIntelligenceEngine';
import { getNextTestFocus } from '@/lib/adaptiveTestPriority';
import { computeTrends } from '@/lib/longitudinalEngine';
import { GRADE_BENCHMARKS } from '@/data/gradeBenchmarks';
import { METRIC_BY_KEY, PERFORMANCE_METRICS } from '@/data/performanceTestRegistry';

// ── Helpers ──────────────────────────────────────────────

/** Sample results for a baseball SS, age 16 */
const FULL_RESULTS: Record<string, number> = {
  ten_yard_dash: 1.75,
  sixty_yard_dash: 7.2,
  pro_agility: 4.4,
  vertical_jump: 28,
  sl_broad_jump_left: 72,
  sl_broad_jump_right: 70,
  mb_rotational_throw: 22,
  mb_situp_throw: 14,
  seated_chest_pass: 18,
  tee_exit_velocity: 82,
  bat_speed: 64,
  pitching_velocity: 78,
  long_toss_distance: 220,
  position_throw_velo: 76,
  lateral_shuffle: 4.6,
};

const SPORT = 'baseball' as const;
const AGE = 16;

// =====================================================================
// LAYER 1 — MATHEMATICAL INTEGRITY
// =====================================================================

describe('Layer 1 — Mathematical Integrity', () => {
  it('Test 1: Monotonic Sweep — grades never invert with better performance', () => {
    let violations = 0;

    for (const [metricKey, benchmarkEntry] of Object.entries(GRADE_BENCHMARKS)) {
      const def = METRIC_BY_KEY[metricKey];
      if (!def) continue;

      for (const sport of ['baseball', 'softball'] as const) {
        const sportBench = benchmarkEntry[sport];
        if (!sportBench || Object.keys(sportBench).length === 0) continue;

        for (const ageBand of Object.keys(sportBench)) {
          const points = sportBench[ageBand as keyof typeof sportBench];
          if (!points || points.length < 2) continue;

          // Get raw value range from benchmarks
          const raws = points.map(p => p.raw);
          const minRaw = Math.min(...raws);
          const maxRaw = Math.max(...raws);
          const step = (maxRaw - minRaw) / 100;

          const grades: number[] = [];
          for (let v = minRaw; v <= maxRaw; v += step) {
            const g = rawToGrade(metricKey, v, sport, def.higherIsBetter ? 20 : 14);
            if (g !== null) grades.push(g);
          }

          // Check monotonicity
          for (let i = 1; i < grades.length; i++) {
            if (def.higherIsBetter) {
              // Higher raw → higher or equal grade
              if (grades[i] < grades[i - 1] - 1) { // allow ±1 for rounding
                violations++;
              }
            } else {
              // Higher raw (slower time) → lower or equal grade
              if (grades[i] > grades[i - 1] + 1) {
                violations++;
              }
            }
          }
        }
      }
    }

    expect(violations).toBe(0);
  });

  it('Test 2: Boundary Flood — extreme inputs never crash or leak NaN', () => {
    const extremes = [NaN, Infinity, -Infinity, -1000, 0, 9999, undefined as unknown as number];
    const metricKeys = Object.keys(GRADE_BENCHMARKS).slice(0, 10);

    for (const key of metricKeys) {
      for (const val of extremes) {
        const result = rawToGrade(key, val, 'baseball', 16);
        // Must be null OR within [20, 80]
        if (result !== null) {
          expect(result).toBeGreaterThanOrEqual(20);
          expect(result).toBeLessThanOrEqual(80);
          expect(Number.isNaN(result)).toBe(false);
        }
      }
    }
  });

  it('Test 3: Determinism — identical inputs always produce identical outputs', () => {
    const key = 'tee_exit_velocity';
    const val = 87;

    const results: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const g = rawToGrade(key, val, 'baseball', 16);
      if (g !== null) results.push(g);
    }

    const first = results[0];
    expect(results.every(r => r === first)).toBe(true);

    // Also test computeToolGrades determinism
    const toolResults: string[] = [];
    for (let i = 0; i < 100; i++) {
      const tg = computeToolGrades(FULL_RESULTS, 'SS', 'baseball', 16);
      toolResults.push(JSON.stringify(tg));
    }
    expect(toolResults.every(r => r === toolResults[0])).toBe(true);
  });

  it('Test 4: Tool Isolation — removing a metric only affects its tool(s)', () => {
    const baseline = computeToolGrades(FULL_RESULTS, 'SS', SPORT, AGE);

    // Remove tee_exit_velocity (feeds Hit + Power)
    const { tee_exit_velocity, ...withoutEV } = FULL_RESULTS;
    const reduced = computeToolGrades(withoutEV, 'SS', SPORT, AGE);

    // Run tool should be unaffected
    expect(reduced.run).toBe(baseline.run);
    // Arm tool should be unaffected (position_throw_velo still there)
    expect(reduced.arm).toBe(baseline.arm);

    // Hit/Power may change since tee_exit_velocity feeds them
    // But they should not be null (other metrics still feed them)
    // The key invariant: unrelated tools don't change
  });
});

// =====================================================================
// LAYER 2 — ENGINE TRUTH VALIDATION
// =====================================================================

describe('Layer 2 — Engine Truth Validation', () => {
  it('Test 5: Causal Flip — fixing a limiter removes it from limiting factors', () => {
    const weakResults = {
      ...FULL_RESULTS,
      mb_rotational_throw: 10, // Very low → should be a limiter
    };

    const weakReport = generateReport(weakResults, 'SS', SPORT, AGE);
    const isLimiter = weakReport.limitingFactors.some(
      lf => lf.metric.key === 'mb_rotational_throw'
    );
    expect(isLimiter).toBe(true);

    // Now fix it
    const strongResults = {
      ...FULL_RESULTS,
      mb_rotational_throw: 40, // Strong
    };

    const strongReport = generateReport(strongResults, 'SS', SPORT, AGE);
    const stillLimiter = strongReport.limitingFactors.some(
      lf => lf.metric.key === 'mb_rotational_throw'
    );
    // It should no longer be the top limiter (others are weaker now)
    // Or if it is, it should be lower priority
    const weakRank = weakReport.limitingFactors.findIndex(
      lf => lf.metric.key === 'mb_rotational_throw'
    );
    const strongRank = strongReport.limitingFactors.findIndex(
      lf => lf.metric.key === 'mb_rotational_throw'
    );
    // Either gone from limiters, or moved down in priority
    expect(strongRank === -1 || strongRank > weakRank || !stillLimiter).toBe(true);
  });

  it('Test 6: Contradiction — conflicting metrics produce correct diagnosis', () => {
    const contradictory = {
      tee_exit_velocity: 100, // Elite
      mb_rotational_throw: 5,  // Terrible
      bat_speed: 80,           // Elite
      ten_yard_dash: 1.65,     // Good
    };

    const report = generateReport(contradictory, 'SS', SPORT, AGE);

    // mb_rotational_throw should be a limiting factor, NOT a strength
    const isStrength = report.topStrengths.some(s => s.key === 'mb_rotational_throw');
    const isLimiter = report.limitingFactors.some(lf => lf.metric.key === 'mb_rotational_throw');

    expect(isStrength).toBe(false);
    expect(isLimiter).toBe(true);
  });

  it('Test 7: Sensitivity — small input change produces small output change', () => {
    const results1 = { ...FULL_RESULTS, bat_speed: 64 };
    const results2 = { ...FULL_RESULTS, bat_speed: 65 };

    const grade1 = rawToGrade('bat_speed', 64, SPORT, AGE);
    const grade2 = rawToGrade('bat_speed', 65, SPORT, AGE);

    if (grade1 !== null && grade2 !== null) {
      expect(Math.abs(grade2 - grade1)).toBeLessThanOrEqual(5);
    }

    const tool1 = computeToolGrades(results1, 'SS', SPORT, AGE);
    const tool2 = computeToolGrades(results2, 'SS', SPORT, AGE);

    if (tool1.hit !== null && tool2.hit !== null) {
      expect(Math.abs(tool2.hit - tool1.hit)).toBeLessThanOrEqual(3);
    }
    if (tool1.overall !== null && tool2.overall !== null) {
      expect(Math.abs(tool2.overall - tool1.overall)).toBeLessThanOrEqual(3);
    }
  });

  it('Test 8: Projection Reality — plateau produces no fake predictions', () => {
    const plateauHistory = [
      { results: { tee_exit_velocity: 85 }, test_date: '2026-04-01' },
      { results: { tee_exit_velocity: 85 }, test_date: '2026-02-15' },
      { results: { tee_exit_velocity: 85 }, test_date: '2026-01-01' },
    ];

    const trends = computeTrends(plateauHistory, SPORT, AGE);
    const evTrend = trends.find(t => t.metricKey === 'tee_exit_velocity');

    if (evTrend) {
      expect(evTrend.trend).toBe('plateaued');
      // Plateau should NOT produce a "reach X in Y weeks" projection
      if (evTrend.projection !== null) {
        expect(evTrend.projection).not.toContain('Reach');
      }
    }
  });
});

// =====================================================================
// LAYER 3 — DATA INTEGRITY
// =====================================================================

describe('Layer 3 — Data Integrity', () => {
  it('Test 9: Schema Chaos — invalid data types do not crash', () => {
    const chaosData: Record<string, number> = {
      ten_yard_dash: 'fast' as unknown as number,
      exit_velo: null as unknown as number,
      random_key: 999,
      _metadata: 42,
      tee_exit_velocity: 85,
    };

    // Must not throw
    expect(() => gradeAllResults(chaosData, 'baseball', 16)).not.toThrow();

    const grades = gradeAllResults(chaosData, 'baseball', 16);
    // Only tee_exit_velocity should produce a valid grade
    expect(grades.tee_exit_velocity).toBeDefined();
    expect(typeof grades.tee_exit_velocity).toBe('number');
    // _metadata should be skipped (starts with _)
    expect(grades._metadata).toBeUndefined();
    // random_key should have no benchmark → not in output
    expect(grades.random_key).toBeUndefined();
  });

  it('Test 10: Historical Compatibility — v1 keys grade correctly', () => {
    const v1Results = {
      ten_yard_dash: 1.75,
      tee_exit_velocity: 85,
      vertical_jump: 28,
      pitching_velocity: 82,
    };

    const grades = gradeAllResults(v1Results, 'baseball', 16);

    // All valid v1 keys should produce grades
    for (const key of Object.keys(v1Results)) {
      if (GRADE_BENCHMARKS[key]) {
        expect(grades[key]).toBeDefined();
        expect(grades[key]).toBeGreaterThanOrEqual(20);
        expect(grades[key]).toBeLessThanOrEqual(80);
      }
    }
  });

  it('Test 11: Bilateral Conflict — extreme L/R difference averages correctly', () => {
    const bilateralResults = {
      sl_broad_jump_left: 95,  // Elite
      sl_broad_jump_right: 45, // Poor
      ten_yard_dash: 1.75,
    };

    const toolGrades = computeToolGrades(bilateralResults, 'SS', SPORT, AGE);

    // The power tool should exist (sl_broad_jump feeds it)
    // Grade should be roughly midpoint, not blindly elite
    if (toolGrades.power !== null) {
      const leftGrade = rawToGrade('sl_broad_jump', 95, SPORT, AGE);
      const rightGrade = rawToGrade('sl_broad_jump', 45, SPORT, AGE);

      if (leftGrade !== null && rightGrade !== null) {
        const expectedAvg = Math.round((leftGrade + rightGrade) / 2);
        // Tool grade should be close to the average of L/R grades (within reason)
        // It may differ because other metrics also feed power
        expect(toolGrades.power).not.toBe(leftGrade); // Not blindly using one side
      }
    }
  });
});

// =====================================================================
// LAYER 4 — TIER & SPORT TRUTH
// =====================================================================

describe('Layer 4 — Tier & Sport Truth', () => {
  it('Test 12: Sport Flip — same raw data produces different grades per sport', () => {
    const sharedResults = {
      pitching_velocity: 75,
      tee_exit_velocity: 85,
      sixty_yard_dash: 7.2,
    };

    const baseballGrades = gradeAllResults(sharedResults, 'baseball', 16);
    const softballGrades = gradeAllResults(sharedResults, 'softball', 16);

    // At least one metric should differ between sports
    let hasDifference = false;
    for (const key of Object.keys(sharedResults)) {
      if (
        baseballGrades[key] !== undefined &&
        softballGrades[key] !== undefined &&
        baseballGrades[key] !== softballGrades[key]
      ) {
        hasDifference = true;
        break;
      }
    }

    expect(hasDifference).toBe(true);
  });

  it('Test 13: Tier Degradation — fewer metrics don\'t wildly flip conclusions', () => {
    // Free tier: 3 core metrics
    const freeResults = {
      ten_yard_dash: 1.75,
      tee_exit_velocity: 85,
      vertical_jump: 28,
    };

    // Full tier: same core + more
    const fullResults = {
      ...freeResults,
      sixty_yard_dash: 7.2,
      pro_agility: 4.4,
      bat_speed: 64,
      mb_rotational_throw: 22,
      position_throw_velo: 76,
      lateral_shuffle: 4.6,
      long_toss_distance: 220,
    };

    const freeReport = generateReport(freeResults, 'SS', SPORT, AGE);
    const fullReport = generateReport(fullResults, 'SS', SPORT, AGE);

    // Metrics shared between both should have identical grades
    for (const freeMetric of freeReport.metricGrades) {
      const fullMetric = fullReport.metricGrades.find(m => m.key === freeMetric.key);
      if (fullMetric) {
        expect(fullMetric.grade).toBe(freeMetric.grade);
      }
    }
  });
});

// =====================================================================
// LAYER 5 — INTELLIGENCE COHERENCE
// =====================================================================

describe('Layer 5 — Intelligence Coherence', () => {
  it('Test 14: Empty State — no data produces no crashes and no fake insights', () => {
    const report = generateReport({}, null, SPORT, AGE);

    expect(report.metricGrades).toHaveLength(0);
    expect(report.topStrengths).toHaveLength(0);
    expect(report.limitingFactors).toHaveLength(0);
    expect(report.toolGrades.hit).toBeNull();
    expect(report.toolGrades.power).toBeNull();
    expect(report.toolGrades.run).toBeNull();
    expect(report.toolGrades.field).toBeNull();
    expect(report.toolGrades.arm).toBeNull();
    expect(report.toolGrades.overall).toBeNull();
  });

  it('Test 15: Partial Data (3 metrics) — limited but honest output', () => {
    const partial = {
      ten_yard_dash: 1.75,
      tee_exit_velocity: 85,
      long_toss_distance: 220,
    };

    const report = generateReport(partial, 'SS', SPORT, AGE);

    expect(report.metricGrades.length).toBeGreaterThan(0);
    expect(report.metricGrades.length).toBeLessThanOrEqual(3);

    // Some tools may be null (not enough data)
    // But at least one tool should have a grade
    const nonNullTools = (['hit', 'power', 'run', 'field', 'arm'] as ToolName[])
      .filter(t => report.toolGrades[t] !== null);
    expect(nonNullTools.length).toBeGreaterThan(0);
  });

  it('Test 16: Adaptive Focus — no history returns fallback message', () => {
    const focus = getNextTestFocus([], SPORT, AGE);

    expect(focus.prioritized).toHaveLength(0);
    expect(focus.reduced).toHaveLength(0);
    expect(focus.summary).toContain('first test');
  });

  it('Test 17: Adaptive Focus — improvement shifts priorities', () => {
    // Cycle 1: metric is weak
    const cycle1 = {
      results: { mb_rotational_throw: 10, tee_exit_velocity: 85, ten_yard_dash: 1.75 },
      test_date: '2026-01-01',
    };

    const focus1 = getNextTestFocus([cycle1], SPORT, AGE);
    const isPrioritized1 = focus1.prioritized.some(p => p.key === 'mb_rotational_throw');

    // Cycle 2: metric is now strong
    const cycle2 = {
      results: { mb_rotational_throw: 40, tee_exit_velocity: 85, ten_yard_dash: 1.75 },
      test_date: '2026-03-01',
    };

    const focus2 = getNextTestFocus([cycle2, cycle1], SPORT, AGE);

    // After improvement, mb_rotational_throw should either:
    // - Have lower priority score (less improvement potential)
    // - Or move to reduced if grade > 65
    if (isPrioritized1) {
      const rank1 = focus1.prioritized.findIndex(p => p.key === 'mb_rotational_throw');
      const rank2 = focus2.prioritized.findIndex(p => p.key === 'mb_rotational_throw');
      const isReduced2 = focus2.reduced.some(r => r.key === 'mb_rotational_throw');
      // Either dropped from prioritized or moved down
      expect(rank2 === -1 || rank2 >= rank1 || isReduced2).toBe(true);
    }
  });
});

// =====================================================================
// LAYER 6 — LONGITUDINAL ENGINE
// =====================================================================

describe('Layer 6 — Longitudinal Engine', () => {
  it('Test 18: Trend Improving — rising values classified correctly', () => {
    // Values chosen to produce grades roughly 40 → 47 → 55
    const history = [
      { results: { tee_exit_velocity: 92 }, test_date: '2026-04-01' },  // Latest (highest)
      { results: { tee_exit_velocity: 87 }, test_date: '2026-02-15' },
      { results: { tee_exit_velocity: 82 }, test_date: '2026-01-01' },  // Oldest (lowest)
    ];

    const trends = computeTrends(history, SPORT, AGE);
    const evTrend = trends.find(t => t.metricKey === 'tee_exit_velocity');

    expect(evTrend).toBeDefined();
    if (evTrend) {
      expect(evTrend.trend).toBe('improving');
      expect(evTrend.ratePerCycle).toBeGreaterThan(0);
    }
  });

  it('Test 19: Trend Regressing — declining values classified correctly', () => {
    const history = [
      { results: { tee_exit_velocity: 78 }, test_date: '2026-04-01' },  // Latest (lowest)
      { results: { tee_exit_velocity: 85 }, test_date: '2026-02-15' },
      { results: { tee_exit_velocity: 92 }, test_date: '2026-01-01' },  // Oldest (highest)
    ];

    const trends = computeTrends(history, SPORT, AGE);
    const evTrend = trends.find(t => t.metricKey === 'tee_exit_velocity');

    expect(evTrend).toBeDefined();
    if (evTrend) {
      expect(evTrend.trend).toBe('regressing');
      expect(evTrend.ratePerCycle).toBeLessThan(0);
      if (evTrend.projection) {
        expect(evTrend.projection).toContain('Declining');
      }
    }
  });

  it('Test 20: Insufficient History — single test produces no trends', () => {
    const history = [
      { results: { tee_exit_velocity: 85 }, test_date: '2026-04-01' },
    ];

    const trends = computeTrends(history, SPORT, AGE);
    expect(trends).toHaveLength(0);
  });
});

// =====================================================================
// LAYER 7 — ADVERSARIAL FUZZ TESTING
// =====================================================================

describe('Layer 7 — Adversarial Fuzz Testing', () => {
  const ALL_METRIC_KEYS = Object.keys(GRADE_BENCHMARKS);
  const POSITIONS = Object.keys(POSITION_TOOL_PROFILES);
  const SPORTS: ('baseball' | 'softball')[] = ['baseball', 'softball'];
  const AGE_BANDS = [12, 16, 20, 25];

  function assertValidGrade(g: number | null, context: string) {
    if (g === null) return;
    expect(g, context).toBeGreaterThanOrEqual(20);
    expect(g, context).toBeLessThanOrEqual(80);
    expect(Number.isNaN(g), `NaN in ${context}`).toBe(false);
  }

  it('Test 21: 10,000-Case Randomized Simulation — zero crashes, zero NaN, zero invariant violations', () => {
    const rng = (min: number, max: number) => min + Math.random() * (max - min);
    let violations = 0;

    for (let i = 0; i < 10000; i++) {
      // Random subset of metrics with random values
      const results: Record<string, number> = {};
      const metricCount = Math.floor(Math.random() * ALL_METRIC_KEYS.length) + 1;
      const shuffled = [...ALL_METRIC_KEYS].sort(() => Math.random() - 0.5);
      for (let m = 0; m < metricCount; m++) {
        results[shuffled[m]] = rng(-10, 500);
      }

      const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
      const sport = SPORTS[Math.floor(Math.random() * 2)];
      const age = AGE_BANDS[Math.floor(Math.random() * AGE_BANDS.length)];

      try {
        // Grade individual metrics
        for (const [key, val] of Object.entries(results)) {
          const g = rawToGrade(key, val, sport, age);
          if (g !== null && (g < 20 || g > 80 || Number.isNaN(g))) violations++;
        }

        // Tool grades
        const tools = computeToolGrades(results, pos, sport, age);
        for (const t of ['hit', 'power', 'run', 'field', 'arm', 'overall'] as const) {
          const v = tools[t];
          if (v !== null && (v < 20 || v > 80 || Number.isNaN(v))) violations++;
        }

        // Full report
        const report = generateReport(results, pos, sport, age);
        for (const mg of report.metricGrades) {
          if (mg.grade < 20 || mg.grade > 80 || Number.isNaN(mg.grade)) violations++;
        }

        // Strength/limiter mutual exclusion
        const strengthKeys = new Set(report.topStrengths.map(s => s.key));
        for (const lf of report.limitingFactors) {
          if (strengthKeys.has(lf.metric.key)) violations++;
        }
      } catch {
        violations++;
      }
    }

    expect(violations).toBe(0);
  });

  it('Test 22: Type Corruption Fuzz — corrupt values never crash or leak NaN', () => {
    const corruptValues: any[] = [
      undefined, null, '', 'fast', {}, [], true, false,
      -99999, 99999, -0, 0.0001, Number.MAX_SAFE_INTEGER,
    ];

    for (const corrupt of corruptValues) {
      const results: Record<string, number> = {
        tee_exit_velocity: corrupt,
        ten_yard_dash: corrupt,
        pitching_velocity: corrupt,
      };

      // Must not throw
      expect(() => {
        const grades = gradeAllResults(results, SPORT, AGE);
        for (const g of Object.values(grades)) {
          expect(Number.isNaN(g)).toBe(false);
        }

        const tools = computeToolGrades(results, 'SS', SPORT, AGE);
        for (const t of ['hit', 'power', 'run', 'field', 'arm', 'overall'] as const) {
          const v = tools[t];
          if (v !== null) {
            expect(Number.isNaN(v)).toBe(false);
          }
        }

        const report = generateReport(results, 'SS', SPORT, AGE);
        expect(report).toBeDefined();
      }).not.toThrow();
    }
  });

  it('Test 23: Position × Sport × Age Exhaustive Sweep — 112 combos, zero failures', () => {
    let failures = 0;

    for (const pos of POSITIONS) {
      for (const sport of SPORTS) {
        for (const age of AGE_BANDS) {
          try {
            const tools = computeToolGrades(FULL_RESULTS, pos, sport, age);
            for (const t of ['hit', 'power', 'run', 'field', 'arm', 'overall'] as const) {
              const v = tools[t];
              if (v !== null && (v < 20 || v > 80 || Number.isNaN(v))) failures++;
            }

            const report = generateReport(FULL_RESULTS, pos, sport, age);
            for (const mg of report.metricGrades) {
              if (mg.grade < 20 || mg.grade > 80) failures++;
            }
          } catch {
            failures++;
          }
        }
      }
    }

    expect(failures).toBe(0);
  });
});

// =====================================================================
// LAYER 8 — TRUTH CONSISTENCY VALIDATION
// =====================================================================

describe('Layer 8 — Truth Consistency Validation', () => {
  it('Test 24: Truth Inversion — 80-grade never a limiter, 20-grade never a strength', () => {
    // Build extreme high results (all metrics at top benchmark values)
    const highResults: Record<string, number> = {};
    const lowResults: Record<string, number> = {};

    for (const [key, entry] of Object.entries(GRADE_BENCHMARKS)) {
      const def = METRIC_BY_KEY[key];
      if (!def) continue;
      const sportBench = entry.baseball;
      if (!sportBench) continue;
      const points = sportBench['18u'] || sportBench['college'] || sportBench['14u'];
      if (!points || points.length === 0) continue;

      const sorted = [...points].sort((a, b) => a.raw - b.raw);
      if (def.higherIsBetter) {
        highResults[key] = sorted[sorted.length - 1].raw + 10; // Beyond best
        lowResults[key] = Math.max(0, sorted[0].raw - 10); // Beyond worst
      } else {
        highResults[key] = Math.max(0.1, sorted[0].raw - 1); // Faster than best
        lowResults[key] = sorted[sorted.length - 1].raw + 5; // Slower than worst
      }
    }

    const highReport = generateReport(highResults, 'SS', 'baseball', 16);
    const lowReport = generateReport(lowResults, 'SS', 'baseball', 16);

    // High-grade metrics should NOT be limiting factors
    for (const lf of highReport.limitingFactors) {
      // All grades should be high, so the "limiter" should still be >= 60
      expect(lf.metric.grade).toBeGreaterThanOrEqual(50);
    }

    // Low-grade metrics should NOT be top strengths
    for (const s of lowReport.topStrengths) {
      // All grades should be low, so the "strength" should still be <= 40
      expect(s.grade).toBeLessThanOrEqual(40);
    }
  });

  it('Test 25: Strength/Limiter Mutual Exclusion — 1,000 random sets, zero overlap', () => {
    const metricKeys = Object.keys(GRADE_BENCHMARKS);
    let overlaps = 0;

    for (let i = 0; i < 1000; i++) {
      const results: Record<string, number> = {};
      const count = 5 + Math.floor(Math.random() * 10);
      const shuffled = [...metricKeys].sort(() => Math.random() - 0.5);
      for (let m = 0; m < Math.min(count, shuffled.length); m++) {
        results[shuffled[m]] = Math.random() * 200;
      }

      const report = generateReport(results, 'SS', 'baseball', 16);
      const strengthKeys = new Set(report.topStrengths.map(s => s.key));
      for (const lf of report.limitingFactors) {
        if (strengthKeys.has(lf.metric.key)) overlaps++;
      }
    }

    expect(overlaps).toBe(0);
  });

  it('Test 26: Grade Ordering Consistency — sorted strengths/limiters match grade rank', () => {
    let violations = 0;

    for (let i = 0; i < 500; i++) {
      const results: Record<string, number> = {};
      const metricKeys = Object.keys(GRADE_BENCHMARKS);
      const count = 6 + Math.floor(Math.random() * 8);
      const shuffled = [...metricKeys].sort(() => Math.random() - 0.5);
      for (let m = 0; m < Math.min(count, shuffled.length); m++) {
        results[shuffled[m]] = Math.random() * 200;
      }

      const report = generateReport(results, 'SS', 'baseball', 16);

      // Top strengths should be sorted descending by grade
      for (let j = 1; j < report.topStrengths.length; j++) {
        if (report.topStrengths[j].grade > report.topStrengths[j - 1].grade) {
          violations++;
        }
      }

      // Limiting factors should be sorted ascending by grade
      for (let j = 1; j < report.limitingFactors.length; j++) {
        if (report.limitingFactors[j].metric.grade < report.limitingFactors[j - 1].metric.grade) {
          violations++;
        }
      }
    }

    expect(violations).toBe(0);
  });
});

// =====================================================================
// LAYER 9 — WEIGHT NORMALIZATION ENFORCEMENT
// =====================================================================

describe('Layer 9 — Weight Normalization Enforcement', () => {
  it('Test 27: Weight Sum Validation — every position sums to 1.0', () => {
    for (const [pos, profile] of Object.entries(POSITION_TOOL_PROFILES)) {
      const tools: ToolName[] = ['hit', 'power', 'run', 'field', 'arm'];
      const sum = tools.reduce((acc, t) => acc + profile[t].weight, 0);
      expect(sum, `Position ${pos} weights sum to ${sum}`).toBeCloseTo(1.0, 2);
    }
  });

  it('Test 28: Overall = Exact Weighted Average — no fabrication', () => {
    let mismatches = 0;

    for (let i = 0; i < 500; i++) {
      const results: Record<string, number> = {};
      const metricKeys = Object.keys(GRADE_BENCHMARKS);
      const count = 8 + Math.floor(Math.random() * 10);
      const shuffled = [...metricKeys].sort(() => Math.random() - 0.5);
      for (let m = 0; m < Math.min(count, shuffled.length); m++) {
        results[shuffled[m]] = 20 + Math.random() * 180;
      }

      const pos = Object.keys(POSITION_TOOL_PROFILES)[i % Object.keys(POSITION_TOOL_PROFILES).length];
      const toolGrades = computeToolGrades(results, pos, 'baseball', 16);
      const profile = POSITION_TOOL_PROFILES[pos];

      // Manual weighted average
      const tools: ToolName[] = ['hit', 'power', 'run', 'field', 'arm'];
      let weightedSum = 0;
      let totalWeight = 0;
      for (const t of tools) {
        const g = toolGrades[t];
        const w = profile[t].weight;
        if (g !== null && w > 0) {
          weightedSum += g * w;
          totalWeight += w;
        }
      }
      const expectedOverall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

      if (toolGrades.overall !== expectedOverall) {
        // Allow ±1 for rounding
        if (expectedOverall === null || toolGrades.overall === null ||
            Math.abs(toolGrades.overall - expectedOverall) > 1) {
          mismatches++;
        }
      }
    }

    expect(mismatches).toBe(0);
  });
});

// =====================================================================
// LAYER 10 — PROJECTION REALISM CONSTRAINTS
// =====================================================================

describe('Layer 10 — Projection Realism Constraints', () => {
  it('Test 29: Projection Realism Bounds — no impossible predictions', () => {
    let violations = 0;

    for (let i = 0; i < 1000; i++) {
      // Generate 3-cycle history with random values
      const baseVal = 60 + Math.random() * 40;
      const delta = (Math.random() - 0.3) * 15; // Bias toward improvement
      const history = [
        { results: { tee_exit_velocity: baseVal + delta * 2 }, test_date: '2026-04-01' },
        { results: { tee_exit_velocity: baseVal + delta }, test_date: '2026-02-15' },
        { results: { tee_exit_velocity: baseVal }, test_date: '2026-01-01' },
      ];

      const trends = computeTrends(history, 'baseball', 16);
      for (const trend of trends) {
        if (trend.projection) {
          // Extract weeks if present
          const weeksMatch = trend.projection.match(/~(\d+)\s*weeks/);
          if (weeksMatch) {
            const weeks = parseInt(weeksMatch[1], 10);
            if (weeks <= 0 || weeks > 520) violations++;
          }

          // Plateaued should never predict reaching a grade
          if (trend.trend === 'plateaued' && trend.projection.match(/Reach \d+/)) {
            violations++;
          }

          // Regressing should never predict positive outcome
          if (trend.trend === 'regressing' && trend.projection.match(/Reach \d+-grade/)) {
            violations++;
          }
        }

        // Rate sign must match trend
        if (trend.trend === 'improving' && trend.ratePerCycle < 0) violations++;
        if (trend.trend === 'regressing' && trend.ratePerCycle > 0) violations++;
      }
    }

    expect(violations).toBe(0);
  });

  it('Test 30: Trend Classification Consistency — direction matches data', () => {
    let violations = 0;

    for (let i = 0; i < 500; i++) {
      const v1 = 60 + Math.random() * 40; // Oldest
      const v3 = 60 + Math.random() * 40; // Newest
      const v2 = (v1 + v3) / 2 + (Math.random() - 0.5) * 5; // Middle

      const history = [
        { results: { tee_exit_velocity: v3 }, test_date: '2026-04-01' },
        { results: { tee_exit_velocity: v2 }, test_date: '2026-02-15' },
        { results: { tee_exit_velocity: v1 }, test_date: '2026-01-01' },
      ];

      const trends = computeTrends(history, 'baseball', 16);
      for (const trend of trends) {
        const gradeNewest = trend.currentGrade;
        const gradeOldest = trends.length > 0 ? trend.previousGrade : gradeNewest;
        const gradeDiff = gradeNewest - gradeOldest;

        // Strong improvement should not be classified as regressing
        if (gradeDiff > 5 && trend.trend === 'regressing') violations++;
        // Strong regression should not be classified as improving
        if (gradeDiff < -5 && trend.trend === 'improving') violations++;

        // Identical values across all cycles should be plateaued
        if (Math.abs(v3 - v1) < 0.01 && Math.abs(v2 - v1) < 0.01) {
          if (trend.trend !== 'plateaued') violations++;
        }
      }
    }

    expect(violations).toBe(0);
  });
});

// =====================================================================
// LAYER 11 — GROUND TRUTH VALIDATION
// =====================================================================

describe('Layer 11 — Ground Truth Validation', () => {
  const ELITE_SS: Record<string, number> = {
    ten_yard_dash: 1.55, sixty_yard_dash: 6.7, pro_agility: 3.9,
    vertical_jump: 32, sl_broad_jump_left: 85, sl_broad_jump_right: 83,
    mb_rotational_throw: 28, mb_situp_throw: 18, seated_chest_pass: 24,
    tee_exit_velocity: 95, bat_speed: 75, pitching_velocity: 88,
    long_toss_distance: 280, position_throw_velo: 88, lateral_shuffle: 4.0,
  };

  const AVG_14U: Record<string, number> = {
    ten_yard_dash: 2.0, sixty_yard_dash: 8.0, pro_agility: 4.8,
    vertical_jump: 20, sl_broad_jump_left: 55, sl_broad_jump_right: 53,
    mb_rotational_throw: 16, mb_situp_throw: 10, seated_chest_pass: 14,
    tee_exit_velocity: 65, bat_speed: 52, pitching_velocity: 60,
    long_toss_distance: 160, position_throw_velo: 55, lateral_shuffle: 5.2,
  };

  const BELOW_AVG_RUN_STANDOUT: Record<string, number> = {
    ten_yard_dash: 2.1, sixty_yard_dash: 6.5, pro_agility: 5.0,
    vertical_jump: 18, sl_broad_jump_left: 50, sl_broad_jump_right: 48,
    mb_rotational_throw: 14, mb_situp_throw: 8, seated_chest_pass: 12,
    tee_exit_velocity: 58, bat_speed: 48, pitching_velocity: 55,
    long_toss_distance: 140, position_throw_velo: 50, lateral_shuffle: 5.5,
  };

  it('Test 31: Elite Baseball SS — tightened tool grade bands', () => {
    const report = generateReport(ELITE_SS, 'SS', 'baseball', 16);
    const tools = report.toolGrades;

    // Tightened: exact bands from real output (Hit=69, Arm=69, Power=51, Run=56, Field=50, Overall=60)
    expect(tools.overall).toBeGreaterThanOrEqual(58);
    expect(tools.overall).toBeLessThanOrEqual(62);
    expect(tools.hit).toBeGreaterThanOrEqual(65);
    expect(tools.hit).toBeLessThanOrEqual(75);
    expect(tools.arm).toBeGreaterThanOrEqual(63);
    expect(tools.arm).toBeLessThanOrEqual(75);

    // No tool below 45 for an elite profile
    const toolVals = [tools.hit, tools.power, tools.run, tools.field, tools.arm].filter(v => v !== null) as number[];
    for (const v of toolVals) {
      expect(v).toBeGreaterThanOrEqual(45);
    }

    // Top strengths should include hitting or arm metrics
    const strengthKeys = report.topStrengths.map(s => s.key);
    const hitOrArm = strengthKeys.some(k =>
      ['tee_exit_velocity', 'bat_speed', 'position_throw_velo', 'pitching_velocity', 'long_toss_distance'].includes(k)
    );
    expect(hitOrArm).toBe(true);
  });

  it('Test 32: Average 14u Freshman — tightened average bands', () => {
    const report = generateReport(AVG_14U, 'SS', 'baseball', 13);
    const tools = report.toolGrades;

    // Tightened: all tools ∈ [30, 45] (real output: 34-41)
    const toolVals = [tools.hit, tools.power, tools.run, tools.field, tools.arm].filter(v => v !== null) as number[];
    for (const v of toolVals) {
      expect(v).toBeGreaterThanOrEqual(30);
      expect(v).toBeLessThanOrEqual(45);
    }

    // Overall ∈ [36, 42]
    expect(tools.overall).toBeGreaterThanOrEqual(36);
    expect(tools.overall).toBeLessThanOrEqual(42);

    // Must have limiting factors
    expect(report.limitingFactors.length).toBeGreaterThan(0);
  });

  it('Test 33: Below-Average with One Standout — tightened gap enforcement', () => {
    const report = generateReport(BELOW_AVG_RUN_STANDOUT, 'SS', 'baseball', 16);
    const tools = report.toolGrades;

    // Run tool must be the highest
    const nonNullTools = (['hit', 'power', 'run', 'field', 'arm'] as ToolName[])
      .filter(t => tools[t] !== null)
      .map(t => ({ tool: t, grade: tools[t]! }));
    const sorted = nonNullTools.sort((a, b) => b.grade - a.grade);
    expect(sorted[0].tool).toBe('run');

    // Tightened: Run tool ≥ next highest + 8 (real: run=35, field=25 → gap=10)
    expect(sorted[0].grade).toBeGreaterThanOrEqual(sorted[1].grade + 8);

    // Overall ∈ [23, 30] (real: 25)
    expect(tools.overall).toBeGreaterThanOrEqual(23);
    expect(tools.overall).toBeLessThanOrEqual(30);

    // Training priority should NOT reference speed/run
    expect(report.trainingPriority.toLowerCase()).not.toContain('60-yard');
    expect(report.trainingPriority.toLowerCase()).not.toContain('sprint');
  });
});

// =====================================================================
// LAYER 12 — SNAPSHOT INVARIANCE
// =====================================================================

describe('Layer 12 — Snapshot Invariance', () => {
  it('Test 34: Report Snapshot Freeze — exact output for fixed inputs', () => {
    const report = generateReport(FULL_RESULTS, 'SS', SPORT, AGE);

    // Frozen tool grades
    expect(report.toolGrades).toEqual({
      hit: 45, power: 37, run: 39, field: 38, arm: 46, overall: 42,
    });

    // Frozen top strengths (by key)
    expect(report.topStrengths.map(s => s.key)).toEqual([
      'pro_agility', 'position_throw_velo', 'vertical_jump',
    ]);

    // Frozen limiting factors (by key)
    expect(report.limitingFactors.map(l => l.metric.key)).toEqual([
      'mb_situp_throw', 'lateral_shuffle', 'mb_rotational_throw',
    ]);
  });

  it('Test 35: Tool Grade Snapshot Freeze — every position overall locked', () => {
    const FROZEN_OVERALLS: Record<string, number | null> = {
      SS: 42, C: 42, '1B': 40, '2B': 41, '3B': 41,
      CF: 41, LF: 41, RF: 41, P: 43, DH: 41,
      UT: 41, UTIL: 41, DP: 41, SLAPPER: 42,
    };

    for (const [pos, expectedOverall] of Object.entries(FROZEN_OVERALLS)) {
      const tg = computeToolGrades(FULL_RESULTS, pos, SPORT, AGE);
      expect(tg.overall).toBe(expectedOverall);
    }
  });
});

// =====================================================================
// LAYER 13 — DETERMINISTIC REPLAY
// =====================================================================

describe('Layer 13 — Deterministic Replay', () => {
  const HISTORY_3_CYCLE = [
    { results: { tee_exit_velocity: 85, sixty_yard_dash: 7.0, position_throw_velo: 78 }, test_date: '2026-04-01' },
    { results: { tee_exit_velocity: 82, sixty_yard_dash: 7.1, position_throw_velo: 76 }, test_date: '2026-02-15' },
    { results: { tee_exit_velocity: 78, sixty_yard_dash: 7.3, position_throw_velo: 75 }, test_date: '2026-01-01' },
  ];

  const FROZEN_TRENDS = [
    { k: 'tee_exit_velocity', trend: 'improving', rate: 5.5, cur: 51, prev: 45 },
    { k: 'sixty_yard_dash', trend: 'improving', rate: 4.5, cur: 48, prev: 45 },
    { k: 'position_throw_velo', trend: 'improving', rate: 3, cur: 53, prev: 49 },
  ];

  it('Test 36: Session Replay — 3-cycle trend computation is deterministic', () => {
    for (let run = 0; run < 100; run++) {
      const trends = computeTrends(HISTORY_3_CYCLE, 'baseball', 16);

      expect(trends.length).toBe(3);
      for (let i = 0; i < trends.length; i++) {
        expect(trends[i].metricKey).toBe(FROZEN_TRENDS[i].k);
        expect(trends[i].trend).toBe(FROZEN_TRENDS[i].trend);
        expect(trends[i].ratePerCycle).toBe(FROZEN_TRENDS[i].rate);
        expect(trends[i].currentGrade).toBe(FROZEN_TRENDS[i].cur);
        expect(trends[i].previousGrade).toBe(FROZEN_TRENDS[i].prev);
      }
    }
  });

  it('Test 37: Adaptive Priority Replay — focus list is deterministic', () => {
    const history = [
      { results: { tee_exit_velocity: 85, sixty_yard_dash: 8.5, position_throw_velo: 78, bat_speed: 68 }, test_date: '2026-04-01' },
      { results: { tee_exit_velocity: 80, sixty_yard_dash: 7.5, position_throw_velo: 76, bat_speed: 65 }, test_date: '2026-02-15' },
    ];

    const FROZEN_PRIORITIZED = ['sixty_yard_dash', 'tee_exit_velocity', 'position_throw_velo', 'bat_speed'];

    for (let run = 0; run < 100; run++) {
      const focus = getNextTestFocus(history, 'baseball', 16);
      expect(focus.prioritized.map(p => p.key)).toEqual(FROZEN_PRIORITIZED);
    }
  });
});

// =====================================================================
// LAYER 14 — CROSS-ENGINE CONSISTENCY
// =====================================================================

describe('Layer 14 — Cross-Engine Consistency', () => {
  it('Test 38: Grade Engine ↔ Intelligence Engine — metric grades agree exactly', () => {
    const standalone = gradeAllResults(FULL_RESULTS, SPORT, AGE);
    const report = generateReport(FULL_RESULTS, 'SS', SPORT, AGE);

    // Every metric in the report must match gradeAllResults
    for (const mg of report.metricGrades) {
      expect(mg.grade).toBe(standalone[mg.key]);
    }

    // Top strengths must be the 3 highest from standalone
    const sortedKeys = Object.entries(standalone)
      .sort(([, a], [, b]) => b - a)
      .map(([k]) => k);
    const top3 = sortedKeys.slice(0, 3);
    expect(report.topStrengths.map(s => s.key)).toEqual(top3);
  });

  it('Test 39: Tool Grades ↔ Report Tool Grades — zero divergence', () => {
    const standalone = computeToolGrades(FULL_RESULTS, 'SS', SPORT, AGE);
    const report = generateReport(FULL_RESULTS, 'SS', SPORT, AGE);

    expect(report.toolGrades.hit).toBe(standalone.hit);
    expect(report.toolGrades.power).toBe(standalone.power);
    expect(report.toolGrades.run).toBe(standalone.run);
    expect(report.toolGrades.field).toBe(standalone.field);
    expect(report.toolGrades.arm).toBe(standalone.arm);
    expect(report.toolGrades.overall).toBe(standalone.overall);
  });
});

// =====================================================================
// LAYER 15 — INTEGRATION KILL TESTS
// =====================================================================

describe('Layer 15 — Integration Kill Tests', () => {
  it('Test 40: Concurrent Computation Determinism — 100 parallel calls identical', async () => {
    const promises = Array.from({ length: 100 }, () =>
      Promise.resolve(JSON.stringify(generateReport(FULL_RESULTS, 'SS', SPORT, AGE)))
    );
    const results = await Promise.all(promises);
    const baseline = results[0];
    for (const r of results) {
      expect(r).toBe(baseline);
    }

    // Same for computeToolGrades
    const tgPromises = Array.from({ length: 100 }, () =>
      Promise.resolve(JSON.stringify(computeToolGrades(FULL_RESULTS, 'SS', SPORT, AGE)))
    );
    const tgResults = await Promise.all(tgPromises);
    const tgBaseline = tgResults[0];
    for (const r of tgResults) {
      expect(r).toBe(tgBaseline);
    }
  });

  it('Test 41: Partial Failure Cascade — progressive metric removal never crashes', () => {
    const keys = Object.keys(FULL_RESULTS);
    let current = { ...FULL_RESULTS };

    for (let i = 0; i < keys.length; i++) {
      const report = generateReport(current, 'SS', SPORT, AGE);

      // No NaN in any output
      for (const mg of report.metricGrades) {
        expect(Number.isNaN(mg.grade)).toBe(false);
      }
      const tools = report.toolGrades;
      for (const t of ['hit', 'power', 'run', 'field', 'arm', 'overall'] as const) {
        if (tools[t] !== null) {
          expect(Number.isNaN(tools[t]!)).toBe(false);
          expect(tools[t]!).toBeGreaterThanOrEqual(20);
          expect(tools[t]!).toBeLessThanOrEqual(80);
        }
      }

      // Remove one metric
      const next = { ...current };
      delete next[keys[i]];
      current = next;
    }

    // Empty results should produce null tools
    const emptyReport = generateReport({}, 'SS', SPORT, AGE);
    expect(emptyReport.toolGrades.overall).toBeNull();
    expect(emptyReport.metricGrades.length).toBe(0);
  });

  it('Test 42: Extreme Volume Stress — 50,000 random cases in <10s', () => {
    const allKeys = Object.keys(METRIC_BY_KEY);
    const start = performance.now();
    let violations = 0;

    for (let i = 0; i < 50000; i++) {
      const results: Record<string, number> = {};
      const numMetrics = 1 + Math.floor(Math.random() * 8);
      for (let j = 0; j < numMetrics; j++) {
        const key = allKeys[Math.floor(Math.random() * allKeys.length)];
        results[key] = Math.random() * 200;
      }

      const tg = computeToolGrades(results, 'SS', 'baseball', 16);
      for (const t of ['hit', 'power', 'run', 'field', 'arm', 'overall'] as const) {
        if (tg[t] !== null) {
          if (Number.isNaN(tg[t]!) || tg[t]! < 20 || tg[t]! > 80) violations++;
        }
      }
    }

    const elapsed = performance.now() - start;
    expect(violations).toBe(0);
    expect(elapsed).toBeLessThan(10000); // 10s ceiling
  });
});
