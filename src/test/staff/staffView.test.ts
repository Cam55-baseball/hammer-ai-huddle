import { describe, expect, it } from "vitest";
import {
  canOpenAthlete,
  changeLog,
  tankTrend,
  visibleAthleteIds,
  weekStart,
  weeklyBucketTotals,
} from "@/lib/hammer/staff/staffData";
import { rulesForDecision, decisionSentences } from "@/lib/hammer/staff/evidence";

const grants = [
  { staff_user_id: "staff-a", athlete_user_id: "ath-1", revoked_at: null },
  { staff_user_id: "staff-a", athlete_user_id: "ath-2", revoked_at: "2026-01-01T00:00:00Z" },
  { staff_user_id: "staff-b", athlete_user_id: "ath-3", revoked_at: null },
];

describe("staff access", () => {
  it("shows only athletes who granted access", () => {
    expect(visibleAthleteIds(grants, "staff-a")).toEqual(["ath-1"]);
    expect(visibleAthleteIds(grants, "staff-b")).toEqual(["ath-3"]);
  });

  it("refuses an athlete who never granted access", () => {
    expect(canOpenAthlete(grants, "staff-a", "ath-3")).toBe(false);
    expect(canOpenAthlete(grants, "staff-a", "ath-1")).toBe(true);
  });

  it("refuses a revoked grant", () => {
    expect(canOpenAthlete(grants, "staff-a", "ath-2")).toBe(false);
  });
});

describe("weekly bucket totals", () => {
  it("groups by week and bucket from stored rows", () => {
    const rows = [
      { plan_date: "2026-09-21", slot: "lift", movement_name: "A", movement_slug: "a", sets: 3, reps: 5, status: "planned" },
      { plan_date: "2026-09-23", slot: "lift", movement_name: "B", movement_slug: "b", sets: 2, reps: 5, status: "planned" },
      { plan_date: "2026-09-28", slot: "lift", movement_name: "A", movement_slug: "a", sets: 4, reps: 5, status: "planned" },
    ];
    const out = weeklyBucketTotals(rows, { a: "Lower Body", b: "Upper Body" });
    expect(Object.keys(out).sort()).toEqual(["2026-09-21", "2026-09-28"]);
    expect(out["2026-09-21"]).toEqual([
      { bucket: "Lower Body", sets: 3, movements: 1 },
      { bucket: "Upper Body", sets: 2, movements: 1 },
    ]);
  });

  it("weeks start on Monday", () => {
    expect(weekStart("2026-09-20")).toBe("2026-09-14");
    expect(weekStart("2026-09-21")).toBe("2026-09-21");
  });
});

describe("change log", () => {
  it("names each change with the stored reason", () => {
    const out = changeLog([
      { decision_date: "2026-09-18", allowed_class: "H", fallback_used: false, reasons: ["Rested."], diagnostics: null },
      { decision_date: "2026-09-19", allowed_class: "L", fallback_used: false, reasons: ["Two hard days back to back."], diagnostics: null },
      { decision_date: "2026-09-20", allowed_class: "L", fallback_used: true, reasons: ["Backup."], diagnostics: null },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].what).toBe("Backup plan used");
    expect(out[1].what).toBe("Day changed from heavy to light");
    expect(out[1].why).toContain("back to back");
  });

  it("lists a governor trim with its sentence", () => {
    const out = changeLog([
      {
        decision_date: "2026-09-20",
        allowed_class: "M",
        fallback_used: false,
        reasons: [],
        diagnostics: { load_spike: { trims: [{ sentence: "Jumps capped at 40 today." }] } },
      },
    ]);
    expect(out[0]).toMatchObject({ what: "Volume trimmed", why: "Jumps capped at 40 today." });
  });
});

describe("tank trends", () => {
  it("sorts oldest first and keeps the stored numbers", () => {
    const out = tankTrend([
      { decision_date: "2026-09-20", tank_levels: { arm: 2 } },
      { decision_date: "2026-09-19", tank_levels: { arm: 1 } },
    ]);
    expect(out.map((t) => t.date)).toEqual(["2026-09-19", "2026-09-20"]);
    expect(out[1].tanks.arm).toBe(2);
  });
});

describe("evidence grades", () => {
  it("names the rules behind a stored decision", () => {
    const rules = rulesForDecision({
      reasons: ["Three full rest days since your last heavy day."],
      floors_applied: [],
    });
    expect(rules.map((r) => r.id)).toContain("I12");
    expect(rules.every((r) => ["E1", "E2", "E3", "E4"].includes(r.grade))).toBe(true);
  });

  it("reads plain sentences straight from the stored decision", () => {
    expect(decisionSentences({ reasons: ["You're rested."], floors_applied: ["Floor held."] })).toEqual([
      "You're rested.",
      "Floor held.",
    ]);
  });

  it("returns nothing when the decision stored no text", () => {
    expect(rulesForDecision({ reasons: [], floors_applied: [] })).toEqual([]);
  });
});
