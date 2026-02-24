import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const options = [
  { value: 'miss', label: 'Miss' },
  { value: 'foul', label: 'Foul' },
  { value: 'weak', label: 'Weak' },
  { value: 'hard', label: 'Hard' },
  { value: 'barrel', label: 'Barrel' },
] as const;

interface ContactQualitySelectorProps {
  value?: string;
  onValueChange: (val: string) => void;
}

export function ContactQualitySelector({ value, onValueChange }: ContactQualitySelectorProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Contact Quality</label>
      <ToggleGroup type="single" value={value} onValueChange={v => v && onValueChange(v)} className="flex-wrap">
        {options.map(o => (
          <ToggleGroupItem key={o.value} value={o.value} variant="outline" size="sm" className="text-xs">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
