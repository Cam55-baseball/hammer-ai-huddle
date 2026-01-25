import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteGoals } from '@/hooks/useAthleteGoals';
import { TrendingUp, TrendingDown, Minus, Target, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, format, parseISO } from 'date-fns';

interface WeightTrendMiniProps {
  className?: string;
}

interface WeightEntry {
  entry_date: string;
  weight_lbs: number;
}

export function WeightTrendMini({ className }: WeightTrendMiniProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeGoal } = useAthleteGoals();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);

  useEffect(() => {
    const fetchRecentWeights = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('weight_entries')
          .select('entry_date, weight_lbs')
          .eq('user_id', user.id)
          .gte('entry_date', sevenDaysAgo)
          .order('entry_date', { ascending: false });

        if (error) throw error;

        const typedData = (data || []) as WeightEntry[];
        setEntries(typedData);

        if (typedData.length > 0) {
          setCurrentWeight(typedData[0].weight_lbs);
          
          // Calculate weekly change if we have at least 2 entries
          if (typedData.length >= 2) {
            const oldestInWeek = typedData[typedData.length - 1];
            const change = typedData[0].weight_lbs - oldestInWeek.weight_lbs;
            setWeeklyChange(change);
          }
        }
      } catch (error) {
        console.error('Error fetching weight trend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWeights();
  }, [user]);

  // No data state
  if (!loading && entries.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-muted-foreground", className)}>
        <Scale className="h-4 w-4" />
        <span className="text-xs">
          {t('vault.quiz.weightTrend.noData', 'Start tracking to see trends')}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 p-2 rounded-lg bg-muted/30 animate-pulse", className)}>
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
    );
  }

  const getTrendIcon = () => {
    if (weeklyChange === null || Math.abs(weeklyChange) < 0.1) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    return weeklyChange > 0 
      ? <TrendingUp className="h-4 w-4 text-green-500" />
      : <TrendingDown className="h-4 w-4 text-amber-500" />;
  };

  const getTrendColor = () => {
    if (weeklyChange === null || Math.abs(weeklyChange) < 0.1) {
      return 'text-muted-foreground';
    }
    return weeklyChange > 0 ? 'text-green-500' : 'text-amber-500';
  };

  const targetWeight = activeGoal?.targetWeightLbs;
  const remaining = targetWeight && currentWeight ? Math.abs(targetWeight - currentWeight) : null;

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20",
      className
    )}>
      {/* Current Weight */}
      <div className="flex items-center gap-1.5">
        <Scale className="h-4 w-4 text-teal-500" />
        <span className="text-sm font-semibold">
          {currentWeight?.toFixed(1)} {t('common.lbs', 'lbs')}
        </span>
      </div>

      {/* 7-Day Trend */}
      {weeklyChange !== null && (
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className={cn("text-xs font-medium", getTrendColor())}>
            {weeklyChange >= 0 ? '+' : ''}{weeklyChange.toFixed(1)} {t('vault.quiz.weightTrend.thisWeek', 'this week')}
          </span>
        </div>
      )}

      {/* Target */}
      {targetWeight && remaining !== null && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          <span>
            {targetWeight} {t('common.lbs', 'lbs')} ({remaining.toFixed(1)} {t('vault.quiz.weightTrend.toGo', 'to go')})
          </span>
        </div>
      )}
    </div>
  );
}
