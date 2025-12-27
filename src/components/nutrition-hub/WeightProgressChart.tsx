import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target, Minus } from 'lucide-react';
import { WeightEntry } from '@/hooks/useWeightTracking';
import { format, parseISO } from 'date-fns';

interface WeightProgressChartProps {
  entries: WeightEntry[];
  targetWeight: number | null;
  projectedData: { date: string; projected: number }[];
  stats: {
    currentWeight: number | null;
    startingWeight: number | null;
    totalChange: number;
    weeklyAvgChange: number;
    onTrack: boolean;
  };
}

export function WeightProgressChart({ 
  entries, 
  targetWeight, 
  projectedData,
  stats 
}: WeightProgressChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    // Sort entries by date (ascending for chart)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    // Create a map of actual data by date
    const actualMap = new Map(sortedEntries.map(e => [e.entry_date, e.weight_lbs]));
    
    // Create a map of projected data by date
    const projectedMap = new Map(projectedData.map(p => [p.date, p.projected]));
    
    // Get all unique dates
    const allDates = new Set([
      ...sortedEntries.map(e => e.entry_date),
      ...projectedData.map(p => p.date)
    ]);

    // Create combined data
    const combined = Array.from(allDates)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        dateLabel: format(parseISO(date), 'MMM d'),
        actual: actualMap.get(date) || null,
        projected: projectedMap.get(date) || null,
        target: targetWeight,
      }));

    return combined;
  }, [entries, projectedData, targetWeight]);

  const chartConfig = {
    actual: {
      label: t('nutrition.weight.actual', 'Actual'),
      color: 'hsl(var(--primary))',
    },
    projected: {
      label: t('nutrition.weight.projected', 'Projected'),
      color: 'hsl(var(--muted-foreground))',
    },
    target: {
      label: t('nutrition.weight.target', 'Target'),
      color: 'hsl(var(--destructive))',
    },
  };

  // Calculate chart Y-axis domain
  const weights = entries.map(e => e.weight_lbs);
  if (targetWeight) weights.push(targetWeight);
  if (projectedData.length) weights.push(...projectedData.map(p => p.projected));
  
  const minWeight = weights.length > 0 ? Math.floor(Math.min(...weights) - 5) : 150;
  const maxWeight = weights.length > 0 ? Math.ceil(Math.max(...weights) + 5) : 200;

  const getTrendIcon = () => {
    if (stats.weeklyAvgChange > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (stats.weeklyAvgChange < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (entries.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {t('nutrition.weight.progressChart', 'Weight Progress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-center">
            {t('nutrition.weight.noDataYet', 'Log your first weight entry to see progress')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            {t('nutrition.weight.progressChart', 'Weight Progress')}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {getTrendIcon()}
            <span className={stats.weeklyAvgChange >= 0 ? 'text-green-500' : 'text-red-500'}>
              {stats.weeklyAvgChange >= 0 ? '+' : ''}
              {stats.weeklyAvgChange.toFixed(1)} {t('nutrition.weight.lbsPerWeek', 'lbs/week')}
            </span>
          </div>
        </div>
        <CardDescription className="flex items-center gap-4 text-xs">
          <span>
            {t('nutrition.weight.totalChange', 'Total')}: 
            <span className={stats.totalChange >= 0 ? 'text-green-500 ml-1' : 'text-red-500 ml-1'}>
              {stats.totalChange >= 0 ? '+' : ''}{stats.totalChange.toFixed(1)} lbs
            </span>
          </span>
          {targetWeight && (
            <span>
              {t('nutrition.weight.targetLabel', 'Target')}: {targetWeight} lbs
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 11 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minWeight, maxWeight]}
              tick={{ fontSize: 11 }} 
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            
            {/* Target weight line */}
            {targetWeight && (
              <ReferenceLine 
                y={targetWeight} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="5 5" 
                strokeWidth={2}
              />
            )}
            
            {/* Projected weight line */}
            <Line
              type="monotone"
              dataKey="projected"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
            
            {/* Actual weight line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary rounded" />
            <span>{t('nutrition.weight.actual', 'Actual')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-muted-foreground rounded" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, transparent 50%)' }} />
            <span>{t('nutrition.weight.projected', 'Projected')}</span>
          </div>
          {targetWeight && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-destructive rounded" />
              <span>{t('nutrition.weight.target', 'Target')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
