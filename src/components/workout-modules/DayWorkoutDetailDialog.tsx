import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Dumbbell, Timer, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, ExperienceLevel, getAdjustedPercent, isExerciseObject } from '@/types/workout';
import { VaultWorkoutNotesDialog } from '@/components/vault/VaultWorkoutNotesDialog';
import { useVault, WeightIncrease } from '@/hooks/useVault';

interface DayWorkoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayData: {
    day: string;
    title: string;
    exercises: (string | Exercise)[];
  } | null;
  weekNumber: number;
  weekTitle: string;
  weekFocus: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  exerciseProgress: boolean[];
  onExerciseToggle: (index: number, completed: boolean) => void;
  weightLog: { [exerciseIndex: number]: number[] };
  onWeightUpdate: (exerciseIndex: number, setIndex: number, weight: number) => void;
  experienceLevel: ExperienceLevel;
  sport?: string;
  module?: string;
  subModule?: string;
  previousWeightLog?: { [exerciseIndex: number]: number[] };
}

export function DayWorkoutDetailDialog({
  open,
  onOpenChange,
  dayData,
  weekNumber,
  weekTitle,
  weekFocus,
  isCompleted,
  onToggleComplete,
  exerciseProgress,
  onExerciseToggle,
  weightLog,
  onWeightUpdate,
  experienceLevel,
  sport = 'baseball',
  module = 'hitting',
  subModule = 'iron-bambino',
  previousWeightLog = {},
}: DayWorkoutDetailDialogProps) {
  const { t } = useTranslation();
  const { saveWorkoutNote, checkVaultAccess } = useVault();
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [hasVaultAccess, setHasVaultAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const access = await checkVaultAccess();
      setHasVaultAccess(access);
    };
    checkAccess();
  }, [checkVaultAccess]);

  if (!dayData) return null;

  const completedCount = exerciseProgress.filter(Boolean).length;
  const totalExercises = dayData.exercises.length;
  const allComplete = completedCount === totalExercises;

  // Calculate weight increases by comparing current to previous workout
  const calculateWeightIncreases = (): WeightIncrease[] => {
    const increases: WeightIncrease[] = [];
    
    dayData.exercises.forEach((exercise, index) => {
      if (isExerciseObject(exercise) && exercise.type === 'strength' && exercise.trackWeight) {
        const currentWeights = weightLog[index] || [];
        const previousWeights = previousWeightLog[index] || [];
        
        // Get average weight for this exercise (current vs previous)
        const currentAvg = currentWeights.length > 0 
          ? currentWeights.reduce((a, b) => a + b, 0) / currentWeights.filter(w => w > 0).length 
          : 0;
        const previousAvg = previousWeights.length > 0 
          ? previousWeights.reduce((a, b) => a + b, 0) / previousWeights.filter(w => w > 0).length 
          : 0;
        
        if (currentAvg > previousAvg && previousAvg > 0) {
          increases.push({
            exercise_name: exercise.name,
            previous_weight: previousAvg,
            new_weight: currentAvg,
            increase_amount: currentAvg - previousAvg,
          });
        }
      }
    });
    
    return increases;
  };

  // Calculate total weight lifted
  const calculateTotalWeight = (): number => {
    let total = 0;
    
    dayData.exercises.forEach((exercise, index) => {
      if (isExerciseObject(exercise) && exercise.type === 'strength') {
        const weights = weightLog[index] || [];
        const reps = exercise.reps || 1;
        
        weights.forEach(weight => {
          if (weight > 0) {
            total += weight * reps;
          }
        });
      }
    });
    
    return total;
  };

  // Check if exercise has weight increase compared to previous
  const hasWeightIncrease = (exerciseIndex: number): boolean => {
    const currentWeights = weightLog[exerciseIndex] || [];
    const previousWeights = previousWeightLog[exerciseIndex] || [];
    
    if (currentWeights.length === 0 || previousWeights.length === 0) return false;
    
    const currentAvg = currentWeights.reduce((a, b) => a + b, 0) / currentWeights.filter(w => w > 0).length;
    const previousAvg = previousWeights.reduce((a, b) => a + b, 0) / previousWeights.filter(w => w > 0).length;
    
    return currentAvg > previousAvg && previousAvg > 0;
  };

  const handleWorkoutComplete = () => {
    onToggleComplete();
    
    // If user has vault access, show notes dialog
    if (hasVaultAccess) {
      setShowNotesDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleNotesSubmit = async (notes: string | null) => {
    const weightIncreases = calculateWeightIncreases();
    const totalWeight = calculateTotalWeight();
    const dayNumber = parseInt(dayData.day.replace('day', '')) || 1;
    
    const result = await saveWorkoutNote(
      sport,
      module,
      subModule,
      weekNumber,
      dayNumber,
      notes,
      weightIncreases,
      totalWeight
    );
    
    return result;
  };

  const renderExercise = (exercise: string | Exercise, index: number) => {
    const isExerciseComplete = exerciseProgress[index] || false;
    const showWeightIncrease = hasWeightIncrease(index);

    if (!isExerciseObject(exercise)) {
      // Skill exercise - simple display (fallback for legacy string exercises)
      return (
        <div
          key={index}
          onClick={() => onExerciseToggle(index, !isExerciseComplete)}
          className={cn(
            "flex items-start gap-3 p-2 sm:p-3 rounded-lg border transition-all cursor-pointer",
            "hover:border-primary/50",
            isExerciseComplete
              ? "bg-green-500/10 border-green-500/30"
              : "bg-muted/50 border-border/50"
          )}
        >
          <Checkbox
            checked={isExerciseComplete}
            onCheckedChange={(checked) => onExerciseToggle(index, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 flex-shrink-0"
          />
          <p className={cn(
            "text-sm flex-1 pt-0.5",
            isExerciseComplete && "line-through text-muted-foreground"
          )}>
            {exercise}
          </p>
        </div>
      );
    }

    // Skill exercise with description (new format)
    if (exercise.type === 'skill') {
      return (
        <div
          key={index}
          onClick={() => onExerciseToggle(index, !isExerciseComplete)}
          className={cn(
            "flex items-start gap-3 p-2 sm:p-3 rounded-lg border transition-all cursor-pointer",
            "hover:border-primary/50",
            isExerciseComplete
              ? "bg-green-500/10 border-green-500/30"
              : "bg-muted/50 border-border/50"
          )}
        >
          <Checkbox
            checked={isExerciseComplete}
            onCheckedChange={(checked) => onExerciseToggle(index, !!checked)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 space-y-1">
            <p className={cn(
              "text-sm font-medium",
              isExerciseComplete && "line-through text-muted-foreground"
            )}>
              {exercise.name}
            </p>
            {exercise.description && (
              <p className="text-xs text-muted-foreground">
                {exercise.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Strength or isometric exercise
    const adjustedPercent = exercise.percentOf1RM 
      ? getAdjustedPercent(exercise.percentOf1RM, experienceLevel)
      : null;
    const exerciseWeights = weightLog[index] || [];

    return (
      <div
        key={index}
        className={cn(
          "p-3 sm:p-4 rounded-lg border transition-all",
          isExerciseComplete
            ? "bg-green-500/10 border-green-500/30"
            : exercise.type === 'strength'
            ? "bg-orange-500/5 border-orange-500/20"
            : "bg-blue-500/5 border-blue-500/20"
        )}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isExerciseComplete}
            onCheckedChange={(checked) => onExerciseToggle(index, !!checked)}
            className="mt-1 flex-shrink-0"
          />
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {exercise.type === 'strength' ? (
                <Dumbbell className="h-4 w-4 text-orange-500" />
              ) : (
                <Timer className="h-4 w-4 text-blue-500" />
              )}
              <span className={cn(
                "font-medium text-sm sm:text-base",
                isExerciseComplete && "line-through text-muted-foreground"
              )}>
                {exercise.name}
              </span>
              {/* Green arrow for weight increase */}
              {showWeightIncrease && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {exercise.type === 'strength' && exercise.sets && exercise.reps && (
                <Badge variant="secondary" className="text-xs">
                  {t('workoutModules.setsReps', { sets: exercise.sets, reps: exercise.reps })}
                </Badge>
              )}
              {adjustedPercent && (
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                  <Target className="h-3 w-3 mr-1" />
                  {t('workoutModules.percentOf1RM', { percent: adjustedPercent })}
                </Badge>
              )}
              {exercise.type === 'isometric' && exercise.sets && exercise.holdTime && (
                <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">
                  {t('workoutModules.holdDuration', { sets: exercise.sets, seconds: exercise.holdTime })}
                </Badge>
              )}
            </div>

            {exercise.description && (
              <p className="text-xs text-muted-foreground">
                {exercise.description}
              </p>
            )}

            {exercise.notes && (
              <p className="text-xs text-muted-foreground/70 italic">
                💡 {exercise.notes}
              </p>
            )}

            {/* Weight tracking for strength exercises */}
            {exercise.type === 'strength' && exercise.trackWeight && exercise.sets && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('workoutModules.enterWeight')}
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                    <div key={setIdx} className="space-y-1">
                      <Label className="text-xs text-center block">
                        {t('workoutModules.setNumber', { number: setIdx + 1 })}
                      </Label>
                      <Input
                        type="number"
                        placeholder="lbs"
                        className="h-8 text-center text-sm"
                        value={exerciseWeights[setIdx] || ''}
                        onChange={(e) => {
                          const weight = parseFloat(e.target.value) || 0;
                          onWeightUpdate(index, setIdx, weight);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Set completion for isometric exercises */}
            {exercise.type === 'isometric' && exercise.sets && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: exercise.sets }).map((_, setIdx) => (
                  <Badge
                    key={setIdx}
                    variant={exerciseWeights[setIdx] ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all text-xs",
                      exerciseWeights[setIdx] 
                        ? "bg-blue-500 hover:bg-blue-600" 
                        : "hover:bg-blue-500/20"
                    )}
                    onClick={() => onWeightUpdate(index, setIdx, exerciseWeights[setIdx] ? 0 : 1)}
                  >
                    {t('workoutModules.setNumber', { number: setIdx + 1 })}
                    {exerciseWeights[setIdx] ? ' ✓' : ''}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-lg p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {t('workoutModules.week')} {weekNumber}
              </Badge>
              <Badge 
                variant={isCompleted ? 'default' : 'outline'} 
                className={cn(
                  'text-xs',
                  isCompleted && 'bg-green-500 hover:bg-green-600'
                )}
              >
                {isCompleted ? t('workoutModules.completed') : t('workoutModules.incomplete')}
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-xl">
              {dayData.title}
            </DialogTitle>
            <DialogDescription className="text-sm">
              <span className="font-medium text-primary">{weekTitle}</span>
              <span className="mx-2">•</span>
              <span>{weekFocus}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  {t('workoutModules.exercises')}
                </h4>
                <span className={cn(
                  "text-xs font-medium",
                  allComplete ? "text-green-500" : "text-muted-foreground"
                )}>
                  {t('workoutModules.exercisesCompleted', { count: completedCount, total: totalExercises })}
                </span>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {dayData.exercises.map((exercise, index) => renderExercise(exercise, index))}
              </div>
              {allComplete && (
                <p className="text-xs text-green-500 font-medium text-center mt-2">
                  {t('workoutModules.allExercisesComplete')}
                </p>
              )}
            </div>

            {/* Required Disclaimer Note */}
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                {t('workoutModules.unlockDisclaimer')}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                onClick={handleWorkoutComplete}
                variant={isCompleted ? 'outline' : 'default'}
                className="flex-1 gap-2"
                disabled={isCompleted}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t('workoutModules.alreadyCompleted')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t('workoutModules.workoutComplete')}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="sm:w-auto"
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vault Workout Notes Dialog */}
      <VaultWorkoutNotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        sport={sport}
        module={module}
        subModule={subModule}
        weekNumber={weekNumber}
        dayNumber={parseInt(dayData.day.replace('day', '')) || 1}
        dayTitle={dayData.title}
        weightIncreases={calculateWeightIncreases()}
        totalWeightLifted={calculateTotalWeight()}
        onSubmit={handleNotesSubmit}
      />
    </>
  );
}