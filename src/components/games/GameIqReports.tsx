import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  hitterReport, pitcherReport, defenseReport, baserunReport, tapInHeatMap, matchupPlanner,
  NEED_MORE_DATA, NO_DATA_YET, type IqSection, type TapInHeatMap,
} from "@/lib/games/gameIq";

const live = "gp_games!inner(deleted_at)";

async function readLive(table: string, cols: string, uid: string) {
  const { data, error } = await (supabase.from as any)(table)
    .select(`${cols}, ${live}`).eq("user_id", uid).is("gp_games.deleted_at", null).limit(2000);
  if (error) throw error;
  return (data ?? []) as any[];
}

function Section({ s }: { s: IqSection }) {
  return (
    <Card aria-label={`${s.title} report`}>
      <CardHeader className="pb-2"><CardTitle className="text-base">{s.title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {s.stats == null ? (
          <p className="text-sm text-muted-foreground">{NEED_MORE_DATA}: nothing logged here yet.</p>
        ) : s.stats.map((x) => (
          <div key={x.label} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{x.label}</span>
            <span className="text-right">
              <span className="font-semibold text-foreground">{x.value}</span>
              {x.sample && <span className="block text-xs text-muted-foreground">{x.sample}</span>}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HeatGrid({ title, map }: { title: string; map: TapInHeatMap | null }) {
  return (
    <div className="space-y-2" aria-label={title}>
      <p className="text-sm font-semibold">{title}</p>
      {map == null ? (
        <p className="text-sm text-muted-foreground">{NO_DATA_YET}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1 max-w-[240px]">
            {map.cells.map((c) => {
              const share = c.pitches / map.total;
              return (
                <div key={c.zone} className="rounded border border-border p-1 text-center text-xs"
                  style={{ backgroundColor: `hsl(var(--primary) / ${Math.min(0.85, share * 2).toFixed(2)})` }}>
                  <div className={share > 0.25 ? "font-semibold text-primary-foreground" : "font-semibold text-foreground"}>{c.pitches}</div>
                  <div className={share > 0.25 ? "text-primary-foreground" : "text-muted-foreground"}>pitches</div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Tapped locations: {map.total} (outside the zone: {map.outOfZone}){map.earlyRead ? " · early read" : ""}
          </p>
        </>
      )}
    </div>
  );
}

export function GameIqReports() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["game-iq-reports", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const uid = user!.id;
      const [atBats, pitches, defense, baserun] = await Promise.all([
        readLive("gp_at_bats", "result, contact_quality", uid),
        readLive("gp_pitches", "perspective, result, location, count_balls, count_strikes, pitch_type, pitcher_throws", uid),
        readLive("gp_defense_plays", "position, error_flag, putout, assist", uid),
        readLive("gp_baserun_events", "event_type, success", uid),
      ]);
      return { atBats, pitches, defense, baserun };
    },
  });
  if (q.isLoading) return null;
  if (q.isError || !q.data) {
    return <p role="alert" className="text-sm text-muted-foreground">We couldn't load your game reports. Please try again later.</p>;
  }
  const { atBats, pitches, defense, baserun } = q.data;
  const rows = matchupPlanner(pitches);
  return (
    <section className="space-y-4" aria-label="Game IQ reports">
      <Section s={hitterReport(atBats)} />
      <Section s={pitcherReport(pitches)} />
      <Section s={defenseReport(defense)} />
      <Section s={baserunReport(baserun)} />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Heat maps (from the spots you tapped)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <HeatGrid title="Pitches you saw (as hitter)" map={tapInHeatMap(pitches, "hitter")} />
          <HeatGrid title="Pitches you threw (as pitcher)" map={tapInHeatMap(pitches, "pitcher")} />
        </CardContent>
      </Card>
      <Card aria-label="Matchup planner">
        <CardHeader className="pb-2"><CardTitle className="text-base">Matchup planner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{NEED_MORE_DATA}: log pitches you saw as a hitter, with a result.</p>
          ) : rows.map((r) => (
            <div key={r.key} className="text-sm border-b border-border pb-2">
              <p className="font-semibold">{r.key}</p>
              <p className="text-xs text-muted-foreground">Pitches seen: {r.pitches}{r.earlyRead ? " · early read" : ""}</p>
              <p>{r.swing.label}: {r.swing.value}</p>
              <p>{r.whiff.label}: {r.whiff.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
