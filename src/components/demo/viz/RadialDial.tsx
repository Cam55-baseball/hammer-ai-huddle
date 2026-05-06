import { motion } from 'framer-motion';

interface Props { value: number; label?: string; size?: number; color?: string; suffix?: string; }

export function RadialDial({ value, label, size = 96, color = 'hsl(var(--primary))', suffix }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const off = c * (1 - v / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black">{Math.round(v)}{suffix}</span>
        {label && <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
