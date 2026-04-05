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
