import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';
import { summarizePositionGrades, type PositionGradeSource } from '@/lib/evaluation/positionGrades';

/**
 * Defense and Arm accumulated per position. Grades are never blended across
 * positions — a look at shortstop is a different evaluation than a look in
 * right field.
 */
export function PositionGradeSummaryCard({ reports }: { reports: PositionGradeSource[] }) {
  const summaries = summarizePositionGrades(reports);
  if (summaries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Defense &amp; Arm by position
        </CardTitle>
        <CardDescription>
          Averaged only within a position, across every confirmed look there.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-2 text-[11px] font-medium text-muted-foreground">
          <span>Position</span>
          <span className="text-center">Def</span>
          <span className="text-center">Def fut</span>
          <span className="text-center">Arm</span>
          <span className="text-center">Arm fut</span>
        </div>
        <Separator />
        {summaries.map((s) => (
          <div
            key={s.position}
            className="grid grid-cols-[1fr_56px_56px_56px_56px] gap-2 items-center text-sm"
          >
            <span className="truncate">
              {s.position}
              <span className="text-xs text-muted-foreground"> · {s.looks} look{s.looks === 1 ? '' : 's'}</span>
            </span>
            <span className="text-center font-semibold">{s.defensePresent ?? '—'}</span>
            <span className="text-center text-muted-foreground">{s.defenseFuture ?? '—'}</span>
            <span className="text-center font-semibold">{s.armPresent ?? '—'}</span>
            <span className="text-center text-muted-foreground">{s.armFuture ?? '—'}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
