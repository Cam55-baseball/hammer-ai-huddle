/**
 * Server reader/writer for the pitcher return program (owner Nov 1 round 6 Part 2).
 * Reads real pitching history, check-ins and the owner's ready setting; starts or advances
 * the program; records the dates it prescribed pitching. Any read failure → null (no change).
 */
import { advanceReturn, mondayOf, returnWeekGreen, startReturn, type ReturnProgram, type ReturnDay } from "./pitcherReturn.ts";
import type { Sport } from "./roleCycle.ts";

const DAY = 86_400_000;
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const norm = (r: unknown) => { const n = Number(r); return r == null || !Number.isFinite(n) ? null : n <= 5 ? Math.max(0, (n - 1) / 4) : Math.min(1, n / 10); };

// deno-lint-ignore no-explicit-any
export async function readPitcherReturn(db: any, userId: string, sport: Sport, today: string, thrownDates: readonly string[]): Promise<ReturnProgram | null> {
  const [prog, ledger, quiz, setting, sp] = await Promise.all([
    db.from("pitcher_return_programs").select("*").eq("user_id", userId).eq("sport", sport).order("started_on", { ascending: false }).limit(1),
    db.from("arm_ledger_entries").select("entry_date, throw_type, status, source").eq("user_id", userId).eq("source", "pitching").eq("status", "done").gte("entry_date", shift(today, -180)).lt("entry_date", today).limit(2000),
    db.from("vault_focus_quizzes").select("entry_date, physical_readiness, pain_location, pain_scale").eq("user_id", userId).gte("entry_date", shift(today, -70)).lt("entry_date", today).limit(500),
    db.from("app_settings").select("setting_value").eq("setting_key", "greenlight_ready_threshold").maybeSingle(),
    db.from("athlete_starting_points").select("answers").eq("user_id", userId).eq("sport", sport).maybeSingle(),
  ]);
  for (const r of [prog, ledger, quiz, setting, sp]) if (r.error) return null;
  if ((ledger.data ?? []).length >= 2000) return null;
  const pitched = new Set<string>([...((ledger.data ?? []) as any[]).filter((e) => e.throw_type !== "pitcher_warmup").map((e) => String(e.entry_date)), ...thrownDates.filter((d) => d < today)]);
  const lastPitch = [...pitched].sort().pop() ?? null;
  const latest = ((prog.data ?? [])[0] ?? null) as (ReturnProgram & { id: string; history?: unknown[] }) | null;
  const readyAt = typeof setting.data?.setting_value?.readyAt === "number" ? setting.data.setting_value.readyAt : null;
  const byDay = new Map<string, ReturnDay>();
  for (const q of (quiz.data ?? []) as any[]) {
    const r = norm(q.physical_readiness);
    const pain = (Array.isArray(q.pain_location) && q.pain_location.length > 0) || Number(q.pain_scale ?? 0) > 0;
    const prev = byDay.get(q.entry_date);
    byDay.set(q.entry_date, { date: q.entry_date, readiness: prev?.readiness != null && r != null ? Math.min(prev.readiness, r) : r ?? prev?.readiness ?? null, pain: pain || !!prev?.pain });
  }
  const checkIns = [...byDay.values()];

  let program: ReturnProgram | null = latest && !latest.completed_on ? latest : null;
  let isNew = false;
  if (!program) {
    const started = startReturn({ today, sport, lastPitchDate: lastPitch, answer: lastPitch ? null : (sp.data?.answers?.pitch_days_since ?? null), latest });
    if (!started) return null;
    program = started; isNew = true;
  }
  const before = program.step;
  const next = advanceReturn(program, today,
    (ws) => returnWeekGreen(ws, program!.prescribed_dates, pitched, checkIns, readyAt),
    (from) => [...pitched].filter((d) => d >= from).sort()[0] ?? null);
  const historyEntry = isNew ? { at: today, event: "started", source: next.source, days_off: next.days_off } : next.step !== before ? { at: today, event: `step_${next.step}`, from: before } : null;
  const row = { ...next, user_id: userId, history: [...((latest && !isNew ? latest.history : []) ?? []) as unknown[], ...(historyEntry ? [historyEntry] : [])], updated_at: new Date().toISOString() };
  if (isNew) {
    const ins = await db.from("pitcher_return_programs").insert(row).select("*").single();
    if (ins.error) return null;
    return ins.data as ReturnProgram;
  }
  if (historyEntry) {
    const up = await db.from("pitcher_return_programs").update(row).eq("id", (program as any).id).select("*").single();
    if (up.error) return null;
    return up.data as ReturnProgram;
  }
  return program;
}

/** Remember that today's plan prescribed pitching work (the denominator for the 85% check). */
// deno-lint-ignore no-explicit-any
export async function recordReturnDate(db: any, p: ReturnProgram & { id?: string }, date: string): Promise<void> {
  if (!p.id || p.completed_on || p.prescribed_dates.includes(date)) return;
  await db.from("pitcher_return_programs").update({ prescribed_dates: [...p.prescribed_dates, date].sort(), updated_at: new Date().toISOString() }).eq("id", p.id);
}
export { mondayOf };
