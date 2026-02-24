import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface CountSelectorProps {
  value: { balls: number; strikes: number };
  onChange: (val: { balls: number; strikes: number }) => void;
}

export function CountSelector({ value, onChange }: CountSelectorProps) {
  const inc = (field: 'balls' | 'strikes', max: number) => {
    onChange({ ...value, [field]: Math.min(value[field] + 1, max) });
  };
  const dec = (field: 'balls' | 'strikes') => {
    onChange({ ...value, [field]: Math.max(value[field] - 1, 0) });
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Count</label>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-6">B</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => dec('balls')}><Minus className="h-3 w-3" /></Button>
          <span className="w-6 text-center font-mono text-sm">{value.balls}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => inc('balls', 3)}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground w-6">S</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => dec('strikes')}><Minus className="h-3 w-3" /></Button>
          <span className="w-6 text-center font-mono text-sm">{value.strikes}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => inc('strikes', 2)}><Plus className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}
