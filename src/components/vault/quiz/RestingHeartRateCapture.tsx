import React, { useState } from 'react';
import { Heart, Pencil, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

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
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-3 w-3" />
          How to measure
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
          <p>• Sit or lie still for <strong>2 minutes</strong> before measuring</p>
          <p>• Place two fingers on the inside of your wrist, just below the thumb</p>
          <p>• Count the beats for <strong>15 seconds</strong>, then multiply by 4</p>
          <p>• Best measured first thing in the morning before getting out of bed</p>
          <p>• A smartwatch or fitness tracker can also provide this automatically</p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
