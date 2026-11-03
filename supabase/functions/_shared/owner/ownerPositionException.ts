/**
 * Owner Nov 2 #6 (confirmed Nov 3): EXACTLY ONE account — the owner Cam Williams —
 * gets a position-player schedule and is never asked the two-way/pitcher questions.
 * No other account is affected, including other owner-role accounts.
 * Mirrored in SQL by public.initial_plan_missing (same literal ID).
 */
export const OWNER_POSITION_ONLY_USER_ID = "95de827d-7418-460b-8b79-267bf79bdca4";

export function ownerPositionOnly(userId: string | null | undefined): boolean {
  return userId === OWNER_POSITION_ONLY_USER_ID;
}
