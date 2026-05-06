import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';

export function TexVisionGridDiagram({ completed, drills }: { completed: number; drills: string[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="mb-1.5 flex items-baseline justify-between text-[10px]">
        <span className="font-bold uppercase tracking-wide text-muted-foreground">16-drill daily plan</span>
        <span className="font-black">{completed}/16 done</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 16 }).map((_, i) => {
          const done = i < completed;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.025 }}
              className="relative aspect-square rounded-sm border"
              style={{ background: done ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--muted) / 0.4)' }}
              title={drills[i % drills.length]}
            >
              {done && <Eye className="absolute inset-0 m-auto h-3 w-3 text-primary-foreground" />}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
