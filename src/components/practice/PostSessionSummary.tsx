import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIPromptCard } from '@/components/analytics/AIPromptCard';
import { CheckCircle, Loader2, Flame, Trophy, BarChart3, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGradeLabel } from '@/lib/gradeLabel';
import { DrillBlock } from '@/hooks/usePerformanceSession';

interface PostSessionSummaryProps {
  sessionId: string;
  module: string;
  sessionType: string;
  onDone: () => void;
}

const MODULE_INDEX_KEYS: Record<string, string[]> = {
  hitting: ['bqi', 'decision', 'competitive_execution'],
  pitching: ['pei', 'decision', 'competitive_execution'],
  fielding: ['fqi', 'decision', 'competitive_execution'],
  catching: ['fqi', 'decision', 'competitive_execution'],
  throwing: ['decision', 'competitive_execution'],
  baserunning: ['decision', 'competitive_execution'],
  bunting: ['bqi', 'decision', 'competitive_execution'],
};

const INDEX_LABELS: Record<string, string> = {
  bqi: 'Bat Quality Index',
  fqi: 'Field Quality Index',
  pei: 'Pitching Effectiveness',
  decision: 'Decision Index',
  competitive_execution: 'Competitive Execution',
};

function scoreColor(val: number): string {
  if (val >= 65) return 'text-green-400';
  if (val >= 50) return 'text-amber-400';
  if (val >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(val: number): string {
  if (val >= 65) return 'from-green-500/20 to-green-600/10 border-green-500/30';
  if (val >= 50) return 'from-amber-500/20 to-amber-600/10 border-amber-500/30';
  if (val >= 40) return 'from-orange-500/20 to-orange-600/10 border-orange-500/30';
  return 'from-red-500/20 to-red-600/10 border-red-500/30';
}

function getTierMessage(grade: number | null): string {
  if (grade == null) return 'Session logged.';
  if (grade >= 70) return 'Dominant session. Elite-level work.';
  if (grade >= 60) return 'Plus-plus work. Keep building.';
  if (grade >= 55) return 'Strong session. The work is paying off.';
  if (grade >= 50) return 'Above average. Trending the right way.';
  if (grade >= 45) return 'Solid foundation. Stay consistent.';
  if (grade >= 40) return 'Room to grow. Show up tomorrow.';
  return 'Every rep counts. Trust the process.';
}

function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    hitting: 'Hitting', pitching: 'Pitching', fielding: 'Fielding',
    catching: 'Catching', throwing: 'Throwing', baserunning: 'Baserunning',
    bunting: 'Bunting',
  };
  return labels[module] || module;
}

export function PostSessionSummary({ sessionId, module, sessionType, onDone }: PostSessionSummaryProps) {
  const { data: session, isLoading } = useQuery({
    queryKey: ['session-summary', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, composite_indexes, session_date, coach_id, session_type, module, drill_blocks, effective_grade, notes')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && d.composite_indexes && Object.keys(d.composite_indexes as object).length > 0) return false;
      return 2000;
    },
    staleTime: 0,
  });

  const { data: mpiSettings } = useQuery({
    queryKey: ['mpi-streak'],
    queryFn: async () => {
      const { data } = await supabase
        .from('athlete_mpi_settings')
        .select('streak_current, streak_best')
        .maybeSingle();
      return data;
    },
  });

  const composites = (session?.composite_indexes ?? {}) as Record<string, number>;
  const hasScores = Object.keys(composites).length > 0;
  const drillBlocks = (session?.drill_blocks ?? []) as DrillBlock[];
  const totalReps = drillBlocks.reduce((sum, b) => sum + (b.volume || 0), 0);
  const drillCount = drillBlocks.length;
  const effectiveGrade = session?.effective_grade as number | null;
  const gradeLabel = effectiveGrade != null ? getGradeLabel(effectiveGrade) : null;

  // Filter composites to module-relevant keys
  const relevantKeys = MODULE_INDEX_KEYS[module] || Object.keys(composites);
  const filteredComposites = Object.entries(composites).filter(([key]) => relevantKeys.includes(key));

  const isCoachLed = !!session?.coach_id;

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/20">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight">Session Complete</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {getModuleLabel(module)} · {sessionType.replace(/_/g, ' ')} · {session?.session_date ?? 'Today'}
                {isCoachLed && ' · Coach-Led'}
              </p>
            </div>
          </div>

          {/* Session Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <Dumbbell className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{drillCount}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Drills</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{totalReps}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Reps</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <Trophy className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className={cn('text-lg font-bold', effectiveGrade != null ? scoreColor(effectiveGrade) : '')}>
                {effectiveGrade != null ? Math.round(effectiveGrade) : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Grade</p>
            </div>
          </div>

          {/* Grade Label + Tier Message */}
          {gradeLabel && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between">
                <span className={cn('text-sm font-semibold', scoreColor(effectiveGrade!))}>
                  {gradeLabel}
                </span>
                <span className="text-xs text-muted-foreground italic">
                  {getTierMessage(effectiveGrade)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Indexes */}
      {(isLoading || !hasScores || filteredComposites.length > 0) && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {getModuleLabel(module)} Indexes
            </h3>
            {isLoading || !hasScores ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Computing scores…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredComposites.map(([key, val]) => (
                  <div
                    key={key}
                    className={cn(
                      'rounded-xl border bg-gradient-to-br p-4',
                      scoreBg(val)
                    )}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      {INDEX_LABELS[key] ?? key.replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-3xl font-bold', scoreColor(val))}>
                        {Math.round(val)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getGradeLabel(val)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Streak */}
      {mpiSettings?.streak_current != null && mpiSettings.streak_current > 0 && (
        <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">{mpiSettings.streak_current}-day streak 🔥</p>
              {mpiSettings.streak_best != null && (
                <p className="text-xs text-muted-foreground">Personal best: {mpiSettings.streak_best} days</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Prompts */}
      <AIPromptCard />

      {/* Done */}
      <Button className="w-full" size="lg" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
