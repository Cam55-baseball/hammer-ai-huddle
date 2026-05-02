import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AIPromptCard } from '@/components/analytics/AIPromptCard';
import { CheckCircle, Loader2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostSessionVideoSuggestions } from './PostSessionVideoSuggestions';

interface PostSessionSummaryProps {
  sessionId: string;
  module: string;
  sessionType: string;
  onDone: () => void;
}

const scoreLabels: Record<string, string> = {
  bqi: 'Bat Quality',
  fqi: 'Field Quality',
  pei: 'Pitching Eff.',
  decision: 'Decision',
  competitive_execution: 'Competitive',
};

function scoreColor(val: number): string {
  if (val >= 65) return 'text-green-500';
  if (val >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export function PostSessionSummary({ sessionId, module, sessionType, onDone }: PostSessionSummaryProps) {
  // Poll for composite_indexes (calculate-session runs async)
  const { data: session, isLoading } = useQuery({
    queryKey: ['session-summary', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_sessions')
        .select('id, composite_indexes, session_date, coach_id, session_type, module')
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

  // Streak
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h2 className="text-lg font-bold">Session Saved</h2>
            <p className="text-sm text-muted-foreground capitalize">
              {module} · {sessionType.replace(/_/g, ' ')} · {session?.session_date ?? 'Today'}
              {session?.coach_id && ' · Coach-Led'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Composite Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance Indexes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !hasScores ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Computing scores…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(composites).map(([key, val]) => (
                <div key={key} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {scoreLabels[key] ?? key}
                  </p>
                  <p className={cn('text-2xl font-bold mt-1', scoreColor(val))}>
                    {Math.round(val)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak */}
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

      {/* Hammer Prompts */}
      <AIPromptCard />

      {/* Done */}
      <Button className="w-full" size="lg" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
