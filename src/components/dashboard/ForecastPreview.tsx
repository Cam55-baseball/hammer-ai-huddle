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
        out.push("Recovery-led next few days.");
        out.push("Quality over volume.");
        break;
      case "rest":
        out.push("Rest now, fresher push within 48h.");
        out.push("Hold the standard tomorrow.");
        break;
      case "push":
        out.push("Strong output window ahead.");
        out.push("Plan deeper recovery after.");
        break;
      case "protect":
        out.push("Smooth, controlled work coming up.");
        out.push("Ease intensity until readiness climbs.");
        break;
      default:
        out.push("Steady week ahead.");
        out.push("Small wins compound.");
    }
    return out;
  }, [rows, dayType]);

  return (
    <section className="rounded-2xl border-2 border-foreground/20 bg-card p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">
            What's Likely Next
          </h2>
        </div>
        <Link
          to="/forecast"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          See more <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      {isLoading ? (
        <div className="space-y-1.5">
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((l, i) => (
            <li key={i} className="text-xs sm:text-sm text-foreground/90 leading-snug flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
