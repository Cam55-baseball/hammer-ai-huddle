import { useTranslation } from 'react-i18next';
import { ACTIVITY_COLORS } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {t('customActivity.fields.color')}
      </label>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_COLORS.map(({ name, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              "h-10 w-10 rounded-full border-2 transition-all duration-200",
              "hover:scale-110 flex items-center justify-center",
              selected === value 
                ? "border-white ring-2 ring-offset-2 ring-offset-background" 
                : "border-transparent"
            )}
            style={{ 
              backgroundColor: value,
            }}
            title={name}
          >
            {selected === value && (
              <Check className="h-5 w-5 text-white drop-shadow-lg" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
