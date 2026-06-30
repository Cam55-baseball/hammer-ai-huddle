/**
 * GameDayMode — high-touch live surface for the active game.
 *
 * Shown as the default tab inside GameSheet when `game_date === today`.
 * Four big-tap entry points to the loggers, a live count of what has been
 * logged so far this game, and a one-line context strip pulled from the
 * canonical game record (opponent, score, status).
 *
 * Read-only over `gp_*` aggregates — write paths still flow through each
 * specialized logger so the constitutional ingestion → ledger chain is
 * preserved.
 */
import { useQuery } from "@tanstack/react-query";
import { gp } from "@/lib/games/ledger";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ScrollText,
  Target,
  Shield,
  Footprints,
  Users,
} from "lucide-react";

interface Props {
  gameId: string;
  game: any;
  onNavigate: (tab: "atbats" | "pitches" | "defense" | "baserun" | "subs") => void;
}

export function GameDayMode({ gameId, game, onNavigate }: Props) {
  const { user } = useAuth();

  const counts = useQuery({
    queryKey: ["gp-gameday-counts", gameId],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const [ab, pitch, def, base, sub] = await Promise.all([
        gp("gp_at_bats").select("id", { count: "exact", head: true }).eq("game_id", gameId),
        gp("gp_pitches").select("id", { count: "exact", head: true }).eq("game_id", gameId),
        gp("gp_defense_plays").select("id", { count: "exact", head: true }).eq("game_id", gameId),
        gp("gp_baserun_events").select("id", { count: "exact", head: true }).eq("game_id", gameId),
        gp("gp_subs").select("id", { count: "exact", head: true }).eq("game_id", gameId),
      ]);
      return {
        atBats: ab.count ?? 0,
        pitches: pitch.count ?? 0,
        defense: def.count ?? 0,
        baserun: base.count ?? 0,
        subs: sub.count ?? 0,
      };
    },
  });

  const statusTone =
    game.status === "in_progress"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : game.status === "final"
      ? "bg-muted text-muted-foreground"
      : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30";

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Live game
            </div>
            <div className="text-base font-semibold truncate">
              {game.opponent_team ? `vs ${game.opponent_team}` : "Game in progress"}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className={statusTone}>
              {(game.status ?? "draft").replace("_", " ")}
            </Badge>
            {game.my_score != null && game.opp_score != null && (
              <span className="font-mono text-base">
                {game.my_score}–{game.opp_score}
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <BigTile
          icon={<ScrollText className="h-5 w-5" />}
          label="At-bat"
          count={counts.data?.atBats ?? 0}
          onClick={() => onNavigate("atbats")}
        />
        <BigTile
          icon={<Target className="h-5 w-5" />}
          label="Pitch"
          count={counts.data?.pitches ?? 0}
          onClick={() => onNavigate("pitches")}
        />
        <BigTile
          icon={<Shield className="h-5 w-5" />}
          label="Defense"
          count={counts.data?.defense ?? 0}
          onClick={() => onNavigate("defense")}
        />
        <BigTile
          icon={<Footprints className="h-5 w-5" />}
          label="Baserun"
          count={counts.data?.baserun ?? 0}
          onClick={() => onNavigate("baserun")}
        />
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => onNavigate("subs")}
      >
        <Users className="h-4 w-4" />
        Subs / pinch ({counts.data?.subs ?? 0})
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Everything you tap autosaves and feeds today's plan + your dashboard within seconds.
      </p>
    </div>
  );
}

function BigTile({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors min-h-[88px] flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <span className="text-primary group-hover:scale-110 transition-transform">
          {icon}
        </span>
        <span className="text-2xl font-semibold font-mono tabular-nums">
          {count}
        </span>
      </div>
      <span className="text-sm font-medium mt-2">{label}</span>
    </button>
  );
}
