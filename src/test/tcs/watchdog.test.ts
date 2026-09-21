import { describe, expect, it } from "vitest";
import {
  WATCH,
  buildDigest,
  buildReport,
  cardBuildFailedNote,
  determinismNote,
  emptyCardNote,
  fallbackRateNote,
  liftFrequencyNotes,
  livePrescriptionViolations,
  mixDriftNote,
  skipRiseNotes,
  slowdownNote,
  switchDownNote,
} from "../../../supabase/functions/_shared/wic/watch/rules";

// Step 13 Part E — every watchdog trigger fired deliberately, with the note it
// writes and the automatic action it records.

describe("Step 13 watchdog triggers", () => {
  it("critical: a card that fails to build", () => {
    const n = cardBuildFailedNote({ userId: "u1", planDate: "2026-09-21", reason: "generator threw" });
    expect(n.severity).toBe("critical");
    expect(n.category).toBe("card_build");
    expect(n.auto_action).toContain("safe fallback");
  });

  it("critical: an empty card", () => {
    const n = emptyCardNote({ userId: "u1", planDate: "2026-09-21" });
    expect(n.severity).toBe("critical");
    expect(n.category).toBe("empty_card");
  });

  it("a rest day filled with arm care and easy mobility is not a violation", () => {
    const notes = livePrescriptionViolations({
      userId: "u1",
      planDate: "2026-09-21",
      allowedClass: "none",
      blockedClasses: ["heavy_compound", "compound", "high", "moderate"],
      rows: [
        { slug: "crossover_symmetry_full", slot: "lift", intensityClass: "arm_care", cnsCost: 1 },
        { slug: "fp_leg_line_spiral", slot: "lift", intensityClass: "supplemental", cnsCost: 1 },
        { slug: "paloff_press", slot: "lift", intensityClass: "supplemental", cnsCost: 1 },
      ],
      cnsCap: 2,
      cnsUsed: 1,
      itemCount: 3,
      decisionId: "d9",
    });
    expect(notes.filter((n) => n.severity === "critical")).toEqual([]);
  });

  it("critical: lifts on a rest day and a movement above the ceiling, with the rows named", () => {
    const notes = livePrescriptionViolations({
      userId: "u1",
      planDate: "2026-09-21",
      allowedClass: "none",
      blockedClasses: ["heavy_compound", "compound"],
      rows: [
        { slug: "back_squat", slot: "lift", intensityClass: "heavy_compound", cnsCost: 4 },
        { slug: "goblet_squat", slot: "lift", intensityClass: "light", cnsCost: 1 },
      ],
      cnsCap: 4,
      cnsUsed: 3,
      itemCount: 5,
      decisionId: "d1",
    });
    expect(notes.map((n) => n.title)).toEqual([
      "A rest day was given lifts",
      "A movement went above today's ceiling",
    ]);
    expect(notes.every((n) => n.severity === "critical")).toBe(true);
    expect(notes[0].decision_id).toBe("d1");
    // Step 17 item B4 — a critical must name the exact prescription rows.
    expect((notes[1].detail as any).rows).toEqual([
      { slug: "back_squat", slot: "lift", intensity_class: "heavy_compound", cns_cost: 4 },
    ]);
  });

  it("a heavy day with a costly movement is legal — no class is blocked", () => {
    // The 20:42 false criticals: allowed class H, a sprint costing 4, a day
    // budget of 2. Class against class, nothing is over the ceiling.
    expect(
      livePrescriptionViolations({
        userId: "u1",
        planDate: "2026-09-21",
        allowedClass: "H",
        blockedClasses: [],
        rows: [{ slug: "flying_10s", slot: "speed", intensityClass: "speed", cnsCost: 4 }],
        cnsCap: 2,
        cnsUsed: 2,
        itemCount: 9,
      }),
    ).toEqual([]);
  });

  it("a row with no intensity class logs info, never critical, and takes no action", () => {
    const notes = livePrescriptionViolations({
      userId: "u1",
      planDate: "2026-09-21",
      allowedClass: "M",
      blockedClasses: ["heavy_compound"],
      rows: [{ slug: "mystery_row", slot: "lift", intensityClass: null, cnsCost: 3 }],
      cnsCap: 6,
      cnsUsed: 4,
      itemCount: 9,
    });
    expect(notes).toHaveLength(1);
    expect(notes[0].severity).toBe("info");
    expect(notes[0].auto_action).toBeNull();
  });

  // Step 20 C1 — `cnsUsed` now carries only the spend the cap governs
  // (total-dose rows are exempt by design and no longer counted), so a value
  // above the cap is a real overrun and names the rows involved.
  it("going over the day's governed budget is a real violation and names the rows", () => {
    const notes = livePrescriptionViolations({
      userId: "u1",
      planDate: "2026-09-21",
      allowedClass: "M",
      blockedClasses: [],
      rows: [{ slug: "sled_push", slot: "conditioning", intensityClass: "conditioning", cnsCost: 4 }],
      cnsCap: 2,
      cnsUsed: 5,
      itemCount: 9,
    });
    expect(notes.map((n) => n.severity)).toEqual(["critical"]);
    expect(notes[0].auto_action).not.toBeNull();
    expect((notes[0].detail as { rows: Array<{ slug: string }> }).rows.map((r) => r.slug))
      .toEqual(["sled_push"]);
  });

  it("a legal day writes nothing", () => {
    expect(
      livePrescriptionViolations({
        userId: "u1",
        planDate: "2026-09-21",
        allowedClass: "M",
        blockedClasses: ["heavy_compound"],
        rows: [{ slug: "goblet_squat", slot: "lift", intensityClass: "compound", cnsCost: 2 }],
        cnsCap: 6,
        cnsUsed: 4,
        itemCount: 9,
      }),
    ).toEqual([]);
  });

  it("critical: a mismatch in the nightly re-check", () => {
    expect(determinismNote({ checkedDate: "2026-09-21", mismatches: 0, decisions: 95 })).toBeNull();
    const n = determinismNote({ checkedDate: "2026-09-21", mismatches: 3, decisions: 95 })!;
    expect(n.severity).toBe("critical");
    expect(n.auto_action).toContain("steps the switch down");
  });

  it("warn above 0.5% and critical above 2% on the backup plan", () => {
    expect(fallbackRateNote({ checkedDate: "d", rate: WATCH.FALLBACK_WARN, decisions: 100 })).toBeNull();
    expect(fallbackRateNote({ checkedDate: "d", rate: 0.01, decisions: 100 })!.severity).toBe("warn");
    expect(fallbackRateNote({ checkedDate: "d", rate: 0.03, decisions: 100 })!.severity).toBe("critical");
  });

  it("warn: more than 3 lifts in 7 days, or no lift in 10 days", () => {
    const notes = liftFrequencyNotes([
      { userId: "a", liftsLast7Days: 4, daysSinceLastLift: 1 },
      { userId: "b", liftsLast7Days: 0, daysSinceLastLift: 11 },
      { userId: "c", liftsLast7Days: 3, daysSinceLastLift: 10 },
    ]);
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.user_id)).toEqual(["a", "b"]);
    expect(notes.every((n) => n.severity === "warn")).toBe(true);
  });

  it("warn: the day mix drifting more than 10% from the shadow baseline", () => {
    const baseline = { none: 40, L: 20, M: 20, H: 20 };
    expect(mixDriftNote(baseline, { none: 42, L: 19, M: 20, H: 19 })).toBeNull();
    const n = mixDriftNote(baseline, { none: 10, L: 20, M: 30, H: 40 })!;
    expect(n.severity).toBe("warn");
    expect(n.category).toBe("mix_drift");
  });

  it("warn: cards taking more than 50% longer", () => {
    expect(slowdownNote({ baselineMs: 100, currentMs: 150, samples: 50 })).toBeNull();
    const n = slowdownNote({ baselineMs: 100, currentMs: 220, samples: 50 })!;
    expect(n.severity).toBe("warn");
    expect(n.detail.ratio).toBe(2.2);
  });

  it("warn: skipping rising overall and per athlete", () => {
    const notes = skipRiseNotes({
      baselineRate: 0.1,
      currentRate: 0.3,
      sessions: 200,
      perAthlete: [
        { userId: "a", baselineRate: 0.1, currentRate: 0.5, sessions: 10 },
        { userId: "b", baselineRate: 0.1, currentRate: 0.12, sessions: 10 },
      ],
    });
    expect(notes).toHaveLength(2);
    expect(notes[0].user_id).toBeUndefined();
    expect(notes[1].user_id).toBe("a");
  });

  it("critical: every automatic switch-down carries its trigger", () => {
    const n = switchDownNote({
      featureKey: "rest_day_calculator",
      label: "Rest-day calculator",
      fromMode: "all",
      toMode: "pilot",
      trigger: "fallback_rate",
      reason: "Backup plan used on 0.90% of days",
    });
    expect(n.severity).toBe("critical");
    expect(n.detail.trigger).toBe("fallback_rate");
    expect(n.auto_action).toBe("Switch stepped down automatically: all → pilot");
  });
});

describe("Step 13 digest and report", () => {
  it("says All clear when there is nothing", () => {
    const d = buildDigest([], "2026-09-21");
    expect(d.subject).toContain("All clear");
    expect(d.body).toContain("All clear");
  });

  it("counts by severity and leads with the critical items", () => {
    const d = buildDigest(
      [
        { severity: "warn", category: "lift_frequency", title: "4 lifts in 7 days" },
        { severity: "critical", category: "card_build", title: "A card failed to build", auto_action: "fallback" },
      ],
      "2026-09-21",
    );
    expect(d.subject).toContain("1 critical, 1 warnings");
    expect(d.body.indexOf("CRITICAL")).toBeLessThan(d.body.indexOf("WARN"));
  });

  it("produces a report that pastes cleanly", () => {
    const text = buildReport({
      generatedAt: "2026-09-21T12:00:00Z",
      days: 7,
      notes: [
        {
          noted_at: "2026-09-21T03:00:00Z",
          severity: "critical",
          category: "determinism",
          user_id: null,
          title: "Last night's re-check found 3 mismatch(es)",
          detail: { mismatches: 3 },
          auto_action: "stepped down",
        },
      ],
      switchDowns: [
        {
          changed_at: "2026-09-21T04:45:00Z",
          feature_key: "rest_day_calculator",
          from_mode: "all",
          to_mode: "pilot",
          reason: "determinism",
        },
      ],
      fallbackRate: 0.004,
      greenNights: 3,
      switches: [{ feature_key: "rest_day_calculator", label: "Rest-day calculator", mode: "all" }],
    });
    for (const section of [
      "SWITCHES",
      "COUNTS BY CATEGORY",
      "CRITICAL NOTES (1)",
      "AUTOMATIC SWITCH-DOWNS (1)",
      "SAFETY",
      "END OF REPORT",
    ]) {
      expect(text).toContain(section);
    }
    expect(text).toContain("Green nights in a row: 3");
    expect(text.includes("\u0000")).toBe(false);
  });
});
