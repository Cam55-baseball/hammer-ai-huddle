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
      text: 'RECOVERY MODE — Resume tomorrow',
      class: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
    },
    skip: {
      Icon: SkipForward,
      text: 'DAY SKIPPED — No progress recorded',
      class: 'border-muted bg-muted/40 text-muted-foreground',
    },
    push: {
      Icon: Flame,
      text: 'PUSH DAY — Higher output expected',
      class: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
    },
  } as const;

  const { Icon, text, class: cls } = map[dayType];
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-black uppercase tracking-wider', cls)}>
      <Icon className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
