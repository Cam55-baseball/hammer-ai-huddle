/**
 * Owner Nov 1 round 4 — GREENLIGHT STEP-UP RULE. Pure; shared by the app and server.
 *
 * Per area, per completed Mon–Sun week:
 *  - GREEN: at least 85% of that area's prescribed work completed AND positive
 *    check-ins (ready, no pain flag) on at least 5 of 7 days.
 *  - RED: a pain flag, under 60% done, or 3+ low-readiness days.
 *  - MIXED: anything else. A week with no prescribed work in the area is NONE (holds).
 * Adults step up ONE level after 1 green week. Youth (under 19) need 3 green weeks in a row.
 * Mixed holds (and breaks a youth streak). Red steps back one level.
 * A step is small (+5–8% or one progression rung) and never above the existing weekly
 * build caps. Every result carries a plain "Because" line.
 */

export type GreenlightArea =
  | "throwing" | "hitting" | "defense" | "bunting" | "speed"
  | "conditioning" | "lifting" | "jumps" | "pitching";

export const GREENLIGHT_AREAS: readonly GreenlightArea[] = [
  "throwing", "hitting", "defense", "bunting", "speed", "conditioning", "lifting", "jumps", "pitching",
];

/** Most conservative sensible step per area. Volume areas use a %; the rest one rung. */
export const GREENLIGHT_STEP: Record<GreenlightArea, { kind: "pct"; pct: number } | { kind: "rung" }> = {
  throwing: { kind: "pct", pct: 0.05 },     // throws: +5%
  hitting: { kind: "pct", pct: 0.06 },      // swings: +6%
  defense: { kind: "pct", pct: 0.06 },      // reps: +6%
  bunting: { kind: "pct", pct: 0.06 },      // bunt reps: +6%
  speed: { kind: "pct", pct: 0.05 },        // sprint yards: +5%
  conditioning: { kind: "pct", pct: 0.05 }, // conditioning yards/rounds: +5%
  pitching: { kind: "pct", pct: 0.05 },     // pitch count: +5% (arm rules still bind)
  lifting: { kind: "rung" },                // one progression rung
  jumps: { kind: "rung" },                  // one progression rung
};

export const GREEN_DONE = 0.85;
export const GREEN_POSITIVE_DAYS = 5;
export const RED_DONE = 0.6;
export const RED_LOW_DAYS = 3;
export const YOUTH_GREEN_WEEKS = 3;
export const YOUTH_MAX_AGE = 18;

export type WeekColor = "green" | "mixed" | "red" | "none";

export interface DayCheckIn {
  date: string;
  /** 0–1 normalized readiness, null when the check-in had no readiness answer. */
  readiness: number | null;
  pain: boolean;
}
export const READY_AT = 0.6;
export const LOW_BELOW = 0.4;

export interface AreaWeek {
  /** Monday of the week (YYYY-MM-DD). */
  weekStart: string;
  prescribed: number;
  completed: number;
}

export function weekColor(area: AreaWeek, checkIns: readonly DayCheckIn[]): WeekColor {
  if (!(area.prescribed > 0)) return "none";
  const done = Math.min(1, area.completed / area.prescribed);
  const days = checkIns.filter((c) => inWeek(c.date, area.weekStart));
  const pain = days.some((c) => c.pain);
  const low = days.filter((c) => c.readiness != null && c.readiness < LOW_BELOW).length;
  if (pain || done < RED_DONE || low >= RED_LOW_DAYS) return "red";
  const positive = days.filter((c) => !c.pain && c.readiness != null && c.readiness >= READY_AT).length;
  return done >= GREEN_DONE && positive >= GREEN_POSITIVE_DAYS ? "green" : "mixed";
}

export interface GreenlightResult {
  /** Level change from the starting point (≥ 0 never below the start). */
  level: number;
  /** This week's change: +1, 0 or −1. */
  change: -1 | 0 | 1;
  lastColor: WeekColor | null;
  /** Youth: green weeks in a row toward the next step. */
  streak: number;
  because: string;
}

const AREA_WORDS: Record<GreenlightArea, string> = {
  throwing: "throwing", hitting: "hitting", defense: "defense", bunting: "bunting", speed: "sprints",
  conditioning: "conditioning", lifting: "lifting", jumps: "jumps", pitching: "pitching",
};

export function isGreenlightYouth(age: number | null): boolean { return age !== null && age <= YOUTH_MAX_AGE; }

/** Walk completed weeks oldest → newest from the starting point (level 0). */
export function greenlightLevel(area: GreenlightArea, colors: readonly WeekColor[], age: number | null): GreenlightResult {
  const youth = isGreenlightYouth(age);
  const need = youth ? YOUTH_GREEN_WEEKS : 1;
  let level = 0, streak = 0, change: -1 | 0 | 1 = 0;
  for (const c of colors) {
    change = 0;
    if (c === "green") {
      streak += 1;
      if (streak >= need) { level += 1; change = 1; streak = 0; }
    } else if (c === "red") {
      if (level > 0) { level -= 1; change = -1; }
      streak = 0;
    } else if (c === "mixed") {
      streak = 0;
    }
    // "none" (no work prescribed in the area) holds and keeps the streak.
  }
  const last = colors.length ? colors[colors.length - 1] : null;
  return { level, change, lastColor: last, streak, because: becauseLine(area, last, change, streak, need) };
}

function becauseLine(area: GreenlightArea, last: WeekColor | null, change: -1 | 0 | 1, streak: number, need: number): string {
  const a = AREA_WORDS[area];
  if (last === null || last === "none") return `Because: no finished ${a} week to judge yet, so your ${a} stays where it is.`;
  if (change === 1) return `Because: last week you finished at least 85% of your ${a} and felt ready with no pain on 5+ days, so your ${a} steps up a little.`;
  if (change === -1) return `Because: last week had pain, less than 60% of your ${a} done, or 3+ low-energy days, so your ${a} steps back one level.`;
  if (last === "red") return `Because: last week had pain, less than 60% of your ${a} done, or 3+ low-energy days, so your ${a} stays at your starting level.`;
  if (last === "green") return `Because: that's ${streak} of ${need} strong ${a} weeks in a row. You step up after ${need}.`;
  return `Because: last week was a mixed ${a} week, so your ${a} holds steady.`;
}

/**
 * Apply a level to a starting volume. Each level is one small step, and a single
 * week's change never passes the existing weekly build cap (`maxWeeklyJump`).
 */
export function applyGreenlight(area: GreenlightArea, start: number, level: number, previous: number | null, maxWeeklyJump: number): number {
  const step = GREENLIGHT_STEP[area];
  if (step.kind === "rung") return start + level; // caller maps rungs to its own written ladder
  const target = start * Math.pow(1 + step.pct, level);
  if (previous == null || previous <= 0) return Math.round(target);
  return Math.round(Math.min(target, previous * (1 + maxWeeklyJump)));
}

/** Monday (YYYY-MM-DD) of the week containing `date`. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function inWeek(date: string, weekStart: string): boolean {
  const end = new Date(`${weekStart}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
  return date >= weekStart && date <= end.toISOString().slice(0, 10);
}

/** Map a saved card slot to its progressing area (null = not a progressing area). */
export function areaOfSlot(slot: string): GreenlightArea | null {
  const s = slot.toLowerCase();
  if (/bunt/.test(s)) return "bunting";
  if (/pitch/.test(s)) return "pitching";
  if (/throw|arm/.test(s)) return "throwing";
  if (/hit|bat_speed|swing/.test(s)) return "hitting";
  if (/defen|field|catching/.test(s)) return "defense";
  if (/condition/.test(s)) return "conditioning";
  if (/speed|sprint/.test(s)) return "speed";
  if (/plyo|jump/.test(s)) return "jumps";
  if (/lift|strength|supplemental/.test(s)) return "lifting";
  return null;
}

/** Per-area completed weeks (oldest → newest) from saved cards and logs; excludes the current week. */
export function areaWeeks(
  today: string,
  prescriptions: readonly { id: string; plan_date: string; slot: string }[],
  loggedPrescriptionIds: ReadonlySet<string>,
): Record<GreenlightArea, AreaWeek[]> {
  const thisWeek = mondayOf(today);
  const out = Object.fromEntries(GREENLIGHT_AREAS.map((a) => [a, [] as AreaWeek[]])) as Record<GreenlightArea, AreaWeek[]>;
  const map = new Map<string, AreaWeek>();
  for (const r of prescriptions) {
    const area = areaOfSlot(r.slot);
    if (!area) continue;
    const ws = mondayOf(r.plan_date);
    if (ws >= thisWeek) continue;
    const k = `${area}|${ws}`;
    let w = map.get(k);
    if (!w) { w = { weekStart: ws, prescribed: 0, completed: 0 }; map.set(k, w); out[area].push(w); }
    w.prescribed += 1;
    if (loggedPrescriptionIds.has(r.id)) w.completed += 1;
  }
  for (const a of GREENLIGHT_AREAS) out[a].sort((x, y) => x.weekStart.localeCompare(y.weekStart));
  return out;
}

/** Fill skipped weeks between the first judged week and last week as "none" so streaks stay honest. */
export function colorsFor(weeks: readonly AreaWeek[], checkIns: readonly DayCheckIn[], today: string): WeekColor[] {
  if (!weeks.length) return [];
  const byStart = new Map(weeks.map((w) => [w.weekStart, w]));
  const out: WeekColor[] = [];
  const last = mondayOf(today);
  for (let d = new Date(`${weeks[0].weekStart}T12:00:00Z`); d.toISOString().slice(0, 10) < last; d.setUTCDate(d.getUTCDate() + 7)) {
    const ws = d.toISOString().slice(0, 10);
    const w = byStart.get(ws);
    out.push(w ? weekColor(w, checkIns) : "none");
  }
  return out;
}
