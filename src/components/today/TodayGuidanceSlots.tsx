/**
 * Wave 2 — C2 Today Presence (presentation wrapper).
 *
 * Thin renderer for `resolveGuidanceSlots` output. Authors no copy: labels
 * resolve through `getHammerIdentity()`; context references are opaque
 * projection ids; next-action mirrors `useNextAction()`; exit delegates
 * to C6 handoff. Renders nothing in lawful-silence verdicts.
 *
 * Constitutional subordination: Eternal Laws · Megaphase 151–160 ·
 * RR-5 · RR-6 · RR-8 · Wave 1 Ratified · Wave 2 Execution Package §4.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { resolveGuidanceSlots } from "@/lib/runtime/guidance/slots";
import { useNextAction } from "@/hooks/useNextAction";
import { useHammerState } from "@/hooks/useHammerState";
import { isLawfulDestination } from "@/lib/runtime/handoff/destinations";
import type { LawfulDestination } from "@/lib/runtime/handoff/types";
import type { GuidanceSlotsInput } from "@/lib/runtime/guidance/types";

interface Props {
  latestPrescriptionEventId: string | null;
  hasSignal: boolean;
}

export function TodayGuidanceSlots({ latestPrescriptionEventId, hasSignal }: Props) {
  const identity = getHammerIdentity();
  const next = useNextAction();
  const { snapshot, loading } = useHammerState();

  const slots = useMemo(() => {
    if (loading) {
      const lawful = { kind: "route-not-yet-rendered" as const };
      const inputs: GuidanceSlotsInput = {
        entryZone: lawful,
        contextZone: lawful,
        contextSummaryRefs: [],
        nextZone: lawful,
        nextAction: { route: null, ctaLabelRef: null, moduleHint: null },
        exitZone: lawful,
        exitHandoff: null,
      };
      return resolveGuidanceSlots(inputs);
    }

    const contextKind = hasSignal
      ? "unpopulated-surface-with-signal"
      : "unpopulated-surface-no-signal";
    const entryKind = snapshot ? "unpopulated-surface-with-signal" : "awaiting-input";
    const nextKind = "unpopulated-surface-with-signal" as const;
    const exitKind = "unpopulated-surface-with-signal" as const;

    const candidate: LawfulDestination | null = isLawfulDestination(next.route)
      ? (next.route as LawfulDestination)
      : null;

    const inputs: GuidanceSlotsInput = {
      entryZone: { kind: entryKind },
      contextZone: { kind: contextKind },
      contextSummaryRefs: latestPrescriptionEventId
        ? [`proj:prescription.daily.rendered:${latestPrescriptionEventId}`]
        : [],
      nextZone: { kind: nextKind },
      nextAction: {
        route: next.route,
        ctaLabelRef: next.ctaLabel,
        moduleHint: next.moduleHint,
      },
      exitZone: { kind: exitKind },
      exitHandoff: candidate
        ? {
            candidate,
            reasonKey: "practice.window_active",
            lineageHandle: latestPrescriptionEventId
              ? `ledger:evt:${latestPrescriptionEventId}`
              : "ledger:evt:unknown",
            zone: { kind: exitKind },
          }
        : null,
    };
    return resolveGuidanceSlots(inputs);
  }, [loading, snapshot, hasSignal, latestPrescriptionEventId, next.route, next.ctaLabel, next.moduleHint]);

  const navigate = useNavigate();

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
        {slots.context.verdict !== "lawful" && slots.context.summaryRefs.length > 0 && (
          <p className="text-xs text-muted-foreground" aria-label="context-refs">
            {slots.context.summaryRefs.length} signal{slots.context.summaryRefs.length === 1 ? "" : "s"} on file
          </p>
        )}
        {slots.next.verdict !== "lawful" && slots.next.route && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{next.label}</span>
            <Button size="sm" variant="outline" onClick={() => navigate(slots.next.route!)} className="text-xs">
              {slots.next.ctaLabelRef ?? next.ctaLabel}
            </Button>
          </div>
        )}
        {slots.exit.verdict !== "lawful" && "route" in slots.exit.handoff && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(slots.exit.handoff && "route" in slots.exit.handoff ? slots.exit.handoff.route : "/")}
            className="text-xs"
          >
            Continue →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
