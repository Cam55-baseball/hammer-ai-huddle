import { describe, it, expect } from "vitest";
import { ageOn, firstSeen, isLocked, needsTeenWaiver, reminderDue } from "../../../supabase/functions/_shared/legal/teenWaiverRules";

const now = new Date("2026-10-08T16:00:00Z");
describe("13–17 parent waiver rules", () => {
  it("applies to ages 13 through 17 only", () => {
    expect([12, 13, 17, 18].map(needsTeenWaiver)).toEqual([false, true, true, false]);
    expect(needsTeenWaiver(ageOn("2013-10-09", now))).toBe(false); // still 12
  });
  it("new teen account (under 24 h) is locked at once", () => {
    const f = firstSeen("2026-10-08T10:00:00Z", now);
    expect(f.kind).toBe("new");
    expect(isLocked({ signed_at: null, grace_until: f.grace_until }, now)).toBe(true);
  });
  it("existing teen gets exactly 14 days of grace, then locks", () => {
    const f = firstSeen("2026-01-01T00:00:00Z", now);
    expect(f.grace_until).toBe("2026-10-22T16:00:00.000Z");
    expect(isLocked({ signed_at: null, grace_until: f.grace_until }, new Date("2026-10-22T15:59:00Z"))).toBe(false);
    expect(isLocked({ signed_at: null, grace_until: f.grace_until }, new Date("2026-10-22T16:00:00Z"))).toBe(true);
  });
  it("a parent signature unlocks", () => {
    expect(isLocked({ signed_at: "2026-10-09T00:00:00Z", grace_until: null }, now)).toBe(false);
  });
  it("reminders every 3 days during grace only", () => {
    const base = { signed_at: null, grace_until: "2026-10-20T00:00:00Z", parent_email: "p@x.com", last_reminder_at: null };
    expect(reminderDue({ ...base, last_sent_at: "2026-10-06T16:00:00Z" }, now)).toBe(false);
    expect(reminderDue({ ...base, last_sent_at: "2026-10-05T16:00:00Z" }, now)).toBe(true);
    expect(reminderDue({ ...base, grace_until: "2026-10-01T00:00:00Z", last_sent_at: null }, now)).toBe(false);
  });
});
