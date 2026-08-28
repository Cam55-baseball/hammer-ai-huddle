import { describe, expect, it } from "vitest";

import {
  combineMonthKey,
  evaluateCombineEligibility,
  type CombineEligibility,
} from "../eligibility";

type Blocked = Extract<CombineEligibility, { eligible: false }>;

function blocked(r: CombineEligibility): Blocked {
  if (r.eligible) throw new Error("expected the athlete to be blocked");
  return r;
}

const ATHLETE = "athlete-1";
const NOW = new Date("2026-08-28T00:00:00.000Z");

function session(overrides: Partial<{ user_id: string; sport: string; created_at: string }> = {}) {
  return {
    user_id: ATHLETE,
    sport: "baseball",
    created_at: "2026-08-03T14:00:00.000Z",
    ...overrides,
  };
}

describe("combine monthly eligibility", () => {
  it("allows a first attempt with no history", () => {
    const r = evaluateCombineEligibility(ATHLETE, "baseball", [], NOW);
    expect(r).toEqual({ eligible: true, month_key: "2026-08" });
  });

  it("blocks a second attempt in the same calendar month", () => {
    const r = blocked(evaluateCombineEligibility(ATHLETE, "baseball", [session()], NOW));
    expect(r.reason).toBe("already_taken_this_month");
    expect(r.existing_session_created_at).toBe("2026-08-03T14:00:00.000Z");
    expect(r.next_eligible_at).toBe("2026-09-01T00:00:00.000Z");
    expect(r.message).toContain("baseball");
  });

  it("allows an attempt when the prior one was last month", () => {
    const r = evaluateCombineEligibility(
      ATHLETE,
      "baseball",
      [session({ created_at: "2026-07-31T23:59:59.000Z" })],
      NOW,
    );
    expect(r.eligible).toBe(true);
  });

  it("is per sport — a baseball attempt does not block softball", () => {
    const r = evaluateCombineEligibility(ATHLETE, "softball", [session()], NOW);
    expect(r.eligible).toBe(true);
  });

  it("is per athlete — another athlete's attempt does not block", () => {
    const r = evaluateCombineEligibility(
      ATHLETE,
      "baseball",
      [session({ user_id: "athlete-2" })],
      NOW,
    );
    expect(r.eligible).toBe(true);
  });

  it("treats an unreadable prior timestamp as blocking, never as absent", () => {
    const r = blocked(evaluateCombineEligibility(
      ATHLETE,
      "baseball",
      [session({ created_at: "not-a-date" })],
      NOW,
    ));
    expect(r.existing_session_created_at).toBeNull();
  });

  it("uses UTC month boundaries", () => {
    expect(combineMonthKey(new Date("2026-12-31T23:30:00.000Z"))).toBe("2026-12");
    expect(combineMonthKey(new Date("2027-01-01T00:30:00.000Z"))).toBe("2027-01");
    const rolloverNow = new Date("2027-01-01T00:30:00.000Z");
    const r = evaluateCombineEligibility(
      ATHLETE,
      "baseball",
      [session({ created_at: "2026-12-31T23:30:00.000Z" })],
      rolloverNow,
    );
    expect(r.eligible).toBe(true);
  });
});
