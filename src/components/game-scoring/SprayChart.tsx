import { cn } from '@/lib/utils';
import { getFieldGeometry, deterministicJitter } from './fieldGeometry';

interface SprayChartProps {
  data: { direction: string; type: string }[];
  size?: number;
  sport?: 'baseball' | 'softball';
}

const DIRECTION_ANGLES: Record<string, number> = {
  'pull_line': -45, 'pull': -30, 'left_center': -15,
  'center': 0, 'right_center': 15, 'oppo': 30, 'oppo_line': 45,
  'left': -30, 'right': 30,
};

const TYPE_DISTANCE: Record<string, number> = {
  'ground_ball': 0.3, 'line_drive': 0.65, 'fly_ball': 0.85, 'pop_up': 0.45,
};

const GRASS = '#3d8c2a';
const GRASS_DARK = '#327321';
const DIRT = '#c4956a';
const CHALK = 'rgba(255,255,255,0.6)';
const FENCE = '#1a4a0e';

export function SprayChart({ data, size = 200, sport = 'baseball' }: SprayChartProps) {
  const geo = getFieldGeometry(sport, size);

  // Scale positions for mini chart: home near bottom
  const homeX = size / 2;
  const homeY = size * 0.88;
  const maxR = size * 0.72;

  // Dirt circle radius (proportional)
  const dirtR = maxR * (geo.dirtRadius / geo.outfieldRadius) * 0.8;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ground_ball': return '#3b82f6';
      case 'line_drive': return '#22c55e';
      case 'fly_ball': return '#f97316';
      case 'pop_up': return '#f87171';
      default: return '#94a3b8';
    }
  };

  // Foul line endpoints at 45° from home
  const flLeftX = homeX - maxR * Math.SQRT1_2;
  const flLeftY = homeY - maxR * Math.SQRT1_2;
  const flRightX = homeX + maxR * Math.SQRT1_2;
  const flRightY = homeY - maxR * Math.SQRT1_2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Background */}
      <rect width={size} height={size} fill={GRASS_DARK} rx={6} />

      {/* Fair territory wedge */}
      <path
        d={`M ${homeX} ${homeY} L ${flLeftX} ${flLeftY} A ${maxR} ${maxR} 0 0 1 ${flRightX} ${flRightY} Z`}
        fill={GRASS}
      />

      {/* Warning track */}
      {(() => {
        const innerR = maxR * 0.9;
        return (
          <path
            d={`
              M ${homeX - maxR * Math.SQRT1_2} ${homeY - maxR * Math.SQRT1_2}
              A ${maxR} ${maxR} 0 0 1 ${homeX + maxR * Math.SQRT1_2} ${homeY - maxR * Math.SQRT1_2}
              L ${homeX + innerR * Math.SQRT1_2} ${homeY - innerR * Math.SQRT1_2}
              A ${innerR} ${innerR} 0 0 0 ${homeX - innerR * Math.SQRT1_2} ${homeY - innerR * Math.SQRT1_2}
              Z
            `}
            fill="#a87d55"
            opacity={0.4}
          />
        );
      })()}

      {/* Outfield fence */}
      <path
        d={`M ${flLeftX} ${flLeftY} A ${maxR} ${maxR} 0 0 1 ${flRightX} ${flRightY}`}
        fill="none"
        stroke={FENCE}
        strokeWidth={2}
      />

      {/* Foul lines */}
      <line x1={homeX} y1={homeY} x2={flLeftX} y2={flLeftY} stroke={CHALK} strokeWidth={1} />
      <line x1={homeX} y1={homeY} x2={flRightX} y2={flRightY} stroke={CHALK} strokeWidth={1} />

      {/* Infield dirt */}
      <circle cx={homeX} cy={homeY - dirtR * 0.85} r={dirtR} fill={DIRT} opacity={0.7} />
      <circle cx={homeX} cy={homeY} r={dirtR * 0.25} fill={DIRT} opacity={0.7} />

      {/* Home plate */}
      <rect x={homeX - 2.5} y={homeY - 2.5} width={5} height={5} fill="white" transform={`rotate(45 ${homeX} ${homeY})`} />

      {/* Data points */}
      {data.map((d, i) => {
        const angle = ((DIRECTION_ANGLES[d.direction] ?? 0) - 90) * (Math.PI / 180);
        const dist = (TYPE_DISTANCE[d.type] ?? 0.5) * maxR;
        const { dx, dy } = deterministicJitter(i, 42);
        const px = homeX + Math.cos(angle) * dist + dx;
        const py = homeY + Math.sin(angle) * dist + dy;
        return (
          <circle
            key={i}
            cx={px}
            cy={py}
            r={3.5}
            fill={getTypeColor(d.type)}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={0.5}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
