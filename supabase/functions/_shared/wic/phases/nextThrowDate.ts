// Round 9 (owner final throw table, 2026-10-07) — next throwing / pick-off dates.
// Pure. Every logged throw becomes pitch-equivalents (throwCount.ts weights) and
// the EXISTING Pitch Smart rest table (youthThrowing.ts) gives the rest days.
// Never a dose, never a new limit. Under 13 keeps its own stricter gate
// (u13ThrowGate.ts); callers take the later of the two dates.
import { PITCH_SMART_BANDS, bandIndex, restDaysFor, pitchSmartApplies } from "./youthThrowing.ts";
import { THROW_WEIGHTS, type ThrowKind } from "./throwCount.ts";

export interface ArmRow { entry_date: string; source?: string | null; throw_type?: string | null; count?: number | null; status?: string | null }

const dayMs = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (n: number) => new Date(n).toISOString().slice(0, 10);

/** Map a stored arm-ledger row to the owner's throw table. */
export function kindOfRow(r: ArmRow): ThrowKind {
  const t = String(r.throw_type ?? "").toLowerCase();
  if (/pick/.test(t)) return /no_?throw|footwork/.test(t) ? "pickoff_no_throw" : /low/.test(t) ? "pickoff_low" : "pickoff_high";
  if (/warm|catch_play/.test(t)) return "warmup_catch";
  if (String(r.source) === "pitching") return /off_?mound|flat/.test(t) ? "off_mound_high" : "mound_pitch";
  if (/quick_release|throwdown|crow_hop|pull_?down|velo/.test(t)) return "off_mound_high";
  return "off_mound_low";
}

/** Pitch-equivalents per date (skipped/missed rows ignored). */
export function equivalentsByDay(rows: readonly ArmRow[]): Map<string, number> {
  const by = new Map<string, number>();
  for (const r of rows) {
    if (r.status && /skip|missed|cancel/i.test(String(r.status))) continue;
    const n = Number(r.count ?? 0);
    if (!(n > 0)) continue;
    const d = String(r.entry_date);
    by.set(d, (by.get(d) ?? 0) + THROW_WEIGHTS[kindOfRow(r)] * n);
  }
  for (const [d, v] of by) by.set(d, Math.round(v * 10) / 10);
  return by;
}

/**
 * First date after `today` the Pitch Smart rest table allows throwing again,
 * counting every logged day (today included) as pitch-equivalents.
 * Returns null when Pitch Smart doesn't apply (no age, over 22, pro).
 */
export function nextThrowDate(age: number | null, level: string | null, rows: readonly ArmRow[], today: string): string | null {
  if (!pitchSmartApplies(age, level)) return null;
  const band = PITCH_SMART_BANDS[bandIndex(age as number)];
  let next = ms(today) + dayMs;
  for (const [d, eq] of equivalentsByDay(rows)) {
    if (d > today) continue;
    const rest = restDaysFor(band, Math.ceil(eq));
    next = Math.max(next, ms(d) + (rest + 1) * dayMs);
  }
  return iso(next);
}

/** Pick-off work shares the arm: same date as throwing, baseball pitchers only. */
export function nextPickoffDate(sport: string | null, isPitcher: boolean, throwDate: string | null): string | null {
  return sport === "baseball" && isPitcher ? throwDate : null;
}
