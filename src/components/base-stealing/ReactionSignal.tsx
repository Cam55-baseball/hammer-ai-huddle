import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SignalMode = 'colors' | 'numbers';

interface ReactionSignalProps {
  mode: SignalMode;
  onSignalFired: (signal: { type: 'go' | 'return'; value: string; firedAt: number }) => void;
  onSignalDismissed: () => void;
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

const SIGNAL_DISPLAY_MS = 3000;

export function ReactionSignal({ mode, onSignalFired, onSignalDismissed, delay, active }: ReactionSignalProps) {
  const [signal, setSignal] = useState<{ type: 'go' | 'return'; value: string; color?: string } | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSignalFiredRef = useRef(onSignalFired);
  const onSignalDismissedRef = useRef(onSignalDismissed);

  // Keep callback refs current
  useEffect(() => { onSignalFiredRef.current = onSignalFired; }, [onSignalFired]);
  useEffect(() => { onSignalDismissedRef.current = onSignalDismissed; }, [onSignalDismissed]);

  // Fire signal after delay
  useEffect(() => {
    if (!active) return;

    delayTimerRef.current = setTimeout(() => {
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
      onSignalFiredRef.current({ type, value, firedAt: Date.now() });

      dismissTimerRef.current = setTimeout(() => {
        setSignal(null);
        onSignalDismissedRef.current();
      }, SIGNAL_DISPLAY_MS);
    }, delay);

    return () => {
      // Only clear the delay timer; dismiss timer must survive
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, [active, delay, mode]);

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

          <div className="absolute top-12 text-white/60 text-sm font-medium tracking-widest">
            REACT NOW
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
