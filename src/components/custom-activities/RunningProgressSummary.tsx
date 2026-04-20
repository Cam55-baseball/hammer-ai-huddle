import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Footprints, Clock, TrendingUp, Flame, ChevronDown } from 'lucide-react';
import { aggregateAllRunning, type RunningStats, type DateRange } from '@/lib/runningAggregator';

interface RunningProgressSummaryProps {
  selectedSport: 'baseball' | 'softball';
}

const SOURCE_LABELS: Record<string, string> = {
  customActivities: 'Run Cards',
  embedded: 'Embedded Runs',
  intervals: 'Intervals',
  cardioExercises: 'Cardio Exercises',
  runningSessions: 'Running Sessions',
  speedSessions: 'Speed Lab',
  blockSprints: 'Program Sprints',
};

function StatsGrid({ stats, t }: { stats: RunningStats; t: any }) {
  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        {t('runningProgress.noData')}
      </div>
    );
  }

  // Smart unit display: show yards for short distances
  const useYards = stats.totalDistanceMiles < 1 && stats.totalDistanceYards > 0;
  const distanceLabel = useYards
    ? `${stats.totalDistanceYards}`
    : `${stats.totalDistanceMiles}`;
  const distanceUnit = useYards ? 'yards' : 'miles';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg bg-primary/10">
          <Footprints className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{distanceLabel}</p>
          <p className="text-xs text-muted-foreground">{distanceUnit}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-green-500/10">
          <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">
            {Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m
          </p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.totalTime')}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-orange-500/10">
          <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.sessions')}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-blue-500/10">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{stats.avgPace}</p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.avgPace')}</p>
        </div>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-md bg-muted/30">
          <span>Sources counted ({Object.values(stats.bySource).filter(s => s.sessions > 0).length})</span>
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-1">
          {Object.entries(stats.bySource)
            .filter(([, s]) => s.sessions > 0 || s.miles > 0)
            .map(([key, s]) => {
              const yards = Math.round(s.miles * 1760);
              const display = s.miles >= 1 ? `${s.miles.toFixed(2)} mi` : `${yards} yd`;
              return (
                <div key={key} className="flex justify-between text-xs px-3 py-1.5 rounded-md bg-muted/20">
                  <span className="text-muted-foreground">{SOURCE_LABELS[key] || key}</span>
                  <span className="font-medium">{s.sessions} • {display}</span>
                </div>
              );
            })}
          {Object.values(stats.bySource).every(s => s.sessions === 0) && (
            <p className="text-xs text-muted-foreground px-3 py-1.5">No sources contributed yet.</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function useRunningStats(userId: string | undefined, sport: 'baseball' | 'softball', range: DateRange) {
  return useQuery({
    queryKey: ['running-aggregate', userId, sport, range],
    queryFn: () => aggregateAllRunning(userId!, sport, range),
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function RunningProgressSummary({ selectedSport }: RunningProgressSummaryProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const weekly = useRunningStats(user?.id, selectedSport, 'week');
  const monthly = useRunningStats(user?.id, selectedSport, 'month');
  const allTime = useRunningStats(user?.id, selectedSport, 'all');

  // Cross-tab sync: invalidate on data-sync broadcast
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('data-sync');
    ch.onmessage = (e) => {
      const type = e?.data?.type || '';
      if (/run|speed|workout|activity|block/i.test(type)) {
        qc.invalidateQueries({ queryKey: ['running-aggregate'] });
      }
    };
    return () => ch.close();
  }, [qc]);

  const loading = weekly.isLoading && monthly.isLoading && allTime.isLoading;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-40" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Footprints className="h-5 w-5" />
          {t('runningProgress.title')}
        </CardTitle>
        <CardDescription>{t('runningProgress.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">{t('runningProgress.thisWeek')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('runningProgress.thisMonth')}</TabsTrigger>
            <TabsTrigger value="allTime">{t('runningProgress.allTime')}</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-4">
            <StatsGrid stats={weekly.data ?? blankStats()} t={t} />
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <StatsGrid stats={monthly.data ?? blankStats()} t={t} />
          </TabsContent>
          <TabsContent value="allTime" className="mt-4">
            <StatsGrid stats={allTime.data ?? blankStats()} t={t} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function blankStats(): RunningStats {
  return {
    totalDistanceMiles: 0,
    totalDistanceYards: 0,
    totalDuration: 0,
    totalSessions: 0,
    avgPace: '—:—',
    bySource: {
      customActivities: { sessions: 0, miles: 0 },
      embedded: { sessions: 0, miles: 0 },
      intervals: { sessions: 0, miles: 0 },
      cardioExercises: { sessions: 0, miles: 0 },
      runningSessions: { sessions: 0, miles: 0 },
      speedSessions: { sessions: 0, miles: 0 },
      blockSprints: { sessions: 0, miles: 0 },
    },
    shortDistanceMiles: 0,
  };
}
