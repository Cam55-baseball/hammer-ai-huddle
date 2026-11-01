/**
 * Owner Nov 1 (round 2 item 4): a saved 7-day window that misses its rest day,
 * has two rest days, or misses a weekly minimum is rebuilt through the real
 * builder, never only flagged. Logged or marked dates are never rebuilt.
 * Player skips/overdoing are Discipline behavior, so they are not read here.
 * Pure.
 */
const FLOOR = /^(Hitting|Defense|Baserunning|Conditioning|Bunting):\d+\/\d+$/;
export function weekRuleBreaks(issues: readonly string[]): string[] {
  return issues.filter((i) => i.startsWith('rest_days:') || FLOOR.test(i) || /:thin_day$/.test(i));
}
export function datesToRebuild(window: readonly string[], protectedDates: ReadonlySet<string>): string[] {
  return window.filter((d) => !protectedDates.has(d));
}
const NAMES: Record<string, string> = { Hitting: 'hitting', Defense: 'defense', Baserunning: 'baserunning', Conditioning: 'running conditioning', Bunting: 'bunting' };
/** Plain reason shown when a rebuild still can't meet the written rules. */
export function blockedReason(breaks: readonly string[]): string {
  const parts: string[] = [];
  for (const b of breaks) {
    const rest = /^rest_days:(\d+)\/1$/.exec(b);
    if (rest) { parts.push(Number(rest[1]) === 0 ? 'no rest day' : `${rest[1]} rest days instead of 1`); continue; }
    const f = /^(\w+):(\d+)\/(\d+)$/.exec(b);
    if (f && NAMES[f[1]]) parts.push(`${NAMES[f[1]]} ${f[2]} of ${f[3]} days`);
    else if (b.endsWith(':thin_day')) parts.push(`${b.slice(0, 10)} has no training`);
  }
  return `Hammer couldn't fix your week: ${parts.join(', ')}. Days you already logged or marked stay as they are, and your equipment, injury and schedule limits still apply.`;
}
