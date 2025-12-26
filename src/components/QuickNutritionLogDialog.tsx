import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Apple, Coffee, Salad, UtensilsCrossed, Cookie, Droplets, Zap, Dumbbell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuickNutritionLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const MACRO_PRESETS = [
  { id: 'pre_workout', calories: 350, protein: 20, carbs: 50, fats: 8, icon: Zap },
  { id: 'post_workout', calories: 500, protein: 40, carbs: 60, fats: 12, icon: Dumbbell },
  { id: 'protein_shake', calories: 200, protein: 30, carbs: 10, fats: 5, icon: Droplets },
  { id: 'light_meal', calories: 400, protein: 20, carbs: 45, fats: 15, icon: Coffee },
  { id: 'power_meal', calories: 700, protein: 45, carbs: 70, fats: 25, icon: Salad },
];

export function QuickNutritionLogDialog({ open, onOpenChange, onSuccess }: QuickNutritionLogDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [mealType, setMealType] = useState<string>('');
  const [mealTitle, setMealTitle] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [hydration, setHydration] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<number>(5);

  const mealTypeOptions = [
    { value: 'breakfast', icon: Coffee, label: t('vault.nutrition.breakfast') },
    { value: 'lunch', icon: Salad, label: t('vault.nutrition.lunch') },
    { value: 'dinner', icon: UtensilsCrossed, label: t('vault.nutrition.dinner') },
    { value: 'snack', icon: Cookie, label: t('vault.nutrition.snack') },
    { value: 'hydration', icon: Droplets, label: t('vault.nutrition.hydrationOnly') },
  ];

  const resetForm = () => {
    setMealType('');
    setMealTitle('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setHydration('');
    setEnergyLevel(5);
  };

  const applyPreset = (preset: typeof MACRO_PRESETS[0]) => {
    setCalories(preset.calories.toString());
    setProtein(preset.protein.toString());
    setCarbs(preset.carbs.toString());
    setFats(preset.fats.toString());
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('vault_nutrition_logs')
        .insert({
          user_id: user.id,
          entry_date: today,
          calories: calories ? parseInt(calories) : null,
          protein_g: protein ? parseFloat(protein) : null,
          carbs_g: carbs ? parseFloat(carbs) : null,
          fats_g: fats ? parseFloat(fats) : null,
          hydration_oz: hydration ? parseFloat(hydration) : null,
          energy_level: energyLevel,
          meal_type: mealType || null,
          meal_title: mealTitle || null,
        });

      if (error) throw error;

      toast.success(t('vault.nutrition.mealLogged'));
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving nutrition log:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-md overflow-y-auto max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-green-500" />
            {t('gamePlan.nutrition.quickLogDialog.title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('gamePlan.nutrition.quickLogDialog.subtitle')}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Meal Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('vault.nutrition.mealType')}
            </Label>
            <ToggleGroup 
              type="single" 
              value={mealType} 
              onValueChange={(v) => v && setMealType(v)}
              className="flex flex-wrap justify-start gap-1"
            >
              {mealTypeOptions.map(option => {
                const Icon = option.icon;
                return (
                  <ToggleGroupItem 
                    key={option.value} 
                    value={option.value}
                    className="flex items-center gap-1 text-xs px-2 py-1"
                  >
                    <Icon className="h-3 w-3" />
                    {option.label}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {/* Meal Title */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('vault.nutrition.mealTitle')}
            </Label>
            <Input
              placeholder={t('vault.nutrition.mealTitlePlaceholder')}
              value={mealTitle}
              onChange={(e) => setMealTitle(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('vault.nutrition.quickPresets')}
            </Label>
            <div className="flex flex-wrap gap-1">
              {MACRO_PRESETS.map(preset => {
                const Icon = preset.icon;
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset(preset)}
                    className="text-xs h-7 gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {t(`vault.nutrition.presets.${preset.id}`)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.calories')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.protein')} (g)</Label>
              <Input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.carbs')} (g)</Label>
              <Input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.fats')} (g)</Label>
              <Input
                type="number"
                placeholder="0"
                value={fats}
                onChange={(e) => setFats(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Hydration */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('vault.nutrition.hydration')} (oz)</Label>
            <Input
              type="number"
              placeholder="0"
              value={hydration}
              onChange={(e) => setHydration(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('vault.nutrition.energyLevel')}
            </Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                    energyLevel === level
                      ? level <= 3
                        ? 'bg-red-500 text-white'
                        : level <= 5
                          ? 'bg-orange-500 text-white'
                          : level <= 7
                            ? 'bg-amber-500 text-secondary'
                            : 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full h-10 font-bold"
          >
          {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('vault.nutrition.logMeal')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}