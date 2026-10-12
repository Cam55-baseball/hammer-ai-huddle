import { describe, it, expect } from "vitest";
import { checkPracticeSafety, type PracticeFacts } from "../../../supabase/functions/_shared/coach/practiceSafety";

const base: PracticeFacts = {
  date: "2026-10-20", intensity: "standard", throwing: false,
  isRestDay: false, gameOnDate: false, gameNextDay: false, inSeason: false, nextThrowDate: null,
};

describe("coach practice safety", () => {
  it("allows a normal practice", () => {
    expect(checkPracticeSafety(base).ok).toBe(true);
  });
  it("blocks the player's rest day and offers the next open day", () => {
    const r = checkPracticeSafety({ ...base, isRestDay: true }, "2026-10-21");
    expect(r.ok).toBe(false);
    expect(r.alternative?.date).toBe("2026-10-21");
  });
  it("game day allows only light", () => {
    expect(checkPracticeSafety({ ...base, gameOnDate: true }).alternative?.intensity).toBe("light");
    expect(checkPracticeSafety({ ...base, gameOnDate: true, intensity: "light" }).ok).toBe(true);
  });
  it("in season blocks high the day before a game, off season does not", () => {
    expect(checkPracticeSafety({ ...base, inSeason: true, gameNextDay: true, intensity: "high" }).alternative?.intensity).toBe("standard");
    expect(checkPracticeSafety({ ...base, inSeason: false, gameNextDay: true, intensity: "high" }).ok).toBe(true);
  });
  it("throwing waits for the pitch-count rest date", () => {
    const r = checkPracticeSafety({ ...base, throwing: true, nextThrowDate: "2026-10-22" });
    expect(r.ok).toBe(false);
    expect(r.alternative?.throwing).toBe(false);
    expect(checkPracticeSafety({ ...base, throwing: true, nextThrowDate: "2026-10-20" }).ok).toBe(true);
    expect(checkPracticeSafety({ ...base, throwing: false, nextThrowDate: "2026-10-22" }).ok).toBe(true);
  });
});
