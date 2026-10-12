import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { ScoutOverviewSummary } from "@/components/scout/ScoutOverviewSummary";

const NM = "Not yet measured";
const NOT_SHARED = "Not shared. This family hasn't shared this with you.";
const d = (x?: string | null) => (x ? String(x).slice(0, 10) : "date not recorded");
const label = (k: string) => k.replace(/_/g, " ");

export interface ScoutProfileData {
  shared: { profile: boolean; metrics: boolean; video: boolean; academics: boolean };
  overview: Record<string, any> | null;
  academics: Record<string, any> | null;
  tests: Array<{ test_date: string; test_type: string; results: Record<string, unknown> }> | null;
  recap: Record<string, any> | null;
  grades: Array<Record<string, any>> | null;
  reports: Array<Record<string, any>> | null;
  players_club: Array<Record<string, any>> | null;
}

export function useScoutProfile(athleteId: string) {
  return useQuery({
    queryKey: ["scout-profile", athleteId],
    retry: false,
    queryFn: async (): Promise<ScoutProfileData> => {
      const { data, error } = await (supabase as any).rpc("scout_athlete_profile", { _athlete: athleteId });
      if (error) throw error;
      return data as ScoutProfileData;
    },
  });
}

function Row({ k, v, empty = "Not entered" }: { k: string; v: unknown; empty?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm border-b py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v === null || v === undefined || v === "" ? empty : String(v)}</span>
    </div>
  );
}

const Src = ({ t }: { t: string }) => <p className="text-xs text-muted-foreground">{t}</p>;
const Empty = ({ t }: { t: string }) => <p className="text-sm text-muted-foreground">{t}</p>;

export const SCOUT_TABS = [
  ["overview", "Overview"],
  ["id", "ID and academics"],
  ["performance", "Performance"],
  ["reports", "Reports and video"],
  ["recap", "Six-week recap"],
  ["grades", "Grades"],
  ["club", "Players Club"],
] as const;

export function ScoutTabTriggers() {
  return <>{SCOUT_TABS.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</>;
}

export function ScoutTabContents({ q, athleteId }: { q: ReturnType<typeof useScoutProfile>; athleteId: string }) {
  const p = q.data;
  const wrap = (node: React.ReactNode) =>
    q.isLoading ? <Empty t="Loading…" /> : q.isError || !p ? <Empty t="Not shared. You're not following this player, or the family hasn't shared their profile." /> : node;
  const o = p?.overview;
  return (
    <>
      <TabsContent value="overview">{wrap(!p?.shared.profile ? <Empty t={NOT_SHARED} /> : (
        <div data-testid="scout-overview">
          {p && <ScoutOverviewSummary athleteId={athleteId} p={p} />}
          <p className="text-sm font-semibold">Who they are</p>
          <Row k="Name" v={o?.full_name} /><Row k="Sport" v={o?.sport} />
          <Row k="Primary position" v={o?.primary_position} /><Row k="Secondary position" v={o?.secondary_position} />
          <Row k="Bats" v={o?.bats} /><Row k="Throws" v={o?.throws} />
          <Row k="Playing level" v={o?.level} /><Row k="Team" v={o?.team} />
          <Row k="Region (state)" v={o?.region} /><Row k="Grad year" v={o?.grad_year} />
          <Row k="Recruiting status" v={o?.recruiting_status} />
          <Src t="Source: athlete-entered profile." />
        </div>))}
      </TabsContent>
      <TabsContent value="id">{wrap(!p?.shared.academics ? <Empty t={NOT_SHARED} /> : (
        <div>
          <Row k="GPA" v={p?.academics?.gpa} /><Row k="SAT" v={p?.academics?.sat} /><Row k="ACT composite" v={p?.academics?.act} />
          <Row k="School transcript" v={p?.academics?.transcript_status === "verified" ? `Verified on ${d(p?.academics?.transcript_reviewed_at)}` : p?.academics?.transcript_status ? `Uploaded, ${p.academics.transcript_status}` : "None uploaded"} />
          <Src t={p?.academics?.transcript_status === "verified" ? "Source: athlete-entered; transcript verified." : "Source: athlete-entered (not verified)."} />
        </div>))}
      </TabsContent>
      <TabsContent value="performance">{wrap(!p?.shared.metrics ? <Empty t={NOT_SHARED} /> : !p?.tests?.length ? <Empty t={NM} /> : (
        <div className="space-y-2">{p.tests.map((t, i) => {
          const verified = (t.results as any)?._verified === "in_person";
          return (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">Test: {label(t.test_type)}</span><span className="text-muted-foreground">{d(t.test_date)}</span></div>
              {Object.entries(t.results ?? {}).filter(([k]) => !k.startsWith("_")).map(([k, v]) => <p key={k}>{label(k)}: {String(v)}</p>)}
              <Src t={verified ? "Source: facility-verified (in person)" : "Source: athlete-entered"} />
            </div>);
        })}</div>))}
      </TabsContent>
      <TabsContent value="reports">{wrap(!p?.shared.video ? <Empty t={NOT_SHARED} /> : !p?.reports?.length ? <Empty t="No analysis reports yet." /> : (
        <div className="space-y-2">
          <p className="text-sm">Analysis reports: {p.reports.length}</p>
          {p.reports.map((r, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm flex justify-between">
              <span>Skill: {r.module ?? NM}</span><span>Score: {r.efficiency_score ?? NM} · {d(r.created_at)}</span>
            </div>))}
          <Src t="Source: video analysis reports." />
        </div>))}
      </TabsContent>
      <TabsContent value="recap">{wrap(!p?.shared.metrics ? <Empty t={NOT_SHARED} /> : !p?.recap ? <Empty t="No six-week recap yet." /> : (
        <div>
          <Row k="Period" v={`${d(p.recap.period_start)} to ${d(p.recap.period_end)}`} />
          <Row k="Strength change" empty={NM} v={p.recap.strength_change_percent != null ? `${p.recap.strength_change_percent}%` : null} />
          <Row k="Total weight lifted" empty={NM} v={p.recap.total_weight_lifted != null ? `${p.recap.total_weight_lifted} lb` : null} />
          <Src t="Source: the player's logged workouts." />
        </div>))}
      </TabsContent>
      <TabsContent value="grades">{wrap(!p?.shared.metrics ? <Empty t={NOT_SHARED} /> : !p?.grades?.length ? <Empty t="No grades yet." /> : (
        <div className="space-y-2">{p.grades.map((g, i) => (
          <div key={i} className="rounded-lg border p-3 text-sm">
            <p>Overall grade (20–80 scale): {g.overall_grade ?? NM}</p>
            <p>Position: {g.position_evaluated ?? NM}</p>
            <Src t={`Entered by: ${g.grade_source ?? "not recorded"} · ${d(g.graded_at)}`} />
          </div>))}</div>))}
      </TabsContent>
      <TabsContent value="club">{wrap(!p?.shared.video ? <Empty t={NOT_SHARED} /> : !p?.players_club?.length ? <Empty t="Nothing saved to Players Club yet." /> : (
        <div className="space-y-2">{p.players_club.map((c, i) => (
          <div key={i} className="rounded-lg border p-3 text-sm flex justify-between">
            <span>Video: {c.title}</span><span className="text-muted-foreground">{d(c.created_at)}</span>
          </div>))}</div>))}
      </TabsContent>
    </>
  );
}
