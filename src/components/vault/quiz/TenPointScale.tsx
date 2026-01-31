import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TenPointScaleProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon: React.ReactNode;
  getLevelLabel?: (value: number) => string;
  getLevelColor?: (value: number) => string;
  inverted?: boolean; // For pain scales where higher is worse
  compact?: boolean; // For stacked display of multiple scales
}

export function TenPointScale({ 
  value, 
  onChange, 
  label, 
  icon, 
  getLevelLabel,
  getLevelColor,
  inverted = false,
  compact = false
}: TenPointScaleProps) {
  const getButtonColor = (num: number, isSelected: boolean) => {
    // For inverted scales (like pain), 1-2 is green, 9-10 is red
    // For normal scales (like recovery), 1-2 is red, 9-10 is green
    let colorClass = '';
    
    if (inverted) {
      if (num <= 2) colorClass = isSelected ? 'bg-green-500 border-green-600 text-white shadow-green-500/30' : 'bg-green-500/20 text-green-500 border-green-500/30';
      else if (num <= 4) colorClass = isSelected ? 'bg-lime-500 border-lime-600 text-white shadow-lime-500/30' : 'bg-lime-500/20 text-lime-600 border-lime-500/30';
      else if (num <= 6) colorClass = isSelected ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      else if (num <= 8) colorClass = isSelected ? 'bg-orange-500 border-orange-600 text-white shadow-orange-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      else colorClass = isSelected ? 'bg-red-500 border-red-600 text-white shadow-red-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30';
    } else {
      if (num <= 2) colorClass = isSelected ? 'bg-red-500 border-red-600 text-white shadow-red-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30';
      else if (num <= 4) colorClass = isSelected ? 'bg-orange-500 border-orange-600 text-white shadow-orange-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      else if (num <= 6) colorClass = isSelected ? 'bg-amber-500 border-amber-600 text-white shadow-amber-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      else if (num <= 8) colorClass = isSelected ? 'bg-lime-500 border-lime-600 text-white shadow-lime-500/30' : 'bg-lime-500/20 text-lime-600 border-lime-500/30';
      else colorClass = isSelected ? 'bg-green-500 border-green-600 text-white shadow-green-500/30' : 'bg-green-500/20 text-green-600 border-green-500/30';
    }
    
    return colorClass;
  };

  const handleClick = (num: number) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onChange(num);
  };

  const defaultGetLevelColor = (val: number) => {
    if (inverted) {
      if (val <= 2) return 'text-green-500';
      if (val <= 4) return 'text-lime-500';
      if (val <= 6) return 'text-amber-500';
      if (val <= 8) return 'text-orange-500';
      return 'text-red-500';
    } else {
      if (val <= 2) return 'text-red-500';
      if (val <= 4) return 'text-orange-500';
      if (val <= 6) return 'text-amber-500';
      if (val <= 8) return 'text-lime-500';
      return 'text-green-500';
    }
  };

  return (
    <div className={cn(
      "space-y-3 bg-card/50 rounded-2xl border border-border/50",
      compact ? "p-3" : "p-4"
    )}>
      <div className="flex items-center justify-between">
        <Label className={cn(
          "flex items-center gap-2 font-semibold",
          compact ? "text-sm" : "text-base"
        )}>
          {icon}
          {label}
        </Label>
        {value > 0 && getLevelLabel && (
          <span className={cn(
            "font-bold px-3 py-1 rounded-full bg-background",
            compact ? "text-xs" : "text-sm",
            getLevelColor ? getLevelColor(value) : defaultGetLevelColor(value)
          )}>
            {getLevelLabel(value)}
          </span>
        )}
      </div>
      
      {/* 5x2 grid for 10 buttons */}
      <div className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleClick(num)}
            className={cn(
              "rounded-lg font-bold text-sm transition-all duration-200 border-2",
              compact ? "min-h-[36px]" : "min-h-[40px]",
              getButtonColor(num, value === num),
              value === num ? "scale-105 shadow-lg" : "scale-100 opacity-70 hover:opacity-90"
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}
