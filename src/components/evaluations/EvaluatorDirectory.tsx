import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserSearch } from 'lucide-react';
import { useAthleteEvaluators, useAthleteEvaluations } from '@/hooks/useEvaluations';
import { EvaluationReportCard } from './EvaluationReportCard';
import { formatCredentials, formatAttribution } from '@/lib/evaluation/evaluatorCredentials';

/**
 * "Who evaluated this player?" — a lookupable directory of every evaluator with
 * a confirmed official report on the athlete. Selecting an evaluator opens their
 * full report(s). Official grades are never anonymous.
 */
export function EvaluatorDirectory({
  athleteId,
  title = 'Who evaluated this player',
}: {
  athleteId: string | undefined;
  title?: string;
}) {
  const { data: evaluators = [], isLoading } = useAthleteEvaluators(athleteId);
  const { data: reports = [] } = useAthleteEvaluations(athleteId);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!selected && evaluators.length > 0) setSelected(evaluators[0].evaluator_id);
  }, [evaluators, selected]);

  const active = evaluators.find((e) => e.evaluator_id === selected);
  const activeReports = reports.filter((r) => r.evaluator_id === selected);


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserSearch className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>
            Every official grade is attributed. Pick an evaluator to open their full report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading evaluators…
            </div>
          ) : evaluators.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No confirmed official evaluations yet.
            </p>
          ) : (
            <>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="h-10" aria-label="Select an evaluator">
                  <SelectValue placeholder="Select an evaluator" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {evaluators.map((e) => (
                    <SelectItem key={e.evaluator_id} value={e.evaluator_id}>
                      {formatAttribution(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {active && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{active.evaluator_name}</span>
                  {active.evaluator_title && (
                    <Badge variant="secondary">{active.evaluator_title}</Badge>
                  )}
                  {active.evaluator_role && (
                    <Badge variant="secondary" className="capitalize">{active.evaluator_role}</Badge>
                  )}
                  {active.evaluator_organization && (
                    <Badge variant="outline">{active.evaluator_organization}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {active.report_count} report{active.report_count === 1 ? '' : 's'} · last{' '}
                    {new Date(active.latest_graded_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {activeReports.map((r) => (
        <EvaluationReportCard
          key={r.id}
          report={r}
          attribution={active ? formatAttribution(active) : undefined}
        />
      ))}
    </div>
  );
}
