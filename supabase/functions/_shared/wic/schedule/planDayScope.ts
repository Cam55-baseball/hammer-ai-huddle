/** Whole-plan rest is distinct from a lift-spacing verdict. Never widens lift legality. */
export function wholePlanRest(planDate: string, hold = false): boolean {
  return hold || new Date(`${planDate}T12:00:00Z`).getUTCDay() === 0;
}

export function savedWholePlanRest(planDate: string, rows: readonly { why_payload?: unknown }[]): boolean {
  return wholePlanRest(planDate) || rows.some(row => {
    const payload = row.why_payload as { full_plan_rest?: boolean } | undefined;
    return payload?.full_plan_rest === true;
  });
}