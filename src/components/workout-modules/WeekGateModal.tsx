import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lock, Target } from 'lucide-react';

interface WeekGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetWeek: number;
  currentWeek: number;
  currentWeekPercent: number;
  requiredPercent?: number;
}

export function WeekGateModal({
  open,
  onOpenChange,
  targetWeek,
  currentWeek,
  currentWeekPercent,
  requiredPercent = 70,
}: WeekGateModalProps) {
  const { t } = useTranslation();
  const remaining = requiredPercent - currentWeekPercent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            {t('workoutModules.weekLocked')}
          </DialogTitle>
          <DialogDescription>
            {t('workoutModules.weekLockedDescription', { week: targetWeek })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('workoutModules.week')} {currentWeek} {t('workoutModules.progress')}
              </span>
              <span className="text-sm font-bold">{currentWeekPercent}%</span>
            </div>
            <Progress value={currentWeekPercent} className="h-3" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>
                {t('workoutModules.needToComplete', {
                  percent: requiredPercent,
                  remaining: Math.max(0, remaining),
                })}
              </span>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {t('workoutModules.keepGoingMessage')}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            {t('workoutModules.backToWorkout')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
