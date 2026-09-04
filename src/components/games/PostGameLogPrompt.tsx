/**
 * PostGameLogPrompt — closes the loop after a game.
 *
 * A game that never gets logged is a game the engine can't learn from. When a
 * recent game is still open (not marked final) or has no reps against it, this
 * card asks for the reps once, plainly, and links straight into the logger.
 *
 * It is silent when there's nothing to ask for. It never invents a game.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";

const LOOKBACK_DAYS = 3;

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function PostGameLogPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const pending = useQuery({
    queryKey: ["gp-pending-log", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: games, error } = await gp("gp_games")
        .select("id, game_date, opponent_team, status, sport")
        .eq("user_id", user!.id)
        .gte("game_date", isoDaysAgo(LOOKBACK_DAYS))
        .lte("game_date", isoDaysAgo(0))
        .order("game_date", { ascending: false });
      if (error) throw error;
      const rows = (games ?? []) as any[];
      if (rows.length === 0) return [];

      // A game counts as logged once it has at least one at-bat OR one pitch.
      const ids = rows.map((g) => g.id);
      const [{ data: abs }, { data: pitches }] = await Promise.all([
        gp("gp_at_bats").select("game_id").in("game_id", ids),
        gp("gp_pitches").select("game_id").in("game_id", ids),
      ]);
      const logged = new Set<string>([
        ...((abs ?? []) as any[]).map((r) => r.game_id),
        ...((pitches ?? []) as any[]).map((r) => r.game_id),
      ]);
      return rows.filter((g) => !logged.has(g.id) || g.status !== "final");
    },
    staleTime: 60_000,
  });

  const games = pending.data ?? [];
  if (games.length === 0) return null;

  return (
    <Card className="p-4 space-y-3 border-primary/40 bg-primary/5">
      <div className="flex items-start gap-2.5">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">
            {games.length === 1 ? "You played — log it" : `${games.length} games still open`}
          </p>
          <p className="text-xs text-muted-foreground">
            Reps you don't log can't show up in your splits or move your training. Even
            just the results takes under a minute.
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {games.slice(0, 3).map((g: any) => (
          <li
            key={g.id}
            className="flex items-center justify-between gap-2 rounded bg-background/70 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">
                {g.opponent_team || "Game"}
              </span>
              <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                {g.game_date}
              </Badge>
              {g.status !== "final" && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  not final
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 gap-1"
              onClick={() => navigate(`/games?game=${g.id}`)}
            >
              Log <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
