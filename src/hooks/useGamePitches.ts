/**
 * useGamePitches — read/write helper for `gp_pitches`.
 * Used by the PitchLogger and by the report builder.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";
import { toast } from "sonner";

export interface GpPitchRow {
  id: string;
  game_id: string;
  at_bat_id: string | null;
  perspective: "pitcher" | "hitter";
  inning: number | null;
  pitch_no: number | null;
  pitch_type: string | null;
  pitch_velo: number | null;
  location: { zone?: number; outZone?: string | null } | null;
  result: string | null;
  pitcher_arm_slot: string | null;
  pitcher_throws: string | null;
  batter_handedness: string | null;
  opponent_hitter_name: string | null;
  count_balls: number | null;
  count_strikes: number | null;
  notes: string | null;
  created_at: string;
}

export function useGamePitches(gameId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["gp-pitches", gameId],
    enabled: !!user && !!gameId,
    queryFn: async () => {
      const { data, error } = await gp("gp_pitches")
        .select("*")
        .eq("game_id", gameId!)
        .order("inning", { ascending: true })
        .order("pitch_no", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GpPitchRow[];
    },
  });

  const add = useMutation({
    mutationFn: async (row: Partial<GpPitchRow> & { perspective: "pitcher" | "hitter" }) => {
      const { error } = await gp("gp_pitches").insert({
        ...row,
        user_id: user!.id,
        game_id: gameId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not save pitch"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gp("gp_pitches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gp-pitches", gameId] }),
  });

  return { list, add, del };
}
