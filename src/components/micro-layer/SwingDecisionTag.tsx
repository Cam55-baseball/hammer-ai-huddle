import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Check, X } from 'lucide-react';

interface SwingDecisionTagProps {
  value?: 'correct' | 'incorrect';
  onValueChange: (val: 'correct' | 'incorrect') => void;
}

export function SwingDecisionTag({ value, onValueChange }: SwingDecisionTagProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Swing Decision</label>
      <ToggleGroup type="single" value={value} onValueChange={v => v && onValueChange(v as any)}>
        <ToggleGroupItem value="correct" variant="outline" size="sm" className="text-xs data-[state=on]:bg-green-500/20 data-[state=on]:text-green-700 data-[state=on]:border-green-500">
          <Check className="h-3 w-3 mr-1" /> Correct
        </ToggleGroupItem>
        <ToggleGroupItem value="incorrect" variant="outline" size="sm" className="text-xs data-[state=on]:bg-red-500/20 data-[state=on]:text-red-700 data-[state=on]:border-red-500">
          <X className="h-3 w-3 mr-1" /> Incorrect
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
