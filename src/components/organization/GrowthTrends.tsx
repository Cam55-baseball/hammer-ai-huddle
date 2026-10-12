import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import {
  buildPairReadings,
  type TrainingWeek,
  type TrendReport,
  type TrendGame,
  type Direction,
} from "@/lib/org/growthTrends";
import type { FacilityBoardRow } from "@/lib/org/facilityBoard";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Not recorded" : d.toISOString().slice(0, 10);
}

function DirectionIcon({ d }: { d: Direction }) {
  if (d === "up") return <TrendingUp className="h-4 w-4 text-green-600" aria-label="going up" />;
  if (d === "down") return <TrendingDown className="h-4 w-4 text-red-600" aria-label="going down" />;
  if (d === "flat") return <Minus className="h-4 w-4 text-muted-foreground" aria-label="steady" />;
  return <HelpCircle className="h-4 w-4 text-muted-foreground" aria-label="not enough data" />;
}

interface TrendsPayload {
  training_weeks: TrainingWeek[];
  reports: TrendReport[];
  games: TrendGame[];
}

export function GrowthTrends({ orgId }: { orgId: string }) {
  const [athleteId, setAthleteId] = useState<string | null>(null);

  const { data: roster } = useQuery({
    queryKey: ["org-facility-board", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_facility_board", { _org: orgId });
      if (error) throw error;
      return (data ?? []) as FacilityBoardRow[];
    },
  });

  const { data, isFetching, error } = useQuery({
    queryKey: ["org-growth-trends", orgId, athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_growth_trends", {
        _org: orgId,
        _athlete: athleteId,
      });
      if (error) throw error;
      return data as TrendsPayload;
    },
  });

  const players = useMemo(() => roster ?? [], [roster]);
  const trends = useMemo(
    () => (data ? buildPairReadings(data.training_weeks ?? [], data.reports ?? [], data.games ?? []) : null),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Growth vs game trends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick a player to see how their training, video analysis scores and game results moved over the same
          stretch. When two things move the same way we say "these move together" — that never means one caused
          the other.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <Button
              key={p.athlete_id}
              size="sm"
              variant={athleteId === p.athlete_id ? "default" : "outline"}
              onClick={() => setAthleteId(p.athlete_id)}
            >
              {p.name || "Player"}
            </Button>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">No players in this organization yet.</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">Could not load trends for this player.</p>}
        {isFetching && <p className="text-sm text-muted-foreground">Loading…</p>}

        {trends && data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <DirectionIcon d={trends.training.direction} /> Training
                </div>
                <p className="text-sm text-muted-foreground">{trends.training.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Source: training plan log · {trends.training.points} week{trends.training.points === 1 ? "" : "s"} with planned work
                </p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <DirectionIcon d={trends.analysis.direction} /> Video analysis
                </div>
                <p className="text-sm text-muted-foreground">{trends.analysis.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Source: video analysis reports · {trends.analysis.points} scored report{trends.analysis.points === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <DirectionIcon d={trends.games.direction} /> Game results
                </div>
                <p className="text-sm text-muted-foreground">{trends.games.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Source: game log · {trends.games.points} game{trends.games.points === 1 ? "" : "s"} with scores
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">How they move together</p>
              {trends.pairs.map((p, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="text-sm font-medium">
                    {p.a} vs {p.b}: <span className="font-normal">{p.reading}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{p.detail}</p>
                </div>
              ))}
            </div>

            {data.games.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Games in this stretch</p>
                {data.games.map((g) => (
                  <p key={g.id} className="text-xs text-muted-foreground">
                    {fmtDate(g.game_date)} vs {g.opponent || "Unknown opponent"} ·{" "}
                    {g.my_score != null && g.opp_score != null ? `${g.my_score}–${g.opp_score}` : "score not recorded"}
                    {g.pitch_count != null ? ` · ${g.pitch_count} pitches` : ""} ·{" "}
                    {g.verified ? "Verified by coach/org" : "Source: athlete-entered"}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
