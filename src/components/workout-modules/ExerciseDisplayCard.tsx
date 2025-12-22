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
}

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
}: ExerciseDisplayCardProps) {
  const { t } = useTranslation();

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
    if (!adjustedPercent) return 'bg-muted';
    if (adjustedPercent >= 80) return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    if (adjustedPercent >= 65) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    return 'bg-green-500/20 text-green-500 border-green-500/30';
  };

  const getExerciseIcon = () => {
    if (exercise.type === 'strength') {
      return <Dumbbell className="h-10 w-10 text-orange-500" />;
    }
    if (exercise.type === 'isometric') {
      return <Timer className="h-10 w-10 text-blue-500" />;
    }
    return <Target className="h-10 w-10 text-emerald-500" />;
  };

  const getBackgroundGradient = () => {
    if (exercise.type === 'strength') {
      return 'from-orange-500/10 via-transparent to-transparent';
    }
    if (exercise.type === 'isometric') {
      return 'from-blue-500/10 via-transparent to-transparent';
    }
    return 'from-emerald-500/10 via-transparent to-transparent';
  };

  return (
    <div className={cn(
      "relative rounded-3xl border border-border/50 p-8 bg-gradient-to-br",
      getBackgroundGradient()
    )}>
      {/* Set Progress Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalSets }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-3 w-3 rounded-full transition-all duration-300",
              completedSets.includes(idx)
                ? "bg-green-500 scale-110"
                : idx === currentSet - 1
                ? "bg-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Exercise Icon & Name */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex p-4 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50">
          {getExerciseIcon()}
        </div>
        
        <h2 className="text-3xl font-bold text-foreground">
          {exercise.name}
        </h2>

        {/* Exercise Details */}
        <div className="flex flex-wrap justify-center gap-3">
          {exercise.type === 'strength' && exercise.sets && exercise.reps && (
            <Badge variant="secondary" className="text-base px-4 py-1.5">
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
            <Badge variant="secondary" className="text-base px-4 py-1.5 bg-blue-500/20 text-blue-500">
              <Timer className="h-4 w-4 mr-1.5" />
              {exercise.holdTime}s hold
            </Badge>
          )}
          
          {getIntensityLabel() && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              {getIntensityLabel()}
            </Badge>
          )}
        </div>
      </div>

      {/* Current Set Indicator */}
      <div className="text-center mb-6">
        <span className="text-5xl font-bold text-primary">
          {t('workoutFullScreen.nextSet', { number: currentSet })}
        </span>
        <span className="text-2xl text-muted-foreground ml-2">
          / {totalSets}
        </span>
      </div>

      {/* Pro Tips */}
      {(exercise.description || exercise.notes) && (
        <div className="mb-8 p-4 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              {exercise.description && (
                <p className="text-sm text-foreground">
                  {exercise.description}
                </p>
              )}
              {exercise.notes && (
                <p className="text-sm text-muted-foreground italic">
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
          <Label className="text-sm text-muted-foreground block text-center mb-3">
            {t('workoutModules.enterWeight')}
          </Label>
          <div className="flex justify-center">
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                className="h-16 w-32 text-center text-2xl font-bold"
                value={exerciseWeights[currentSet - 1] || ''}
                onChange={(e) => {
                  const weight = parseFloat(e.target.value) || 0;
                  onWeightUpdate(currentSet - 1, weight);
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
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
          className="h-16 text-xl font-semibold gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
        >
          <CheckCircle2 className="h-6 w-6" />
          {t('workoutFullScreen.completeSet')}
        </Button>
        
        <Button
          variant="ghost"
          size="lg"
          onClick={onSkipExercise}
          className="h-12 text-muted-foreground hover:text-foreground"
        >
          {t('workoutFullScreen.skipExercise')}
        </Button>
      </div>
    </div>
  );
}
