import { useState } from 'react';
import { useDaySessions } from '@/hooks/useDaySessions';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target } from 'lucide-react';
import { getGradeLabel } from '@/lib/gradeLabel';
import { generateInsights } from '@/lib/sessionInsights';
import { SessionDetailDialog } from './SessionDetailDialog';
import { cn } from '@/lib/utils';

interface DaySessionsListProps {
  date: string; // YYYY-MM-DD
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

export function DaySessionsList({ date }: DaySessionsListProps) {
  const { data: sessions, isLoading } = useDaySessions(date);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) return null;

  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
          <Target className="h-3.5 w-3.5" />
          <span>Practice Sessions ({sessions.length})</span>
        </div>
        <div className="space-y-2">
          {sessions.map((s: any) => {
            const grade = s.effective_grade;
            const drillBlocks = (s.drill_blocks as any[] | null) ?? [];
            const composites = (s.composite_indexes as Record<string, number> | null) ?? {};
            const sessionModule = s.module || 'hitting';
            const insights = generateInsights(composites, drillBlocks, sessionModule, {
              sessionDate: s.session_date,
              sessionType: s.session_type ?? undefined,
            });
            const tagStyle = TAG_STYLES[insights.sessionTag] ?? TAG_STYLES['Solid Work'];

            return (
              <div
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded-full bg-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize truncate">
                        {sessionModule}
                      </p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tagStyle)}>
                        {insights.sessionTag}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {(s.session_type ?? '').replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                {grade != null && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {getGradeLabel(grade)} ({Math.round(grade)})
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <SessionDetailDialog
        open={!!selectedSessionId}
        onOpenChange={(open) => { if (!open) setSelectedSessionId(null); }}
        session={selectedSession ?? null}
      />
    </>
  );
}
