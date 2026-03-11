import { useState } from 'react';
import { useRecentSessions } from '@/hooks/useRecentSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGradeLabel } from '@/lib/gradeLabel';
import { Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface RecentSessionsListProps {
  sport: string;
  moduleLabel: string;
  module?: string;
}

export function RecentSessionsList({ sport, moduleLabel, module }: RecentSessionsListProps) {
  const { data: sessions, isLoading } = useRecentSessions(sport, module);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

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
              const blocks = s.drill_blocks as any[] | null;
              const reps = blocks?.reduce((sum: number, b: any) => sum + (b.volume || 0), 0) ?? 0;
              const isExpanded = expandedId === s.id;
              const composites = s.composite_indexes as Record<string, any> | null;

              return (
                <div key={s.id} className="rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors text-left"
                  >
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium capitalize">
                        {(s.session_type ?? '').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.session_date).toLocaleDateString()} · {reps} reps
                        {s.module && <span className="ml-1 opacity-70">· {s.module}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {grade != null && (
                        <Badge variant="outline" className="text-xs">
                          {getGradeLabel(grade)} ({Math.round(grade)})
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t space-y-2 text-xs">
                      {/* Drill blocks */}
                      {blocks && blocks.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground uppercase tracking-wide">Drills</p>
                          {blocks.map((b: any, i: number) => (
                            <div key={i} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                              <span className="capitalize">{(b.drill_name || b.type || `Block ${i + 1}`).replace(/_/g, ' ')}</span>
                              <span className="text-muted-foreground">{b.volume || 0} reps</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Composite indexes */}
                      {composites && Object.keys(composites).length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-muted-foreground uppercase tracking-wide">Indexes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(composites).map(([key, val]) => (
                              <Badge key={key} variant="secondary" className="text-[10px]">
                                {key.replace(/_/g, ' ')}: {typeof val === 'number' ? Math.round(val) : String(val)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {s.notes && (
                        <div>
                          <p className="font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                          <p className="text-foreground mt-0.5">{s.notes}</p>
                        </div>
                      )}

                      {!blocks?.length && !s.notes && !composites && (
                        <p className="text-muted-foreground italic">No detailed data recorded for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
