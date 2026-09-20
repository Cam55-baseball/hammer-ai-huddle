import { describe, expect, it } from "vitest";
import {
  ageFrom,
  buildShadowInputs,
  classFromPrescriptions,
  phaseFrom,
  type RawShadowData,
  trainingAgeBandFrom,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/adapter";
import {
  decideFromRaw,
  decideFromSnapshot,
  decisionRow,
  decisionsMatch,
} from "../../../supabase/functions/_shared/wic/schedule/tissueCost/shadow/run";

const base = (over: Partial<RawShadowData> = {}): RawShadowData => ({
  userId: "00000000-0000-0000-0000-000000000001",
  today: "2026-03-10",
  timezone: "UTC",
  windowStart: "2026-01-09",
  horizonEnd: "2026-03-24",
  mpi: null,
  context: null,
  prescriptions: [],
  sessionLogs: [],
  games: [],
  calendarEvents: [],
  practices: [],
  throwingReps: [],
  speedSessions: [],
  quizzes: [],
  dailyLogs: [],
  ...over,
});

describe("shadow adapter — §2 inputs and defaults", () => {
  it("derives the lift class from the prescribed intensity", () => {
    expect(classFromPrescriptions([{ plan_date: "d", slot: "lift", movement_slug: "a", cns_cost: 5, sets: 3, status: null }])).toBe("H");
    expect(classFromPrescriptions([{ plan_date: "d", slot: "lift", movement_slug: "a", cns_cost: 3, sets: 3, status: null }])).toBe("M");
    expect(classFromPrescriptions([{ plan_date: "d", slot: "lift", movement_slug: "a", cns_cost: 1, sets: 3, status: null }])).toBe("L");
    expect(classFromPrescriptions([{ plan_date: "d", slot: "speed", movement_slug: "a", cns_cost: 5, sets: 3, status: null }])).toBeNull();
  });

  it("counts a prescribed lift as done unless it is marked skipped", () => {
    const inputs = buildShadowInputs(base({
      prescriptions: [
        { plan_date: "2026-03-08", slot: "lift", movement_slug: "back_squat", cns_cost: 5, sets: 4, status: "planned" },
        { plan_date: "2026-03-09", slot: "lift", movement_slug: "back_squat", cns_cost: 5, sets: 4, status: "skipped" },
      ],
    }));
    const days = Object.fromEntries(inputs.history.map((d) => [d.date, d.lift]));
    expect(days["2026-03-08"]?.skipped).toBe(false);
    expect(days["2026-03-09"]?.skipped).toBe(true);
  });

  it("writes a diagnostic for every missing input", () => {
    const { diagnostics, profile } = buildShadowInputs(base());
    expect(diagnostics).toContain("no_prescriptions");
    expect(diagnostics).toContain("no_practices_default_none");
    expect(diagnostics).toContain("no_check_ins_neutral");
    expect(diagnostics).toContain("no_throwing_logs");
    expect(diagnostics).toContain("age_missing_default");
    // Nothing at all → class capped at M (§2 last row).
    expect(diagnostics).toContain("no_plan_no_calendar_default_m_cap");
    expect(profile.phaseTemplateClass).toBe("M");
  });

  it("treats a scheduled game as one standard game at the primary position", () => {
    const inputs = buildShadowInputs(base({
      mpi: { primary_position: "C" },
      games: [{ game_date: "2026-03-11" }],
    }));
    expect(inputs.calendar[0].games).toMatchObject({ role: "catcher", count: 1 });
  });

  it("falls back to a calendar game when there is no game row", () => {
    const inputs = buildShadowInputs(base({
      calendarEvents: [{ event_date: "2026-03-12", event_type: "game", is_doubleheader: true }],
    }));
    expect(inputs.calendar[0].games?.count).toBe(2);
    expect(inputs.diagnostics).toContain("game_from_calendar_2026-03-12");
  });

  it("ignores games that are deleted or marked out of training", () => {
    const inputs = buildShadowInputs(base({
      games: [
        { game_date: "2026-03-11", deleted_at: "2026-03-01" },
        { game_date: "2026-03-12", ignored_for_training: true },
      ],
    }));
    expect(inputs.calendar).toHaveLength(0);
  });

  it("defaults practice minutes and records it", () => {
    const inputs = buildShadowInputs(base({
      practices: [{ scheduled_date: "2026-03-09", intensity: "high" }],
    }));
    expect(inputs.history[0].practiceMinutes).toBe(60);
    expect(inputs.history[0].practiceIntensity).toBe("high");
    expect(inputs.diagnostics).toContain("practice_minutes_default_2026-03-09");
  });

  it("reads sleep, soreness and pain from the check-in", () => {
    const inputs = buildShadowInputs(base({
      quizzes: [{ entry_date: "2026-03-09", hours_slept: 5, perceived_recovery: 2, pain_location: ["knee"], pain_scale: 7 }],
    }));
    expect(inputs.checkIns[0]).toMatchObject({ poorSleep: true, highSoreness: true });
    expect(inputs.checkIns[0].pain?.[0]).toMatchObject({ region: "knee", blocksLoadedWork: true });
  });

  it("turns injury mode into a pain flag that blocks loaded work", () => {
    const inputs = buildShadowInputs(base({
      dailyLogs: [{ entry_date: "2026-03-09", injury_mode: true, injury_body_region: "elbow" }],
    }));
    expect(inputs.checkIns[0].pain?.[0]).toMatchObject({ region: "elbow", blocksLoadedWork: true });
  });

  it("reads the phase from the season dates and the training age from the context", () => {
    expect(phaseFrom({ in_season_start_date: "2026-03-01", in_season_end_date: "2026-06-01" }, null, "2026-03-10")).toBe("in_season");
    expect(phaseFrom({ preseason_start_date: "2026-02-01", preseason_end_date: "2026-02-28" }, null, "2026-03-10")).toBe("offseason");
    expect(phaseFrom(null, { season_phase: "pre_season" }, "2026-03-10")).toBe("pre_season");
    expect(trainingAgeBandFrom({ lifting_age_years: 6 })).toBe("advanced");
    expect(trainingAgeBandFrom({ competition_level: "pro" })).toBe("professional");
    expect(trainingAgeBandFrom(null)).toBe("beginner");
    expect(ageFrom("2010-03-11", "2026-03-10")).toBe(15);
    expect(ageFrom(null, "2026-03-10")).toBeNull();
  });
});

describe("shadow decisions", () => {
  const raw = base({
    mpi: { primary_position: "SS", date_of_birth: "2008-01-01" },
    context: { lifting_age_years: 4 },
    prescriptions: [
      { plan_date: "2026-03-09", slot: "lift", movement_slug: "back_squat", cns_cost: 5, sets: 4, status: "planned" },
    ],
    practices: [{ scheduled_date: "2026-03-09", intensity: "moderate", duration_minutes: 60 }],
  });

  it("produces a decision that is byte-identical on recompute from the snapshot", () => {
    const first = decideFromRaw(raw);
    const again = decideFromSnapshot(first.snapshot);
    expect(decisionsMatch(decisionRow(first, "test") as never, again)).toBe(true);
    expect(decideFromRaw(raw).decision).toEqual(first.decision);
  });

  it("stores the decision with hashes, snapshot and diagnostics", () => {
    const row = decisionRow(decideFromRaw(raw), "nightly");
    expect(row.version).toBe("tcs_v1_shadow");
    expect(row.config_hash).toMatch(/^[0-9a-f]+$/);
    expect(row.thresholds_hash).toMatch(/^[0-9a-f]+$/);
    expect(row.inputs_hash).toMatch(/^[0-9a-f]+$/);
    expect(row.fallback_used).toBe(false);
    expect(Array.isArray(row.diagnostics)).toBe(true);
    expect((row.inputs_snapshot as { profile: unknown }).profile).toBeTruthy();
  });

  it("catches a changed decision as a mismatch", () => {
    const first = decideFromRaw(raw);
    const stored = { ...decisionRow(first, "nightly"), allowed_class: "H" };
    expect(decisionsMatch(stored as never, decideFromSnapshot(first.snapshot))).toBe(
      first.decision.allowedClass === "H",
    );
  });

  it("never exceeds M when there is no plan and no calendar", () => {
    const empty = decideFromRaw(base({ mpi: { date_of_birth: "2008-01-01" } }));
    expect(["none", "L", "M"]).toContain(empty.decision.allowedClass);
  });
});
