import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trophy, Target, ArrowRight, ChevronDown, FileText, Activity } from 'lucide-react';
import { getGradeLabel } from '@/lib/gradeLabel';
import { generateInsights } from '@/lib/sessionInsights';
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

interface DrillBlock {
  id?: string;
  drill_type?: string;
  drill_name?: string;
  intent?: string;
  volume?: number;
  execution_grade?: number;
  outcome_tags?: string[];
  micro_layer_data?: Array<{
    goal_of_rep?: string;
    actual_outcome?: string;
    rep_tags?: string[];
    [key: string]: any;
  }>;
}

interface PracticeSession {
  id: string;
  sport: string;
  session_type: string;
  session_date: string;
  module: string;
  drill_blocks: any;
  notes: string | null;
  composite_indexes: any;
  coach_grade: number | null;
  session_context: any;
  effective_grade?: number | null;
}

interface PracticeSessionDetailDialogProps {
  session: PracticeSession | null;
  open: boolean;
  onClose: () => void;
}

function computePerformanceScore(composites: Record<string, number> | null): { score: number; label: string; color: string } | null {
  if (!composites || Object.keys(composites).length === 0) return null;
  const values = Object.values(composites).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) return null;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const score = Math.round(avg);
  if (score >= 60) return { score, label: 'Elite', color: 'text-green-500' };
  if (score >= 40) return { score, label: 'Solid', color: 'text-amber-500' };
  return { score, label: 'Developing', color: 'text-red-500' };
}

function DrillBlockCard({ block, index }: { block: DrillBlock; index: number }) {
  const [open, setOpen] = useState(false);
  const name = (block.drill_type || block.drill_name || `Drill ${index + 1}`).replace(/_/g, ' ');
  const hasDetails = block.micro_layer_data && block.micro_layer_data.length > 0;
  const successPct = block.execution_grade != null ? `${block.execution_grade}%` : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
          <div className="flex items-center gap-2">
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180"
            )} />
            <span className="font-medium text-sm capitalize">{name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {block.volume != null && <span>{block.volume} reps</span>}
            {successPct && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {successPct}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2.5 pb-2 space-y-1.5 mt-1">
          {block.intent && (
            <p className="text-xs text-muted-foreground">
              Intent: <span className="capitalize">{block.intent.replace(/_/g, ' ')}</span>
            </p>
          )}
          {block.outcome_tags && block.outcome_tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {block.outcome_tags.map((tag, ti) => (
                <Badge key={ti} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {tag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}
          {hasDetails && (
            <div className="space-y-0.5 pt-1 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Rep Details</span>
              {block.micro_layer_data!.map((rep, ri) => (
                <div key={ri} className="text-xs flex items-center gap-2">
                  <span className="text-muted-foreground w-6 shrink-0">#{ri + 1}</span>
                  {rep.goal_of_rep && <span className="text-muted-foreground">{rep.goal_of_rep}</span>}
                  {rep.actual_outcome && <span>→ {rep.actual_outcome}</span>}
                  {rep.rep_tags && rep.rep_tags.map((rt, rti) => (
                    <Badge key={rti} variant="outline" className="text-[9px] px-1 py-0">{rt}</Badge>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PracticeSessionDetailDialog({ session, open, onClose }: PracticeSessionDetailDialogProps) {
  const { t } = useTranslation();

  if (!session) return null;

  const drillBlocks: DrillBlock[] = Array.isArray(session.drill_blocks) ? session.drill_blocks : [];
  const composites = (session.composite_indexes as Record<string, number> | null) ?? {};
  const sessionModule = session.module || 'hitting';
  const grade = session.effective_grade ?? session.coach_grade;

  const insights = generateInsights(composites, drillBlocks, sessionModule, {
    sessionDate: session.session_date,
    sessionType: session.session_type ?? undefined,
  });
  const tagStyle = TAG_STYLES[insights.sessionTag] ?? TAG_STYLES['Solid Work'];
  const perfScore = computePerformanceScore(Object.keys(composites).length > 0 ? composites : null);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
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

        <ScrollArea className="flex-1 px-5 pb-5">
          <div className="space-y-3 pt-3">
            <Separator />

            {/* Insights — Win / Focus / Cue */}
            {(insights.win || insights.focus || insights.nextRepCue) && (
              <div className="space-y-2">
                {insights.win && (
                  <div className="flex items-start gap-2">
                    <Trophy className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm">{insights.win}</p>
                  </div>
                )}
                {insights.focus && (
                  <div className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm">{insights.focus}</p>
                  </div>
                )}
                {insights.nextRepCue && (
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground italic">{insights.nextRepCue}</p>
                  </div>
                )}
              </div>
            )}

            {/* Key Metrics */}
            {insights.keyMetrics.length > 0 && (
              <div className="flex gap-4">
                {insights.keyMetrics.map((m) => (
                  <div key={m.label} className="text-center flex-1">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className={cn('text-sm font-bold', colorMap[m.color])}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Drill Blocks — Collapsible */}
            {drillBlocks.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    {t('playersClub.drillBlocks', 'Drill Blocks')} ({drillBlocks.length})
                  </h4>
                  {drillBlocks.map((block, i) => (
                    <DrillBlockCard key={block.id || i} block={block} index={i} />
                  ))}
                </div>
              </>
            )}

            {/* Performance Score */}
            {perfScore && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Performance Score</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-lg font-bold', perfScore.color)}>{perfScore.score}</span>
                    <Badge variant="outline" className={cn('text-[10px]', perfScore.color)}>
                      {perfScore.label}
                    </Badge>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {session.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {t('common.notes', 'Notes')}
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
                </div>
              </>
            )}

            {/* Fallback when no data */}
            {!insights.win && !insights.focus && !session.notes && drillBlocks.length === 0 && !perfScore && (
              <p className="text-sm text-muted-foreground italic">No detailed data recorded for this session.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
