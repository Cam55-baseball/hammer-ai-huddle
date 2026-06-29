/**
 * GpInGameAdvisoryStrip — surfaces last-7d game-performance advisories
 * inside the Hammer daily plan. Renders nothing when no signal is ready.
 *
 * Read-only projection over `useGpSignal`. Never authors organism truth;
 * always additive. Tap-through deep-links into the game reports.
 */
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useGpSignal } from "@/hooks/useGpSignal";

export function GpInGameAdvisoryStrip() {
  const signal = useGpSignal(7);
  const navigate = useNavigate();

  if (signal.loading || signal.advisories.length === 0) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/games/reports")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate("/games/reports");
      }}
      className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 cursor-pointer hover:bg-primary/10 transition-colors"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Trophy className="h-3.5 w-3.5" />
        From your last {signal.windowDays} days of games
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {signal.advisories.slice(0, 3).map((a, i) => (
          <li key={i} className="text-[11px] text-muted-foreground leading-snug">
            • {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
