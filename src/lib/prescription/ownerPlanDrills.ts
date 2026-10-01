/**
 * Owner drills filed under Hammers Today (skill, warm-up, defense) and the
 * defensive library.
 *
 * Owner-approved narrow addition (2026-10-01): plan generation merges switched-on,
 * fully-eligible owner drills into the block they were filed under — nothing else.
 * The merge never changes HOW MANY drills a block prescribes: it swaps one slot,
 * rotating through eligible drills by day so none monopolises the block and a
 * newly switched-on drill is served within (pool size) days.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OwnerDrillRow } from "./ownerDrills";

export type PlanSlot = "hammers_today:skill" | "hammers_today:warmup" | "hammers_today:defense" | "defensive_library";
export type SkillBlock = "hitting" | "throwing";

export const PLAN_SLOTS: PlanSlot[] = ["hammers_today:skill", "hammers_today:warmup", "hammers_today:defense", "defensive_library"];

let rows: OwnerDrillRow[] = [];
let loading: Promise<void> | null = null;

export function setOwnerPlanDrills(next: OwnerDrillRow[]) {
  rows = next;
}

/** Fire-and-forget load; plan generation stays synchronous and simply uses what's loaded. */
export function loadOwnerPlanDrills(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      try {
        const { data } = await (supabase as any).from("owner_drills").select("*").eq("active", true);
        rows = (data ?? []) as OwnerDrillRow[];
      } catch {
        /* built-in plan stays */
      }
    })();
  }
  return loading;
}

/** Which skill block(s) a drill declares, from the analyses ticked on it. */
export function skillBlocksOf(r: Pick<OwnerDrillRow, "placements">): SkillBlock[] {
  const out = new Set<SkillBlock>();
  for (const p of r.placements) {
    if (/^analysis:[a-z]+:hitting$/.test(p)) out.add("hitting");
    if (/^analysis:[a-z]+:(throwing|pitching)$/.test(p)) out.add("throwing");
  }
  return [...out];
}

const clean = (s: string | null | undefined) => (s ?? "").trim();

/**
 * Fields a drill must carry before it may be served in a plan placement.
 * Returns plain-language gaps; empty = complete.
 */
export function missingForPlacement(r: Omit<OwnerDrillRow, "created_at" | "id">, slot: PlanSlot): string[] {
  const miss: string[] = [];
  if (!clean(r.name)) miss.push("a name");
  if (!clean(r.dosage)) miss.push("a dose");
  if (!clean(r.cue)) miss.push("a cue");
  if (r.sports.length === 0) miss.push("a sport");
  if (slot === "hammers_today:skill") {
    if (skillBlocksOf(r).length === 0) miss.push("which skill (tick a hitting, throwing or pitching analysis)");
    if (r.steps.filter((s) => clean(s)).length === 0 && !clean(r.setup)) miss.push("set-up or steps");
  }
  return miss;
}

/** Builder summary: per filed plan placement, whether it competes or what it still needs. */
export function planReadiness(r: Omit<OwnerDrillRow, "created_at" | "id">): Array<{ slot: PlanSlot; missing: string[] }> {
  return PLAN_SLOTS.filter((s) => r.placements.includes(s)).map((slot) => ({ slot, missing: missingForPlacement(r, slot) }));
}

export interface MergeContext {
  sport: string;
  /** Athlete's declared equipment tokens. Unknown/empty → only equipment-free drills qualify. */
  owned?: ReadonlySet<string> | null;
  /** Required for the skill slot: which skill block is being built. */
  skill?: SkillBlock;
  day?: Date;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Every condition the drill declares must hold. */
export function eligibleFor(r: OwnerDrillRow, slots: PlanSlot[], ctx: MergeContext): boolean {
  if (!r.active) return false;
  const slot = slots.find((s) => r.placements.includes(s));
  if (!slot) return false;
  if (missingForPlacement(r, slot).length > 0) return false;
  if (!r.sports.includes(ctx.sport)) return false;
  if (slot === "hammers_today:skill" && (!ctx.skill || !skillBlocksOf(r).includes(ctx.skill))) return false;
  const need = r.equipment.map(norm).filter(Boolean);
  if (need.length > 0) {
    const owned = new Set([...(ctx.owned ?? [])].map(norm));
    if (!need.every((e) => owned.has(e))) return false;
  }
  return true;
}

export function ownerDrillsForSlot(slots: PlanSlot[], ctx: MergeContext): OwnerDrillRow[] {
  return rows.filter((r) => eligibleFor(r, slots, ctx));
}

interface StepLike { name: string; dosage?: string; cue?: string }

/** Swap one drill (the last) for today's owner drill. Count unchanged. */
export function mergeOwnerSlotDrills<T extends StepLike>(drills: T[], slots: PlanSlot[], ctxOrSport: MergeContext | string, day = new Date()): T[] {
  const ctx: MergeContext = typeof ctxOrSport === "string" ? { sport: ctxOrSport, day } : ctxOrSport;
  const pool = ownerDrillsForSlot(slots, ctx).sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0 || drills.length === 0) return drills;
  const dayIndex = Math.floor((ctx.day ?? day).getTime() / 86_400_000);
  const pick = pool[dayIndex % pool.length];
  // Replace the slot wholesale so no built-in set-up, guide or slug leaks onto his drill.
  const owned = {
    name: pick.name,
    dosage: pick.dosage ?? "",
    cue: pick.cue ?? "",
    ...(clean(pick.setup) ? { setup: pick.setup } : {}),
    ...(pick.equipment.length ? { equipmentNote: pick.equipment.join(", ") } : {}),
  } as unknown as T;
  return [...drills.slice(0, -1), owned];
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") void loadOwnerPlanDrills();
