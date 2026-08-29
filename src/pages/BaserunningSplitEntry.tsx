/**
 * Evaluator-facing baserunning split entry (pre-release, staff-gated route).
 * Role gate matches Combine / Defensive Play entry: active scout or coach.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useAthleteBaserunningSplits,
  useRecordBaserunningSplit,
} from '@/hooks/useBaserunningSplits';
import {
  BASERUNNING_SPLIT_EVENTS,
  defaultUnitFor,
  requiresBatterHand,
  type BaserunningSplitEvent,
} from '@/lib/baserunning/splits';
import {
  BaserunningSplitList,
  splitLabel,
} from '@/components/baserunning/BaserunningSplitList';
import type { BatterHandedness } from '@/lib/defense/beatenRunnerGrade';
import { Loader2, ShieldAlert, Timer } from 'lucide-react';

export default function BaserunningSplitEntry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canSendActivities, loading: accessLoading } = useScoutAccess();
  const { toast } = useToast();

  const athleteId = searchParams.get('athleteId') ?? '';
  const [athleteInput, setAthleteInput] = useState(athleteId);

  const [event, setEvent] = useState<BaserunningSplitEvent>('home_to_first');
  const [value, setValue] = useState('');
  const [batterHand, setBatterHand] = useState<BatterHandedness>('R');

  const { rows, loading: rowsLoading, reload } = useAthleteBaserunningSplits(athleteId);
  const { record, saving, scaleRows } = useRecordBaserunningSplit();

  const parsedValue = value.trim() === '' ? null : Number(value);

  const handleSave = async () => {
    try {
      await record({
        athleteId,
        event,
        value: parsedValue != null && Number.isFinite(parsedValue) ? parsedValue : null,
        batterHand: requiresBatterHand(event) ? batterHand : null,
      });
      toast({ title: 'Split logged', description: 'Saved as evaluator-entered.' });
      setValue('');
      reload();
    } catch (e) {
      toast({
        title: 'Could not log split',
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
              Baserunning splits can only be logged by an active scout or coach.
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
            <Timer className="h-6 w-6 text-primary" /> Baserunning Split Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Stopwatch splits are always recorded as evaluator-entered — camera-measured splits
            will only ever come from the video pipeline.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Athlete</CardTitle>
            <CardDescription>Paste the athlete ID you are timing.</CardDescription>
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
                <CardTitle className="text-base">The split</CardTitle>
                <CardDescription>
                  Leave the value blank if you did not get a clean time — a missing split stays
                  missing rather than being estimated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Event</Label>
                    <Select
                      value={event}
                      onValueChange={(v) => setEvent(v as BaserunningSplitEvent)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BASERUNNING_SPLIT_EVENTS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {splitLabel(e)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="split-value">Value ({defaultUnitFor(event)})</Label>
                    <Input
                      id="split-value"
                      inputMode="decimal"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={defaultUnitFor(event) === 'sec' ? '4.21' : '12'}
                    />
                  </div>

                  {requiresBatterHand(event) && (
                    <div className="space-y-1.5">
                      <Label>Batter-runner side</Label>
                      <Select
                        value={batterHand}
                        onValueChange={(v) => setBatterHand(v as BatterHandedness)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="R">Right-handed</SelectItem>
                          <SelectItem value="L">Left-handed</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Required — home-to-first is graded against side-specific anchors.
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Log split
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Splits on file</CardTitle>
                <CardDescription>Newest first.</CardDescription>
              </CardHeader>
              <CardContent>
                <BaserunningSplitList
                  rows={rows}
                  scaleRows={scaleRows}
                  loading={rowsLoading}
                  emptyLabel="No splits recorded for this athlete yet."
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
