import { cn } from '@/lib/utils';

interface SideToggleProps {
  value: 'L' | 'R';
  onChange: (side: 'L' | 'R') => void;
  label: string;
}

export function SideToggle({ value, onChange, label }: SideToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="inline-flex rounded-md border border-border overflow-hidden h-7">
        {(['R', 'L'] as const).map(side => (
          <button
            key={side}
            type="button"
            onClick={() => onChange(side)}
            className={cn(
              'px-3 text-xs font-semibold transition-colors',
              value === side
                ? 'bg-primary/20 text-primary border-primary'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
            )}
          >
            {side}
          </button>
        ))}
      </div>
    </div>
  );
}
