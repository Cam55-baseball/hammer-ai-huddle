import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Apple, Coffee, Salad, UtensilsCrossed, Cookie, Droplets, Zap, Dumbbell, Loader2, Sparkles, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSmartFoodLookup } from '@/hooks/useSmartFoodLookup';
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
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Smart food lookup
  const { status: lookupStatus, result: lookupResult, error: lookupError, trigger: triggerLookup, clear: clearLookup } = useSmartFoodLookup();
  
  // Track which fields user has manually edited
  const touchedFields = useRef<Set<string>>(new Set());
  
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

  // Trigger smart lookup when meal title changes
  useEffect(() => {
    if (mealTitle.length >= 3) {
      triggerLookup(mealTitle);
    } else {
      clearLookup();
    }
  }, [mealTitle, triggerLookup, clearLookup]);

  // Auto-fill macros when lookup result arrives (only untouched fields)
  useEffect(() => {
    if (lookupResult && lookupStatus === 'ready') {
      const { totals } = lookupResult;
      
      if (!touchedFields.current.has('calories') && totals.calories > 0) {
        setCalories(Math.round(totals.calories).toString());
      }
      if (!touchedFields.current.has('protein') && totals.protein_g > 0) {
        setProtein(Math.round(totals.protein_g).toString());
      }
      if (!touchedFields.current.has('carbs') && totals.carbs_g > 0) {
        setCarbs(Math.round(totals.carbs_g).toString());
      }
      if (!touchedFields.current.has('fats') && totals.fats_g > 0) {
        setFats(Math.round(totals.fats_g).toString());
      }
    }
  }, [lookupResult, lookupStatus]);

  // Show toast for lookup errors
  useEffect(() => {
    if (lookupError) {
      toast.error(lookupError);
    }
  }, [lookupError]);

  const resetForm = () => {
    setMealType('');
    setMealTitle('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setHydration('');
    setEnergyLevel(5);
    touchedFields.current.clear();
    clearLookup();
  };

  const applyPreset = (preset: typeof MACRO_PRESETS[0]) => {
    setCalories(preset.calories.toString());
    setProtein(preset.protein.toString());
    setCarbs(preset.carbs.toString());
    setFats(preset.fats.toString());
    // Mark as touched since user explicitly chose preset
    touchedFields.current.add('calories');
    touchedFields.current.add('protein');
    touchedFields.current.add('carbs');
    touchedFields.current.add('fats');
  };

  const handleMacroChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (value) {
      touchedFields.current.add(field);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
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

      // Invalidate all nutrition-related queries for E2E sync
      queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['macroProgress'] });

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

  const renderLookupStatus = () => {
    if (lookupStatus === 'searching_db' || lookupStatus === 'calling_ai') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{lookupStatus === 'searching_db' ? 'Searching...' : 'AI analyzing...'}</span>
        </div>
      );
    }

    if (lookupStatus === 'ready' && lookupResult) {
      return (
        <div className="flex items-center gap-2">
          {lookupResult.source === 'database' ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <Database className="h-3 w-3" />
              Matched food database
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              AI estimate • {lookupResult.confidenceSummary} confidence
            </Badge>
          )}
        </div>
      );
    }

    if (lookupStatus === 'error') {
      return (
        <div className="text-xs text-muted-foreground">
          Enter values manually
        </div>
      );
    }

    return null;
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

          {/* Meal Title with Smart Lookup */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('vault.nutrition.mealTitle')}
            </Label>
            <Input
              placeholder="e.g., 2 eggs with toast, greek yogurt..."
              value={mealTitle}
              onChange={(e) => setMealTitle(e.target.value)}
              className="h-9"
            />
            <div className="min-h-[20px]">
              {renderLookupStatus()}
            </div>
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
                onChange={(e) => handleMacroChange('calories', e.target.value, setCalories)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.protein')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={protein}
                onChange={(e) => handleMacroChange('protein', e.target.value, setProtein)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.carbs')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={carbs}
                onChange={(e) => handleMacroChange('carbs', e.target.value, setCarbs)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.fats')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={fats}
                onChange={(e) => handleMacroChange('fats', e.target.value, setFats)}
                className="h-9"
              />
            </div>
          </div>

          {/* Hydration */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('vault.nutrition.hydration')}</Label>
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
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergyLevel(level)}
                  className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                    energyLevel === level
                      ? level <= 2
                        ? 'bg-red-500 text-white'
                        : level === 3
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
