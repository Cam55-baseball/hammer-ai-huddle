import { useState } from 'react';
import { useRestDay } from '@/hooks/useRestDay';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = [
  { v: 0, k: 'S' }, { v: 1, k: 'M' }, { v: 2, k: 'T' }, { v: 3, k: 'W' },
  { v: 4, k: 'T' }, { v: 5, k: 'F' }, { v: 6, k: 'S' },
];

interface Props { className?: string }

export function RestDayButton({ className }: Props) {
  const {
    isRestToday, overrideToday, recurringDays, maxPerWeek,
    usedThisWeek, restBudgetLeft, overBudget,
    setTodayAsRest, updateRecurringDays,
  } = useRestDay();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleToggleToday = async () => {
    setBusy(true);
    try {
      const willTurnOn = !overrideToday;
      if (willTurnOn && restBudgetLeft <= 0) {
        toast.warning('Rest budget exceeded', { description: 'Extra rest days count as misses.' });
      }
      await setTodayAsRest();
      toast.success(willTurnOn ? 'Today marked as rest' : 'Rest cleared');
    } finally { setBusy(false); }
  };

  const toggleDay = async (d: number) => {
    const next = recurringDays.includes(d)
      ? recurringDays.filter((x) => x !== d)
      : [...recurringDays, d].sort();
    await updateRecurringDays(next);
  };

  const setMax = async (n: number) => updateRecurringDays(recurringDays, n);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        size="sm"
        variant={isRestToday ? 'default' : 'outline'}
        onClick={handleToggleToday}
        disabled={busy}
        className={cn(
          'h-8 gap-1.5 text-xs font-bold',
          isRestToday && 'bg-sky-600 hover:bg-sky-600/90 text-white'
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        {isRestToday ? 'REST DAY' : 'Rest Today'}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Rest day settings">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-sky-500" />
              Rest Day Schedule
            </SheetTitle>
            <SheetDescription>
              Recurring rest days protect your streak. Up to {maxPerWeek}/week is elite-compliant.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Recurring rest days
              </Label>
              <div className="mt-2 flex justify-between gap-1">
                {DAYS.map(({ v, k }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleDay(v)}
                    className={cn(
                      'h-11 w-11 rounded-full text-sm font-black border-2 transition-all',
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

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Max rest days per week
              </Label>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={maxPerWeek === n ? 'default' : 'outline'}
                    onClick={() => setMax(n)}
                    className="flex-1 font-bold"
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Used this week: <span className="font-bold text-foreground">{usedThisWeek}</span> / {maxPerWeek}
                {overBudget && <span className="ml-2 text-rose-500">Over budget — slipping standard.</span>}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="today-rest" className="text-sm font-bold">Today is rest</Label>
                <p className="text-xs text-muted-foreground">Manual override for {new Date().toLocaleDateString()}</p>
              </div>
              <Switch
                id="today-rest"
                checked={!!overrideToday}
                onCheckedChange={() => handleToggleToday()}
                disabled={busy}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
