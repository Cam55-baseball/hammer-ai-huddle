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

export async function loadU13ThrowBlock(admin: any, userId: string, age: number | null, today: string): Promise<string | null> {
  if (!isUnder13(age)) return null;
  const from = new Date(ms(today) - 730 * dayMs).toISOString().slice(0, 10);
  const { data, error } = await admin.from("arm_ledger_entries").select("entry_date, source, throw_type, count, status")
    .eq("user_id", userId).gte("entry_date", from).lt("entry_date", today).limit(5000);
  if (error) return "Throwing paused today — pitch history couldn't be read.";
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
  return u13ThrowBlockFrom(age, [...by.values()], today);
}
