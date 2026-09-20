// Tissue Cost Scheduler — chaos inputs (spec §7).
// Garbage in must never crash: a safe default plus a diagnostic.

import { describe, expect, it } from "vitest";
import { decide, TCS_CONFIG } from "./harness.ts";
import type { Profile } from "../../../supabase/functions/_shared/wic/schedule/tissueCost/types.ts";

const P: Profile = { age: 17, trainingAgeBand: "advanced", phase: "offseason", position: "position" };

function ok(d: ReturnType<typeof decide>) {
  expect(["H", "M", "L", "none"]).toContain(d.allowedClass);
  for (const v of Object.values(d.tankLevels)) expect(Number.isFinite(v)).toBe(true);
  expect(d.reasons.length).toBeGreaterThanOrEqual(1);
  expect(d.reasons.length).toBeLessThanOrEqual(2);
  expect(d.inputsHash).toBeTruthy();
}

describe("TCS chaos inputs", () => {
  it("garbage day rows are discarded with a diagnostic", () => {
    const d = decide(
      P,
      [null, 42, "nope", { date: "not-a-date" }, { date: "2026-02-31" }] as never,
      [],
      [],
      TCS_CONFIG,
      "2026-01-09",
      "UTC",
    );
    ok(d);
    expect(d.diagnostics.length).toBeGreaterThan(0);
  });

  it("negative, NaN and absurd numbers are clamped", () => {
    const d = decide(
      P,
      [
        {
          date: "2026-01-07",
          practiceMinutes: -500,
          maxSprintYards: Number.NaN,
          maxIntentThrows: 1e9,
          jumpContacts: { tier1: -10, tier2: Number.POSITIVE_INFINITY, tier3: 1e9 },
          lift: { class: "X", hardSets: -3 },
        },
      ] as never,
      [],
      [],
      TCS_CONFIG,
      "2026-01-09",
      "UTC",
    );
    ok(d);
    expect(d.diagnostics).toContain("lift_row_discarded");
  });

  it("duplicated rows for one date are merged conservatively", () => {
    const rows = [
      { date: "2026-01-07", practiceMinutes: 30 },
      { date: "2026-01-07", practiceMinutes: 180, games: { role: "catcher", count: 1 } },
    ];
    const d = decide(P, rows as never, [], [], TCS_CONFIG, "2026-01-09", "UTC");
    ok(d);
    expect(d.diagnostics).toContain("duplicate_day_merged");
  });

  it("future-dated history rows are flagged, not trusted as history", () => {
    const d = decide(
      P,
      [{ date: "2026-01-11", lift: { class: "H" } }] as never,
      [],
      [],
      TCS_CONFIG,
      "2026-01-09",
      "UTC",
    );
    ok(d);
    expect(d.diagnostics).toContain("future_dated_history_row");
  });

  it("very old rows fall out of the 28-day window", () => {
    const d = decide(
      P,
      [{ date: "2024-01-01", lift: { class: "H" } }] as never,
      [],
      [],
      TCS_CONFIG,
      "2026-01-09",
      "UTC",
    );
    ok(d);
    expect(d.diagnostics).toContain("day_out_of_window");
  });

  it("non-array inputs and a missing profile do not crash", () => {
    const d = decide({} as never, "nope" as never, null as never, 7 as never, TCS_CONFIG, "2026-01-09", "UTC");
    ok(d);
    expect(d.diagnostics).toContain("history_not_an_array");
  });

  it("an invalid today gives a safe, explicit non-decision", () => {
    const d = decide(P, [], [], [], TCS_CONFIG, "yesterday" as never, "UTC");
    expect(d.allowedClass).toBe("none");
    expect(d.timing).toBe("none");
    expect(d.diagnostics).toContain("invalid_today");
  });

  it("garbage check-ins are discarded", () => {
    const d = decide(P, [], [], [null, { date: "??" }, 5] as never, TCS_CONFIG, "2026-01-09", "UTC");
    ok(d);
    expect(d.diagnostics).toContain("checkin_discarded");
  });
});
