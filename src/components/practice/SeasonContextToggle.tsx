import { cn } from '@/lib/utils';

const seasons = [
  { value: 'in_season', label: 'In-Season' },
  { value: 'off_season', label: 'Off-Season' },
  { value: 'preseason', label: 'Preseason' },
];

interface SeasonContextToggleProps {
  value: string;
  onChange: (season: string) => void;
}

export function SeasonContextToggle({ value, onChange }: SeasonContextToggleProps) {
  return (
    <div className="flex rounded-lg border overflow-hidden">
      {seasons.map(s => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(s.value)}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-all',
            value === s.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/20 hover:bg-muted text-muted-foreground'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
