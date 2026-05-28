import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

function within(row: AsbEventRow, hours: number): boolean {
  const t = new Date(row.occurred_at).getTime();
  return Number.isFinite(t) && Date.now() - t <= hours * 3_600_000;
}

export function WeeklyDigestPreview() {
  const { data: rows, isLoading } = useAthleteCommandRows({ days: 7, limit: 200 });

  const bullets = useMemo(() => {
    if (!rows?.length) return [];
    const last7 = rows.filter((r) => within(r, 24 * 7));
    const sessions = last7.filter((r) => r.topic_id.startsWith("session.")).length;
    const checkIns = last7.filter((r) => r.topic_id.startsWith("behavioral.")).length;
    const out: string[] = [];
    out.push(`${sessions} session${sessions === 1 ? "" : "s"} this week.`);
    out.push(`${checkIns} check-in${checkIns === 1 ? "" : "s"} logged.`);
    return out;
  }, [rows]);

  return (
    <section className="rounded-2xl border-2 border-foreground/40 bg-card p-3 sm:p-4">
      <header className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground truncate">
            Weekly Recap
          </h2>
        </div>
      </header>

      {isLoading ? (
        <ul className="space-y-1.5">
          <li className="h-3 w-3/4 rounded bg-muted animate-pulse" />
          <li className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </ul>
      ) : bullets.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing logged in the last 7 days.</p>
      ) : (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="text-xs sm:text-sm text-foreground/90 leading-snug flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/digest"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        Full recap <ArrowRight className="h-3 w-3" />
      </Link>

    </section>
  );
}
