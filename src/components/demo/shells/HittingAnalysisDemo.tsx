import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles } from 'lucide-react';
import { hittingSim, PitchType, ContactZone } from '@/demo/sims/hittingSim';

const PITCHES: PitchType[] = ['fastball', 'curveball', 'changeup', 'slider'];
const ZONES: ContactZone[] = ['inside', 'middle', 'outside'];

export default function HittingAnalysisDemo() {
  const [pitch, setPitch] = useState<PitchType>('fastball');
  const [zone, setZone] = useState<ContactZone>('middle');
  const result = hittingSim.run({ pitch, zone });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">Pitch type</p>
            <div className="flex flex-wrap gap-1.5">
              {PITCHES.map(p => (
                <Button key={p} size="sm" variant={pitch === p ? 'default' : 'outline'}
                  onClick={() => setPitch(p)} className="capitalize">{p}</Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">Contact zone</p>
            <div className="flex gap-1.5">
              {ZONES.map(z => (
                <Button key={z} size="sm" variant={zone === z ? 'default' : 'outline'}
                  onClick={() => setZone(z)} className="capitalize flex-1">{z}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Simulated swing result</h3>
            <Badge variant="secondary">{result.result}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Exit Velo" value={`${result.exitVelo}`} unit="mph" />
            <Stat label="Launch Angle" value={`${result.launchAngle}°`} />
            <Stat label="Swing IQ" value={`${result.swingIQ}`} unit="/100" />
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${result.batPathScore}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">Bat path score {result.batPathScore}/100</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-dashed">
        <div className="pointer-events-none absolute inset-0 backdrop-blur-sm bg-background/60" />
        <CardContent className="relative space-y-2 p-4 text-center">
          <Lock className="mx-auto h-5 w-5 text-primary" />
          <p className="text-sm font-bold">Elite Insight: Tunnel-vs-Path Decoder</p>
          <p className="text-xs text-muted-foreground">{result.insightTeaser}</p>
          <Button size="sm" className="gap-1.5"><Sparkles className="h-4 w-4" /> Unlock</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-black">{value}{unit && <span className="text-xs font-normal text-muted-foreground"> {unit}</span>}</p>
    </div>
  );
}
