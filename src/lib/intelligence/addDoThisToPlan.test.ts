import { describe, it, expect } from "vitest";
import { addToNextAppropriateSession, candidatePlanDates } from "./addDoThisToPlan";

describe("Do this → Add to today's work", () => {
  it("tries today first, then the next six days", () => {
    expect(candidatePlanDates(new Date(2026, 9, 30))).toEqual([
      "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05",
    ]);
  });
  it("uses today when today has a matching session", async () => {
    const r = await addToNextAppropriateSession(["a", "b"], async () => ({ saved: true }));
    expect(r.date).toBe("a");
  });
  it("moves to the very next matching session when today has none", async () => {
    const tried: string[] = [];
    const r = await addToNextAppropriateSession(["a", "b", "c"], async (d) => { tried.push(d); return d === "b" ? { saved: true } : { error: "no session" }; });
    expect(r.date).toBe("b");
    expect(tried).toEqual(["a", "b"]);
  });
  it("saves nothing when no session of that kind exists", async () => {
    const r = await addToNextAppropriateSession(["a"], async () => ({ error: "no session" }));
    expect(r.date).toBeNull();
  });
  it("retains today's safety refusal rather than a later date-gate error", async () => {
    const r = await addToNextAppropriateSession(["2026-10-30", "2026-10-31"], async date => ({
      error: date === "2026-10-30" ? "There is no safe card for this category today. Keep it in Saved drills." : "Open today’s plan before adding this drill.",
    }));
    expect(r.date).toBeNull();
    expect(r.result).toEqual({ error: "There is no safe card for this category today. Keep it in Saved drills." });
  });
});
