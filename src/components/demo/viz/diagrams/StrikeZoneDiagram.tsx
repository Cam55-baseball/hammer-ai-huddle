import { motion } from 'framer-motion';

type Pitch = 'fastball' | 'curveball' | 'changeup' | 'slider';
type Zone = 'inside' | 'middle' | 'outside';

const PITCH_COLOR: Record<Pitch, string> = {
  fastball: 'hsl(var(--destructive))',
  curveball: 'hsl(217 90% 60%)',
  changeup: 'hsl(38 92% 55%)',
  slider: 'hsl(280 70% 60%)',
};

export function StrikeZoneDiagram({ pitch, zone }: { pitch: Pitch; zone: Zone }) {
  const col = zone === 'inside' ? 0 : zone === 'middle' ? 1 : 2;
  const targetX = 18 + col * 28 + 14;
  const targetY = 46;
  const color = PITCH_COLOR[pitch];

  return (
    <div className="flex items-center justify-center py-1">
      <svg viewBox="0 0 120 96" className="h-24 w-32">
        {/* Zone grid */}
        <rect x="18" y="18" width="84" height="60" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" rx="2" />
        {[1, 2].map(i => (
          <line key={`v${i}`} x1={18 + i * 28} y1="18" x2={18 + i * 28} y2="78" stroke="hsl(var(--border))" strokeWidth="1" />
        ))}
        {[1, 2].map(i => (
          <line key={`h${i}`} x1="18" y1={18 + i * 20} x2="102" y2={18 + i * 20} stroke="hsl(var(--border))" strokeWidth="1" />
        ))}
        {/* Highlighted column */}
        <rect x={18 + col * 28} y="18" width="28" height="60" fill="hsl(var(--primary) / 0.12)" />
        {/* Plate */}
        <polygon points="40,86 80,86 88,92 32,92" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
        {/* Pitch trail */}
        <motion.path
          key={`${pitch}-${zone}-trail`}
          d={`M60 4 Q ${(60 + targetX) / 2} ${targetY - 18} ${targetX} ${targetY}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0.7 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 0.55, ease: 'easeIn' }}
        />
        {/* Pitch ball */}
        <motion.circle
          key={`${pitch}-${zone}-ball`}
          cx={targetX} cy={targetY} r="5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.5, duration: 0.35 }}
        />
      </svg>
    </div>
  );
}
