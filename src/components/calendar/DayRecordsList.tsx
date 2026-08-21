/**
 * "What happened" — every non-practice record dated on a given calendar day.
 * Practices are rendered separately by DaySessionsList.
 */
import { Link } from 'react-router-dom';
import { FileText, Film, LineChart, Loader2, Trophy, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDayRecords, type DayRecord } from '@/hooks/useHistoryRecords';

const ICONS: Record<DayRecord['kind'], React.ReactNode> = {
  game: <Trophy className="h-4 w-4 text-primary" />,
  report: <FileText className="h-4 w-4 text-primary" />,
  recap: <LineChart className="h-4 w-4 text-primary" />,
  video: <Film className="h-4 w-4 text-primary" />,
};

export function DayRecordsList({ date }: { date: string }) {
  const { data, isLoading } = useDayRecords(date);

  if (isLoading) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        <span>What happened ({data.length})</span>
      </div>
      <div className="space-y-2">
        {data.map((r) => (
          <Link
            key={`${r.kind}-${r.id}`}
            to={r.href}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/30"
          >
            <div className="flex min-w-0 items-center gap-2">
              {ICONS[r.kind]}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                {r.detail && (
                  <p className="truncate text-xs capitalize text-muted-foreground">{r.detail}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="flex-shrink-0 text-[10px] capitalize">
              {r.kind}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
