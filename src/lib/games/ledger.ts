/**
 * Game Performance ledger adapter — single source of truth for every
 * Supabase read/write against the `gp_*` family.
 */
import { supabase } from "@/integrations/supabase/client";

export const GP_TABLES = {
  games: "gp_games",
  atBats: "gp_at_bats",
  pitches: "gp_pitches",
  defense: "gp_defense_plays",
  baserun: "gp_baserun_events",
  subs: "gp_subs",
  pitcherDossiers: "gp_pitcher_dossiers",
  opponentHitters: "gp_opponent_hitters",
  documents: "gp_documents",
  pregamePlans: "gp_pregame_plans",
  planOutcomes: "gp_plan_outcomes",
  abSwingAnalyses: "gp_ab_swing_analyses",
  plannerPriors: "gp_planner_priors",
} as const;

export type GpTable = (typeof GP_TABLES)[keyof typeof GP_TABLES];

export function gp(table: GpTable | string) {
  return (supabase as any).from(table);
}

export const GP_DOC_BUCKET = "gp-documents";
export const GP_DOSSIER_VIDEO_BUCKET = "gp-dossier-videos";
