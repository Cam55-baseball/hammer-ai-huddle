import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BodyAreaSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

const BODY_AREAS = [
  { id: 'head_neck', labelKey: 'Head/Neck', emoji: '🗣️' },
  { id: 'shoulder', labelKey: 'Shoulder', emoji: '💪' },
  { id: 'upper_back', labelKey: 'Upper Back', emoji: '🔙' },
  { id: 'lower_back', labelKey: 'Lower Back', emoji: '⬇️' },
  { id: 'elbow', labelKey: 'Elbow', emoji: '🦴' },
  { id: 'wrist_hand', labelKey: 'Wrist/Hand', emoji: '✋' },
  { id: 'hip', labelKey: 'Hip', emoji: '🦵' },
  { id: 'knee', labelKey: 'Knee', emoji: '🦿' },
  { id: 'ankle', labelKey: 'Ankle', emoji: '🦶' },
  { id: 'foot', labelKey: 'Foot', emoji: '👣' },
];

export function BodyAreaSelector({ selectedAreas, onChange }: BodyAreaSelectorProps) {
  const { t } = useTranslation();

  const toggleArea = (areaId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedAreas.includes(areaId)) {
      onChange(selectedAreas.filter(a => a !== areaId));
    } else {
      onChange([...selectedAreas, areaId]);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {t('vault.quiz.pain.locationLabel', 'Localized pain today?')}
      </p>
      <div className="flex flex-wrap gap-2">
        {BODY_AREAS.map((area) => {
          const isSelected = selectedAreas.includes(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => toggleArea(area.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                isSelected
                  ? "bg-red-500/20 text-red-400 border-red-500/50 shadow-sm"
                  : "bg-background/50 text-muted-foreground border-border/50 hover:border-border hover:bg-background"
              )}
            >
              <span className="mr-1">{area.emoji}</span>
              {t(`vault.quiz.pain.area.${area.id}`, area.labelKey)}
            </button>
          );
        })}
      </div>
      {selectedAreas.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {t('vault.quiz.pain.noPainSelected', 'No pain areas selected (that\'s great!)')}
        </p>
      )}
    </div>
  );
}
