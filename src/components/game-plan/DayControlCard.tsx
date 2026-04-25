import { useState } from 'react';
import { useDayState, type DayType } from '@/hooks/useDayState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Moon, SkipForward, Flame, ChevronDown, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS = [
  { v: 0, k: 'Sun' }, { v: 1, k: 'Mon' }, { v: 2, k: 'Tue' }, { v: 3, k: 'Wed' },
  { v: 4, k: 'Thu' }, { v: 5, k: 'Fri' }, { v: 6, k: 'Sat' },
];

const STATE_META: Record<DayType, {
  label: string;
  explanation: string;
  cardClass: string;
  headerClass: string;
}> = {
  rest: {
    label: 'REST DAY — RECOVERY MODE',
    explanation: 'Recovery supports performance. Streak protected. NN waived.',
    cardClass: 'border-sky-500/50 bg-gradient-to-br from-sky-500/10 to-blue-500/5',
    headerClass: 'text-sky-400',
  },
  skip: {
    label: 'SKIP DAY — NO LOGGED OUTPUT',
    explanation: 'Day ignored. No progress. No recovery credit.',
    cardClass: 'border-muted bg-muted/30',
    headerClass: 'text-muted-foreground',
  },
  push: {
    label: 'PUSH DAY — EXTRA LOAD',
    explanation: 'Higher standard today. Extra output expected.',
    cardClass: 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-rose-500/5',
    headerClass: 'text-amber-400',
  },
  standard: {
    label: 'STANDARD DAY',
    explanation: 'Operate at your current identity standard.',
    cardClass: 'border-border bg-card/50',
    headerClass: 'text-foreground',
  },
};

/**
 * Unified Day Control — single card for Rest / Skip / Push intent.
 * Mutually exclusive states. Tapping the active state clears it.
 */
export function DayControlCard() {
  const {
    dayType, isRest, isSkip, isPush,
    setDayType, restBudgetLeft, usedThisWeek, maxPerWeek, overBudget,
    recurringDays, updateRecurringDays,
  } = useDayState();
  const [busy, setBusy] = useState(false);
  const meta = STATE_META[dayType];

  const handleClick = async (target: 'rest' | 'skip' | 'push') => {
    if (busy) return;
    setBusy(true);
    try {
      const next = dayType === target ? null : target;
      if (next === 'rest' && restBudgetLeft <= 0) {
        toast.warning('Rest budget exceeded', { description: 'Extra rest counts as missed.' });
      }
      await setDayType(next);
      const msgs: Record<string, string> = {
        rest: 'Rest day set — streak protected.',
        skip: 'Skip day set — day will not count.',
        push: 'Push day set — extra load expected.',
      };
      toast.success(next ? msgs[next] : 'Standard day restored.');
    } finally {
      setBusy(false);
    }
  };

  const toggleRecurring = async (d: number) => {
    const next = recurringDays.includes(d)
      ? recurringDays.filter((x) => x !== d)
      : [...recurringDays, d].sort();
    await updateRecurringDays(next);
    toast.success('Recurring rest schedule updated');
  };

  return (
    <Card className={cn('border-2 transition-colors', meta.cardClass)}>
      <CardContent className="p-4 space-y-4">
        {/* STATUS HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div className={cn('text-xs font-black uppercase tracking-widest', meta.headerClass)}>
            {meta.label}
          </div>
          {dayType !== 'standard' && (
            <button
              type="button"
              onClick={() => handleClick(dayType as 'rest' | 'skip' | 'push')}
              disabled={busy}
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* ACTION BUTTON ROW */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={isRest ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => handleClick('rest')}
            className={cn(
              'h-11 gap-1.5 text-xs font-black',
              isRest && 'bg-sky-600 hover:bg-sky-600/90 text-white border-sky-600'
            )}
          >
            <Moon className="h-4 w-4" />
            REST
          </Button>
          <Button
            type="button"
            variant={isSkip ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => handleClick('skip')}
            className={cn(
              'h-11 gap-1.5 text-xs font-black',
              isSkip && 'bg-muted-foreground hover:bg-muted-foreground/90 text-background border-muted-foreground'
            )}
          >
            <SkipForward className="h-4 w-4" />
            SKIP
          </Button>
          <Button
            type="button"
            variant={isPush ? 'default' : 'outline'}
            disabled={busy}
            onClick={() => handleClick('push')}
            className={cn(
              'h-11 gap-1.5 text-xs font-black',
              isPush && 'bg-amber-600 hover:bg-amber-600/90 text-white border-amber-600'
            )}
          >
            <Flame className="h-4 w-4" />
            PUSH
          </Button>
        </div>

        {/* QUICK EXPLANATION */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {meta.explanation}
        </p>

        {/* WEEKLY REST BUDGET (only relevant if rest in play) */}
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs">
          {overBudget ? (
            <>
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="font-bold text-rose-400">
                {usedThisWeek}/{maxPerWeek} rest used — over budget. Excess counts as missed.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-bold">
                {usedThisWeek}/{maxPerWeek} rest used — elite compliant
              </span>
            </>
          )}
        </div>

        {/* RECURRING REST + CAP CONFIG (collapsed) */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-1 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <span>Recurring rest schedule</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(({ v, k }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleRecurring(v)}
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Max/week</span>
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
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
