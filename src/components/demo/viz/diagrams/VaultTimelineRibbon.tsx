import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  visible: number;
  total: number;
  months?: number;
}

export function VaultTimelineRibbon({ visible, total, months = 12 }: Props) {
  const visiblePct = (visible / Math.max(1, total)) * 100;
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <div className="mb-1 flex items-baseline justify-between text-[10px]">
        <span className="font-bold uppercase tracking-wide text-muted-foreground">Your timeline</span>
        <span className="font-black">{visible}<span className="text-muted-foreground">/{total} unlocked</span></span>
      </div>
      <div className="relative h-6 w-full overflow-hidden rounded-md bg-muted/40">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary/40"
          initial={{ width: 0 }}
          animate={{ width: `${visiblePct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 flex items-center justify-around">
          {Array.from({ length: months }).map((_, i) => {
            const lit = (i / months) * 100 < visiblePct;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className={`h-2 w-px ${lit ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                {!lit && i % 2 === 0 && <Lock className="h-2 w-2 text-muted-foreground/60" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[8px] uppercase text-muted-foreground">
        <span>Now</span><span>+12 mo</span>
      </div>
    </div>
  );
}
