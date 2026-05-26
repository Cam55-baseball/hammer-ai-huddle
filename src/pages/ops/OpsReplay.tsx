/**
 * Wave 2 — Replay audit explorer (read-only, lineage-visible).
 */
import { useEffect, useState } from "react";
import { OpsShell } from "@/components/ops/OpsShell";
import { scopedAsbEvents } from "@/lib/asb/scope/orgScope";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  event_id: string;
  topic_id: string;
  occurred_at: string;
  engine_version?: string | null;
}

export default function OpsReplay() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { data } = await scopedAsbEvents({ athleteId: uid, limit: 200 });
      setRows((data as Row[]) ?? []);
    })();
  }, []);
  return (
    <OpsShell>
      <h1 className="text-xl font-semibold mb-4">Replay Audit</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Last 200 events for the current scope. Ledger is canonical; this view
        is read-only and append-derived.
      </p>
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">occurred_at</th>
              <th className="px-3 py-2">topic_id</th>
              <th className="px-3 py-2">engine_version</th>
              <th className="px-3 py-2">event_id</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.event_id} className="border-t border-border">
                <td className="px-3 py-1 text-muted-foreground">
                  {r.occurred_at}
                </td>
                <td className="px-3 py-1">{r.topic_id}</td>
                <td className="px-3 py-1 text-muted-foreground">
                  {r.engine_version ?? "—"}
                </td>
                <td className="px-3 py-1 text-muted-foreground truncate max-w-xs">
                  {r.event_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OpsShell>
  );
}
