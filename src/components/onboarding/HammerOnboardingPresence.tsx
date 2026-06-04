/**
 * Hammer Wave 3 — C3 Onboarding Presence (presentation wrapper).
 *
 * Thin renderer for `resolveOnboardingPresence` output. Authors no copy.
 * Labels resolve through `getHammerIdentity()`. Renders nothing when every
 * slot is lawful-silent.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 3 Execution Package §4.
 */
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { resolveOnboardingPresence } from "@/lib/runtime/onboarding/resolver";
import type { OnboardingStateKind } from "@/lib/runtime/onboarding/types";

interface Props {
  readonly state: OnboardingStateKind;
  readonly safeguardingActive?: boolean;
  readonly contextSummaryRefs?: ReadonlyArray<string>;
  readonly lineageHandle?: string;
}

export function HammerOnboardingPresence({
  state,
  safeguardingActive,
  contextSummaryRefs,
  lineageHandle,
}: Props) {
  const identity = getHammerIdentity();
  const result = useMemo(
    () =>
      resolveOnboardingPresence({
        state,
        safeguardingActive,
        contextSummaryRefs,
        lineageHandle,
      }),
    [state, safeguardingActive, contextSummaryRefs, lineageHandle],
  );

  const { slots } = result.descriptor;
  const allLawful =
    slots.entry.verdict === "lawful" &&
    slots.context.verdict === "lawful" &&
    slots.next.verdict === "lawful" &&
    slots.exit.verdict === "lawful";

  if (allLawful) return null;

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardContent className="space-y-2 p-3 sm:p-4">
        {slots.entry.verdict !== "lawful" && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {identity.organismStateLabel}
          </p>
        )}
        {slots.context.verdict !== "lawful" &&
          slots.context.summaryRefs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {slots.context.summaryRefs.length} signal
              {slots.context.summaryRefs.length === 1 ? "" : "s"} on file
            </p>
          )}
      </CardContent>
    </Card>
  );
}
