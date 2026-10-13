import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sponsorshipGivesAccess, sponsorshipFromStripe, graceUntil, GRACE_DAYS } from "./sponsorship.ts";

const now = Date.parse("2026-10-13T00:00:00Z");
const base = { id: "x", sport: "baseball", tier: "5tool" };
Deno.test("active and scheduled sponsorships give access", () => {
  assertEquals(sponsorshipGivesAccess({ ...base, status: "active" }, now), true);
  assertEquals(sponsorshipGivesAccess({ ...base, status: "scheduled" }, now), true);
});
Deno.test("pause: access through the paid period, then off", () => {
  assertEquals(sponsorshipGivesAccess({ ...base, status: "paused", paid_through: "2026-10-20T00:00:00Z" }, now), true);
  assertEquals(sponsorshipGivesAccess({ ...base, status: "paused", paid_through: "2026-10-12T00:00:00Z" }, now), false);
});
Deno.test("cancel: 14-day grace, then off", () => {
  const g = graceUntil(now);
  assertEquals(g, "2026-10-27T00:00:00.000Z");
  assertEquals(GRACE_DAYS, 14);
  assertEquals(sponsorshipGivesAccess({ ...base, status: "canceled", grace_until: g }, now + 13 * 86400_000), true);
  assertEquals(sponsorshipGivesAccess({ ...base, status: "canceled", grace_until: g }, now + 15 * 86400_000), false);
});
Deno.test("pending (not paid) and ended give no access", () => {
  assertEquals(sponsorshipGivesAccess({ ...base, status: "pending" }, now), false);
  assertEquals(sponsorshipGivesAccess({ ...base, status: "ended" }, now), false);
});
Deno.test("Stripe pause maps to paused with paid_through = period end", () => {
  const r = sponsorshipFromStripe({ status: "active", pause_collection: { behavior: "void" }, current_period_end: 1760918400 }, { status: "active" });
  assertEquals(r.status, "paused");
  assertEquals((r as any).paid_through, new Date(1760918400 * 1000).toISOString());
});
Deno.test("Stripe cancel keeps an existing grace date", () => {
  const r = sponsorshipFromStripe({ status: "canceled", current_period_end: 1 }, { status: "canceled", grace_until: "2026-10-27T00:00:00Z" });
  assertEquals((r as any).grace_until, "2026-10-27T00:00:00Z");
});
