import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Activity, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays, getDay } from 'date-fns';

interface StressEntry {
  day: string;
  stress: number;
  count: number;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StressPatterns() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<StressEntry[]>([]);
  const [averageStress, setAverageStress] = useState(0);
  const [peakDay, setPeakDay] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStressData();
    }
  }, [user]);

  const fetchStressData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const startDate = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('stress_assessments')
        .select('assessment_date, score, severity')
        .eq('user_id', user.id)
        .gte('assessment_date', format(startDate, 'yyyy-MM-dd'));

      if (error) throw error;

      // Aggregate by day of week
      const dayAggregates: Record<number, { total: number; count: number }> = {};
      
      (data || []).forEach(entry => {
        const dayOfWeek = getDay(new Date(entry.assessment_date));
        if (!dayAggregates[dayOfWeek]) {
          dayAggregates[dayOfWeek] = { total: 0, count: 0 };
        }
        dayAggregates[dayOfWeek].total += entry.score;
        dayAggregates[dayOfWeek].count += 1;
      });

      const formattedData = dayNames.map((day, index) => ({
        day,
        stress: dayAggregates[index] 
          ? Math.round(dayAggregates[index].total / dayAggregates[index].count) 
          : 0,
        count: dayAggregates[index]?.count || 0
      }));

      setWeeklyData(formattedData);

      // Calculate overall stats
      if (data && data.length > 0) {
        const avg = data.reduce((sum, d) => sum + d.score, 0) / data.length;
        setAverageStress(Math.round(avg * 10) / 10);

        // Find peak stress day
        const maxStress = Math.max(...formattedData.map(d => d.stress));
        const peakDayEntry = formattedData.find(d => d.stress === maxStress && d.count > 0);
        setPeakDay(peakDayEntry?.day || '');
      }
    } catch (error) {
      console.error('Error fetching stress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStressColor = (stress: number) => {
    if (stress >= 7) return 'hsl(0, 84%, 60%)'; // Red
    if (stress >= 4) return 'hsl(45, 93%, 47%)'; // Amber
    return 'hsl(142, 71%, 45%)'; // Green
  };

  const getStressLevel = (score: number): string => {
    if (score >= 7) return t('insights.stressHigh', 'High');
    if (score >= 4) return t('insights.stressMedium', 'Medium');
    return t('insights.stressLow', 'Low');
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className={`h-6 w-6 ${averageStress >= 7 ? 'text-red-500' : averageStress >= 4 ? 'text-amber-500' : 'text-green-500'}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{averageStress || '-'}</p>
              <p className="text-xs text-muted-foreground">
                {t('insights.avgStress', 'Avg Stress Level')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-lg font-semibold text-foreground">{peakDay || '-'}</p>
              <p className="text-xs text-muted-foreground">
                {t('insights.peakStressDay', 'Peak Stress Day')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Pattern Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {t('insights.weeklyPattern', 'Weekly Stress Pattern')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : weeklyData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value, t('insights.stressLevel', 'Stress Level')]}
                />
                <Bar dataKey="stress" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStressColor(entry.stress)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-2 opacity-50" />
              <p>{t('insights.noStressData', 'No stress data yet')}</p>
              <p className="text-xs">{t('insights.takeAssessment', 'Take a stress assessment to see patterns')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stress Level Legend */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3 text-foreground">
            {t('insights.stressLevels', 'Stress Levels')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              0-3: {t('insights.stressLow', 'Low')}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              4-6: {t('insights.stressMedium', 'Medium')}
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
              7-10: {t('insights.stressHigh', 'High')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
