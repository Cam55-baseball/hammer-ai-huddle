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
  sport?: 'baseball' | 'softball';
}

// Sport-aware neon color helper
const getSportColors = (sport: 'baseball' | 'softball', type: 'strength' | 'isometric' | 'skill') => {
  if (sport === 'softball') {
    switch (type) {
      case 'strength': return { tw: 'pink', hex: '#f472b6', shadow: 'rgba(244,114,182,' };
      case 'isometric': return { tw: 'green', hex: '#4ade80', shadow: 'rgba(74,222,128,' };
      case 'skill': return { tw: 'yellow', hex: '#facc15', shadow: 'rgba(250,204,21,' };
    }
  }
  switch (type) {
    case 'strength': return { tw: 'orange', hex: '#fb923c', shadow: 'rgba(251,146,60,' };
    case 'isometric': return { tw: 'cyan', hex: '#22d3ee', shadow: 'rgba(34,211,238,' };
    case 'skill': return { tw: 'lime', hex: '#a3e635', shadow: 'rgba(163,230,53,' };
  }
};

export function WorkoutProgressBar({
  currentExerciseIndex,
  totalExercises,
  currentSet,
  totalSets,
  exerciseType,
  exerciseName,
  onExit,
  sport = 'baseball',
}: WorkoutProgressBarProps) {
  const { t } = useTranslation();
  
  const progressPercent = ((currentExerciseIndex + (currentSet - 1) / totalSets) / totalExercises) * 100;
  const colors = getSportColors(sport, exerciseType);
  const isSoftball = sport === 'softball';

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
    if (isSoftball) {
      switch (exerciseType) {
        case 'strength':
          return 'bg-pink-500/20 text-pink-400 border-pink-500/50 shadow-[0_0_10px_rgba(244,114,182,0.3)]';
        case 'isometric':
          return 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]';
        case 'skill':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]';
      }
    }
    switch (exerciseType) {
      case 'strength':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(255,107,53,0.3)]';
      case 'isometric':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(0,245,255,0.3)]';
      case 'skill':
        return 'bg-lime-500/20 text-lime-400 border-lime-500/50 shadow-[0_0_10px_rgba(57,255,20,0.3)]';
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

  const getProgressBarGlow = () => {
    if (isSoftball) {
      switch (exerciseType) {
        case 'strength':
          return 'shadow-[0_0_15px_rgba(244,114,182,0.5)]';
        case 'isometric':
          return 'shadow-[0_0_15px_rgba(74,222,128,0.5)]';
        case 'skill':
          return 'shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      }
    }
    switch (exerciseType) {
      case 'strength':
        return 'shadow-[0_0_15px_rgba(255,107,53,0.5)]';
      case 'isometric':
        return 'shadow-[0_0_15px_rgba(0,245,255,0.5)]';
      case 'skill':
        return 'shadow-[0_0_15px_rgba(57,255,20,0.5)]';
    }
  };

  const getProgressBarGradient = () => {
    if (isSoftball) {
      switch (exerciseType) {
        case 'strength':
          return "bg-gradient-to-r from-pink-500 to-pink-400";
        case 'isometric':
          return "bg-gradient-to-r from-green-500 to-green-400";
        case 'skill':
          return "bg-gradient-to-r from-yellow-500 to-yellow-400";
      }
    }
    switch (exerciseType) {
      case 'strength':
        return "bg-gradient-to-r from-orange-500 to-orange-400";
      case 'isometric':
        return "bg-gradient-to-r from-cyan-500 to-cyan-400";
      case 'skill':
        return "bg-gradient-to-r from-lime-500 to-lime-400";
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
          className="gap-2 text-gray-300 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('workoutFullScreen.exitFullScreen')}
        </Button>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("gap-1.5", getTypeBadgeClass())}>
            {getTypeIcon()}
            {getTypeLabel()}
          </Badge>
          
          <Badge variant="secondary" className="tabular-nums bg-white/10 text-white border-white/20">
            {currentExerciseIndex + 1} / {totalExercises}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out",
            getProgressBarGradient(),
            getProgressBarGlow()
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
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-black/50" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Exercise Info */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-white truncate max-w-[60%]">
          {exerciseName}
        </span>
        <span className="text-gray-400">
          {t('workoutFullScreen.setsRemaining', { count: totalSets - currentSet + 1 })}
        </span>
      </div>
    </div>
  );
}
