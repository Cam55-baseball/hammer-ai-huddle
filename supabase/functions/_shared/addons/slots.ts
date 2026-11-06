// Lesson slot math. Pure. Owner hours are in the owner's time zone; slots are returned in UTC.

export interface LessonHours {
  time_zone: string;
  weekdays: number[]; // 0=Sun … 6=Sat
  start_minute: number;
  end_minute: number;
  min_notice_hours: number;
  max_weeks_ahead: number;
  lesson_minutes: number;
}

export const DEFAULT_LESSON_HOURS: LessonHours = {
  time_zone: "America/New_York",
  weekdays: [1, 2, 3, 4, 5],
  start_minute: 540,
  end_minute: 1020,
  min_notice_hours: 48,
  max_weeks_ahead: 8,
  lesson_minutes: 60,
};

export interface Interval { start: string; end: string }

function partsIn(tz: string, ms: number) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
  return p;
}

function offsetMs(tz: string, ms: number): number {
  const p = partsIn(tz, ms);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock time in tz → UTC ms. */
export function zonedToUtc(y: number, m: number, d: number, minute: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, Math.floor(minute / 60), minute % 60);
  let ms = guess - offsetMs(tz, guess);
  ms = guess - offsetMs(tz, ms);
  return ms;
}

/** Calendar date (YYYY-MM-DD) of an instant in tz. */
export function dayKey(iso: string, tz: string): string {
  const p = partsIn(tz, new Date(iso).getTime());
  return `${p.year}-${p.month}-${p.day}`;
}

const overlaps = (a0: number, a1: number, b: Interval) => a0 < new Date(b.end).getTime() && new Date(b.start).getTime() < a1;

export function openSlots(h: LessonHours, now: Date, busy: Interval[]): Interval[] {
  const out: Interval[] = [];
  const earliest = now.getTime() + h.min_notice_hours * 3600000;
  const latest = now.getTime() + h.max_weeks_ahead * 7 * 86400000;
  const len = h.lesson_minutes * 60000;
  const wk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let dayMs = now.getTime(); dayMs <= latest + 86400000; dayMs += 86400000) {
    const p = partsIn(h.time_zone, dayMs);
    if (!h.weekdays.includes(wk.indexOf(p.weekday))) continue;
    for (let m = h.start_minute; m + h.lesson_minutes <= h.end_minute; m += h.lesson_minutes) {
      const s = zonedToUtc(+p.year, +p.month, +p.day, m, h.time_zone);
      const e = s + len;
      if (s < earliest || s > latest) continue;
      if (busy.some((b) => overlaps(s, e, b))) continue;
      out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  }
  // dedupe (DST / loop overlap)
  return out.filter((x, i, a) => a.findIndex((y) => y.start === x.start) === i).sort((a, b) => a.start.localeCompare(b.start));
}

export type PickCheck = { ok: true } | { ok: false; reason: string };

/** Exactly 4 open slots, on 4 different days (owner's calendar days). */
export function validatePicks(picks: string[], open: Interval[], h: LessonHours, count = 4): PickCheck {
  if (!Array.isArray(picks) || picks.length !== count) return { ok: false, reason: `Pick exactly ${count} times.` };
  const norm = picks.map((p) => new Date(p).toISOString());
  const openSet = new Set(open.map((o) => o.start));
  if (norm.some((p) => !openSet.has(p))) return { ok: false, reason: "One of those times isn't open anymore. Pick again." };
  const days = new Set(norm.map((p) => dayKey(p, h.time_zone)));
  if (days.size !== count) return { ok: false, reason: "Each lesson must be on a different day." };
  return { ok: true };
}
