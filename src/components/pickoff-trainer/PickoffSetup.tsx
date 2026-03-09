import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

const COVERING_OPTIONS: Record<string, { label: string; value: string }[]> = {
  '1st': [
    { label: '1B', value: '1B' },
    { label: 'P (Self Cover)', value: 'P' },
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
  onStart: (base: string, covering: string) => void;
}

export function PickoffSetup({ onStart }: PickoffSetupProps) {
  const [base, setBase] = useState('');
  const [covering, setCovering] = useState('');

  const coveringOptions = base ? COVERING_OPTIONS[base] || [] : [];

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Signal Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <p className="text-xs text-muted-foreground mt-2">
            When the final signal appears, perform the action physically. Then log whether your decision was correct.
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        disabled={!base || !covering}
        onClick={() => onStart(base, covering)}
      >
        Begin Session
      </Button>
    </div>
  );
}
