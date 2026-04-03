import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Construction, Sparkles, TrendingUp } from 'lucide-react';

interface DataGateProps {
  children: ReactNode;
}

export function DataBuildingGate({ children }: DataGateProps) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['progressive-gate', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Fetch session count and basic data
      const [settingsRes, sessionsRes] = await Promise.all([
        supabase
          .from('athlete_mpi_settings')
          .select('games_minimum_met, integrity_threshold_met, coach_validation_met, data_span_met, ranking_eligible, primary_coach_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('performance_sessions')
          .select('id, session_date, drill_blocks, composite_indexes')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('session_date', { ascending: false })
          .limit(100),
      ]);

      return {
        settings: settingsRes.data,
        sessions: sessionsRes.data ?? [],
        sessionCount: sessionsRes.data?.length ?? 0,
      };
    },
    enabled: !!user,
  });

  if (isLoading) return null;

  const sessionCount = data?.sessionCount ?? 0;
  const settings = data?.settings;
  const sessions = data?.sessions ?? [];

  // ── PROGRESSIVE TIERS ──
  // 0-10: Early Stage
  // 10-50: Development Mode
  // 50+: Full Mode (with gates)

  if (sessionCount >= 50) {
    // Full mode — check if all gates met for full ranking features
    const hasCoach = !!settings?.primary_coach_id;
    const allGatesMet = settings?.ranking_eligible;

    if (!allGatesMet) {
      // Show full dashboard but with ranking notice
      return (
        <>
          <Card className="border-dashed mb-4">
            <CardContent className="p-4 flex items-start gap-3">
              <Construction className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Ranking Requirements</p>
                <p className="text-xs text-muted-foreground">
                  Complete these to be included in global rankings. Your full analytics are available below.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <GateBadge met={!!settings?.games_minimum_met} label="60+ sessions" />
                  <GateBadge met={!!settings?.integrity_threshold_met} label="80+ integrity" />
                  <GateBadge
                    met={!!settings?.coach_validation_met}
                    label={hasCoach ? "Coach validated" : "Coach (auto-passed)"}
                  />
                  <GateBadge met={!!settings?.data_span_met} label="14+ day span" />
                </div>
              </div>
            </CardContent>
          </Card>
          {children}
        </>
      );
    }

    return <>{children}</>;
  }

  if (sessionCount >= 10) {
    // Development Mode (10-50 sessions) — show children with guidance
    return (
      <>
        <Card className="border-primary/20 bg-primary/5 mb-4">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">Development Mode — {sessionCount} sessions</p>
              <p className="text-xs text-muted-foreground">
                Your analysis is getting more accurate. {50 - sessionCount} more sessions until full intelligence mode.
              </p>
            </div>
          </CardContent>
        </Card>
        {children}
      </>
    );
  }

  // Early Stage (0-10 sessions) — show basic insights
  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Getting Started — {sessionCount} session{sessionCount !== 1 ? 's' : ''} logged
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Keep logging sessions — your analysis gets smarter with more data. Here's what we see so far:
          </p>

          {sessionCount > 0 && <EarlyInsights sessions={sessions} />}

          <div className="bg-accent/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Next milestone:</span>{' '}
              {sessionCount < 10
                ? `${10 - sessionCount} more sessions to unlock early analysis`
                : '10 more sessions to unlock development insights'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GateBadge({ met, label }: { met: boolean; label: string }) {
  return (
    <Badge variant="outline" className={met ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-muted text-muted-foreground'}>
      {met ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Circle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

function EarlyInsights({ sessions }: { sessions: any[] }) {
  // Compute basic tendencies from available sessions
  const drillTypes: Record<string, number> = {};
  let totalGrade = 0;
  let gradeCount = 0;

  sessions.forEach((s: any) => {
    const blocks = s.drill_blocks ?? [];
    blocks.forEach((b: any) => {
      const type = b.drill_type || b.category || 'General';
      drillTypes[type] = (drillTypes[type] || 0) + 1;
    });
    const ix = s.composite_indexes;
    if (ix) {
      if (ix.bqi) { totalGrade += ix.bqi; gradeCount++; }
    }
  });

  const sorted = Object.entries(drillTypes).sort(([, a], [, b]) => b - a);
  const topDrill = sorted[0];
  const avgGrade = gradeCount > 0 ? Math.round(totalGrade / gradeCount) : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {topDrill && (
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Most Trained</div>
          <div className="font-semibold text-sm capitalize">{topDrill[0].replace(/_/g, ' ')}</div>
          <div className="text-xs text-muted-foreground">{topDrill[1]} reps logged</div>
        </div>
      )}
      {avgGrade && (
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Avg Quality</div>
          <div className="font-semibold text-sm">{avgGrade}/100</div>
          <div className="text-xs text-muted-foreground">Early indicator</div>
        </div>
      )}
    </div>
  );
}
