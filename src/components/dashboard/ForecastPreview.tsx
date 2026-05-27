import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useDayState } from "@/hooks/useDayState";
import { deriveTodaysStandard } from "@/lib/standard/todaysStandard";

export function ForecastPreview() {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 14, limit: 300 });
  const { dayType } = useDayState();

  const lines = useMemo(() => {
    const standard = deriveTodaysStandard(rows, dayType);
    const out: string[] = [];
    switch (standard.tone) {
      case "recover":
        out.push("Next 3 days look recovery-led — protect sleep and hydration.");
        out.push("Expect lighter sessions; quality over volume.");
        break;
      case "rest":
        out.push("Today is rest. Expect a fresher push within 48 hours.");
        out.push("Hold the standard tomorrow to stack the rebound.");
        break;
      case "push":
        out.push("Strong window ahead — your body is set up for output.");
        out.push("Plan a deeper recovery 24h after your hardest session.");
        break;
      case "protect":
        out.push("Next couple of days favor smooth, controlled work.");
        out.push("Ease intensity until readiness climbs again.");
        break;
      default:
        out.push("Steady week ahead — consistency is your best lever.");
        out.push("Watch for small wins; they compound across the month.");
    }
    return out;
  }, [rows, dayType]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground">
            What's Likely Next
          </h2>
        </div>
        <Link
          to="/forecast"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open forecast <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <ul className="space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="text-sm text-foreground/90 leading-relaxed flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
