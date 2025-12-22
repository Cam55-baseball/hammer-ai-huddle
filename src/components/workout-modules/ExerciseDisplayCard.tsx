import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Timer, Target, Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, ExperienceLevel, getAdjustedPercent } from '@/types/workout';

interface ExerciseDisplayCardProps {
  exercise: Exercise;
  currentSet: number;
  totalSets: number;
  experienceLevel: ExperienceLevel;
  exerciseWeights: number[];
  onWeightUpdate: (setIndex: number, weight: number) => void;
  onCompleteSet: () => void;
  onSkipExercise: () => void;
  completedSets: number[];
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

export function ExerciseDisplayCard({
  exercise,
  currentSet,
  totalSets,
  experienceLevel,
  exerciseWeights,
  onWeightUpdate,
  onCompleteSet,
  onSkipExercise,
  completedSets,
  sport = 'baseball',
}: ExerciseDisplayCardProps) {
  const { t } = useTranslation();

  const isSoftball = sport === 'softball';
  const colors = getSportColors(sport, exercise.type || 'skill');

  const adjustedPercent = exercise.percentOf1RM
    ? getAdjustedPercent(exercise.percentOf1RM, experienceLevel)
    : null;

  const getIntensityLabel = () => {
    if (!adjustedPercent) return null;
    if (adjustedPercent >= 80) return t('workoutFullScreen.heavyLift');
    if (adjustedPercent >= 65) return t('workoutFullScreen.moderateLift');
    return t('workoutFullScreen.lightWork');
  };

  const getIntensityColor = () => {
    if (!adjustedPercent) return 'bg-gray-800 text-gray-300';
    if (isSoftball) {
      if (adjustedPercent >= 80) return 'bg-pink-400/20 text-pink-400 border-pink-400/50 shadow-[0_0_10px_rgba(244,114,182,0.3)]';
      if (adjustedPercent >= 65) return 'bg-green-400/20 text-green-400 border-green-400/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]';
      return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]';
    }
    if (adjustedPercent >= 80) return 'bg-orange-400/20 text-orange-400 border-orange-400/50 shadow-[0_0_10px_rgba(251,146,60,0.3)]';
    if (adjustedPercent >= 65) return 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
    return 'bg-lime-400/20 text-lime-400 border-lime-400/50 shadow-[0_0_10px_rgba(163,230,53,0.3)]';
  };

  const getExerciseIcon = () => {
    if (exercise.type === 'strength') {
      return <Dumbbell className={cn("h-10 w-10", isSoftball ? "text-pink-400 drop-shadow-[0_0_12px_rgba(244,114,182,0.8)]" : "text-orange-400 drop-shadow-[0_0_12px_rgba(251,146,60,0.8)]")} />;
    }
    if (exercise.type === 'isometric') {
      return <Timer className={cn("h-10 w-10", isSoftball ? "text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" : "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]")} />;
    }
    return <Target className={cn("h-10 w-10", isSoftball ? "text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" : "text-lime-400 drop-shadow-[0_0_12px_rgba(163,230,53,0.8)]")} />;
  };

  const getBackgroundGradient = () => {
    if (isSoftball) {
      if (exercise.type === 'strength') return 'bg-black/60 border-pink-400/40 shadow-[0_0_30px_rgba(244,114,182,0.15)]';
      if (exercise.type === 'isometric') return 'bg-black/60 border-green-400/40 shadow-[0_0_30px_rgba(74,222,128,0.15)]';
      return 'bg-black/60 border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.15)]';
    }
    if (exercise.type === 'strength') return 'bg-black/60 border-orange-400/40 shadow-[0_0_30px_rgba(251,146,60,0.15)]';
    if (exercise.type === 'isometric') return 'bg-black/60 border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.15)]';
    return 'bg-black/60 border-lime-400/40 shadow-[0_0_30px_rgba(163,230,53,0.15)]';
  };

  const getNeonColor = () => {
    if (isSoftball) {
      if (exercise.type === 'strength') return 'pink';
      if (exercise.type === 'isometric') return 'green';
      return 'yellow';
    }
    if (exercise.type === 'strength') return 'orange';
    if (exercise.type === 'isometric') return 'cyan';
    return 'lime';
  };

  const neonColor = getNeonColor();

  return (
    <div className={cn(
      "relative rounded-3xl border p-8",
      getBackgroundGradient()
    )}>
      {/* Set Progress Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSets }).map((_, idx) => {
          const completeColor = isSoftball ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]';
          return (
            <div
              key={idx}
              className={cn(
                "h-3 w-3 rounded-full transition-all duration-300",
                completedSets.includes(idx)
                  ? `${completeColor} scale-110`
                  : idx === currentSet - 1
                  ? cn(
                      "scale-110 ring-2 ring-offset-2 ring-offset-black",
                      neonColor === 'orange' && "bg-orange-400 ring-orange-400/50 shadow-[0_0_8px_rgba(251,146,60,0.8)]",
                      neonColor === 'cyan' && "bg-cyan-400 ring-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
                      neonColor === 'lime' && "bg-lime-400 ring-lime-400/50 shadow-[0_0_8px_rgba(163,230,53,0.8)]",
                      neonColor === 'pink' && "bg-pink-400 ring-pink-400/50 shadow-[0_0_8px_rgba(244,114,182,0.8)]",
                      neonColor === 'green' && "bg-green-400 ring-green-400/50 shadow-[0_0_8px_rgba(74,222,128,0.8)]",
                      neonColor === 'yellow' && "bg-yellow-400 ring-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                    )
                  : "bg-gray-700"
              )}
            />
          );
        })}
      </div>

      {/* Exercise Icon & Name */}
      <div className="text-center space-y-4 mb-8">
        <div className={cn(
          "inline-flex p-4 rounded-2xl bg-black/50 backdrop-blur-sm border",
          neonColor === 'orange' && "border-orange-400/30",
          neonColor === 'cyan' && "border-cyan-400/30",
          neonColor === 'lime' && "border-lime-400/30",
          neonColor === 'pink' && "border-pink-400/30",
          neonColor === 'green' && "border-green-400/30",
          neonColor === 'yellow' && "border-yellow-400/30"
        )}>
          {getExerciseIcon()}
        </div>
        
        <h2 className="text-3xl font-bold text-white">
          {exercise.name}
        </h2>

        {/* Exercise Details */}
        <div className="flex flex-wrap justify-center gap-3">
          {exercise.type === 'strength' && exercise.sets && exercise.reps && (
            <Badge variant="secondary" className="text-base px-4 py-1.5 bg-gray-800 text-white border-gray-600">
              {exercise.sets} × {exercise.reps}
            </Badge>
          )}
          
          {adjustedPercent && (
            <Badge className={cn("text-base px-4 py-1.5 border", getIntensityColor())}>
              <Target className="h-4 w-4 mr-1.5" />
              {adjustedPercent}% 1RM
            </Badge>
          )}
          
          {exercise.type === 'isometric' && exercise.holdTime && (
            <Badge variant="secondary" className={cn(
              "text-base px-4 py-1.5 border",
              isSoftball 
                ? "bg-green-400/20 text-green-400 border-green-400/30"
                : "bg-cyan-400/20 text-cyan-400 border-cyan-400/30"
            )}>
              <Timer className="h-4 w-4 mr-1.5" />
              {exercise.holdTime}s hold
            </Badge>
          )}
          
          {getIntensityLabel() && (
            <Badge variant="outline" className="text-sm px-3 py-1 border-gray-600 text-gray-300">
              {getIntensityLabel()}
            </Badge>
          )}
        </div>
      </div>

      {/* Current Set Indicator */}
      <div className="text-center mb-6">
        <span className={cn(
          "text-5xl font-bold",
          neonColor === 'orange' && "text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.6)]",
          neonColor === 'cyan' && "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]",
          neonColor === 'lime' && "text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.6)]",
          neonColor === 'pink' && "text-pink-400 drop-shadow-[0_0_15px_rgba(244,114,182,0.6)]",
          neonColor === 'green' && "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)]",
          neonColor === 'yellow' && "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
        )}>
          {t('workoutFullScreen.nextSet', { number: currentSet })}
        </span>
        <span className="text-2xl text-gray-400 ml-2">
          / {totalSets}
        </span>
      </div>

      {/* Pro Tips */}
      {(exercise.description || exercise.notes) && (
        <div className="mb-8 p-4 rounded-xl bg-black/40 border border-gray-700/50">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              {exercise.description && (
                <p className="text-sm text-white">
                  {exercise.description}
                </p>
              )}
              {exercise.notes && (
                <p className="text-sm text-gray-400 italic">
                  {exercise.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weight Input for Strength Exercises */}
      {exercise.type === 'strength' && exercise.trackWeight && (
        <div className="mb-8">
          <Label className="text-sm text-gray-300 block text-center mb-3">
            {t('workoutModules.enterWeight')}
          </Label>
          <div className="flex justify-center">
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                className={cn(
                  "h-16 w-32 text-center text-2xl font-bold bg-black/50 text-white placeholder:text-gray-600",
                  isSoftball 
                    ? "border-pink-400/30 focus:border-pink-400 focus:ring-pink-400/30"
                    : "border-orange-400/30 focus:border-orange-400 focus:ring-orange-400/30"
                )}
                value={exerciseWeights[currentSet - 1] || ''}
                onChange={(e) => {
                  const weight = parseFloat(e.target.value) || 0;
                  onWeightUpdate(currentSet - 1, weight);
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                lbs
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          onClick={onCompleteSet}
          className={cn(
            "h-16 text-xl font-bold gap-3",
            neonColor === 'orange' && "bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_25px_rgba(251,146,60,0.5)]",
            neonColor === 'cyan' && "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_25px_rgba(34,211,238,0.5)]",
            neonColor === 'lime' && "bg-lime-500 hover:bg-lime-400 text-black shadow-[0_0_25px_rgba(163,230,53,0.5)]",
            neonColor === 'pink' && "bg-pink-500 hover:bg-pink-400 text-black shadow-[0_0_25px_rgba(244,114,182,0.5)]",
            neonColor === 'green' && "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_25px_rgba(74,222,128,0.5)]",
            neonColor === 'yellow' && "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_25px_rgba(250,204,21,0.5)]"
          )}
        >
          <CheckCircle2 className="h-6 w-6" />
          {t('workoutFullScreen.completeSet')}
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          onClick={onSkipExercise}
          className="h-12 text-gray-400 hover:text-white hover:bg-white/10"
        >
          {t('workoutFullScreen.skipExercise')}
        </Button>
      </div>
    </div>
  );
}
