import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Footprints, Clock, TrendingUp, Target, Flame } from 'lucide-react';

interface RunningProgressSummaryProps {
  selectedSport: 'baseball' | 'softball';
}

interface RunningStats {
  totalDistance: number;
  totalDuration: number;
  totalSessions: number;
  avgPace: string;
  distanceUnit: string;
}

export function RunningProgressSummary({ selectedSport }: RunningProgressSummaryProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState<RunningStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<RunningStats | null>(null);
  const [allTimeStats, setAllTimeStats] = useState<RunningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRunningStats = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const today = new Date();
        const weekStart = format(startOfWeek(today), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(today), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

        // Fetch running templates
        const { data: templates, error: templatesError } = await supabase
          .from('custom_activity_templates')
          .select('id, distance_value, distance_unit, duration_minutes, embedded_running_sessions')
          .eq('user_id', user.id)
          .eq('sport', selectedSport)
          .eq('activity_type', 'running');

        if (templatesError) throw templatesError;

        // Fetch completed running logs
        const { data: logs, error: logsError } = await supabase
          .from('custom_activity_logs')
          .select('*, custom_activity_templates!inner(activity_type, distance_value, distance_unit, duration_minutes, embedded_running_sessions, sport)')
          .eq('user_id', user.id)
          .eq('completed', true)
          .eq('custom_activity_templates.activity_type', 'running')
          .eq('custom_activity_templates.sport', selectedSport);

        if (logsError) throw logsError;

        const calculateStats = (filteredLogs: any[]): RunningStats => {
          let totalDistance = 0;
          let totalDuration = 0;
          let sessions = 0;

          filteredLogs.forEach((log: any) => {
            const template = log.custom_activity_templates;
            sessions++;
            
            // Add main distance
            if (template.distance_value) {
              totalDistance += template.distance_value;
            }
            
            // Add embedded running sessions
            if (template.embedded_running_sessions) {
              const embeddedSessions = Array.isArray(template.embedded_running_sessions) 
                ? template.embedded_running_sessions 
                : [];
              embeddedSessions.forEach((session: any) => {
                if (session.distance_value) {
                  // Convert to miles for consistency
                  let distanceInMiles = session.distance_value;
                  if (session.distance_unit === 'meters') distanceInMiles = session.distance_value / 1609.34;
                  else if (session.distance_unit === 'kilometers') distanceInMiles = session.distance_value / 1.609;
                  else if (session.distance_unit === 'feet') distanceInMiles = session.distance_value / 5280;
                  else if (session.distance_unit === 'yards') distanceInMiles = session.distance_value / 1760;
                  totalDistance += distanceInMiles;
                }
              });
            }

            totalDuration += log.actual_duration_minutes || template.duration_minutes || 0;
          });

          // Calculate average pace (min/mile)
          const avgPace = totalDistance > 0 
            ? `${Math.floor(totalDuration / totalDistance)}:${String(Math.round((totalDuration / totalDistance % 1) * 60)).padStart(2, '0')}`
            : '--:--';

          return {
            totalDistance: Math.round(totalDistance * 10) / 10,
            totalDuration,
            totalSessions: sessions,
            avgPace,
            distanceUnit: 'miles',
          };
        };

        // Filter logs by date range
        const weeklyLogs = logs?.filter((l: any) => 
          l.entry_date >= weekStart && l.entry_date <= weekEnd
        ) || [];
        
        const monthlyLogs = logs?.filter((l: any) => 
          l.entry_date >= monthStart && l.entry_date <= monthEnd
        ) || [];

        setWeeklyStats(calculateStats(weeklyLogs));
        setMonthlyStats(calculateStats(monthlyLogs));
        setAllTimeStats(calculateStats(logs || []));

      } catch (error) {
        console.error('Error fetching running stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRunningStats();
  }, [user, selectedSport]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-40" />
      </Card>
    );
  }

  const renderStats = (stats: RunningStats | null, title: string) => {
    if (!stats || stats.totalSessions === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          {t('runningProgress.noData')}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg bg-primary/10">
          <Footprints className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{stats.totalDistance}</p>
          <p className="text-xs text-muted-foreground">{stats.distanceUnit}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-green-500/10">
          <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.totalTime')}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-orange-500/10">
          <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.sessions')}</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-blue-500/10">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{stats.avgPace}</p>
          <p className="text-xs text-muted-foreground">{t('runningProgress.avgPace')}</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Footprints className="h-5 w-5" />
          {t('runningProgress.title')}
        </CardTitle>
        <CardDescription>
          {t('runningProgress.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">{t('runningProgress.thisWeek')}</TabsTrigger>
            <TabsTrigger value="monthly">{t('runningProgress.thisMonth')}</TabsTrigger>
            <TabsTrigger value="allTime">{t('runningProgress.allTime')}</TabsTrigger>
          </TabsList>
          <TabsContent value="weekly" className="mt-4">
            {renderStats(weeklyStats, 'This Week')}
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            {renderStats(monthlyStats, 'This Month')}
          </TabsContent>
          <TabsContent value="allTime" className="mt-4">
            {renderStats(allTimeStats, 'All Time')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
