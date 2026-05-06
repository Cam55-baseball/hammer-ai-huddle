import { motion } from 'framer-motion';

interface Props {
  batPathScore: number; // 0..100
  launchAngle: number; // degrees
}

export function SwingArcDiagram({ batPathScore, launchAngle }: Props) {
  const w = 200, h = 80;
  // Elite reference arc (target)
  const elite = 'M20 70 Q 100 10 180 50';
  // User arc — curvature inverse to score; angle tilts endpoint
  const dip = 70 - (batPathScore / 100) * 60; // higher score = closer to elite
  const endY = 70 - Math.max(-10, Math.min(45, launchAngle));
  const userPath = `M20 70 Q 100 ${dip} 180 ${endY}`;

  return (
    <div className="flex flex-col items-center gap-1 rounded-md border bg-muted/20 p-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full max-w-[220px]">
        {/* ground */}
        <line x1="0" y1="74" x2={w} y2="74" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 3" />
        {/* elite ghost */}
        <path d={elite} stroke="hsl(var(--primary) / 0.4)" strokeWidth="2" fill="none" strokeDasharray="3 3" />
        {/* user arc */}
        <motion.path
          key={`${batPathScore}-${launchAngle}`}
          d={userPath}
          stroke="hsl(var(--foreground))"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        {/* contact point */}
        <motion.circle
          key={`contact-${batPathScore}`}
          cx="100" cy={dip + 6} r="4"
          fill="hsl(var(--primary))"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1] }}
          transition={{ delay: 0.5, duration: 0.4 }}
        />
      </svg>
      <div className="flex w-full justify-between text-[10px] text-muted-foreground">
        <span><span className="inline-block h-1.5 w-3 rounded-full bg-primary/40 align-middle mr-1" />Elite path</span>
        <span><span className="inline-block h-1.5 w-3 rounded-full bg-foreground align-middle mr-1" />Your swing</span>
      </div>
    </div>
  );
}
