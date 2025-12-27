import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Droplets, Utensils, Pill, Plus, Zap, BookOpen, ScanBarcode } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RecipeBuilder } from './RecipeBuilder';
import { RecipeIngredient } from '@/hooks/useRecipes';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodSearchResult } from '@/hooks/useFoodSearch';
import { MealTypeSelector, MEAL_TYPES } from './MealTypeSelector';

interface QuickLogActionsProps {
  onLogMeal?: (mealType: string, prefilledItems?: RecipeIngredient[]) => void;
  compact?: boolean;
}

const QUICK_WATER_AMOUNTS = [8, 16, 24, 32];

export function QuickLogActions({ onLogMeal, compact = false }: QuickLogActionsProps) {
  const { t } = useTranslation();
  const { addWater, todayTotal, dailyGoal } = useHydration();
  
  const [waterDialogOpen, setWaterDialogOpen] = useState(false);
  const [customWaterAmount, setCustomWaterAmount] = useState('');
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mealTypeSelectorOpen, setMealTypeSelectorOpen] = useState(false);
  
  // Store pending items waiting for meal type selection
  const pendingItemsRef = useRef<RecipeIngredient[] | null>(null);
  const pendingMessageRef = useRef<string>('');

  const handleRecipeSelect = (ingredients: RecipeIngredient[], servings: number) => {
    // Store the recipe ingredients and show meal type selector
    pendingItemsRef.current = ingredients;
    pendingMessageRef.current = `Recipe added with ${ingredients.length} ingredients (${servings} servings)`;
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
    setIsLogging(true);
    try {
      await addWater(amount);
      toast.success(`Added ${amount}oz water`);
    } finally {
      setIsLogging(false);
    }
  };

  const handleCustomWater = async () => {
    const amount = parseInt(customWaterAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsLogging(true);
    try {
      await addWater(amount);
      toast.success(`Added ${amount}oz water`);
      setCustomWaterAmount('');
      setWaterDialogOpen(false);
    } finally {
      setIsLogging(false);
    }
  };

  const handleLogMeal = () => {
    if (selectedMealType && onLogMeal) {
      onLogMeal(selectedMealType);
      setMealDialogOpen(false);
      setSelectedMealType('');
    }
  };

  const handleBarcodeFound = (food: FoodSearchResult) => {
    // Convert FoodSearchResult to RecipeIngredient format for meal logging
    const ingredient: RecipeIngredient = {
      food_id: food.id,
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantity: 1,
      unit: food.servingSize || 'serving',
      calories: food.caloriesPerServing || 0,
      protein_g: food.protein || 0,
      carbs_g: food.carbs || 0,
      fats_g: food.fats || 0,
    };
    
    // Store the scanned food and show meal type selector
    pendingItemsRef.current = [ingredient];
    pendingMessageRef.current = `Added ${food.name} to meal`;
    setMealTypeSelectorOpen(true);
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
                    {type.label}
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
        </div>

        {/* Log meal section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Utensils className="h-4 w-4 text-green-500" />
            {t('nutrition.logMeal', 'Log Meal')}
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {MEAL_TYPES.slice(0, 3).map((type) => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2 gap-0.5 hover:bg-green-500/10 hover:border-green-500/50"
                onClick={() => onLogMeal?.(type.value)}
              >
                <span>{type.icon}</span>
                <span className="text-xs">{type.label}</span>
              </Button>
            ))}
          </div>
          <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                {t('nutrition.moreMealTypes', 'More meal types...')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('nutrition.selectMealType', 'Select Meal Type')}</DialogTitle>
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
                      {type.label}
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

        {/* Recipe Builder */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-500" />
            {t('nutrition.recipes', 'Recipes')}
          </Label>
          <RecipeBuilder onRecipeSelect={handleRecipeSelect} />
        </div>

        {/* Supplement reminder */}
        <Button
          variant="outline"
          className="w-full gap-2 hover:bg-purple-500/10 hover:border-purple-500/50"
        >
          <Pill className="h-4 w-4 text-purple-500" />
          {t('nutrition.trackSupplements', 'Track Supplements')}
        </Button>
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
