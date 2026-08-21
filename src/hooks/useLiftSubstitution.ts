/**
 * useLiftSubstitution — turns the generator-certified substitution ladder on a
 * lift prescription into a real, athlete-facing swap.
 *
 * Zero parallel storage: options come from `why_payload.lift_governance
 * .substitution_ladder` (already resolved, season/training-age legal at
 * generation time) and the swap writes back to the same `wk_prescriptions`
 * row using its existing `substituted_from_slug` / `substitution_reason`
 * columns. No generator, validator or dosage-doctrine behaviour changes —
 * a swap can only land inside the ladder the backend already certified.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";

export type SwapReason =
  | "equipment_unavailable"
  | "facility_unavailable"
  | "injury_restriction"
  | "time_restriction"
  | "coach_override";

export const SWAP_REASON_LABEL: Record<SwapReason, string> = {
  equipment_unavailable: "No equipment / no rack",
  facility_unavailable: "Not at the facility",
  injury_restriction: "Something hurts",
  time_restriction: "Short on time",
  coach_override: "Coach override",
};

export const SWAP_REASON_ORDER: SwapReason[] = [
  "equipment_unavailable",
  "facility_unavailable",
  "injury_restriction",
  "time_restriction",
  "coach_override",
];

export interface SwapCandidate {
  slug: string;
  name: string;
  movement_category: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration_seconds: number | null;
  default_distance_feet: number | null;
  default_total_reps: number | null;
  dosage_unit: string | null;
  equipment_requirements: string[] | null;
  cue: string | null;
}

export type Ladder = Partial<Record<SwapReason, string[]>>;

export function readLadder(rx: WkRx): Ladder {
  const gov = (rx.why_payload as Record<string, any> | null)?.lift_governance;
  const ladder = gov?.substitution_ladder;
  if (!ladder || typeof ladder !== "object") return {};
  const out: Ladder = {};
  for (const reason of SWAP_REASON_ORDER) {
    const rung = (ladder as Record<string, unknown>)[reason];
    if (Array.isArray(rung)) {
      out[reason] = rung.filter((s): s is string => typeof s === "string" && s.length > 0);
    }
  }
  return out;
}

export function ladderSlugs(ladder: Ladder): string[] {
  return [...new Set(SWAP_REASON_ORDER.flatMap((r) => ladder[r] ?? []))];
}

export function governanceCategory(rx: WkRx): string | null {
  const gov = (rx.why_payload as Record<string, any> | null)?.lift_governance;
  const cat = gov?.movement_category;
  return typeof cat === "string" ? cat : null;
}

/**
 * Load catalog rows for every slug in the ladder (plus the original, so Undo
 * can restore an exact dose). Options are filtered to the SAME movement
 * category as the prescribed lift — the categorical integrity gate applies to
 * swaps exactly as it applies to generation, so a trunk movement can never be
 * swapped for a throwing movement just because they share a family.
 */
export function useSwapOptions(rx: WkRx | null, enabled: boolean) {
  const ladder = rx ? readLadder(rx) : {};
  const slugs = rx ? [...ladderSlugs(ladder), rx.substituted_from_slug ?? ""].filter(Boolean) : [];
  const category = rx ? governanceCategory(rx) : null;

  return useQuery({
    queryKey: ["wk-swap-options", rx?.id, slugs.join(",")],
    enabled: enabled && slugs.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, SwapCandidate>> => {
      const { data, error } = await supabase
        .from("wk_movement_catalog" as any)
        .select(
          "slug, name, movement_category, default_sets, default_reps, default_duration_seconds, default_distance_feet, default_total_reps, dosage_unit, equipment_requirements, cue",
        )
        .in("slug", slugs);
      if (error) throw error;
      const map: Record<string, SwapCandidate> = {};
      for (const row of (data ?? []) as unknown as SwapCandidate[]) {
        // Category gate — the original slug is always allowed back (Undo).
        const isOriginal = row.slug === rx?.substituted_from_slug;
        if (!isOriginal && category && row.movement_category && row.movement_category !== category) {
          continue;
        }
        map[row.slug] = row;
      }
      return map;
    },
  });
}

interface ApplyArgs {
  rx: WkRx;
  candidate: SwapCandidate;
  reason: SwapReason;
}

/** Dose carried over from the prescription; "short on time" trims sets to the
 *  replacement's own default when that default is lighter. */
export function projectedDose(rx: WkRx, candidate: SwapCandidate, reason: SwapReason) {
  let sets = rx.sets;
  if (reason === "time_restriction" && candidate.default_sets && sets && candidate.default_sets < sets) {
    sets = candidate.default_sets;
  }
  return {
    sets,
    reps: rx.reps,
    duration_seconds: rx.duration_seconds,
    distance_feet: rx.distance_feet,
    total_reps: rx.total_reps,
    dosage_unit: rx.dosage_unit,
    tempo: rx.tempo,
    load_pct: rx.load_pct,
  };
}

export function describeDose(d: ReturnType<typeof projectedDose>): string {
  const unit = (d.dosage_unit ?? "reps").toLowerCase();
  if (unit === "seconds" && d.duration_seconds && (!d.sets || d.sets <= 1)) {
    return d.duration_seconds >= 60 ? `${Math.round(d.duration_seconds / 60)} min total` : `${d.duration_seconds} sec total`;
  }
  const parts: string[] = [];
  if (d.sets && d.reps && !(d.sets === 1 && d.reps === 1)) parts.push(`${d.sets} × ${d.reps}`);
  else if (d.sets && d.sets > 1) parts.push(`${d.sets} sets`);
  if (d.duration_seconds) parts.push(`${d.duration_seconds} sec per set`);
  if (d.distance_feet) parts.push(`${d.distance_feet} ft per rep`);
  if (d.total_reps && d.total_reps !== d.reps) parts.push(`${d.total_reps} total`);
  return parts.length ? parts.join(" • ") : "Same dose as prescribed";
}

export function useLiftSubstitution(planDate: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = () => {
    if (user?.id) qc.invalidateQueries({ queryKey: ["wk-rx", user.id, planDate] });
  };

  const apply = useMutation({
    mutationFn: async ({ rx, candidate, reason }: ApplyArgs) => {
      const dose = projectedDose(rx, candidate, reason);
      const why = { ...(rx.why_payload ?? {}) } as Record<string, unknown>;
      why.athlete_substitution = {
        from_slug: rx.movement_slug,
        from_name: rx.movement_name,
        from_sets: rx.sets,
        to_slug: candidate.slug,
        reason,
        reason_label: SWAP_REASON_LABEL[reason],
        at: new Date().toISOString(),
      };
      if (candidate.cue) why.cue = candidate.cue;
      const { error } = await supabase
        .from("wk_prescriptions" as any)
        .update({
          movement_slug: candidate.slug,
          movement_name: candidate.name,
          sets: dose.sets,
          substituted_from_slug: rx.substituted_from_slug ?? rx.movement_slug,
          substitution_reason: `Swapped — ${SWAP_REASON_LABEL[reason]}`,
          why_payload: why,
        })
        .eq("id", rx.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Swapped — your plan is updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't swap that movement"),
  });

  const undo = useMutation({
    mutationFn: async ({ rx, original }: { rx: WkRx; original: SwapCandidate }) => {
      const why = { ...(rx.why_payload ?? {}) } as Record<string, unknown>;
      delete why.athlete_substitution;
      if (original.cue) why.cue = original.cue;
      const { error } = await supabase
        .from("wk_prescriptions" as any)
        .update({
          movement_slug: original.slug,
          movement_name: original.name,
          sets:
            ((rx.why_payload as Record<string, any> | null)?.athlete_substitution?.from_sets as number | undefined) ??
            original.default_sets ??
            rx.sets,
          substituted_from_slug: null,
          substitution_reason: null,
          why_payload: why,
        })
        .eq("id", rx.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Original movement restored.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't undo that swap"),
  });

  return { apply, undo };
}
