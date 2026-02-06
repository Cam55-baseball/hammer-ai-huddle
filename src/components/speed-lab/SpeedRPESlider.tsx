import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { RPE_LABELS } from '@/data/speedLabProgram';

interface SpeedRPESliderProps {
  value: number;
  onChange: (value: number) => void;
}

const RPE_COLORS: Record<number, string> = {
  1: 'text-green-500',
  2: 'text-green-500',
  3: 'text-green-400',
  4: 'text-yellow-500',
  5: 'text-yellow-500',
  6: 'text-orange-500',
  7: 'text-orange-500',
  8: 'text-red-500',
  9: 'text-red-600',
  10: 'text-red-700',
};

export function SpeedRPESlider({ value, onChange }: SpeedRPESliderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {t('speedLab.rpe.title', 'How hard was that?')}
        </span>
        <span className={`text-lg font-bold ${RPE_COLORS[value] || ''}`}>
          {value}/10
        </span>
      </div>

      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />

      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">
          {t('speedLab.rpe.easy', 'Easy')}
        </span>
        <span className={`text-sm font-semibold ${RPE_COLORS[value] || ''}`}>
          {t(`speedLab.rpe.level${value}`, RPE_LABELS[value] || '')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('speedLab.rpe.maxEffort', 'Max')}
        </span>
      </div>
    </div>
  );
}
