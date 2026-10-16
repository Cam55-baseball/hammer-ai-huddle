import { describe, it, expect } from "vitest";
import { staffEligibility } from "../../supabase/functions/_shared/staffEligibility";

const now = new Date("2026-10-14T12:00:00Z");
const base = { dob: null, parentControlled: false, isCoach: false, isOrgAdmin: false, now };

describe("staff plan eligibility", () => {
  it("adult coach may buy the Coach plan", () => {
    expect(staffEligibility({ ...base, plan: "coach", isCoach: true, dob: "1985-03-15" }).ok).toBe(true);
  });
  it("coach with no birthdate on file may buy", () => {
    expect(staffEligibility({ ...base, plan: "coach", isCoach: true }).ok).toBe(true);
  });
  it("organization admin may buy the Organization plan", () => {
    expect(staffEligibility({ ...base, plan: "organization", isOrgAdmin: true, dob: "1980-01-20" }).ok).toBe(true);
  });
  it("coach who is not an org admin cannot buy the Organization plan", () => {
    expect(staffEligibility({ ...base, plan: "organization", isCoach: true }).ok).toBe(false);
  });
  it("player cannot buy the Coach plan", () => {
    expect(staffEligibility({ ...base, plan: "coach" }).ok).toBe(false);
  });
  it("17-year-old coach is refused", () => {
    expect(staffEligibility({ ...base, plan: "coach", isCoach: true, dob: "2009-10-15" }).ok).toBe(false);
  });
  it("turns 18 today is allowed", () => {
    expect(staffEligibility({ ...base, plan: "coach", isCoach: true, dob: "2008-10-14" }).ok).toBe(true);
  });
  it("parent-managed account is refused even as org admin", () => {
    expect(staffEligibility({ ...base, plan: "organization", isOrgAdmin: true, parentControlled: true }).ok).toBe(false);
  });
});

describe('coach plan message (owner 2026-10-16: no coach approvals)', () => {
  it('never tells a non-coach to wait for approval', () => {
    const r = staffEligibility({ dob: '1990-01-01', plan: 'coach', isCoach: false, isOrgAdmin: false, isOwnerOrAdmin: false, now: new Date('2026-10-16') } as any);
    expect(r.ok).toBe(false);
    expect((r as any).error).not.toMatch(/approv/i);
  });
});
