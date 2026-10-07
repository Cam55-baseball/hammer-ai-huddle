/** Display only: keeps each notice line true to what the scheduler counted. */
export function liftingPlanCopy(detail: string): string | null {
  // The scheduler emits "N lifts already this week" only when every one of those
  // lifting days was checked off (or fully logged as done), so "checked off" is
  // always accurate here. Partial weeks arrive as "N lifting days planned this
  // week, D checked off" and pass through unchanged.
  const count = /^(\d+) lifts already this week — today stays lighter\.$/i.exec(detail.trim());
  if (count) return `${count[1]} lifting sessions checked off in the previous 7 days — today stays lighter.`;
  return null;
}
