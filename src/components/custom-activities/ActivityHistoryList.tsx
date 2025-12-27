import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, addDays, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Check, X, Clock, Flame, Trophy, CalendarDays } from 'lucide-react';
import { CustomActivityLog, CustomActivityTemplate } from '@/types/customActivity';
import { cn } from '@/lib/utils';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';

interface ActivityHistoryListProps {
  selectedSport: 'baseball' | 'softball';
}

interface LogWithTemplate extends CustomActivityLog {
  template_title?: string;
  template_color?: string;
  template_icon?: string;
}

interface ScheduledTemplate {
  id: string;
  title: string;
  color: string;
  icon: string;
  recurring_days: number[] | null;
  display_days: number[] | null;
}

export function ActivityHistoryList({ selectedSport }: ActivityHistoryListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogWithTemplate[]>([]);
  const [templates, setTemplates] = useState<ScheduledTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: addDays(new Date(), 30) // Extend to show future scheduled dates
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // Fetch both logs and templates in parallel
        const [logsResult, templatesResult] = await Promise.all([
          supabase
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
            .order('entry_date', { ascending: false }),
          supabase
            .from('custom_activity_templates')
            .select('id, title, color, icon, recurring_days, recurring_active, display_days, display_on_game_plan')
            .eq('user_id', user.id)
            .eq('sport', selectedSport)
        ]);

        if (logsResult.error) throw logsResult.error;
        if (templatesResult.error) throw templatesResult.error;

        const filteredLogs = (logsResult.data || [])
          .filter((log: any) => log.custom_activity_templates?.sport === selectedSport)
          .map((log: any) => ({
            ...log,
            template_title: log.custom_activity_templates?.title,
            template_color: log.custom_activity_templates?.color,
            template_icon: log.custom_activity_templates?.icon,
          }));

        // Filter templates with active schedules
        const scheduledTemplates = (templatesResult.data || [])
          .filter((t: any) => 
            (t.recurring_active && t.recurring_days?.length > 0) || 
            (t.display_on_game_plan && t.display_days?.length > 0)
          )
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            color: t.color || '#8b5cf6',
            icon: t.icon || 'Dumbbell',
            recurring_days: t.recurring_days,
            display_days: t.display_days,
          }));

        setLogs(filteredLogs);
        setTemplates(scheduledTemplates);
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedSport, dateRange]);

  // Calculate scheduled dates based on templates
  const scheduledDates = useMemo(() => {
    const scheduled: Record<string, ScheduledTemplate[]> = {};
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    
    templates.forEach(template => {
      const days = template.display_days || template.recurring_days || [];
      if (days.length === 0) return;
      
      // Loop through the visible month range
      let currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const dayOfWeek = getDay(currentDate);
        if (days.includes(dayOfWeek)) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          if (!scheduled[dateStr]) scheduled[dateStr] = [];
          // Avoid duplicates
          if (!scheduled[dateStr].find(t => t.id === template.id)) {
            scheduled[dateStr].push(template);
          }
        }
        currentDate = addDays(currentDate, 1);
      }
    });
    
    return scheduled;
  }, [templates, calendarMonth]);

  const daysWithActivities = logs.reduce((acc, log) => {
    const date = log.entry_date;
    if (!acc[date]) {
      acc[date] = { total: 0, completed: 0 };
    }
    acc[date].total++;
    if (log.completed) acc[date].completed++;
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  // Get activities for selected date (combining logs and pending scheduled)
  const getActivitiesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLogs = logs.filter(log => log.entry_date === dateStr);
    const scheduled = scheduledDates[dateStr] || [];
    
    // Find scheduled templates that don't have a log yet
    const pendingScheduled = scheduled.filter(
      template => !dayLogs.find(log => log.template_id === template.id)
    );
    
    return { logs: dayLogs, pendingScheduled };
  };

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

  // Get pending scheduled for selected date
  const selectedDatePending = selectedDate 
    ? getActivitiesForDate(selectedDate).pendingScheduled 
    : [];

  // Calculate stats
  const totalCompleted = logs.filter(l => l.completed).length;
  const completionRate = logs.length > 0 ? Math.round((totalCompleted / logs.length) * 100) : 0;
  const totalScheduled = Object.values(scheduledDates).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 overflow-hidden border-2">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            {t('myCustomActivities.history.calendar', 'Activity Calendar')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            onMonthChange={setCalendarMonth}
            className="rounded-xl border-2"
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
              hasScheduled: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return !!scheduledDates[dateStr] && !daysWithActivities[dateStr];
              },
            }}
            modifiersStyles={{
              hasActivity: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.15)',
              },
              allComplete: {
                backgroundColor: 'hsl(142 76% 36% / 0.25)',
                color: 'hsl(142 76% 36%)',
                fontWeight: 'bold',
              },
              hasScheduled: {
                fontWeight: 'bold',
                border: '2px dashed hsl(var(--primary) / 0.5)',
                backgroundColor: 'hsl(var(--primary) / 0.05)',
              },
            }}
          />
          
          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/15" />
              <span>Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/25" />
              <span>Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-dashed border-primary/50 bg-primary/5" />
              <span>Scheduled</span>
            </div>
          </div>
          
          {selectedDate && (
            <Button 
              variant="ghost" 
              className="w-full mt-3 font-medium"
              onClick={() => setSelectedDate(undefined)}
            >
              {t('myCustomActivities.history.clearFilter', 'Clear date filter')}
            </Button>
          )}
          
          {/* Stats summary */}
          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {t('myCustomActivities.history.completed', 'Completed')}
              </span>
              <span className="font-bold text-green-600">{totalCompleted}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                {t('myCustomActivities.history.rate', 'Completion Rate')}
              </span>
              <span className="font-bold">{completionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Scheduled This Month
              </span>
              <span className="font-bold text-primary">{totalScheduled}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 overflow-hidden border-2">
        <CardHeader className="bg-gradient-to-br from-muted/50 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {selectedDate 
                ? format(selectedDate, 'MMMM d, yyyy')
                : t('myCustomActivities.history.recentActivity', 'Recent Activity')}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedDatePending.length > 0 && (
                <Badge variant="outline" className="font-semibold border-primary/50 text-primary">
                  {selectedDatePending.length} scheduled
                </Badge>
              )}
              <Badge variant="secondary" className="font-semibold">
                {filteredLogs.length} {t('myCustomActivities.history.entries', 'entries')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredLogs.length === 0 && selectedDatePending.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/80 flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                {t('myCustomActivities.history.noActivity', 'No activity recorded for this period')}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('myCustomActivities.history.noActivityHint', 'Complete activities to see them here')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-6">
                {/* Show pending scheduled activities for selected date */}
                {selectedDatePending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-primary">
                        Scheduled for {format(selectedDate!, 'EEEE')}
                      </h3>
                      <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedDatePending.map(template => {
                        const Icon = template.icon ? getActivityIcon(template.icon) : null;
                        const color = template.color;
                        
                        return (
                          <div 
                            key={template.id}
                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-transparent transition-all duration-200 hover:shadow-md hover:border-primary/50"
                          >
                            <div 
                              className="p-2.5 rounded-xl flex-shrink-0"
                              style={{ 
                                backgroundColor: hexToRgba(color, 0.2),
                              }}
                            >
                              {Icon ? (
                                <Icon className="h-5 w-5" style={{ color }} />
                              ) : (
                                <div 
                                  className="h-5 w-5 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold line-clamp-1 text-foreground">
                                {template.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Scheduled • Not yet started
                              </p>
                            </div>
                            
                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                              <CalendarDays className="h-4 w-4" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Show logged activities */}
                {Object.entries(groupedByDate).map(([date, dayLogs]) => {
                  const completedCount = dayLogs.filter(l => l.completed).length;
                  const allComplete = completedCount === dayLogs.length;
                  
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">
                          {format(new Date(date), 'EEEE, MMMM d')}
                        </h3>
                        {allComplete && (
                          <Badge className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
                            <Check className="h-3 w-3 mr-1" />
                            All done!
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {dayLogs.map(log => {
                          const Icon = log.template_icon ? getActivityIcon(log.template_icon) : null;
                          const color = log.template_color || '#8b5cf6';
                          
                          return (
                            <div 
                              key={log.id}
                              className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md",
                                log.completed 
                                  ? "bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30" 
                                  : "bg-muted/30 border-border/50"
                              )}
                            >
                              {/* Activity icon */}
                              <div 
                                className="p-2.5 rounded-xl flex-shrink-0 shadow-sm"
                                style={{ 
                                  backgroundColor: hexToRgba(color, 0.2),
                                  boxShadow: log.completed ? `0 2px 8px ${hexToRgba(color, 0.3)}` : undefined
                                }}
                              >
                                {Icon ? (
                                  <Icon className="h-5 w-5" style={{ color }} />
                                ) : (
                                  <div 
                                    className="h-5 w-5 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "font-semibold line-clamp-1",
                                  log.completed && "text-foreground",
                                  !log.completed && "text-muted-foreground"
                                )}>
                                  {log.template_title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {log.actual_duration_minutes && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {log.actual_duration_minutes} min
                                    </div>
                                  )}
                                  {log.notes && (
                                    <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                                      {log.notes}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Status indicator */}
                              <div className={cn(
                                "p-2 rounded-full transition-all",
                                log.completed 
                                  ? "bg-green-500 text-white shadow-md" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {log.completed ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
