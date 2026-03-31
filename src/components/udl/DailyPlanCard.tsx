import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useUDLPlan } from '@/hooks/useUDLPlan';
import { Brain, ChevronDown, ChevronUp, Play, CheckCircle2, AlertTriangle, Dumbbell, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DailyPlanCard() {
  const { plan, isLoading, completions, startDrill, completeDrill, getDrillStatus } = useUDLPlan();
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!plan || (plan.prescribed_drills?.length ?? 0) === 0) {
    return null;
  }

  const drills = plan.prescribed_drills ?? [];
  const constraints = plan.constraints_detected ?? [];
  const readinessNote = plan.readiness_adjustments?.note;
  const linkedSessions = (plan as any).linked_sessions ?? [];
  const feedbackApplied = (plan as any).feedback_applied ?? {};
  const completedCount = drills.filter((d) => getDrillStatus(d.drill_key) === 'completed').length;
  const progressPct = drills.length > 0 ? Math.round((completedCount / drills.length) * 100) : 0;

  const getLinkedSession = (constraintKey: string) => {
    return linkedSessions.find((ls: any) => ls.constraint_key === constraintKey);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Recommended Based on Your Data</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{drills.length} done
          </Badge>
        </div>
        <Progress value={progressPct} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {readinessNote && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{readinessNote}</span>
          </div>
        )}

        {feedbackApplied?.reason && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-1.5">
            Difficulty adjusted: {feedbackApplied.reason}
          </div>
        )}

        {drills.map((drill) => {
          const status = getDrillStatus(drill.drill_key);
          const linkedSession = getLinkedSession(drill.for_constraint);

          return (
            <div
              key={drill.drill_key}
              className={`rounded-lg border p-3 space-y-2 transition-colors ${
                status === 'completed'
                  ? 'bg-green-500/5 border-green-500/20'
                  : status === 'in_progress'
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm">{drill.drill_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{drill.setup}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {drill.constraint_label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{drill.reps}</span>
                <span>·</span>
                <span>Goal: {drill.goal_metric}</span>
              </div>

              <div className="flex gap-2">
                {status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => startDrill(drill.drill_key)}
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </Button>
                )}
                {status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => completeDrill({ drillKey: drill.drill_key })}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </Button>
                )}
                {status === 'completed' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completed</span>
                  </div>
                )}
                {linkedSession && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => navigate(`/progress`)}
                  >
                    <Video className="h-3 w-3" />
                    View Session
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {constraints.length > 0 && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1">
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? 'Hide details' : 'Why these drills?'}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {constraints.map((c) => (
                <div key={c.key} className="text-xs border rounded px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground">Score: {c.score}/100</span>
                  </div>
                  <p className="text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
