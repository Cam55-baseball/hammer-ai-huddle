import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Flame, Clock, Footprints } from 'lucide-react';
import { RunningProgressSummary } from './RunningProgressSummary';

interface ActivityAnalyticsProps {
  selectedSport: 'baseball' | 'softball';
}

interface AnalyticsData {
  totalActivities: number;
  completedActivities: number;
  completionRate: number;
  totalDuration: number;
  byType: Record<string, { total: number; completed: number }>;
  weeklyData: { day: string; completed: number; scheduled: number }[];
  streakCurrent: number;
  streakLongest: number;
}

const COLORS = ['#8b5cf6', '#10b981', '#f97316', '#0ea5e9', '#ec4899', '#f59e0b'];

export function ActivityAnalytics({ selectedSport }: ActivityAnalyticsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');

        const { data: logs, error } = await supabase
          .from('custom_activity_logs')
          .select(`
            *,
            custom_activity_templates (
              activity_type,
              duration_minutes,
              sport
            )
          `)
          .eq('user_id', user.id)
          .gte('entry_date', thirtyDaysAgo)
          .lte('entry_date', today);

        if (error) throw error;

        const filteredLogs = (logs || []).filter(
          (log: any) => log.custom_activity_templates?.sport === selectedSport
        );

        const byType: Record<string, { total: number; completed: number }> = {};
        let totalDuration = 0;
        let completedCount = 0;

        filteredLogs.forEach((log: any) => {
          const type = log.custom_activity_templates?.activity_type || 'other';
          if (!byType[type]) {
            byType[type] = { total: 0, completed: 0 };
          }
          byType[type].total++;
          if (log.completed) {
            byType[type].completed++;
            completedCount++;
            totalDuration += log.actual_duration_minutes || log.custom_activity_templates?.duration_minutes || 0;
          }
        });

        // Weekly data
        const weekStart = startOfWeek(new Date());
        const weekEnd = endOfWeek(new Date());
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        
        const weeklyData = weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayLogs = filteredLogs.filter((l: any) => l.entry_date === dateStr);
          return {
            day: format(day, 'EEE'),
            completed: dayLogs.filter((l: any) => l.completed).length,
            scheduled: dayLogs.length,
          };
        });

        // Calculate streak
        let streakCurrent = 0;
        let streakLongest = 0;
        const logsByDate = filteredLogs.reduce((acc: Record<string, boolean>, log: any) => {
          if (log.completed) {
            acc[log.entry_date] = true;
          }
          return acc;
        }, {});

        // Simple streak calculation
        let currentStreak = 0;
        for (let i = 0; i <= 30; i++) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          if (logsByDate[date]) {
            currentStreak++;
            if (i === 0 || i === 1) streakCurrent = currentStreak;
          } else {
            streakLongest = Math.max(streakLongest, currentStreak);
            currentStreak = 0;
          }
        }
        streakLongest = Math.max(streakLongest, currentStreak);

        setAnalytics({
          totalActivities: filteredLogs.length,
          completedActivities: completedCount,
          completionRate: filteredLogs.length > 0 ? (completedCount / filteredLogs.length) * 100 : 0,
          totalDuration,
          byType,
          weeklyData,
          streakCurrent,
          streakLongest,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, selectedSport]);

  const pieData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.byType).map(([type, data], index) => ({
      name: type,
      value: data.total,
      color: COLORS[index % COLORS.length],
    }));
  }, [analytics]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('myCustomActivities.analytics.completionRate', 'Completion Rate')}</p>
                <p className="text-2xl font-bold">{analytics.completionRate.toFixed(0)}%</p>
              </div>
            </div>
            <Progress value={analytics.completionRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('myCustomActivities.analytics.completed', 'Completed')}</p>
                <p className="text-2xl font-bold">{analytics.completedActivities}</p>
                <p className="text-xs text-muted-foreground">of {analytics.totalActivities} total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('myCustomActivities.analytics.streak', 'Current Streak')}</p>
                <p className="text-2xl font-bold">{analytics.streakCurrent} days</p>
                <p className="text-xs text-muted-foreground">Best: {analytics.streakLongest} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('myCustomActivities.analytics.totalTime', 'Total Time')}</p>
                <p className="text-2xl font-bold">{Math.floor(analytics.totalDuration / 60)}h {analytics.totalDuration % 60}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Running Progress */}
      <RunningProgressSummary selectedSport={selectedSport} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('myCustomActivities.analytics.weeklyOverview', 'This Week')}</CardTitle>
            <CardDescription>{t('myCustomActivities.analytics.weeklyDescription', 'Activities completed vs scheduled')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.weeklyData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="scheduled" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Scheduled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('myCustomActivities.analytics.byType', 'By Activity Type')}</CardTitle>
            <CardDescription>{t('myCustomActivities.analytics.typeBreakdown', 'Distribution of your activities')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm capitalize">{t(`customActivity.types.${entry.name}`, entry.name)}</span>
                    <Badge variant="secondary" className="ml-auto">{entry.value}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
