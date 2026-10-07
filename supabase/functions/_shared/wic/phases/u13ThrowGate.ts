/**
 * Under 13 only (owner ruling 2026-10-06, Part C): decides whether today must
 * be a no-throw day under MLB Pitch Smart, from the arm ledger. Pure core
 * (`u13ThrowBlockFrom`) + a loader. The final rule check removes throwing and
 * upper-body plyo cards when this returns a reason.
 */
import { PITCH_SMART_BANDS, bandIndex, restDaysFor, under13ThirdDay, under13YearlyRestBlocks, U13_THIRD_DAY_LINE, isUnder13 } from "./youthThrowing.ts";

export interface LedgerDay { date: string; pitches: number; throws: number }
const dayMs = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);

export function u13ThrowBlockFrom(age: number | null, days: LedgerDay[], today: string): string | null {
  if (!isUnder13(age)) return null;
  const band = PITCH_SMART_BANDS[bandIndex(age as number)];
  const prior = days.filter((d) => d.date < today);
  // Pitch Smart rest after each outing.
  for (const d of prior) {
    if (d.pitches <= 0) continue;
    const rest = restDaysFor(band, d.pitches);
    const gap = Math.round((ms(today) - ms(d.date)) / dayMs) - 1; // full days between
    if (gap < rest) return `Pitch Smart rest: ${d.pitches} pitches on ${d.date} need ${rest} day${rest === 1 ? "" : "s"} off.`;
  }
  const pitchDates = prior.filter((d) => d.pitches > 0).map((d) => d.date);
  if (under13ThirdDay(pitchDates, today)) return U13_THIRD_DAY_LINE;
  const throwDates = prior.filter((d) => d.pitches > 0 || d.throws > 0).map((d) => d.date);
  const yr = under13YearlyRestBlocks(throwDates, today);
  return yr.blocked ? yr.reason : null;
}

/** Round 8: first date (after today) the same Pitch Smart rules allow throwing again; null over 12. Assumes no new throwing in between. */
export function u13NextThrowDate(age: number | null, days: LedgerDay[], today: string): string | null {
  if (!isUnder13(age)) return null;
  for (let i = 1; i <= 150; i++) {
    const d = new Date(ms(today) + i * dayMs).toISOString().slice(0, 10);
    if (u13ThrowBlockFrom(age, days, d) === null) return d;
  }
  return null;
}

export async function loadU13ThrowBlock(admin: any, userId: string, age: number | null, today: string): Promise<string | null> {
  const r = await loadU13ThrowState(admin, userId, age, today);
  return r.block;
}

export async function loadU13ThrowState(admin: any, userId: string, age: number | null, today: string): Promise<{ block: string | null; next: string | null }> {
  if (!isUnder13(age)) return { block: null, next: null };
  const from = new Date(ms(today) - 730 * dayMs).toISOString().slice(0, 10);
  const { data, error } = await admin.from("arm_ledger_entries").select("entry_date, source, throw_type, count, status")
    .eq("user_id", userId).gte("entry_date", from).lt("entry_date", today).limit(5000);
  if (error) return { block: "Throwing paused today — pitch history couldn't be read.", next: null };
  const by = new Map<string, LedgerDay>();
  for (const r of (data ?? []) as any[]) {
    if (r.status && /skip|missed|cancel/i.test(String(r.status))) continue;
    const d = String(r.entry_date);
    const cur = by.get(d) ?? { date: d, pitches: 0, throws: 0 };
    const n = Number(r.count ?? 0);
    const isPitch = String(r.source) === "pitching" && !/warm/i.test(String(r.throw_type ?? ""));
    if (isPitch) cur.pitches += n; else cur.throws += n;
    by.set(d, cur);
  }
  const days = [...by.values()];
  return { block: u13ThrowBlockFrom(age, days, today), next: u13NextThrowDate(age, days, today) };
}
