/**
 * Game Performance ledger adapter — single source of truth for every
 * Supabase read/write against the `gp_*` family.
 *
 * Why this exists:
 *  - Centralizes the table names so a future rename touches one file.
 *  - Makes drift-proofing easy: `scripts/check-no-legacy-games.sh` only has
 *    to look here for legitimate `gp_*` strings.
 *  - Lets us add lineage / observability hooks in one spot later.
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
} as const;

export type GpTable = (typeof GP_TABLES)[keyof typeof GP_TABLES];

export function gp(table: GpTable) {
  return (supabase as any).from(table);
}

export const GP_DOC_BUCKET = "gp-documents";
