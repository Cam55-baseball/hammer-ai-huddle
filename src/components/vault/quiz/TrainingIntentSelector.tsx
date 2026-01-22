import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Dumbbell, Zap, Heart, Target } from 'lucide-react';

interface TrainingIntentSelectorProps {
  selectedIntents: string[];
  onChange: (intents: string[]) => void;
}

const INTENTS = [
  { 
    id: 'max_strength', 
    letter: 'A',
    labelKey: 'Max Strength',
    descKey: 'Heavy lifts, low reps',
    icon: Dumbbell,
    color: 'red'
  },
  { 
    id: 'speed_power', 
    letter: 'B',
    labelKey: 'Speed/Power',
    descKey: 'Explosive movements',
    icon: Zap,
    color: 'amber'
  },
  { 
    id: 'recovery_prep', 
    letter: 'C',
    labelKey: 'Recovery/Prep',
    descKey: 'Light work, mobility',
    icon: Heart,
    color: 'green'
  },
  { 
    id: 'technique', 
    letter: 'D',
    labelKey: 'Technique',
    descKey: 'Skill refinement',
    icon: Target,
    color: 'blue'
  },
];

const colorClasses = {
  red: {
    selected: 'bg-red-500/20 border-red-500/50 text-red-400',
    unselected: 'hover:border-red-500/30 hover:bg-red-500/5',
    icon: 'text-red-500',
    badge: 'bg-red-500 text-white'
  },
  amber: {
    selected: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    unselected: 'hover:border-amber-500/30 hover:bg-amber-500/5',
    icon: 'text-amber-500',
    badge: 'bg-amber-500 text-white'
  },
  green: {
    selected: 'bg-green-500/20 border-green-500/50 text-green-400',
    unselected: 'hover:border-green-500/30 hover:bg-green-500/5',
    icon: 'text-green-500',
    badge: 'bg-green-500 text-white'
  },
  blue: {
    selected: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    unselected: 'hover:border-blue-500/30 hover:bg-blue-500/5',
    icon: 'text-blue-500',
    badge: 'bg-blue-500 text-white'
  },
};

export function TrainingIntentSelector({ selectedIntents, onChange }: TrainingIntentSelectorProps) {
  const { t } = useTranslation();

  const toggleIntent = (intentId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedIntents.includes(intentId)) {
      onChange(selectedIntents.filter(i => i !== intentId));
    } else {
      onChange([...selectedIntents, intentId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {t('vault.quiz.intent.label', "Today's Intention is:")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('vault.quiz.intent.multiSelectHint', 'Select all that apply')}
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {INTENTS.map((intent) => {
          const isSelected = selectedIntents.includes(intent.id);
          const colors = colorClasses[intent.color as keyof typeof colorClasses];
          const Icon = intent.icon;
          
          return (
            <button
              key={intent.id}
              type="button"
              onClick={() => toggleIntent(intent.id)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all duration-200 text-left",
                isSelected
                  ? `${colors.selected} scale-[1.02] shadow-md`
                  : `bg-background/50 border-border/50 ${colors.unselected} opacity-70`
              )}
            >
              <div className="flex items-start gap-2">
                <span className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black",
                  isSelected ? colors.badge : "bg-muted text-muted-foreground"
                )}>
                  {intent.letter}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", isSelected ? colors.icon : "text-muted-foreground")} />
                    <span className="text-sm font-bold truncate">
                      {t(`vault.quiz.intent.${intent.id}`, intent.labelKey)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t(`vault.quiz.intent.${intent.id}Desc`, intent.descKey)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
