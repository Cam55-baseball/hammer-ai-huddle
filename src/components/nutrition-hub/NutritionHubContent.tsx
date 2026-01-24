import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Apple, Settings, Sparkles, Link } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTDEE } from '@/hooks/useTDEE';
import { useDailyNutritionTargets } from '@/hooks/useDailyNutritionTargets';
import { TDEESetupWizard } from './TDEESetupWizard';
import { BodyGoalSetup } from './BodyGoalSetup';
import { MacroTargetDisplay } from './MacroTargetDisplay';
import { QuickLogActions } from './QuickLogActions';
import { NutritionDailyLog } from './NutritionDailyLog';
import { NutritionWeeklySummary } from './NutritionWeeklySummary';
import { MealLoggingDialog, PrefilledItem } from './MealLoggingDialog';
import { HydrationTrackerWidget } from '@/components/custom-activities/HydrationTrackerWidget';
import { VitaminSupplementTracker } from '@/components/vault/VitaminSupplementTracker';
import { WeightTrackingSection } from './WeightTrackingSection';
import { MealPlanningTab } from './MealPlanningTab';
import { ShoppingListTab } from './ShoppingListTab';
import { RecipeImportDialog } from './RecipeImportDialog';
import { AIMealSuggestions } from './AIMealSuggestions';
import { FavoriteFoodsWidget } from './FavoriteFoodsWidget';
import { useRecipes, RecipeIngredient, CreateRecipeInput } from '@/hooks/useRecipes';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ConsumedTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

// Interface for parsed recipe from URL
interface ParsedRecipe {
  name: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  instructions?: string[];
  estimatedNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
}

export function NutritionHubContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRecipe } = useRecipes();
  
  const { isProfileComplete, hasActiveGoal, loading: tdeeLoading, biometrics, refetch: refetchTDEE } = useTDEE();
  
  const [showTDEESetup, setShowTDEESetup] = useState(false);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [consumedTotals, setConsumedTotals] = useState<ConsumedTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
  });
  const [loadingConsumed, setLoadingConsumed] = useState(true);
  
  // Meal logging dialog state
  const [mealLoggingOpen, setMealLoggingOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('');
  const [prefilledItems, setPrefilledItems] = useState<PrefilledItem[] | undefined>();
  const [dailyLogRefreshTrigger, setDailyLogRefreshTrigger] = useState(0);

  // Get nutrition targets
  const { targets } = useDailyNutritionTargets({
    calories: consumedTotals.calories,
    protein: consumedTotals.protein,
    carbs: consumedTotals.carbs,
    fats: consumedTotals.fats,
  });

  // Fetch today's consumed totals
  const fetchConsumed = useCallback(async () => {
    if (!user) return;
    
    setLoadingConsumed(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('calories, protein_g, carbs_g, fats_g')
        .eq('user_id', user.id)
        .eq('entry_date', today);

      if (error) throw error;

      const totals = (data || []).reduce((acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein_g || 0),
        carbs: acc.carbs + (log.carbs_g || 0),
        fats: acc.fats + (log.fats_g || 0),
        fiber: acc.fiber,
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

      setConsumedTotals(totals);
    } catch (error) {
      console.error('Error fetching consumed totals:', error);
    } finally {
      setLoadingConsumed(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConsumed();
  }, [fetchConsumed]);

  // Deterministically set wizard visibility based on profile completeness
  useEffect(() => {
    if (!tdeeLoading) {
      // Explicitly set both states based on current data
      setShowTDEESetup(!isProfileComplete);
      setShowGoalSetup(isProfileComplete && !hasActiveGoal);
    }
  }, [tdeeLoading, isProfileComplete, hasActiveGoal]);

  const handleLogMeal = (mealType: string, items?: RecipeIngredient[]) => {
    setSelectedMealType(mealType);
    // Convert RecipeIngredient[] to PrefilledItem[] if provided
    if (items && items.length > 0) {
      const converted: PrefilledItem[] = items.map(item => ({
        name: item.name,
        calories: item.calories || 0,
        protein_g: item.protein_g || 0,
        carbs_g: item.carbs_g || 0,
        fats_g: item.fats_g || 0,
        quantity: item.quantity,
        unit: item.unit,
      }));
      setPrefilledItems(converted);
    } else {
      setPrefilledItems(undefined);
    }
    setMealLoggingOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setMealLoggingOpen(open);
    if (!open) {
      setPrefilledItems(undefined);
    }
  };

  const handleMealSaved = () => {
    setMealLoggingOpen(false);
    setPrefilledItems(undefined);
    fetchConsumed();
    setDailyLogRefreshTrigger(prev => prev + 1);
  };

  const handleTDEEComplete = () => {
    setShowTDEESetup(false);
    if (!hasActiveGoal) {
      setShowGoalSetup(true);
    }
  };

  const handleGoalComplete = () => {
    setShowGoalSetup(false);
  };

  // Handle recipe import - save to database
  const handleRecipeImport = async (recipe: ParsedRecipe) => {
    // Convert parsed recipe to CreateRecipeInput format
    const perServingDivisor = recipe.servings || 1;
    const nutrition = recipe.estimatedNutrition || { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    
    const recipeInput: CreateRecipeInput = {
      name: recipe.name,
      description: recipe.description,
      servings: recipe.servings,
      prep_time_minutes: recipe.prepTime,
      cook_time_minutes: recipe.cookTime,
      ingredients: recipe.ingredients.map((ing, index) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        // Distribute nutrition across ingredients (simple approximation)
        calories: Math.round(nutrition.calories / recipe.ingredients.length),
        protein_g: Math.round((nutrition.protein / recipe.ingredients.length) * 10) / 10,
        carbs_g: Math.round((nutrition.carbs / recipe.ingredients.length) * 10) / 10,
        fats_g: Math.round((nutrition.fats / recipe.ingredients.length) * 10) / 10,
        fiber_g: nutrition.fiber ? Math.round((nutrition.fiber / recipe.ingredients.length) * 10) / 10 : undefined,
      })),
    };

    await createRecipe(recipeInput);
  };

  // Handle AI suggestion add to meal log
  const handleAddAISuggestion = (food: { name: string; calories: number; protein: number; carbs: number; fats: number }) => {
    setPrefilledItems([{
      name: food.name,
      calories: food.calories,
      protein_g: food.protein,
      carbs_g: food.carbs,
      fats_g: food.fats,
      quantity: 1,
      unit: 'serving',
    }]);
    setSelectedMealType('snack');
    setMealLoggingOpen(true);
  };

  // Handle quick-adding favorite foods
  const handleQuickAddFavorite = (food: {
    id: string;
    name: string;
    brand?: string | null;
    caloriesPerServing?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fats?: number | null;
    servingSize?: string | null;
  }, mealType: string) => {
    const prefilledItem: PrefilledItem = {
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      calories: food.caloriesPerServing || 0,
      protein_g: food.protein || 0,
      carbs_g: food.carbs || 0,
      fats_g: food.fats || 0,
      quantity: 1,
      unit: food.servingSize || 'serving',
    };
    
    setPrefilledItems([prefilledItem]);
    setSelectedMealType(mealType);
    setMealLoggingOpen(true);
  };

  // Show TDEE setup wizard
  if (showTDEESetup && !tdeeLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {t('nutrition.setupTitle', 'Set Up Your Nutrition')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('nutrition.setupSubtitle', 'Tell us about yourself to get personalized targets')}
              </p>
            </div>
          </div>
        </div>
        
        <TDEESetupWizard onComplete={handleTDEEComplete} onDataSaved={refetchTDEE} />
      </div>
    );
  }

  // Show goal setup
  if (showGoalSetup && !tdeeLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowGoalSetup(false)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {t('nutrition.setGoalTitle', 'Set Your Goal')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('nutrition.setGoalSubtitle', 'What would you like to achieve?')}
              </p>
            </div>
          </div>
        </div>
        
        <BodyGoalSetup 
          currentWeight={biometrics?.weightLbs ?? undefined} 
          onComplete={handleGoalComplete} 
        />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400">
              <Apple className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {t('nutrition.hubTitle', 'Nutrition Hub')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('nutrition.hubSubtitle', 'Track and optimize your nutrition')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <RecipeImportDialog 
            onImport={handleRecipeImport}
            trigger={
              <Button variant="outline" size="sm">
                <Link className="h-4 w-4 mr-2" />
                {t('recipeImport.importFromUrl', 'Import Recipe')}
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTDEESetup(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Macro Targets Display */}
      <MacroTargetDisplay 
        consumed={consumedTotals}
        showHydration
      />

      {/* Food Favorites Quick Access */}
      <FavoriteFoodsWidget onQuickAdd={handleQuickAddFavorite} />

      {/* Quick Actions */}
      <QuickLogActions onLogMeal={handleLogMeal} />

      {/* Weight Tracking Section */}
      <WeightTrackingSection />

      {/* Main Content Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="today" className="flex-1 min-w-fit text-xs sm:text-sm whitespace-nowrap">{t('nutrition.today', 'Today')}</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 min-w-fit text-xs sm:text-sm whitespace-nowrap">{t('nutrition.weekly', 'Weekly')}</TabsTrigger>
          <TabsTrigger value="planning" className="flex-1 min-w-fit text-xs sm:text-sm whitespace-nowrap">{t('mealPlanning.title', 'Planning')}</TabsTrigger>
          <TabsTrigger value="shopping" className="flex-1 min-w-fit text-xs sm:text-sm whitespace-nowrap">{t('shoppingList.title', 'Shopping')}</TabsTrigger>
          <TabsTrigger value="supplements" className="flex-1 min-w-fit text-xs sm:text-sm whitespace-nowrap">{t('nutrition.supplements', 'Supplements')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="space-y-4 mt-4">
          <NutritionDailyLog onEditMeal={(id) => console.log('Edit meal:', id)} refreshTrigger={dailyLogRefreshTrigger} />
          
          {/* AI Meal Suggestions - shows after user has logged food */}
          <AIMealSuggestions
            consumed={{
              calories: consumedTotals.calories,
              protein: consumedTotals.protein,
              carbs: consumedTotals.carbs,
              fats: consumedTotals.fats,
            }}
            targets={{
              calories: targets.calories,
              protein: targets.protein,
              carbs: targets.carbs,
              fats: targets.fats,
            }}
            onAddFood={handleAddAISuggestion}
          />
          
          <div className="flex justify-center">
            <HydrationTrackerWidget />
          </div>
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-4">
          <NutritionWeeklySummary />
        </TabsContent>
        
        <TabsContent value="planning" className="mt-4">
          <MealPlanningTab />
        </TabsContent>
        
        <TabsContent value="shopping" className="mt-4">
          <ShoppingListTab />
        </TabsContent>
        
        <TabsContent value="supplements" className="mt-4">
          <VitaminSupplementTracker />
        </TabsContent>
      </Tabs>

      {/* Meal Logging Dialog */}
      <MealLoggingDialog
        open={mealLoggingOpen}
        onOpenChange={handleDialogClose}
        mealType={selectedMealType}
        onMealSaved={handleMealSaved}
        prefilledItems={prefilledItems}
      />
    </div>
  );
}
