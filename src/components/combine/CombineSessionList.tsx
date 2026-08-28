/**
 * Athlete-facing read-only combine history.
 * Same structure as DefensivePlayList: one card per session, scannable
 * rows inside, provenance stated on every measurement.
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, ClipboardList, Loader2, Timer } from 'lucide-react';
import type { CombineResultRow } from '@/hooks/useEvaluatorCombine';
import type { CombineSessionGroup } from '@/hooks/useMyCombineResults';
import { combineEventMeta } from '@/lib/combine/sportEvents';
import { isCombineEvent } from '@/lib/combine/events';

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

function eventLabel(event: string): { label: string; unit: string | null } {
  if (isCombineEvent(event)) {
    const meta = combineEventMeta(event);
    return { label: meta.label, unit: meta.unit };
  }
  return { label: event.replace(/_/g, ' '), unit: null };
}

function ResultRows({ results }: { results: CombineResultRow[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded in this session.</p>;
  }
  return (
    <ul className="divide-y">
      {results.map((r) => {
        const meta = eventLabel(r.event);
        return (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="flex items-center gap-3">
              <span className="text-sm tabular-nums">
                {r.value == null ? '—' : `${r.value}${r.unit ?? meta.unit ?? ''}`}
              </span>
              <SourceBadge source={r.source} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function CombineSessionList({
  groups,
  orphanResults = [],
  loading,
  emptyLabel = 'No combine sessions recorded yet.',
}: {
  groups: CombineSessionGroup[];
  orphanResults?: CombineResultRow[];
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

  if (groups.length === 0 && orphanResults.length === 0) {
    return <p className="text-sm text-muted-foreground py-6">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map(({ session, results }) => (
        <Card key={session.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                {new Date(session.completed_at ?? session.created_at).toLocaleDateString()}
              </CardTitle>
              {session.sport && (
                <Badge variant="secondary" className="capitalize">
                  {session.sport}
                </Badge>
              )}
            </div>
            <CardDescription>
              {results.length} event{results.length === 1 ? '' : 's'}
              {session.tier_at_time ? ` · tier at time: ${session.tier_at_time}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResultRows results={results} />
          </CardContent>
        </Card>
      ))}

      {orphanResults.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Results without a readable session</CardTitle>
            <CardDescription>
              These measurements exist, but their session record isn&apos;t available to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResultRows results={orphanResults} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
