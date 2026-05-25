import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EngineVersionBadge } from "@/components/asb/EngineVersionBadge";
import { ConfidencePill } from "./ConfidencePill";
import { MissingnessChip } from "./MissingnessChip";
import { LineageDrilldownButton } from "./LineageDrilldownButton";
import type { CardProjection } from "@/lib/command/projections";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  projection: CardProjection<unknown>;
  loading?: boolean;
  emptyMessage?: string;
  destructive?: boolean;
  children?: ReactNode;
}

export function IntelligenceCardShell({
  title,
  subtitle,
  icon,
  projection,
  loading,
  emptyMessage = "No source event yet",
  destructive,
  children,
}: Props) {
  const hasEvent = !!projection.sourceEventId;
  return (
    <Card className={destructive ? "border-destructive/40 bg-destructive/5" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              <span className="truncate">{title}</span>
            </CardTitle>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="min-h-[64px]">
          {loading ? (
            <div className="h-16 w-full animate-pulse rounded-md bg-muted/50" />
          ) : hasEvent ? (
            children
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              {emptyMessage} — once a canonical event lands it appears here.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <ConfidencePill confidence={projection.confidence} />
          <MissingnessChip missingness={projection.missingness} />
          {projection.engineVersion && <EngineVersionBadge engineVersion={projection.engineVersion} />}
          <div className="ml-auto">
            <LineageDrilldownButton sourceEventId={projection.sourceEventId} />
          </div>
        </div>

        {projection.occurredAt && (
          <p className="text-[10px] font-mono text-muted-foreground">
            occurred_at {projection.occurredAt}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
