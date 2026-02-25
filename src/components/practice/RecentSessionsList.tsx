import { useRecentSessions } from '@/hooks/useRecentSessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGradeLabel } from '@/lib/gradeLabel';
import { Clock, Loader2 } from 'lucide-react';

interface RecentSessionsListProps {
  sport: string;
  moduleLabel: string;
}

export function RecentSessionsList({ sport, moduleLabel }: RecentSessionsListProps) {
  const { data: sessions, isLoading } = useRecentSessions(sport);

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
              const reps = (s.drill_blocks as any[] | null)?.reduce((sum: number, b: any) => sum + (b.volume || 0), 0) ?? 0;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium capitalize">
                      {(s.session_type ?? '').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.session_date).toLocaleDateString()} · {reps} reps
                      {s.module && <span className="ml-1 opacity-70">· {s.module}</span>}
                    </p>
                  </div>
                  {grade != null && (
                    <Badge variant="outline" className="text-xs">
                      {getGradeLabel(grade)} ({Math.round(grade)})
                    </Badge>
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
