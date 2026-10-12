import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { hittingLine, scoreLine, seasonTotals, verificationLabel, type CoachGame } from "@/lib/coach/games";

/** Coach "Game stats" tab — the player's last 10 logged games. Nothing is estimated. */
export function CoachGamesTab({ athleteId, canVerify = false }: { athleteId: string; canVerify?: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-games", athleteId],
    queryFn: async (): Promise<CoachGame[]> => {
      const { data, error } = await (supabase as any).rpc("coach_athlete_games", { _athlete: athleteId });
      if (error) throw error;
      return ((data as any)?.games ?? []) as CoachGame[];
    },
  });
  const verify = useMutation({
    mutationFn: async ({ gameId, verified }: { gameId: string; verified: boolean }) => {
      const { error } = await (supabase as any).rpc("set_game_verification", { _game: gameId, _verified: verified });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coach-athlete-games", athleteId] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading game stats…</p>;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Game stats are not available.</p>;
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground" data-testid="coach-games-empty">No games logged yet.</p>;

  const t = seasonTotals(data);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Last {data.length} logged games. Source: athlete-entered.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Hits / at-bats</p>
          <p className="text-lg font-semibold" data-testid="coach-games-hits">{t.hits} for {t.ab}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Pitches thrown in games</p>
          <p className="text-lg font-semibold">{t.pitches}</p>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((g) => {
          const hl = hittingLine(g.results, g.rbi);
          return (
            <div key={g.game_id} className="rounded-lg border p-3 text-sm space-y-0.5">
              <div className="flex justify-between gap-2">
                <span className="font-medium">vs {g.opponent || "Opponent not entered"}</span>
                <span className="text-muted-foreground">{g.game_date}</span>
              </div>
              <p>Result: {scoreLine(g)}</p>
              <p>Hitting: {hl ?? "No at-bats logged"}</p>
              <p>Pitching: {g.pitches > 0 ? `${g.pitches} pitches` : "No pitches logged"}</p>
              <p className="text-xs text-muted-foreground">Source: athlete-entered</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
