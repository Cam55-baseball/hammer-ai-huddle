/**
 * Evaluator-facing throwing rep entry (pre-release, staff-gated route).
 * Position context is load-bearing: an outfield throw and an infield throw
 * are not the same measurement, so it is recorded on every row.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { useToast } from '@/hooks/use-toast';
import {
  useAthleteThrowingReps,
  useRecordThrowingRep,
  useThrowingScaleRows,
} from '@/hooks/useThrowingReps';
import { computeThrowVeloGrade } from '@/lib/throwing/throwVeloGrade';
import {
  THROWING_CONTEXT_LABELS,
  THROWING_METRICS,
  THROWING_METRIC_LABELS,
  THROWING_POSITION_CONTEXTS,
  defaultUnitFor,
  type ThrowingMetric,
  type ThrowingPositionContext,
} from '@/lib/throwing/reps';
import { Loader2, ShieldAlert, Send } from 'lucide-react';

export default function ThrowingRepEntry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canSendActivities, loading: accessLoading } = useScoutAccess();
  const { toast } = useToast();

  const athleteId = searchParams.get('athleteId') ?? '';
  const [athleteInput, setAthleteInput] = useState(athleteId);
  const [positionContext, setPositionContext] =
    useState<ThrowingPositionContext>('infield');
  const [metric, setMetric] = useState<ThrowingMetric>('throw_velo_mph');
  const [value, setValue] = useState('');

  const { rows, loading: rowsLoading, reload } = useAthleteThrowingReps(athleteId);
  const { record, saving } = useRecordThrowingRep();
  const { rows: scaleRows } = useThrowingScaleRows();

  const parsed = value.trim() === '' ? null : Number(value);

  const handleSave = async () => {
    try {
      await record({
        athleteId,
        positionContext,
        metric,
        value: parsed != null && Number.isFinite(parsed) ? parsed : null,
      });
      toast({ title: 'Throwing rep logged', description: 'Saved as evaluator-entered.' });
      setValue('');
      reload();
    } catch (e) {
      toast({
        title: 'Could not log rep',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    }
  };

  if (accessLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canSendActivities) {
    return (
      <DashboardLayout>
        <Card className="max-w-xl mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Evaluator access required
            </CardTitle>
            <CardDescription>
              Throwing reps can only be logged by an active scout or coach.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6 text-primary" /> Throwing Rep Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Throwing is its own domain, not pitching minus a few tiles — every rep carries the
            position context it was thrown from.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Athlete</CardTitle>
            <CardDescription>Paste the athlete ID you are evaluating.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="athlete-id">Athlete ID</Label>
              <Input
                id="athlete-id"
                value={athleteInput}
                onChange={(e) => setAthleteInput(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setSearchParams(athleteInput ? { athleteId: athleteInput.trim() } : {})}
            >
              Load athlete
            </Button>
          </CardContent>
        </Card>

        {athleteId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">The rep</CardTitle>
                <CardDescription>
                  Leave the value blank if you did not measure it cleanly — a missing rep stays
                  missing rather than being estimated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Position context</Label>
                    <Select
                      value={positionContext}
                      onValueChange={(v) => setPositionContext(v as ThrowingPositionContext)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THROWING_POSITION_CONTEXTS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {THROWING_CONTEXT_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Metric</Label>
                    <Select value={metric} onValueChange={(v) => setMetric(v as ThrowingMetric)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THROWING_METRICS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {THROWING_METRIC_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rep-value">Value ({defaultUnitFor(metric)})</Label>
                    <Input
                      id="rep-value"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={metric === 'throw_velo_mph' ? '84' : ''}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Log rep
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reps on file</CardTitle>
                <CardDescription>Newest first.</CardDescription>
              </CardHeader>
              <CardContent>
                {rowsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading reps…
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No throwing reps recorded for this athlete yet.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {rows.map((row) => {
                      const graded = computeThrowVeloGrade(
                        row.metric,
                        row.position_context,
                        row.value,
                        scaleRows,
                      );
                      return (
                      <li key={row.id} className="py-3 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {THROWING_METRIC_LABELS[row.metric] ?? row.metric}
                          </span>
                          <Badge variant="outline">
                            {THROWING_CONTEXT_LABELS[row.position_context] ??
                              row.position_context}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {row.value == null
                              ? 'not recorded'
                              : `${row.value} ${row.unit ?? ''}`.trim()}
                          </span>
                          <Badge variant="secondary">Evaluator entered</Badge>
                        </div>
                        {graded && !graded.missing && (
                          <p className="text-sm">
                            <span className="font-semibold">{graded.grade}</span> on the 20–80
                            scale for a {THROWING_CONTEXT_LABELS[row.position_context] ??
                              row.position_context}{' '}
                            throw.
                          </p>
                        )}
                        {graded && graded.missing && (
                          <p className="text-xs text-muted-foreground">
                            Not graded ({graded.missing_reason.replace(/_/g, ' ')}).
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </p>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
