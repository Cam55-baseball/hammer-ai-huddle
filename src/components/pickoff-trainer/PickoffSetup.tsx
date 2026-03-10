import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, ArrowLeft } from 'lucide-react';

export type SignalType = 'color' | 'even_odd';

const COVERING_OPTIONS: Record<string, { label: string; value: string }[]> = {
  '1st': [
    { label: '1B', value: '1B' },
  ],
  '2nd': [
    { label: 'SS', value: 'SS' },
    { label: '2B', value: '2B' },
  ],
  '3rd': [
    { label: '3B', value: '3B' },
    { label: 'SS', value: 'SS' },
  ],
};

interface PickoffSetupProps {
  onStart: (base: string, covering: string, signalType: SignalType) => void;
  onBack: () => void;
}

export function PickoffSetup({ onStart, onBack }: PickoffSetupProps) {
  const [base, setBase] = useState('');
  const [covering, setCovering] = useState('');
  const [signalType, setSignalType] = useState<SignalType>('color');

  const coveringOptions = base ? COVERING_OPTIONS[base] || [] : [];

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Pick-Off Trainer</h1>
        <p className="text-muted-foreground text-sm">Train decision-making on pick-off attempts with randomized signals.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Session Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Base Target</label>
            <Select value={base} onValueChange={(v) => { setBase(v); setCovering(''); }}>
              <SelectTrigger><SelectValue placeholder="Select base" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1st">1st Base</SelectItem>
                <SelectItem value="2nd">2nd Base</SelectItem>
                <SelectItem value="3rd">3rd Base</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {base && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Who Is Covering the Bag</label>
              <Select value={covering} onValueChange={setCovering}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {coveringOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signal Type */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Signaling System</CardTitle>
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
              Even number = <span className="font-semibold text-primary">Pitch</span> &nbsp;|&nbsp; Odd number = <span className="font-semibold text-destructive">Pick-Off</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Signal Guide */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Signal Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {signalType === 'color' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 shrink-0" />
                <span className="text-sm text-foreground">Green = Pitch</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-foreground">Red = Pick-Off</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">Distraction flashes — ignore these</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center font-bold text-primary">2</span>
                <span className="text-sm text-foreground">Even Number = Pitch</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center font-bold text-destructive">7</span>
                <span className="text-sm text-foreground">Odd Number = Pick-Off</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Random numbers will flash as distractions — only the final number counts.</span>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            When the final signal appears, perform the action physically. Then log whether your decision was correct.
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        disabled={!base || !covering}
        onClick={() => onStart(base, covering, signalType)}
      >
        Begin Session
      </Button>
    </div>
  );
}
