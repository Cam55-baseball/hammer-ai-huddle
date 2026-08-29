/**
 * Aggregated 20–80 defense grade for one athlete.
 *
 * Display only — this reads the plays already loaded for the list and runs the
 * tested `aggregateDefenseGrade` function. Nothing is written back to
 * `vault_scout_grades`. Missing stays missing.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge } from 'lucide-react';
import { aggregateDefenseGrade } from '@/lib/defense/defenseGradeAggregate';
import type { DefensivePlayRow } from '@/hooks/useDefensivePlays';

const MISSING_COPY: Record<string, string> = {
  no_reps: 'No defensive plays have been logged about you yet.',
  no_graded_reps:
    'Plays are logged, but none of them carried a measurable runner grade yet — so there is no defense grade to show.',
};

export function DefenseGradeCard({
  rows,
  loading,
}: {
  rows: DefensivePlayRow[];
  loading?: boolean;
}) {
  const result = aggregateDefenseGrade(rows);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" /> Defense grade
        </CardTitle>
        <CardDescription>
          Your recorded plays rolled into one 20–80 grade, weighted toward recent reps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your plays…</p>
        ) : result.missing ? (
          <p className="text-sm text-muted-foreground">
            {MISSING_COPY[result.missing_reason] ?? 'Not measurable yet.'}
          </p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold tabular-nums">{result.grade}</span>
            <Badge variant="secondary">{result.label}</Badge>
            <span className="text-xs text-muted-foreground">
              from {result.repsUsed} graded {result.repsUsed === 1 ? 'rep' : 'reps'}
              {result.repsTotal > result.repsUsed
                ? ` (${result.repsTotal - result.repsUsed} not measurable)`
                : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
