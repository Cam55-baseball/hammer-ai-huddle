import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { splitDefinitions } from '@/data/splitDefinitions';
import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';
import { useSportTheme } from '@/contexts/SportThemeContext';

interface SplitToggleProps {
  category: 'hitting' | 'pitching' | 'fielding';
  value: string;
  onValueChange: (val: string) => void;
}

export function SplitToggle({ category, value, onValueChange }: SplitToggleProps) {
  const { level } = useDataDensityLevel();
  const { sport } = useSportTheme();

  const available = splitDefinitions.filter(s => {
    if (!s.appliesTo.includes(category)) return false;
    if (s.requiredLevel > level) return false;
    // Hide softball-specific splits for baseball
    if (sport !== 'softball' && ['vs_riseball', 'vs_dropball', 'vs_speed', 'vs_spin'].includes(s.id)) return false;
    return true;
  });

  if (available.length <= 1) return null;

  return (
    <ToggleGroup type="single" value={value} onValueChange={v => v && onValueChange(v)} className="flex-wrap">
      {available.map(s => (
        <ToggleGroupItem key={s.id} value={s.id} variant="outline" size="sm" className="text-xs">
          {s.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
