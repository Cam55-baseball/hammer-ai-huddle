// TCS v1.1 — §7 tests for the circuit breaker, personalization, Silent Signals
// and the forecast / correlation engine. Pure code, zero production effect.

import { describe, expect, it } from "vitest";
import {
  decideGuarded,
  fallbackDecision,
  fallbackRateAlert,
  FALLBACK_REASON,
  isValidDecision,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/guard";
import {
  boundAll,
  capWeeklyChange,
  cohortIsUsable,
  cohortKeyOf,
  computeSOS,
  DEFAULT_REST_DAYS,
  learnMultipliers,
  MULTIPLIER_BOUNDS,
  neutralMultipliers,
  pickBestDay,
  predictedSOS,
  shrinkageBlend,
  type CandidateDay,
  type CohortEstimate,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/personalization";
import {
  ALL_SIGNALS,
  bestEstimatedMax,
  copyIsNeutral,
  estimatedMax,
  evaluateSignals,
  respondToSignals,
  SIGNAL_COPY,
  targetWeight,
  type SignalSession,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/silentSignals";
import {
  benjaminiHochberg,
  calibrationReport,
  copyIsLegal,
  forecastSeries,
  QUESTION_LIST,
  runCorrelationBoard,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/v11/forecast";
import { decide } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/decide";
import type {
  DaySchedule,
  Profile,
  TankLevels,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types";

const OFF_PROFILE: Profile = {
  age: 17,
  trainingAgeBand: "advanced",
  sport: "baseball",
  position: "position",
  phase: "offseason",
};

/* ------------------------------------------------------------- §1 guard */

describe("v1.1 §1 circuit breaker", () => {
  it("passes a healthy decision through unchanged", () => {
    const today = "2026-01-12";
    const history: DaySchedule[] = [{ date: "2026-01-05", lift: { class: "H" } }];
    const plain = decide(OFF_PROFILE, history, [], [], undefined, today, "UTC");
    const guarded = decideGuarded(OFF_PROFILE, history, [], [], undefined, today, "UTC");
    expect(guarded.fallbackUsed).toBe(false);
    expect(guarded.allowedClass).toBe(plain.allowedClass);
    expect(guarded.nextHeavyDate).toBe(plain.nextHeavyDate);
  });

  it("falls back on a timeout, never empty", () => {
    let t = 0;
    const g = decideGuarded(OFF_PROFILE, [], [], [], undefined, "2026-01-12", "UTC", {
      now: () => (t += 500),
    });
    expect(g.fallbackUsed).toBe(true);
    expect(g.fallbackCause).toBe("timeout");
    expect(g.reasons).toEqual([FALLBACK_REASON]);
    expect(g.diagnostics.join(",")).toContain("fallback:timeout");
  });

  it("falls back on garbage input rather than throwing", () => {
    const g = decideGuarded(
      null as unknown as Profile,
      "nope" as unknown as DaySchedule[],
      undefined as unknown as DaySchedule[],
      undefined as unknown as never,
      undefined,
      "2026-01-12",
      "UTC",
    );
    expect(isValidDecision(g)).toBe(true);
    expect(g.reasons.length).toBeGreaterThan(0);
  });

  it("fallback honours the 3-full-rest-day default and caps at M", () => {
    const hist: DaySchedule[] = [{ date: "2026-01-10", lift: { class: "H" } }];
    const tooSoon = fallbackDecision(hist, "2026-01-12", "exception", "x");
    expect(tooSoon.allowedClass).toBe("none");
    expect(tooSoon.nextHeavyDate).toBe("2026-01-14");
    const rested = fallbackDecision(hist, "2026-01-14", "exception", "x");
    expect(rested.allowedClass).toBe("M");
  });

  it("alerts above a 0.5% fallback rate", () => {
    expect(fallbackRateAlert(4, 1000).alert).toBe(false);
    expect(fallbackRateAlert(6, 1000).alert).toBe(true);
  });
});

/* --------------------------------------------------- §2 personalization */

describe("v1.1 §2 personalization", () => {
  it("zero data gives neutral multipliers — identical to v1", () => {
    const l = learnMultipliers({ scored: [] });
    expect(l.source).toBe("v1_defaults");
    expect(l.multipliers).toEqual(neutralMultipliers());
  });

  it("gates the cohort at 30 athletes and 300 sessions", () => {
    const base = (athletes: number, sessions: number): CohortEstimate => ({
      key: cohortKeyOf(OFF_PROFILE),
      athletes,
      sessions,
      multipliers: { nerve: 1.2, muscle: 1.2, connective: 1.2, arm: 1.2 },
    });
    expect(cohortIsUsable(base(29, 500))).toBe(false);
    expect(cohortIsUsable(base(40, 299))).toBe(false);
    expect(cohortIsUsable(base(40, 500))).toBe(true);
    expect(learnMultipliers({ scored: [], cohort: base(40, 500) }).source).toBe("cohort_only");
  });

  it("needs 8 personal sessions before personal data counts", () => {
    const s = (i: number) => ({
      score: 0.5 + (i % 3) * 0.1,
      restDays: 2 + (i % 3),
      tankLevelsAtSession: { nerve: 5 + i, muscle: 8, connective: 10, arm: 2 } as TankLevels,
    });
    const few = learnMultipliers({ scored: Array.from({ length: 7 }, (_, i) => s(i)) });
    expect(few.source).toBe("v1_defaults");
    const enough = learnMultipliers({ scored: Array.from({ length: 12 }, (_, i) => s(i)) });
    expect(enough.source).toBe("blended");
  });

  it("shrinkage blends by n and k", () => {
    const a = { nerve: 1.3, muscle: 1.3, connective: 1.3, arm: 1.3 };
    const c = { nerve: 1.0, muscle: 1.0, connective: 1.0, arm: 1.0 };
    expect(shrinkageBlend(a, 12, c, 12).nerve).toBeCloseTo(1.15, 6);
  });

  it("keeps multipliers inside 0.85–1.35 and caps change at 5% a week", () => {
    const wild = { nerve: 9, muscle: -4, connective: NaN, arm: 1.2 } as unknown as TankLevels;
    const b = boundAll(wild);
    for (const v of Object.values(b)) {
      expect(v).toBeGreaterThanOrEqual(MULTIPLIER_BOUNDS.min);
      expect(v).toBeLessThanOrEqual(MULTIPLIER_BOUNDS.max);
    }
    const capped = capWeeklyChange(
      { nerve: 1, muscle: 1, connective: 1, arm: 1 },
      { nerve: 1.35, muscle: 0.85, connective: 1, arm: 1 },
    );
    expect(capped.nerve).toBeCloseTo(1.05, 6);
    expect(capped.muscle).toBeCloseTo(0.95, 6);
  });

  it("scores SOS only from signals that exist", () => {
    expect(computeSOS({ date: "2026-01-01" }, {}).score).toBeNull();
    const s = computeSOS(
      { date: "2026-01-01", estimatedMax: 300, repsCompleted: 5, repsPrescribed: 5, cutShort: false },
      { estimatedMax: 300 },
    );
    expect(s.score).not.toBeNull();
    expect(s.componentsUsed).toContain("estimated_max_trend");
  });

  it("day pick is deterministic and ties go to the 3-day default", () => {
    const cands: CandidateDay[] = [2, 3, 4, 5].map((r) => ({
      date: `2026-01-1${r}`,
      restDays: r,
      allowedByFloors: true,
    }));
    const a = pickBestDay({ today: "2026-01-11", candidates: cands, multipliers: neutralMultipliers() });
    const b = pickBestDay({ today: "2026-01-11", candidates: cands, multipliers: neutralMultipliers() });
    expect(a).toEqual(b);
    expect(a.restDays).toBe(DEFAULT_REST_DAYS);
  });

  it("never picks a day the floors block, a game day, or one past the horizon", () => {
    const pick = pickBestDay({
      today: "2026-01-11",
      candidates: [
        { date: "2026-01-12", restDays: 1, allowedByFloors: false },
        { date: "2026-01-13", restDays: 2, allowedByFloors: true, gameOnDay: true },
        { date: "2026-02-20", restDays: 40, allowedByFloors: true },
        { date: "2026-01-15", restDays: 4, allowedByFloors: true },
      ],
      multipliers: neutralMultipliers(),
    });
    expect(pick.date).toBe("2026-01-15");
    expect(pick.considered).toBe(1);
  });

  it("more rest never scores worse than under-recovery at the same multipliers", () => {
    expect(predictedSOS(3, neutralMultipliers())).toBeGreaterThan(
      predictedSOS(0, neutralMultipliers()),
    );
  });
});

/* --------------------------------------------------- §3 Silent Signals */

describe("v1.1 §3 Silent Signals", () => {
  it("Epley estimated max is conservative and rounds targets to 5 lb", () => {
    expect(estimatedMax(200, 5, 0)).toBeCloseTo(233.33, 1);
    expect(estimatedMax(200, 5, 2)).toBeCloseTo(246.67, 1);
    expect(estimatedMax(0, 5)).toBeNull();
    const sets = [{ date: "d", pattern: "squat", load: 200, reps: 5, rir: 1 }];
    expect(bestEstimatedMax(sets)).not.toBeNull();
    const t = targetWeight({ sets, intensity: 0.8, youthOrFoundation: false });
    expect(t.target! % 5).toBe(0);
    expect(t.showPercent).toBe(true);
  });

  it("youth and foundation athletes never see a percentage", () => {
    const t = targetWeight({
      sets: [{ date: "d", pattern: "squat", load: 100, reps: 5, rir: 1 }],
      intensity: 0.8,
      youthOrFoundation: true,
      lastSession: { load: 98, reps: 5 },
    });
    expect(t.showPercent).toBe(false);
    expect(t.basis).toBe("last_session");
    expect(t.target).toBe(100);
  });

  it("missing data never fires a signal", () => {
    expect(evaluateSignals([])).toEqual([]);
    expect(evaluateSignals([{ date: "2026-01-01" }, { date: "2026-01-03" }])).toEqual([]);
    expect(evaluateSignals(null as unknown as SignalSession[])).toEqual([]);
  });

  it("fires under-target after 2 of 3 sessions below 0.90", () => {
    const s: SignalSession[] = [
      { date: "2026-01-01", loggedLoad: 80, targetLoad: 100 },
      { date: "2026-01-04", loggedLoad: 95, targetLoad: 100 },
      { date: "2026-01-07", loggedLoad: 85, targetLoad: 100 },
    ];
    const keys = evaluateSignals(s).map((x) => x.key);
    expect(keys).toContain("under_target");
  });

  it("fires the side-to-side gap above 12% and not below", () => {
    const near = evaluateSignals([{ date: "d", leftResult: 100, rightResult: 92 }]);
    const far = evaluateSignals([{ date: "d", leftResult: 100, rightResult: 80 }]);
    expect(near.map((x) => x.key)).not.toContain("side_to_side_gap");
    expect(far.map((x) => x.key)).toContain("side_to_side_gap");
  });

  it("reduces the dose, never removes the session", () => {
    const r = respondToSignals(ALL_SIGNALS.map((key) => ({ key, weight: 2, copy: SIGNAL_COPY[key], evidence: "" })));
    expect(r.doseReduction).toBeGreaterThan(0);
    expect(r.doseReduction).toBeLessThanOrEqual(0.3);
    expect(r.tankCostMultiplier).toBeLessThanOrEqual(1.25);
  });

  it("every signal's copy is neutral", () => {
    for (const key of ALL_SIGNALS) {
      expect(copyIsNeutral(SIGNAL_COPY[key]), `${key}: ${SIGNAL_COPY[key]}`).toBe(true);
      expect(copyIsLegal(SIGNAL_COPY[key]), `${key}: ${SIGNAL_COPY[key]}`).toBe(true);
    }
    expect(copyIsNeutral("This prevents injury")).toBe(false);
  });
});

/* ------------------------------------- §4 forecasts and correlation board */

describe("v1.1 §4 forecasts and correlations", () => {
  it("reports not enough data below 3 points and a band above it", () => {
    expect(forecastSeries("jump_track", [1, 2]).confidence).toBe("not_enough_data");
    const f = forecastSeries("jump_track", [10, 11, 12, 13, 14, 15], 42);
    expect(f.value).toBeGreaterThan(15);
    expect(f.low!).toBeLessThanOrEqual(f.value as number);
    expect(f.high!).toBeGreaterThanOrEqual(f.value as number);
    expect(f.basis).toContain("42 similar athletes");
    expect(copyIsLegal(f.copy)).toBe(true);
  });

  it("uses the pre-chosen question list only, with honest labels", () => {
    const board = runCorrelationBoard([], { weeksOfData: 0 });
    expect(board).toHaveLength(QUESTION_LIST.length);
    expect(board.every((b) => b.label === "not enough data yet")).toBe(true);
  });

  it("needs 6 weeks and 20 paired days before labelling a pattern", () => {
    const pairs: [number, number][] = Array.from({ length: 25 }, (_, i) => [i, i * 2]);
    const early = runCorrelationBoard([{ id: "sleep_next_day_readiness", pairs }], { weeksOfData: 3 });
    expect(early.find((b) => b.id === "sleep_next_day_readiness")!.label).toBe("not enough data yet");
    const ready = runCorrelationBoard([{ id: "sleep_next_day_readiness", pairs }], { weeksOfData: 8 });
    expect(ready.find((b) => b.id === "sleep_next_day_readiness")!.label).toBe("strong pattern");
  });

  it("applies false-discovery control across the list", () => {
    const q = benjaminiHochberg([0.001, 0.02, 0.4, 0.9]);
    expect(q[0]).toBeLessThanOrEqual(q[1]);
    expect(q.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(q[3]).toBeCloseTo(0.9, 6);
  });

  it("all board copy is free of causation and medical language", () => {
    const pairs: [number, number][] = Array.from({ length: 25 }, (_, i) => [i, i * 2 + (i % 3)]);
    const board = runCorrelationBoard(
      QUESTION_LIST.map((q) => ({ id: q.id, pairs })),
      { weeksOfData: 8 },
    );
    for (const b of board) expect(copyIsLegal(b.copy), b.copy).toBe(true);
  });

  it("switches off a model that scores worse than the simple default", () => {
    const worse = Array.from({ length: 20 }, (_, i) => ({
      key: "next_week_readiness",
      predicted: 10,
      actual: i % 2 === 0 ? 5 : 6,
      baseline: 5.5,
    }));
    const [rep] = calibrationReport(worse);
    expect(rep.enabled).toBe(false);
    expect(copyIsLegal(rep.note)).toBe(true);
    const better = worse.map((p) => ({ ...p, predicted: p.actual }));
    expect(calibrationReport(better)[0].enabled).toBe(true);
  });
});

/* ------------------------------------------- §7 new cross-cutting invariants */

describe("v1.1 §7 new invariants", () => {
  it("personalization never moves a floor or a hard rule", () => {
    // Day after a heavy offseason lift — the floor blocks it whatever the
    // learned multipliers say.
    const history: DaySchedule[] = [{ date: "2026-01-11", lift: { class: "H" } }];
    const d = decide(OFF_PROFILE, history, [], [], undefined, "2026-01-12", "UTC");
    expect(d.allowedClass).toBe("none");
    const pick = pickBestDay({
      today: "2026-01-12",
      candidates: [{ date: "2026-01-12", restDays: 0, allowedByFloors: false }],
      multipliers: { nerve: 0.85, muscle: 0.85, connective: 0.85, arm: 0.85 },
    });
    expect(pick.date).toBeNull();
  });

  it("with zero data the guarded decision is identical to v1", () => {
    for (const today of ["2026-01-12", "2026-06-01", "2026-11-30"]) {
      const plain = decide(OFF_PROFILE, [], [], [], undefined, today, "UTC");
      const guarded = decideGuarded(OFF_PROFILE, [], [], [], undefined, today, "UTC");
      const { fallbackUsed, fallbackCause, ...rest } = guarded;
      expect(fallbackUsed).toBe(false);
      expect(fallbackCause).toBe("none");
      expect(rest).toEqual(plain);
    }
    expect(learnMultipliers({ scored: [] }).multipliers).toEqual(neutralMultipliers());
  });

  it("more load never gives an earlier lift under the guard", () => {
    const light: DaySchedule[] = [{ date: "2026-01-05", lift: { class: "L" } }];
    const heavy: DaySchedule[] = [
      { date: "2026-01-05", lift: { class: "H" } },
      { date: "2026-01-09", practiceMinutes: 120, practiceIntensity: "high" },
      { date: "2026-01-10", games: { role: "position", count: 1 } },
    ];
    const a = decideGuarded(OFF_PROFILE, light, [], [], undefined, "2026-01-11", "UTC");
    const b = decideGuarded(OFF_PROFILE, heavy, [], [], undefined, "2026-01-11", "UTC");
    const rank = { none: 0, L: 1, M: 2, H: 3 } as const;
    expect(rank[b.allowedClass]).toBeLessThanOrEqual(rank[a.allowedClass]);
    if (a.nextHeavyDate && b.nextHeavyDate) expect(b.nextHeavyDate >= a.nextHeavyDate).toBe(true);
  });

  it("predictions are always scored for calibration", () => {
    const rep = calibrationReport([
      { key: "estimated_max_track", predicted: 300, actual: 305, baseline: 295 },
      { key: "estimated_max_track", predicted: 302, actual: 304, baseline: 295 },
    ]);
    expect(rep[0].n).toBe(2);
    expect(Number.isFinite(rep[0].skill)).toBe(true);
  });
});
