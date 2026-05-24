import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReplayCertificationData } from "@/hooks/useReplayCertification";

interface Props {
  data: ReplayCertificationData;
}

export function ReplayInputChain({ data }: Props) {
  const items = [
    ...data.ancestorEvents.map((a, i) => ({
      role: `ancestor[${i}]` as const,
      event: a,
    })),
    { role: "self" as const, event: data.selectedEvent },
  ];

  return (
    <div className="space-y-3">
      {items.length === 1 && (
        <div className="text-xs text-muted-foreground">
          No lineage ancestors — re-derivation chain contains only the selected
          event payload.
        </div>
      )}
      {items.map((item, idx) => (
        <Card key={`${item.event.event_id}-${idx}`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {item.role}
              </Badge>
              <span className="font-mono text-xs">{item.event.topic_id}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {item.event.actor_role}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                engine {item.event.engine_version}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              occurred_at: {new Date(item.event.occurred_at).toISOString()}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono break-all">
              event_id: {item.event.event_id}
            </div>
            <pre className="text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap break-all bg-muted p-2 rounded border border-border">
              {JSON.stringify(item.event.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
