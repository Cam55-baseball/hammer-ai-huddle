import { motion } from 'framer-motion';

export function CommandGridDiagram({ intent, actual }: { intent: number; actual: number[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Command grid · target lit, hits dotted</p>
      <div className="mx-auto grid w-fit grid-cols-5 gap-1">
        {Array.from({ length: 25 }).map((_, i) => {
          const isTarget = i === intent;
          const hit = actual.includes(i);
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.012 }}
              className="relative h-6 w-6 rounded-sm border"
              style={{
                background: isTarget ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--muted) / 0.4)',
                borderColor: isTarget ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              }}
            >
              {hit && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.015 }}
                  className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-foreground"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
