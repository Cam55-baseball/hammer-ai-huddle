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
    { type: 'rest' as const, label: 'Rest', icon: Moon },
    { type: 'skip' as const, label: 'Skip', icon: SkipForward },
    { type: 'push' as const, label: 'Push', icon: Flame },
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
      <h3 className="text-sm font-semibold">Day intent</h3>
      <p className="text-xs text-muted-foreground">Choose how today counts, or leave it as a standard day.</p>
      <div className="grid grid-cols-3 gap-2">
        {choices.map(({ type, label, icon: Icon }) => (
          <Button key={type} type="button" size="sm" variant={dayType === type ? 'default' : 'outline'}
            disabled={saving} onClick={() => void choose(type)} aria-pressed={dayType === type}>
            <Icon className="mr-1 h-4 w-4" />{label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {dayType === 'rest' ? 'Easier day: the hard work in your plan is dialled back. Streak protected. Non-Negotiables waived.' :
          dayType === 'skip' ? 'Day ignored. No progress or recovery credit.' :
          dayType === 'push' ? 'Higher standard today. Your plan already sets the most you should do, so no extra work is added.' :
          'Standard day. Operate at your current standard.'}
      </p>
      <p className="text-xs text-muted-foreground">{overBudget ? 'Rest allowance exceeded this week.' : 'Rest allowance is managed for you this week.'}</p>
    </section>
  );
}