// Who may buy a staff plan. Adults only (known birthdate under 18 or a parent-managed
// account is refused; staff signup does not ask for a birthdate, so a missing one is allowed).
// Coach plan: a coach or an organization admin. Organization plan: an organization admin
// (owner of an organization, or an active admin member). Pending verification may still buy.
export type StaffEligibilityInput = {
  plan: "coach" | "organization";
  dob: string | null;
  parentControlled: boolean;
  isCoach: boolean;
  isOrgAdmin: boolean;
  isOwnerOrAdmin?: boolean;
  now?: Date;
};
export type StaffEligibility = { ok: true } | { ok: false; error: string; code: string };

export function ageFromDob(dob: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() < d)) age -= 1;
  return age;
}

export function staffEligibility(i: StaffEligibilityInput): StaffEligibility {
  const age = i.dob ? ageFromDob(i.dob, i.now) : null;
  if (i.parentControlled || (age !== null && age < 18)) {
    return { ok: false, code: "minor", error: "Coach and Organization plans are for adults 18 and over. Player accounts for under-18s can't buy staff plans." };
  }
  if (i.isOwnerOrAdmin) return { ok: true };
  if (i.plan === "organization" && !i.isOrgAdmin) {
    return { ok: false, code: "not_org_admin", error: "The Organization plan is for organization admins. Set up your organization first, then come back to subscribe." };
  }
  if (i.plan === "coach" && !i.isCoach && !i.isOrgAdmin) {
    return { ok: false, code: "not_coach", error: "The Coach plan is for approved coach accounts. If you've applied as a coach, you can subscribe as soon as your application is approved." };
  }
  return { ok: true };
}
