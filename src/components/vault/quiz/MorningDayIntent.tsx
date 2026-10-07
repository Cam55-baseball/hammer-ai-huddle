import { useState } from 'react';
import { Moon, SkipForward, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDayState } from '@/hooks/useDayState';
import { toast } from 'sonner';

/** The existing day override write, relocated to the final morning step. */
export function MorningDayIntent() {
  const { dayType, setDayType, restBudgetLeft, overBudget } = useDayState();
  const [saving, setSaving] = useState(false);
  const choices = [
    { type: 'rest' as const, label: 'Rest: take it easier', explanation: 'Dial back hard work still to do; keep completed work.', icon: Moon },
    { type: 'skip' as const, label: 'Skip: sit today out', explanation: 'No day credit; workout amounts stay the same.', icon: SkipForward },
    { type: 'push' as const, label: 'Push: commit to the plan', explanation: 'Do today’s planned work; no extra sets or harder work added.', icon: Flame },
  ];
  const choose = async (type: 'rest' | 'skip' | 'push') => {
    if (saving) return;
    setSaving(true);
    try {
      const next = dayType === type ? null : type;
      if (next === 'rest' && restBudgetLeft <= 0) toast.warning('Rest budget exceeded', { description: 'Extra rest counts as missed.' });
      await setDayType(next);
      toast.success(next ? `${type[0].toUpperCase()}${type.slice(1)} day set.` : 'Standard day restored.');
    } catch {
      toast.error('Day intent could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section aria-label="Day intent" className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">How do you want to train today?</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {choices.map(({ type, label, explanation, icon: Icon }) => (
          <div key={type} className="min-w-0 space-y-1.5">
          <Button key={type} type="button" size="sm" variant={dayType === type ? 'default' : 'outline'}
            className="h-11 w-full gap-1.5 px-2 text-xs" aria-describedby={`morning-day-${type}`}
            disabled={saving} onClick={() => void choose(type)} aria-pressed={dayType === type}>
            <Icon className="h-4 w-4 shrink-0" />{label}
          </Button>
          <p id={`morning-day-${type}`} className="text-xs leading-relaxed text-muted-foreground">{explanation}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {dayType === 'rest' ? 'Rest selected. Eligible remaining work is dialled back, not cancelled. Daily must-do tasks are waived; streak protection is within your rest allowance.' :
          dayType === 'skip' ? 'Skip selected. No progress or recovery credit for the day. This does not mark every workout skipped.' :
          dayType === 'push' ? 'Push selected. Follow today’s plan, not a harder plan. All training limits still apply.' :
          'Standard day. Follow today’s plan.'}
      </p>
      <p className="text-xs text-muted-foreground">{overBudget ? 'Rest allowance exceeded this week.' : 'Rest allowance is managed for you this week.'}</p>
    </section>
  );
}