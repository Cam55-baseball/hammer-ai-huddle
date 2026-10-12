import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SprayChart } from "@/components/games/SprayChart";
import { sprayBalls } from "@/lib/games/spray";
import { scoreLine, verificationLabel } from "@/lib/coach/games";
import { fielding, hitting, pitching, zoneCounts, type ScoutGame } from "@/lib/scout/gamePlay";

const NM = "Not yet measured";

/** Scout Profile → "Game play and stats". Only what the family shared; nothing estimated. */
export function ScoutGamePlayTab({ athleteId }: { athleteId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["scout-game-play", athleteId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("scout_athlete_game_play", { _athlete: athleteId });
      if (error) throw error;
      return data as { games: ScoutGame[]; pitch_locations: unknown[]; batted_balls: any[] };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading game stats…</p>;
  if (error)
    return (
      <p className="text-sm text-muted-foreground" data-testid="scout-games-not-shared">
        Not shared. This family hasn't shared game stats with you, or you're not following this player yet.
      </p>
    );
  const games = data?.games ?? [];
  if (games.length === 0) return <p className="text-sm text-muted-foreground">No games logged yet.</p>;
  const balls = sprayBalls(data?.batted_balls ?? []);
  const zc = zoneCounts(data?.pitch_locations ?? []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Last {games.length} logged games. Each game says who entered or verified it.</p>
      {games.map((g) => {
        const h = hitting(g);
        const p = pitching(g);
        const f = fielding(g);
        return (
          <div key={g.game_id} className="rounded-lg border p-3 text-sm space-y-1" data-testid="scout-game">
            <div className="flex justify-between gap-2">
              <span className="font-medium">vs {g.opponent || "Opponent not entered"}</span>
              <span className="text-muted-foreground">{g.game_date}</span>
            </div>
            <p>Result: {scoreLine(g)}</p>
            <p>
              Hitting:{" "}
              {h
                ? `${h.atBats} at-bats, ${h.hits} hits, ${h.extraBaseHits} extra-base hits, ${h.walks} walks, ${h.strikeouts} strikeouts, stolen bases: ${h.stolenBases ?? NM}`
                : NM}
            </p>
            <p>
              Pitching:{" "}
              {p
                ? `pitch count ${p.pitchCount ?? NM}, top speed ${p.topVelo != null ? `${p.topVelo} mph` : NM}; innings, hits, runs, walks, strikeouts: ${NM}`
                : NM}
            </p>
            <p>Fielding: {f ? `${f.putouts} putouts, ${f.assists} assists, ${f.errors} errors` : NM}</p>
            <p className="text-xs text-muted-foreground">{verificationLabel(g)}</p>
          </div>
        );
      })}
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm font-medium">Batted balls (where hit balls went)</p>
        {balls.length ? <SprayChart balls={balls} size={220} /> : <p className="text-sm text-muted-foreground">{NM}</p>}
        <p className="text-xs text-muted-foreground">From {balls.length} tapped-in batted balls. Source: athlete-entered.</p>
      </div>
      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-sm font-medium">Pitch location (where pitches crossed the plate)</p>
        {zc.total ? (
          <>
            <div className="grid grid-cols-3 gap-1 w-40">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((z) => (
                <div key={z} className="aspect-square rounded border flex items-center justify-center text-sm">
                  {zc.zones[z] ?? 0}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Outside the zone: {zc.outside} pitches</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{NM}</p>
        )}
        <p className="text-xs text-muted-foreground">From {zc.total} tapped-in pitches. Source: athlete-entered.</p>
      </div>
    </div>
  );
}
