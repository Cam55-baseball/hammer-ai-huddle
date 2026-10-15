export type StaffRole = "coach" | "scout" | "organization";

/** Where each staff path goes right after the account is created. */
export const STAFF_NEXT: Record<StaffRole, string> = {
  coach: "/onboarding/coach",
  scout: "/scout-application",
  organization: "/organization/setup",
};

/** Staff accounts are adults only. Returns a plain reason, or null when OK. */
export function staffAgeProblem(dob: string, today = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "Enter your date of birth.";
  const d = new Date(dob + "T00:00:00");
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  if (age < 18) return "Coach, scout and organization accounts are for adults 18 and over. Players can sign up as a player instead.";
  return null;
}
