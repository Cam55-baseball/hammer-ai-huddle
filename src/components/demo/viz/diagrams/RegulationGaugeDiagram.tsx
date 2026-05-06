import { motion } from 'framer-motion';

export function RegulationGaugeDiagram({ index }: { index: number }) {
  const v = Math.max(0, Math.min(100, index));
  const color = v >= 75 ? 'hsl(142 70% 45%)' : v >= 50 ? 'hsl(38 92% 50%)' : 'hsl(var(--destructive))';
  const status = v >= 75 ? 'Go' : v >= 50 ? 'Caution' : 'Recover';
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-2">
      <div className="relative h-28 w-6 overflow-hidden rounded-full border bg-muted/40">
        <motion.div
          className="absolute inset-x-0 bottom-0 rounded-full"
          style={{ background: color }}
          initial={{ height: 0 }}
          animate={{ height: `${v}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        {[25, 50, 75].map(t => (
          <span key={t} className="absolute inset-x-0 h-px bg-background/60" style={{ bottom: `${t}%` }} />
        ))}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Readiness</p>
        <p className="text-3xl font-black" style={{ color }}>{Math.round(v)}</p>
        <p className="text-xs font-bold" style={{ color }}>{status}</p>
      </div>
    </div>
  );
}
