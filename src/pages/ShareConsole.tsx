import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { shareCopy } from "@/lib/copy/share";
import { useMemo } from "react";

export default function ShareConsole() {
  const { data: rows } = useAthleteCommandRows({ days: 365, limit: 500 });
  const scope = useMemo(() => {
    if (!rows) return null;
    const latest = rows
      .filter((r) => r.topic_id === "share.scope_changed")
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
    return (latest?.payload as any)?.scope as string | undefined;
  }, [rows]);
  const exports = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => r.topic_id === "share.export_generated")
        .slice(0, 5),
    [rows],
  );
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={shareCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{shareCopy.body}</p>
          <div className="mb-3 text-sm">
            <span className="text-muted-foreground">{shareCopy.scopeLabel}: </span>
            <span className="font-medium">{scope ?? "private"}</span>
          </div>
          {exports.length === 0 ? (
            <div className="text-sm text-muted-foreground">{shareCopy.none}</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {exports.map((e) => (
                <li
                  key={e.event_id}
                  className="border-l-2 border-border pl-3 font-mono text-xs text-muted-foreground"
                >
                  {new Date(e.occurred_at).toLocaleString()} — {e.event_id.slice(0, 8)}
                </li>
              ))}
            </ul>
          )}
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
