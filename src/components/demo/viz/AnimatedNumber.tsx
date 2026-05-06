import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function AnimatedNumber({ value, decimals = 0, suffix, duration = 450, className }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) { setDisplay(value); fromRef.current = value; return; }
    const start = performance.now();
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, reduced]);

  return (
    <span className={className}>
      {display.toFixed(decimals)}
      {suffix && <span className="text-xs font-normal text-muted-foreground"> {suffix}</span>}
    </span>
  );
}
