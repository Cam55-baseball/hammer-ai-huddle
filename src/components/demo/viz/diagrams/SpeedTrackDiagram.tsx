import { motion } from 'framer-motion';

export function SpeedTrackDiagram({ yourSec, eliteSec, distanceLabel }: { yourSec: number; eliteSec: number; distanceLabel: string }) {
  const ratio = Math.max(0.4, eliteSec / yourSec);
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="mb-1 flex items-baseline justify-between text-[10px]">
        <span className="font-bold uppercase tracking-wide text-muted-foreground">{distanceLabel}</span>
        <span className="font-black">{yourSec.toFixed(2)}s <span className="font-normal text-muted-foreground">vs {eliteSec.toFixed(2)}s</span></span>
      </div>
      <Lane label="Elite" duration={1.6 * ratio} color="hsl(var(--primary))" />
      <div className="h-1.5" />
      <Lane label="You" duration={1.6} color="hsl(var(--foreground))" />
    </div>
  );
}

function Lane({ label, duration, color }: { label: string; duration: number; color: string }) {
  return (
    <div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/40">
        <motion.div
          key={duration}
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow"
          style={{ background: color }}
          initial={{ left: 0 }} animate={{ left: 'calc(100% - 12px)' }}
          transition={{ duration, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
