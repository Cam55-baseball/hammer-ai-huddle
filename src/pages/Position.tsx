import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";
import { positionCopy } from "@/lib/copy/position";
import { positionModulator } from "@/lib/runtime/modulators/position";

export default function Position() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 180, limit: 500 });
  const env = useMemo(
    () =>
      positionModulator({
        rows,
        athleteId: user?.id ?? null,
        viewerScope: "self",
        ageBand: "hs",
      }),
    [rows, user?.id],
  );
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={positionCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{positionCopy.body}</p>
          {env.notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">{positionCopy.empty}</div>
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
