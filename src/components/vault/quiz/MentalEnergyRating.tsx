import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { BrainCircuit } from 'lucide-react';

interface MentalEnergyRatingProps {
  value: number;
  onChange: (value: number) => void;
}

const LEVELS = [
  { level: 1, label: 'Depleted', emoji: '😵', color: 'from-red-500 to-red-600' },
  { level: 2, label: 'Low', emoji: '😔', color: 'from-orange-500 to-orange-600' },
  { level: 3, label: 'Steady', emoji: '😐', color: 'from-amber-500 to-amber-600' },
  { level: 4, label: 'Energized', emoji: '😊', color: 'from-lime-500 to-lime-600' },
  { level: 5, label: 'Locked In', emoji: '🔥', color: 'from-green-500 to-emerald-600' },
];

export function MentalEnergyRating({ value, onChange }: MentalEnergyRatingProps) {
  const { t } = useTranslation();

  const handleClick = (level: number) => {
    if (navigator.vibrate) navigator.vibrate(level === 5 ? [15, 30, 15] : 10);
    onChange(level);
  };

  const currentLevel = LEVELS.find(l => l.level === value);

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 rounded-xl border border-fuchsia-500/20">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-fuchsia-500/20">
          <BrainCircuit className="h-4 w-4 text-fuchsia-500" />
        </div>
        <div>
          <Label className="text-sm font-bold">{t('vault.quiz.intent.mentalEnergy', 'Mental Energy')}</Label>
          <p className="text-xs text-muted-foreground">{t('vault.quiz.intent.mentalEnergyHint', 'How sharp is your focus?')}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map(({ level, emoji, color }) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => handleClick(level)}
              className={cn(
                "flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-300 border-2",
                isSelected 
                  ? `bg-gradient-to-br ${color} text-white border-transparent shadow-lg scale-105` 
                  : "bg-background/50 text-muted-foreground border-border/50 hover:border-border opacity-60 hover:opacity-80"
              )}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-xs font-bold mt-0.5">{level}</span>
            </button>
          );
        })}
      </div>

      {currentLevel && (
        <div className="text-center p-2 rounded-lg bg-background/50">
          <p className={cn(
            "font-bold text-sm",
            value <= 2 ? "text-red-500" : value === 3 ? "text-amber-500" : "text-green-500"
          )}>
            {t(`vault.quiz.intent.mentalLevel${value}`, currentLevel.label)}
          </p>
        </div>
      )}
    </div>
  );
}
