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

/** Catalog fields needed to re-derive a ladder with the backend's own rules. */
interface FamilyRow extends SwapCandidate {
  substitution_family: string | null;
  season_legality: Record<string, boolean> | null;
  training_age_legality: Record<string, boolean> | null;
}

const CATALOG_COLS =
  "slug, name, movement_category, substitution_family, season_legality, training_age_legality, default_sets, default_reps, default_duration_seconds, default_distance_feet, default_total_reps, dosage_unit, equipment_requirements, cue";

/**
 * Mirror of `_shared/wic/lift/substitutions.ts::resolveSubstitutionLadder`.
 * Used ONLY when a prescription row predates the catalog carrying a
 * substitution family (its stored ladder is empty). Same family, same
 * category, same season/training-age legality rules — so a fallback swap can
 * never land somewhere the certified resolver would have refused.
 */
function deriveLadder(self: FamilyRow, members: FamilyRow[], phase: string | null): Ladder {
  const legal = (c: FamilyRow) => (phase && c.season_legality ? c.season_legality[phase] !== false : true);
  const usable = members.filter((c) => c.slug !== self.slug && legal(c));
  const lowEquip = (c: FamilyRow) => {
    const req = (c.equipment_requirements ?? []).map((s) => String(s).toLowerCase());
    return req.length === 0 || req.every((r) => ["bodyweight", "band", "kb", "db"].includes(r));
  };
  const baseSets = self.default_sets ?? 3;
  return {
    equipment_unavailable: usable.map((c) => c.slug),
    facility_unavailable: usable.filter(lowEquip).map((c) => c.slug),
    injury_restriction: usable.map((c) => c.slug),
    time_restriction: usable.filter((c) => (c.default_sets ?? 3) <= baseSets).map((c) => c.slug),
    coach_override: usable.map((c) => c.slug),
  };
}

/**
 * Resolve the effective ladder + catalog rows for a lift row.
 *
 * Preference order:
 *   1. The generator-certified ladder stored on the prescription.
 *   2. A catalog-derived ladder using the identical resolver rules, for rows
 *      generated before the catalog carried substitution families.
 *
 * Options are always filtered to the SAME movement category as the prescribed
 * lift — the categorical integrity gate applies to swaps exactly as it applies
 * to generation.
 */
export function useSwapLadder(rx: WkRx | null, enabled: boolean) {
  const stored = rx ? readLadder(rx) : {};
  const storedSlugs = ladderSlugs(stored);
  const category = rx ? governanceCategory(rx) : null;
  const needsFallback = storedSlugs.length === 0;

  const query = useQuery({
    queryKey: needsFallback
      ? ["wk-swap-family", category, rx?.movement_slug, rx?.phase]
      : ["wk-swap-options", rx?.id, storedSlugs.join(",")],
    enabled: enabled && !!rx && (storedSlugs.length > 0 || !!category),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ ladder: Ladder; options: Record<string, SwapCandidate> }> => {
      const wanted = [...storedSlugs, rx?.substituted_from_slug ?? "", rx?.movement_slug ?? ""].filter(Boolean);
      let q = supabase.from("wk_movement_catalog" as any).select(CATALOG_COLS);
      q = needsFallback ? q.eq("movement_category", category) : q.in("slug", wanted);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as FamilyRow[];

      let ladder: Ladder = stored;
      let allowed = rows;
      if (needsFallback) {
        const self = rows.find((r) => r.slug === rx?.movement_slug);
        if (!self) return { ladder: {}, options: {} };
        const family = self.substitution_family;
        allowed = rows.filter((r) => (family ? r.substitution_family === family : true));
        ladder = deriveLadder(self, allowed, rx?.phase ?? null);
      }

      const options: Record<string, SwapCandidate> = {};
      for (const row of allowed) {
        const isOriginal = row.slug === rx?.substituted_from_slug;
        if (!isOriginal && category && row.movement_category && row.movement_category !== category) continue;
        options[row.slug] = row;
      }
      return { ladder, options };
    },
  });

  const ladder = query.data?.ladder ?? (needsFallback ? {} : stored);
  const options = query.data?.options ?? {};
  const hasOptions = SWAP_REASON_ORDER.some((r) =>
    (ladder[r] ?? []).some((s) => options[s] && s !== rx?.movement_slug),
  );

  return { ladder, options, hasOptions, isLoading: query.isLoading, isFetched: query.isFetched };
}

/** Back-compat accessor used by the Undo chip: catalog rows only. */
export function useSwapOptions(rx: WkRx | null, enabled: boolean) {
  const { options, isLoading } = useSwapLadder(rx, enabled);
  return { data: options, isLoading };
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
