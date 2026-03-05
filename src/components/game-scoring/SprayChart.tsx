import { cn } from '@/lib/utils';

interface SprayChartProps {
  data: { direction: string; type: string }[];
  size?: number;
}

const DIRECTION_ANGLES: Record<string, number> = {
  'pull_line': -45, 'pull': -30, 'left_center': -15,
  'center': 0, 'right_center': 15, 'oppo': 30, 'oppo_line': 45,
  'left': -30, 'right': 30,
};

const TYPE_DISTANCE: Record<string, number> = {
  'ground_ball': 0.35, 'line_drive': 0.7, 'fly_ball': 0.85, 'pop_up': 0.5,
};

export function SprayChart({ data, size = 200 }: SprayChartProps) {
  const cx = size / 2;
  const cy = size * 0.85;
  const maxR = size * 0.75;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ground_ball': return 'fill-blue-500';
      case 'line_drive': return 'fill-green-500';
      case 'fly_ball': return 'fill-orange-500';
      case 'pop_up': return 'fill-red-400';
      default: return 'fill-muted-foreground';
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Field outline */}
      <path
        d={`M ${cx - maxR * 0.7} ${cy} Q ${cx} ${cy - maxR * 1.2} ${cx + maxR * 0.7} ${cy}`}
        fill="none" stroke="currentColor" strokeWidth={1} className="text-muted-foreground/30"
      />
      {/* Foul lines */}
      <line x1={cx} y1={cy} x2={cx - maxR * 0.7} y2={cy - maxR * 0.05} stroke="currentColor" strokeWidth={0.5} className="text-muted-foreground/20" />
      <line x1={cx} y1={cy} x2={cx + maxR * 0.7} y2={cy - maxR * 0.05} stroke="currentColor" strokeWidth={0.5} className="text-muted-foreground/20" />

      {/* Data points */}
      {data.map((d, i) => {
        const angle = ((DIRECTION_ANGLES[d.direction] ?? 0) - 90) * (Math.PI / 180);
        const dist = (TYPE_DISTANCE[d.type] ?? 0.5) * maxR;
        const jitter = (Math.random() - 0.5) * 8;
        const px = cx + Math.cos(angle) * dist + jitter;
        const py = cy + Math.sin(angle) * dist + jitter;
        return (
          <circle key={i} cx={px} cy={py} r={3} className={cn(getTypeColor(d.type), 'opacity-80')} />
        );
      })}

      {/* Home plate */}
      <rect x={cx - 3} y={cy - 3} width={6} height={6} className="fill-foreground" transform={`rotate(45 ${cx} ${cy})`} />
    </svg>
  );
}
