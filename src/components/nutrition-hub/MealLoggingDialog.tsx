import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, List } from 'lucide-react';
import { MealBuilder } from '@/components/custom-activities/MealBuilder';
import { useMealVaultSync } from '@/hooks/useMealVaultSync';
import { MealData } from '@/types/customActivity';
import { toast } from 'sonner';

interface MealLoggingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  onMealSaved?: () => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

const getDefaultMealData = (): MealData => ({
  items: [],
  vitamins: [],
  supplements: [],
  hydration: {
    amount: 0,
    unit: 'oz',
    goal: 100,
    entries: [],
  },
});

export function MealLoggingDialog({
  open,
  onOpenChange,
  mealType,
  onMealSaved,
}: MealLoggingDialogProps) {
  const { t } = useTranslation();
  const { syncMealToVault } = useMealVaultSync();
  
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [saving, setSaving] = useState(false);
  
  // Quick entry state
  const [mealTitle, setMealTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  
  // Detailed entry state (MealBuilder)
  const [mealData, setMealData] = useState<MealData>(getDefaultMealData());

  const mealTypeLabel = MEAL_TYPE_LABELS[mealType] || mealType;

  const resetForm = () => {
    setMealTitle('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setMealData(getDefaultMealData());
    setMode('quick');
  };

  const handleSaveQuickEntry = async () => {
    const caloriesNum = parseInt(calories) || 0;
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatsNum = parseFloat(fats) || 0;

    if (caloriesNum === 0 && proteinNum === 0 && carbsNum === 0 && fatsNum === 0) {
      toast.error('Please enter at least one value');
      return;
    }

    setSaving(true);
    try {
      // Create a minimal MealData structure for quick entry
      const quickMealData: MealData = {
        items: [{
          id: crypto.randomUUID(),
          name: mealTitle || mealTypeLabel,
          calories: caloriesNum,
          protein: proteinNum,
          carbs: carbsNum,
          fats: fatsNum,
          quantity: 1,
          unit: 'serving',
        }],
        vitamins: [],
        supplements: [],
        hydration: { amount: 0, unit: 'oz', goal: 100, entries: [] },
      };

      const result = await syncMealToVault(quickMealData, {
        syncToVault: true,
        mealType,
        mealTitle: mealTitle || undefined,
      });

      if (result.success) {
        toast.success('Meal logged successfully');
        resetForm();
        onOpenChange(false);
        onMealSaved?.();
      } else {
        toast.error(result.error || 'Failed to log meal');
      }
    } catch (error) {
      console.error('Error saving quick entry:', error);
      toast.error('Failed to log meal');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetailedEntry = async () => {
    if (mealData.items.length === 0) {
      toast.error('Please add at least one food item');
      return;
    }

    setSaving(true);
    try {
      const result = await syncMealToVault(mealData, {
        syncToVault: true,
        mealType,
        mealTitle: mealTitle || undefined,
      });

      if (result.success) {
        toast.success('Meal logged successfully');
        resetForm();
        onOpenChange(false);
        onMealSaved?.();
      } else {
        toast.error(result.error || 'Failed to log meal');
      }
    } catch (error) {
      console.error('Error saving detailed entry:', error);
      toast.error('Failed to log meal');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (mode === 'quick') {
      handleSaveQuickEntry();
    } else {
      handleSaveDetailedEntry();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Log {mealTypeLabel}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'detailed')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Entry
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Detailed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4 mt-4">
            {/* Meal Title */}
            <div className="space-y-2">
              <Label htmlFor="meal-title">Meal Title (optional)</Label>
              <Input
                id="meal-title"
                placeholder={`e.g., ${mealTypeLabel} bowl`}
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
              />
            </div>

            {/* Macro Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  placeholder="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  placeholder="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  placeholder="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fats">Fats (g)</Label>
                <Input
                  id="fats"
                  type="number"
                  placeholder="0"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  className="text-center text-lg font-semibold"
                />
              </div>
            </div>

            {/* Quick summary */}
            {(calories || protein || carbs || fats) && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <span className="font-medium">Total: </span>
                {calories && <span>{calories} cal</span>}
                {protein && <span> • {protein}g P</span>}
                {carbs && <span> • {carbs}g C</span>}
                {fats && <span> • {fats}g F</span>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="detailed" className="mt-4">
            {/* Meal Title for detailed too */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="meal-title-detailed">Meal Title (optional)</Label>
              <Input
                id="meal-title-detailed"
                placeholder={`e.g., ${mealTypeLabel} bowl`}
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
              />
            </div>

            <MealBuilder
              meals={mealData}
              onChange={setMealData}
              showVaultSync={false}
            />
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Meal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
