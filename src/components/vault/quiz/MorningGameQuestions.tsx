/**
 * Morning check-in questions about yesterday: "Did you play a game?" and,
 * for pitchers, "Did you pitch?". Saves through the same rows the plan
 * already reads (games log + pitcher outings), and shares the asked-once
 * key with the Hammers Today game prompt so the athlete is asked once.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localIso, shiftIso } from "@/hooks/usePitcherSchedule";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import {
  readPitcherProfile,
  shouldShowPitchingCard,
} from "@/lib/hammer/pitching/pitcherProfile";
import { decideMorningGameAsk, gameLogAskedKey } from "@/lib/hammer/pitching/morningGameAsk";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface G { id: string; game_date: string; status: string | null }
interface O { id: string; outing_type: "start" | "relief" | "bullpen"; planned_date: string | null; actual_date: string | null; status: "planned" | "thrown" | "skipped" }

export function MorningGameQuestions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { sport } = useSportTheme();
  const ctx = useHammerAthleteContext();
  const today = localIso();
  const yesterday = shiftIso(today, -1);
  const [, bump] = useState(0);
  const markAnswered = () => {
    try { localStorage.setItem(gameLogAskedKey(user?.id, yesterday), "1"); } catch { /* ignore */ }
    bump((n) => n + 1);
  };

  const q = useQuery({
    queryKey: ["morning-game-questions", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const db = supabase as any;
      const [gp, cal, po] = await Promise.all([
        db.from("gp_games").select("id, game_date, status").eq("user_id", user!.id).is("deleted_at", null)
          .eq("game_date", yesterday).eq("ignored_for_training", false),
        db.from("calendar_events").select("id, event_date, event_type").eq("user_id", user!.id)
          .eq("event_date", yesterday).eq("event_type", "game"),
        db.from("pitcher_outings").select("id, outing_type, planned_date, actual_date, status")
          .eq("user_id", user!.id).or(`planned_date.eq.${yesterday},actual_date.eq.${yesterday}`),
      ]);
      return {
        games: (gp.data ?? []) as G[],
        hasCalendarGame: (cal.data ?? []).length > 0,
        outings: (po.data ?? []) as O[],
      };
    },
  });

  if (!q.data) return null;
  const { games, hasCalendarGame, outings } = q.data;
  const hasYesterdayGame = games.length > 0 || hasCalendarGame;
  const yesterdayLogged = games.some((g) => g.status === "final");
  const yesterdayPitchThrown = outings.some((o) => o.status === "thrown");
  const askedBefore = (() => {
    try { return localStorage.getItem(gameLogAskedKey(user?.id, yesterday)) === "1"; } catch { return false; }
  })();

  const isPitcher = shouldShowPitchingCard(
    readPitcherProfile(user?.id),
    ctx.get<unknown>("position_primary")?.value ?? null,
    ctx.get<unknown>("position_secondary")?.value ?? null,
  );
  const { askGame, askPitch } = decideMorningGameAsk({
    hasYesterdayGame,
    yesterdayLogged,
    askedBefore,
    isPitcher,
    yesterdayPitchThrown,
  });
  if (!askGame && !askPitch) return null;

  const saveGame = async () => {
    const existing = games[0];
    if (existing) {
      toast("Your game is saved in Games — finish logging it when you can.");
    } else {
      const { error } = await (supabase as any).from("gp_games").insert({
        user_id: user!.id,
        game_date: yesterday,
        sport: sport === "softball" ? "softball" : "baseball",
        status: "draft",
      });
      if (error) { toast.error(`Couldn't save the game: ${error.message}`); return; }
      toast("Game saved — you can finish logging it in Games when you can.");
    }
    qc.invalidateQueries({ queryKey: ["morning-game-questions"] });
    markAnswered();
  };

  const savePitch = async (type: "start" | "relief" | "bullpen") => {
    const planned = outings.find((o) => o.status === "planned" && o.planned_date === yesterday);
    const { error } = planned
      ? await (supabase as any).from("pitcher_outings")
          .update({ status: "thrown", actual_date: yesterday, outing_type: type })
          .eq("id", planned.id).eq("user_id", user!.id)
      : await (supabase as any).from("pitcher_outings").insert({
          user_id: user!.id, outing_type: type, actual_date: yesterday, status: "thrown",
        });
    if (error) { toast.error(`Couldn't save the outing: ${error.message}`); return; }
    toast(`Pitching saved: ${type === "start" ? "Start" : type === "relief" ? "Relief" : "Bullpen"} yesterday.`);
    qc.invalidateQueries({ queryKey: ["morning-game-questions"] });
    markAnswered();
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-3" data-testid="morning-game-questions">
      {askGame && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Did you play a game yesterday?</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={saveGame}>Yes — save it</Button>
            <Button size="sm" variant="outline" onClick={markAnswered}>No</Button>
          </div>
        </div>
      )}
      {askPitch && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Did you pitch yesterday?</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => savePitch("start")}>Yes — a start</Button>
            <Button size="sm" onClick={() => savePitch("relief")}>Yes — relief</Button>
            <Button size="sm" onClick={() => savePitch("bullpen")}>Yes — bullpen</Button>
            <Button size="sm" variant="outline" onClick={markAnswered}>No</Button>
          </div>
        </div>
      )}
      {askGame && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" /> Logging the game is how your plan learns what it took out of you.
        </p>
      )}
    </div>
  );
}
