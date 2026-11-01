/** Server reader/writer for returning hitters (owner Nov 1 round 6 Part 3). Read failure → null (no change). */
import { advanceHitter, hittingWeek, needsBridge, startHitterReturn, HITTING_AREAS, type HitDay, type HitterProgram, type SwingEffort } from "./returningHitter.ts";

const DAY = 86_400_000;
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const norm = (r: unknown) => { const n = Number(r); return r == null || !Number.isFinite(n) ? null : n <= 5 ? Math.max(0, (n - 1) / 4) : Math.min(1, n / 10); };

// deno-lint-ignore no-explicit-any
export async function readReturningHitter(db: any, userId: string, sport: "baseball" | "softball", today: string, age: number | null, injuryActive: boolean): Promise<HitterProgram | null> {
  const [prog, tasks, quiz, setting, sp, eff] = await Promise.all([
    db.from("returning_hitter_programs").select("*").eq("user_id", userId).eq("sport", sport).order("started_on", { ascending: false }).limit(1),
    db.from("hammer_daily_task_completions").select("plan_date, completed").eq("user_id", userId).eq("source", "block_drill").eq("source_ref", "hitting").eq("completed", true).gte("plan_date", shift(today, -120)).lt("plan_date", today).limit(3000),
    db.from("vault_focus_quizzes").select("entry_date, physical_readiness, pain_location, pain_scale, soreness_locations").eq("user_id", userId).gte("entry_date", shift(today, -70)).lt("entry_date", today).limit(500),
    db.from("app_settings").select("setting_value").eq("setting_key", "greenlight_ready_threshold").maybeSingle(),
    db.from("athlete_starting_points").select("answers").eq("user_id", userId).eq("sport", sport).maybeSingle(),
    db.from("hitting_swing_efforts").select("plan_date, prescribed, actual").eq("user_id", userId).gte("plan_date", shift(today, -28)).lt("plan_date", today).limit(500),
  ]);
  for (const r of [prog, tasks, quiz, setting, sp, eff]) if (r.error) return null;
  if ((tasks.data ?? []).length >= 3000) return null;
  const completedByDate: Record<string, number> = {};
  for (const t of (tasks.data ?? []) as any[]) completedByDate[t.plan_date] = (completedByDate[t.plan_date] ?? 0) + 1;
  const hitDates = Object.keys(completedByDate).sort();
  const latest = ((prog.data ?? [])[0] ?? null) as (HitterProgram & { id: string; history?: unknown[] }) | null;
  const readyAt = typeof setting.data?.setting_value?.readyAt === "number" ? setting.data.setting_value.readyAt : null;
  const byDay = new Map<string, HitDay>();
  for (const q of (quiz.data ?? []) as any[]) {
    const r = norm(q.physical_readiness);
    const areas = [...(Array.isArray(q.pain_location) ? q.pain_location : []), ...(Array.isArray(q.soreness_locations) ? q.soreness_locations : [])].map(String);
    const pain = (Array.isArray(q.pain_location) && q.pain_location.length > 0) || Number(q.pain_scale ?? 0) > 0;
    const prev = byDay.get(q.entry_date);
    byDay.set(q.entry_date, { date: q.entry_date, readiness: prev?.readiness != null && r != null ? Math.min(prev.readiness, r) : r ?? prev?.readiness ?? null, pain: pain || !!prev?.pain, hittingPain: areas.some((a) => HITTING_AREAS.test(a)) || !!prev?.hittingPain });
  }
  const days = [...byDay.values()];
  let program: HitterProgram | null = latest && !latest.completed_on ? latest : null;
  let isNew = false;
  if (!program) {
    const a = sp.data?.answers ?? {};
    program = startHitterReturn({ today, sport, age, injuryActive, liveRecently: a.live_pitching ?? null, lastTrained: a.last_trained ?? null,
      lastHitDate: hitDates[hitDates.length - 1] ?? null, hadHittingBefore: hitDates.length > 0, latest });
    if (!program) return null;
    isNew = true;
  }
  const efforts = ((eff.data ?? []) as any[]).filter((e) => e.prescribed).map((e) => ({ date: e.plan_date, prescribed: e.prescribed as SwingEffort, actual: e.actual as SwingEffort }));
  const bridge = needsBridge(efforts, days, today, program.last_change_on);
  const p0 = program;
  const next = advanceHitter(p0, today, (ws) => hittingWeek(ws, p0.prescribed, completedByDate, days, readyAt), bridge.on);
  const changed = isNew || next.effort !== p0.effort || next.bridge !== p0.bridge || next.environment !== p0.environment || next.completed_on !== p0.completed_on;
  if (!changed) return program;
  const entry = { at: today, event: isNew ? "started" : "changed", reason: next.reason, effort: next.effort, bridge: next.bridge, environment: next.environment, done: !!next.completed_on, why: bridge.because };
  const row = { ...next, user_id: userId, history: [...(isNew ? [] : (latest?.history ?? []) as unknown[]), entry], updated_at: new Date().toISOString() };
  const res = isNew ? await db.from("returning_hitter_programs").insert(row).select("*").single() : await db.from("returning_hitter_programs").update(row).eq("id", (program as any).id).select("*").single();
  return res.error ? null : res.data as HitterProgram;
}

// deno-lint-ignore no-explicit-any
export async function recordHittingDay(db: any, p: HitterProgram & { id?: string }, date: string, drills: number): Promise<void> {
  if (!p.id || p.completed_on || drills <= 0 || p.prescribed[date] === drills) return;
  await db.from("returning_hitter_programs").update({ prescribed: { ...p.prescribed, [date]: drills }, updated_at: new Date().toISOString() }).eq("id", p.id);
}
