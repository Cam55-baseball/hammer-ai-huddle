import React, { useState } from 'react';
import { Heart, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Phase = 'entry' | 'result';

interface Props {
  value: string;
  onResult: (bpm: number | null) => void;
}

export function RestingHeartRateCapture({ value, onResult }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    value && Number(value) > 0 ? 'result' : 'entry'
  );
  const [inputValue, setInputValue] = useState(value || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = () => {
    const v = Number(inputValue);
    if (!inputValue || isNaN(v) || v < 30 || v > 200) {
      setErrorMsg('Please enter a value between 30 and 200 bpm.');
      return;
    }
    setErrorMsg('');
    onResult(v);
    setPhase('result');
  };

  if (phase === 'result') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
          <span className="text-xl font-bold text-rose-500">{inputValue}</span>
          <span className="text-sm text-muted-foreground">bpm</span>
        </div>
        <button
          type="button"
          onClick={() => { setPhase('entry'); onResult(null); }}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. 58"
            className="pl-9 max-w-[140px]"
            min={30}
            max={200}
          />
        </div>
        <Button type="button" size="sm" onClick={handleSave} variant="secondary">
          Save
        </Button>
      </div>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}
