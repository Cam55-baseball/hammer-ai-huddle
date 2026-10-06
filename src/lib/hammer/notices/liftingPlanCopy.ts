/** Display only: the scheduler counts prescribed dates, not confirmed sessions. */
export function liftingPlanCopy(detail: string): string | null {
  const count = /^(\d+) lifts already this week — today stays lighter\.$/i.exec(detail.trim());
  if (count) return `${count[1]} days with lifting planned in the previous 7 days. Completion isn't confirmed; today's work stays lighter.`;
  const last = /^Your last lift was (.+?) — we keep full rest days between lifts\.$/i.exec(detail.trim());
  if (last) return `Your last planned lifting day was ${last[1]}. Completion isn't confirmed; follow today's plan for rest between lifts.`;
  return null;
}