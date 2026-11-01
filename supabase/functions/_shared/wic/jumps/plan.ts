/**
 * Owner Nov 1 round 6 — jump selection on a built day. Runs AFTER the written rules
 * (tiers T1–T3, age gates, Growth Mode, contact limits, season legality) have already
 * chosen and dosed the day, and only narrows: it never adds a tier, never raises the
 * written dose, and never adds a jump to a day that had none.
 */
import {
  beginnerSession, isTaggedJump, jumpCompetency, jumpContacts, jumpEligible, jumpStartLevel, jumpWorkload, levelIndex, rankJumps,
  type JumpAthlete, type JumpLevel, type JumpObjective, type JumpRow, type JumpSession, type LandingRating,
} from "./taxonomy.ts";

export interface PlanRow { slot: string; movement_slug: string; movement_name: string; sets: number | null; reps: number | null; why_payload?: Record<string, unknown> | null; [k: string]: unknown }
type CatRow = JumpRow & { min_age_years?: number | null; eccentric_overload?: boolean | null };

export interface JumpGovernance { rows: PlanRow[]; changed: boolean; because: string | null }

/** Candidate must be no harder than the written choice by the written gates too. */
function withinWritten(c: CatRow, orig: CatRow, age: number | null): boolean {
  if ((c.plyo_tier ?? 1) > (orig.plyo_tier ?? 1)) return false;
  if (age != null && (c.min_age_years ?? 0) > age) return false;
  if (c.eccentric_overload && !orig.eccentric_overload) return false;
  return true;
}

export function governJumps(rows: readonly PlanRow[], catalog: ReadonlyMap<string, CatRow>, a: JumpAthlete, age: number | null, day = 0, because: string | null = null): JumpGovernance {
  const idx = rows.map((r, i) => ({ r, i, c: catalog.get(r.movement_slug) })).filter((x) => x.c && isTaggedJump(x.c));
  if (!idx.length) return { rows: [...rows], changed: false, because: null };
  const pool = [...catalog.values()].filter(isTaggedJump);
  const out: (PlanRow | null)[] = [...rows];
  let changed = false;
  if (levelIndex(a.level) <= 0) {
    // Beginner rule: introduction jumps only, ~20–25 contacts as a target.
    const first = idx[0];
    const candidates = pool.filter((c) => withinWritten(c, first.c!, age));
    const doses = beginnerSession(candidates, a, day);
    for (const x of idx) out[x.i] = null;
    if (doses.length) {
      const fresh = doses.map((d, k) => ({
        ...first.r, movement_slug: d.slug, movement_name: d.name, sets: d.sets, reps: d.reps, total_reps: null,
        why_payload: { ...(first.r.why_payload ?? {}), jump: { level: a.level, contacts: d.contacts, beginner: true,
          because: k === 0 ? "Because: you're new to jumping, so you start with the easiest jumps and about 20–25 landings. Stop a set if landings get loud or sloppy." : null } },
      }) as PlanRow);
      out.splice(first.i, 1, ...fresh as any);
    }
    changed = true;
  } else {
    for (const x of idx) {
      const c = x.c!;
      const why = { ...(x.r.why_payload ?? {}) } as Record<string, unknown>;
      if (jumpEligible(c, a)) {
        out[x.i] = { ...x.r, why_payload: { ...why, jump: { level: a.level, contacts: jumpContacts(c, x.r.sets ?? 0, x.r.reps ?? 0), because } } };
        continue;
      }
      const obj = (c.jump_objectives?.[0] ?? null) as JumpObjective | null;
      const sub = rankJumps(pool.filter((p) => p.slug !== c.slug && withinWritten(p, c, age) && !rows.some((r) => r.movement_slug === p.slug)), a, obj)
        .find((p) => !obj || p.jump_objectives?.includes(obj));
      changed = true;
      out[x.i] = sub ? { ...x.r, movement_slug: sub.slug, movement_name: sub.name,
        why_payload: { ...why, jump: { level: a.level, swapped_from: c.slug, contacts: jumpContacts(sub, x.r.sets ?? 0, x.r.reps ?? 0),
          because: `Because: ${sub.name} trains the same thing at your jump level. Same sets and reps.` } } } : null;
    }
  }
  const kept = out.filter((r): r is PlanRow => !!r);
  const jumpRows = kept.flatMap((r) => { const c = catalog.get(r.movement_slug); return c && isTaggedJump(c) ? [{ row: c, sets: r.sets ?? 0, reps: r.reps ?? 0 }] : []; });
  const firstJump = kept.find((r) => { const c = catalog.get(r.movement_slug); return c && isTaggedJump(c); });
  if (firstJump) firstJump.why_payload = { ...(firstJump.why_payload ?? {}), jump_workload: jumpWorkload(jumpRows) };
  return { rows: kept, changed, because };
}

/** Sessions of landing ratings grouped by plan date. */
export function sessionsFrom(ratings: ReadonlyArray<{ plan_date: string; rating: string }>): JumpSession[] {
  const by = new Map<string, LandingRating[]>();
  for (const r of ratings) if (r.rating === "solid" || r.rating === "wobble" || r.rating === "sloppy") by.set(r.plan_date, [...(by.get(r.plan_date) ?? []), r.rating]);
  return [...by.entries()].map(([date, ratings]) => ({ date, ratings })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Competency walk from finished greenlight weeks + landing ratings. */
export function athleteJumpLevel(startAnswer: "easiest" | "written" | null, earnedTier: 1 | 2 | 3 | null,
  weeks: ReadonlyArray<{ weekStart: string; green: boolean }>, ratings: ReadonlyArray<{ plan_date: string; rating: string }>, held: boolean) {
  const sessions = sessionsFrom(ratings);
  const end = (ws: string) => { const d = new Date(`${ws}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); };
  return jumpCompetency(jumpStartLevel(startAnswer, earnedTier) as JumpLevel,
    weeks.map((w) => ({ ...w, sessions: sessions.filter((s) => s.date >= w.weekStart && s.date <= end(w.weekStart)) })), held);
}
