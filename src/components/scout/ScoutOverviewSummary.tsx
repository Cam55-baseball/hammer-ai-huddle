import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { strengthsAndWeaknesses, type DevReport } from "@/lib/coach/development";
import type { ScoutProfileData } from "@/components/scout/ScoutProfileTabs";

const NM = "Not yet measured";
const NOT_SHARED = "Not shared";
const d = (x?: string | null) => (x ? String(x).slice(0, 10) : "date not recorded");

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 space-y-1 text-sm">
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  );
}
const Src = ({ t }: { t: string }) => <p className="text-xs text-muted-foreground">{t}</p>;

/** The General — scout overview layer (Plan v3.1 §8). Only shared, real data. */
export function ScoutOverviewSummary({ athleteId, p }: { athleteId: string; p: ScoutProfileData }) {
  const games = useQuery({
    queryKey: ["scout-game-play", athleteId],
    retry: false,
    enabled: p.shared.metrics,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("scout_athlete_game_play", { _athlete: athleteId });
      if (error) throw error;
      return data as { games: { game_date: string; verified_at: string | null }[] };
    },
  });

  const reports: DevReport[] = (p.reports ?? []).map((r: any, i: number) => ({
    id: String(r.id ?? i),
    date: r.created_at,
    module: r.module ?? null,
    efficiency_score: r.efficiency_score ?? null,
  }));
  const sw = p.shared.video ? strengthsAndWeaknesses(reports) : null;
  const g = [...(p.grades ?? [])].sort((a, b) => String(b.graded_at ?? "").localeCompare(String(a.graded_at ?? "")))[0];
  const gl = games.data?.games ?? [];

  return (
    <div className="space-y-2 mb-4" data-testid="scout-overview-summary">
      <p className="text-sm font-semibold">Scout overview</p>

      <Block title="Strengths and areas to develop">
        {!sw ? <p className="text-muted-foreground">{NOT_SHARED}</p>
          : sw.note && !sw.strengths.length && !sw.weaknesses.length ? <p className="text-muted-foreground">{sw.note}</p>
          : <>
              {sw.strengths.map((s) => <div key={s.text}><p>Strength: {s.text}</p><Src t={s.evidence} /></div>)}
              {sw.weaknesses.map((s) => <div key={s.text}><p>Area to develop: {s.text}</p><Src t={s.evidence} /></div>)}
            </>}
        {sw && <Src t="Source: video analysis reports" />}
      </Block>

      <Block title="Game stats">
        {!p.shared.metrics ? <p className="text-muted-foreground">{NOT_SHARED}</p>
          : games.isLoading ? <p className="text-muted-foreground">Loading…</p>
          : games.isError ? <p className="text-muted-foreground">{NOT_SHARED}</p>
          : !gl.length ? <p className="text-muted-foreground">No games logged yet.</p>
          : <>
              <p>Games logged (last 10): {gl.length}, latest {d(gl[0].game_date)}</p>
              <p>Verified by a coach or organization: {gl.filter((x) => x.verified_at).length} of {gl.length}</p>
              <Src t="Full lines in the Game play and stats tab." />
            </>}
      </Block>

      <Block title="Latest grade">
        {!p.shared.metrics ? <p className="text-muted-foreground">{NOT_SHARED}</p>
          : !g ? <p className="text-muted-foreground">{NM}</p>
          : <><p>Overall grade (20–80 scale): {g.overall_grade ?? NM}</p><Src t={`Entered by: ${g.grade_source ?? "not recorded"} · ${d(g.graded_at)}`} /></>}
      </Block>

      <Block title="Six-week recap">
        {!p.shared.metrics ? <p className="text-muted-foreground">{NOT_SHARED}</p>
          : !p.recap ? <p className="text-muted-foreground">No six-week recap yet.</p>
          : <>
              <p>Period: {d(p.recap.period_start)} to {d(p.recap.period_end)}</p>
              <p>Strength change: {p.recap.strength_change_percent != null ? `${p.recap.strength_change_percent}%` : NM}</p>
              <Src t="Source: app six-week recap" />
            </>}
      </Block>

      <Block title="Report counts">
        <p>Analysis reports: {p.shared.video ? (p.reports?.length ?? 0) : NOT_SHARED}</p>
        <p>Tests logged: {p.shared.metrics ? (p.tests?.length ?? 0) : NOT_SHARED}</p>
        <p>Grades: {p.shared.metrics ? (p.grades?.length ?? 0) : NOT_SHARED}</p>
      </Block>
    </div>
  );
}
