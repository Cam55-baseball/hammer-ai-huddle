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
import { CheckCircle2, Circle, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayWorkoutDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayData: {
    day: string;
    title: string;
    exercises: string[];
  } | null;
  weekNumber: number;
  weekTitle: string;
  weekFocus: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  exerciseProgress: boolean[];
  onExerciseToggle: (index: number, completed: boolean) => void;
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
}: DayWorkoutDetailDialogProps) {
  const { t } = useTranslation();

  if (!dayData) return null;

  const completedCount = exerciseProgress.filter(Boolean).length;
  const totalExercises = dayData.exercises.length;
  const allComplete = completedCount === totalExercises;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-md p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
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
              {dayData.exercises.map((exercise, index) => {
                const isExerciseComplete = exerciseProgress[index] || false;
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
              })}
            </div>
            {allComplete && (
              <p className="text-xs text-green-500 font-medium text-center mt-2">
                {t('workoutModules.allExercisesComplete')}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <Button
              onClick={() => {
                onToggleComplete();
                onOpenChange(false);
              }}
              variant={isCompleted ? 'outline' : 'default'}
              className="flex-1 gap-2"
            >
              {isCompleted ? (
                <>
                  <Circle className="h-4 w-4" />
                  {t('workoutModules.markIncomplete')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t('workoutModules.markComplete')}
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
  );
}
