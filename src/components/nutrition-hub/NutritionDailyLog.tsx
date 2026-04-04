import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MealLogCard, MealLogData } from './MealLogCard';
import { MicronutrientPanel } from './MicronutrientPanel';
import { HydrationQualityBreakdown } from './HydrationQualityBreakdown';
import { NutritionScoreCard } from './NutritionScoreCard';
import { DeficiencyAlert } from './DeficiencyAlert';
import { NutritionTrendsCard } from './NutritionTrendsCard';
import { GuidancePanel } from './GuidancePanel';
import { CravingGuidance } from './CravingGuidance';
import { useNutritionGuidance } from '@/hooks/useNutritionGuidance';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NutritionDailyLogProps {
  date?: Date;
  onDateChange?: (date: Date) => void;
  onEditMeal?: (mealId: string) => void;
}

export function NutritionDailyLog({ 
  date: controlledDate, 
  onDateChange,
  onEditMeal,
}: NutritionDailyLogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { config } = usePerformanceMode();
  
  const [internalDate, setInternalDate] = useState(new Date());

  const currentDate = controlledDate ?? internalDate;
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };

  const { data: meals = [], isLoading: loading } = useQuery({
    queryKey: ['nutritionLogs', dateStr, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .order('logged_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        mealType: log.meal_type,
        mealTitle: log.meal_title,
        loggedAt: log.logged_at || log.created_at || new Date().toISOString(),
        calories: log.calories,
        proteinG: log.protein_g,
        carbsG: log.carbs_g,
        fatsG: log.fats_g,
        supplements: Array.isArray(log.supplements) ? log.supplements as string[] : null,
        mealTime: (log as any).meal_time ?? null,
        digestionNotes: (log as any).digestion_notes ?? null,
        micros: (log as any).micros ?? null,
        dataSource: (log as any).data_source ?? null,
        dataConfidence: (log as any).data_confidence ?? null,
      })) as MealLogData[];
    },
    enabled: !!user,
  });

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('vault_nutrition_logs')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['nutritionLogs'] });
      queryClient.invalidateQueries({ queryKey: ['macroProgress'] });
      toast.success('Meal deleted');
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const goToPreviousDay = () => handleDateChange(subDays(currentDate, 1));
  const goToNextDay = () => handleDateChange(addDays(currentDate, 1));
  const goToToday = () => handleDateChange(new Date());

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.proteinG || 0),
    carbs: acc.carbs + (meal.carbsG || 0),
    fats: acc.fats + (meal.fatsG || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const mealsWithMicros = meals.filter(m => m.micros && Object.keys(m.micros).length > 0).length;

  // Aggregate confidence
  const confidenceLevels = meals.map(m => m.dataConfidence || 'low');
  const allHigh = confidenceLevels.every(c => c === 'high');
  const allLow = confidenceLevels.every(c => c === 'low');
  const aggregateConfidence = allHigh ? 'High' : allLow ? 'Low' : 'Mixed';
  const aggregateConfidenceColor = allHigh
    ? 'text-emerald-600'
    : allLow
      ? 'text-destructive'
      : 'text-amber-600';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('nutrition.dailyLog', 'Daily Log')}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday(currentDate) ? 'secondary' : 'ghost'}
              size="sm"
              className="min-w-[100px]"
              onClick={goToToday}
            >
              {isToday(currentDate) ? t('common.today', 'Today') : format(currentDate, 'MMM d')}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay} disabled={isToday(currentDate)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{t('nutrition.noMeals', 'No meals logged')}</p>
            <p className="text-sm mt-1">
              {isToday(currentDate) 
                ? t('nutrition.startLogging', 'Start logging your meals to track nutrition')
                : t('nutrition.noMealsOnDate', 'No meals were logged on this day')
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {meals.map((meal) => (
                <MealLogCard key={meal.id} meal={meal} onEdit={onEditMeal} onDelete={handleDeleteMeal} />
              ))}
            </div>

            {/* Day totals */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('nutrition.dayTotals', 'Day Totals')}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium", aggregateConfidenceColor)}>
                    {aggregateConfidence}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{totals.calories}</p>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totals.protein}g</p>
                  <p className="text-xs text-muted-foreground">protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{totals.carbs}g</p>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{totals.fats}g</p>
                  <p className="text-xs text-muted-foreground">fats</p>
                </div>
              </div>
              {/* Micro coverage line */}
              <div className="mt-2 pt-2 border-t border-border/50">
                {mealsWithMicros === 0 ? (
                  <p className="text-[11px] text-destructive italic">
                    No micronutrient data logged today
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    <span className={cn(
                      "font-semibold",
                      mealsWithMicros === meals.length ? 'text-emerald-600' : 'text-amber-600'
                    )}>
                      {mealsWithMicros}/{meals.length}
                    </span>
                    {' '}meals with micronutrient data
                  </p>
                )}
              </div>
            </div>

            {/* Nutrition Score */}
            <NutritionScoreCard date={currentDate} />

            {/* Guidance Panel — precision actionable feedback */}
            <GuidancePanel date={currentDate} />

            {/* Hydration Quality */}
            <HydrationQualityBreakdown />

            {/* Deficiency Alerts (current + predictive) */}
            <DeficiencyAlert date={currentDate} />

            {/* Craving Guidance — nutrient-aligned suggestions */}
            <CravingGuidance date={currentDate} microCoverage={mealsWithMicros} />

            {/* Nutrition Trends (7/14/30-day intelligence) */}
            <NutritionTrendsCard />

            {/* Micronutrient Panel */}
            <MicronutrientPanel date={currentDate} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
