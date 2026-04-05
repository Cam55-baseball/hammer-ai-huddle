import { Card } from '@/components/ui/card';
import { FORMAT_CONFIGS } from '@/hooks/usePromoEngine';
import { cn } from '@/lib/utils';

interface FormatSelectorProps {
  value: string;
  onChange: (format: string) => void;
}

export const FormatSelector = ({ value, onChange }: FormatSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Object.entries(FORMAT_CONFIGS).map(([key, config]) => {
        const isVertical = config.height > config.width;
        return (
          <Card
            key={key}
            className={cn(
              'p-3 cursor-pointer transition-all hover:shadow-md text-center',
              value === key && 'ring-2 ring-primary bg-primary/5'
            )}
            onClick={() => onChange(key)}
          >
            {/* Aspect ratio preview */}
            <div className="flex justify-center mb-2">
              <div
                className={cn(
                  'border-2 rounded-sm',
                  value === key ? 'border-primary' : 'border-muted-foreground/30'
                )}
                style={{
                  width: isVertical ? 28 : 48,
                  height: isVertical ? 48 : 28,
                }}
              />
            </div>
            <p className="text-xs font-semibold">{config.label}</p>
            <p className="text-[10px] text-muted-foreground">{config.aspect}</p>
          </Card>
        );
      })}
    </div>
  );
};
