import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAuth } from "@/hooks/useAuth";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";
import { rtpCopy } from "@/lib/copy/rtp";
import { rtpModulator } from "@/lib/runtime/modulators/rtp";

export default function RTP() {
  const { user } = useAuth();
  const { data: rows } = useAthleteCommandRows({ days: 180, limit: 500 });
  const env = useMemo(
    () =>
      rtpModulator({
        rows,
        athleteId: user?.id ?? null,
        viewerScope: "self",
      }),
    [rows, user?.id],
  );
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={rtpCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{rtpCopy.body}</p>
          {env.notes.length === 0 ? (
            <div className="text-sm text-muted-foreground">{rtpCopy.noActive}</div>
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
