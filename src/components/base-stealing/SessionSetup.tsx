import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Camera, Info, Timer, X } from 'lucide-react';

const STEP_OPTIONS = [
  { value: '0', label: '0' },
  ...Array.from({ length: 29 }, (_, i) => {
    const val = (i + 2) / 2;
    return { value: String(val), label: String(val) };
  }),
];

const SHORT_STEP_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2' },
];

const BASE_DISTANCE_OPTIONS = [
  { value: '50', label: '50 ft' },
  { value: '60', label: '60 ft' },
  { value: '70', label: '70 ft' },
  { value: '80', label: '80 ft' },
  { value: '90', label: '90 ft' },
];

export interface LeadConfig {
  stepsTowardBase: string;
  shuffleSteps: string;
  stepsBackOutfield: string;
  stepsTowardPitcher: string;
  leadDistanceFt: string;
  baseDistanceFt: string;
  targetBase: string;
  holderPosition: string;
  signalMode: 'colors' | 'numbers';
  difficulty: 'easy' | 'medium' | 'hard';
  cameraFacing: 'user';
  sessionMode: 'ai' | 'manual';
}

interface SessionSetupProps {
  onStart: (config: LeadConfig) => void;
}

export function SessionSetup({ onStart }: SessionSetupProps) {
  const [showStopwatchInstructions, setShowStopwatchInstructions] = useState(true);
  const [config, setConfig] = useState<LeadConfig>({
    stepsTowardBase: '3',
    shuffleSteps: '2',
    stepsBackOutfield: '1',
    stepsTowardPitcher: '1',
    leadDistanceFt: '',
    baseDistanceFt: '90',
    targetBase: '2nd',
    holderPosition: 'nobody',
    signalMode: 'colors',
    difficulty: 'medium',
    cameraFacing: 'user',
    sessionMode: 'ai',
  });

  const update = <K extends keyof LeadConfig>(key: K, value: LeadConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const holderOptions = config.targetBase === '2nd'
    ? ['1B', 'Nobody']
    : config.targetBase === '3rd'
    ? ['2B', 'SS', 'Nobody']
    : config.targetBase === 'home'
    ? ['3B', 'Nobody']
    : ['Nobody'];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Session Mode Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Manual Entry Mode</Label>
              <p className="text-xs text-muted-foreground">
                {config.sessionMode === 'manual' 
                  ? 'No camera — self-enter timing data'
                  : 'AI analyzes video for precise timing'}
              </p>
            </div>
            <Switch
              checked={config.sessionMode === 'manual'}
              onCheckedChange={(checked) => {
                update('sessionMode', checked ? 'manual' : 'ai');
                if (checked) setShowStopwatchInstructions(true);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stopwatch Instructions — Manual Mode Only */}
      {config.sessionMode === 'manual' && showStopwatchInstructions && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-5 space-y-2">
            <div className="flex gap-3 items-start">
              <Timer className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold">Stopwatch Instructions</p>
                  <button 
                    onClick={() => setShowStopwatchInstructions(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use a <strong>stopwatch with lap function</strong> for best results:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Start stopwatch on <strong>STEAL</strong> signal</li>
                  <li>Press lap after your first 2 steps</li>
                  <li>Stop timer when reaching the base</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  This captures your first-step time and total steal time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera guide — AI mode only */}
      {config.sessionMode === 'ai' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 space-y-2">
            <div className="flex gap-3 items-start">
              <Camera className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Front Camera Setup</p>
                <p className="text-xs text-muted-foreground">
                  Your front camera will be used so you can confirm you're in frame before starting.
                  Position your device so the camera captures <strong>at least 3 steps</strong> of movement in each direction from your lead position.
                </p>
                <p className="text-xs text-muted-foreground">
                  You'll see a live preview before each rep to verify your position.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="space-y-1.5">
              <Label className="text-xs">Base Distance</Label>
              <Select value={config.baseDistanceFt} onValueChange={v => update('baseDistanceFt', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BASE_DISTANCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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

      {/* Signal Explanation */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reaction Signal Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {config.signalMode === 'colors' ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-green-500 shrink-0" />
                <span className="text-sm font-medium">Green</span>
                <Badge variant="secondary" className="ml-auto text-xs">Steal / Go</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm font-medium">Red</span>
                <Badge variant="outline" className="ml-auto text-xs">Return</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-yellow-500 shrink-0" />
                <span className="text-sm font-medium">Yellow</span>
                <Badge variant="outline" className="ml-auto text-xs">Return</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full bg-blue-500 shrink-0" />
                <span className="text-sm font-medium">Blue</span>
                <Badge variant="outline" className="ml-auto text-xs">Return</Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">2, 4, 6, 8…</span>
                <Badge variant="secondary" className="ml-auto text-xs">Steal / Go</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground">1, 3, 5, 7…</span>
                <Badge variant="outline" className="ml-auto text-xs">Return</Badge>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            React as fast as possible when the signal appears. Wrong decisions count against accuracy.
          </p>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => onStart(config)}>
        Start Session
      </Button>
    </div>
  );
}
