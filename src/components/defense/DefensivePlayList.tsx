/**
 * Athlete-facing results view for logged defensive plays.
 * Shows raw inputs, the outcome, and the beat-the-runner result in plain
 * language. Missing values are shown as missing, never filled in.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, ClipboardList, Loader2, Shield } from 'lucide-react';
import type { DefensivePlayRow } from '@/hooks/useDefensivePlays';
import { positionShort } from '@/lib/drills/positionLabels';

function SourceBadge({ source }: { source: string | null }) {
  if (source === 'video_detected') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Camera className="h-3 w-3" /> Camera-measured
      </Badge>
    );
  }
  if (source === 'manual_entry') {
    return (
      <Badge variant="outline" className="gap-1">
        <ClipboardList className="h-3 w-3" /> Evaluator-entered
      </Badge>
    );
  }
  return <Badge variant="outline">Unknown source</Badge>;
}

function num(v: number | null, suffix = '', digits = 2) {
  return v == null ? '—' : `${Number(v).toFixed(digits)}${suffix}`;
}

function landingZone(loc: unknown): string {
  if (loc && typeof loc === 'object' && 'zone' in (loc as Record<string, unknown>)) {
    const z = (loc as { zone?: string; note?: string });
    return [z.zone, z.note].filter(Boolean).join(' — ');
  }
  return '—';
}

export function beatenRunnerSentence(grade: number | null): string {
  if (grade == null) return 'Runner grade not measurable from this entry.';
  return `This play beat a ${grade}-grade runner.`;
}

export function DefensivePlayList({
  rows,
  loading,
  emptyLabel = 'No defensive plays logged yet.',
}: {
  rows: DefensivePlayRow[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {positionShort(row.fielder_position) || 'Unlisted position'}
                {row.outcome && (
                  <Badge variant="secondary" className="capitalize">
                    {row.outcome.replace(/_/g, ' ')}
                  </Badge>
                )}
              </CardTitle>
              <SourceBadge source={row.source} />
            </div>
            <CardDescription>
              {new Date(row.created_at).toLocaleString()}
              {row.at_bat_id ? ' · linked to an at-bat' : ' · not linked to an at-bat'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{beatenRunnerSentence(row.beaten_runner_grade)}</p>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Ball landed</dt>
                <dd className="font-medium">{landingZone(row.ball_landing_location)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ground to cover</dt>
                <dd className="font-medium">{num(row.distance_to_cover, ' ft', 0)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hang time</dt>
                <dd className="font-medium">{num(row.hang_time_sec, ' s')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total play time</dt>
                <dd className="font-medium">{num(row.total_play_time_sec, ' s')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Catch probability</dt>
                <dd className="font-medium">
                  {row.catch_probability == null
                    ? '—'
                    : `${Math.round(row.catch_probability * 100)}%`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outs above expected</dt>
                <dd className="font-medium">
                  {row.oae_credit == null
                    ? '—'
                    : `${row.oae_credit > 0 ? '+' : ''}${row.oae_credit.toFixed(2)}`}
                </dd>
              </div>
            </dl>

            {row.missing_reason && (
              <p className="text-xs text-muted-foreground">
                Not measurable: {row.missing_reason.split(',').join(', ').replace(/_/g, ' ')}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
