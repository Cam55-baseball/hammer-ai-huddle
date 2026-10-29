import { describe, it, expect } from "vitest";
import { gameDayCard } from "@/lib/hammer/prescription/dailyPlan";
describe("game day card", () => {
  it("is a loggable game card that opens the games log", () => {
    const c = gameDayCard(false);
    expect(c.modality).toBe("game");
    expect(c.route).toBe("/games");
    expect(c.ctaLabel).toBe("Log this game");
    expect(c.drills).toHaveLength(0);
  });
});
