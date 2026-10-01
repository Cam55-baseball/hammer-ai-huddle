/**
 * Owner drills filed under Hammers Today / defensive library placements.
 *
 * Owner-approved narrow addition (2026-10-01): plan generation merges switched-on
 * owner drills into the slot they were filed under — nothing else. The merge
 * never changes HOW MANY drills a block prescribes: it swaps one slot, rotating
 * through the owner's drills by day so no single drill monopolises the block.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OwnerDrillRow } from "./ownerDrills";

export type PlanSlot = "hammers_today:skill" | "hammers_today:warmup" | "hammers_today:defense" | "defensive_library";

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

export function ownerDrillsForSlot(slots: PlanSlot[], sport: string): OwnerDrillRow[] {
  return rows.filter(
    (r) => r.active && r.placements.some((p) => slots.includes(p as PlanSlot))
      && (r.sports.length === 0 || r.sports.includes(sport)),
  );
}

interface StepLike { name: string; dosage?: string; cue?: string }

/** Swap one drill (the last) for today's owner drill. Count unchanged. */
export function mergeOwnerSlotDrills<T extends StepLike>(drills: T[], slots: PlanSlot[], sport: string, day = new Date()): T[] {
  const pool = ownerDrillsForSlot(slots, sport).sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0 || drills.length === 0) return drills;
  const dayIndex = Math.floor(day.getTime() / 86_400_000);
  const pick = pool[dayIndex % pool.length];
  const owned = { ...drills[drills.length - 1], name: pick.name, dosage: pick.dosage ?? "", cue: pick.cue ?? "" } as T;
  return [...drills.slice(0, -1), owned];
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") void loadOwnerPlanDrills();
