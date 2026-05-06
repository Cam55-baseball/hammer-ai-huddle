import { motion } from 'framer-motion';

interface Props {
  from: number;
  to: number;
  weeks?: number;
  unit?: string;
  label?: string;
}

export function SparkTrajectory({ from, to, weeks = 8, unit, label }: Props) {
  const w = 120, h = 36;
  const span = Math.max(0.0001, to - from);
  const points = Array.from({ length: weeks + 1 }, (_, i) => {
    const t = i / weeks;
    const eased = 1 - Math.pow(1 - t, 2);
    const v = from + span * eased;
    const x = (i / weeks) * (w - 6) + 3;
    const y = h - 4 - ((v - from) / span) * (h - 8);
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const [tipX, tipY] = points[points.length - 1];
  const delta = to - from;
  const sign = delta >= 0 ? '+' : '';

  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-32 shrink-0">
        <motion.path
          d={d}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
        />
        <motion.circle
          cx={tipX} cy={tipY} r="3" fill="hsl(var(--primary))"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, type: 'spring' }}
        />
        <motion.circle
          cx={tipX} cy={tipY} r="3" fill="hsl(var(--primary))"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0], scale: [1, 2.4, 2.6] }}
          transition={{ delay: 1.1, duration: 1.6, repeat: Infinity }}
        />
      </svg>
      <div className="text-xs">
        <p className="font-black text-primary">{sign}{delta.toFixed(delta % 1 === 0 ? 0 : 1)}{unit ? ` ${unit}` : ''} <span className="font-normal text-muted-foreground">in {weeks}w</span></p>
        {label && <p className="text-[10px] text-muted-foreground">{label}</p>}
      </div>
    </div>
  );
}
