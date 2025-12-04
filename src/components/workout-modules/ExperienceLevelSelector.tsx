import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ExperienceLevel } from '@/types/workout';

interface ExperienceLevelSelectorProps {
  value: ExperienceLevel;
  onChange: (level: ExperienceLevel) => void;
}

export function ExperienceLevelSelector({ value, onChange }: ExperienceLevelSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t('workoutModules.experienceLevel')}</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ExperienceLevel)}
        className="flex flex-wrap gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="beginner" id="beginner" />
          <Label htmlFor="beginner" className="cursor-pointer flex items-center gap-1">
            {t('workoutModules.beginner')}
            <Badge variant="outline" className="text-[10px] ml-1">-10%</Badge>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="intermediate" id="intermediate" />
          <Label htmlFor="intermediate" className="cursor-pointer flex items-center gap-1">
            {t('workoutModules.intermediate')}
            <Badge variant="secondary" className="text-[10px] ml-1">{t('workoutModules.standard')}</Badge>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="advanced" id="advanced" />
          <Label htmlFor="advanced" className="cursor-pointer flex items-center gap-1">
            {t('workoutModules.advanced')}
            <Badge variant="outline" className="text-[10px] ml-1">+5%</Badge>
          </Label>
        </div>
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        {t('workoutModules.adjustedFor', { level: t(`workoutModules.${value}`) })}
      </p>
    </div>
  );
}
