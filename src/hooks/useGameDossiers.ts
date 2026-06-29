/**
 * useGameDossiers — pitcher + opponent-hitter dossier CRUD.
 * Backed by gp_pitcher_dossiers + gp_opponent_hitters.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { toast } from "sonner";

export interface PitcherDossier {
  id: string;
  name: string;
  team: string | null;
  sport: string;
  throws: string | null;
  arm_slot: string | null;
  repertoire: Array<{ pitch: string; usage?: number; velo?: number; notes?: string }> | null;
  tendencies: Record<string, any> | null;
  notes_pregame: string | null;
  notes_postgame: string | null;
  strike_zone_plan: Record<string, "attack" | "avoid" | "take"> | null;
  last_faced: string | null;
}

export interface OpponentHitter {
  id: string;
  name: string;
  team: string | null;
  sport: string;
  bats: string | null;
  tendencies: Record<string, any> | null;
  notes: string | null;
  last_faced: string | null;
}

export function usePitcherDossiers(sport?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["gp-pitcher-dossiers", user?.id, sport ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = gp("gp_pitcher_dossiers")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_faced", { ascending: false, nullsFirst: false });
      if (sport && sport !== "all") q = q.eq("sport", sport);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PitcherDossier[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<PitcherDossier> & { name: string; sport: string }) => {
      const payload = { ...row, user_id: user!.id };
      if (row.id) {
        const { error } = await gp("gp_pitcher_dossiers").update(payload).eq("id", row.id);
        if (error) throw error;
        return row.id;
      }
      const { data, error } = await gp("gp_pitcher_dossiers")
        .insert(payload).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-pitcher-dossiers"] });
      toast.success("Dossier saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save dossier"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gp("gp_pitcher_dossiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-pitcher-dossiers"] }),
  });

  return { list, upsert, del };
}

export function useOpponentHitters(sport?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["gp-opponent-hitters", user?.id, sport ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = gp("gp_opponent_hitters")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_faced", { ascending: false, nullsFirst: false });
      if (sport && sport !== "all") q = q.eq("sport", sport);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OpponentHitter[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<OpponentHitter> & { name: string; sport: string }) => {
      const payload = { ...row, user_id: user!.id };
      if (row.id) {
        const { error } = await gp("gp_opponent_hitters").update(payload).eq("id", row.id);
        if (error) throw error;
        return row.id;
      }
      const { data, error } = await gp("gp_opponent_hitters")
        .insert(payload).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gp-opponent-hitters"] });
      toast.success("Hitter saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gp("gp_opponent_hitters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-opponent-hitters"] }),
  });

  return { list, upsert, del };
}
