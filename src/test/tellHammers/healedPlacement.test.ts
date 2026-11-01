import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("owner Nov 1 B4: healed / full-go step placement", () => {
  it("is not on Hammers Today", () => expect(readFileSync("src/components/hammer/HammerDailyPlan.tsx", "utf8")).not.toMatch(/ActiveInjuryCards/));
  it("lives inside the Update Hammer drop-down, not the check-in", () => expect(readFileSync("src/components/hammer/TellHammersInbox.tsx", "utf8")).toMatch(/\{!checkIn && <ActiveInjuryCards \/>\}/));
});
