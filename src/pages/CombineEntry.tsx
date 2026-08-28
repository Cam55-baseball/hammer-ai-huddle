import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { useToast } from '@/hooks/use-toast';
import {
  useAthleteCombineResults,
  useEvaluatorCombineContext,
  useRecordCombine,
  type CombineEntryInput,
} from '@/hooks/useEvaluatorCombine';
import { combineEventMeta, combineEventsForSport } from '@/lib/combine/sportEvents';
import { isCombineEventIncluded } from '@/lib/combine/tierGating';
import type { CombineEvent, CombineSport } from '@/lib/combine/events';
import { Camera, ClipboardList, Loader2, Lock, ShieldAlert, Timer } from 'lucide-react';

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

export default function CombineEntry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canSendActivities, isScout, isCoach, loading: accessLoading } = useScoutAccess();
  const { toast } = useToast();

  const athleteId = searchParams.get('athleteId') ?? '';
  const [athleteInput, setAthleteInput] = useState(athleteId);
  const [sport, setSport] = useState<CombineSport>('baseball');
  const [values, setValues] = useState<Record<string, string>>({});

  const { context, eligibility, loading: ctxLoading, error: ctxError, reload } =
    useEvaluatorCombineContext(athleteId, sport);
  const { rows, loading: resultsLoading, reload: reloadResults } = useAthleteCombineResults(athleteId);
  const { record, saving } = useRecordCombine();

  const tier = context?.tier ?? null;

  const events = useMemo(() => {
    return combineEventsForSport(sport).map((event) => ({
      meta: combineEventMeta(event),
      gate: isCombineEventIncluded(tier, event),
    }));
  }, [sport, tier]);

  const includedEvents = events.filter((e) => e.gate.included);
  const excludedEvents = events.filter((e) => !e.gate.included);

  const blocked = eligibility ? !eligibility.eligible : false;

  const handleSave = async () => {
    const entries: CombineEntryInput[] = includedEvents
      .map(({ meta }) => {
        const raw = values[meta.event];
        if (raw == null || raw.trim() === '') return null;
        const value = Number(raw);
        if (!Number.isFinite(value)) return null;
        return { event: meta.event as CombineEvent, value, unit: meta.unit };
      })
      .filter((e): e is CombineEntryInput => e !== null);

    if (entries.length === 0) {
      toast({
        title: 'Nothing to record',
        description: 'Enter at least one measured event before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await record(athleteId, sport, tier, entries);
      toast({
        title: 'Combine recorded',
        description: `${entries.length} event${entries.length === 1 ? '' : 's'} saved as evaluator-entered.`,
      });
      setValues({});
      reload();
      reloadResults();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const monthly = message.includes('combine_already_taken_this_month');
      toast({
        title: monthly ? 'Already used this month' : 'Could not record combine',
        description: monthly
          ? 'This athlete has already taken a combine for this sport in the current calendar month. One attempt per sport per month.'
          : message,
        variant: 'destructive',
      });
      reload();
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
              Combine paperwork can only be recorded by an active scout or coach.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" /> Combine Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Live-combine paperwork for {isScout ? 'scouts' : ''}
            {isScout && isCoach ? ' and ' : ''}
            {isCoach ? 'coaches' : ''}. Everything recorded here is marked evaluator-entered —
            camera-measured results only ever come from the athlete's own analysis.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Athlete &amp; sport</CardTitle>
            <CardDescription>Paste the athlete ID you are evaluating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
            </div>

            <Tabs value={sport} onValueChange={(v) => setSport(v as CombineSport)}>
              <TabsList>
                <TabsTrigger value="baseball">Baseball</TabsTrigger>
                <TabsTrigger value="softball">Softball</TabsTrigger>
              </TabsList>
            </Tabs>

            {athleteId && (
              <div className="text-sm text-muted-foreground space-y-1">
                {ctxLoading && <p>Loading athlete context…</p>}
                {ctxError && <p className="text-destructive">{ctxError}</p>}
                {context && (
                  <p>
                    <span className="font-medium text-foreground">
                      {context.athlete_name ?? 'Unnamed athlete'}
                    </span>
                    {' · '}profile sport: {context.athlete_sport ?? 'unset'}
                    {' · '}tier: {context.tier ?? 'none'}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {blocked && eligibility && !eligibility.eligible && (
          <Alert variant="destructive">
            <AlertTitle>Already used this month</AlertTitle>
            <AlertDescription>
              {eligibility.message}
              {eligibility.next_eligible_at && (
                <> Next eligible {new Date(eligibility.next_eligible_at).toLocaleDateString()}.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {athleteId && !ctxLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {sport === 'softball' ? 'Softball' : 'Baseball'} events
              </CardTitle>
              <CardDescription>
                Only events this athlete's tier includes can be recorded. Leave a field blank when
                it was not measured — a blank is missing, never a zero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {includedEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No combine events are included for tier &ldquo;{tier ?? 'none'}&rdquo;.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {includedEvents.map(({ meta }) => (
                  <div key={meta.event} className="space-y-1.5">
                    <Label htmlFor={meta.event}>
                      {meta.label} <span className="text-muted-foreground">({meta.unit})</span>
                    </Label>
                    <Input
                      id={meta.event}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      disabled={blocked}
                      value={values[meta.event] ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [meta.event]: e.target.value }))
                      }
                      placeholder="—"
                    />
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                ))}
              </div>

              {excludedEvents.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Not included for this tier
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {excludedEvents.map(({ meta }) => (
                        <Badge key={meta.event} variant="outline" className="text-muted-foreground">
                          {meta.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || blocked || includedEvents.length === 0}
                className="w-full sm:w-auto"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Record combine
              </Button>
            </CardContent>
          </Card>
        )}

        {athleteId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Combine history</CardTitle>
              <CardDescription>
                Evaluator-entered and camera-measured results, kept visibly distinct.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resultsLoading && <p className="text-sm text-muted-foreground">Loading results…</p>}
              {!resultsLoading && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">No combine results visible yet.</p>
              )}
              <div className="space-y-2">
                {rows.map((r) => {
                  const known = combineEventsForSport('baseball').includes(r.event as CombineEvent) ||
                    combineEventsForSport('softball').includes(r.event as CombineEvent);
                  const label = known ? combineEventMeta(r.event as CombineEvent).label : r.event;
                  return (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums">
                          {r.value == null ? '—' : `${r.value} ${r.unit ?? ''}`.trim()}
                        </span>
                        <SourceBadge source={r.source} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
