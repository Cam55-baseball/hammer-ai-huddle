import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dumbbell, TrendingUp, NotebookPen } from 'lucide-react';
import { WeightIncrease } from '@/hooks/useVault';

interface VaultWorkoutNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: string;
  module: string;
  subModule: string;
  weekNumber: number;
  dayNumber: number;
  dayTitle: string;
  weightIncreases: WeightIncrease[];
  totalWeightLifted: number;
  onSubmit: (notes: string | null) => Promise<{ success: boolean; error?: string }>;
}

export function VaultWorkoutNotesDialog({
  open,
  onOpenChange,
  sport,
  module,
  subModule,
  weekNumber,
  dayNumber,
  dayTitle,
  weightIncreases,
  totalWeightLifted,
  onSubmit,
}: VaultWorkoutNotesDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await onSubmit(notes || null);
    setLoading(false);
    
    if (result.success) {
      setNotes('');
      onOpenChange(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    await onSubmit(null);
    setLoading(false);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg sm:text-xl">
              {t('vault.workoutNotes.title')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('vault.workoutNotes.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Workout Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('workoutModules.week')} {weekNumber}
            </Badge>
            <Badge variant="outline">
              {dayTitle}
            </Badge>
          </div>

          {/* Weight Increases */}
          {weightIncreases.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-green-500">
                <TrendingUp className="h-4 w-4" />
                {t('vault.workoutNotes.weightIncreases')}
              </Label>
              <ScrollArea className="max-h-[120px]">
                <div className="space-y-1">
                  {weightIncreases.map((increase, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-green-500/10 border border-green-500/20"
                    >
                      <span className="text-sm font-medium">{increase.exercise_name}</span>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">{increase.previous_weight}</span>
                        <span className="text-green-500">→</span>
                        <span className="text-green-500 font-bold">{increase.new_weight}</span>
                        <span className="text-xs text-green-500">(+{increase.increase_amount})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Total Weight Lifted */}
          {totalWeightLifted > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{t('vault.workoutNotes.totalLifted')}</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {totalWeightLifted.toLocaleString()} lbs
              </span>
            </div>
          )}

          {/* Notes Input */}
          <div className="space-y-2">
            <Label>{t('vault.workoutNotes.notesLabel')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('vault.workoutNotes.notesPlaceholder')}
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? t('common.loading') : t('vault.workoutNotes.saveNotes')}
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={loading}
              className="sm:w-auto"
            >
              {t('vault.workoutNotes.skipNotes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
