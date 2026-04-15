import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const options = [
  { value: 'barrel', label: 'Barrel' },
  { value: 'solid', label: 'Solid' },
  { value: 'flare_burner', label: 'Flare/Burner' },
  { value: 'misshit_clip', label: 'Miss-hit/Clip' },
  { value: 'weak', label: 'Weak' },
  { value: 'whiff', label: 'Whiff' },
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
