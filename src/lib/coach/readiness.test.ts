import { describe, it, expect } from "vitest";
import { checkinFacts, painDays, type Checkin } from "./readiness";

const c = (o: Partial<Checkin>): Checkin => ({ entry_date: "2026-10-10", quiz_type: "pre_lift", physical_readiness: null, perceived_recovery: null, hours_slept: null, pain_location: null, pain_scale: null, soreness_locations: null, ...o });

describe("coach readiness", () => {
  it("shows only answered items, each labeled", () => {
    expect(checkinFacts(c({ physical_readiness: 4, pain_location: ["right_elbow"], pain_scale: 3 }))).toEqual(["Body readiness: 4/5", "Pain: right elbow (rating 3)"]);
    expect(checkinFacts(c({}))).toEqual([]);
  });
  it("counts each pain day once", () => {
    expect(painDays([c({ pain_location: ["knee"] }), c({ pain_location: ["hip"] }), c({ entry_date: "2026-10-11" })])).toBe(1);
  });
});

import { checkinDays } from "./readiness";
describe("check-in attendance", () => {
  it("counts distinct check-in days in the window", () => {
    const done = [
      { entry_date: "2026-10-12", quiz_type: "morning", completed_at: "" },
      { entry_date: "2026-10-12", quiz_type: "night", completed_at: "" },
      { entry_date: "2026-10-06", quiz_type: "morning", completed_at: "" },
      { entry_date: "2026-10-05", quiz_type: "morning", completed_at: "" },
    ];
    expect(checkinDays(done, "2026-10-12", 7)).toBe(2);
  });
});
