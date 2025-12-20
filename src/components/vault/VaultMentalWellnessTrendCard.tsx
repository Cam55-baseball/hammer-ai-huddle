import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Minus, Heart, Frown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VaultFocusQuiz {
  id: string;
  entry_date: string;
  quiz_type: string;
  mood_level?: number;
  stress_level?: number;
}

interface VaultMentalWellnessTrendCardProps {
  isLoading?: boolean;
}

export function VaultMentalWellnessTrendCard({ isLoading: parentLoading }: VaultMentalWellnessTrendCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<VaultFocusQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user) return;
      const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('vault_focus_quizzes')
        .select('id, entry_date, quiz_type, mood_level, stress_level')
        .eq('user_id', user.id)
        .eq('quiz_type', 'morning')
        .gte('entry_date', fourteenDaysAgo)
        .order('entry_date', { ascending: false });
      setQuizzes((data || []) as VaultFocusQuiz[]);
      setLoading(false);
    };
    fetchQuizzes();
  }, [user]);

  const { weekData, moodAvg, stressAvg, lastMoodAvg, lastStressAvg, moodTrend, stressTrend, wellnessScore } = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const startOfLastWeek = subDays(startOfThisWeek, 7);
    const endOfLastWeek = subDays(startOfThisWeek, 1);

    // Get morning quizzes with mood/stress levels
    const morningQuizzes = quizzes.filter(
      q => q.quiz_type === 'morning' && (q.mood_level !== undefined || q.stress_level !== undefined)
    );

    // Create week data for chart
    const daysOfWeek = eachDayOfInterval({ start: startOfThisWeek, end: endOfThisWeek });
    const weekData = daysOfWeek.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const quiz = morningQuizzes.find(q => q.entry_date === dateStr);
      return {
        day: format(day, 'EEE'),
        fullDate: dateStr,
        mood: quiz?.mood_level || null,
        stress: quiz?.stress_level || null,
        hasData: !!(quiz?.mood_level || quiz?.stress_level),
      };
    });

    // Calculate this week's averages
    const thisWeekQuizzes = morningQuizzes.filter(q => {
      const date = parseISO(q.entry_date);
      return date >= startOfThisWeek && date <= endOfThisWeek;
    });
    
    const moodQuizzes = thisWeekQuizzes.filter(q => q.mood_level !== undefined && q.mood_level !== null);
    const stressQuizzes = thisWeekQuizzes.filter(q => q.stress_level !== undefined && q.stress_level !== null);
    
    const moodAvg = moodQuizzes.length > 0
      ? moodQuizzes.reduce((sum, q) => sum + (q.mood_level || 0), 0) / moodQuizzes.length
      : 0;
    const stressAvg = stressQuizzes.length > 0
      ? stressQuizzes.reduce((sum, q) => sum + (q.stress_level || 0), 0) / stressQuizzes.length
      : 0;

    // Calculate last week's averages
    const lastWeekQuizzes = morningQuizzes.filter(q => {
      const date = parseISO(q.entry_date);
      return date >= startOfLastWeek && date <= endOfLastWeek;
    });
    
    const lastMoodQuizzes = lastWeekQuizzes.filter(q => q.mood_level !== undefined && q.mood_level !== null);
    const lastStressQuizzes = lastWeekQuizzes.filter(q => q.stress_level !== undefined && q.stress_level !== null);
    
    const lastMoodAvg = lastMoodQuizzes.length > 0
      ? lastMoodQuizzes.reduce((sum, q) => sum + (q.mood_level || 0), 0) / lastMoodQuizzes.length
      : 0;
    const lastStressAvg = lastStressQuizzes.length > 0
      ? lastStressQuizzes.reduce((sum, q) => sum + (q.stress_level || 0), 0) / lastStressQuizzes.length
      : 0;

    // Calculate trends
    const getTrend = (current: number, last: number, inverse = false): 'improving' | 'declining' | 'stable' => {
      const diff = inverse ? last - current : current - last;
      if (diff > 0.2) return 'improving';
      if (diff < -0.2) return 'declining';
      return 'stable';
    };

    const moodTrend = getTrend(moodAvg, lastMoodAvg);
    const stressTrend = getTrend(stressAvg, lastStressAvg, true); // Inverse: lower stress = better

    // Calculate wellness score (0-100)
    // High mood (5) + Low stress (1) = 100, Low mood (1) + High stress (5) = 0
    const wellnessScore = moodAvg > 0 && stressAvg > 0
      ? Math.round(((moodAvg - 1) / 4 * 50) + ((5 - stressAvg) / 4 * 50))
      : 0;

    return { weekData, moodAvg, stressAvg, lastMoodAvg, lastStressAvg, moodTrend, stressTrend, wellnessScore };
  }, [quizzes]);

  const moodDiff = moodAvg - lastMoodAvg;
  const stressDiff = stressAvg - lastStressAvg;

  const getWellnessLabel = () => {
    if (wellnessScore >= 70) return t('vault.mentalWellnessTrend.wellnessHigh');
    if (wellnessScore >= 40) return t('vault.mentalWellnessTrend.wellnessMedium');
    return t('vault.mentalWellnessTrend.wellnessLow');
  };

  if (loading || parentLoading) {
    return (
      <Card className="border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/50 animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = weekData.some(d => d.hasData);

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">{t('vault.mentalWellnessTrend.title')}</CardTitle>
              <CardDescription className="text-xs">{t('vault.mentalWellnessTrend.subtitle')}</CardDescription>
            </div>
          </div>
          {hasAnyData && wellnessScore > 0 && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
              {wellnessScore}/100
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyData ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {t('vault.mentalWellnessTrend.noData')}
          </div>
        ) : (
          <>
            {/* Line Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[1, 5]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[1, 2, 3, 4, 5]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                    connectNulls
                    name={t('vault.mentalWellnessTrend.moodAvg')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stress" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
                    connectNulls
                    name={t('vault.mentalWellnessTrend.stressAvg')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">{t('vault.mentalWellnessTrend.moodAvg')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Frown className="h-3 w-3 text-orange-500" />
                <span className="text-muted-foreground">{t('vault.mentalWellnessTrend.stressAvg')}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Mood Stats */}
              <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('vault.mentalWellnessTrend.moodAvg')}</p>
                    <p className="text-lg font-bold text-green-500">{moodAvg.toFixed(1)}</p>
                  </div>
                  {moodTrend === 'improving' && <TrendingUp className="h-4 w-4 text-green-500" />}
                  {moodTrend === 'declining' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  {moodTrend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
                {lastMoodAvg > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {moodDiff >= 0 ? '+' : ''}{moodDiff.toFixed(1)} {t('vault.disciplineTrend.vsLastWeek')}
                  </p>
                )}
              </div>

              {/* Stress Stats */}
              <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('vault.mentalWellnessTrend.stressAvg')}</p>
                    <p className="text-lg font-bold text-orange-500">{stressAvg.toFixed(1)}</p>
                  </div>
                  {stressTrend === 'improving' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {stressTrend === 'declining' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {stressTrend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
                </div>
                {lastStressAvg > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stressDiff >= 0 ? '+' : ''}{stressDiff.toFixed(1)} {t('vault.disciplineTrend.vsLastWeek')}
                  </p>
                )}
              </div>
            </div>

            {/* Wellness Score */}
            {wellnessScore > 0 && (
              <div className="p-3 bg-background/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t('vault.mentalWellnessTrend.wellnessScore')}</p>
                <p className="text-lg font-bold">{wellnessScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                <p className="text-xs text-muted-foreground">{getWellnessLabel()}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
