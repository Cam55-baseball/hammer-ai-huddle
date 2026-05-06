import { motion } from 'framer-motion';

interface Row { label: string; value: number; sub?: string; highlight?: boolean }

export function BarRanking({ rows, max, unit }: { rows: Row[]; max?: number; unit?: string }) {
  const m = max ?? Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => {
        const pct = Math.max(3, (r.value / m) * 100);
        return (
          <div key={r.label}>
            <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
              <span className={`font-bold ${r.highlight ? 'text-primary' : ''}`}>{r.label}</span>
              <span className="font-black">{r.value}{unit ? ` ${unit}` : ''}{r.sub && <span className="ml-1 font-normal text-muted-foreground">{r.sub}</span>}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.highlight ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.55)' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
