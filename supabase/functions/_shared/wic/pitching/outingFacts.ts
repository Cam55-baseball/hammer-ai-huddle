// Pitcher schedule → outing facts (owner-authorised 2026-10-05).
//
// Pure. Actual always beats planned:
//  - an outing with status "thrown" counts on its actual_date, never its planned date;
//  - "skipped" never counts;
//  - a planned outing whose date has passed without being confirmed is UNKNOWN —
//    never counted as thrown (it is returned in `unconfirmed` so the check-in can ask).
// A repeating rotation projects future starts from the latest real start (or the
// anchor when none), so a start that moved re-bases the rotation.

export interface PitcherSettingsRow {
  role: "starter" | "reliever" | "both";
  rotation_anchor_date: string | null;
  rotation_every_days: number | null;
  rotation_active: boolean;
}
export interface PitcherOutingRow {
  id: string;
  outing_type: "start" | "relief" | "bullpen";
  planned_date: string | null;
  actual_date: string | null;
  status: "planned" | "thrown" | "skipped";
}
export interface PitcherAvailabilityRow { date: string; available: boolean }

export interface OutingFacts {
  /** True when the athlete has entered any pitcher schedule data. */
  hasSchedule: boolean;
  /** Dates (YYYY-MM-DD) of planned or projected starts not yet resolved, from yesterday forward. */
  plannedStartDates: string[];
  /** Dates actually pitched (any type), most recent first. */
  thrownDates: string[];
  startsToday: boolean;
  startsTomorrow: boolean;
  /** Actually pitched yesterday (start or relief; bullpens excluded). */
  pitchedYesterday: boolean;
  /** Reliever marked available today or tomorrow. */
  relieverAvailableSoon: boolean;
  /** Reliever explicitly unavailable today. */
  relieverUnavailableToday: boolean;
  /** Past planned outings with no answer yet. */
  unconfirmed: Array<{ id: string; planned_date: string; outing_type: string }>;
}

const DAY = 86_400_000;
const ms = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const shift = (d: string, n: number) => iso(ms(d) + n * DAY);

export function projectRotation(settings: PitcherSettingsRow | null, latestStart: string | null, from: string, to: string): string[] {
  if (!settings?.rotation_active || !settings.rotation_every_days || !settings.rotation_anchor_date) return [];
  const n = settings.rotation_every_days;
  const anchor = latestStart && ms(latestStart) >= ms(settings.rotation_anchor_date) ? latestStart : settings.rotation_anchor_date;
  const out: string[] = [];
  for (let t = ms(anchor); t <= ms(to); t += n * DAY) if (t >= ms(from)) out.push(iso(t));
  return out;
}

export function resolveOutingFacts(input: {
  planDate: string;
  settings: PitcherSettingsRow | null;
  outings: PitcherOutingRow[];
  availability: PitcherAvailabilityRow[];
}): OutingFacts {
  const { planDate, settings, outings, availability } = input;
  const yesterday = shift(planDate, -1);
  const tomorrow = shift(planDate, 1);
  const thrown = outings.filter((o) => o.status === "thrown" && o.actual_date);
  const thrownDates = [...new Set(thrown.map((o) => o.actual_date as string))].sort().reverse();
  const latestStart = thrown.filter((o) => o.outing_type === "start").map((o) => o.actual_date as string).sort().pop() ?? null;

  // Dates already resolved by a row (any status) — a projection on these dates yields to the row.
  const resolvedPlanned = new Set(outings.filter((o) => o.status !== "planned").map((o) => o.planned_date).filter(Boolean) as string[]);
  const rowPlanned = outings.filter((o) => o.status === "planned" && o.outing_type === "start" && o.planned_date).map((o) => o.planned_date as string);
  const projected = projectRotation(settings, latestStart, yesterday, shift(planDate, 14))
    .filter((d) => !resolvedPlanned.has(d) && !thrownDates.includes(d));
  const plannedStartDates = [...new Set([...rowPlanned.filter((d) => d >= yesterday), ...projected])].sort();

  const unconfirmed = outings
    .filter((o) => o.status === "planned" && o.planned_date && o.planned_date < planDate)
    .map((o) => ({ id: o.id, planned_date: o.planned_date as string, outing_type: o.outing_type }));

  const avail = new Map(availability.map((a) => [a.date, a.available]));
  const isReliever = settings?.role === "reliever" || settings?.role === "both";

  return {
    hasSchedule: !!settings || outings.length > 0 || availability.length > 0,
    plannedStartDates,
    thrownDates,
    startsToday: plannedStartDates.includes(planDate),
    startsTomorrow: plannedStartDates.includes(tomorrow),
    pitchedYesterday: thrown.some((o) => o.actual_date === yesterday && o.outing_type !== "bullpen"),
    relieverAvailableSoon: isReliever && (avail.get(planDate) === true || avail.get(tomorrow) === true),
    relieverUnavailableToday: avail.get(planDate) === false,
    unconfirmed,
  };
}
