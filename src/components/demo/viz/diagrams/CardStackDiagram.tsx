import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export interface StackCard { id: string; title: string; tag?: string; hue: number; }

export function CardStackDiagram({ cards, selectedId }: { cards: StackCard[]; selectedId?: string }) {
  return (
    <div className="relative h-32 w-full overflow-hidden rounded-md border bg-muted/20">
      <div className="absolute inset-0 flex items-center justify-center">
        {cards.slice(0, 5).map((c, i) => {
          const center = (cards.length - 1) / 2;
          const offset = i - center;
          const isSel = c.id === selectedId;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1, y: 0,
                x: offset * 36,
                rotate: offset * 6,
                scale: isSel ? 1.12 : 0.9,
                zIndex: isSel ? 10 : 5 - Math.abs(offset),
              }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              className="absolute h-24 w-20 overflow-hidden rounded-md border-2 shadow-lg"
              style={{
                background: `linear-gradient(135deg, hsl(${c.hue} 70% 35%), hsl(${(c.hue + 40) % 360} 60% 18%))`,
                borderColor: isSel ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              }}
            >
              <Play className="absolute inset-0 m-auto h-5 w-5 text-white/90" />
              <p className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-1 py-0.5 text-[8px] font-bold">
                {c.title}
              </p>
              {c.tag && (
                <span className="absolute top-1 right-1 rounded-full bg-black/60 px-1 text-[7px] font-bold text-white">
                  {c.tag}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
