/**
 * useGameReport — builds, stores and shares report snapshots.
 *
 * Building is local and deterministic (reportEngine); storing freezes the
 * snapshot so a share link always shows exactly what was sent.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { supabase } from "@/integrations/supabase/client";
import {
  buildIndividualPostgame,
  buildScoutingReport,
  type ReportSnapshot,
} from "@/lib/games/reportEngine";

async function fetchAll(table: string, gameId: string, userId: string) {
  const { data, error } = await gp(table).select("*").eq("game_id", gameId).eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as any[];
}

/** Live-built individual postgame report for one game. */
export function useIndividualReport(gameId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gp-report-individual", gameId, user?.id],
    enabled: !!gameId && !!user,
    queryFn: async (): Promise<ReportSnapshot> => {
      const { data: game, error } = await gp("gp_games")
        .select("*")
        .eq("id", gameId!)
        .maybeSingle();
      if (error) throw error;
      if (!game) throw new Error("Game not found");

      const [atBats, pitches, defense, baserun, plans, outcomes] = await Promise.all([
        fetchAll("gp_at_bats", gameId!, user!.id),
        fetchAll("gp_pitches", gameId!, user!.id),
        fetchAll("gp_defense_plays", gameId!, user!.id),
        fetchAll("gp_baserun_events", gameId!, user!.id),
        fetchAll("gp_pregame_plans", gameId!, user!.id).catch(() => []),
        fetchAll("gp_plan_outcomes", gameId!, user!.id).catch(() => []),
      ]);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();

      return buildIndividualPostgame({
        game: game as any,
        athleteName: (profile as any)?.full_name ?? null,
        atBats,
        pitches,
        defense,
        baserun,
        plan: plans[0] ?? null,
        planOutcome: outcomes[0] ?? null,
      });
    },
  });
}

/** Live-built scouting report for an opponent. */
export function useScoutingReport(opponent?: string, sport?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gp-report-scouting", opponent, sport, user?.id],
    enabled: !!opponent && !!user,
    queryFn: async (): Promise<ReportSnapshot> => {
      const [dossiers, hitters, games] = await Promise.all([
        gp("gp_pitcher_dossiers").select("*").eq("user_id", user!.id).then((r: any) => r.data ?? []),
        gp("gp_opponent_hitters").select("*").eq("user_id", user!.id).then((r: any) => r.data ?? []),
        gp("gp_games")
          .select("id,sport,opponent_team")
          .eq("user_id", user!.id)
          .eq("opponent_team", opponent!)
          .then((r: any) => r.data ?? []),
      ]);
      const gameIds = games.map((g: any) => g.id);
      let pitches: any[] = [];
      let atBats: any[] = [];
      if (gameIds.length) {
        const [p, a] = await Promise.all([
          gp("gp_pitches").select("*").in("game_id", gameIds).eq("user_id", user!.id),
          gp("gp_at_bats").select("*").in("game_id", gameIds).eq("user_id", user!.id),
        ]);
        pitches = (p as any).data ?? [];
        atBats = (a as any).data ?? [];
      }
      const resolvedSport = sport ?? games[0]?.sport ?? "baseball";
      return buildScoutingReport({
        sport: resolvedSport,
        opponent: opponent!,
        pitcherDossiers: (dossiers as any[]).filter(
          (d) => !d.opponent_team || d.opponent_team === opponent,
        ),
        opponentHitters: (hitters as any[]).filter(
          (h) => !h.opponent_team || h.opponent_team === opponent,
        ),
        pitches,
        atBats,
      });
    },
  });
}

export interface SavedReport {
  id: string;
  report_kind: string;
  title: string;
  subtitle: string | null;
  sport: string | null;
  game_id: string | null;
  snapshot: ReportSnapshot;
  share_token: string | null;
  share_expires_at: string | null;
  share_revoked: boolean;
  created_at: string;
}

export function useSavedReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gp-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await gp("gp_reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as SavedReport[];
    },
  });
}

function makeToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useReportActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async ({
      snapshot,
      gameId,
    }: {
      snapshot: ReportSnapshot;
      gameId?: string | null;
    }) => {
      const { data, error } = await gp("gp_reports")
        .insert({
          user_id: user!.id,
          game_id: gameId ?? null,
          report_kind: snapshot.kind,
          sport: snapshot.sport,
          title: snapshot.title,
          subtitle: snapshot.subtitle ?? null,
          snapshot,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as SavedReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-reports"] }),
  });

  const share = useMutation({
    mutationFn: async ({ reportId, days = 30 }: { reportId: string; days?: number }) => {
      const token = makeToken();
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const { data, error } = await gp("gp_reports")
        .update({ share_token: token, share_expires_at: expires, share_revoked: false })
        .eq("id", reportId)
        .eq("user_id", user!.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as SavedReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-reports"] }),
  });

  const revoke = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await gp("gp_reports")
        .update({ share_revoked: true })
        .eq("id", reportId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-reports"] }),
  });

  const remove = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await gp("gp_reports").delete().eq("id", reportId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-reports"] }),
  });

  return { save, share, revoke, remove };
}

export function shareUrl(token: string) {
  return `${window.location.origin}/r/${token}`;
}
