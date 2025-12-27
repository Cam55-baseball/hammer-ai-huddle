import { useTranslation } from 'react-i18next';
import { useHydration } from '@/hooks/useHydration';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

const QUICK_ADD_OPTIONS = [8, 16, 24, 32];

export function HydrationTrackerWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    todayLogs,
    todayTotal,
    dailyGoal,
    progress,
    goalReached,
    addWater,
    deleteLog,
    loading,
  } = useHydration();

  const handleAddWater = async (amount: number) => {
    await addWater(amount);
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteLog(logId);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative" disabled={loading}>
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="font-bold">{todayTotal}</span>
          <span className="text-muted-foreground">/ {dailyGoal} oz</span>
          {goalReached && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
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
                onClick={() => handleAddWater(amount)}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                {amount} oz
              </Button>
            ))}
          </div>

          {/* Today's entries */}
          {todayLogs.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Today's entries</p>
              {todayLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50">
                  <span>{format(new Date(log.logged_at), 'h:mm a')}</span>
                  <span className="font-medium">{log.amount_oz} oz</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteLog(log.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {goalReached 
              ? t('hydration.goalComplete', '✓ Goal reached! Great job!')
              : t('hydration.remaining', `${dailyGoal - todayTotal} oz remaining`)}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
