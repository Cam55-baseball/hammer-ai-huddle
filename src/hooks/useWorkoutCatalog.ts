import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogMovement {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  movement_category: string | null;
  source_philosophy: string | null;
  cue: string | null;
  why_prescribed: string | null;
  primary_adaptation: string | null;
  equipment: string[] | null;
  phase_allow: string[] | null;
  season_eligibility: string[] | null;
  season_legality: Record<string, boolean> | null;
  training_age_legality: Record<string, boolean> | null;
  cns_cost: number | null;
  recovery_window_hours: number | null;
  pap_classification: string | null;
  movement_velocity: string | null;
  game_day_legal: boolean | null;
  practice_day_legal: boolean | null;
  min_age_years: number | null;
  default_sets: number | null;
  default_reps: number | null;
  is_eccentric_dominant: boolean | null;
  governance_version: string | null;
}

export function useWorkoutCatalog() {
  return useQuery({
    queryKey: ["wk_movement_catalog", "viewer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_movement_catalog")
        .select(
          "id,slug,name,category,movement_category,source_philosophy,cue,why_prescribed,primary_adaptation,equipment,phase_allow,season_eligibility,season_legality,training_age_legality,cns_cost,recovery_window_hours,pap_classification,movement_velocity,game_day_legal,practice_day_legal,min_age_years,default_sets,default_reps,is_eccentric_dominant,governance_version",
        )
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CatalogMovement[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export const QUARTER_TABS = [
  { key: "os_q1", label: "Q1 — Strength & Capacity" },
  { key: "os_q2", label: "Q2 — Power Build" },
  { key: "os_q3", label: "Q3 — Elastic Transfer" },
  { key: "os_q4", label: "Q4 — Sport Sharpen" },
  { key: "in_season", label: "In-Season" },
  { key: "post_season", label: "Post-Season" },
  { key: "game_day", label: "Game-Day Legal" },
] as const;

export type QuarterKey = (typeof QUARTER_TABS)[number]["key"];

export function isMovementInQuarter(m: CatalogMovement, q: QuarterKey): boolean {
  if (q === "game_day") return !!m.game_day_legal;
  // Prefer season_legality jsonb when populated
  if (m.season_legality && typeof m.season_legality === "object") {
    const v = (m.season_legality as Record<string, unknown>)[q];
    if (typeof v === "boolean") return v;
  }
  // Fallback: season_eligibility or phase_allow
  if (m.season_eligibility?.includes(q)) return true;
  if (m.phase_allow?.includes(q)) return true;
  return false;
}
