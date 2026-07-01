/**
 * useBlockedLiftMovements — for the current WK phase, return catalog rows
 * whose `phase_allow` explicitly excludes it (e.g. OS-only eccentrics
 * blocked in-season). Powers the "Request 1-session override" affordance
 * inside WkLiftsCard so athletes can see WHAT was withheld and WHY.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlockedMovement {
  slug: string;
  name: string;
  category: string;
  intensity_class: string | null;
  source_philosophy: string | null;
  phase_allow: string[] | null;
  is_eccentric_dominant: boolean | null;
}

export function useBlockedLiftMovements(phaseKey: string | null) {
  return useQuery({
    queryKey: ["wk-blocked-lifts", phaseKey],
    enabled: !!phaseKey,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BlockedMovement[]> => {
      const { data, error } = await supabase
        .from("wk_movement_catalog" as any)
        .select("slug, name, category, intensity_class, source_philosophy, phase_allow, is_eccentric_dominant")
        .in("category", ["compound", "supplemental", "unilateral"]);
      if (error) throw error;
      const rows = (data ?? []) as unknown as BlockedMovement[];
      return rows.filter(
        (m) => Array.isArray(m.phase_allow) && m.phase_allow.length > 0 && !m.phase_allow.includes(phaseKey!),
      );
    },
  });
}

export function explainWhyBlocked(m: BlockedMovement, phaseKey: string): string {
  const allow = (m.phase_allow ?? []).join(", ") || "none";
  if (m.is_eccentric_dominant && phaseKey.startsWith("in_")) {
    return "Eccentric-dominant — blocked in-season to protect freshness.";
  }
  if (phaseKey === "post_season") {
    return "Post-season — high-intensity work suppressed to allow recovery.";
  }
  return `Legal phases: ${allow}.`;
}
