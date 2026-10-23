/**
 * Owner cadences (Oct 20) for tool reminders. One card, one button, only on a
 * day that already has the skill; never adds a session or changes a dose.
 */
const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00Z`);
const daysSince = (from: string | null | undefined, today: string) => {
  if (!from) return null;
  const t = day(from);
  return Number.isFinite(t) ? Math.floor((day(today) - t) / 86_400_000) : NaN;
};

export interface ToolPromptInput {
  enabled: boolean;
  today: string;
  /** Today's plan already has hitting (or the skill this tool supports). */
  skillToday: boolean;
  /** Dates (YYYY-MM-DD) the player used the tool, any order. */
  uses: readonly string[];
}

/** Royal timing: once every 2–3 weeks — due from day 14 since last use. */
export function royalTimingDue(i: ToolPromptInput): boolean {
  if (!i.enabled || !i.skillToday) return false;
  const valid = i.uses.filter((u) => Number.isFinite(day(u)));
  if (valid.length !== i.uses.length) return false; // unknown date: fail closed
  if (valid.length === 0) return true;
  const last = valid.reduce((a, b) => (day(a) > day(b) ? a : b));
  return (daysSince(last, i.today) ?? 0) >= 14;
}

export interface DelaycamPromptInput extends ToolPromptInput {
  majorMechanicalFlag: boolean;
  mechanicsGoal: boolean;
  offSeason: boolean;
}

/** Target uses per week: 3 for heavy-mechanics players, else 1. */
export function delaycamWeeklyTarget(i: Pick<DelaycamPromptInput, "majorMechanicalFlag" | "mechanicsGoal" | "offSeason">): number {
  return i.majorMechanicalFlag || i.mechanicsGoal || i.offSeason ? 3 : 1;
}

/** Due while uses in the last 7 days are below target, with a day's gap after a use. */
export function delaycamDue(i: DelaycamPromptInput): boolean {
  if (!i.enabled || !i.skillToday) return false;
  // Several exercises may use the mirror on one training day; that is one weekly use day.
  const ages = [...new Set(i.uses.map(u => u.slice(0, 10)))].map((u) => daysSince(u, i.today));
  if (ages.some((a) => a === null || Number.isNaN(a))) return false;
  const week = (ages as number[]).filter((a) => a >= 0 && a < 7);
  if (week.some((a) => a === 0)) return false;
  const target = delaycamWeeklyTarget(i);
  if (week.length >= target) return false;
  return target === 1 || !week.some((a) => a === 1);
}

export const ROYAL_TIMING_WHY =
  "Royal timing shows you timing in all areas of your game. If you're fully loaded on time or if you have your foot down ready to see the ball in time. It can show you the jump you had was good, elite or very bad when stealing a base or reacting on defense. It can show you how long you took to get the ball to your target from the time it hits your glove on defense. It can show you your time to first base. Pro teams use this tool often. It helps you be on time more often in all areas because timing means everything in a game of inches.";
export const DELAYCAM_WHY =
  "Delaycam shows your swing back a few seconds later, so you can see what you just did and fix it on the next rep. It works on your phone, or cast it to a big TV.";
export const ROYAL_TIMING_PROMPT = "Do a Royal timing round today.";
export const DELAYCAM_PROMPT = "Use Delaycam during today's hitting.";
