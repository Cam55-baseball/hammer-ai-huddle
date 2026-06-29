/**
 * useGameDayContext — tiny helper that answers "does the current user have
 * a game today?". Used by the Games hub to show a Game-Day CTA banner and
 * by the Hammer plan to bias toward live-log readiness.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { gp } from "@/lib/games/ledger";

export interface GameDayContext {
  readonly isGameToday: boolean;
  readonly loading: boolean;
}

export function useGameDayContext(): GameDayContext {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const q = useQuery({
    queryKey: ["gp-game-day", user?.id, today],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await gp("gp_games")
        .select("id")
        .eq("user_id", user!.id)
        .eq("game_date", today)
        .limit(1);
      return (data ?? []).length > 0;
    },
  });
  return { isGameToday: q.data ?? false, loading: q.isLoading };
}
