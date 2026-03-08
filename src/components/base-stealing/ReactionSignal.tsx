import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

type SignalMode = 'colors' | 'numbers';

interface ReactionSignalProps {
  mode: SignalMode;
  onSignalFired: (signal: { type: 'go' | 'return'; value: string; firedAt: number }) => void;
  onUserReact: (decision: 'go' | 'return') => void;
  delay: number;
  active: boolean;
}

const GO_COLORS = ['#22c55e'];
const RETURN_COLORS = ['#ef4444', '#eab308', '#3b82f6'];

const COLOR_LABELS: Record<string, string> = {
  '#22c55e': 'GREEN',
  '#ef4444': 'RED',
  '#eab308': 'YELLOW',
  '#3b82f6': 'BLUE',
};

export function ReactionSignal({ mode, onSignalFired, onUserReact, delay, active }: ReactionSignalProps) {
  const [signal, setSignal] = useState<{ type: 'go' | 'return'; value: string; color?: string } | null>(null);

  useEffect(() => {
    if (!active) {
      setSignal(null);
      return;
    }

    const timer = setTimeout(() => {
      let type: 'go' | 'return';
      let value: string;
      let color: string | undefined;

      if (mode === 'colors') {
        const isGo = Math.random() < 0.4;
        type = isGo ? 'go' : 'return';
        const pool = isGo ? GO_COLORS : RETURN_COLORS;
        color = pool[Math.floor(Math.random() * pool.length)];
        value = COLOR_LABELS[color] || color;
      } else {
        const num = Math.floor(Math.random() * 20) + 1;
        type = num % 2 === 0 ? 'go' : 'return';
        value = String(num);
        color = type === 'go' ? '#22c55e' : '#ef4444';
      }

      setSignal({ type, value, color });
      onSignalFired({ type, value, firedAt: Date.now() });
    }, delay);

    return () => clearTimeout(timer);
  }, [active, delay, mode, onSignalFired]);

  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: signal.color || '#22c55e' }}
        >
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="text-white font-black drop-shadow-lg"
            style={{ fontSize: 'min(30vw, 200px)' }}
          >
            {signal.value}
          </motion.span>

          {/* Reaction buttons overlaid on the signal */}
          <div className="absolute bottom-16 left-0 right-0 flex gap-6 justify-center px-6">
            <Button
              size="lg"
              className="flex-1 max-w-[180px] py-8 text-xl font-black bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 backdrop-blur-sm"
              onClick={() => onUserReact('go')}
            >
              GO
            </Button>
            <Button
              size="lg"
              className="flex-1 max-w-[180px] py-8 text-xl font-black bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 backdrop-blur-sm"
              onClick={() => onUserReact('return')}
            >
              BACK
            </Button>
          </div>

          <div className="absolute top-12 text-white/60 text-sm font-medium tracking-widest">
            TAP YOUR DECISION
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
