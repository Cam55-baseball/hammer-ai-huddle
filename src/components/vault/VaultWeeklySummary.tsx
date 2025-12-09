import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, Calendar, Dumbbell, Brain, 
  Apple, TrendingUp, Zap, Activity, Target, Moon
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, eachDayOfInterval } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VaultStreak } from '@/hooks/useVault';

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  quizzes: any[];
  workouts: any[];
  nutrition: any[];
  performanceTests: any[];
  totalWorkouts: number;
  totalWeightLifted: number;
  avgEnergy: number;
  avgMental: number;
  avgEmotional: number;
  avgPhysical: number;
  dailyData: DailyStats[];
}

interface DailyStats {
  day: string;
  dayShort: string;
  mental: number | null;
  emotional: number | null;
  physical: number | null;
  weight: number;
  energy: number | null;
  hasEntry: boolean;
  hoursSlept: number | null;
  sleepQuality: number | null;
}

interface VaultWeeklySummaryProps {
  fetchWeeklyData: (weekStart: string) => Promise<WeeklyData>;
  streak: VaultStreak | null;
}

export function VaultWeeklySummary({ fetchWeeklyData, streak }: VaultWeeklySummaryProps) {
  const { t } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);

  const isCurrentWeek = isSameWeek(currentWeek, new Date(), { weekStartsOn: 1 });

  const loadWeeklyData = useCallback(async () => {
    setLoading(true);
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const data = await fetchWeeklyData(weekStart);
    setWeeklyData(data);
    setLoading(false);
  }, [currentWeek, fetchWeeklyData]);

  useEffect(() => {
    loadWeeklyData();
  }, [loadWeeklyData]);

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  const weekEndDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekLabel = `${format(currentWeek, 'MMM d')} - ${format(weekEndDate, 'MMM d, yyyy')}`;

  const hasData = weeklyData && (
    weeklyData.totalWorkouts > 0 || 
    weeklyData.quizzes.length > 0 || 
    weeklyData.nutrition.length > 0 ||
    weeklyData.performanceTests.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {isCurrentWeek ? t('vault.weekly.thisWeek') : weekLabel}
                </span>
              </div>
              {isCurrentWeek && (
                <span className="text-xs text-muted-foreground">{weekLabel}</span>
              )}
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
            <p>{t('vault.weekly.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-4 text-center">
                <Dumbbell className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{weeklyData?.totalWorkouts || 0}</p>
                <p className="text-xs text-muted-foreground">{t('vault.weekly.totalWorkouts')}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{weeklyData?.totalWeightLifted?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{t('vault.weekly.totalWeight')}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Zap className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{weeklyData?.avgEnergy?.toFixed(1) || '-'}</p>
                <p className="text-xs text-muted-foreground">{t('vault.weekly.avgEnergy')}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Brain className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{weeklyData?.quizzes?.length || 0}</p>
                <p className="text-xs text-muted-foreground">{t('vault.weekly.quizzesCompleted')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Readiness Trend Chart */}
          {weeklyData?.dailyData && weeklyData.dailyData.some(d => d.mental !== null) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {t('vault.weekly.readinessTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="dayShort" 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mental" 
                      name={t('vault.weekly.mental')}
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="emotional" 
                      name={t('vault.weekly.emotional')}
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="physical" 
                      name={t('vault.weekly.physical')}
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Sleep Trend Chart */}
          {weeklyData?.dailyData && weeklyData.dailyData.some(d => d.hoursSlept !== null) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  {t('vault.weekly.sleepTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="dayShort" 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      yAxisId="hours"
                      domain={[0, 12]} 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: t('vault.weekly.hours'), angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="quality"
                      orientation="right"
                      domain={[0, 5]} 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: t('vault.weekly.quality'), angle: 90, position: 'insideRight', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="hours"
                      type="monotone" 
                      dataKey="hoursSlept" 
                      name={t('vault.weekly.hoursSlept')}
                      stroke="#6366f1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366f1' }}
                      connectNulls
                    />
                    <Line 
                      yAxisId="quality"
                      type="monotone" 
                      dataKey="sleepQuality" 
                      name={t('vault.weekly.sleepQuality')}
                      stroke="#a855f7" 
                      strokeWidth={2}
                      dot={{ fill: '#a855f7' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Weight Lifted Trend */}
          {weeklyData?.dailyData && weeklyData.dailyData.some(d => d.weight > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  {t('vault.weekly.weightTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="dayShort" 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} lbs`, t('vault.weekly.weightLifted')]}
                    />
                    <Bar 
                      dataKey="weight" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Activity Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('vault.weekly.activityHeatmap')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyData?.dailyData.map((day, i) => (
                  <div 
                    key={i} 
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs p-1 transition-all ${
                      day.hasEntry 
                        ? 'bg-primary/20 border border-primary/40' 
                        : 'bg-muted/50 border border-border'
                    }`}
                  >
                    <span className="font-medium">{day.dayShort}</span>
                    {day.hasEntry && (
                      <span className="text-[10px] text-primary">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Highlights */}
          {streak && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {t('vault.weekly.weeklyHighlights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('vault.weekly.currentStreak')}</p>
                    <p className="font-bold text-lg">{streak.current_streak} {t('vault.weekly.days')}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('vault.weekly.longestStreak')}</p>
                    <p className="font-bold text-lg">{streak.longest_streak} {t('vault.weekly.days')}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('vault.weekly.totalEntries')}</p>
                    <p className="font-bold text-lg">{streak.total_entries}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">{t('vault.weekly.badgesEarned')}</p>
                    <p className="font-bold text-lg">{streak.badges_earned?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
