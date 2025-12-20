import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Smile, Frown, Meh } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays } from 'date-fns';

interface MoodEntry {
  date: string;
  mood: number;
  emotion: string;
}

export default function MoodTrends() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7');
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageMood, setAverageMood] = useState(0);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');

  useEffect(() => {
    if (user) {
      fetchMoodData();
    }
  }, [user, timeRange]);

  const fetchMoodData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const startDate = subDays(new Date(), parseInt(timeRange));
      
      const { data, error } = await supabase
        .from('emotion_tracking')
        .select('entry_date, emotion, intensity')
        .eq('user_id', user.id)
        .gte('entry_date', format(startDate, 'yyyy-MM-dd'))
        .order('entry_date', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(entry => ({
        date: format(new Date(entry.entry_date), 'MMM d'),
        mood: entry.intensity || 5,
        emotion: entry.emotion
      }));

      setMoodData(formattedData);

      // Calculate average and trend
      if (formattedData.length > 0) {
        const avg = formattedData.reduce((sum, d) => sum + d.mood, 0) / formattedData.length;
        setAverageMood(Math.round(avg * 10) / 10);

        // Calculate trend (compare first half to second half)
        const midpoint = Math.floor(formattedData.length / 2);
        const firstHalf = formattedData.slice(0, midpoint);
        const secondHalf = formattedData.slice(midpoint);
        
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.mood, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.mood, 0) / secondHalf.length : 0;

        if (secondAvg > firstAvg + 0.5) setTrend('up');
        else if (secondAvg < firstAvg - 0.5) setTrend('down');
        else setTrend('stable');
      }
    } catch (error) {
      console.error('Error fetching mood data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMoodIcon = () => {
    if (averageMood >= 7) return <Smile className="h-6 w-6 text-green-500" />;
    if (averageMood >= 4) return <Meh className="h-6 w-6 text-amber-500" />;
    return <Frown className="h-6 w-6 text-red-500" />;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {t('insights.moodOverTime', 'Mood Over Time')}
        </h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('insights.last7Days', '7 Days')}</SelectItem>
            <SelectItem value="30">{t('insights.last30Days', '30 Days')}</SelectItem>
            <SelectItem value="90">{t('insights.last90Days', '90 Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {getMoodIcon()}
            <div>
              <p className="text-2xl font-bold text-foreground">{averageMood || '-'}</p>
              <p className="text-xs text-muted-foreground">
                {t('insights.averageMood', 'Average Mood')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {getTrendIcon()}
            <div>
              <p className="text-lg font-semibold capitalize text-foreground">
                {t(`insights.trend${trend.charAt(0).toUpperCase() + trend.slice(1)}`, trend)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('insights.recentTrend', 'Recent Trend')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : moodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={moodData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
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
                />
                <Area 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#moodGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <Meh className="h-12 w-12 mb-2 opacity-50" />
              <p>{t('insights.noMoodData', 'No mood data yet')}</p>
              <p className="text-xs">{t('insights.startTracking', 'Start tracking your emotions to see trends')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
