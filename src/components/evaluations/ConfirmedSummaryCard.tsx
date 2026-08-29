import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import { summarizeConfirmedEvaluations } from '@/lib/evaluation/confirmedSummary';

/**
 * Running average across every CONFIRMED evaluation. Pending and rejected
 * reports never count. Position-bound Defense/Arm live in their own card.
 */
export function ConfirmedSummaryCard({ reports }: { reports: Record<string, unknown>[] }) {
  const summary = summarizeConfirmedEvaluations(reports as never);

  if (summary.confirmedCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Running average
          </CardTitle>
          <CardDescription>
            No confirmed evaluations yet. Once you confirm you attended an evaluation, it starts
            counting toward this summary.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Running average
            </CardTitle>
            <CardDescription>
              Based on {summary.confirmedCount} confirmed evaluation
              {summary.confirmedCount === 1 ? '' : 's'}. Each tool averages only the reports that
              graded it.
            </CardDescription>
          </div>
          {summary.overall != null && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold leading-none">{summary.overall}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg OFP</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {summary.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No individual tool grades were recorded on your confirmed reports yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_56px_56px_56px] gap-2 text-[11px] font-medium text-muted-foreground">
              <span>Tool</span>
              <span className="text-center">Present</span>
              <span className="text-center">Future</span>
              <span className="text-center">Looks</span>
            </div>
            <Separator />
            {summary.rows.map((r) => (
              <div
                key={r.key}
                className="grid grid-cols-[1fr_56px_56px_56px] gap-2 items-center text-sm"
              >
                <span className="truncate">{r.label}</span>
                <span className="text-center font-semibold">{r.present ?? '—'}</span>
                <span className="text-center text-muted-foreground">{r.future ?? '—'}</span>
                <span className="text-center text-muted-foreground">{r.looks}</span>
              </div>
            ))}
            <Badge variant="outline" className="mt-2">
              Confirmed reports only
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}
