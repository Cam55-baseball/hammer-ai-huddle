import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ConfidencePill } from "./ConfidencePill";
import { MissingnessChip } from "./MissingnessChip";
import { LineageDrilldownButton } from "./LineageDrilldownButton";
import type { CardProjection } from "@/lib/command/projections";

export interface CardAction {
  /** Athlete-legible CTA copy. */
  label: string;
  /** Internal route or anchor (e.g. "/command#hammer-plan-strength"). */
  href: string;
}

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  projection: CardProjection<unknown>;
  loading?: boolean;
  emptyMessage?: string;
  destructive?: boolean;
  /**
   * Optional "What now?" affordance. Card observation surfaces own this slot
   * so the athlete always has a path back into the action surface (the daily
   * plan). RFL-068 / Command Center Authority Restoration Sprint §A.
   */
  action?: CardAction | null;
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
  action,
  children,
}: Props) {
  const hasEvent = !!projection.sourceEventId;
  return (
    <Card
      className={
        "transition-colors duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 " +
        (destructive ? "border-destructive/40 bg-destructive/5" : "")
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              <span className="truncate">{title}</span>
            </CardTitle>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="min-h-[64px]">
          {loading ? (
            <div className="h-16 w-full animate-pulse rounded-md bg-muted/40" />
          ) : hasEvent ? (
            children
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              {emptyMessage || "Not enough info yet"}
            </div>
          )}
        </div>

        {action && hasEvent && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            <Link to={action.href} aria-label={action.label}>
              <span>{action.label}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}

        <div
          className="flex min-h-11 flex-wrap items-center gap-2 border-t pt-3"
          title={projection.engineVersion ? `engine ${projection.engineVersion}${projection.occurredAt ? ` · ${projection.occurredAt}` : ""}` : undefined}
        >
          <ConfidencePill confidence={projection.confidence} />
          <MissingnessChip missingness={projection.missingness} />
          <div className="ml-auto">
            <LineageDrilldownButton sourceEventId={projection.sourceEventId} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
