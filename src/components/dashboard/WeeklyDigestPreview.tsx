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
    const recoveries = last7.filter(
      (r) =>
        r.topic_id.startsWith("foundation.recovery") ||
        r.topic_id.startsWith("behavioral.recovery"),
    ).length;
    const out: string[] = [];
    out.push(`${sessions} training session${sessions === 1 ? "" : "s"} logged this week.`);
    out.push(`${checkIns} daily check-in${checkIns === 1 ? "" : "s"} captured.`);
    out.push(`${recoveries} recovery signal${recoveries === 1 ? "" : "s"} on record.`);
    return out;
  }, [rows]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-[11px] font-black uppercase tracking-[0.22em] text-foreground">
            Weekly Recap
          </h2>
        </div>
        <Link
          to="/digest"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Open weekly digest <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      {isLoading ? (
        <ul className="space-y-2">
          <li className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <li className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <li className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        </ul>
      ) : bullets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing logged in the last 7 days yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm text-foreground/90 leading-relaxed flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
