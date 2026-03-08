import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SignalMode = 'colors' | 'numbers';

interface ReactionSignalProps {
  mode: SignalMode;
  onSignalFired: (signal: { type: 'go' | 'return'; value: string; firedAt: number }) => void;
  delay: number; // ms before signal fires
  active: boolean;
}

const GO_COLORS = ['#22c55e']; // green
const RETURN_COLORS = ['#ef4444', '#eab308', '#3b82f6']; // red, yellow, blue

const COLOR_LABELS: Record<string, string> = {
  '#22c55e': 'GREEN',
  '#ef4444': 'RED',
  '#eab308': 'YELLOW',
  '#3b82f6': 'BLUE',
};

export function ReactionSignal({ mode, onSignalFired, delay, active }: ReactionSignalProps) {
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
        // ~40% go, ~60% return
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
          className="fixed inset-0 z-50 flex items-center justify-center"
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
          <div className="absolute bottom-12 text-white/80 text-xl font-bold tracking-widest">
            {signal.type === 'go' ? 'GO!' : 'BACK!'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
