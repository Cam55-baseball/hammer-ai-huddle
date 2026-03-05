import { cn } from '@/lib/utils';

interface DiamondVisualProps {
  runners?: { first?: boolean; second?: boolean; third?: boolean };
  size?: 'sm' | 'md';
}

export function DiamondVisual({ runners = {}, size = 'sm' }: DiamondVisualProps) {
  const s = size === 'sm' ? 40 : 64;
  const half = s / 2;
  const pad = size === 'sm' ? 4 : 6;
  const baseSize = size === 'sm' ? 6 : 9;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="inline-block">
      {/* Diamond outline */}
      <polygon
        points={`${half},${pad} ${s - pad},${half} ${half},${s - pad} ${pad},${half}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-muted-foreground/50"
      />
      {/* Home plate */}
      <rect x={half - baseSize / 2} y={s - pad - baseSize / 2} width={baseSize} height={baseSize}
        className="fill-muted-foreground/30" transform={`rotate(45 ${half} ${s - pad})`} />
      {/* First base */}
      <rect x={s - pad - baseSize / 2} y={half - baseSize / 2} width={baseSize} height={baseSize}
        className={cn(runners.first ? 'fill-primary' : 'fill-muted-foreground/30')}
        transform={`rotate(45 ${s - pad} ${half})`} />
      {/* Second base */}
      <rect x={half - baseSize / 2} y={pad - baseSize / 2} width={baseSize} height={baseSize}
        className={cn(runners.second ? 'fill-primary' : 'fill-muted-foreground/30')}
        transform={`rotate(45 ${half} ${pad})`} />
      {/* Third base */}
      <rect x={pad - baseSize / 2} y={half - baseSize / 2} width={baseSize} height={baseSize}
        className={cn(runners.third ? 'fill-primary' : 'fill-muted-foreground/30')}
        transform={`rotate(45 ${pad} ${half})`} />
    </svg>
  );
}
