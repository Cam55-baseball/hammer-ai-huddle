import { useState } from 'react';
import { useMasteryIdentity } from '@/hooks/useMasteryIdentity';
import { useAthleteGoals } from '@/hooks/useAthleteGoals';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeaningTitle } from './SectionMeaning';
import { EvidenceTrendChart } from './EvidenceTrendChart';
import { pillarTrends, weeklyPoints } from '@/lib/progress/pillarTrends';

export function PillarGoalTrends({ sport }: { sport: 'baseball' | 'softball' }) {
  const query = useMasteryIdentity(sport, new Date().toLocaleDateString('en-CA'));
  const [mode,setMode] = useState('windows');
  const [weeks,setWeeks] = useState('8');
  const series = query.data ? pillarTrends(query.data) : [];
  const visible = (points: typeof series[number]['points']) => mode === 'weeks' ? weeklyPoints(points).slice(-Number(weeks)) : points.slice(-Number(weeks));
  return <section aria-label="Pillar and goal trends" className="min-w-0 space-y-5 border-t border-border pt-4">
    <h2><MeaningTitle title="Pillars & Goal Trends">Each pillar keeps its own recorded measure. Windows group completed opportunities, such as at-bats or batters faced. Weeks show the mean of recorded points, not a new grade. Missing data stays missing. A line going up does not always mean improvement; read its unit. Goals use their matching pillar, not a made-up goal score.</MeaningTitle></h2>
    <div className="flex flex-wrap gap-3"><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="windows">Windows</TabsTrigger><TabsTrigger value="weeks">Weeks</TabsTrigger></TabsList></Tabs><Tabs value={weeks} onValueChange={setWeeks}><TabsList><TabsTrigger value="4">Last 4</TabsTrigger><TabsTrigger value="8">Last 8</TabsTrigger><TabsTrigger value="12">Last 12</TabsTrigger></TabsList></Tabs></div>
    {query.isError && <p role="alert" className="text-destructive">Could not load recorded trends. Try again.</p>}
    {query.isPending && <p className="text-muted-foreground">Loading recorded trends…</p>}
    <div className="grid min-w-0 gap-x-8 gap-y-5 lg:grid-cols-2">{series.map(s => <section key={s.id} className="min-w-0 border-b border-border pb-5"><h3><MeaningTitle title={s.title}>{s.title} uses {s.unit}. Sources and dates stay with each point. Different tests and incomplete evidence are not proof of overall ability.</MeaningTitle></h3><EvidenceTrendChart label={s.title} unit={s.unit} points={visible(s.points)} /></section>)}</div>
    <SavedGoalTrends sport={sport} series={series} visible={visible} />
  </section>;
}

function SavedGoalTrends({sport,series,visible}:{sport:'baseball'|'softball';series:ReturnType<typeof pillarTrends>;visible:(points:ReturnType<typeof pillarTrends>[number]['points'])=>ReturnType<typeof pillarTrends>[number]['points']}) {
  const goals = useAthleteGoals();
  return <section className="space-y-4"><h3><MeaningTitle title="Your Goals">Each saved goal is linked to its existing pillar evidence when there is a direct match. A skill-specific goal without a comparable recorded measure stays unscored.</MeaningTitle></h3><GoalRows goals={goals} sport={sport} series={series} visible={visible}/></section>;
}

function GoalRows({goals,sport,series,visible}: {goals:ReturnType<typeof useAthleteGoals>;sport:string;series:ReturnType<typeof pillarTrends>;visible:(points:ReturnType<typeof pillarTrends>[number]['points'])=>ReturnType<typeof pillarTrends>[number]['points']}) {
  return <p className="text-base text-muted-foreground">Your top saved goal: {series.find(s=>s.id===goals.goals?.[0]?.category)?.title ?? 'See your ranked goals'} · {sport}.</p>;
}