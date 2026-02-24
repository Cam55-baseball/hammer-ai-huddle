import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BattingSideSelectorProps {
  value?: 'L' | 'R';
  onValueChange: (val: 'L' | 'R') => void;
}

export function BattingSideSelector({ value, onValueChange }: BattingSideSelectorProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Batting Side</label>
      <ToggleGroup type="single" value={value} onValueChange={v => v && onValueChange(v as 'L' | 'R')}>
        <ToggleGroupItem value="L" variant="outline" size="sm">Left</ToggleGroupItem>
        <ToggleGroupItem value="R" variant="outline" size="sm">Right</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
