import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hittingSim, PitchType, ContactZone } from '@/demo/sims/hittingSim';
import { DemoLoopShell } from '@/components/demo/DemoLoopShell';
import { useDemoInteract } from '@/hooks/useDemoInteract';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedNumber } from '@/components/demo/viz/AnimatedNumber';
import { StrikeZoneDiagram } from '@/components/demo/viz/diagrams/StrikeZoneDiagram';
import { SwingArcDiagram } from '@/components/demo/viz/diagrams/SwingArcDiagram';

const PITCHES: PitchType[] = ['fastball', 'curveball', 'changeup', 'slider'];
const ZONES: ContactZone[] = ['inside', 'middle', 'outside'];

export default function HittingAnalysisDemo() {
  const { user } = useAuth();
  const [pitch, setPitch] = useState<PitchType>('fastball');
  const [zone, setZone] = useState<ContactZone>('middle');
  const result = hittingSim.run({ pitch, zone }, { userId: user?.id ?? null });
  const { bump } = useDemoInteract('hitting-analysis');

  const onPitch = (p: PitchType) => { setPitch(p); bump(); };
  const onZone = (z: ContactZone) => { setZone(z); bump(); };

  return (
    <DemoLoopShell
      fromSlug="hitting-analysis"
      simId="hitting"
      severity={result.benchmark.severity}
      gap={result.benchmark.gapMph}
      input={
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">Pitch type</p>
              <div className="flex flex-wrap gap-1.5">
                {PITCHES.map(p => (
                  <Button key={p} size="sm" variant={pitch === p ? 'default' : 'outline'}
                    onClick={() => onPitch(p)} className="capitalize">{p}</Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">Contact zone</p>
              <div className="flex gap-1.5">
                {ZONES.map(z => (
                  <Button key={z} size="sm" variant={zone === z ? 'default' : 'outline'}
                    onClick={() => onZone(z)} className="capitalize flex-1">{z}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      }
      diagnosis={
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Simulated swing result</h3>
              <Badge variant="secondary">{result.result}</Badge>
            </div>
            <StrikeZoneDiagram pitch={pitch} zone={zone} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Exit Velo" value={result.exitVelo} unit="mph" />
              <Stat label="Launch Angle" value={result.launchAngle} unit="°" />
              <Stat label="Swing IQ" value={result.swingIQ} unit="/100" />
            </div>
            <SwingArcDiagram batPathScore={result.batPathScore} launchAngle={result.launchAngle} />
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${result.batPathScore}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Bat path score {result.batPathScore}/100</p>
          </CardContent>
        </Card>
      }
      benchmark={{
        yourLabel: 'Your EV',
        yourValue: `${result.exitVelo} mph`,
        eliteLabel: 'Elite EV',
        eliteValue: `${result.benchmark.eliteEv} mph`,
        gapLabel: 'Gap',
        gapValue: `${result.benchmark.gapMph} mph`,
        projected: result.benchmark.projectedImprovement,
        whyItMatters: result.benchmark.whyItMatters,
        yourNumeric: result.exitVelo,
        eliteNumeric: result.benchmark.eliteEv,
        projectedNumeric: result.exitVelo + Math.min(result.benchmark.gapMph, 4),
        unit: 'mph',
      }}
    />
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-black"><AnimatedNumber value={value} suffix={unit} /></p>
    </div>
  );
}
