import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';

const styles = [
  { value: 'riseball', label: 'Riseball' },
  { value: 'dropball', label: 'Dropball' },
  { value: 'speed', label: 'Speed' },
  { value: 'spin', label: 'Spin' },
] as const;

interface SoftballPitcherStyleTagProps {
  value?: string;
  onValueChange: (val: 'riseball' | 'dropball' | 'speed' | 'spin') => void;
}

export function SoftballPitcherStyleTag({ value, onValueChange }: SoftballPitcherStyleTagProps) {
  const { sport } = useSportTheme();
  const { isElite } = useDataDensityLevel();

  if (sport !== 'softball' || !isElite) return null;

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">Pitcher Style</label>
      <ToggleGroup type="single" value={value} onValueChange={v => v && onValueChange(v as any)}>
        {styles.map(s => (
          <ToggleGroupItem key={s.value} value={s.value} variant="outline" size="sm" className="text-xs">
            {s.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
