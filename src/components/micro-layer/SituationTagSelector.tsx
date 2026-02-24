import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const runnerOptions = [
  { value: 'none', label: 'No Runners' },
  { value: '1st', label: '1st' },
  { value: '2nd', label: '2nd' },
  { value: '3rd', label: '3rd' },
  { value: '1st_2nd', label: '1st & 2nd' },
  { value: '1st_3rd', label: '1st & 3rd' },
  { value: '2nd_3rd', label: '2nd & 3rd' },
  { value: 'loaded', label: 'Bases Loaded' },
];

interface SituationTagSelectorProps {
  runners?: string;
  outs?: number;
  onRunnersChange: (val: string) => void;
  onOutsChange: (val: number) => void;
}

export function SituationTagSelector({ runners, outs, onRunnersChange, onOutsChange }: SituationTagSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Game Situation</label>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Select value={runners ?? 'none'} onValueChange={onRunnersChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Runners" />
            </SelectTrigger>
            <SelectContent>
              {runnerOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Outs</p>
          <ToggleGroup type="single" value={String(outs ?? 0)} onValueChange={v => onOutsChange(Number(v))}>
            {[0, 1, 2].map(n => (
              <ToggleGroupItem key={n} value={String(n)} variant="outline" size="sm" className="text-xs h-8 w-8">
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
