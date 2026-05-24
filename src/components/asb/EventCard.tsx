import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import { EngineVersionBadge } from "./EngineVersionBadge";
import { LineageTrace } from "./LineageTrace";
import { StateSnapshotPanel } from "./StateSnapshotPanel";

interface Props {
  event: AsbEventRow;
}

function extractConfidence(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  const c = (payload as any).confidence;
  if (typeof c === "number") return c;
  return null;
}

function extractMissingness(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const m = (payload as any).missingness;
  if (m == null) return null;
  if (typeof m === "string" || typeof m === "number") return String(m);
  try {
    return JSON.stringify(m);
  } catch {
    return null;
  }
}

export function EventCard({ event }: Props) {
  const [open, setOpen] = useState(false);
  const confidence = extractConfidence(event.payload);
  const missingness = extractMissingness(event.payload);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">{event.topic_id}</span>
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                {event.actor_role ?? "unknown"}
              </Badge>
              <EngineVersionBadge engineVersion={event.engine_version} />
              {confidence != null && (
                <Badge variant="outline" className="font-mono text-xs">
                  confidence: {confidence.toFixed(3)}
                </Badge>
              )}
              {missingness != null && (
                <Badge variant="outline" className="font-mono text-xs">
                  missingness: {missingness}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              occurred_at: {new Date(event.occurred_at).toISOString()}
              {event.effective_at && event.effective_at !== event.occurred_at && (
                <> · effective_at: {new Date(event.effective_at).toISOString()}</>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono break-all">
              event_id: {event.event_id}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Collapse lineage" : "Expand lineage"}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="ml-1 text-xs">Trace lineage</span>
          </Button>
        </div>

        {open && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">Raw payload</h4>
              <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">
                State snapshot (as_of_event_id = this event)
              </h4>
              <StateSnapshotPanel eventId={event.event_id} />
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">Lineage graph</h4>
              <LineageTrace eventId={event.event_id} />
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">Causality refs</h4>
              <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
                {JSON.stringify(event.causality_refs, null, 2)}
              </pre>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2">Lineage refs</h4>
              <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
                {JSON.stringify(event.lineage_refs, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
