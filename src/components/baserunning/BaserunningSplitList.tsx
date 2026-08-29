/**
 * Shared split list — used by both the evaluator entry page and the athlete
 * results page so the two can never describe the same row differently.
 */
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  gradeForSplitRow,
  type BaserunningSplitRow,
} from '@/hooks/useBaserunningSplits';
import type { ScaleReferenceRow } from '@/lib/defense/beatenRunnerGrade';

export const SPLIT_LABELS: Record<string, string> = {
  home_to_first: 'Home to first',
  ten_yard_split: '10-yard split',
  thirty_yard_dash: '30-yard dash',
  sixty_yard_dash: '60-yard dash',
  lead_distance_primary: 'Primary lead',
  lead_distance_secondary: 'Secondary lead',
};

export function splitLabel(event: string): string {
  return SPLIT_LABELS[event] ?? event.replace(/_/g, ' ');
}

export function gradeSentence(grade: number): string {
  if (grade >= 70) return 'plus-plus runner speed on this split';
  if (grade >= 60) return 'plus runner speed on this split';
  if (grade >= 45) return 'around average runner speed on this split';
  return 'below average runner speed on this split';
}

interface Props {
  rows: readonly BaserunningSplitRow[];
  scaleRows: readonly ScaleReferenceRow[];
  loading?: boolean;
  emptyLabel?: string;
}

export function BaserunningSplitList({ rows, scaleRows, loading, emptyLabel }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading splits…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {emptyLabel ?? 'No splits recorded yet.'}
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const graded = gradeForSplitRow(row, scaleRows);
        return (
          <li key={row.id} className="py-3 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{splitLabel(row.event)}</span>
              <span className="text-sm text-muted-foreground">
                {row.value == null ? 'not recorded' : `${row.value} ${row.unit ?? ''}`.trim()}
              </span>
              {row.batter_hand && (
                <Badge variant="outline">{row.batter_hand}HH</Badge>
              )}
              <Badge variant={row.source === 'manual_entry' ? 'secondary' : 'default'}>
                {row.source === 'manual_entry' ? 'Evaluator entered' : 'Camera measured'}
              </Badge>
            </div>

            {graded && !graded.missing && (
              <p className="text-sm">
                <span className="font-semibold">{graded.grade}</span> on the 20–80 scale —{' '}
                {gradeSentence(graded.grade)}.
              </p>
            )}
            {graded && graded.missing && (
              <p className="text-xs text-muted-foreground">
                Not graded ({graded.missing_reason.replace(/_/g, ' ')}).
              </p>
            )}
            {!graded && row.event === 'home_to_first' && (
              <p className="text-xs text-muted-foreground">
                Not graded — batter-runner handedness was not recorded.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(row.created_at).toLocaleString()}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
