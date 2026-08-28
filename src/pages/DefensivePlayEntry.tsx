/**
 * Evaluator-facing defensive play entry (pre-release, staff-gated route).
 * Role gate matches Combine entry: active scout or coach only.
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  deriveDefensivePlayMetrics,
  useAthleteAtBats,
  useAthleteDefensivePlays,
  useRecordDefensivePlay,
} from '@/hooks/useDefensivePlays';
import { DefensivePlayList, beatenRunnerSentence } from '@/components/defense/DefensivePlayList';
import { POSITION_ORDER, positionLabel } from '@/lib/drills/positionLabels';
import type { BatterHandedness } from '@/lib/defense/beatenRunnerGrade';
import { Loader2, Shield, ShieldAlert } from 'lucide-react';

const OUTCOMES = [
  'out',
  'caught',
  'assist',
  'double_play',
  'hit',
  'error',
  'no_play',
] as const;

const LANDING_ZONES = [
  'infield_left',
  'infield_middle',
  'infield_right',
  'shallow_of',
  'left_field_gap',
  'center_field',
  'right_field_gap',
  'foul_territory',
] as const;

const NONE = '__none__';

export default function DefensivePlayEntry() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canSendActivities, isScout, isCoach, loading: accessLoading } = useScoutAccess();
  const { toast } = useToast();

  const athleteId = searchParams.get('athleteId') ?? '';
  const [athleteInput, setAthleteInput] = useState(athleteId);

  const [atBatId, setAtBatId] = useState<string>(NONE);
  const [position, setPosition] = useState<string>('SS');
  const [zone, setZone] = useState<string>('infield_middle');
  const [zoneNote, setZoneNote] = useState('');
  const [distance, setDistance] = useState('');
  const [hangTime, setHangTime] = useState('');
  const [playTime, setPlayTime] = useState('');
  const [outcome, setOutcome] = useState<string>('out');
  const [batterHand, setBatterHand] = useState<BatterHandedness>('R');

  const { options: atBats, loading: atBatsLoading } = useAthleteAtBats(athleteId);
  const { rows, loading: rowsLoading, reload } = useAthleteDefensivePlays(athleteId);
  const { record, saving, scaleRows } = useRecordDefensivePlay();

  const parsed = {
    distanceToCoverFt: distance.trim() === '' ? null : Number(distance),
    hangTimeSec: hangTime.trim() === '' ? null : Number(hangTime),
    totalPlayTimeSec: playTime.trim() === '' ? null : Number(playTime),
  };

  const preview = useMemo(
    () =>
      deriveDefensivePlayMetrics(
        {
          hangTimeSec: parsed.hangTimeSec,
          distanceToCoverFt: parsed.distanceToCoverFt,
          totalPlayTimeSec: parsed.totalPlayTimeSec,
          outcome,
          batterHand,
        },
        scaleRows,
      ),
    [parsed.hangTimeSec, parsed.distanceToCoverFt, parsed.totalPlayTimeSec, outcome, batterHand, scaleRows],
  );

  const handleSave = async () => {
    try {
      await record({
        athleteId,
        atBatId: atBatId === NONE ? null : atBatId,
        fielderId: athleteId,
        fielderPosition: position,
        ballLandingLocation: { zone, note: zoneNote.trim() || undefined },
        distanceToCoverFt: parsed.distanceToCoverFt,
        hangTimeSec: parsed.hangTimeSec,
        totalPlayTimeSec: parsed.totalPlayTimeSec,
        outcome,
        batterHand,
      });
      toast({
        title: 'Defensive play logged',
        description: 'Saved as evaluator-entered.',
      });
      setDistance('');
      setHangTime('');
      setPlayTime('');
      setZoneNote('');
      setAtBatId(NONE);
      reload();
    } catch (e) {
      toast({
        title: 'Could not log play',
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
              Defensive plays can only be logged by an active scout or coach.
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
            <Shield className="h-6 w-6 text-primary" /> Defensive Play Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Manual play logging for {isScout ? 'scouts' : ''}
            {isScout && isCoach ? ' and ' : ''}
            {isCoach ? 'coaches' : ''}. Every play recorded here is marked evaluator-entered —
            camera-measured plays will only ever come from the video pipeline.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Athlete</CardTitle>
            <CardDescription>Paste the athlete ID whose defense you are logging.</CardDescription>
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
                <CardTitle className="text-base">The play</CardTitle>
                <CardDescription>
                  Leave anything you did not measure blank — a missing input stays missing rather
                  than being estimated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Linked at-bat</Label>
                    <Select value={atBatId} onValueChange={setAtBatId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Not linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not linked to an at-bat</SelectItem>
                        {atBats.map((ab) => (
                          <SelectItem key={ab.id} value={ab.id}>
                            {ab.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {atBatsLoading && (
                      <p className="text-xs text-muted-foreground">Loading at-bats…</p>
                    )}
                    {!atBatsLoading && atBats.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No at-bats visible for this athlete — the play can still be logged unlinked.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Fielder position at contact</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_ORDER.map((p) => (
                          <SelectItem key={p} value={p}>
                            {positionLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Where the ball landed</Label>
                    <Select value={zone} onValueChange={setZone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANDING_ZONES.map((z) => (
                          <SelectItem key={z} value={z} className="capitalize">
                            {z.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zone-note">Landing note (optional)</Label>
                    <Input
                      id="zone-note"
                      value={zoneNote}
                      onChange={(e) => setZoneNote(e.target.value)}
                      placeholder="e.g. just inside the line"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="distance">Ground to cover (ft)</Label>
                    <Input
                      id="distance"
                      inputMode="decimal"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder="e.g. 45"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="hang-time">Hang time (s)</Label>
                    <Input
                      id="hang-time"
                      inputMode="decimal"
                      value={hangTime}
                      onChange={(e) => setHangTime(e.target.value)}
                      placeholder="e.g. 3.4"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="play-time">Total play time (s)</Label>
                    <Input
                      id="play-time"
                      inputMode="decimal"
                      value={playTime}
                      onChange={(e) => setPlayTime(e.target.value)}
                      placeholder="contact → out recorded, e.g. 4.15"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Batter-runner handedness</Label>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label>Outcome</Label>
                    <Select value={outcome} onValueChange={setOutcome}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((o) => (
                          <SelectItem key={o} value={o} className="capitalize">
                            {o.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <p className="font-medium">{beatenRunnerSentence(preview.beatenRunnerGrade)}</p>
                  <p className="text-muted-foreground text-xs">
                    Catch probability:{' '}
                    {preview.catchProbability == null
                      ? 'not measurable'
                      : `${Math.round(preview.catchProbability * 100)}%`}
                    {' · '}Outs above expected:{' '}
                    {preview.oaeCredit == null
                      ? 'not measurable'
                      : `${preview.oaeCredit > 0 ? '+' : ''}${preview.oaeCredit.toFixed(2)}`}
                  </p>
                  {preview.missingReason && (
                    <p className="text-xs text-muted-foreground">
                      Missing: {preview.missingReason.split(',').join(', ').replace(/_/g, ' ')}
                    </p>
                  )}
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log defensive play
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logged plays for this athlete</CardTitle>
              </CardHeader>
              <CardContent>
                <DefensivePlayList rows={rows} loading={rowsLoading} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
