import { useState } from 'react';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getGradeLabel } from '@/lib/gradeLabel';
import { Clock, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionVideosDisplay } from './SessionVideosDisplay';

interface RecentSessionsListProps {
  sport: string;
  moduleLabel: string;
  module?: string;
}

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
              const reps = drillBlocks.reduce((sum: number, b: any) => sum + (b.volume || 0), 0);
              const isOpen = expandedId === s.id;
              const compositeIndexes = s.composite_indexes as Record<string, any> | null;

              return (
                <Collapsible key={s.id} open={isOpen} onOpenChange={(open) => setExpandedId(open ? s.id : null)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-medium capitalize">
                            {(s.session_type ?? '').replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(s.session_date).toLocaleDateString()} · {reps} reps
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
                      {/* Drill blocks */}
                      {drillBlocks.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Drills</p>
                          {drillBlocks.map((block: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="capitalize">{(block.drill_name || block.label || `Drill ${i + 1}`).replace(/_/g, ' ')}</span>
                              <span className="text-muted-foreground">{block.volume || 0} reps</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Composite indexes with labels */}
                      {compositeIndexes && Object.keys(compositeIndexes).length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Performance Indexes</p>
                          {Object.entries(compositeIndexes).map(([key, val]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            const numVal = typeof val === 'number' ? val : parseFloat(String(val));
                            const isElite = !isNaN(numVal) && numVal >= 75;
                            const isAboveAvg = !isNaN(numVal) && numVal >= 50 && numVal < 75;
                            return (
                              <div key={key} className="flex items-center justify-between">
                                <span className="capitalize">{label}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground">{typeof val === 'number' ? val.toFixed(1) : String(val)}</span>
                                  {isElite && <span className="text-[9px] font-bold text-green-500 bg-green-500/10 px-1 rounded">Elite</span>}
                                  {isAboveAvg && <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1 rounded">Above Avg</span>}
                                </div>
                              </div>
                            );
                          })}
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

                      {drillBlocks.length === 0 && !s.notes && (!compositeIndexes || Object.keys(compositeIndexes).length === 0) && (
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
