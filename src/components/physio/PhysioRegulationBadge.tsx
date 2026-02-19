import { cn } from '@/lib/utils';

interface PhysioRegulationBadgeProps {
  score: number | null;
  color: 'green' | 'yellow' | 'red' | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', container: 'gap-1 px-2 py-0.5' },
  md: { dot: 'w-3 h-3', text: 'text-sm', container: 'gap-1.5 px-2.5 py-1' },
  lg: { dot: 'w-4 h-4', text: 'text-base', container: 'gap-2 px-3 py-1.5' },
};

const colorMap = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

const borderMap = {
  green: 'border-emerald-500/30 text-emerald-400',
  yellow: 'border-amber-500/30 text-amber-400',
  red: 'border-red-500/30 text-red-400',
};

export function PhysioRegulationBadge({ score, color, size = 'md' }: PhysioRegulationBadgeProps) {
  const { dot, text, container } = sizeMap[size];

  if (score === null || color === null) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-full border bg-card/50',
        container,
        'border-border/50 text-muted-foreground'
      )}>
        <div className={cn(dot, 'rounded-full bg-muted-foreground/50')} />
        <span className={cn(text, 'font-mono font-bold')}>—</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'inline-flex items-center rounded-full border bg-card/50',
      container,
      borderMap[color]
    )}>
      <div className={cn(dot, 'rounded-full animate-pulse', colorMap[color])} />
      <span className={cn(text, 'font-mono font-bold')}>{score}</span>
    </div>
  );
}
