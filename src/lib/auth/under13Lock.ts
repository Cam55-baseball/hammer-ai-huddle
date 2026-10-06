/**
 * Under-13 signup block (owner ruling 2026-10-06). When someone enters an
 * under-13 birthdate, no account is created, nothing they typed is kept, and
 * this device refuses a new signup attempt for 30 days. The lock holds only
 * an expiry timestamp — no birthdate, name or email.
 */
export const UNDER_13_MESSAGE = "Players under 13 need a parent or guardian to set up and manage their account.";
export const UNDER_13_LOCK_KEY = "hm_signup_lock_until";
export const UNDER_13_LOCK_DAYS = 30;

export function yearsOldFromDob(raw: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return Number.isFinite(age) ? age : null;
}

export function lockSignupDevice(now = Date.now()): void {
  try { localStorage.setItem(UNDER_13_LOCK_KEY, String(now + UNDER_13_LOCK_DAYS * 86_400_000)); } catch { /* storage unavailable */ }
}

export function isSignupDeviceLocked(now = Date.now()): boolean {
  try {
    const until = Number(localStorage.getItem(UNDER_13_LOCK_KEY) ?? 0);
    if (until > now) return true;
    if (until) localStorage.removeItem(UNDER_13_LOCK_KEY);
  } catch { /* storage unavailable */ }
  return false;
}
