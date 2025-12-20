import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sword, TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VaultFocusQuiz {
  id: string;
  entry_date: string;
  quiz_type: string;
  discipline_level?: number;
}

interface VaultDisciplineTrendCardProps {
  isLoading?: boolean;
}

export function VaultDisciplineTrendCard({ isLoading: parentLoading }: VaultDisciplineTrendCardProps) {
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
        .select('id, entry_date, quiz_type, discipline_level')
        .eq('user_id', user.id)
        .eq('quiz_type', 'morning')
        .gte('entry_date', fourteenDaysAgo)
        .order('entry_date', { ascending: false });
      setQuizzes((data || []) as VaultFocusQuiz[]);
      setLoading(false);
    };
    fetchQuizzes();
  }, [user]);

  const { weekData, thisWeekAvg, lastWeekAvg, trend, streak } = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const startOfLastWeek = subDays(startOfThisWeek, 7);
    const endOfLastWeek = subDays(startOfThisWeek, 1);

    // Get morning quizzes with discipline levels
    const morningQuizzes = quizzes.filter(
      q => q.quiz_type === 'morning' && q.discipline_level !== undefined && q.discipline_level !== null
    );

    // Create week data for chart
    const daysOfWeek = eachDayOfInterval({ start: startOfThisWeek, end: endOfThisWeek });
    const weekData = daysOfWeek.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const quiz = morningQuizzes.find(q => q.entry_date === dateStr);
      return {
        day: format(day, 'EEE'),
        fullDate: dateStr,
        level: quiz?.discipline_level || 0,
        hasData: !!quiz,
      };
    });

    // Calculate this week's average
    const thisWeekQuizzes = morningQuizzes.filter(q => {
      const date = parseISO(q.entry_date);
      return date >= startOfThisWeek && date <= endOfThisWeek;
    });
    const thisWeekAvg = thisWeekQuizzes.length > 0
      ? thisWeekQuizzes.reduce((sum, q) => sum + (q.discipline_level || 0), 0) / thisWeekQuizzes.length
      : 0;

    // Calculate last week's average
    const lastWeekQuizzes = morningQuizzes.filter(q => {
      const date = parseISO(q.entry_date);
      return date >= startOfLastWeek && date <= endOfLastWeek;
    });
    const lastWeekAvg = lastWeekQuizzes.length > 0
      ? lastWeekQuizzes.reduce((sum, q) => sum + (q.discipline_level || 0), 0) / lastWeekQuizzes.length
      : 0;

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (thisWeekAvg > lastWeekAvg + 0.2) trend = 'improving';
    else if (thisWeekAvg < lastWeekAvg - 0.2) trend = 'declining';

    // Calculate streak of days at level 4+ (Locked In or Unbreakable)
    let streak = 0;
    const sortedQuizzes = [...morningQuizzes]
      .filter(q => (q.discipline_level || 0) >= 4)
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    
    const todayStr = format(today, 'yyyy-MM-dd');
    let checkDate = todayStr;
    
    for (const quiz of sortedQuizzes) {
      if (quiz.entry_date === checkDate) {
        streak++;
        checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    return { weekData, thisWeekAvg, lastWeekAvg, trend, streak };
  }, [quizzes]);

  const getBarColor = (level: number) => {
    if (level === 0) return 'hsl(var(--muted))';
    if (level === 1) return '#ef4444'; // red
    if (level === 2) return '#f97316'; // orange
    if (level === 3) return '#f59e0b'; // amber
    if (level === 4) return '#84cc16'; // lime
    return '#22c55e'; // green
  };

  const diff = thisWeekAvg - lastWeekAvg;

  if (loading || parentLoading) {
    return (
      <Card className="border-amber-500/20">
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
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Sword className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">{t('vault.disciplineTrend.title')}</CardTitle>
              <CardDescription className="text-xs">{t('vault.disciplineTrend.subtitle')}</CardDescription>
            </div>
          </div>
          {streak > 0 && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
              <Flame className="h-3 w-3" />
              {streak} {t('vault.disciplineTrend.streak')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyData ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {t('vault.disciplineTrend.noData')}
          </div>
        ) : (
          <>
            {/* Bar Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[1, 2, 3, 4, 5]}
                  />
                  <Bar dataKey="level" radius={[4, 4, 0, 0]}>
                    {weekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.level)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">{t('vault.disciplineTrend.weeklyAvg')}</p>
                <p className="text-xl font-bold">{thisWeekAvg.toFixed(1)}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {trend === 'improving' && (
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      +{Math.abs(diff).toFixed(1)} {t('vault.disciplineTrend.vsLastWeek')}
                    </span>
                  </div>
                )}
                {trend === 'declining' && (
                  <div className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      -{Math.abs(diff).toFixed(1)} {t('vault.disciplineTrend.vsLastWeek')}
                    </span>
                  </div>
                )}
                {trend === 'stable' && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Minus className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('vault.disciplineTrend.stable')}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}