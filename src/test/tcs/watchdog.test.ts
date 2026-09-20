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

  it("critical: lifts on a rest day and a movement above the ceiling", () => {
    const notes = livePrescriptionViolations({
      userId: "u1",
      planDate: "2026-09-21",
      allowedClass: "none",
      liftCount: 2,
      maxCnsCost: 9,
      cnsCap: 4,
      itemCount: 5,
      decisionId: "d1",
    });
    expect(notes.map((n) => n.title)).toEqual([
      "A rest day was given lifts",
      "A movement went above today's ceiling",
    ]);
    expect(notes.every((n) => n.severity === "critical")).toBe(true);
    expect(notes[0].decision_id).toBe("d1");
  });

  it("a legal day writes nothing", () => {
    expect(
      livePrescriptionViolations({
        userId: "u1",
        planDate: "2026-09-21",
        allowedClass: "M",
        liftCount: 1,
        maxCnsCost: 4,
        cnsCap: 6,
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
