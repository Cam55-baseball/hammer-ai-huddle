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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Apple, Coffee, Salad, UtensilsCrossed, Cookie, Droplets, Zap, Dumbbell, Loader2, Sparkles, Database, ChevronDown, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSmartFoodLookup } from '@/hooks/useSmartFoodLookup';
import { toast } from 'sonner';
import { DIGESTION_TAGS, convertMealTime, toggleDigestionTagInNotes } from '@/constants/nutritionLogging';

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
  const [mealTime, setMealTime] = useState<string>(() => format(new Date(), 'HH:mm'));
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [hydration, setHydration] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [digestionNotes, setDigestionNotes] = useState<string>('');
  const [digestionOpen, setDigestionOpen] = useState(false);

  const toggleDigestionTag = (value: string) => {
    setDigestionNotes(prev => toggleDigestionTagInNotes(prev, value));
  };



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

  // Auto-fill macros when lookup result arrives (only untouched fields, including zeros)
  useEffect(() => {
    if (lookupResult && lookupStatus === 'ready') {
      const { totals, suggestedMealType } = lookupResult;
      
      // Auto-fill all macro fields including zeros
      if (!touchedFields.current.has('calories') && typeof totals.calories === 'number') {
        setCalories(Math.round(totals.calories).toString());
      }
      if (!touchedFields.current.has('protein') && typeof totals.protein_g === 'number') {
        setProtein(Math.round(totals.protein_g).toString());
      }
      if (!touchedFields.current.has('carbs') && typeof totals.carbs_g === 'number') {
        setCarbs(Math.round(totals.carbs_g).toString());
      }
      if (!touchedFields.current.has('fats') && typeof totals.fats_g === 'number') {
        setFats(Math.round(totals.fats_g).toString());
      }
      if (!touchedFields.current.has('hydration') && typeof totals.hydration_oz === 'number') {
        setHydration(Math.round(totals.hydration_oz).toString());
      }
      
      // Auto-fill meal type if not already set
      if (!mealType && suggestedMealType) {
        setMealType(suggestedMealType);
      }
    }
  }, [lookupResult, lookupStatus, mealType]);

  // Show toast for lookup errors
  useEffect(() => {
    if (lookupError) {
      toast.error(lookupError);
    }
  }, [lookupError]);

  const resetForm = () => {
    setMealType('');
    setMealTitle('');
    setMealTime(format(new Date(), 'HH:mm'));
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setHydration('');
    setEnergyLevel(5);
    setDigestionNotes('');
    setDigestionOpen(false);
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
          meal_time: mealTime ? convertMealTime(mealTime) : null,
          digestion_notes: digestionNotes || null,
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
          <span>{lookupStatus === 'searching_db' ? t('common.searching') : t('vault.smartFood.aiAnalyzing')}</span>
        </div>
      );
    }

    if (lookupStatus === 'ready' && lookupResult) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {lookupResult.source === 'database' ? (
              <Badge variant="secondary" className="text-xs gap-1">
                <Database className="h-3 w-3" />
                {t('vault.smartFood.matchedDatabase')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1">
                <Sparkles className="h-3 w-3" />
                {t('vault.smartFood.aiEstimate')} • {t(`vault.smartFood.${lookupResult.confidenceSummary}`)} {t('vault.smartFood.confidence')}
              </Badge>
            )}
          </div>
          
          {/* Recognized Foods Preview */}
          {lookupResult.foods && lookupResult.foods.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" />
                {t('vault.smartFood.recognizedFoods')} ({lookupResult.foods.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-1 pl-4 border-l-2 border-muted">
                  {lookupResult.foods.map((food, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      • {food.name} ({food.quantity} {food.unit}) - {food.calories} {t('vault.smartFood.calories')}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      );
    }

    if (lookupStatus === 'error') {
      return (
        <div className="text-xs text-muted-foreground">
          {t('vault.smartFood.enterManually')}
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

          {/* What did you eat? with Smart Lookup */}
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
              onChange={(e) => handleMacroChange('hydration', e.target.value, setHydration)}
              className="h-9"
            />
          </div>

          {/* Meal Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">{t('vault.nutrition.mealTime', 'Meal Time')}</Label>
              <input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
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

          {/* Digestion Notes - collapsible */}
          <Collapsible open={digestionOpen} onOpenChange={setDigestionOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`h-3 w-3 transition-transform ${digestionOpen ? 'rotate-180' : ''}`} />
              {t('vault.nutrition.digestionNotes', 'Digestion Notes')} <span className="text-muted-foreground/60">(optional)</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {DIGESTION_TAGS.map((tag) => {
                  const active = digestionNotes.split(',').map(s => s.trim()).includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleDigestionTag(tag.value)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={digestionNotes}
                onChange={(e) => setDigestionNotes(e.target.value)}
                placeholder="How did you feel after eating? (e.g., energized, bloated, light, heavy...)"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </CollapsibleContent>
          </Collapsible>

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
