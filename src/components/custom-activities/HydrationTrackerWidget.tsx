import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Droplets, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';

const QUICK_ADD_OPTIONS = [8, 16, 24, 32];

export function HydrationTrackerWidget() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [todayTotal, setTodayTotal] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(100);
  const [isOpen, setIsOpen] = useState(false);

  const fetchTodayData = async () => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch settings for goal
    const { data: settings } = await supabase
      .from('hydration_settings')
      .select('daily_goal_oz')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings?.daily_goal_oz) {
      setDailyGoal(settings.daily_goal_oz);
    }

    // Fetch today's logs
    const { data: logs } = await supabase
      .from('hydration_logs')
      .select('amount_oz')
      .eq('user_id', user.id)
      .eq('log_date', today);

    const total = logs?.reduce((sum, log) => sum + Number(log.amount_oz), 0) || 0;
    setTodayTotal(total);
  };

  useEffect(() => {
    fetchTodayData();
  }, [user]);

  const addWater = async (amount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: user.id,
          amount_oz: amount,
          log_date: format(new Date(), 'yyyy-MM-dd'),
        });

      if (error) throw error;
      
      setTodayTotal(prev => prev + amount);
      toast.success(`+${amount} oz logged!`);

      // Check if goal reached
      if (todayTotal + amount >= dailyGoal && todayTotal < dailyGoal) {
        toast.success(t('hydration.goalReached', '🎉 Daily hydration goal reached!'), {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error logging water:', error);
      toast.error(t('hydration.logError', 'Failed to log water'));
    }
  };

  const progress = Math.min((todayTotal / dailyGoal) * 100, 100);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="font-bold">{todayTotal}</span>
          <span className="text-muted-foreground">/ {dailyGoal} oz</span>
          {progress >= 100 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{todayTotal} oz</p>
            <p className="text-sm text-muted-foreground">of {dailyGoal} oz goal</p>
            <Progress value={progress} className="mt-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ADD_OPTIONS.map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => addWater(amount)}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                {amount} oz
              </Button>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {progress >= 100 
              ? t('hydration.goalComplete', '✓ Goal reached! Great job!')
              : t('hydration.remaining', `${dailyGoal - todayTotal} oz remaining`)}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
