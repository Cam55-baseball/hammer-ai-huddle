import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, CircleAlert, CircleSlash, CircleHelp, CircleCheck } from "lucide-react";
import { EngineVersionBadge } from "@/components/asb/EngineVersionBadge";
import { DigestReplayCTA } from "./DigestReplayCTA";
import type { DigestProjection } from "@/lib/digest/projections";

interface Props {
  title: string;
  icon?: ReactNode;
  projection: DigestProjection;
  sentence: string;
  emphasis?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: DigestProjection["confidence"] }) {
  return (
    <Badge variant="outline" className="gap-1 font-mono text-xs">
      <Gauge className="h-3 w-3" />
      conf {confidence === "n/a" ? "n/a" : confidence}
    </Badge>
  );
}

function MissingnessBadge({ missingness }: { missingness: DigestProjection["missingness"] }) {
  const meta = {
    ok: { Icon: CircleCheck, label: "live", cls: "" },
    partial: { Icon: CircleHelp, label: "partial", cls: "text-muted-foreground" },
    stale: { Icon: CircleAlert, label: "stale", cls: "text-destructive" },
    no_signal: { Icon: CircleSlash, label: "no signal", cls: "text-muted-foreground" },
  }[missingness];
  const { Icon } = meta;
  return (
    <Badge variant="outline" className={`gap-1 font-mono text-xs ${meta.cls}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

export function DigestCardShell({ title, icon, projection, sentence, emphasis }: Props) {
  return (
    <Card className={emphasis ? "border-primary/40" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">{sentence}</p>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <ConfidenceBadge confidence={projection.confidence} />
          <MissingnessBadge missingness={projection.missingness} />
          {projection.engineVersion && (
            <EngineVersionBadge engineVersion={projection.engineVersion} />
          )}
          <div className="ml-auto">
            <DigestReplayCTA sourceEventIds={projection.sourceEventIds} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
