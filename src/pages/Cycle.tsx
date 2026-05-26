import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";
import { cycleCopy } from "@/lib/copy/cycle";
import { pickLatest } from "@/lib/runtime/modulators/types";
import { cycleModulator } from "@/lib/runtime/modulators/cycle";

export default function Cycle() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 90, limit: 500 });
  const env = useMemo(
    () =>
      cycleModulator({
        rows,
        athleteId: user?.id ?? null,
        viewerScope: "self",
      }),
    [rows, user?.id],
  );
  const last = useMemo(() => pickLatest(rows, "cycle."), [rows]);
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard
          eyebrow={cycleCopy.privacyHeader}
          title={cycleCopy.title}
          tone="elevated"
        >
          <p className="mb-3 text-sm text-muted-foreground">{cycleCopy.bodyHelp}</p>
          {last ? (
            <div className="rounded-md border border-border bg-background/40 p-3 text-sm">
              <div className="font-medium">
                {last.topic_id.replace("cycle.", "")}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(last.occurred_at).toLocaleString()}
              </div>
              {env.notes.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                  {env.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{cycleCopy.noEntry}</div>
          )}
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
