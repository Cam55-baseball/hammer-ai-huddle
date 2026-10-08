import { useDayState } from '@/hooks/useDayState';
import { Moon, SkipForward, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Day state banner shown at the top of the Game Plan rendering area
 * to explain how today's activities should be interpreted.
 */
export function DayStateBanner() {
  const { dayType } = useDayState();
  if (dayType === 'standard') return null;

  const map = {
    rest: {
      Icon: Moon,
      text: 'Rest: take it easier — hard work still to do is dialled back',
      class: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
    },
    skip: {
      Icon: SkipForward,
      text: 'Skip: sit today out — no day credit; workout amounts stay the same',
      class: 'border-muted bg-muted/40 text-muted-foreground',
    },
    push: {
      Icon: Flame,
      text: 'Push: commit to the plan — today’s planned work, no extra sets or harder work',
      class: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    },
  } as const;

  const { Icon, text, class: cls } = map[dayType];
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-bold', cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
