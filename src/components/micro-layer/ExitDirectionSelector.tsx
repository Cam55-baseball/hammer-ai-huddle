import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSportTheme } from '@/contexts/SportThemeContext';

interface ExitDirectionSelectorProps {
  value?: string;
  onValueChange: (val: string) => void;
}

export function ExitDirectionSelector({ value, onValueChange }: ExitDirectionSelectorProps) {
  const { sport } = useSportTheme();

  const options = [
    { value: 'pull', label: 'Pull' },
    { value: 'middle', label: 'Middle' },
    { value: 'oppo', label: 'Oppo' },
    ...(sport === 'softball' ? [{ value: 'slap_side', label: 'Slap Side' }] : []),
  ];

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Exit Direction</label>
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
