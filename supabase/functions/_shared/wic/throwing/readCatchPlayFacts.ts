/** Owner Nov 4: read a player's catch-play facts from existing tables (self JWT, read-only). */
import { isArmArea, type CatchPlayFacts, type CatchPlayCheck, checkToSession } from './catchPlay.ts';

const firstNumber = (s: unknown) => { if (/^under/i.test(String(s ?? ''))) return 0; const m = String(s ?? '').match(/\d+/); return m ? Number(m[0]) : null; };
const throwDays = (s: unknown) => { const t = String(s ?? ''); if (!t) return null; if (t === '0') return 0; return firstNumber(t); };
const shift = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const normReadiness = (r: unknown) => { const n = Number(r); if (r == null || !Number.isFinite(n)) return null; return n <= 5 ? Math.max(0, (n - 1) / 4) : Math.min(1, n / 10); };

export function factsFromRows(rows: { quizzes: any[] | null; findings: any[]; checks: any[]; answers: any }, sport: string): CatchPlayFacts {
  const byDay = new Map<string, { date: string; readiness: number | null; armFlag: boolean; painAreas: string[] }>();
  for (const q of rows.quizzes ?? []) {
    const areas = [...(q.pain_location ?? []), ...(q.soreness_locations ?? []), ...(q.stiffness_locations ?? [])].map(String);
    const flag = areas.some(isArmArea);
    const r = normReadiness(q.physical_readiness);
    const prev = byDay.get(q.entry_date);
    const pain = (q.pain_location ?? []).map(String).filter(Boolean);
    byDay.set(q.entry_date, { date: q.entry_date, readiness: prev?.readiness != null && r != null ? Math.min(prev.readiness, r) : r ?? prev?.readiness ?? null, armFlag: flag || !!prev?.armFlag, painAreas: [...new Set([...(prev?.painAreas ?? []), ...pain])] });
  }
  const clipMap = new Map<string, { date: string; faultKeys: string[] }>();
  for (const f of rows.findings) {
    if (!['throwing', 'pitching'].includes(f.skill_domain) || (f.sport && f.sport !== sport)) continue;
    const id = f.video_id ?? f.video_analysis_run_id ?? f.created_at;
    const c = clipMap.get(id) ?? { date: String(f.created_at).slice(0, 10), faultKeys: [] };
    for (const k of [f.fault_key, f.movement_key, f.root_pattern_key]) if (k && !c.faultKeys.includes(k)) c.faultKeys.push(k);
    clipMap.set(id, c);
  }
  const sessions = rows.checks.filter((r) => r.payload?.outcome).map((r) => checkToSession(r.plan_date, r.payload as CatchPlayCheck));
  const a = rows.answers ?? {};
  return { checkins: rows.quizzes == null ? null : [...byDay.values()], clips: [...clipMap.values()], sessions, startingDistanceFt: firstNumber(a.throw_distance), startingThrowDays: throwDays(a.throw_days), lastTrained: typeof a.last_trained === 'string' ? a.last_trained : null };
}

export async function readCatchPlayFacts(db: any, uid: string, sport: string, date: string, findings: any[]): Promise<CatchPlayFacts> {
  const [q, checks, sp] = await Promise.all([
    db.from('vault_focus_quizzes').select('entry_date,physical_readiness,pain_location,soreness_locations,stiffness_locations').eq('user_id', uid).gte('entry_date', shift(date, -28)).lte('entry_date', date).limit(400),
    db.from('hammer_daily_task_completions').select('plan_date,payload').eq('user_id', uid).eq('source', 'catch_play_check').gte('plan_date', shift(date, -56)).lt('plan_date', date).limit(200),
    db.from('athlete_starting_points').select('answers').eq('user_id', uid).eq('sport', sport).maybeSingle(),
  ]);
  return factsFromRows({ quizzes: q.error ? null : q.data ?? [], findings, checks: checks.error ? [] : checks.data ?? [], answers: sp.error ? null : sp.data?.answers }, sport);
}
