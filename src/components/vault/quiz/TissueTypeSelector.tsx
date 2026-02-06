import { cn } from '@/lib/utils';
import { TISSUE_TYPES } from './body-maps/tissueTypeDefinitions';

interface TissueTypeSelectorProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

const COLOR_MAP: Record<string, { selected: string; unselected: string }> = {
  red: {
    selected: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
  blue: {
    selected: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
  purple: {
    selected: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
  slate: {
    selected: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
  amber: {
    selected: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
  yellow: {
    selected: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/50',
    unselected: 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50',
  },
};

export function TissueTypeSelector({ selectedTypes, onChange }: TissueTypeSelectorProps) {
  const toggleType = (typeId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedTypes.includes(typeId)) {
      onChange(selectedTypes.filter((t) => t !== typeId));
    } else {
      onChange([...selectedTypes, typeId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {TISSUE_TYPES.map((tissue) => {
        const isSelected = selectedTypes.includes(tissue.id);
        const colors = COLOR_MAP[tissue.color] || COLOR_MAP.slate;
        return (
          <button
            key={tissue.id}
            type="button"
            onClick={() => toggleType(tissue.id)}
            title={tissue.description}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-150',
              isSelected ? colors.selected : colors.unselected
            )}
          >
            <span className="text-xs leading-none">{tissue.emoji}</span>
            <span>{tissue.label}</span>
          </button>
        );
      })}
    </div>
  );
}
