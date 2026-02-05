import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ViewMode, VIEW_MODE_CONFIGS } from '@/types/eliteWorkout';
import { Play, BarChart3, Users } from 'lucide-react';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const MODE_ICONS: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  execute: Play,
  coach: BarChart3,
  parent: Users,
};

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const { t } = useTranslation();
  
  const modes: ViewMode[] = ['execute', 'coach', 'parent'];
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg border',
      className
    )}>
      {modes.map((mode) => {
        const config = VIEW_MODE_CONFIGS[mode];
        const Icon = MODE_ICONS[mode];
        const isActive = value === mode;
        
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all',
              'min-w-[44px] min-h-[44px]', // Kid-friendly tap target
              isActive
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
            title={config.description}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t(`eliteWorkout.viewModes.${mode}`, config.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
