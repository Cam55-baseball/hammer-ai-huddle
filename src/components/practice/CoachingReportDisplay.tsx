import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Brain, AlertTriangle, Wrench, Zap, TrendingUp, Target, Loader2 } from 'lucide-react';
import type { CoachingReport } from '@/lib/coachingReportTypes';
import { ROOT_CAUSE_LABELS } from '@/lib/coachingReportTypes';
import { cn } from '@/lib/utils';

interface CoachingReportDisplayProps {
  report: CoachingReport | null;
  isGenerating: boolean;
  error: string | null;
}

export function CoachingReportDisplay({ report, isGenerating, error }: CoachingReportDisplayProps) {
  if (isGenerating) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating elite coaching analysis…
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Coaching analysis unavailable — using standard insights.
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-3">
      {/* 1. Performance Breakdown */}
      <SectionCard
        icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
        title="Performance Breakdown"
      >
        {report.performanceBreakdown.situationalSplits.length > 0 && (
          <div className="space-y-1.5">
            {report.performanceBreakdown.situationalSplits.map((split, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{split.category}: {split.metric}</span>
                <div className="text-right">
                  <span className="font-medium">{split.value}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">— {split.context}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {report.performanceBreakdown.patterns.length > 0 && (
          <div className="mt-2 space-y-1">
            {report.performanceBreakdown.patterns.map((p, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {p}</p>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 2. Root Cause Analysis */}
      {report.rootCauseAnalysis.length > 0 && (
        <SectionCard
          icon={<Brain className="h-4 w-4 text-purple-500" />}
          title="Root Cause Analysis"
        >
          <div className="space-y-2">
            {report.rootCauseAnalysis.map((rc, i) => {
              const meta = ROOT_CAUSE_LABELS[rc.classification];
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", meta?.color)}>
                      {meta?.icon} {meta?.label}
                    </Badge>
                    <span className="text-sm font-medium">{rc.issue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-1">{rc.evidence}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* 3. Priority Stack */}
      {report.priorityStack.length > 0 && (
        <SectionCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          title="Priority Stack"
        >
          <div className="space-y-2">
            {report.priorityStack.map((p) => (
              <div key={p.rank} className="flex items-start gap-2">
                <span className="text-xs font-bold text-amber-500 mt-0.5">#{p.rank}</span>
                <div>
                  <p className="text-sm font-medium">{p.issue}</p>
                  <p className="text-xs text-muted-foreground">{p.gameImpact}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 4. Prescriptive Fixes */}
      {report.prescriptiveFixes.length > 0 && (
        <SectionCard
          icon={<Wrench className="h-4 w-4 text-green-500" />}
          title="Prescriptive Fixes"
        >
          <div className="space-y-3">
            {report.prescriptiveFixes.map((fix, i) => (
              <div key={i} className="rounded-lg border p-2.5 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{fix.issue}</p>
                <p className="text-sm font-medium">{fix.drill}</p>
                <p className="text-xs text-muted-foreground">Constraint: {fix.constraint}</p>
                <p className="text-sm font-semibold text-primary italic">"{fix.cue}"</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 5. Game Transfer */}
      {report.gameTransfer.length > 0 && (
        <SectionCard
          icon={<Zap className="h-4 w-4 text-orange-500" />}
          title="Game Transfer"
        >
          <div className="space-y-1.5">
            {report.gameTransfer.map((gt, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{gt.issue}</span>
                <span className="text-muted-foreground"> → {gt.realWorldImpact}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 6. Adaptive Progression */}
      {report.adaptiveProgression && (
        <SectionCard
          icon={<TrendingUp className="h-4 w-4 text-cyan-500" />}
          title="Adaptive Progression"
        >
          {report.adaptiveProgression.improvements.length > 0 && (
            <div className="mb-1.5">
              <p className="text-[10px] uppercase tracking-wide text-green-600 font-semibold mb-0.5">Improvements</p>
              {report.adaptiveProgression.improvements.map((imp, i) => (
                <p key={i} className="text-xs text-muted-foreground">↑ {imp}</p>
              ))}
            </div>
          )}
          {report.adaptiveProgression.emergingWeaknesses.length > 0 && (
            <div className="mb-1.5">
              <p className="text-[10px] uppercase tracking-wide text-red-600 font-semibold mb-0.5">Emerging</p>
              {report.adaptiveProgression.emergingWeaknesses.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">↓ {w}</p>
              ))}
            </div>
          )}
          <p className="text-sm font-medium mt-1">
            Primary Limiter: {report.adaptiveProgression.primaryLimiter}
          </p>
        </SectionCard>
      )}

      {/* 7. Next Session Focus */}
      {report.nextSessionFocus && (
        <SectionCard
          icon={<Target className="h-4 w-4 text-primary" />}
          title="Next Session Focus"
        >
          <div className="space-y-2">
            <FocusBar
              label={report.nextSessionFocus.primaryWeakness.area}
              pct={report.nextSessionFocus.primaryWeakness.repPct}
              color="bg-red-500"
            />
            <FocusBar
              label={report.nextSessionFocus.secondaryIssue.area}
              pct={report.nextSessionFocus.secondaryIssue.repPct}
              color="bg-amber-500"
            />
            <FocusBar
              label={report.nextSessionFocus.strengthMaintenance.area}
              pct={report.nextSessionFocus.strengthMaintenance.repPct}
              color="bg-green-500"
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function FocusBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-0.5">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" indicatorClassName={color} />
    </div>
  );
}
