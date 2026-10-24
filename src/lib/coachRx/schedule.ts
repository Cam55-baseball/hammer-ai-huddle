/**
 * Coach prescription scheduling (owner request Oct 24, run 6).
 * Pure date math for the four send shapes:
 *   - any_day: the player picks when (no fixed dates; anchored at send date)
 *   - date / dates: one or more specific dates
 *   - recurring: chosen weekdays for N weeks, every X weeks, or monthly
 *     (e.g. the first Tuesday), bounded by an end date or a number of times
 * No training logic lives here — this only computes which calendar days a
 * prescription appears on. Dose, safety and category rules are unchanged and
 * enforced by coach-rx-safety at choice time.
 */

export type ScheduleType = "any_day" | "date" | "dates" | "recurring";

export interface ScheduleInput {
  type: ScheduleType;
  /** Anchor date (YYYY-MM-DD). For 'date' this is the day; for recurring the series starts on/after it. */
  startDate: string;
  /** Extra specific dates for type 'dates' (startDate is always included). */
  dates?: string[];
  /** Weekdays for weekly recurrence, 0 = Sunday … 6 = Saturday. */
  weekdays?: number[];
  /** Every X weeks (default 1). */
  everyWeeks?: number;
  /** Monthly recurrence: which occurrence of the weekday (1 = first … 4 = fourth, 5 = last). */
  monthlyOrdinal?: number;
  /** Monthly recurrence: weekday 0–6. */
  monthlyWeekday?: number;
  /** Hard end date (inclusive). */
  endDate?: string;
  /** Stop after this many occurrences. */
  count?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Never materialize more than this many days for one send. */
export const MAX_OCCURRENCES = 60;
/** Recurring series never look further than this many days out. */
const HORIZON_DAYS = 366;

const parse = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
const fmt = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
};

/** The nth (1..4) or last (5) weekday of the month containing `monthStart`. */
export function monthlyOccurrence(monthStart: Date, weekday: number, ordinal: number): Date {
  const first = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1, 12));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const firstHit = addDays(first, offset);
  if (ordinal >= 5) {
    // last such weekday in the month
    let d = firstHit;
    while (addDays(d, 7).getUTCMonth() === first.getUTCMonth()) d = addDays(d, 7);
    return d;
  }
  const hit = addDays(firstHit, (ordinal - 1) * 7);
  return hit.getUTCMonth() === first.getUTCMonth() ? hit : addDays(firstHit, (ordinal - 2) * 7);
}

/**
 * Compute the sorted, unique list of days (YYYY-MM-DD) a prescription appears
 * on. Days before `today` are dropped. Returns [] for invalid input.
 */
export function computeScheduleDates(input: ScheduleInput, today: string): string[] {
  if (!DATE_RE.test(input.startDate) || !DATE_RE.test(today)) return [];
  const out = new Set<string>();
  const push = (iso: string) => {
    if (iso >= today) out.add(iso);
  };

  if (input.type === "any_day") return []; // player picks the day; nothing pre-dated

  if (input.type === "date") {
    push(input.startDate);
  } else if (input.type === "dates") {
    push(input.startDate);
    for (const d of input.dates ?? []) if (DATE_RE.test(d)) push(d);
  } else if (input.type === "recurring") {
    const start = parse(input.startDate);
    const endBound = input.endDate && DATE_RE.test(input.endDate) ? parse(input.endDate) : addDays(start, HORIZON_DAYS);
    const limit = Math.min(Math.max(input.count ?? 0, 0) || MAX_OCCURRENCES, MAX_OCCURRENCES);
    let n = 0;

    if (input.monthlyWeekday != null && input.monthlyOrdinal != null) {
      // monthly: e.g. the first Tuesday of each month
      const wd = ((input.monthlyWeekday % 7) + 7) % 7;
      const ord = Math.min(Math.max(input.monthlyOrdinal, 1), 5);
      let month = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12));
      while (month <= endBound && n < limit) {
        const occ = monthlyOccurrence(month, wd, ord);
        if (occ >= start && occ <= endBound) {
          push(fmt(occ));
          n++;
        }
        month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1, 12));
      }
    } else {
      // weekly: chosen weekdays, every X weeks
      const wds = [...new Set((input.weekdays ?? []).map((w) => ((w % 7) + 7) % 7))];
      if (wds.length === 0) return [];
      const every = Math.max(input.everyWeeks ?? 1, 1);
      // Week anchor: the Sunday of the start week.
      const week0 = addDays(start, -start.getUTCDay());
      for (let w = 0; ; w += every) {
        const weekStart = addDays(week0, w * 7);
        if (weekStart > endBound) break;
        for (const wd of wds) {
          const d = addDays(weekStart, wd);
          if (d >= start && d <= endBound) {
            push(fmt(d));
            n++;
            if (n >= limit) break;
          }
        }
        if (n >= limit) break;
      }
    }
  }

  return [...out].sort();
}

const WD_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDINAL = ["", "first", "second", "third", "fourth", "last"];

/** One-line human summary, e.g. "Mon/Wed/Fri · 4 weeks" or "First Tuesday monthly · 6 times". */
export function scheduleSummary(input: ScheduleInput): string {
  if (input.type === "any_day") return "Any day — the player picks when";
  if (input.type === "date") return `One day · ${input.startDate}`;
  if (input.type === "dates") {
    const n = 1 + (input.dates?.length ?? 0);
    return `${n} picked dates`;
  }
  if (input.monthlyWeekday != null && input.monthlyOrdinal != null) {
    const base = `${ORDINAL[Math.min(Math.max(input.monthlyOrdinal, 1), 5)]} ${WD_SHORT[((input.monthlyWeekday % 7) + 7) % 7]} monthly`;
    if (input.count) return `${base} · ${input.count} times`;
    if (input.endDate) return `${base} · until ${input.endDate}`;
    return base;
  }
  const wds = [...new Set((input.weekdays ?? []).map((w) => ((w % 7) + 7) % 7))].sort();
  const days = wds.map((w) => WD_SHORT[w]).join("/");
  const every = Math.max(input.everyWeeks ?? 1, 1);
  let base = every > 1 ? `${days} · every ${every} weeks` : days;
  if (input.count) base += ` · ${input.count} times`;
  else if (input.endDate) base += ` · until ${input.endDate}`;
  return base || "Recurring";
}
