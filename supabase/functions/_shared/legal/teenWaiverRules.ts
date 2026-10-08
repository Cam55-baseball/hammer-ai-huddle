/**
 * legal_v2 — 13–17 parent waiver gating rules (pure; shared by the backend and tests).
 * New teen accounts lock physical training until a parent signs.
 * Existing teens (account older than 24 h when they first meet the rule) get 14 days of grace.
 * LAWYER: these timings are open question in the review packet.
 */
export const GRACE_DAYS = 14;
export const EXISTING_ACCOUNT_HOURS = 24;
export const REMINDER_EVERY_DAYS = 3;
export const LINK_VALID_DAYS = 30;
const DAY = 86_400_000;

export function ageOn(dob: string | null | undefined, now: Date): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}/.test(dob)) return null;
  const [y, m, d] = dob.slice(0, 10).split("-").map(Number);
  let a = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) a -= 1;
  return a;
}

export const needsTeenWaiver = (age: number | null) => age !== null && age >= 13 && age <= 17;

/** Kind and grace end for a teen meeting the rule for the first time. */
export function firstSeen(accountCreatedAt: string, now: Date): { kind: "new" | "existing"; grace_until: string | null } {
  const existing = now.getTime() - new Date(accountCreatedAt).getTime() > EXISTING_ACCOUNT_HOURS * 3_600_000;
  return existing
    ? { kind: "existing", grace_until: new Date(now.getTime() + GRACE_DAYS * DAY).toISOString() }
    : { kind: "new", grace_until: null };
}

/** Physical training locked? (signed → never) */
export function isLocked(row: { signed_at: string | null; grace_until: string | null }, now: Date): boolean {
  if (row.signed_at) return false;
  if (!row.grace_until) return true;
  return now.getTime() >= new Date(row.grace_until).getTime();
}

export function reminderDue(row: { signed_at: string | null; grace_until: string | null; parent_email: string | null; last_sent_at: string | null; last_reminder_at: string | null }, now: Date): boolean {
  if (row.signed_at || !row.grace_until || !row.parent_email) return false;
  if (now.getTime() >= new Date(row.grace_until).getTime()) return false;
  const last = Math.max(new Date(row.last_sent_at ?? 0).getTime(), new Date(row.last_reminder_at ?? 0).getTime());
  return now.getTime() - last >= REMINDER_EVERY_DAYS * DAY;
}

export const daysLeft = (graceUntil: string | null, now: Date) =>
  graceUntil ? Math.max(0, Math.ceil((new Date(graceUntil).getTime() - now.getTime()) / DAY)) : 0;
