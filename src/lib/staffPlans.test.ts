import { describe, it, expect } from "vitest";
import { staffPlanFromItems, STAFF_PRICES, ORG_INCLUDED_SEATS } from "../../supabase/functions/_shared/staffPlans";

const item = (id: string, quantity = 1) => ({ price: { id }, quantity });

describe("staff plan entitlements", () => {
  it("Coach plan = coach, no seats", () => {
    expect(staffPlanFromItems([item(STAFF_PRICES.coach)])).toEqual({ plan: "coach", included_seats: 0, extra_seats: 0 });
  });
  it("Organization includes 5 seats and bills extra seats by quantity", () => {
    expect(ORG_INCLUDED_SEATS).toBe(5);
    expect(staffPlanFromItems([item(STAFF_PRICES.organization), item(STAFF_PRICES.extraSeat, 3)]))
      .toEqual({ plan: "organization", included_seats: 5, extra_seats: 3 });
  });
  it("player plans give no staff plan", () => {
    expect(staffPlanFromItems([item("price_1T3jzxGc5QIzbAH6XoqPgC1b")])).toBeNull();
  });
});
