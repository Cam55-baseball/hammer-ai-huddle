/**
 * Game logging prompt — every athlete with a game today gets a one-tap way to
 * log it; a game yesterday that was never logged is asked about once.
 * The app only learns from games that get logged.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localIso, shiftIso } from "@/hooks/usePitcherSchedule";
import { useSportTheme } from "@/contexts/SportThemeContext";

interface G { id: string; game_date: string; status: string | null; opponent_team: string | null }
const ASKED = "hm.gameLogAsked.";

export function GameLogPromptCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sport } = useSportTheme();
  const today = localIso();
  const yesterday = shiftIso(today, -1);
  const [, bump] = useState(0);

  const q = useQuery({
    queryKey: ["game-log-prompt", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const db = supabase as any;
      const [gp, cal, po] = await Promise.all([
        db.from("gp_games").select("id, game_date, status, opponent_team").eq("user_id", user!.id).is("deleted_at", null)
          .in("game_date", [yesterday, today]).eq("ignored_for_training", false),
        db.from("calendar_events").select("id, title, event_date, event_type").eq("user_id", user!.id)
          .in("event_date", [yesterday, today]).eq("event_type", "game"),
        db.from("pitcher_outings").select("id, planned_date").eq("user_id", user!.id).eq("status", "planned").eq("planned_date", today),
      ]);
      return {
        games: (gp.data ?? []) as G[],
        calendar: (cal.data ?? []) as Array<{ id: string; title: string | null; event_date: string }>,
        pitchingToday: (po.data ?? []).length > 0,
      };
    },
  });

  if (!q.data) return null;
  const { games, calendar, pitchingToday } = q.data;
  const logged = (g: G) => g.status === "final";
  const hasGameOn = (d: string) => games.some((g) => g.game_date === d) || calendar.some((c) => c.event_date === d);
  const todayGame = games.find((g) => g.game_date === today && !logged(g));
  const todayHas = hasGameOn(today) || pitchingToday;
  const todayDone = games.some((g) => g.game_date === today && logged(g));
  const yGame = games.find((g) => g.game_date === yesterday);
  const yUnlogged = hasGameOn(yesterday) && !(yGame && logged(yGame));
  const yKey = `${ASKED}${user?.id}.${yesterday}`;
  const yAsked = (() => { try { return localStorage.getItem(yKey) === "1"; } catch { return false; } })();

  const openLogger = async (date: string, existing?: G) => {
    if (existing) { navigate(`/games?game=${existing.id}`); return; }
    const { data, error } = await (supabase as any).from("gp_games")
      .insert({ user_id: user!.id, game_date: date, sport: sport === "softball" ? "softball" : "baseball", status: "draft" }).select("id").single();
    if (error) { toast.error(`Couldn't start the game log: ${error.message}`); return; }
    qc.invalidateQueries({ queryKey: ["game-log-prompt"] });
    navigate(`/games?game=${data.id}`);
  };
  const markAsked = () => { try { localStorage.setItem(yKey, "1"); } catch { /* ignore */ } bump((n) => n + 1); };

  const showToday = todayHas && !todayDone;
  const showYesterday = yUnlogged && !yAsked;
  if (!showToday && !showYesterday) return null;

  return (
    <Card className="border-primary/40 bg-primary/5" data-testid="game-log-prompt">
      <CardContent className="p-3 space-y-3">
        {showToday && (
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{pitchingToday ? "You're pitching today" : "Game today"}</p>
              <p className="text-xs text-muted-foreground">Log it after you play. It's how your plan learns what the game took out of you.</p>
            </div>
            <Button size="sm" onClick={() => openLogger(today, todayGame)}>Log game</Button>
          </div>
        )}
        {showYesterday && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Did you play yesterday?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => { markAsked(); openLogger(yesterday, yGame); }}>Yes, log it</Button>
              <Button size="sm" variant="outline" onClick={markAsked}>No</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
