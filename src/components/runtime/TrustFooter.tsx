import { ConfidencePill } from "@/components/command/ConfidencePill";
import { MissingnessChip } from "@/components/command/MissingnessChip";
import { LineageDrilldownButton } from "@/components/command/LineageDrilldownButton";
import type { Missingness } from "@/lib/command/projections";

/**
 * Single shared trust strip rendered at the bottom of every visible runtime
 * card. Answers "why / what / how reliable" in one tap, every time. Engine
 * version is exposed inline so replay validity is never opaque.
 */
export function TrustFooter({
  confidence,
  missingness,
  sourceEventId,
  engineVersion,
  occurredAt,
}: {
  confidence: number | null;
  missingness: Missingness;
  sourceEventId: string | null;
  engineVersion?: string | null;
  occurredAt?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ConfidencePill confidence={confidence} />
        <MissingnessChip missingness={missingness} />
        {engineVersion ? (
          <span className="font-mono text-[10px] text-muted-foreground">
            {engineVersion}
          </span>
        ) : null}
        {occurredAt ? (
          <span className="text-[10px] text-muted-foreground">
            {new Date(occurredAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>
      <LineageDrilldownButton sourceEventId={sourceEventId} />
    </div>
  );
}
