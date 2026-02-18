import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Zap, List, Sparkles, Database, ArrowRight, ChevronDown, Clock } from 'lucide-react';
import { MealBuilder } from '@/components/custom-activities/MealBuilder';
import { useMealVaultSync } from '@/hooks/useMealVaultSync';
import { useSmartFoodLookup } from '@/hooks/useSmartFoodLookup';
import { MealData } from '@/types/customActivity';
import { toast } from 'sonner';

export interface PrefilledItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface MealLoggingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType: string;
  onMealSaved?: () => void;
  prefilledItems?: PrefilledItem[];
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
  prefilledItems,
}: MealLoggingDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { syncMealToVault } = useMealVaultSync();
  
  // Smart food lookup
  const { status: lookupStatus, result: lookupResult, error: lookupError, trigger: triggerLookup, clear: clearLookup } = useSmartFoodLookup();
  
  // Track which fields user has manually edited
  const touchedFields = useRef<Set<string>>(new Set());
  
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [saving, setSaving] = useState(false);
  const [mealTime, setMealTime] = useState<string>(() => format(new Date(), 'HH:mm'));
  const [digestionNotes, setDigestionNotes] = useState('');
  const [digestionOpen, setDigestionOpen] = useState(false);
  
  const DIGESTION_TAGS = [
    { label: 'Felt great ✅', value: 'Felt great' },
    { label: 'Energized ⚡', value: 'Energized' },
    { label: 'Light 🪶', value: 'Light' },
    { label: 'Bloated 🫧', value: 'Bloated' },
    { label: 'Heavy 🧱', value: 'Heavy' },
    { label: 'Cramps 😣', value: 'Cramps' },
    { label: 'Heartburn 🔥', value: 'Heartburn' },
    { label: 'Nauseous 🤢', value: 'Nauseous' },
  ];

  const toggleDigestionTag = (value: string) => {
    setDigestionNotes(prev => {
      const existing = prev.split(',').map(s => s.trim()).filter(Boolean);
      if (existing.includes(value)) {
        return existing.filter(s => s !== value).join(', ');
      } else {
        return existing.length > 0 ? `${prev.trim().replace(/,$/, '')}, ${value}` : value;
      }
    });
  };

  const convertMealTime = (time24: string): string => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  const [mealTitle, setMealTitle] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [hydration, setHydration] = useState('');
  
  // Detailed entry state (MealBuilder)
  const [mealData, setMealData] = useState<MealData>(() => {
    if (prefilledItems && prefilledItems.length > 0) {
      return {
        items: prefilledItems.map(item => ({
          id: crypto.randomUUID(),
          name: item.name,
          calories: item.calories,
          protein: item.protein_g,
          carbs: item.carbs_g,
          fats: item.fats_g,
          quantity: item.quantity,
          unit: item.unit,
        })),
        vitamins: [],
        supplements: [],
        hydration: { amount: 0, unit: 'oz', goal: 100, entries: [] },
      };
    }
    return getDefaultMealData();
  });

  // When prefilledItems change, update mode to detailed and update mealData
  useEffect(() => {
    if (prefilledItems && prefilledItems.length > 0) {
      setMode('detailed');
      setMealData({
        items: prefilledItems.map(item => ({
          id: crypto.randomUUID(),
          name: item.name,
          calories: item.calories,
          protein: item.protein_g,
          carbs: item.carbs_g,
          fats: item.fats_g,
          quantity: item.quantity,
          unit: item.unit,
        })),
        vitamins: [],
        supplements: [],
        hydration: { amount: 0, unit: 'oz', goal: 100, entries: [] },
      });
    }
  }, [prefilledItems]);

  // Trigger smart lookup when meal title changes (only in quick mode)
  useEffect(() => {
    if (mode === 'quick' && mealTitle.length >= 3) {
      triggerLookup(mealTitle);
    } else {
      clearLookup();
    }
  }, [mealTitle, mode, triggerLookup, clearLookup]);

  // Auto-fill macros when lookup result arrives (only untouched fields, including zeros)
  useEffect(() => {
    if (lookupResult && lookupStatus === 'ready' && mode === 'quick') {
      const { totals } = lookupResult;
      
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
    }
  }, [lookupResult, lookupStatus, mode]);

  // Show toast for lookup errors
  useEffect(() => {
    if (lookupError) {
      toast.error(lookupError);
    }
  }, [lookupError]);

  const mealTypeLabel = MEAL_TYPE_LABELS[mealType] || mealType;

  const resetForm = () => {
    setMealTitle('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setHydration('');
    setMealData(getDefaultMealData());
    setMode('quick');
    setMealTime(format(new Date(), 'HH:mm'));
    setDigestionNotes('');
    setDigestionOpen(false);
    touchedFields.current.clear();
    clearLookup();
  };

  const handleMacroChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (value) {
      touchedFields.current.add(field);
    }
  };

  // Convert AI result to detailed breakdown
  const handleUseDetailedBreakdown = () => {
    if (!lookupResult || lookupResult.foods.length === 0) return;
    
    setMealData({
      items: lookupResult.foods.map(food => ({
        id: crypto.randomUUID(),
        name: food.name,
        calories: food.calories,
        protein: food.protein_g,
        carbs: food.carbs_g,
        fats: food.fats_g,
        quantity: food.quantity,
        unit: food.unit,
      })),
      vitamins: [],
      supplements: [],
      hydration: { amount: 0, unit: 'oz', goal: 100, entries: [] },
    });
    setMode('detailed');
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
        mealTime: mealTime ? convertMealTime(mealTime) : undefined,
        digestionNotes: digestionNotes || undefined,
      });

      if (result.success) {
        // Invalidate all nutrition-related queries for E2E sync
        queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
        queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
        
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
        mealTime: mealTime ? convertMealTime(mealTime) : undefined,
        digestionNotes: digestionNotes || undefined,
      });

      if (result.success) {
        // Invalidate all nutrition-related queries for E2E sync
        queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
        queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
        
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
        <div className="flex flex-col gap-2">
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
          
          {/* Show "Use detailed breakdown" button if AI returned multiple foods */}
          {lookupResult.source === 'ai' && lookupResult.foods.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUseDetailedBreakdown}
              className="text-xs h-7 gap-1 justify-start px-0 text-primary hover:text-primary/80"
            >
              <ArrowRight className="h-3 w-3" />
              {t('nutritionHub.useDetailedBreakdown', { count: lookupResult.foods.length })}
            </Button>
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
            {/* Meal Title with Smart Lookup */}
            <div className="space-y-2">
              <Label htmlFor="meal-title">Meal Title (optional)</Label>
              <Input
                id="meal-title"
                placeholder="e.g., 2 eggs with toast, greek yogurt..."
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
              />
              <div className="min-h-[24px]">
                {renderLookupStatus()}
              </div>
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
                  onChange={(e) => handleMacroChange('calories', e.target.value, setCalories)}
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
                  onChange={(e) => handleMacroChange('protein', e.target.value, setProtein)}
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
                  onChange={(e) => handleMacroChange('carbs', e.target.value, setCarbs)}
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
                  onChange={(e) => handleMacroChange('fats', e.target.value, setFats)}
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

        {/* Meal Time + Digestion Notes shared fields */}
        <div className="space-y-3 pt-3 border-t">
          {/* Meal Time */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Meal Time</Label>
              <input
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          {/* Digestion Notes - collapsible */}
          <Collapsible open={digestionOpen} onOpenChange={setDigestionOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`h-3 w-3 transition-transform ${digestionOpen ? 'rotate-180' : ''}`} />
              Digestion Notes <span className="text-muted-foreground/60">(optional)</span>
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
        </div>

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
