import { useTranslation } from 'react-i18next';
import { RPE_LABELS } from '@/data/speedLabProgram';

interface SpeedRPESliderProps {
  value: number;
  onChange: (value: number) => void;
}

const RPE_COLORS: Record<number, string> = {
  1: 'bg-green-500/15 text-green-700 dark:text-green-400 ring-green-500/30',
  2: 'bg-green-500/15 text-green-700 dark:text-green-400 ring-green-500/30',
  3: 'bg-green-400/15 text-green-600 dark:text-green-400 ring-green-400/30',
  4: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/30',
  5: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 ring-yellow-500/30',
  6: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-orange-500/30',
  7: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 ring-orange-500/30',
  8: 'bg-red-500/15 text-red-700 dark:text-red-400 ring-red-500/30',
  9: 'bg-red-600/15 text-red-700 dark:text-red-300 ring-red-600/30',
  10: 'bg-red-700/15 text-red-800 dark:text-red-300 ring-red-700/30',
};

const RPE_EMOJIS: Record<number, string> = {
  1: '😴', 2: '😌', 3: '🙂', 4: '😐', 5: '😤',
  6: '😰', 7: '🥵', 8: '😫', 9: '🔥', 10: '💀',
};

export function SpeedRPESlider({ value, onChange }: SpeedRPESliderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {t('speedLab.rpe.title', 'How hard was that?')}
        </span>
        <span className="text-sm font-bold">
          {RPE_EMOJIS[value]} {value}/10
        </span>
      </div>

      {/* Tappable button grid */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`
              flex flex-col items-center justify-center
              min-h-[56px] rounded-xl font-bold text-lg
              transition-all duration-150
              ${value === num
                ? `${RPE_COLORS[num]} ring-2 scale-105 shadow-sm`
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }
            `}
          >
            <span className="text-base">{RPE_EMOJIS[num]}</span>
            <span className="text-xs mt-0.5">{num}</span>
          </button>
        ))}
      </div>

      {/* Selected label */}
      <div className="text-center">
        <span className={`text-sm font-semibold ${value >= 8 ? 'text-red-600 dark:text-red-400' : value >= 5 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
          {t(`speedLab.rpe.level${value}`, RPE_LABELS[value] || '')}
        </span>
      </div>
    </div>
  );
}
