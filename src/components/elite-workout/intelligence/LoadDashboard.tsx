import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useLoadTracking } from '@/hooks/useLoadTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Zap, TrendingUp, TrendingDown, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface LoadDashboardProps {
  className?: string;
}

export function LoadDashboard({ className }: LoadDashboardProps) {
  const { t } = useTranslation();
  const { todayLoad, weeklyAverage, loading } = useLoadTracking();

  const chartData = useMemo(() => {
    // For now, create mock chart data based on weekly average
    // In production, this would fetch 7 days of historical data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const isToday = i === 6;
      
      return {
        date: format(date, 'EEE'),
        fullDate: format(date, 'yyyy-MM-dd'),
        cns: isToday ? (todayLoad?.cns_load_total || 0) : Math.round((weeklyAverage?.cnsLoad || 0) * (0.7 + Math.random() * 0.6)),
        volume: isToday ? (todayLoad?.volume_load || 0) : Math.round((weeklyAverage?.volumeLoad || 0) * (0.7 + Math.random() * 0.6)),
        compression: Math.round(Math.random() * 30),
        elastic: Math.round(Math.random() * 40),
        glide: Math.round(Math.random() * 20),
      };
    });
    
    return last7Days;
  }, [todayLoad, weeklyAverage]);

  const todayVsAverage = useMemo(() => {
    const todayCNS = todayLoad?.cns_load_total || 0;
    const avgCNS = weeklyAverage?.cnsLoad || 0;
    if (!avgCNS) return 0;
    return ((todayCNS - avgCNS) / avgCNS) * 100;
  }, [todayLoad, weeklyAverage]);

  const getLoadStatus = (load: number) => {
    if (load > 150) return { color: 'text-destructive', label: 'High', icon: AlertTriangle };
    if (load > 100) return { color: 'text-warning', label: 'Elevated', icon: TrendingUp };
    if (load > 50) return { color: 'text-primary', label: 'Good', icon: Activity };
    return { color: 'text-muted-foreground', label: 'Low', icon: TrendingDown };
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const todayCNS = todayLoad?.cns_load_total || 0;
  const loadStatus = getLoadStatus(todayCNS);
  const StatusIcon = loadStatus.icon;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20">
          <Activity className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {t('eliteWorkout.load.dashboard', 'Load Dashboard')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('eliteWorkout.load.weeklyOverview', '7-day training load overview')}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's CNS */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('eliteWorkout.load.todayCNS', "Today's CNS")}</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-3xl font-bold', loadStatus.color)}>
                    {todayCNS}
                  </span>
                  <Badge variant="secondary" className={loadStatus.color}>
                    {loadStatus.label}
                  </Badge>
                </div>
              </div>
              <StatusIcon className={cn('h-8 w-8', loadStatus.color)} />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Average */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('eliteWorkout.load.weeklyAvg', 'Weekly Avg')}</p>
                <span className="text-3xl font-bold">{Math.round(weeklyAverage?.cnsLoad || 0)}</span>
              </div>
              <Zap className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        {/* Today vs Average */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('eliteWorkout.load.vsAverage', 'vs Average')}</p>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-3xl font-bold',
                    todayVsAverage > 20 ? 'text-red-500' : 
                    todayVsAverage > 0 ? 'text-amber-500' : 'text-green-500'
                  )}>
                    {todayVsAverage > 0 ? '+' : ''}{Math.round(todayVsAverage)}%
                  </span>
                </div>
              </div>
              {todayVsAverage > 0 ? (
                <TrendingUp className={cn('h-8 w-8', todayVsAverage > 20 ? 'text-red-500' : 'text-amber-500')} />
              ) : (
                <TrendingDown className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CNS Load Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t('eliteWorkout.load.cnsHistory', 'CNS Load History')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cnsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cns"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#cnsGradient)"
                  name="CNS Load"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <RefreshCw className="h-6 w-6 mr-2" />
              {t('eliteWorkout.load.noData', 'No load data yet')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fascial Load Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t('eliteWorkout.load.fascialBreakdown', 'Fascial Load Breakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="compression" stackId="a" fill="#3b82f6" name="Compression" />
                <Bar dataKey="elastic" stackId="a" fill="#f59e0b" name="Elastic" />
                <Bar dataKey="glide" stackId="a" fill="#22c55e" name="Glide" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-muted-foreground">
              {t('eliteWorkout.load.noFascialData', 'Complete workouts to see fascial load data')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
