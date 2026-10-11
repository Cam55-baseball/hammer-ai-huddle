/**
 * Game pitch load — pitches the athlete threw in logged games (gp_pitches
 * with perspective "pitcher" in their own gp_games), grouped by game date.
 *
 * These feed the arm ledger ADDITIVELY alongside bullpen/outing logs
 * (useRecentPitchingLoad): game pitches are real throws and must count
 * toward the arm total. Nothing here invents a dose — it only counts.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GamePitchLoad {
  /** game_date -> pitches thrown that day */
  byDate: Record<string, number>;
  total: number;
}

export function useGamePitchLoad(days = 7): { data: GamePitchLoad | null; loading: boolean; isError: boolean } {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["game-pitch-load", user?.id, days],
    queryFn: async (): Promise<GamePitchLoad> => {
      if (!user) return { byDate: {}, total: 0 };
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromIso = from.toISOString().slice(0, 10);
      const { data: games, error: gErr } = await (supabase as any)
        .from("gp_games")
        .select("id, game_date")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("game_date", fromIso);
      if (gErr) throw gErr;
      const ids = (games ?? []).map((g: any) => g.id);
      if (ids.length === 0) return { byDate: {}, total: 0 };
      const dateByGame = new Map<string, string>((games ?? []).map((g: any) => [g.id, g.game_date]));
      const { data: pitches, error: pErr } = await (supabase as any)
        .from("gp_pitches")
        .select("game_id")
        .in("game_id", ids)
        .eq("perspective", "pitcher");
      if (pErr) throw pErr;
      const byDate: Record<string, number> = {};
      for (const p of pitches ?? []) {
        const d = dateByGame.get(p.game_id);
        if (d) byDate[d] = (byDate[d] ?? 0) + 1;
      }
      const total = Object.values(byDate).reduce((s, n) => s + n, 0);
      return { byDate, total };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  return { data: q.data ?? null, loading: q.isLoading, isError: q.isError };
}
