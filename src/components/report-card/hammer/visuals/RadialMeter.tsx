import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Status = "pass" | "warn" | "fail" | "elite";

interface Props {
  /** 0..1 — fraction of the arc to fill. */
  fraction: number;
  /** Acceptable PASS threshold (0..1). */
  acceptable?: number;
  /** Elite/perfection threshold (0..1). Optional. */
  elite?: number;
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
 * Animated radial dial. Sweeps 0 -> fraction on mount with ease-out cubic.
 * Renders TWO threshold bands so the athlete can SEE where Acceptable
 * ends and where Elite begins — drives the "how close to perfection?" feel.
 */
export function RadialMeter({
  fraction,
  acceptable = 0.6,
  elite,
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
  const full = 2 * Math.PI * r;

  const [animatedFrac, setAnimatedFrac] = useState(animate ? 0 : fraction);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setAnimatedFrac(fraction);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
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

  // Acceptable PASS band (faint green from acceptable→elite or →end)
  const passBandEnd = elite ?? 1;
  const passBandStart = acceptable;
  const passDash = circ * Math.max(0, passBandEnd - passBandStart);
  const passOffset = circ * passBandStart;

  // Elite band (faint gold from elite→end)
  const eliteDash = elite !== undefined ? circ * Math.max(0, 1 - elite) : 0;
  const eliteOffset = elite !== undefined ? circ * elite : 0;

  const strokeVar =
    status === "elite"
      ? "var(--grade-a-glow)"
      : status === "pass"
        ? "var(--meter-pass)"
        : status === "warn"
          ? "var(--meter-warn)"
          : "var(--meter-fail)";

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
          strokeDasharray={`${circ} ${full}`}
        />
        {/* Acceptable PASS-zone band */}
        {passDash > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`hsl(var(--meter-pass) / 0.20)`}
            strokeWidth={8}
            strokeLinecap="butt"
            strokeDasharray={`${passDash} ${full}`}
            strokeDashoffset={-passOffset}
          />
        )}
        {/* Elite-zone band */}
        {eliteDash > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`hsl(var(--grade-a-glow) / 0.45)`}
            strokeWidth={8}
            strokeLinecap="butt"
            strokeDasharray={`${eliteDash} ${full}`}
            strokeDashoffset={-eliteOffset}
          />
        )}
        {/* Value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`hsl(${strokeVar})`}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${full}`}
          style={{
            filter:
              status === "elite"
                ? `drop-shadow(0 0 10px hsl(${strokeVar} / 0.85))`
                : `drop-shadow(0 0 6px hsl(${strokeVar} / 0.55))`,
          }}
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
