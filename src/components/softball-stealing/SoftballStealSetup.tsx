import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Zap } from 'lucide-react';
import { SUPPORTED_SOFTBALL_DISTANCES } from '@/data/softball/softballStealBenchmarks';

export type BaseTarget = '2nd' | '3rd';
export type SignalType = 'color' | 'even_odd';

export interface StealSetupConfig {
  baseTarget: BaseTarget;
  baseDistance: number;
  signalType: SignalType;
}

interface Props {
  onStart: (config: StealSetupConfig) => void;
}

export function SoftballStealSetup({ onStart }: Props) {
  const [baseTarget, setBaseTarget] = useState<BaseTarget>('2nd');
  const [baseDistance, setBaseDistance] = useState<number>(60);
  const [signalType, setSignalType] = useState<SignalType>('color');
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Softball Stealing Trainer
        </h2>
        <p className="text-sm text-muted-foreground">Manual stopwatch reaction training</p>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold">You must use a stopwatch.</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Start timer on first movement.</li>
              <li>Hit lap when runner completes first 2 steps.</li>
              <li>Stop timer when runner reaches base.</li>
              <li>Count full steps taken to the base.</li>
            </ol>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowInstructions(false)}>
              Got it
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Base Target */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Base Being Stolen</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={baseTarget} onValueChange={(v) => setBaseTarget(v as BaseTarget)} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2nd" id="base-2nd" />
              <Label htmlFor="base-2nd">2nd Base</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3rd" id="base-3rd" />
              <Label htmlFor="base-3rd">3rd Base</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Base Distance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Base Distance</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={String(baseDistance)} onValueChange={(v) => setBaseDistance(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_SOFTBALL_DISTANCES.map(d => (
                <SelectItem key={d} value={String(d)}>
                  {d} ft {d === 60 ? '(Standard)' : d <= 40 ? '(Youth)' : d >= 65 ? '(Extended)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Signal Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Signaling System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup value={signalType} onValueChange={(v) => setSignalType(v as SignalType)} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="color" id="sig-color" />
              <Label htmlFor="sig-color">Standard Color</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="even_odd" id="sig-evenodd" />
              <Label htmlFor="sig-evenodd">Even / Odd System</Label>
            </div>
          </RadioGroup>
          {signalType === 'even_odd' && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              Even signal = <span className="font-semibold text-primary">GO</span> &nbsp;|&nbsp; Odd signal = <span className="font-semibold text-destructive">BACK</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => onStart({ baseTarget, baseDistance, signalType })}>
        Begin Session
      </Button>
    </div>
  );
}
