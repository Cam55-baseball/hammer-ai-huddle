import { DashboardLayout } from "@/components/DashboardLayout";
import { RuntimeCard } from "@/components/runtime/RuntimeCard";
import { educationCopy } from "@/lib/copy/education";

const MODULES = [
  { id: "readiness", title: "What readiness means", audience: educationCopy.athletes },
  { id: "fatigue", title: "Fatigue, in plain language", audience: educationCopy.athletes },
  { id: "confidence", title: "How we show uncertainty", audience: educationCopy.families },
  { id: "replay", title: "Why replay matters", audience: educationCopy.coaches },
  { id: "lineage", title: "Reading the lineage trail", audience: educationCopy.coaches },
];

export default function EducationHub() {
  return (
    <DashboardLayout>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <RuntimeCard title={educationCopy.title} tone="elevated">
          <p className="mb-3 text-sm text-muted-foreground">{educationCopy.body}</p>
          <ul className="space-y-2">
            {MODULES.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border bg-background/40 p-3"
              >
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.audience}</div>
              </li>
            ))}
          </ul>
        </RuntimeCard>
      </main>
    </DashboardLayout>
  );
}
