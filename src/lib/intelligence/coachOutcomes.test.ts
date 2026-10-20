import { describe, it, expect } from "vitest";
import { mapCoachOutcomes } from "./coachOutcomes";

const day = 86_400_000;
const t0 = Date.parse("2026-09-01T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("mapCoachOutcomes", () => {
  it("denied viewers get nothing", () => {
    expect(mapCoachOutcomes({ state: "denied" })).toEqual({ state: "denied" });
    expect(mapCoachOutcomes(null)).toEqual({ state: "unavailable" });
    expect(mapCoachOutcomes({})).toEqual({ state: "unavailable" });
  });

  it("judges rows with the owner rules, not the server's band", () => {
    const res = mapCoachOutcomes({
      state: "ok",
      outcomes: [{
        area: "hitting", do_this: "Two rounds of flips",
        baseline_value: 60, recheck_value: 62.5,
        followed_at: iso(t0), checked_at: iso(t0 + 21 * day),
      }],
    });
    expect(res.state).toBe("ok");
    if (res.state !== "ok") return;
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].label).toBe("It worked");
  });

  it("an unverifiable window is Need more data, never a guess", () => {
    const res = mapCoachOutcomes({
      state: "ok",
      outcomes: [{ area: "hitting", do_this: "Flips", baseline_value: 60, recheck_value: 70 }],
    });
    if (res.state !== "ok") throw new Error("expected ok");
    expect(res.rows[0].label).toBe("Need more data");
  });

  it("skips malformed rows instead of inventing values", () => {
    const res = mapCoachOutcomes({
      state: "ok",
      outcomes: [{ do_this: 42 }, "junk", { area: "fielding", do_this: "Reads", baseline_value: 50, recheck_value: 49, followed_at: iso(t0), checked_at: iso(t0 + 14 * day) }],
    });
    if (res.state !== "ok") throw new Error("expected ok");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].area).toBe("fielding");
  });
});
