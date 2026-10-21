/**
 * useLiftSubstitution — existing athlete alternatives, with display safety checks.
 *
 * Zero parallel storage: options come from `why_payload.lift_governance
 * .substitution_ladder` (already resolved, season/training-age legal at
 * generation time) and the swap writes back to the same `wk_prescriptions`
 * row using its existing `substituted_from_slug` / `substitution_reason`
 * columns. No generator, validator or dosage-doctrine behaviour changes —
 * These checks are NOT fresh server certification for the universal AI Swap.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadTier, type RiskFacts } from "@/lib/prescription/alternativeRisk";
import { busyGymEquivalents } from "@/lib/prescription/busyGymEquivalents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import { recordedSwapDose, sameDoseSwap } from "@/lib/prescription/sameDoseSwap";
import { swapOrigin, restoreSwapInstructions, requireUnmarkedSwap } from "@/lib/prescription/swapReceipt";
import { eligibleSwapCandidate } from "@/lib/prescription/swapEligibility";
import { isEccentricOverloadPhaseIllegal } from "../../supabase/functions/_shared/wic/season";

export type SwapReason =
  | "equipment_unavailable"
  | "facility_unavailable"
  | "injury_restriction"
  | "time_restriction"
  | "coach_override";

export const SWAP_REASON_LABEL: Record<SwapReason, string> = {
  equipment_unavailable: "No equipment / no rack",
  facility_unavailable: "Busy gym / not at the facility",
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
interface FamilyRow extends SwapCandidate, Omit<RiskFacts, "equipment_requirements"> {
  is_active: boolean | null;
  substitution_family: string | null;
  season_legality: Record<string, boolean> | null;
  training_age_legality: Record<string, boolean> | null;
  season_eligibility: string[] | null;
  phase_allow: string[] | null;
  is_eccentric_dominant: boolean | null;
  sport_scope: string | null;
}

const CATALOG_COLS =
  "slug, name, is_active, sport_scope, movement_category, substitution_family, season_legality, season_eligibility, phase_allow, is_eccentric_dominant, training_age_legality, default_sets, default_reps, default_duration_seconds, default_distance_feet, default_total_reps, dosage_unit, equipment_requirements, cue, min_age_years, plyo_tier, ub_tier, eccentric_overload, contraindications";

/**
 * Mirror of `_shared/wic/lift/substitutions.ts::resolveSubstitutionLadder`.
 * Used ONLY when a prescription row predates the catalog carrying a
 * substitution family (its stored ladder is empty). Same family, same
 * category, same season/training-age legality rules — so a fallback swap can
 * never land somewhere the certified resolver would have refused.
 */
function deriveLadder(self: FamilyRow, members: FamilyRow[], phase: string | null): Ladder {
  const legal = (c: FamilyRow) => !!phase && !isEccentricOverloadPhaseIllegal(c, phase) && c.season_legality?.[phase] === true;
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
  const { user } = useAuth();
  const stored = rx ? readLadder(rx) : {};
  const storedSlugs = ladderSlugs(stored);
  const govCategory = rx ? governanceCategory(rx) : null;
  const needsFallback = storedSlugs.length === 0;

  const query = useQuery({
    queryKey: [needsFallback ? "wk-swap-family" : "wk-swap-options", user?.id, rx?.id,
      govCategory, rx?.movement_slug, rx?.substituted_from_slug, rx?.phase, rx?.dosage_unit,
      rx?.why_payload?.training_age_context?.classification,
      rx?.why_payload?.athlete_context?.identity.sport, storedSlugs.join(",")],
    enabled: enabled && !!rx && !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ ladder: Ladder; options: Record<string, SwapCandidate> }> => {
      // Non-lift cards carry no lift_governance: read the category off the catalog row itself.
      let category = govCategory;
      if (!category && rx?.movement_slug) {
        const { data: selfRow, error: selfError } = await supabase.from("wk_movement_catalog" as any).select("movement_category").eq("slug", rx.movement_slug).maybeSingle();
        if (selfError) throw selfError;
        category = ((selfRow as any)?.movement_category as string | null) ?? null;
      }
      if (needsFallback && !category) return { ladder: {}, options: {} };
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
        allowed = family ? rows.filter((r) => r.substitution_family === family) : [];
        ladder = deriveLadder(self, allowed, rx?.phase ?? null);
      }

      const options: Record<string, SwapCandidate> = {};
      // Risk is judged against the ORIGINAL prescription (so swapping twice can't creep up).
      const anchor = rows.find((r) => r.slug === (rx?.substituted_from_slug ?? rx?.movement_slug));
      const eligibilityContext = { category, unit: rx?.dosage_unit ?? null, phase: rx?.phase ?? null,
        trainingAge: rx?.why_payload?.training_age_context?.classification ?? null,
        sport: rx?.why_payload?.athlete_context?.identity.sport ?? null };
      for (const row of allowed) {
        const isOriginal = row.slug === rx?.substituted_from_slug;
        if (!isOriginal && (!anchor || !eligibleSwapCandidate(anchor, row, eligibilityContext))) continue;
        options[row.slug] = row;
      }
      // Busy gym: barbell / trap-bar lifts also get pattern equivalents that need neither.
      const anchorSlug = rx?.substituted_from_slug ?? rx?.movement_slug ?? null;
      if (anchor && loadTier(anchor.equipment_requirements) >= 2) {
        const eq = busyGymEquivalents(anchorSlug);
        if (eq.length) {
          const { data: eqRows, error: eqError } = await supabase.from("wk_movement_catalog" as any)
            .select(CATALOG_COLS).in("slug", eq).eq("is_active", true);
          if (eqError) throw eqError;
          const picked: string[] = [];
          for (const r of (eqRows ?? []) as unknown as FamilyRow[]) {
            if (!eligibleSwapCandidate(anchor, r, { ...eligibilityContext, approvedEquivalent: true })) continue;
            options[r.slug] = r; picked.push(r.slug);
          }
          if (picked.length) {
            ladder = { ...ladder, facility_unavailable: [...new Set([...(ladder.facility_unavailable ?? []), ...picked])] };
          }
        }
      }
      return { ladder, options };
    },
  });

  const ladder = query.isSuccess ? query.data?.ladder ?? {} : {};
  const options = query.isSuccess ? query.data?.options ?? {} : {};
  const hasOptions = SWAP_REASON_ORDER.some((r) =>
    (ladder[r] ?? []).some((s) => options[s] && s !== rx?.movement_slug),
  );

  return { ladder, options, hasOptions, isLoading: query.isLoading, isFetched: query.isFetched, error: query.error };
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

/** Owner Oct 21: an alternative never changes dose, including short-on-time requests. */
export function projectedDose(rx: WkRx, candidate: SwapCandidate, _reason: SwapReason) {
  return sameDoseSwap(rx, candidate);
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

  // Receipts alone do not catch a dose/rest edit made by another visit or the generator.
  // Every field we retain/overwrite must still match the row the athlete saw.
  const matchPrescription = (query: any, rx: WkRx) => {
    for (const field of ["sets", "reps", "duration_seconds", "distance_feet", "total_reps",
      "dosage_unit", "tempo", "load_pct", "rest_seconds", "intensity", "substituted_from_slug",
      "substitution_reason", "movement_name", "slot", "phase", "sequence_order", "sequence_role"] as const) {
      const value = rx[field];
      // Older payloads may omit optional context; never pretend an omitted dose is saved.
      if (value === undefined) continue;
      query = value === null ? query.is(field, null) : query.eq(field, value);
    }
    return query;
  };

  const requireVisit = (rx: WkRx) => {
    if (rx.plan_date !== planDate) throw new Error("This exercise belongs to a different day's plan. Reload your plan.");
    recordedSwapDose(rx);
  };

  const apply = useMutation({
    mutationFn: async ({ rx, candidate, reason }: ApplyArgs) => {
      if (!user?.id) throw new Error("Sign in to change your plan.");
      requireVisit(rx);
      requireUnmarkedSwap(rx.status);
      const dose = projectedDose(rx, candidate, reason);
      const why = { ...(rx.why_payload ?? {}) } as Record<string, unknown>;
      why.athlete_substitution = {
        ...swapOrigin({ ...rx, why_payload: rx.why_payload }),
        to_slug: candidate.slug,
        reason,
        reason_label: SWAP_REASON_LABEL[reason],
        at: new Date().toISOString(),
      };
      if (candidate.cue !== null) why.cue = candidate.cue;
      else delete why.cue;
      let update = supabase
        .from("wk_prescriptions" as any)
        .update({
          movement_slug: candidate.slug,
          movement_name: candidate.name,
          sets: dose.sets,
          reps: dose.reps,
          duration_seconds: dose.duration_seconds,
          distance_feet: dose.distance_feet,
          total_reps: dose.total_reps,
          dosage_unit: dose.dosage_unit,
          tempo: dose.tempo,
          load_pct: dose.load_pct,
          substituted_from_slug: rx.substituted_from_slug ?? rx.movement_slug,
          substitution_reason: `Swapped — ${SWAP_REASON_LABEL[reason]}`,
          why_payload: why,
        })
        .eq("id", rx.id)
        .eq("user_id", user.id)
        .eq("plan_date", rx.plan_date)
        .eq("movement_slug", rx.movement_slug)
        .eq("status", rx.status);
      update = rx.why_payload === null ? update.is("why_payload", null) : update.eq("why_payload", JSON.stringify(rx.why_payload));
      update = matchPrescription(update, rx);
      const { data, error } = await update.select("id,movement_slug");
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1) throw new Error("Your plan changed before this alternative was saved. Reload your plan.");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Swapped — your plan is updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't swap that movement"),
  });

  const undo = useMutation({
    mutationFn: async ({ rx, original }: { rx: WkRx; original: SwapCandidate }) => {
      if (!user?.id) throw new Error("Sign in to change your plan.");
      requireVisit(rx);
      requireUnmarkedSwap(rx.status);
      const origin = swapOrigin({ ...rx, why_payload: rx.why_payload });
      if (!rx.substituted_from_slug || original.slug !== origin.from_slug) throw new Error("The original exercise could not be matched. Your session is unchanged.");
      const why = restoreSwapInstructions(rx.why_payload ?? {}, origin);
      let update = supabase
        .from("wk_prescriptions" as any)
        .update({
          movement_slug: origin.from_slug,
          movement_name: origin.from_name,
          ...origin.from_dose,
          substituted_from_slug: null,
          substitution_reason: null,
          why_payload: why,
        })
        .eq("id", rx.id)
        .eq("user_id", user.id)
        .eq("plan_date", rx.plan_date)
        .eq("movement_slug", rx.movement_slug)
        .eq("status", rx.status);
      update = rx.why_payload === null ? update.is("why_payload", null) : update.eq("why_payload", JSON.stringify(rx.why_payload));
      update = matchPrescription(update, rx);
      const { data, error } = await update.select("id,movement_slug");
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1) throw new Error("Your plan changed before Undo was saved. Reload your plan.");
    },
    onSuccess: () => {
      invalidate();
      toast.success("Original movement restored.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't undo that swap"),
  });

  return { apply, undo };
}
