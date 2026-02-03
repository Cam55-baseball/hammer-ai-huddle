import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Settings, ChevronRight } from 'lucide-react';
import { useAthleteGoals } from '@/hooks/useAthleteGoals';
import { useTDEE } from '@/hooks/useTDEE';
import type { GoalType } from '@/utils/tdeeCalculations';
import { toast } from 'sonner';

interface NutritionHubSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalChanged?: () => void;
  onEditProfile?: () => void;
}

const GOAL_OPTIONS: { value: GoalType; calorieAdjustment: number }[] = [
  { value: 'lose_weight', calorieAdjustment: -500 },
  { value: 'lose_fat', calorieAdjustment: -300 },
  { value: 'maintain', calorieAdjustment: 0 },
  { value: 'gain_lean_muscle', calorieAdjustment: 300 },
  { value: 'gain_weight', calorieAdjustment: 500 },
];

export function NutritionHubSettings({
  open,
  onOpenChange,
  onGoalChanged,
  onEditProfile,
}: NutritionHubSettingsProps) {
  const { t } = useTranslation();
  const { activeGoal, createGoal } = useAthleteGoals();
  const { biometrics, refetch: refetchTDEE } = useTDEE();
  
  const [selectedGoal, setSelectedGoal] = useState<GoalType>(
    activeGoal?.goalType || 'maintain'
  );
  const [saving, setSaving] = useState(false);

  // Sync selected goal with active goal when dialog opens
  useEffect(() => {
    if (open && activeGoal) {
      setSelectedGoal(activeGoal.goalType);
    }
  }, [open, activeGoal]);

  const getGoalTypeLabel = (goalType: string) => {
    const key = `nutrition.goalTypes.${goalType}`;
    const translated = t(key);
    return translated === key ? goalType.replace(/_/g, ' ') : translated;
  };

  const handleUpdateGoal = async () => {
    if (selectedGoal === activeGoal?.goalType) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    
    try {
      await createGoal({
        goalType: selectedGoal,
        startingWeightLbs: biometrics?.weightLbs ?? undefined,
      });
      
      await refetchTDEE();
      toast.success(t('nutrition.settings.goalUpdated'));
      onGoalChanged?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update goal:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = () => {
    onOpenChange(false);
    onEditProfile?.();
  };

  const currentGoalOption = GOAL_OPTIONS.find(g => g.value === selectedGoal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('nutrition.settings.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Goal Display */}
          {activeGoal && (
            <div className="text-sm text-muted-foreground">
              {t('nutrition.settings.currentGoal')}:{' '}
              <span className="font-medium text-foreground">
                {getGoalTypeLabel(activeGoal.goalType)}
              </span>
            </div>
          )}

          {/* Goal Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('nutrition.settings.selectGoal')}
            </Label>
            
            <RadioGroup
              value={selectedGoal}
              onValueChange={(value) => setSelectedGoal(value as GoalType)}
              className="space-y-2"
            >
              {GOAL_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="cursor-pointer font-normal"
                    >
                      {getGoalTypeLabel(option.value)}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {option.calorieAdjustment > 0 ? '+' : ''}
                    {option.calorieAdjustment}{' '}
                    {option.calorieAdjustment !== 0
                      ? option.calorieAdjustment > 0
                        ? t('nutrition.settings.surplus')
                        : t('nutrition.settings.deficit')
                      : ''}
                  </span>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Update Button */}
          <Button
            onClick={handleUpdateGoal}
            disabled={saving || selectedGoal === activeGoal?.goalType}
            className="w-full"
          >
            {saving ? t('common.loading') : t('nutrition.settings.updateGoal')}
          </Button>

          <Separator />

          {/* Edit Profile Link */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('nutrition.settings.profileSettingsNote')}
            </p>
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={handleEditProfile}
            >
              {t('nutrition.settings.editProfile')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
