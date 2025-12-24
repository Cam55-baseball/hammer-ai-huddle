import { 
  Dumbbell, 
  Flame, 
  Heart, 
  Zap, 
  Target, 
  Trophy,
  Timer,
  Activity,
  Footprints,
  Utensils,
  Moon,
  Sun,
  Coffee,
  Apple,
  Salad,
  Pill,
  Bike,
  Users,
  ClipboardList,
  Pencil,
  Star,
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
  color?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  timer: Timer,
  activity: Activity,
  footprints: Footprints,
  utensils: Utensils,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  apple: Apple,
  salad: Salad,
  pill: Pill,
  bike: Bike,
  users: Users,
  clipboard: ClipboardList,
  pencil: Pencil,
  star: Star,
  sparkles: Sparkles,
};

export function getActivityIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Dumbbell;
}

export function IconPicker({ selected, onSelect, color = '#8b5cf6' }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {Object.entries(ICON_MAP).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={cn(
            "p-2.5 rounded-lg border-2 transition-all duration-200",
            "hover:scale-110",
            selected === name
              ? "border-primary shadow-lg"
              : "border-border/50 hover:border-primary/50"
          )}
          style={selected === name ? { 
            backgroundColor: `${color}20`,
            borderColor: color 
          } : undefined}
        >
          <Icon 
            className="h-5 w-5 mx-auto" 
            style={{ color: selected === name ? color : undefined }}
          />
        </button>
      ))}
    </div>
  );
}
