import { useTranslation } from 'react-i18next';
import { 
  Dumbbell, 
  Footprints, 
  Utensils, 
  Flame, 
  Moon, 
  Users, 
  Timer, 
  Pencil 
} from 'lucide-react';
import { ActivityType } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface ActivityTypeSelectorProps {
  selected: ActivityType | null;
  onSelect: (type: ActivityType) => void;
}

const ACTIVITY_TYPES: { type: ActivityType; icon: React.ElementType; colorClass: string }[] = [
  { type: 'workout', icon: Dumbbell, colorClass: 'from-red-500 to-orange-500' },
  { type: 'running', icon: Footprints, colorClass: 'from-blue-500 to-cyan-500' },
  { type: 'meal', icon: Utensils, colorClass: 'from-green-500 to-emerald-500' },
  { type: 'warmup', icon: Flame, colorClass: 'from-yellow-500 to-amber-500' },
  { type: 'recovery', icon: Moon, colorClass: 'from-purple-500 to-violet-500' },
  { type: 'practice', icon: Users, colorClass: 'from-indigo-500 to-blue-500' },
  { type: 'short_practice', icon: Timer, colorClass: 'from-teal-500 to-cyan-500' },
  { type: 'free_session', icon: Pencil, colorClass: 'from-pink-500 to-rose-500' },
];

export function ActivityTypeSelector({ selected, onSelect }: ActivityTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIVITY_TYPES.map(({ type, icon: Icon, colorClass }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className={cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
            "hover:scale-105 hover:shadow-lg",
            selected === type
              ? "border-primary bg-primary/10 shadow-lg"
              : "border-border/50 bg-background/50 hover:border-primary/50"
          )}
        >
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            colorClass
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <span className={cn(
            "text-xs font-bold text-center",
            selected === type ? "text-primary" : "text-foreground"
          )}>
            {t(`customActivity.types.${type}`)}
          </span>
          {selected === type && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
