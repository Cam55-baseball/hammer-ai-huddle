/**
 * Growth Mode — ONE rule for every card (owner ruling 2026-10-06).
 *
 * Source: docs/wic/training-intelligence-v1.md §10.2 — "Growth of 2 cm (¾ in)
 * or more in about 3 months → Growth Mode for 8 weeks, renewing while growth
 * continues." Growth Mode comes ONLY from measured height. Age is never a
 * proxy; missing or single readings mean NOT in Growth Mode.
 *
 * Pure. Shared verbatim by the planner, the throwing card and the app
 * (the client imports this file directly).
 */
export interface HeightReading { date: string; inches: number }

export const GROWTH_MODE_RULE = {
  /** 2 cm ≈ 0.787 in; the doc states ¾ in. The ¾ in figure is the trigger. */
  inchTrigger: 0.75,
  /** "about 3 months" */
  windowDays: 92,
  /** "Growth Mode for 8 weeks" */
  activeDays: 56,
  version: "growth_mode_v2_height_only",
} as const;

export const GROWTH_CARD_TEXT =
  "You're growing fast right now. Bones grow faster than muscles and tendons can keep up, so we hold jumps and heavy loads steady for a few weeks and add mobility.";

export interface GrowthModeState {
  active: boolean;
  /** Date of the reading that opened the current (or last) window. */
  since: string | null;
  /** Last day growth mode applies (exclusive end = until + 1). */
  until: string | null;
  /** Set when growth mode was on and has ended (latest window). */
  endedOn: string | null;
  /** Inches grown in the triggering window. */
  grownInches: number | null;
  latestInches: number | null;
  latestDate: string | null;
}

const DAY = 86_400_000;
const ms = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const add = (d: string, n: number) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);

export function growthMode(readings: readonly HeightReading[] | null | undefined, today: string): GrowthModeState {
  const rows = (readings ?? [])
    .filter((r) => r && r.date && Number.isFinite(Number(r.inches)) && Number(r.inches) > 0 && r.date <= today)
    .map((r) => ({ date: r.date, inches: Number(r.inches) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = rows[rows.length - 1] ?? null;
  let since: string | null = null;
  let until: string | null = null;
  let grown: number | null = null;
  for (let i = 1; i < rows.length; i++) {
    const cur = rows[i];
    const window = rows.slice(0, i).filter((p) => ms(cur.date) - ms(p.date) <= GROWTH_MODE_RULE.windowDays * DAY);
    if (window.length === 0) continue;
    const low = Math.min(...window.map((p) => p.inches));
    const g = cur.inches - low;
    if (g + 1e-9 < GROWTH_MODE_RULE.inchTrigger) continue;
    const end = add(cur.date, GROWTH_MODE_RULE.activeDays - 1);
    // Renewal: a qualifying reading inside an open window extends it.
    if (!until || cur.date > until) since = cur.date;
    if (!until || end > until) until = end;
    grown = Math.round(g * 100) / 100;
  }
  const active = until !== null && today <= until;
  return {
    active,
    since,
    until,
    endedOn: until !== null && !active ? add(until, 1) : null,
    grownInches: grown,
    latestInches: latest?.inches ?? null,
    latestDate: latest?.date ?? null,
  };
}

/** Plain words for the player, while on and just after it ends. */
export function growthModeNote(s: GrowthModeState): string | null {
  if (s.active && s.until) {
    return `${GROWTH_CARD_TEXT} Growth mode ends on ${s.until} unless your next height check shows you're still growing.`;
  }
  if (s.endedOn) {
    return `Growth mode ended on ${s.endedOn}: your height hasn't gone up ¾ inch or more in the last 3 months, so jumps and lifting are back to your normal plan.`;
  }
  return null;
}
