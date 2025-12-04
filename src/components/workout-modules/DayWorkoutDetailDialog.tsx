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
}: DayWorkoutDetailDialogProps) {
  const { t } = useTranslation();

  if (!dayData) return null;

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
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              {t('workoutModules.exercises')}
            </h4>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {dayData.exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-sm flex-1 pt-0.5">{exercise}</p>
                </div>
              ))}
            </div>
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
