import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import { useMemo } from "react";

const PATH = [
  { id: "foundations", title: "Foundations" },
  { id: "organism", title: "Organism literacy" },
  { id: "replay", title: "Replay & lineage" },
  { id: "translation", title: "Coaching translation" },
];

export default function CertPath() {
  const { data: rows } = useAthleteCommandRows({ days: 365, limit: 500 });
  const done = useMemo(() => {
    if (!rows) return new Set<string>();
    return new Set(
      rows
        .filter((r) => r.topic_id === "cert.module_completed")
        .map((r) => (r.payload as any)?.module as string)
        .filter(Boolean),
    );
  }, [rows]);
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title="Coach certification" tone="elevated">
          <ol className="space-y-2">
            {PATH.map((m, i) => (
              <li
                key={m.id}
                className="flex items-baseline justify-between rounded-md border border-border bg-background/40 p-3"
              >
                <span className="text-sm font-medium">
                  {i + 1}. {m.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {done.has(m.id) ? "Complete" : "Open"}
                </span>
              </li>
            ))}
          </ol>
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
