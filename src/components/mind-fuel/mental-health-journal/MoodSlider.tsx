import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface MoodSliderProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

const moodOptions = [
  { value: 1, emoji: '😔', label: 'struggling', color: 'wellness-lavender' },
  { value: 2, emoji: '😕', label: 'low', color: 'wellness-lavender' },
  { value: 3, emoji: '😐', label: 'okay', color: 'wellness-sky' },
  { value: 4, emoji: '🙂', label: 'good', color: 'wellness-sage' },
  { value: 5, emoji: '😊', label: 'great', color: 'wellness-sage' },
];

export default function MoodSlider({ value, onChange }: MoodSliderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-2">
      {moodOptions.map((mood) => {
        const isSelected = value === mood.value;
        return (
          <button
            key={mood.value}
            onClick={() => onChange(isSelected ? null : mood.value)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200",
              isSelected
                ? "scale-105 shadow-md"
                : "hover:bg-wellness-soft-gray"
            )}
            style={isSelected ? {
              backgroundColor: `hsl(var(--${mood.color}) / 0.2)`,
              borderColor: `hsl(var(--${mood.color}))`,
              border: '2px solid'
            } : undefined}
          >
            <span className={cn("text-2xl transition-transform", isSelected && "scale-110")}>
              {mood.emoji}
            </span>
            <span className={cn(
              "text-xs font-medium capitalize",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {t(`mentalWellness.journal.mood.${mood.label}`, mood.label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
