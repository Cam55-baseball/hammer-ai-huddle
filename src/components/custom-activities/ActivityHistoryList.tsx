import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Check, X, Clock } from 'lucide-react';
import { CustomActivityLog } from '@/types/customActivity';
import { cn } from '@/lib/utils';

interface ActivityHistoryListProps {
  selectedSport: 'baseball' | 'softball';
}

interface LogWithTemplate extends CustomActivityLog {
  template_title?: string;
  template_color?: string;
  template_icon?: string;
}

export function ActivityHistoryList({ selectedSport }: ActivityHistoryListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('custom_activity_logs')
          .select(`
            *,
            custom_activity_templates (
              title,
              color,
              icon,
              sport
            )
          `)
          .eq('user_id', user.id)
          .gte('entry_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('entry_date', format(dateRange.to, 'yyyy-MM-dd'))
          .order('entry_date', { ascending: false });

        if (error) throw error;

        const filteredLogs = (data || [])
          .filter((log: any) => log.custom_activity_templates?.sport === selectedSport)
          .map((log: any) => ({
            ...log,
            template_title: log.custom_activity_templates?.title,
            template_color: log.custom_activity_templates?.color,
            template_icon: log.custom_activity_templates?.icon,
          }));

        setLogs(filteredLogs);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user, selectedSport, dateRange]);

  const daysWithActivities = logs.reduce((acc, log) => {
    const date = log.entry_date;
    if (!acc[date]) {
      acc[date] = { total: 0, completed: 0 };
    }
    acc[date].total++;
    if (log.completed) acc[date].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  const filteredLogs = selectedDate
    ? logs.filter(log => log.entry_date === format(selectedDate, 'yyyy-MM-dd'))
    : logs;

  const groupedByDate = filteredLogs.reduce((acc, log) => {
    if (!acc[log.entry_date]) {
      acc[log.entry_date] = [];
    }
    acc[log.entry_date].push(log);
    return acc;
  }, {} as Record<string, LogWithTemplate[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">{t('myCustomActivities.history.calendar', 'Activity Calendar')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasActivity: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return !!daysWithActivities[dateStr];
              },
              allComplete: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const day = daysWithActivities[dateStr];
                return day?.total > 0 && day.completed === day.total;
              },
            }}
            modifiersStyles={{
              hasActivity: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
              },
              allComplete: {
                backgroundColor: 'hsl(142 76% 36% / 0.2)',
              },
            }}
          />
          {selectedDate && (
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => setSelectedDate(undefined)}
            >
              {t('myCustomActivities.history.clearFilter', 'Clear date filter')}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedDate 
                ? format(selectedDate, 'MMMM d, yyyy')
                : t('myCustomActivities.history.recentActivity', 'Recent Activity')}
            </CardTitle>
            <Badge variant="secondary">
              {filteredLogs.length} {t('myCustomActivities.history.entries', 'entries')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('myCustomActivities.history.noActivity', 'No activity recorded for this period')}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {Object.entries(groupedByDate).map(([date, dayLogs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {format(new Date(date), 'EEEE, MMMM d')}
                    </h3>
                    <div className="space-y-2">
                      {dayLogs.map(log => (
                        <div 
                          key={log.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border",
                            log.completed ? "bg-green-500/10 border-green-500/30" : "bg-muted/50"
                          )}
                        >
                          <div 
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: log.template_color || '#8b5cf6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{log.template_title}</p>
                            {log.actual_duration_minutes && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {log.actual_duration_minutes} min
                              </div>
                            )}
                          </div>
                          {log.completed ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
