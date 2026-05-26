import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";
import { envCopy } from "@/lib/copy/environment";
import { environmentModulator } from "@/lib/runtime/modulators/environment";

export default function Environment() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 14, limit: 300 });
  const env = useMemo(
    () =>
      environmentModulator({
        rows,
        athleteId: user?.id ?? null,
        viewerScope: "self",
      }),
    [rows, user?.id],
  );
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={envCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{envCopy.body}</p>
          {env.notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">{envCopy.empty}</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {env.notes.map((n, i) => (
                <li key={i} className="border-l-2 border-border pl-3">{n}</li>
              ))}
            </ul>
          )}
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
