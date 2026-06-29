/**
 * useGpRealtime — single subscription to every gp_* ledger table.
 *
 * Invalidates the matching React Query keys when rows insert/update/delete
 * so loggers and reports update without refresh. Scoped by user_id (RLS
 * already enforces; we filter client-side too as a safety belt).
 *
 * Mirrors the auth-stable gating used in Calendar.tsx so reconnect storms
 * don't evict typing users.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TABLES = [
  "gp_games",
  "gp_at_bats",
  "gp_pitches",
  "gp_defense_plays",
  "gp_baserun_events",
  "gp_subs",
] as const;

const KEYS_BY_TABLE: Record<(typeof TABLES)[number], readonly string[]> = {
  gp_games: ["gp-games-list", "gp-game"],
  gp_at_bats: ["gp-ab", "gp-at-bats-all"],
  gp_pitches: ["gp-pitches", "gp-pitches-all", "gp-ab-pitches"],
  gp_defense_plays: ["gp-def", "gp-defense-all"],
  gp_baserun_events: ["gp-br", "gp-baserun-all"],
  gp_subs: ["gp-subs"],
};

export function useGpRealtime(enabled = true) {
  const { user, isAuthStable } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || !isAuthStable || !user?.id) return;

    const channel = supabase.channel(`gp-ledger-${user.id}`);
    for (const t of TABLES) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: t, filter: `user_id=eq.${user.id}` },
        () => {
          for (const key of KEYS_BY_TABLE[t]) {
            qc.invalidateQueries({ queryKey: [key] });
          }
        },
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, isAuthStable, user?.id, qc]);
}
