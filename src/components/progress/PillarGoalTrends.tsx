import { useState } from 'react';
import { useMasteryIdentity } from '@/hooks/useMasteryIdentity';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { savedTrendGoals } from '@/lib/progress/savedTrendGoals';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeaningTitle } from './SectionMeaning';
import { EvidenceTrendChart } from './EvidenceTrendChart';
import { pillarTrends, weeklyPoints, type PillarSeries } from '@/lib/progress/pillarTrends';
import { emptyPillars, plainSeriesTitle, plainSource, trendInsight, type TrendInsight } from '@/lib/progress/trendInsight';
import { HammersCard } from '@/components/intelligence/HammersCard';

/** Plain titles; two series with the same name say which test day they came from. */
function titled(series: PillarSeries[]) {
  const base = series.map(s => plainSeriesTitle(s.title));
  return series.map((s, i) => {
    if (base.filter(b => b === base[i]).length < 2) return base[i];
    const parts = s.title.split(' · ');
    return `${base[i]} · ${parts[parts.length - 2] ?? `set ${i + 1}`} tests`;
  });
}

export function PillarGoalTrends({ sport }: { sport: 'baseball' | 'softball' }) {
  const query = useMasteryIdentity(sport, new Date().toLocaleDateString('en-CA'));
  const [mode,setMode] = useState('windows');
  const [weeks,setWeeks] = useState('8');
  const series = query.data ? pillarTrends(query.data) : [];
  const titles = titled(series);
  const visible = (points: PillarSeries['points']) => mode === 'weeks' ? weeklyPoints(points).slice(-Number(weeks)) : points.slice(-Number(weeks));
  const cards = series.map((s, i) => ({ s, insight: trendInsight({ ...s, points: visible(s.points) }, titles[i]) })).filter((c): c is { s: PillarSeries; insight: TrendInsight } => !!c.insight);
  const missing = emptyPillars(series);
  return <section aria-label="Pillar and goal trends" className="min-w-0 space-y-5 border-t border-border pt-4">
    <h2><MeaningTitle title="Your Pillars" use="Find the pillar that's slipping or has no data. Do that work on Hammers Today, then record it again so you can see if it's moving.">Each pillar (contact, power, defense, speed, arm, pitching) uses its own real records — games and tests. One record isn't a trend. Missing data stays missing; it's never a zero.</MeaningTitle></h2>
    {cards.some(c => c.insight.showChart) && <div className="flex flex-wrap gap-3"><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="windows">Windows</TabsTrigger><TabsTrigger value="weeks">Weeks</TabsTrigger></TabsList></Tabs><Tabs value={weeks} onValueChange={setWeeks}><TabsList><TabsTrigger value="4">Last 4</TabsTrigger><TabsTrigger value="8">Last 8</TabsTrigger><TabsTrigger value="12">Last 12</TabsTrigger></TabsList></Tabs></div>}
    {query.isError && <p role="alert" className="text-destructive">Could not load your records. Try again.</p>}
    {query.isPending && <p className="text-muted-foreground">Loading your records…</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{cards.map(({ s, insight }) => <HammersCard key={s.id} title={insight.title} weSee={insight.weSee} because={insight.because} howSure={insight.howSure} samples={insight.samples} doThis={insight.doThis} checkBack={insight.checkBack}>
      {insight.showChart && <EvidenceTrendChart label={insight.title} unit={s.unit} points={visible(s.points).map(p => ({ ...p, source: plainSource(p.source) }))} />}
    </HammersCard>)}</div>
    {query.data && missing.length > 0 && <HammersCard title="Need more data" weSee={`No records yet for: ${missing.join(', ')}.`} howSure="need_more_data" doThis="Log your games (at-bats, chances, batters faced) and enter your arm and speed tests in the Vault." checkBack="After your next game or test." />}
    <SavedGoalTrends sport={sport} cards={cards} />
  </section>;
}

function SavedGoalTrends({sport,cards}:{sport:'baseball'|'softball';cards:{ s: PillarSeries; insight: TrendInsight }[]}) {
  const { user } = useAuth();
  const goals = useQuery({ queryKey: ['general-saved-goals',user?.id,sport], enabled: !!user, queryFn: async () => {
    if (!user) return [];
    const {data,error} = await supabase.from('athlete_context').select('category_goals,position_primary').eq('user_id',user.id).maybeSingle();
    if (error) throw error;
    return savedTrendGoals(data?.category_goals,sport);
  }});
  const rows = (goals.data ?? []).map(g => {
    const pillar = g.module === 'pitching' ? 'pitching' : g.module === 'throwing' ? 'arm' : g.module === 'fielding' ? 'defense' : g.module === 'speed' ? 'speed' : g.module === 'power' || /power/i.test(g.title) ? 'power' : 'contact';
    const best = cards.filter(c => c.s.id === pillar || c.s.id.startsWith(`${pillar}-`)).sort((a, b) => b.insight.samples - a.insight.samples)[0];
    return { g, pillar, best };
  });
  const empty = rows.filter(r => !r.best).map(r => r.g.title);
  return <section className="space-y-4"><h3><MeaningTitle title="Your Goals" use="Pick the goal that matters most this month. Do its work on Hammers Today, and record the matching test or game stat so you can see progress.">Each goal is checked against the closest real record we have (for example, a sprint test for a quicker first step). That record supports the goal — it doesn't measure it directly.</MeaningTitle></h3>
    {goals.isError && <p role="alert" className="text-destructive">Could not load your goals.</p>}
    {goals.data?.length === 0 && <p className="text-muted-foreground">No saved goals for this sport yet. Add them in Update Hammer.</p>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{rows.filter(r => r.best).map(({ g, pillar, best }) => {
      const i = best!.insight;
      return <HammersCard key={`${g.module}:${g.title}`} title={`Goal: ${g.title}`} weSee={`Closest record — ${i.title}: ${i.weSee}`} because={`${pillar[0].toUpperCase()}${pillar.slice(1)} is the closest thing we record for this goal. ${i.because}`}
        howSure={i.howSure === 'measured' ? 'pattern' : i.howSure} samples={i.samples} doThis={i.doThis} checkBack={i.checkBack} />;
    })}</div>
    {empty.length > 0 && <HammersCard title="Goals that need more data" weSee={`Nothing recorded yet for: ${empty.join(', ')}.`} howSure="need_more_data" doThis="Record the matching game stats or tests for these goals." checkBack="After your next game or test." />}
  </section>;
}
