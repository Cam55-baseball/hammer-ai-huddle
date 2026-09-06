/**
 * Fault Ledger readers.
 *
 * `useFaultLedger` — every signal recorded about the signed-in athlete, already
 * collapsed into ranked root patterns.
 * `useFamilyAlternatives` — the same-problem ladder for a movement, filtered to
 * the gear the athlete actually has, with real catalog names.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { rankFaults, type FaultSignal, type RankedFault } from "@/lib/wic/faultLedger/ranking";
import {
  familyForSlug,
  laddersAtOrBelow,
  type EquipmentTier,
} from "@/lib/wic/faultLedger/families";
import {
  resolveEquipmentTier,
  type EquipmentTierResult,
} from "@/lib/wic/faultLedger/equipmentTier";

export function useFaultLedger(days = 120) {
  const { user } = useAuth();
  return useQuery<RankedFault[]>({
    queryKey: ["fault-ledger", user?.id, days],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("wk_fault_signals")
        .select(
          "id,user_id,source,fault_key,root_pattern_id,discipline,confidence,sample_size,severity,evidence,observed_at",
        )
        .gte("observed_at", since)
        .order("observed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return rankFaults((data ?? []) as unknown as FaultSignal[]);
    },
  });
}

export interface FamilyAlternative {
  readonly slug: string;
  readonly name: string;
  readonly tier: EquipmentTier;
  readonly equipment: string[];
}

/** Same-purpose swaps for a movement, least gear first. Empty when unmapped. */
export function useFamilyAlternatives(slug: string | undefined, tier: EquipmentTier = 1) {
  const family = slug ? familyForSlug(slug) : null;
  const rungs = family ? laddersAtOrBelow(family, tier, slug) : [];

  return useQuery<FamilyAlternative[]>({
    queryKey: ["family-alternatives", family?.id, slug, tier],
    enabled: rungs.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_movement_catalog")
        .select("slug,name,equipment_requirements")
        .in(
          "slug",
          rungs.map((r) => r.slug),
        )
        .eq("is_active", true);
      if (error) throw error;
      const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r]));
      return rungs
        .map((r) => {
          const row = bySlug.get(r.slug);
          if (!row) return null;
          return {
            slug: r.slug,
            name: row.name as string,
            tier: r.tier,
            equipment: ((row.equipment_requirements as string[] | null) ?? []).filter(
              (e) => e && e !== "bodyweight",
            ),
          } satisfies FamilyAlternative;
        })
        .filter((x): x is FamilyAlternative => x !== null);
    },
  });
}

/**
 * The athlete's real equipment tier, read from their own profile.
 * Falls back to tier 0 (nothing at all) whenever the profile is missing,
 * expired, or says nothing we recognise — never upward.
 */
export function useAthleteEquipmentTier() {
  const { user } = useAuth();
  return useQuery<EquipmentTierResult>({
    queryKey: ["athlete-equipment-tier", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_equipment_context")
        .select("equipment,valid_until,confidence")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const expired = data?.valid_until ? new Date(data.valid_until).getTime() < Date.now() : false;
      if (!data || expired) return resolveEquipmentTier([]);
      return resolveEquipmentTier((data.equipment as string[] | null) ?? []);
    },
  });
}
