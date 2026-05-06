import { motion } from 'framer-motion';

interface Props {
  severity: 'minor' | 'moderate' | 'critical';
}

export function SeverityMeter({ severity }: Props) {
  const angle = severity === 'minor' ? -55 : severity === 'moderate' ? 0 : 55;
  const label = severity === 'minor' ? 'Minor gap' : severity === 'moderate' ? 'Moderate gap' : 'Critical gap';
  const color = severity === 'minor' ? 'hsl(142 70% 45%)' : severity === 'moderate' ? 'hsl(38 92% 50%)' : 'hsl(var(--destructive))';

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 70" className="h-12 w-20 shrink-0">
        <path d="M10 60 A50 50 0 0 1 45 14" stroke="hsl(142 70% 45%)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M50 11 A50 50 0 0 1 70 11" stroke="hsl(38 92% 50%)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M75 14 A50 50 0 0 1 110 60" stroke="hsl(var(--destructive))" strokeWidth="6" fill="none" strokeLinecap="round" />
        <motion.line
          x1="60" y1="60" x2="60" y2="22"
          stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round"
          initial={{ rotate: -55 }}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          style={{ transformOrigin: '60px 60px' }}
        />
        <circle cx="60" cy="60" r="3" fill="hsl(var(--foreground))" />
      </svg>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Severity</p>
        <p className="text-sm font-black" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}
