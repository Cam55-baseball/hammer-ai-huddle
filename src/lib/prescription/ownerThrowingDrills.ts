/**
 * Owner Nov 5 round 2 item 4 — owner-created throwing drills.
 *
 * A switched-on throwing drill takes the place of the built-in ladder steps for
 * its context (catch play, long toss, arm-strength day, build-up ladder, light
 * catch) when it fits the player's sport, role, level and age. It never adds
 * arm work: its total throws, longest distance and intent must fit inside the
 * built-in day it replaces (and pull-downs only where the day already has them),
 * otherwise the built-in ladder stays. Rows keep the "<ft>ft x <n> throws" dose
 * the arm budget already counts, and they log only through the throwing button.
 */
import type { CatchPlayRow, CPDayKind } from "../../../supabase/functions/_shared/wic/throwing/catchPlay";
import { cleanFit, fits, type PlayerFit } from "../hammer/prescription/warmupFit";

/** Its own type — distinct from the "hammers_today:throwing" engine tag (which files into the skill block). */
export const THROWING_SLOT = "hammers_today:throwing_drill" as const;
export type ThrowContext = "warmup_throws" | "catch_play" | "long_toss" | "arm_strength" | "build_up" | "light_catch";
export type ThrowIntent = "catch_light" | "sub_max" | "full";
export type ThrowRole = "position" | "pitcher" | "catcher";
export interface ThrowStep { ft: number; throws: number; pulldownThrows?: number | null }

export const THROW_CONTEXTS: ReadonlyArray<{ id: ThrowContext; label: string }> = [
  { id: "warmup_throws", label: "Warm-up throws" }, { id: "catch_play", label: "Catch play" },
  { id: "long_toss", label: "Long toss" }, { id: "arm_strength", label: "Arm-strength day" },
  { id: "build_up", label: "Build-up ladder" }, { id: "light_catch", label: "Light catch" },
];
export const THROW_INTENTS: ReadonlyArray<{ id: ThrowIntent; label: string }> = [
  { id: "catch_light", label: "Catch-light" }, { id: "sub_max", label: "Sub-max" }, { id: "full", label: "Full" },
];
export const THROW_ROLES: ReadonlyArray<{ id: ThrowRole; label: string }> = [
  { id: "position", label: "Position player" }, { id: "pitcher", label: "Pitcher" }, { id: "catcher", label: "Catcher" },
];

export interface OwnerThrowRow {
  id: string; name: string; active: boolean; placements: string[]; sports: string[];
  cue?: string | null; arm_tax_level?: string | null;
  fit_levels?: string[] | null; fit_age_bands?: string[] | null;
  throw_steps?: unknown; throw_intent?: string | null; throw_flight?: string | null;
  throw_pulldowns?: boolean | null; throw_contexts?: string[] | null; throw_role_fit?: string[] | null;
}

export function throwSteps(raw: unknown): ThrowStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    const ft = Number((s as ThrowStep)?.ft), throws = Number((s as ThrowStep)?.throws);
    const pd = (s as ThrowStep)?.pulldownThrows == null ? null : Number((s as ThrowStep).pulldownThrows);
    return Number.isInteger(ft) && Number.isInteger(throws) && ft > 0 && throws > 0 ? [{ ft, throws, pulldownThrows: pd && pd > 0 ? Math.round(pd) : null }] : [];
  });
}

/** What still blocks a throwing drill from being prescribed (shown in the builder). */
export function ownerThrowingProblems(r: Omit<OwnerThrowRow, "id">): string[] {
  const out: string[] = [];
  const steps = throwSteps(r.throw_steps);
  if (!steps.length) out.push("at least one step (distance + throws)");
  if (steps.some((s) => s.ft < 20 || s.ft > 400)) out.push("distances between 20 and 400 ft");
  if (steps.some((s) => s.throws > 50)) out.push("50 or fewer throws per step");
  if (!THROW_INTENTS.some((i) => i.id === r.throw_intent)) out.push("intent");
  if (!r.throw_contexts?.length) out.push("where it's prescribed");
  if (!r.throw_role_fit?.length) out.push("role fit");
  if (!r.sports?.length) out.push("sport");
  if (!cleanFit(r.fit_levels, r.fit_age_bands)) out.push("level and age bands");
  if (r.throw_pulldowns && !steps.some((s) => (s.pulldownThrows ?? 0) > 0)) out.push("pull-down throws on a step");
  return out;
}

export interface ThrowPlayer { sport: "baseball" | "softball"; role: ThrowRole; fit: PlayerFit; positionFt: number }

const KIND_CONTEXT: Record<CPDayKind, ThrowContext | null> = {
  standard: "catch_play", long_toss: "long_toss", arm_strength: "arm_strength", build_up: "build_up", light: "light_catch",
  pitcher_interval: null, none: null,
};
const INTENT_RANK: Record<ThrowIntent, number> = { catch_light: 0, sub_max: 1, full: 2 };
const ROW_RANK: Record<CatchPlayRow["intent"], number> = { low: 0, moderate: 1, high: 2 };
const ROW_INTENT: Record<ThrowIntent, CatchPlayRow["intent"]> = { catch_light: "low", sub_max: "moderate", full: "high" };

export function ownerThrowingFits(r: OwnerThrowRow, p: ThrowPlayer, context: ThrowContext): boolean {
  if (!r.active || !r.placements?.includes(THROWING_SLOT) || ownerThrowingProblems(r).length) return false;
  if (!r.sports.includes(p.sport) || !r.throw_role_fit!.includes(p.role) || !r.throw_contexts!.includes(context)) return false;
  return fits(cleanFit(r.fit_levels, r.fit_age_bands)!, p.fit);
}

export function ownerThrowRows(r: OwnerThrowRow): CatchPlayRow[] {
  const intent = (r.throw_intent ?? "catch_light") as ThrowIntent;
  const label = THROW_INTENTS.find((i) => i.id === intent)!.label.toLowerCase();
  const flight = r.throw_flight === "arc" ? " · arc" : r.throw_flight === "line" ? " · on a line" : "";
  return throwSteps(r.throw_steps).flatMap((s) => {
    const rows: CatchPlayRow[] = [{ name: `${r.name} — ${s.ft} ft`, distanceFt: s.ft, throws: s.throws, part: "build", intent: ROW_INTENT[intent], dosage: `${s.ft}ft x ${s.throws} throws · ${label}${flight}` }];
    if (r.throw_pulldowns && s.pulldownThrows) rows.push({ name: `${r.name} — ${s.ft}-ft pull-downs`, distanceFt: s.ft, throws: s.pulldownThrows, part: "pull_down", intent: "high", dosage: `${s.ft}ft x ${s.pulldownThrows} throws · pull-downs, on a line` });
    return rows;
  });
}

/** Swap the built-in day for a fitting owner drill (rotating by day); otherwise unchanged. */
export function applyOwnerThrowingDrill<D extends { kind: CPDayKind; rows: CatchPlayRow[]; totalThrows: number; reachesPositionDistance: boolean }>(
  day: D, p: ThrowPlayer, rows: readonly OwnerThrowRow[], dayIndex = 0,
): D & { ownerDrillId?: string } {
  const context = KIND_CONTEXT[day.kind];
  if (!context || !day.rows.length) return day;
  const maxFt = Math.max(...day.rows.filter((r) => r.part !== "pull_down").map((r) => r.distanceFt));
  const maxIntent = Math.max(...day.rows.map((r) => ROW_RANK[r.intent]));
  const hasPulldowns = day.rows.some((r) => r.part === "pull_down");
  const pool = rows.filter((r) => ownerThrowingFits(r, p, context)).filter((r) => {
    const out = ownerThrowRows(r);
    const total = out.reduce((n, x) => n + x.throws, 0);
    return total <= day.totalThrows
      && out.every((x) => x.part === "pull_down" || x.distanceFt <= maxFt)
      && INTENT_RANK[r.throw_intent as ThrowIntent] <= maxIntent
      && (!out.some((x) => x.part === "pull_down") || hasPulldowns);
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!pool.length) return day;
  const pick = pool[Math.abs(dayIndex) % pool.length];
  const out = ownerThrowRows(pick);
  return {
    ...day, rows: out, ownerDrillId: pick.id,
    totalThrows: out.reduce((n, x) => n + x.throws, 0),
    reachesPositionDistance: day.reachesPositionDistance && out.some((x) => x.part !== "pull_down" && x.distanceFt >= p.positionFt),
  };
}
