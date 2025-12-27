import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
  { value: 'pre_workout', label: 'Pre-Workout', icon: '💪' },
  { value: 'post_workout', label: 'Post-Workout', icon: '🏃' },
];

interface MealTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mealType: string) => void;
  title?: string;
}

export function MealTypeSelector({
  open,
  onOpenChange,
  onSelect,
  title,
}: MealTypeSelectorProps) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState('');

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType);
      setSelectedType('');
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSelectedType('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title || t('nutrition.selectMealType', 'Select Meal Type')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          {MEAL_TYPES.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              className="justify-start gap-2 h-12"
              onClick={() => setSelectedType(type.value)}
            >
              <span className="text-lg">{type.icon}</span>
              {t(`nutrition.mealTypes.${type.value}`, type.label)}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedType}>
            {t('nutrition.continue', 'Continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
