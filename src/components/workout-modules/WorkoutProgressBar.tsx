import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise } from '@/types/workout';

interface WorkoutProgressBarProps {
  currentExerciseIndex: number;
  totalExercises: number;
  currentSet: number;
  totalSets: number;
  exerciseType: 'strength' | 'isometric' | 'skill';
  exerciseName: string;
  onExit: () => void;
}

export function WorkoutProgressBar({
  currentExerciseIndex,
  totalExercises,
  currentSet,
  totalSets,
  exerciseType,
  exerciseName,
  onExit,
}: WorkoutProgressBarProps) {
  const { t } = useTranslation();
  
  const progressPercent = ((currentExerciseIndex + (currentSet - 1) / totalSets) / totalExercises) * 100;

  const getTypeIcon = () => {
    switch (exerciseType) {
      case 'strength':
        return <Dumbbell className="h-4 w-4" />;
      case 'isometric':
        return <Timer className="h-4 w-4" />;
      case 'skill':
        return <Zap className="h-4 w-4" />;
    }
  };

  const getTypeBadgeClass = () => {
    switch (exerciseType) {
      case 'strength':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'isometric':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'skill':
        return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
    }
  };

  const getTypeLabel = () => {
    switch (exerciseType) {
      case 'strength':
        return t('workoutFullScreen.heavyLift');
      case 'isometric':
        return t('workoutFullScreen.isometricHold');
      case 'skill':
        return t('workoutFullScreen.skillWork');
    }
  };

  return (
    <div className="w-full">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('workoutFullScreen.exitFullScreen')}
        </Button>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("gap-1.5", getTypeBadgeClass())}>
            {getTypeIcon()}
            {getTypeLabel()}
          </Badge>
          
          <Badge variant="secondary" className="tabular-nums">
            {currentExerciseIndex + 1} / {totalExercises}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out",
            exerciseType === 'strength' && "bg-gradient-to-r from-orange-500 to-yellow-500",
            exerciseType === 'isometric' && "bg-gradient-to-r from-blue-500 to-cyan-500",
            exerciseType === 'skill' && "bg-gradient-to-r from-emerald-500 to-green-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
        
        {/* Exercise Markers */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: totalExercises }).map((_, idx) => (
            <div
              key={idx}
              className="flex-1 relative"
            >
              {idx < totalExercises - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-background/50" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Exercise Info */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-muted-foreground truncate max-w-[60%]">
          {exerciseName}
        </span>
        <span className="text-muted-foreground">
          {t('workoutFullScreen.setsRemaining', { count: totalSets - currentSet + 1 })}
        </span>
      </div>
    </div>
  );
}
