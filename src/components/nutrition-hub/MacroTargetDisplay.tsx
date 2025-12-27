import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Beef, Wheat, Droplets, Cookie } from 'lucide-react';
import { useDailyNutritionTargets } from '@/hooks/useDailyNutritionTargets';
import { cn } from '@/lib/utils';

interface MacroTargetDisplayProps {
  consumed?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  compact?: boolean;
  showHydration?: boolean;
  className?: string;
}

interface MacroItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  compact?: boolean;
}

function MacroItem({ icon, label, current, target, unit, color, compact }: MacroItemProps) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  
  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", color)}>
            {icon}
          </div>
          {!compact && <span className="text-sm font-medium">{label}</span>}
        </div>
        <div className="text-right">
          <span className="font-semibold">{current}</span>
          <span className="text-muted-foreground text-sm">/{target}{unit}</span>
        </div>
      </div>
      <Progress 
        value={percent} 
        className={cn("h-2", compact && "h-1.5")} 
      />
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining}${unit} remaining` : 'Goal reached!'}
        </p>
      )}
    </div>
  );
}

export function MacroTargetDisplay({ 
  consumed, 
  compact = false, 
  showHydration = true,
  className 
}: MacroTargetDisplayProps) {
  const { targets, loading, isProfileComplete, hasActiveGoal } = useDailyNutritionTargets(consumed);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-32 bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const CalorieRing = () => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (targets.caloriesPercent / 100) * circumference;

    return (
      <div className="relative w-28 h-28 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="56"
            cy="56"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame className="w-5 h-5 text-primary mb-0.5" />
          <span className="text-xl font-bold">{targets.consumedCalories}</span>
          <span className="text-xs text-muted-foreground">/ {targets.calories}</span>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <MacroItem
              icon={<Flame className="w-3.5 h-3.5 text-orange-500" />}
              label="Calories"
              current={targets.consumedCalories}
              target={targets.calories}
              unit=""
              color="bg-orange-500/10"
              compact
            />
            <MacroItem
              icon={<Beef className="w-3.5 h-3.5 text-red-500" />}
              label="Protein"
              current={targets.consumedProtein}
              target={targets.protein}
              unit="g"
              color="bg-red-500/10"
              compact
            />
            <MacroItem
              icon={<Wheat className="w-3.5 h-3.5 text-amber-500" />}
              label="Carbs"
              current={targets.consumedCarbs}
              target={targets.carbs}
              unit="g"
              color="bg-amber-500/10"
              compact
            />
            <MacroItem
              icon={<Cookie className="w-3.5 h-3.5 text-yellow-600" />}
              label="Fats"
              current={targets.consumedFats}
              target={targets.fats}
              unit="g"
              color="bg-yellow-600/10"
              compact
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Daily Targets</span>
          {!isProfileComplete && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
              Default targets
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Calorie Ring */}
        <CalorieRing />
        
        {/* Day Type Badge */}
        <div className="flex justify-center gap-2">
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize">
            {targets.dayType} Day
          </span>
          {hasActiveGoal && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full capitalize">
              {targets.goalType.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Macro Bars */}
        <div className="space-y-4">
          <MacroItem
            icon={<Beef className="w-4 h-4 text-red-500" />}
            label="Protein"
            current={targets.consumedProtein}
            target={targets.protein}
            unit="g"
            color="bg-red-500/10"
          />
          <MacroItem
            icon={<Wheat className="w-4 h-4 text-amber-500" />}
            label="Carbs"
            current={targets.consumedCarbs}
            target={targets.carbs}
            unit="g"
            color="bg-amber-500/10"
          />
          <MacroItem
            icon={<Cookie className="w-4 h-4 text-yellow-600" />}
            label="Fats"
            current={targets.consumedFats}
            target={targets.fats}
            unit="g"
            color="bg-yellow-600/10"
          />
          
          {showHydration && (
            <MacroItem
              icon={<Droplets className="w-4 h-4 text-blue-500" />}
              label="Hydration"
              current={targets.consumedHydration}
              target={targets.hydration}
              unit="oz"
              color="bg-blue-500/10"
            />
          )}
        </div>

        {/* TDEE Info */}
        {isProfileComplete && (
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>BMR: {targets.bmr} cal</span>
              <span>TDEE: {targets.tdee} cal</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
