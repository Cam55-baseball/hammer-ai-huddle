import { useRestDay } from '@/hooks/useRestDay';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Moon, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = [
  { v: 0, k: 'Sun' }, { v: 1, k: 'Mon' }, { v: 2, k: 'Tue' }, { v: 3, k: 'Wed' },
  { v: 4, k: 'Thu' }, { v: 5, k: 'Fri' }, { v: 6, k: 'Sat' },
];

/**
 * Full Rest Day configuration card pinned to the top of the Game Plan.
 * Controls recurring rest days, today-as-rest override, and weekly cap.
 */
export function RestDayControl() {
  const {
    isRestToday, overrideToday, recurringDays, maxPerWeek,
    usedThisWeek, overBudget, setTodayAsRest, updateRecurringDays,
  } = useRestDay();

  const toggleDay = async (d: number) => {
    const next = recurringDays.includes(d)
      ? recurringDays.filter((x) => x !== d)
      : [...recurringDays, d].sort();
    await updateRecurringDays(next);
    toast.success('Rest schedule updated');
  };

  const handleToday = async () => {
    await setTodayAsRest();
    toast.success(overrideToday ? 'Rest cleared' : 'Today marked as rest — streak protected');
  };

  return (
    <Card
      className={cn(
        'border-2 transition-colors',
        isRestToday
          ? 'border-sky-500/50 bg-gradient-to-br from-sky-500/10 to-blue-500/5'
          : 'border-border bg-card/50'
      )}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'rounded-lg p-2',
              isRestToday ? 'bg-sky-500/20 text-sky-400' : 'bg-muted text-muted-foreground'
            )}>
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-wide">
                {isRestToday ? 'Rest Day Active' : 'Rest Day'}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRestToday
                  ? 'Streaks protected. NN waived. Recover.'
                  : 'Plan recovery without breaking your standard.'}
              </div>
            </div>
          </div>
          <Switch checked={!!overrideToday} onCheckedChange={handleToday} aria-label="Toggle today rest" />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Recurring rest days
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(({ v, k }) => (
              <button
                key={v}
                type="button"
                onClick={() => toggleDay(v)}
                className={cn(
                  'h-9 min-w-[44px] rounded-full px-3 text-xs font-bold border-2 transition-all',
                  recurringDays.includes(v)
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-background text-muted-foreground border-border hover:border-sky-500/50'
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            {overBudget ? (
              <>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span className="font-bold text-rose-400">
                  {usedThisWeek}/{maxPerWeek} — over budget. Extra rest counts as missed.
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-bold">
                  {usedThisWeek}/{maxPerWeek} rest used — elite compliant
                </span>
              </>
            )}
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={maxPerWeek === n ? 'default' : 'outline'}
                onClick={() => updateRecurringDays(recurringDays, n)}
                className="h-7 w-9 p-0 text-xs font-bold"
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
