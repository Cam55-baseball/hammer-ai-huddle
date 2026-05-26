import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";
import { illnessCopy } from "@/lib/copy/illness";
import { illnessModulator } from "@/lib/runtime/modulators/illness";

export default function Illness() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 60, limit: 300 });
  const env = useMemo(
    () =>
      illnessModulator({
        rows,
        athleteId: user?.id ?? null,
        viewerScope: "self",
      }),
    [rows, user?.id],
  );
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={illnessCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{illnessCopy.body}</p>
          {env.ceilingKind ? (
            <div className="rounded-md border border-border bg-background/40 p-3 text-sm">
              <div className="font-medium">{illnessCopy.active}</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                {env.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{illnessCopy.none}</div>
          )}
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
