import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { BlockType, BLOCK_TYPE_CONFIGS } from '@/types/eliteWorkout';
import { 
  Flame, Zap, Target, Dumbbell, Rocket, Battery, 
  Wind, Moon, Plus 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlockTypeSelectorProps {
  onSelect: (type: BlockType) => void;
  className?: string;
  showDescription?: boolean;
}

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  activation: Flame,
  elastic_prep: Zap,
  cns_primer: Zap,
  strength_output: Dumbbell,
  power_speed: Rocket,
  capacity: Battery,
  skill_transfer: Target,
  decompression: Wind,
  recovery: Moon,
  custom: Plus,
};

export function BlockTypeSelector({ onSelect, className, showDescription = true }: BlockTypeSelectorProps) {
  const { t } = useTranslation();
  
  const blockTypes = Object.values(BLOCK_TYPE_CONFIGS);
  
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2', className)}>
      {blockTypes.map((config) => {
        const Icon = BLOCK_ICONS[config.type];
        
        return (
          <button
            key={config.type}
            onClick={() => onSelect(config.type)}
            className={cn(
              'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all',
              'min-h-[80px] hover:scale-[1.02] active:scale-[0.98]',
              config.color,
              'hover:shadow-md'
            )}
          >
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
            <div className="text-center">
              <p className="text-xs sm:text-sm font-semibold leading-tight">
                {t(`eliteWorkout.blocks.${config.type}`, config.label)}
              </p>
              {showDescription && (
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {config.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface BlockTypeBadgeProps {
  type: BlockType;
  className?: string;
}

export function BlockTypeBadge({ type, className }: BlockTypeBadgeProps) {
  const { t } = useTranslation();
  const config = BLOCK_TYPE_CONFIGS[type];
  const Icon = BLOCK_ICONS[type];
  
  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1', config.color, className)}
    >
      <Icon className="h-3 w-3" />
      {t(`eliteWorkout.blocks.${type}`, config.label)}
    </Badge>
  );
}
