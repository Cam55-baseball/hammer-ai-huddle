/**
 * Coach "Body load" tab — pure formatters over the coach_athlete_load RPC.
 * Counts only what was actually logged: arm-ledger entries, bullpen/outing
 * pitch logs, and pitches thrown in logged games. Nothing is invented.
 */

export interface ArmEntryRow {
  entry_date: string;
  throw_type: string;
  count: number;
  status: string;
}

export interface PitchDay {
  plan_date?: string;
  game_date?: string;
  pitches: number;
}

export interface CoachLoad {
  arm_entries: ArmEntryRow[];
  pitch_logs: PitchDay[];
  game_pitches: PitchDay[];
  from: string;
}

/** Merge bullpen/outing logs and game pitches into one per-day total (same date adds up). */
export function mergedPitchDays(load: CoachLoad): Array<{ date: string; pitches: number; game: number; practice: number }> {
  const map = new Map<string, { date: string; pitches: number; game: number; practice: number }>();
  for (const p of load.pitch_logs ?? []) {
    const d = p.plan_date ?? "";
    if (!d) continue;
    const row = map.get(d) ?? { date: d, pitches: 0, game: 0, practice: 0 };
    row.practice += p.pitches;
    row.pitches += p.pitches;
    map.set(d, row);
  }
  for (const g of load.game_pitches ?? []) {
    const d = g.game_date ?? "";
    if (!d) continue;
    const row = map.get(d) ?? { date: d, pitches: 0, game: 0, practice: 0 };
    row.game += g.pitches;
    row.pitches += g.pitches;
    map.set(d, row);
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function weeklyPitchTotal(load: CoachLoad): number {
  return mergedPitchDays(load).reduce((s, d) => s + d.pitches, 0);
}

export function weeklyThrowTotal(load: CoachLoad): number {
  return (load.arm_entries ?? [])
    .filter((e) => e.status === "done")
    .reduce((s, e) => s + (e.count ?? 0), 0);
}

const THROW_LABELS: Record<string, string> = {
  long_toss: "Long toss",
  catch_play: "Catch play",
  bullpen: "Bullpen",
  game: "Game throws",
  plyo: "Plyo balls",
  other: "Other throws",
};

export function throwTypeLabel(t: string): string {
  return THROW_LABELS[t] ?? t.replace(/_/g, " ");
}

export function armEntryLine(e: ArmEntryRow): string {
  const label = throwTypeLabel(e.throw_type);
  if (e.status === "skipped") return `${label} — skipped`;
  return `${label} — ${e.count} throws`;
}

/** One line per day, e.g. "Oct 11: 62 pitches (40 in a game, 22 in practice)". */
export function pitchDayLine(d: { date: string; pitches: number; game: number; practice: number }): string {
  const parts: string[] = [];
  if (d.game > 0) parts.push(`${d.game} in a game`);
  if (d.practice > 0) parts.push(`${d.practice} in practice`);
  const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `${d.pitches} pitches${detail}`;
}
