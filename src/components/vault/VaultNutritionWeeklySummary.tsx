import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, ChevronRight, Calendar, Apple, 
  TrendingUp, TrendingDown, Minus, Droplets, Beef, Wheat, Flame, ArrowLeftRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { VaultNutritionGoals } from '@/hooks/useVault';

interface DailyNutritionStats {
  day: string;
  dayShort: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  hydration: number;
  hasMeals: boolean;
  mealCount: number;
}

export interface WeeklyNutritionData {
  weekStart: string;
  weekEnd: string;
  dailyData: DailyNutritionStats[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgHydration: number;
  daysLogged: number;
  totalMeals: number;
}

interface VaultNutritionWeeklySummaryProps {
  fetchWeeklyNutrition: (weekStart: string) => Promise<WeeklyNutritionData>;
  goals: VaultNutritionGoals | null;
}

export function VaultNutritionWeeklySummary({ fetchWeeklyNutrition, goals }: VaultNutritionWeeklySummaryProps) {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyData, setWeeklyData] = useState<WeeklyNutritionData | null>(null);
  const [lastWeekData, setLastWeekData] = useState<WeeklyNutritionData | null>(null);
  const [loading, setLoading] = useState(false);

  const isCurrentWeek = isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 });

  const loadWeeklyData = useCallback(async () => {
    setLoading(true);
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const lastWeekStart = format(subWeeks(currentWeek, 1), 'yyyy-MM-dd');
    
    const [current, previous] = await Promise.all([
      fetchWeeklyNutrition(weekStart),
      fetchWeeklyNutrition(lastWeekStart),
    ]);
    
    setWeeklyData(current);
    setLastWeekData(previous);
    setLoading(false);
  }, [currentWeek, fetchWeeklyNutrition]);

  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const weekEndDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekLabel = `${format(currentWeek, 'MMM d')} - ${format(weekEndDate, 'MMM d, yyyy')}`;

  const hasData = weeklyData && weeklyData.daysLogged > 0;
  const hasLastWeekData = lastWeekData && lastWeekData.daysLogged > 0;

  // Calculate goal achievement percentages
  const getGoalPercentage = (actual: number, goal: number) => {
    if (!goal || goal === 0) return 0;
    return Math.min(Math.round((actual / goal) * 100), 150);
  };

  const getGoalColor = (percentage: number) => {
    if (percentage >= 80 && percentage <= 120) return 'text-green-500';
    if (percentage >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  // Trend calculation helpers
  const getTrendInfo = (current: number, previous: number) => {
    if (!previous || previous === 0) return { icon: Minus, color: 'text-muted-foreground', percent: 0, label: 'stable' };
    const percentChange = ((current - previous) / previous) * 100;
    if (percentChange > 5) return { icon: TrendingUp, color: 'text-green-500', percent: Math.round(percentChange), label: 'up' };
    if (percentChange < -5) return { icon: TrendingDown, color: 'text-red-500', percent: Math.round(percentChange), label: 'down' };
    return { icon: Minus, color: 'text-amber-500', percent: Math.round(percentChange), label: 'stable' };
  };

  const getDayIndicator = (day: DailyNutritionStats) => {
    if (!day.hasMeals) return { icon: '—', color: 'text-muted-foreground', bgColor: 'bg-muted/50' };
    
    let totalPercent = 0;
    let count = 0;
    
    if (goals) {
      if (goals.calorie_goal) { totalPercent += getGoalPercentage(day.calories, goals.calorie_goal); count++; }
      if (goals.protein_goal) { totalPercent += getGoalPercentage(day.protein, goals.protein_goal); count++; }
      if (goals.carbs_goal) { totalPercent += getGoalPercentage(day.carbs, goals.carbs_goal); count++; }
      if (goals.fats_goal) { totalPercent += getGoalPercentage(day.fats, goals.fats_goal); count++; }
      if (goals.hydration_goal) { totalPercent += getGoalPercentage(day.hydration, goals.hydration_goal); count++; }
    }
    
    const avgPercent = count > 0 ? totalPercent / count : 50;
    
    if (avgPercent >= 80) return { icon: '✓', color: 'text-green-500', bgColor: 'bg-green-500/20 border-green-500/40' };
    if (avgPercent >= 50) return { icon: '!', color: 'text-amber-500', bgColor: 'bg-amber-500/20 border-amber-500/40' };
    return { icon: '✗', color: 'text-red-500', bgColor: 'bg-red-500/20 border-red-500/40' };
  };

  // Generate weekly insights
  const generateInsights = () => {
    if (!weeklyData || !goals) return [];
    
    const insights: string[] = [];
    
    const bestDay = weeklyData.dailyData
      .filter(d => d.hasMeals)
      .sort((a, b) => {
        const aScore = getGoalPercentage(a.calories, goals.calorie_goal || 2000) +
                       getGoalPercentage(a.protein, goals.protein_goal || 150);
        const bScore = getGoalPercentage(b.calories, goals.calorie_goal || 2000) +
                       getGoalPercentage(b.protein, goals.protein_goal || 150);
        return bScore - aScore;
      })[0];
    
    if (bestDay) {
      insights.push(t('vault.nutritionWeekly.bestDayInsight', { day: bestDay.dayShort }));
    }
    
    const proteinPercent = getGoalPercentage(weeklyData.avgProtein, goals.protein_goal || 150);
    if (proteinPercent < 80) {
      insights.push(t('vault.nutritionWeekly.proteinLowInsight', { percent: proteinPercent }));
    }
    
    const hydrationPercent = getGoalPercentage(weeklyData.avgHydration, goals.hydration_goal || 100);
    if (hydrationPercent < 60) {
      insights.push(t('vault.nutritionWeekly.hydrationLowInsight', { percent: hydrationPercent }));
    }
    
    if (weeklyData.daysLogged >= 5) {
      insights.push(t('vault.nutritionWeekly.consistencyGoodInsight', { days: weeklyData.daysLogged }));
    } else if (weeklyData.daysLogged < 3) {
      insights.push(t('vault.nutritionWeekly.consistencyLowInsight'));
    }
    
    return insights;
  };

  // Calculate overall trend
  const getOverallTrend = () => {
    if (!weeklyData || !lastWeekData || !hasLastWeekData) return null;
    
    const metrics = [
      { current: weeklyData.avgCalories, previous: lastWeekData.avgCalories },
      { current: weeklyData.avgProtein, previous: lastWeekData.avgProtein },
      { current: weeklyData.avgCarbs, previous: lastWeekData.avgCarbs },
      { current: weeklyData.avgFats, previous: lastWeekData.avgFats },
      { current: weeklyData.avgHydration, previous: lastWeekData.avgHydration },
    ];
    
    let improvements = 0;
    let regressions = 0;
    
    metrics.forEach(({ current, previous }) => {
      if (!previous) return;
      const change = ((current - previous) / previous) * 100;
      if (change > 5) improvements++;
      else if (change < -5) regressions++;
    });
    
    if (improvements > regressions) return { label: t('vault.nutritionWeekly.improving'), color: 'text-green-500', icon: TrendingUp };
    if (regressions > improvements) return { label: t('vault.nutritionWeekly.declining'), color: 'text-red-500', icon: TrendingDown };
    return { label: t('vault.nutritionWeekly.stable'), color: 'text-amber-500', icon: Minus };
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Apple className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {t('vault.nutritionWeekly.title')}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {isCurrentWeek ? t('vault.weekly.thisWeek') : ''} {weekLabel}
              </span>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToNextWeek}
              disabled={isCurrentWeek}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t('common.loading')}
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Apple className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('vault.nutritionWeekly.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Week vs Week Comparison */}
          {hasLastWeekData && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-purple-500" />
                  {t('vault.nutritionWeekly.weekComparison')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Comparison rows */}
                {[
                  { key: 'calories', label: t('vault.nutrition.calories'), current: weeklyData?.avgCalories || 0, previous: lastWeekData?.avgCalories || 0, icon: Flame, iconColor: 'text-orange-500' },
                  { key: 'protein', label: t('vault.nutrition.protein'), current: weeklyData?.avgProtein || 0, previous: lastWeekData?.avgProtein || 0, icon: Beef, iconColor: 'text-red-500', unit: 'g' },
                  { key: 'carbs', label: t('vault.nutrition.carbs'), current: weeklyData?.avgCarbs || 0, previous: lastWeekData?.avgCarbs || 0, icon: Wheat, iconColor: 'text-amber-500', unit: 'g' },
                  { key: 'hydration', label: t('vault.nutrition.hydration'), current: weeklyData?.avgHydration || 0, previous: lastWeekData?.avgHydration || 0, icon: Droplets, iconColor: 'text-blue-500', unit: 'oz' },
                ].map((item) => {
                  const trend = getTrendInfo(item.current, item.previous);
                  const TrendIcon = trend.icon;
                  return (
                    <div key={item.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {Math.round(item.previous)}{item.unit || ''}
                        </span>
                        <span>→</span>
                        <span className="font-medium">
                          {Math.round(item.current)}{item.unit || ''}
                        </span>
                        <div className={`flex items-center gap-1 ${trend.color}`}>
                          <TrendIcon className="h-4 w-4" />
                          <Badge variant="outline" className={`text-xs ${trend.color} border-current`}>
                            {trend.percent > 0 ? '+' : ''}{trend.percent}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Overall Trend */}
                {(() => {
                  const trend = getOverallTrend();
                  if (!trend) return null;
                  const TrendIcon = trend.icon;
                  return (
                    <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between">
                      <span className="text-sm font-medium">{t('vault.nutritionWeekly.overallTrend')}</span>
                      <div className={`flex items-center gap-2 ${trend.color}`}>
                        <TrendIcon className="h-5 w-5" />
                        <span className="font-medium">{trend.label}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {!hasLastWeekData && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                <ArrowLeftRight className="h-5 w-5 mx-auto mb-1 opacity-50" />
                {t('vault.nutritionWeekly.noLastWeekData')}
              </CardContent>
            </Card>
          )}

          {/* Average Daily Intake */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {t('vault.nutritionWeekly.avgDailyIntake')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 text-center">
                  <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                  <p className="text-xl font-bold">{Math.round(weeklyData?.avgCalories || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('vault.nutrition.calories')}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 text-center">
                  <Beef className="h-5 w-5 mx-auto text-red-500 mb-1" />
                  <p className="text-xl font-bold">{Math.round(weeklyData?.avgProtein || 0)}g</p>
                  <p className="text-xs text-muted-foreground">{t('vault.nutrition.protein')}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 text-center">
                  <Wheat className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-xl font-bold">{Math.round(weeklyData?.avgCarbs || 0)}g</p>
                  <p className="text-xs text-muted-foreground">{t('vault.nutrition.carbs')}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 text-center">
                  <Droplets className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                  <p className="text-xl font-bold">{Math.round(weeklyData?.avgHydration || 0)}</p>
                  <p className="text-xs text-muted-foreground">{t('vault.nutrition.hydration')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Achievement Trends */}
          {goals && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {t('vault.nutritionWeekly.goalTrends')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'calories', label: t('vault.nutrition.calories'), value: weeklyData?.avgCalories || 0, goal: goals.calorie_goal },
                  { key: 'protein', label: t('vault.nutrition.protein'), value: weeklyData?.avgProtein || 0, goal: goals.protein_goal },
                  { key: 'carbs', label: t('vault.nutrition.carbs'), value: weeklyData?.avgCarbs || 0, goal: goals.carbs_goal },
                  { key: 'fats', label: t('vault.nutrition.fats'), value: weeklyData?.avgFats || 0, goal: goals.fats_goal },
                  { key: 'hydration', label: t('vault.nutrition.hydration'), value: weeklyData?.avgHydration || 0, goal: goals.hydration_goal },
                ].map(item => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className={getGoalColor(getGoalPercentage(item.value, item.goal))}>
                        {getGoalPercentage(item.value, item.goal)}% {t('vault.nutritionWeekly.avg')}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(getGoalPercentage(item.value, item.goal), 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Daily Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('vault.nutritionWeekly.dailyBreakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyData?.dailyData.map((day, i) => {
                  const indicator = getDayIndicator(day);
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs p-1 border transition-all ${indicator.bgColor}`}
                    >
                      <span className="font-medium">{day.dayShort}</span>
                      <span className={`text-sm font-bold ${indicator.color}`}>{indicator.icon}</span>
                      {day.hasMeals && (
                        <span className="text-[10px] text-muted-foreground">{day.mealCount} {t('vault.nutritionWeekly.meals')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40"></span>
                  <span>≥80%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40"></span>
                  <span>50-79%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40"></span>
                  <span>&lt;50%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Insights */}
          {goals && generateInsights().length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t('vault.nutritionWeekly.weeklyInsights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {generateInsights().map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{weeklyData?.daysLogged || 0}/7</p>
                <p className="text-xs text-muted-foreground">{t('vault.nutritionWeekly.daysLogged')}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{weeklyData?.totalMeals || 0}</p>
                <p className="text-xs text-muted-foreground">{t('vault.nutritionWeekly.totalMeals')}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}