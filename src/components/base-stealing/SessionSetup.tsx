import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Info } from 'lucide-react';

const STEP_OPTIONS = Array.from({ length: 29 }, (_, i) => {
  const val = (i + 2) / 2;
  return { value: String(val), label: String(val) };
});

const SHORT_STEP_OPTIONS = [
  { value: '1', label: '1' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2' },
];

export interface LeadConfig {
  stepsTowardBase: string;
  shuffleSteps: string;
  stepsBackOutfield: string;
  stepsTowardPitcher: string;
  leadDistanceFt: string;
  targetBase: string;
  holderPosition: string;
  signalMode: 'colors' | 'numbers';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SessionSetupProps {
  onStart: (config: LeadConfig) => void;
}

export function SessionSetup({ onStart }: SessionSetupProps) {
  const [config, setConfig] = useState<LeadConfig>({
    stepsTowardBase: '3',
    shuffleSteps: '2',
    stepsBackOutfield: '1',
    stepsTowardPitcher: '1',
    leadDistanceFt: '',
    targetBase: '2nd',
    holderPosition: 'nobody',
    signalMode: 'colors',
    difficulty: 'medium',
  });

  const update = <K extends keyof LeadConfig>(key: K, value: LeadConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const holderOptions = config.targetBase === '2nd'
    ? ['1B', 'Nobody']
    : config.targetBase === '3rd'
    ? ['2B', 'SS', 'Nobody']
    : ['Nobody'];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Camera guide */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 flex gap-3 items-start">
          <Camera className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Camera Position</p>
            <p className="text-xs text-muted-foreground">
              Position your camera to capture <strong>3 steps</strong> in each direction from your lead position. 
              Analysis only needs 2 steps, but capturing 3 ensures accuracy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lead Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lead Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Steps Toward Base</Label>
              <Select value={config.stepsTowardBase} onValueChange={v => update('stepsTowardBase', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STEP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Shuffle Steps</Label>
              <Select value={config.shuffleSteps} onValueChange={v => update('shuffleSteps', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STEP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Steps Back (Outfield)</Label>
              <Select value={config.stepsBackOutfield} onValueChange={v => update('stepsBackOutfield', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHORT_STEP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Steps Toward Pitcher</Label>
              <Select value={config.stepsTowardPitcher} onValueChange={v => update('stepsTowardPitcher', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHORT_STEP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lead Distance (ft)</Label>
            <Input
              type="number"
              placeholder="e.g. 13"
              value={config.leadDistanceFt}
              onChange={e => update('leadDistanceFt', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Situation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Situation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stealing Base</Label>
              <Select value={config.targetBase} onValueChange={v => update('targetBase', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2nd">2nd</SelectItem>
                  <SelectItem value="3rd">3rd</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Who Holds Runner</Label>
              <Select value={config.holderPosition} onValueChange={v => update('holderPosition', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {holderOptions.map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal & Difficulty */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Signal & Difficulty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Signal Mode</Label>
              <Select value={config.signalMode} onValueChange={v => update('signalMode', v as 'colors' | 'numbers')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="colors">Colors</SelectItem>
                  <SelectItem value="numbers">Numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Difficulty</Label>
              <Select value={config.difficulty} onValueChange={v => update('difficulty', v as LeadConfig['difficulty'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (0-2s)</SelectItem>
                  <SelectItem value="medium">Medium (0-3s)</SelectItem>
                  <SelectItem value="hard">Hard (0-5s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Higher difficulty increases the randomization of signal timing, making reactions harder to anticipate.</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => onStart(config)}>
        Start Session
      </Button>
    </div>
  );
}
