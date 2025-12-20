import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Brain, AlertTriangle, Sword, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, parseISO } from 'date-fns';

interface DayData {
  date: string;
  mood: number | null;
  stress: number | null;
  discipline: number | null;
}

interface CorrelationResult {
  pair: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative';
}

export function VaultCorrelationAnalysisCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      const endDate = new Date();
      const startDate = subDays(endDate, 13);
      
      const { data, error } = await supabase
        .from('vault_focus_quizzes')
        .select('entry_date, mood_level, stress_level, discipline_level, quiz_type')
        .eq('user_id', user.id)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0])
        .in('quiz_type', ['morning', 'night']);

      if (error) {
        console.error('Error fetching correlation data:', error);
        setLoading(false);
        return;
      }

      // Aggregate by date - take the average if multiple quizzes per day
      const dateMap = new Map<string, { moodSum: number; moodCount: number; stressSum: number; stressCount: number; disciplineSum: number; disciplineCount: number }>();
      
      (data || []).forEach((quiz) => {
        const existing = dateMap.get(quiz.entry_date) || { moodSum: 0, moodCount: 0, stressSum: 0, stressCount: 0, disciplineSum: 0, disciplineCount: 0 };
        
        if (quiz.mood_level !== null) {
          existing.moodSum += quiz.mood_level;
          existing.moodCount++;
        }
        if (quiz.stress_level !== null) {
          existing.stressSum += quiz.stress_level;
          existing.stressCount++;
        }
        if (quiz.discipline_level !== null) {
          existing.disciplineSum += quiz.discipline_level;
          existing.disciplineCount++;
        }
        dateMap.set(quiz.entry_date, existing);
      });

      // Generate all 14 days
      const chartPoints: DayData[] = [];
      for (let i = 13; i >= 0; i--) {
        const date = format(subDays(endDate, i), 'yyyy-MM-dd');
        const entry = dateMap.get(date);
        chartPoints.push({
          date,
          mood: entry && entry.moodCount > 0 ? Math.round((entry.moodSum / entry.moodCount) * 10) / 10 : null,
          stress: entry && entry.stressCount > 0 ? Math.round((entry.stressSum / entry.stressCount) * 10) / 10 : null,
          discipline: entry && entry.disciplineCount > 0 ? Math.round((entry.disciplineSum / entry.disciplineCount) * 10) / 10 : null,
        });
      }

      setChartData(chartPoints);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Calculate correlation coefficients
  const correlations = useMemo(() => {
    const validData = chartData.filter(d => d.mood !== null && d.stress !== null && d.discipline !== null);
    if (validData.length < 5) return [];

    const calculateCorrelation = (arr1: number[], arr2: number[]): number => {
      const n = arr1.length;
      const sum1 = arr1.reduce((a, b) => a + b, 0);
      const sum2 = arr2.reduce((a, b) => a + b, 0);
      const sum1Sq = arr1.reduce((a, b) => a + b * b, 0);
      const sum2Sq = arr2.reduce((a, b) => a + b * b, 0);
      const pSum = arr1.reduce((a, b, i) => a + b * arr2[i], 0);
      
      const num = pSum - (sum1 * sum2 / n);
      const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
      
      return den === 0 ? 0 : num / den;
    };

    const getStrength = (coef: number): 'strong' | 'moderate' | 'weak' => {
      const abs = Math.abs(coef);
      if (abs >= 0.6) return 'strong';
      if (abs >= 0.3) return 'moderate';
      return 'weak';
    };

    const moods = validData.map(d => d.mood!);
    const stresses = validData.map(d => d.stress!);
    const disciplines = validData.map(d => d.discipline!);

    const results: CorrelationResult[] = [
      {
        pair: 'moodDiscipline',
        coefficient: calculateCorrelation(moods, disciplines),
        strength: 'moderate',
        direction: 'positive'
      },
      {
        pair: 'stressDiscipline',
        coefficient: calculateCorrelation(stresses, disciplines),
        strength: 'moderate',
        direction: 'negative'
      },
      {
        pair: 'moodStress',
        coefficient: calculateCorrelation(moods, stresses),
        strength: 'moderate',
        direction: 'negative'
      }
    ];

    return results.map(r => ({
      ...r,
      strength: getStrength(r.coefficient),
      direction: r.coefficient >= 0 ? 'positive' as const : 'negative' as const
    }));
  }, [chartData]);

  // Generate insights
  const insights = useMemo(() => {
    const validData = chartData.filter(d => d.mood !== null && d.stress !== null && d.discipline !== null);
    if (validData.length < 5) return [];

    const insightsList: string[] = [];

    // High mood impact on discipline
    const highMoodDays = validData.filter(d => d.mood! >= 4);
    const lowMoodDays = validData.filter(d => d.mood! < 3);
    
    if (highMoodDays.length > 0 && lowMoodDays.length > 0) {
      const avgDisciplineHighMood = highMoodDays.reduce((a, b) => a + b.discipline!, 0) / highMoodDays.length;
      const avgDisciplineLowMood = lowMoodDays.reduce((a, b) => a + b.discipline!, 0) / lowMoodDays.length;
      const diff = ((avgDisciplineHighMood - avgDisciplineLowMood) / avgDisciplineLowMood * 100).toFixed(0);
      if (parseFloat(diff) > 10) {
        insightsList.push(t('vault.correlationAnalysis.insightMoodDiscipline', { percent: diff }));
      }
    }

    // Low stress impact
    const lowStressDays = validData.filter(d => d.stress! <= 2);
    if (lowStressDays.length > 0) {
      const avgDisciplineLowStress = lowStressDays.reduce((a, b) => a + b.discipline!, 0) / lowStressDays.length;
      const overallAvgDiscipline = validData.reduce((a, b) => a + b.discipline!, 0) / validData.length;
      const boost = (avgDisciplineLowStress - overallAvgDiscipline).toFixed(1);
      if (parseFloat(boost) > 0.3) {
        insightsList.push(t('vault.correlationAnalysis.insightStressDiscipline', { boost }));
      }
    }

    // Best combo
    const optimalDays = validData.filter(d => d.mood! >= 4 && d.stress! <= 2);
    if (optimalDays.length > 0) {
      insightsList.push(t('vault.correlationAnalysis.insightOptimalCombo'));
    }

    return insightsList;
  }, [chartData, t]);

  const hasData = chartData.some(d => d.mood !== null || d.stress !== null || d.discipline !== null);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            {t('vault.correlationAnalysis.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('vault.correlationAnalysis.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const getStrengthColor = (strength: string, direction: string) => {
    if (strength === 'strong') return direction === 'positive' ? 'text-green-500' : 'text-red-500';
    if (strength === 'moderate') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const getStrengthEmoji = (strength: string, direction: string) => {
    if (strength === 'strong') return direction === 'positive' ? '🟢' : '🔴';
    if (strength === 'moderate') return '🟡';
    return '⚪';
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          {t('vault.correlationAnalysis.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('vault.correlationAnalysis.subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => format(parseISO(val), 'MM/dd')}
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                labelFormatter={(val) => format(parseISO(val as string), 'MMM dd')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="mood" 
                stroke="hsl(142, 76%, 36%)" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                name={t('vault.correlationAnalysis.moodLine')}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="stress" 
                stroke="hsl(25, 95%, 53%)" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                name={t('vault.correlationAnalysis.stressLine')}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="discipline" 
                stroke="hsl(221, 83%, 53%)" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                name={t('vault.correlationAnalysis.disciplineLine')}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Lightbulb className="h-4 w-4" />
              {t('vault.correlationAnalysis.insights')}
            </div>
            <ul className="space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span>•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Correlations */}
        {correlations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t('vault.correlationAnalysis.correlationStrength')}</h4>
            <div className="grid gap-2">
              {correlations.map((corr) => (
                <div key={corr.pair} className="flex items-center justify-between text-sm p-2 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {corr.pair === 'moodDiscipline' && (
                      <>
                        <Lightbulb className="h-4 w-4 text-green-500" />
                        <span>{t('vault.correlationAnalysis.moodDiscipline')}</span>
                      </>
                    )}
                    {corr.pair === 'stressDiscipline' && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span>{t('vault.correlationAnalysis.stressDiscipline')}</span>
                      </>
                    )}
                    {corr.pair === 'moodStress' && (
                      <>
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span>{t('vault.correlationAnalysis.moodStress')}</span>
                      </>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${getStrengthColor(corr.strength, corr.direction)}`}>
                    <span>{getStrengthEmoji(corr.strength, corr.direction)}</span>
                    <span>{t(`vault.correlationAnalysis.${corr.strength}`)}</span>
                    <span className="text-xs">({corr.coefficient > 0 ? '+' : ''}{corr.coefficient.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
