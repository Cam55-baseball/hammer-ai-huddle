/**
 * CoachTeamReport — team post-game report for a coach.
 * Built only from games their linked players logged (read access is the
 * existing linked-coach permission). Every entry keeps its "Logged by" label.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportView } from "@/components/games/reports/ReportView";
import { buildTeamPostgame, type TeamAthleteInput } from "@/lib/games/reportEngine";
import { entrySourceLabel } from "@/lib/intelligence/entrySource";

const today = () => new Date().toISOString().slice(0, 10);

export default function CoachTeamReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState<string | null>(null);

  const games = useQuery({
    queryKey: ["coach-team-games", user?.id, date],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gp_games")
        .select("id,user_id,game_date,sport,opponent_team,game_type,status,entry_source")
        .eq("game_date", date)
        .is("deleted_at", null)
        .neq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const opponents = useMemo(() => {
    const set = new Map<string, number>();
    (games.data ?? []).forEach((g) => {
      const k = g.opponent_team ?? "";
      set.set(k, (set.get(k) ?? 0) + 1);
    });
    return [...set.entries()];
  }, [games.data]);
  const chosen = opponent ?? opponents[0]?.[0] ?? null;
  const chosenGames = (games.data ?? []).filter((g) => (g.opponent_team ?? "") === chosen);

  const report = useQuery({
    queryKey: ["coach-team-report", chosenGames.map((g) => g.id).join(",")],
    enabled: chosenGames.length > 0,
    queryFn: async () => {
      const ids = chosenGames.map((g) => g.id);
      const userIds = [...new Set(chosenGames.map((g) => g.user_id))];
      const [ab, pi, de, br, pr] = await Promise.all([
        supabase.from("gp_at_bats").select("*").in("game_id", ids),
        supabase.from("gp_pitches").select("*").in("game_id", ids),
        supabase.from("gp_defense_plays").select("*").in("game_id", ids),
        supabase.from("gp_baserun_events").select("*").in("game_id", ids),
        supabase.from("profiles").select("id,full_name").in("id", userIds),
      ]);
      const err = ab.error || pi.error || de.error || br.error;
      if (err) throw err;
      const names = new Map((pr.data ?? []).map((p: any) => [p.id, p.full_name as string | null]));
      const athletes: TeamAthleteInput[] = chosenGames.map((g, i) => {
        const mine = (rows: any[] | null) => (rows ?? []).filter((r) => r.game_id === g.id);
        const parts = [mine(ab.data), mine(pi.data), mine(de.data), mine(br.data)];
        const sources = [...new Set(parts.flat().map((r: any) => entrySourceLabel(r.entry_source)))];
        return {
          athleteId: g.user_id,
          athleteName: names.get(g.user_id) || `Player ${i + 1} (name not shared)`,
          atBats: parts[0],
          pitches: parts[1],
          defense: parts[2],
          baserun: parts[3],
          sources,
        };
      });
      return buildTeamPostgame(chosenGames[0] as any, "Your team", athletes);
    },
  });

  return (
    <div className="container max-w-4xl space-y-4 py-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print / PDF
        </Button>
      </div>
      <Card className="space-y-3 p-4 print:hidden">
        <h1 className="text-lg font-semibold">Team game report</h1>
        <p className="text-sm text-muted-foreground">
          Built only from games your linked players logged. Nothing is filled in.
        </p>
        <div className="space-y-1">
          <Label htmlFor="team-date">Game date</Label>
          <Input id="team-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setOpponent(null); }} />
        </div>
        {opponents.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {opponents.map(([o, n]) => (
              <Button key={o} size="sm" variant={o === chosen ? "default" : "outline"} onClick={() => setOpponent(o)}>
                Opponent: {o || "Not entered"} · {n} player{n === 1 ? "" : "s"}
              </Button>
            ))}
          </div>
        )}
      </Card>
      {games.error || report.error ? (
        <Card className="p-4 text-sm">Couldn't load the team report. Reload and try again.</Card>
      ) : games.isLoading || report.isLoading ? (
        <Card className="p-4 text-sm text-muted-foreground">Building the report…</Card>
      ) : !chosenGames.length ? (
        <Card className="p-4 text-sm">Need more data: none of your linked players logged a game on this date.</Card>
      ) : report.data ? (
        <ReportView snapshot={report.data} />
      ) : null}
    </div>
  );
}
