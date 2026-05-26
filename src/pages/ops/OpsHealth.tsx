/**
 * Wave 2 — Runtime health console.
 *
 * Renders telemetry derived from recent ASB events. Read-only.
 */
import { useEffect, useState } from "react";
import { OpsShell } from "@/components/ops/OpsShell";
import { scopedAsbEvents } from "@/lib/asb/scope/orgScope";
import { buildTelemetry, type OpsTelemetrySnapshot } from "@/lib/ops/telemetry";
import { buildQueueHealth, type QueueHealthSnapshot } from "@/lib/ops/queueHealth";
import { listQueue } from "@/lib/runtime/offline/eventQueue";
import { supabase } from "@/integrations/supabase/client";

export default function OpsHealth() {
  const [snap, setSnap] = useState<OpsTelemetrySnapshot | null>(null);
  const [queue, setQueue] = useState<QueueHealthSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = uid
        ? await scopedAsbEvents({ athleteId: uid, sinceIso: since })
        : { data: [] as unknown[] };
      if (cancelled) return;
      setSnap(buildTelemetry(data as never));
      const q = await listQueue();
      if (!cancelled) setQueue(buildQueueHealth(q));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OpsShell>
      <h1 className="text-xl font-semibold mb-4">Runtime Health</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric label="Events (24h)" value={snap?.totalEvents ?? "—"} />
        <Metric label="Throughput / min" value={snap?.throughputPerMin ?? "—"} />
        <Metric label="Overrides" value={snap?.overrideCount ?? "—"} />
        <Metric label="Escalations" value={snap?.escalationCount ?? "—"} />
        <Metric
          label="Avg Confidence"
          value={snap?.avgConfidence ?? "—"}
        />
        <Metric
          label="Missingness Rate"
          value={snap ? `${Math.round(snap.missingnessRate * 100)}%` : "—"}
        />
        <Metric
          label="Ingest Lag p95"
          value={snap?.ingestionLagP95Ms != null ? `${snap.ingestionLagP95Ms} ms` : "—"}
        />
        <Metric label="Queue Size" value={queue?.size ?? "—"} />
      </section>
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Top topics
        </h2>
        <ul className="divide-y divide-border border border-border rounded">
          {(snap?.topTopics ?? []).map((t) => (
            <li
              key={t.topic}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{t.topic}</span>
              <span className="tabular-nums">{t.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </OpsShell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-border rounded px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-medium tabular-nums">{value}</div>
    </div>
  );
}
