/**
 * THE hip-load unlock switch (owner, pending validation).
 *
 * While false, the two hip-load tiles — P1 `hip_load` and P3
 * `back_hip_socket_hold` (tile 20) — are staff-only, so athlete P1 and P3 show
 * INCOMPLETE. Flip to true when the owner confirms; category scores are
 * computed at render time from the saved landmarks, so P1 and P3 recompute on
 * the next view with no other change and no deploy.
 *
 * Do not flip without the owner's explicit confirmation.
 */
export const HIP_LOAD_ATHLETE_UNLOCKED = false;

export const HIP_LOAD_TILE_KEYS = ["hip_load", "back_hip_socket_hold"] as const;

export function hipLoadIsStaffOnly(unlocked: boolean = HIP_LOAD_ATHLETE_UNLOCKED): boolean {
  return !unlocked;
}
