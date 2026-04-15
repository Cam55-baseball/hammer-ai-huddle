import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, ArrowRight } from 'lucide-react';
import { getGradeLabel } from '@/lib/gradeLabel';
import { generateInsights } from '@/lib/sessionInsights';
import { SessionVideosDisplay } from '@/components/practice/SessionVideosDisplay';
import { useCoachingReport } from '@/hooks/useCoachingReport';
import { CoachingReportDisplay } from '@/components/practice/CoachingReportDisplay';
import { cn } from '@/lib/utils';

const TAG_STYLES: Record<string, string> = {
  'Elite Execution': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Power Day': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Solid Work': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Building': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Chase Spike': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Contact Issues': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Grind Session': 'bg-muted text-muted-foreground border-border',
};

const colorMap: Record<string, string> = {
  green: 'text-green-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
};

interface SessionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any | null;
}

export function SessionDetailDialog({ open, onOpenChange, session }: SessionDetailDialogProps) {
  if (!session) return null;

  const grade = session.effective_grade;
  const drillBlocks = (session.drill_blocks as any[] | null) ?? [];
  const composites = (session.composite_indexes as Record<string, number> | null) ?? {};
  const sessionModule = session.module || 'hitting';
  const hasScores = Object.keys(composites).length > 0;
  const drillBlocks = (session.drill_blocks as any[] | null) ?? [];
  const composites = (session.composite_indexes as Record<string, number> | null) ?? {};
  const sessionModule = session.module || 'hitting';
  const insights = generateInsights(composites, drillBlocks, sessionModule, {
    sessionDate: session.session_date,
    sessionType: session.session_type ?? undefined,
  });
  const tagStyle = TAG_STYLES[insights.sessionTag] ?? TAG_STYLES['Solid Work'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="capitalize">{sessionModule}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tagStyle)}>
              {insights.sessionTag}
            </Badge>
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{(session.session_type ?? '').replace(/_/g, ' ')}</span>
            <span>·</span>
            <span>{new Date(session.session_date).toLocaleDateString()}</span>
            {grade != null && (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-xs">
                  {getGradeLabel(grade)} ({Math.round(grade)})
                </Badge>
              </>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-3">
          {/* Win */}
          {insights.win && (
            <div className="flex items-start gap-2">
              <Trophy className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">{insights.win}</p>
            </div>
          )}

          {/* Focus */}
          {insights.focus && (
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm">{insights.focus}</p>
            </div>
          )}

          {/* Next Rep Cue */}
          {insights.nextRepCue && (
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground italic">{insights.nextRepCue}</p>
            </div>
          )}

          {/* Key Metrics */}
          {insights.keyMetrics.length > 0 && (
            <div className="flex gap-4 mt-2">
              {insights.keyMetrics.map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className={cn('text-sm font-bold', colorMap[m.color])}>{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Drill Blocks Summary */}
          {drillBlocks.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Drill Blocks</p>
                <div className="space-y-1">
                  {drillBlocks.map((block: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{(block.drill_type || block.drill_name || 'Block').replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{block.volume} reps · {block.execution_grade}/80</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {session.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
              </div>
            </>
          )}

          {/* Videos */}
          <SessionVideosDisplay sessionId={session.id} />

          {!insights.win && !insights.focus && !session.notes && Object.keys(composites).length === 0 && (
            <p className="text-sm text-muted-foreground italic">No detailed data recorded for this session.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
