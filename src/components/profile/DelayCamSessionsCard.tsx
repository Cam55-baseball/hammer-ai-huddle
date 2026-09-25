import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { listRecentSessions, type SessionListRow } from "@/lib/delaycam/session/sessionStore";
import { SessionSummaryView } from "@/components/analyze/delaycam/SessionSummaryView";

/** Read-only list of the athlete's recent DelayCam sessions, with a tempo trend
 *  that only uses released metrics measured on confident reps. */
export function DelayCamSessionsCard({ userId, isStaff }: { userId: string; isStaff: boolean }) {
  const [rows, setRows] = useState<SessionListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    listRecentSessions(userId)
      .then(setRows)
      .catch((e) => setError(e?.message ?? "couldn't load sessions"));
  }, [userId]);

  const tempoTrend = (rows ?? [])
    .map((r) => r.summary?.metrics.find((m) => m.key === "tempo_sec"))
    .filter((m) => m && m.status === "measured" && (m.release === "released" || isStaff));

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" /> DelayCam sessions
      </h3>
      <p className="text-sm text-muted-foreground mb-4">Your recent recorded sessions and what we measured from them.</p>
      {error && <p className="text-sm text-destructive">Couldn't load your sessions: {error}</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No recorded sessions yet. Record one in DelayCam.</p>
      )}
      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border p-3">
              <button type="button" className="w-full text-left flex flex-wrap items-center justify-between gap-2" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="text-sm font-medium capitalize">
                  {r.module} · {new Date(r.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {r.duration_sec != null && <span>{Number(r.duration_sec).toFixed(0)}s</span>}
                  <span>{r.achieved_fps ? `${Math.round(Number(r.achieved_fps))} fps` : "fps unknown"}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.processing_state === "analyzed" ? "Measured" : r.processing_state === "failed" ? "Couldn't measure" : "Measuring"}
                  </Badge>
                </span>
              </button>
              {open === r.id && r.summary && (
                <div className="mt-3">
                  <SessionSummaryView summary={r.summary} isStaff={isStaff} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {tempoTrend.length > 1 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tempo median across sessions (newest first): {tempoTrend.map((m) => `${m!.median}s ±${m!.sd ?? 0}`).join(" · ")}
          {isStaff ? " — staff view" : ""}
        </p>
      )}
    </Card>
  );
}
