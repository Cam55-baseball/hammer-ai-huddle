import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, isThisWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDailyNutritionTargets } from '@/hooks/useDailyNutritionTargets';
import { cn } from '@/lib/utils';

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealsLogged: number;
}

interface WeeklyStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  totalMeals: number;
  daysLogged: number;
  dailyData: DailyData[];
}

export function NutritionWeeklySummary() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { targets } = useDailyNutritionTargets();
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [prevWeekStats, setPrevWeekStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const currentWeekStart = startOfWeek(subWeeks(new Date(), -weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const fetchWeekData = useCallback(async (startDate: Date, endDate: Date): Promise<WeeklyStats> => {
    if (!user) return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFats: 0, totalMeals: 0, daysLogged: 0, dailyData: [] };

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('vault_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', startStr)
      .lte('entry_date', endStr);

    if (error) {
      console.error('Error fetching weekly data:', error);
      return { avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFats: 0, totalMeals: 0, daysLogged: 0, dailyData: [] };
    }

    // Group by date
    const dayMap = new Map<string, { calories: number; protein: number; carbs: number; fats: number; meals: number }>();
    
    (data || []).forEach(log => {
      const dateKey = log.entry_date;
      const existing = dayMap.get(dateKey) || { calories: 0, protein: 0, carbs: 0, fats: 0, meals: 0 };
      dayMap.set(dateKey, {
        calories: existing.calories + (log.calories || 0),
        protein: existing.protein + (log.protein_g || 0),
        carbs: existing.carbs + (log.carbs_g || 0),
        fats: existing.fats + (log.fats_g || 0),
        meals: existing.meals + 1,
      });
    });

    // Build daily data for all days in the week
    const daysInWeek = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData: DailyData[] = daysInWeek.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = dayMap.get(dateStr);
      return {
        date: dateStr,
        calories: dayData?.calories || 0,
        protein: dayData?.protein || 0,
        carbs: dayData?.carbs || 0,
        fats: dayData?.fats || 0,
        mealsLogged: dayData?.meals || 0,
      };
    });

    const daysLogged = Array.from(dayMap.keys()).length;
    const totalMeals = data?.length || 0;

    // Calculate averages (only for days with data)
    const totalCalories = dailyData.reduce((sum, d) => sum + d.calories, 0);
    const totalProtein = dailyData.reduce((sum, d) => sum + d.protein, 0);
    const totalCarbs = dailyData.reduce((sum, d) => sum + d.carbs, 0);
    const totalFats = dailyData.reduce((sum, d) => sum + d.fats, 0);

    return {
      avgCalories: daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0,
      avgProtein: daysLogged > 0 ? Math.round(totalProtein / daysLogged) : 0,
      avgCarbs: daysLogged > 0 ? Math.round(totalCarbs / daysLogged) : 0,
      avgFats: daysLogged > 0 ? Math.round(totalFats / daysLogged) : 0,
      totalMeals,
      daysLogged,
      dailyData,
    };
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [currentStats, previousStats] = await Promise.all([
          fetchWeekData(currentWeekStart, currentWeekEnd),
          fetchWeekData(subWeeks(currentWeekStart, 1), subWeeks(currentWeekEnd, 1)),
        ]);
        setStats(currentStats);
        setPrevWeekStats(previousStats);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchWeekData, currentWeekStart, currentWeekEnd]);

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 'neutral';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'neutral';
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => setWeekOffset(prev => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-7 gap-1">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('nutrition.weeklySummary', 'Weekly Summary')}
          </CardTitle>
          
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant={weekOffset === 0 ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={goToCurrentWeek}
            >
              {weekOffset === 0 
                ? t('common.thisWeek', 'This Week')
                : `${format(currentWeekStart, 'MMM d')} - ${format(currentWeekEnd, 'MMM d')}`
              }
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextWeek}
              disabled={weekOffset === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {stats && (
          <>
            {/* Average stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Calories</span>
                  <TrendIcon trend={getTrend(stats.avgCalories, prevWeekStats?.avgCalories || 0)} />
                </div>
                <p className="text-xl font-bold">{stats.avgCalories}</p>
                {targets && (
                  <Progress 
                    value={Math.min(100, (stats.avgCalories / targets.calories) * 100)} 
                    className="h-1 mt-1"
                  />
                )}
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Protein</span>
                  <TrendIcon trend={getTrend(stats.avgProtein, prevWeekStats?.avgProtein || 0)} />
                </div>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.avgProtein}g</p>
              </div>
              
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Carbs</span>
                  <TrendIcon trend={getTrend(stats.avgCarbs, prevWeekStats?.avgCarbs || 0)} />
                </div>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.avgCarbs}g</p>
              </div>
              
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Fats</span>
                  <TrendIcon trend={getTrend(stats.avgFats, prevWeekStats?.avgFats || 0)} />
                </div>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.avgFats}g</p>
              </div>
            </div>

            {/* Daily breakdown mini chart */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('nutrition.dailyBreakdown', 'Daily Breakdown')}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {stats.dailyData.map((day, idx) => {
                    const dayName = format(new Date(day.date), 'EEE');
                  const hasData = day.mealsLogged > 0;
                  const caloriePercent = targets 
                    ? Math.min(100, (day.calories / targets.calories) * 100)
                    : 0;
                  
                  return (
                    <div 
                      key={day.date}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg border text-center transition-colors",
                        hasData 
                          ? "bg-primary/5 border-primary/20" 
                          : "bg-muted/30 border-muted"
                      )}
                    >
                      <span className="text-xs font-medium">{dayName}</span>
                      <span className={cn(
                        "text-sm font-bold mt-1",
                        hasData ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {hasData ? day.calories : '-'}
                      </span>
                      {hasData && (
                        <div className="w-full h-1 rounded-full bg-muted mt-1">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              caloriePercent >= 90 && caloriePercent <= 110 
                                ? "bg-green-500" 
                                : caloriePercent > 110 
                                  ? "bg-amber-500"
                                  : "bg-primary"
                            )}
                            style={{ width: `${Math.min(100, caloriePercent)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                {stats.daysLogged}/7 {t('nutrition.daysLogged', 'days logged')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats.totalMeals} {t('nutrition.totalMeals', 'total meals')}
              </Badge>
              {stats.daysLogged >= 5 && (
                <Badge className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                  🔥 {t('nutrition.consistentWeek', 'Consistent Week!')}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
