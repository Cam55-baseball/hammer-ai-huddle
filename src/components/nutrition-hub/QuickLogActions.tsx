import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Droplets, Plus, Zap, ScanBarcode, Camera, Sparkles, Loader2, Gauge, Utensils } from 'lucide-react';
import { useHydration, type AiHydrationAnalysis } from '@/hooks/useHydration';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RecipeIngredient } from '@/hooks/useRecipes';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodSearchResult } from '@/hooks/useFoodSearch';
import { MealTypeSelector, MEAL_TYPES } from './MealTypeSelector';
import { PhotoFoodLogger } from './PhotoFoodLogger';
import { LIQUID_TYPES, classifyLiquid } from '@/constants/hydrationClassification';
import { computeHydrationProfile, TIER_LABEL, TIER_TEXT_CLASS } from '@/utils/hydrationScoring';
import { supabase } from '@/integrations/supabase/client';

interface QuickLogActionsProps {
  onLogMeal?: (mealType: string, prefilledItems?: RecipeIngredient[]) => void;
  compact?: boolean;
  onSwitchTab?: (tab: string) => void;
}

const QUICK_WATER_AMOUNTS = [8, 16, 24, 32];

export function QuickLogActions({ onLogMeal, compact = false, onSwitchTab }: QuickLogActionsProps) {
  const { t } = useTranslation();
  const { addWater, todayTotal, dailyGoal } = useHydration();
  
  const [waterDialogOpen, setWaterDialogOpen] = useState(false);
  const [customWaterAmount, setCustomWaterAmount] = useState('');
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mealTypeSelectorOpen, setMealTypeSelectorOpen] = useState(false);
  const [selectedLiquidType, setSelectedLiquidType] = useState('water');
  const [liquidPickerOpen, setLiquidPickerOpen] = useState(false);
  const [pendingWaterAmount, setPendingWaterAmount] = useState<number | null>(null);
  const [pendingLiquid, setPendingLiquid] = useState<{ type: string; quality: string } | null>(null);
  // AI "Other" liquid flow
  const [otherText, setOtherText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<(AiHydrationAnalysis & { confidence: 'high' | 'medium' | 'low'; notes?: string }) | null>(null);
  
  // Store pending items waiting for meal type selection
  const pendingItemsRef = useRef<RecipeIngredient[] | null>(null);
  const pendingMessageRef = useRef<string>('');

  const handleRecipeSelect = (ingredients: RecipeIngredient[], servings: number) => {
    // Store the recipe ingredients and show meal type selector
    pendingItemsRef.current = ingredients;
    pendingMessageRef.current = t('nutrition.recipeAdded', 'Recipe added with {{count}} ingredients ({{servings}} servings)', { count: ingredients.length, servings });
    setMealTypeSelectorOpen(true);
  };

  const handleMealTypeSelected = (mealType: string) => {
    if (onLogMeal && pendingItemsRef.current) {
      onLogMeal(mealType, pendingItemsRef.current);
      toast.success(pendingMessageRef.current);
    }
    pendingItemsRef.current = null;
    pendingMessageRef.current = '';
  };

  const handleQuickWater = async (amount: number) => {
    // Default "water" = instant log, no picker needed
    setIsLogging(true);
    try {
      await addWater(amount, 'water', 'quality');
      toast.success(t('nutrition.waterAdded', 'Added {{amount}}oz water', { amount }));
    } finally {
      setIsLogging(false);
    }
  };

  const handleLiquidSelect = (liquidType: string) => {
    if (liquidType === 'other') {
      setPendingLiquid({ type: 'other', quality: 'quality' });
      setOtherText('');
      setAiAnalysis(null);
      return;
    }
    const quality = classifyLiquid(liquidType);
    setPendingLiquid({ type: liquidType, quality });
  };

  const resetLiquidPicker = () => {
    setLiquidPickerOpen(false);
    setPendingWaterAmount(null);
    setPendingLiquid(null);
    setSelectedLiquidType('water');
    setOtherText('');
    setAiAnalysis(null);
  };

  const handleAnalyzeOther = async () => {
    if (!pendingWaterAmount) return;
    const text = otherText.trim();
    if (text.length < 2) {
      toast.error('Describe what you\u2019re drinking (min 2 characters)');
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-hydration-text', {
        body: { text, amount_oz: pendingWaterAmount },
      });
      if (error) {
        const status = (error as any)?.context?.status;
        const msg = status === 429
          ? 'Hammer is busy \u2014 try again in a moment.'
          : status === 402
            ? 'Hammer credits exhausted. Add credits to continue.'
            : (error.message || 'Failed to analyze beverage');
        toast.error(msg);
        return;
      }
      const a = data?.analysis;
      if (!a) {
        toast.error('No analysis returned');
        return;
      }
      setAiAnalysis(a);
    } catch (e) {
      console.error('analyze-hydration-text failed', e);
      toast.error('Failed to analyze beverage');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLiquidConfirm = async () => {
    if (!pendingWaterAmount || !pendingLiquid) return;
    if (pendingLiquid.type === 'other' && !aiAnalysis) {
      toast.error('Analyze your drink with Hammer first');
      return;
    }
    setIsLogging(true);
    try {
      await addWater(
        pendingWaterAmount,
        pendingLiquid.type,
        pendingLiquid.quality,
        pendingLiquid.type === 'other' && aiAnalysis ? aiAnalysis : undefined,
      );
      const label = pendingLiquid.type === 'other' && aiAnalysis
        ? aiAnalysis.display_name
        : (LIQUID_TYPES.find(lt => lt.value === pendingLiquid.type)?.label || pendingLiquid.type);
      toast.success(`Added ${pendingWaterAmount}oz ${label}`);
      resetLiquidPicker();
    } finally {
      setIsLogging(false);
    }
  };

  const toggleQualityOverride = () => {
    if (!pendingLiquid) return;
    setPendingLiquid({
      ...pendingLiquid,
      quality: pendingLiquid.quality === 'quality' ? 'filler' : 'quality',
    });
  };

  const handleCustomWater = async () => {
    const amount = parseInt(customWaterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('nutrition.invalidAmount', 'Please enter a valid amount'));
      return;
    }
    // Open liquid picker for custom amounts
    setPendingWaterAmount(amount);
    setLiquidPickerOpen(true);
    setWaterDialogOpen(false);
  };

  const handleLogMeal = () => {
    if (selectedMealType && onLogMeal) {
      onLogMeal(selectedMealType);
      setMealDialogOpen(false);
      setSelectedMealType('');
    }
  };

  const handleBarcodeFound = (food: FoodSearchResult) => {
    try {
      // Convert FoodSearchResult to RecipeIngredient format for meal logging
      const ingredient: RecipeIngredient = {
        food_id: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        quantity: 1,
        unit: food.servingSize || t('nutrition.barcode.serving', 'serving'),
        calories: food.caloriesPerServing || 0,
        protein_g: food.protein || 0,
        carbs_g: food.carbs || 0,
        fats_g: food.fats || 0,
      };
      
      // Store the scanned food and show meal type selector
      pendingItemsRef.current = [ingredient];
      pendingMessageRef.current = t('nutrition.foodAdded', 'Added {{name}} to meal', { name: food.name });
      setMealTypeSelectorOpen(true);
    } catch (error) {
      console.error('Error handling barcode result:', error);
      toast.error(t('nutrition.barcode.addFailed', 'Failed to add food. Please try again.'));
    }
  };

  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {/* Quick water buttons */}
        {QUICK_WATER_AMOUNTS.slice(0, 2).map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={isLogging}
            onClick={() => handleQuickWater(amount)}
          >
            <Droplets className="h-3 w-3 text-blue-500" />
            +{amount}oz
          </Button>
        ))}
        
        {/* Log meal */}
        <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Utensils className="h-3 w-3 text-green-500" />
              {t('nutrition.logMeal', 'Log Meal')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('nutrition.logMealTitle', 'Log a Meal')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                  {MEAL_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedMealType === type.value ? 'default' : 'outline'}
                      className="justify-start gap-2"
                      onClick={() => setSelectedMealType(type.value)}
                    >
                      <span>{type.icon}</span>
                      {t(`nutrition.mealTypes.${type.value}`, type.label)}
                    </Button>
                  ))}
              </div>
              <Button
                className="w-full"
                disabled={!selectedMealType}
                onClick={handleLogMeal}
              >
                {t('nutrition.continue', 'Continue')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          {t('nutrition.quickActions', 'Quick Actions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hydration section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              {t('nutrition.hydration', 'Hydration')}
            </Label>
            <span className="text-xs text-muted-foreground">
              {todayTotal} / {dailyGoal} oz
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_WATER_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className={cn(
                  "flex-col h-auto py-2 gap-0.5",
                  "hover:bg-blue-500/10 hover:border-blue-500/50"
                )}
                disabled={isLogging}
                onClick={() => handleQuickWater(amount)}
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs font-bold">{amount}oz</span>
              </Button>
            ))}
          </div>

          {/* Other liquid button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            disabled={isLogging}
            onClick={() => {
              setPendingWaterAmount(8);
              setLiquidPickerOpen(true);
            }}
          >
            {t('nutrition.otherLiquid', 'Log other liquid...')}
          </Button>

          <Dialog open={waterDialogOpen} onOpenChange={setWaterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                {t('nutrition.customAmount', 'Custom amount...')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('nutrition.addWater', 'Add Water')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('nutrition.amountOz', 'Amount (oz)')}</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customWaterAmount}
                    onChange={(e) => setCustomWaterAmount(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCustomWater}
                  disabled={isLogging}
                >
                  {t('nutrition.add', 'Add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Liquid Type Picker Dialog */}
          <Dialog open={liquidPickerOpen} onOpenChange={(open) => {
            setLiquidPickerOpen(open);
            if (!open) setPendingLiquid(null);
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {t('nutrition.selectLiquidType', 'What are you drinking?')} ({pendingWaterAmount}oz)
                </DialogTitle>
              </DialogHeader>
              
              {!pendingLiquid ? (
                <div className="grid grid-cols-2 gap-2 py-4">
                  {LIQUID_TYPES.map((lt) => (
                    <Button
                      key={lt.value}
                      variant="outline"
                      className={cn(
                        "justify-start gap-2 h-auto py-2.5",
                        lt.defaultQuality === 'filler' && "border-amber-500/30"
                      )}
                      disabled={isLogging}
                      onClick={() => handleLiquidSelect(lt.value)}
                    >
                      <span>{lt.emoji}</span>
                      <div className="text-left">
                        <span className="text-sm">{lt.label}</span>
                        <span className={cn(
                          "block text-[10px]",
                          lt.defaultQuality === 'quality' ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {lt.defaultQuality === 'quality' ? '● Quality' : '● Filler'}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : pendingLiquid.type === 'other' ? (
                <div className="space-y-3 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      What are you drinking? ({pendingWaterAmount}oz)
                    </Label>
                    <Input
                      placeholder="e.g. iced matcha latte with oat milk"
                      value={otherText}
                      onChange={(e) => {
                        setOtherText(e.target.value);
                        // Invalidate stale preview when user edits/clears the input
                        if (aiAnalysis) setAiAnalysis(null);
                      }}
                      disabled={analyzing || isLogging}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !aiAnalysis) handleAnalyzeOther(); }}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Hammer will estimate hydration value, electrolytes, and sugar.
                    </p>
                  </div>

                  {!aiAnalysis ? (
                    <Button
                      className="w-full gap-2"
                      onClick={handleAnalyzeOther}
                      disabled={analyzing || otherText.trim().length < 2}
                    >
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {analyzing ? 'Analyzing...' : 'Analyze with Hammer'}
                    </Button>
                  ) : (() => {
                    const profile = computeHydrationProfile({
                      amount_oz: pendingWaterAmount!,
                      water_g: aiAnalysis.water_g_per_oz * pendingWaterAmount!,
                      sodium_mg: aiAnalysis.sodium_mg_per_oz * pendingWaterAmount!,
                      potassium_mg: aiAnalysis.potassium_mg_per_oz * pendingWaterAmount!,
                      magnesium_mg: aiAnalysis.magnesium_mg_per_oz * pendingWaterAmount!,
                      sugar_g: aiAnalysis.sugar_g_per_oz * pendingWaterAmount!,
                      total_carbs_g: aiAnalysis.total_carbs_g_per_oz * pendingWaterAmount!,
                    });
                    const tierColor = TIER_TEXT_CLASS[profile.hydration_tier];
                    return (
                      <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{aiAnalysis.display_name}</p>
                          <span className={cn('text-[10px] font-semibold uppercase', 
                            aiAnalysis.confidence === 'high' ? 'text-emerald-500' :
                            aiAnalysis.confidence === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
                          )}>
                            {aiAnalysis.confidence} confidence
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Hydration score</span>
                          <span className={cn('flex items-center gap-1 font-bold', tierColor)}>
                            <Gauge className="h-3.5 w-3.5" />
                            {profile.hydration_score} · {TIER_LABEL[profile.hydration_tier]}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                          <Stat label="Water" value={`${profile.water_percent}%`} />
                          <Stat label="Sodium" value={`${Math.round(aiAnalysis.sodium_mg_per_oz * pendingWaterAmount!)}mg`} />
                          <Stat label="Potass." value={`${Math.round(aiAnalysis.potassium_mg_per_oz * pendingWaterAmount!)}mg`} />
                          <Stat label="Sugar" value={`${(aiAnalysis.sugar_g_per_oz * pendingWaterAmount!).toFixed(1)}g`} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quality override */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Classification</p>
                      <p className={cn('text-xs font-semibold',
                        pendingLiquid.quality === 'quality' ? 'text-emerald-500' : 'text-amber-500'
                      )}>
                        {pendingLiquid.quality === 'quality' ? '✓ Quality' : '⚠ Filler'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Override</span>
                      <Switch
                        checked={pendingLiquid.quality === 'filler'}
                        onCheckedChange={toggleQualityOverride}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setPendingLiquid(null); setAiAnalysis(null); setOtherText(''); }}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={isLogging || !aiAnalysis}
                      onClick={handleLiquidConfirm}
                    >
                      {t('nutrition.add', 'Add')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {/* Confirm selected liquid with override option */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-2xl">
                      {LIQUID_TYPES.find(lt => lt.value === pendingLiquid.type)?.emoji || '🫗'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {LIQUID_TYPES.find(lt => lt.value === pendingLiquid.type)?.label || pendingLiquid.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{pendingWaterAmount}oz</p>
                    </div>
                  </div>

                  {/* Quality Override Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">Classification</p>
                      <p className={cn(
                        "text-xs font-semibold",
                        pendingLiquid.quality === 'quality' ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {pendingLiquid.quality === 'quality' ? '✓ Quality' : '⚠ Filler'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Override</span>
                      <Switch
                        checked={pendingLiquid.quality === 'filler'}
                        onCheckedChange={toggleQualityOverride}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPendingLiquid(null)}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={isLogging}
                      onClick={handleLiquidConfirm}
                    >
                      {t('nutrition.add', 'Add')}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Barcode Scanner */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ScanBarcode className="h-4 w-4 text-cyan-500" />
            {t('nutrition.barcodeScanner', 'Barcode Scanner')}
          </Label>
          <Button
            variant="outline"
            className="w-full gap-2 hover:bg-cyan-500/10 hover:border-cyan-500/50"
            onClick={() => setScannerOpen(true)}
          >
            <ScanBarcode className="h-4 w-4 text-cyan-500" />
            {t('nutrition.scanBarcode', 'Scan Barcode')}
          </Button>
          <BarcodeScanner
            open={scannerOpen}
            onOpenChange={setScannerOpen}
            onFoodFound={handleBarcodeFound}
          />
        </div>


        {/* Photo Food Logger */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-500" />
            {t('nutrition.photoLog', 'Photo Log')}
          </Label>
          <PhotoFoodLogger onFoodsLogged={(mealType, foods) => {
            if (onLogMeal) {
              onLogMeal(mealType, foods);
            }
          }} />
        </div>

      </CardContent>

      {/* Meal Type Selector for barcode/recipe items */}
      <MealTypeSelector
        open={mealTypeSelectorOpen}
        onOpenChange={setMealTypeSelectorOpen}
        onSelect={handleMealTypeSelected}
        title={t('nutrition.selectMealTypeFor', 'Add to which meal?')}
      />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-background/60 px-1.5 py-1 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
