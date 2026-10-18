import { expect, it } from "vitest";
import { subscriberBreakdown } from "./subscriberBreakdown";
it("counts only current plans and shows organization seats and sponsorships", () => {
  const result = subscriberBreakdown([{ user_id: "a", tier: "pitcher", subscribed_modules: ["baseball_pitcher"] }, { user_id: "b", tier: null, subscribed_modules: ["baseball_hitting"] }], [{ user_id: "c", plan: "organization", included_seats: 5, extra_seats: 1 }], [{ player_id: "d", tier: "5tool" }]);
  expect(result.totalActiveSubscribers).toBe(3);
  expect(result.moduleBreakdown.map((r) => r.module)).toEqual(["Baseball - Complete Pitcher", "Hammers Organization (6 coach seats)", "Sponsorship - 5Tool Player"]);
});