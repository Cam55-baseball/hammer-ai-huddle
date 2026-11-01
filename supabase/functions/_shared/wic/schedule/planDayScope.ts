/** Whole-plan rest is distinct from a lift-spacing verdict. Never widens lift legality. */
export function wholePlanRest(planDate: string, hold = false, restDow = 0): boolean {
  return hold || new Date(`${planDate}T12:00:00Z`).getUTCDay() === restDow;
}

/**
 * Saved plans carry the builder's own full_plan_rest stamp (true/false), which
 * reflects the player's chosen rest day. Older rows without a stamp fall back
 * to the Sunday default.
 */
export function savedWholePlanRest(planDate: string, rows: readonly { why_payload?: unknown }[]): boolean {
  const stamped = rows.map(row => (row.why_payload as { full_plan_rest?: unknown } | undefined)?.full_plan_rest)
    .filter((v): v is boolean => typeof v === 'boolean');
  if (stamped.length) return stamped.some(Boolean);
  return wholePlanRest(planDate);
}
