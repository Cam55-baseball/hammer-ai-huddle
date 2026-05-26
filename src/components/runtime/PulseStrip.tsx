import { Link } from "react-router-dom";
import { Heart, Activity, Battery } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyPrescription } from "@/lib/runtime/prescription";

function tone(state: "calm" | "watch" | "escalate" | "unknown") {
  switch (state) {
    case "calm":
      return "bg-state-calm/10 text-state-calm border-state-calm/30";
    case "watch":
      return "bg-state-watch/10 text-state-watch border-state-watch/30";
    case "escalate":
      return "bg-state-escalate/10 text-state-escalate border-state-escalate/40";
    default:
      return "bg-state-unknown/10 text-state-unknown border-state-unknown/30";
  }
}

function label(p: { value: unknown }): string {
  const v = p.value as Record<string, unknown> | null;
  if (!v) return "—";
  const score = (v as any).score;
  if (typeof score === "number") return String(Math.round(score));
  const band = (v as any).band ?? (v as any).level;
  if (typeof band === "string") return band;
  return "—";
}

/**
 * Compressed one-line pulse: readiness · fatigue · recovery. Each chip taps
 * into the existing Command surface for deeper lineage, preserving progressive
 * disclosure without bloating the daily runtime.
 */
export function PulseStrip({ rx }: { rx: DailyPrescription }) {
  const items: Array<{
    label: string;
    value: string;
    Icon: typeof Heart;
    state: "calm" | "watch" | "escalate" | "unknown";
  }> = [
    {
      label: "Readiness",
      value: label(rx.inputs.readiness),
      Icon: Heart,
      state: rx.inputs.readiness.missingness ? "unknown" : rx.state,
    },
    {
      label: "Fatigue",
      value: label(rx.inputs.fatigue),
      Icon: Activity,
      state: rx.inputs.fatigue.missingness ? "unknown" : "watch",
    },
    {
      label: "Recovery",
      value: label(rx.inputs.recovery),
      Icon: Battery,
      state: rx.inputs.recovery.missingness ? "unknown" : "calm",
    },
  ];

  return (
    <Link
      to="/command"
      className="block"
      aria-label="Open detailed organism state"
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5",
              tone(it.state),
            )}
          >
            <it.Icon className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider opacity-75">
                {it.label}
              </div>
              <div className="truncate text-base font-semibold leading-tight">
                {it.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
