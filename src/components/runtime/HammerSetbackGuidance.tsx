/**
 * Hammer Wave 3 — C5 First Setback Guidance (presentation wrapper).
 *
 * Thin renderer for `resolveSetbackGuidance` output. Surfaces missingness
 * factually. Authors no copy. Renders nothing when every slot is
 * lawful-silent or safeguarding is active.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 3 Execution Package §5.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { resolveSetbackGuidance } from "@/lib/runtime/setback/resolver";
import type { SetbackStateKind } from "@/lib/runtime/setback/types";

interface Props {
  readonly state: SetbackStateKind;
  readonly safeguardingActive?: boolean;
  readonly knownSignalRefs?: ReadonlyArray<string>;
  readonly unknownSignalRefs?: ReadonlyArray<string>;
  readonly lineageHandle?: string;
}

export function HammerSetbackGuidance({
  state,
  safeguardingActive,
  knownSignalRefs,
  unknownSignalRefs,
  lineageHandle,
}: Props) {
  const identity = getHammerIdentity();
  const navigate = useNavigate();
  const result = useMemo(
    () =>
      resolveSetbackGuidance({
        state,
        safeguardingActive,
        knownSignalRefs,
        unknownSignalRefs,
        lineageHandle,
      }),
    [state, safeguardingActive, knownSignalRefs, unknownSignalRefs, lineageHandle],
  );

  const { slots, unknownSignalRefs: unknown } = result.descriptor;
  const allLawful =
    slots.entry.verdict === "lawful" &&
    slots.context.verdict === "lawful" &&
    slots.next.verdict === "lawful" &&
    slots.exit.verdict === "lawful";

  if (allLawful) return null;

  const exitRoute =
    "route" in slots.exit.handoff ? slots.exit.handoff.route : null;

  return (
    <Card className="border-muted-foreground/20 bg-card/40">
      <CardContent className="space-y-2 p-3 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {identity.organismStateLabel}
        </p>
        {unknown.length > 0 && (
          <p className="text-xs text-muted-foreground" aria-label="missingness">
            {unknown.length} signal{unknown.length === 1 ? "" : "s"} missing
          </p>
        )}
        {exitRoute && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(exitRoute)}
            className="text-xs"
          >
            Continue →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
