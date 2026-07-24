/**
 * Load-prescription scaffold (Phase 2, flag-gated).
 *
 * Reads the last N `wk_session_logs` rows for a given movement and returns a
 * suggested target load. Currently returns null unless explicitly enabled so
 * today's plan is never mutated — the engine simply collects data.
 *
 * Wire behind a flag inside the lift generator when you want it live:
 *   const suggested = await suggestLoad({ userId, movementSlug });
 *   if (suggested) rx.load_lb = suggested;
 */
import { supabase } from "@/integrations/supabase/client";

export interface LoadSuggestionInput {
  userId: string;
  movementSlug: string;
  /** Prescribed rep target — used to weight recent sets appropriately. */
  targetReps?: number | null;
  /** How many recent logs to consider. */
  lookback?: number;
  /** Master kill switch. Default OFF — Phase 2 opt-in only. */
  enabled?: boolean;
}

export interface LoadSuggestion {
  load: number;
  basis: "recent-max" | "trimmed-mean" | "insufficient-data";
  sampleSize: number;
  lastRpe: number | null;
}

export async function suggestLoad(input: LoadSuggestionInput): Promise<LoadSuggestion | null> {
  const { userId, movementSlug, lookback = 6, enabled = false } = input;
  if (!enabled || !userId || !movementSlug) return null;

  const { data, error } = await (supabase as any)
    .from("wk_session_logs")
    .select("load_used, rpe, plan_date, metrics")
    .eq("user_id", userId)
    .eq("movement_slug", movementSlug)
    .order("plan_date", { ascending: false })
    .limit(lookback);
  if (error || !data?.length) return null;

  const loads = data
    .map((r: any) => Number(r.load_used))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  if (loads.length < 2) {
    return { load: loads[0] ?? 0, basis: "insufficient-data", sampleSize: loads.length, lastRpe: data[0]?.rpe ?? null };
  }

  const sorted = [...loads].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1).length ? sorted.slice(1, -1) : sorted;
  const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  const lastRpe = data[0]?.rpe ?? null;

  // If most recent set was easy (RPE ≤ 6), nudge up ~2.5%; hard (RPE ≥ 9) nudge down ~5%.
  let target = mean;
  if (typeof lastRpe === "number") {
    if (lastRpe <= 6) target = mean * 1.025;
    else if (lastRpe >= 9) target = mean * 0.95;
  }
  const rounded = Math.round(target / 2.5) * 2.5;

  return { load: rounded, basis: "trimmed-mean", sampleSize: loads.length, lastRpe };
}
