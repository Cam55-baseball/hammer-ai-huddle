import { useState } from 'react';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getGradeLabel } from '@/lib/gradeLabel';
import { generateInsights, getTotalReps } from '@/lib/sessionInsights';
import { Clock, Loader2, ChevronDown, ChevronRight, Trophy, Target, ArrowRight } from 'lucide-react';
import { SessionVideosDisplay } from './SessionVideosDisplay';
import { cn } from '@/lib/utils';

interface RecentSessionsListProps {
  sport: string;
  moduleLabel: string;
  module?: string;
}

const TAG_STYLES: Record<string, string> = {
  'Elite Execution': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Power Day': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Solid Work': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Building': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Chase Spike': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Contact Issues': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Grind Session': 'bg-muted text-muted-foreground border-border',
};

const colorMap = {
  green: 'text-green-500',
  amber: 'text-amber-500',
  red: 'text-red-500',
};

export function RecentSessionsList({ sport, moduleLabel, module }: RecentSessionsListProps) {
  const { data: sessions, isLoading } = useRecentSessions(sport, module);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent {moduleLabel} Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No sessions logged yet. Start your first session above!
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s: any) => {
              const grade = s.effective_grade;
              const drillBlocks = (s.drill_blocks as any[] | null) ?? [];
              const composites = (s.composite_indexes as Record<string, number> | null) ?? {};
              const sessionModule = s.module || module || 'hitting';
              const insights = generateInsights(composites, drillBlocks, sessionModule, {
                sessionDate: s.session_date,
                sessionType: s.session_type ?? undefined,
              });
              const isOpen = expandedId === s.id;
              const tagStyle = TAG_STYLES[insights.sessionTag] ?? TAG_STYLES['Solid Work'];

              return (
                <Collapsible key={s.id} open={isOpen} onOpenChange={(open) => setExpandedId(open ? s.id : null)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium capitalize">
                              {(s.session_type ?? '').replace(/_/g, ' ')}
                            </p>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tagStyle)}>
                              {insights.sessionTag}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.session_date).toLocaleDateString()}
                            {s.module && <span className="ml-1 opacity-70">· {s.module}</span>}
                          </p>
                        </div>
                      </div>
                      {grade != null && (
                        <Badge variant="outline" className="text-xs">
                          {getGradeLabel(grade)} ({Math.round(grade)})
                        </Badge>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 mb-2 space-y-2 text-xs border-l-2 border-primary/20 pl-3">
                      {/* Win */}
                      {insights.win && (
                        <div className="flex items-start gap-2">
                          <Trophy className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <p className="text-sm">{insights.win}</p>
                        </div>
                      )}

                      {/* Focus */}
                      {insights.focus && (
                        <div className="flex items-start gap-2">
                          <Target className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm">{insights.focus}</p>
                        </div>
                      )}

                      {/* Next Rep Cue */}
                      {insights.nextRepCue && (
                        <div className="flex items-start gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground italic">{insights.nextRepCue}</p>
                        </div>
                      )}

                      {/* Key Metrics */}
                      {insights.keyMetrics.length > 0 && (
                        <div className="flex gap-3 mt-1">
                          {insights.keyMetrics.map((m) => (
                            <div key={m.label} className="text-center">
                              <p className="text-[10px] text-muted-foreground">{m.label}</p>
                              <p className={cn('text-sm font-bold', colorMap[m.color])}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {s.notes && (
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Notes</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{s.notes}</p>
                        </div>
                      )}

                      {/* Session Videos */}
                      {isOpen && <SessionVideosDisplay sessionId={s.id} />}

                      {!insights.win && !insights.focus && !s.notes && Object.keys(composites).length === 0 && (
                        <p className="text-muted-foreground italic">No detailed data recorded for this session.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
