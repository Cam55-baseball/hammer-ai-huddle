/**
 * Owner Nov 4 #4: the General for an organization account — organization-wide,
 * read-only, built only from data the organization dashboard already reads
 * (org_facility_board, organization_members, org teams, existing trend cards).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeaningSection } from '@/components/progress/SectionMeaning';
import { OrganizationProgress } from '@/components/organization/OrganizationProgress';
import { OrganizationMemberList, memberGroup } from '@/components/organization/OrganizationMemberList';
import { GrowthTrends } from '@/components/organization/GrowthTrends';
import { CompareByTest } from '@/components/organization/CompareByTest';
import { TeamDisciplineSummary } from '@/components/coach/TeamDisciplineSummary';
import { useOrganization } from '@/hooks/useOrganization';
import { headline, playerName, type FacilityBoardRow } from '@/lib/org/facilityBoard';
import { Building2 } from 'lucide-react';

/** Pure organization totals; tested. */
export function orgOverview(rows: FacilityBoardRow[], members: { role_in_org?: string | null }[]) {
  const teams = new Set(rows.map((r) => r.team_id).filter(Boolean));
  const planned = rows.reduce((s, r) => s + r.week_planned, 0);
  const done = rows.reduce((s, r) => s + r.week_done, 0);
  return {
    players: members.filter((m) => memberGroup(m.role_in_org) === 'Athletes').length,
    coaches: members.filter((m) => memberGroup(m.role_in_org) === 'Coaches').length,
    teams: teams.size,
    planned, done,
    completionPct: planned > 0 ? Math.round((done / planned) * 100) : null,
    cautions: rows.filter((r) => r.missed_days > 0 || !!r.top_alert).length,
  };
}

export function OrganizationGeneral() {
  const { myOrgs, members } = useOrganization();
  const org = myOrgs.data?.[0];
  const board = useQuery({
    queryKey: ['org-facility-board', org?.id], enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('org_facility_board', { _org: org!.id });
      if (error) throw error;
      return (data ?? []) as unknown as FacilityBoardRow[];
    },
  });
  if (!org) return null;
  const rows = board.data ?? [];
  const o = orgOverview(rows, (members.data ?? []).filter((m: any) => m.organization_id === org.id));
  const today = new Date().toLocaleDateString('en-CA');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-start gap-2 text-2xl font-bold sm:text-3xl"><Building2 className="h-8 w-8 shrink-0 text-primary" />{org.name}</h1>
          <p className="text-muted-foreground">The General · your whole organization</p>
        </div>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
            <TabsTrigger className="min-h-11" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="min-h-11" value="players">Players</TabsTrigger>
            <TabsTrigger className="min-h-11" value="coaches">Coaches &amp; Teams</TabsTrigger>
            <TabsTrigger className="min-h-11" value="trends">Trends</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">
            <MeaningSection organization title="Overview" use="Start here each week: check completion and how many players need a look." explanation="Counts of your active players, coaches and teams, plus cards done out of cards planned in the last 7 days. No record is not a score of zero.">
              {board.isError ? <p role="alert" className="text-destructive">Could not read your organization totals.</p> :
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([['Players', o.players], ['Coaches', o.coaches], ['Teams', o.teams], ['Cards done (7 days)', `${o.done} of ${o.planned}`], ['Completion (7 days)', o.completionPct == null ? 'No plans yet' : `${o.completionPct}%`], ['Players needing a look', o.cautions]] as const).map(([k, v]) =>
                  <div key={k} className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-xl font-semibold">{v}</dd></div>)}
              </dl>}
            </MeaningSection>
          </TabsContent>
          <TabsContent value="players" className="space-y-6">
            <MeaningSection organization title="Players" use="Talk first with players who missed days or have an open alert." explanation="Each player's recorded completion today and this week, missed days, and the next test due. An open alert means a recorded change worth a coach's check — it is not a diagnosis.">
              <OrganizationProgress orgId={org.id} />
              <ul className="space-y-2">
                {rows.map((r) => <li key={r.athlete_id} className="flex justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span className="font-medium">{playerName(r)}{r.team_name ? ` · ${r.team_name}` : ''}</span>
                  <span className="text-muted-foreground">Today {r.today_done}/{r.today_planned} · Week {r.week_done}/{r.week_planned} · {headline(r, today)}</span>
                </li>)}
              </ul>
            </MeaningSection>
            <MeaningSection organization title="Discipline" use="Find players who skip required items." explanation="The existing required-item completion record, not a judgment about character." collapsed><TeamDisciplineSummary orgId={org.id} /></MeaningSection>
          </TabsContent>
          <TabsContent value="coaches" className="space-y-6">
            <MeaningSection organization title="Coaches & Teams" use="Make sure every team has a coach and every player has a team." explanation="Your organization's connections grouped as Coaches and Athletes, with the teams each person is on.">
              <OrganizationMemberList />
              <ul className="space-y-1 text-sm">
                {[...new Map(rows.filter((r) => r.coach_id).map((r) => [r.coach_id!, r])).values()].map((c) =>
                  <li key={c.coach_id!}>{c.coach_name ?? 'Coach'}: {rows.filter((r) => r.coach_id === c.coach_id).length} player(s){c.team_name ? ` · ${c.team_name}` : ''}</li>)}
              </ul>
            </MeaningSection>
          </TabsContent>
          <TabsContent value="trends" className="space-y-6">
            <MeaningSection organization title="Training & game trends" use="Look for weeks where training dropped and games got worse. Use it to start a talk, not to judge." explanation="Recorded training completion and game outcomes over the same stretch. Moving together does not prove one caused the other."><GrowthTrends orgId={org.id} /></MeaningSection>
            <MeaningSection organization title="Testing" use="Pick one test and look for players far below the group." explanation="The latest recorded result for one test. Check dates, ages and levels before comparing." collapsed><CompareByTest orgId={org.id} /></MeaningSection>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
