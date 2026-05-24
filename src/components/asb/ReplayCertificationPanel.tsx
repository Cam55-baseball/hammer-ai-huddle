import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import { EngineVersionBadge } from "./EngineVersionBadge";
import type { ReplayCertificationData } from "@/hooks/useReplayCertification";

interface Props {
  data: ReplayCertificationData;
}

export function ReplayCertificationPanel({ data }: Props) {
  const { certification, selectedEvent, snapshot, ancestorEvents } = data;
  const verdict = certification.verdict;

  const verdictMeta = {
    certified: {
      label: "Replay-certified",
      Icon: ShieldCheck,
      cls: "bg-primary text-primary-foreground",
    },
    divergent: {
      label: "Divergent",
      Icon: AlertTriangle,
      cls: "bg-destructive text-destructive-foreground",
    },
    uncertifiable: {
      label: "Uncertifiable",
      Icon: HelpCircle,
      cls: "bg-muted text-muted-foreground",
    },
  }[verdict];

  const { Icon } = verdictMeta;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`gap-1 ${verdictMeta.cls}`}>
            <Icon className="h-3 w-3" />
            {verdictMeta.label}
          </Badge>
          <EngineVersionBadge engineVersion={selectedEvent.engine_version} />
          <Badge variant="outline" className="font-mono text-xs">
            ancestors: {ancestorEvents.length}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            snapshot: {snapshot ? snapshot.snapshot_kind : "none"}
          </Badge>
          {snapshot && snapshot.engine_version !== selectedEvent.engine_version && (
            <Badge variant="destructive" className="font-mono text-xs">
              snapshot engine: {snapshot.engine_version}
            </Badge>
          )}
        </div>

        {certification.reasons.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            {certification.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        <div className="text-[10px] text-muted-foreground font-mono break-all">
          event_id: {selectedEvent.event_id}
        </div>
      </CardContent>
    </Card>
  );
}
