import { useSportTheme } from '@/contexts/SportThemeContext';
import { cn } from '@/lib/utils';

export function SportBadge() {
  const { sport } = useSportTheme();
  const isSoftball = sport === 'softball';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border',
      isSoftball
        ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
        : 'bg-blue-500/15 text-blue-700 border-blue-500/30'
    )}>
      {isSoftball ? '🥎' : '⚾'} {isSoftball ? 'Softball' : 'Baseball'}
    </span>
  );
}
