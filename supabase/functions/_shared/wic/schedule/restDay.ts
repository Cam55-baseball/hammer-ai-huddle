/**
 * Owner Nov 1 B1/B2: the player chooses the weekly rest day.
 * Weeks run Monday → Sunday (the builder's existing week). Default rest = Sunday.
 * A "week" choice binds only its Monday-start week; an "indefinite" choice binds
 * from its effective week onward. The newest applicable choice wins.
 */
export type RestChoice = {
  rest_dow: number;
  scope: 'week' | 'indefinite';
  week_start: string; // Monday of the week it applies to (indefinite: first week)
  created_at: string;
  undone_at?: string | null;
};

export const DEFAULT_REST_DOW = 0;

export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function dateForDow(weekStart: string, dow: number): string {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const validDow = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6;

export function restDowFor(date: string, choices: ReadonlyArray<RestChoice> | null | undefined): number {
  const ws = mondayOf(date);
  const live = (choices ?? []).filter(c => !c.undone_at && validDow(c.rest_dow));
  const byNewest = [...live].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const week = byNewest.find(c => c.scope === 'week' && c.week_start === ws);
  if (week) return week.rest_dow;
  const ind = byNewest.find(c => c.scope === 'indefinite' && c.week_start <= ws);
  return ind ? ind.rest_dow : DEFAULT_REST_DOW;
}

export function restDateFor(date: string, choices: ReadonlyArray<RestChoice> | null | undefined): string {
  return dateForDow(mondayOf(date), restDowFor(date, choices));
}

export type RestMoveVerdict =
  | { ok: true; weekStart: string; restDate: string }
  | { ok: false; reason: string };

/**
 * A rest day already used (its date passed, or it is today and done) can't be moved,
 * and the new rest day can't be in the past. For "indefinite" when this week's
 * rest is already used, the change starts next week.
 */
export function judgeRestMove(i: {
  today: string; target: string; scope: 'week' | 'indefinite';
  choices: ReadonlyArray<RestChoice>; todayRestDone?: boolean;
}): RestMoveVerdict {
  const ws = mondayOf(i.today);
  const current = restDateFor(i.today, i.choices);
  const used = current < i.today || (current === i.today && i.todayRestDone === true);
  if (i.target < i.today) return { ok: false, reason: "That day has already passed. Pick today or a later day." };
  if (i.target === current) return { ok: false, reason: "That's already your rest day." };
  if (i.scope === 'week') {
    if (mondayOf(i.target) !== ws) return { ok: false, reason: "Pick a day in this week (Monday to Sunday)." };
    if (used) return { ok: false, reason: "You already used this week's rest day, so it can't be moved." };
    return { ok: true, weekStart: ws, restDate: i.target };
  }
  const dow = new Date(`${i.target}T12:00:00Z`).getUTCDay();
  const start = used || mondayOf(i.target) !== ws ? dateForDow(isoAddDays(ws, 7), 1) : ws;
  return { ok: true, weekStart: start, restDate: dateForDow(start, dow) };
}

function isoAddDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
