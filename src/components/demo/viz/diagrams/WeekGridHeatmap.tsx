import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Day {
  day: string;
  focus: string;
  locked?: boolean;
  exercises: { name: string; sets: number; reps: number | string }[];
}

export function WeekGridHeatmap({ days }: { days: Day[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Week at a glance</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const intensity = Math.min(1, d.exercises.length / 5);
          const bg = d.locked
            ? 'hsl(var(--muted) / 0.5)'
            : `hsl(var(--primary) / ${0.15 + intensity * 0.55})`;
          return (
            <motion.div
              key={d.day}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative aspect-square rounded-sm border text-center"
              style={{ background: bg }}
              title={`${d.day} · ${d.focus}`}
            >
              <p className="absolute inset-x-0 top-0.5 text-[8px] font-bold uppercase">{d.day.slice(0, 3)}</p>
              {d.locked && <Lock className="absolute inset-0 m-auto h-3 w-3 text-muted-foreground" />}
              {!d.locked && (
                <p className="absolute inset-x-0 bottom-0.5 text-[8px] text-foreground/80 truncate px-0.5">
                  {d.focus.split(' ')[0]}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
