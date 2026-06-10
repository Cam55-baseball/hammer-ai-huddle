import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Status = "pass" | "warn" | "fail";

interface Props {
  /** 0..1 — fraction of the arc to fill. */
  fraction: number;
  /** Threshold band start (0..1) where "pass" begins. */
  threshold?: number;
  status: Status;
  /** Big number rendered in the middle. */
  centerLabel: string;
  /** Small label under the number. */
  centerSub?: string;
  size?: number;
  /** Disable mount animation when reduced-motion users. */
  animate?: boolean;
}

/**
 * Animated radial dial. Sweeps 0 -> fraction on mount with spring physics,
 * shows a coloured threshold band so the athlete can SEE where they landed.
 */
export function RadialMeter({
  fraction,
  threshold = 0.6,
  status,
  centerLabel,
  centerSub,
  size = 96,
  animate = true,
}: Props) {
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 3/4 arc from 135deg to 405deg.
  const arcStart = 135;
  const arcEnd = 405;
  const arcSpan = arcEnd - arcStart;
  const circ = (arcSpan / 360) * 2 * Math.PI * r;

  const [animatedFrac, setAnimatedFrac] = useState(animate ? 0 : fraction);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setAnimatedFrac(fraction);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out-cubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setAnimatedFrac(fraction * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [fraction, animate]);

  const dash = circ * Math.max(0, Math.min(1, animatedFrac));

  // Threshold band
  const bandDash = circ * Math.max(0, Math.min(1, 1 - threshold));
  const bandOffset = circ * threshold;

  const strokeVar =
    status === "pass" ? "var(--meter-pass)" : status === "warn" ? "var(--meter-warn)" : "var(--meter-fail)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[135deg]">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`hsl(var(--meter-track))`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${2 * Math.PI * r}`}
        />
        {/* Pass-zone band (faint) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`hsl(var(--meter-pass) / 0.18)`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${bandDash} ${2 * Math.PI * r}`}
          strokeDashoffset={-bandOffset}
        />
        {/* Value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`hsl(${strokeVar})`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${2 * Math.PI * r}`}
          style={{ filter: `drop-shadow(0 0 6px hsl(${strokeVar} / 0.55))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("text-2xl font-black tracking-tight tabular-nums")}>{centerLabel}</span>
        {centerSub && (
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {centerSub}
          </span>
        )}
      </div>
    </div>
  );
}
