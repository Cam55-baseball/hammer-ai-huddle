import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getGradeLabel } from '@/lib/gradeLabel';
import { generateInsights, getTotalReps, getDrillCount } from '@/lib/sessionInsights';
import { useInsightHistory } from '@/hooks/useInsightHistory';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Loader2, Flame, Trophy, Target, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostSessionSummaryV2Props {
  sessionId: string;
  module: string;
  sessionType: string;
  onDone: () => void;
}

export function PostSessionSummaryV2({ sessionId, module, sessionType, onDone }: PostSessionSummaryV2Props) {
  const { getVariationOffset, recordFocus } = useInsightHistory();
  const recordedRef = useRef(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-summary-v2', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, composite_indexes, session_date, coach_id, session_type, module, drill_blocks, effective_grade')
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
  const drillBlocks = (session?.drill_blocks as any[] | null) ?? [];
  const grade = session?.effective_grade as number | null;
  const hasScores = Object.keys(composites).length > 0;
  const totalReps = getTotalReps(drillBlocks);
  const drillCount = getDrillCount(drillBlocks);

  // Compute variation offset from repetition history
  const preOffset = hasScores ? getVariationOffset(null) : 0;
  
  const insights = generateInsights(composites, drillBlocks, module, {
    sessionType,
    sessionDate: session?.session_date ?? undefined,
    variationOffset: preOffset,
  });

  // After insights are computed with a focus, get the real offset and recompute if needed
  const finalOffset = hasScores ? getVariationOffset(insights.focusMetric) : 0;
  const finalInsights = finalOffset !== preOffset
    ? generateInsights(composites, drillBlocks, module, {
        sessionType,
        sessionDate: session?.session_date ?? undefined,
        variationOffset: finalOffset,
      })
    : insights;

  // Record focus metric to history (once)
  useEffect(() => {
    if (hasScores && finalInsights.focusMetric && !recordedRef.current) {
      recordedRef.current = true;
      recordFocus(finalInsights.focusMetric, session?.session_date ?? undefined);
    }
  }, [hasScores, finalInsights.focusMetric, recordFocus, session?.session_date]);

  const colorMap = {
    green: 'text-green-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
  };
  const bgColorMap = {
    green: 'bg-green-500/10',
    amber: 'bg-amber-500/10',
    red: 'bg-red-500/10',
  };

  return (
    <div className="space-y-3">
      {/* A. Session Snapshot */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-primary shrink-0" />
              <div>
                <h2 className="text-lg font-bold">Session Saved</h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {module} · {sessionType.replace(/_/g, ' ')} · {session?.session_date ?? 'Today'}
                  {session?.coach_id && ' · Coach-Led'}
                </p>
              </div>
            </div>
          </div>

          {/* Grade Hero */}
          {isLoading || !hasScores ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Computing scores…
            </div>
          ) : grade != null ? (
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl font-black tracking-tight">{Math.round(grade)}</span>
              <Badge variant="outline" className="text-sm font-semibold">
                {getGradeLabel(grade)}
              </Badge>
            </div>
          ) : null}

          {totalReps > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {totalReps} reps across {drillCount} drill{drillCount !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Only show insight cards after scores load */}
      {hasScores && (
        <>
          {/* B. Clear Win */}
          {finalInsights.win && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <Trophy className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600">Your Win</p>
                  <p className="text-sm font-medium mt-0.5">{finalInsights.win}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* C. Priority Focus */}
          {finalInsights.focus && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <Target className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Priority Focus</p>
                  <p className="text-sm font-medium mt-0.5">{finalInsights.focus}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* D. Next Rep Cue */}
          {finalInsights.nextRepCue && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <ArrowRight className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Next Rep Cue</p>
                  <p className="text-sm font-medium mt-0.5">{finalInsights.nextRepCue}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* E. Key Metrics */}
          {finalInsights.keyMetrics.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {finalInsights.keyMetrics.map((m) => (
                <div
                  key={m.label}
                  className={cn(
                    'rounded-lg border p-3 text-center',
                    bgColorMap[m.color]
                  )}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{m.label}</p>
                  <p className={cn('text-xl font-bold mt-0.5', colorMap[m.color])}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* F. Streak */}
      {mpiSettings?.streak_current != null && mpiSettings.streak_current > 0 && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">{mpiSettings.streak_current}-day streak</p>
              {mpiSettings.streak_best != null && (
                <p className="text-xs text-muted-foreground">Best: {mpiSettings.streak_best} days</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* G. Done */}
      <Button className="w-full" size="lg" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
