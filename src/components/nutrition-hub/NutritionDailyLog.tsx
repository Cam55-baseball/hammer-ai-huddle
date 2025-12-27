import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MealLogCard, MealLogData } from './MealLogCard';
import { toast } from 'sonner';

interface NutritionDailyLogProps {
  date?: Date;
  onDateChange?: (date: Date) => void;
  onEditMeal?: (mealId: string) => void;
}

export function NutritionDailyLog({ 
  date: controlledDate, 
  onDateChange,
  onEditMeal 
}: NutritionDailyLogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [internalDate, setInternalDate] = useState(new Date());
  const [meals, setMeals] = useState<MealLogData[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = controlledDate ?? internalDate;

  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .order('logged_at', { ascending: true });

      if (error) throw error;

      const mappedMeals: MealLogData[] = (data || []).map(log => ({
        id: log.id,
        mealType: log.meal_type,
        mealTitle: log.meal_title,
        loggedAt: log.logged_at || log.created_at || new Date().toISOString(),
        calories: log.calories,
        proteinG: log.protein_g,
        carbsG: log.carbs_g,
        fatsG: log.fats_g,
        supplements: Array.isArray(log.supplements) ? log.supplements as string[] : null,
      }));

      setMeals(mappedMeals);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from('vault_nutrition_logs')
        .delete()
        .eq('id', mealId);

      if (error) throw error;

      setMeals(prev => prev.filter(m => m.id !== mealId));
      toast.success('Meal deleted');
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error('Failed to delete meal');
    }
  };

  const goToPreviousDay = () => handleDateChange(subDays(currentDate, 1));
  const goToNextDay = () => handleDateChange(addDays(currentDate, 1));
  const goToToday = () => handleDateChange(new Date());

  // Calculate totals
  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.proteinG || 0),
    carbs: acc.carbs + (meal.carbsG || 0),
    fats: acc.fats + (meal.fatsG || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('nutrition.dailyLog', 'Daily Log')}
          </CardTitle>
          
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isToday(currentDate) ? 'secondary' : 'ghost'}
              size="sm"
              className="min-w-[100px]"
              onClick={goToToday}
            >
              {isToday(currentDate) 
                ? t('common.today', 'Today')
                : format(currentDate, 'MMM d')
              }
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextDay}
              disabled={isToday(currentDate)}
            >
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
            {/* Meal cards */}
            <div className="space-y-2">
              {meals.map((meal) => (
                <MealLogCard
                  key={meal.id}
                  meal={meal}
                  onEdit={onEditMeal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>

            {/* Day totals */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('nutrition.dayTotals', 'Day Totals')}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{totals.calories}</p>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totals.protein}g
                  </p>
                  <p className="text-xs text-muted-foreground">protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {totals.carbs}g
                  </p>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {totals.fats}g
                  </p>
                  <p className="text-xs text-muted-foreground">fats</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
