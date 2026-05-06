import { motion } from 'framer-motion';

export interface HeatBlock { label: string; intensity: number; /* 0..1 */ }

export function HeatBlockDiagram({ blocks, columns = 3 }: { blocks: HeatBlock[]; columns?: number }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Weekly volume distribution</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {blocks.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="aspect-square rounded-sm border p-1 text-center text-[9px]"
            style={{ background: `hsl(var(--primary) / ${0.12 + b.intensity * 0.6})` }}
          >
            <p className="font-bold uppercase">{b.label}</p>
            <p className="mt-1 text-[10px] font-black">{Math.round(b.intensity * 100)}%</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
