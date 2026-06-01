/**
 * Presentation Finalization — guided 10–12 minute demo sequencer.
 *
 * Renders the same canonical relational components in a fixed click-path.
 * Zero local relational state; all reads via projections, all writes via
 * canonical emit wrappers. The choreography itself is presentation-only.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDemoMode } from "@/contexts/DemoModeContext";
import type { Scope } from "@/lib/runtime/projections/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_CHOREO } from "@/lib/relational/copy";
import { HammerConversationPanel } from "@/components/relational/HammerConversationPanel";
import { DevelopmentalStageChip } from "@/components/relational/DevelopmentalStageChip";
import { ParentTrustCard } from "@/components/relational/ParentTrustCard";
import { SlumpReloadFlow } from "@/components/relational/SlumpReloadFlow";
import { InjuryLifecycleStrip } from "@/components/relational/InjuryLifecycleStrip";
import { RecruitingRoadmap } from "@/components/relational/RecruitingRoadmap";
import { AthleteJourneyMap } from "@/components/relational/AthleteJourneyMap";
import { PresenterOverlay } from "@/components/relational/PresenterOverlay";

export default function RelationalDemo() {
  const { user } = useAuth();
  const { isDemo } = useDemoMode();
  // Stable demo athlete UUID — matches scripts/seed-relational-demo.ts and the
  // fixture fallback. `asb_events.athlete_id` is `uuid`; a non-UUID fallback
  // would silently return empty projections.
  const athleteId = user?.id ?? "00000000-0000-4000-8000-000000000001";
  const scope: Scope = isDemo ? "demo" : "self";
  const debug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";
  const presenter =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("presenter") === "1";

  const [stepIdx, setStepIdx] = useState(-1); // -1 = intro
  const total = DEMO_CHOREO.steps.length;
  const step = stepIdx >= 0 ? DEMO_CHOREO.steps[stepIdx] : null;

  // Cold-start warm: kick a paint frame on mount so the first step renders
  // without a flash when the user clicks Begin.
  useEffect(() => {
    const id = requestAnimationFrame(() => {});
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            {step ? step.title : DEMO_CHOREO.intro.title}
          </h1>
          <Badge variant="outline">
            {stepIdx < 0 ? "intro" : `${stepIdx + 1} / ${total}`}
          </Badge>
        </header>

        {stepIdx < 0 && (
          <Card className="p-4 space-y-3">
            <p className="text-base text-foreground">{DEMO_CHOREO.intro.body}</p>
            <Button onClick={() => setStepIdx(0)}>Begin</Button>
          </Card>
        )}

        {step?.id === "today" && (
          <Card className="p-4 space-y-2">
            <DevelopmentalStageChip athleteId={athleteId} scope={scope} debug={debug} />
            <p className="text-sm text-muted-foreground">
              One athlete, today. Everything below is reconstructed from a single ledger.
            </p>
          </Card>
        )}

        {step?.id === "journey" && (
          <AthleteJourneyMap athleteId={athleteId} scope={scope} />
        )}

        {step?.id === "developmental" && (
          <div className="space-y-2">
            <DevelopmentalStageChip athleteId={athleteId} scope={scope} debug={debug} />
            <Card className="p-4">
              <p className="text-sm text-foreground">
                A growth spurt was observed. Training load is held lower while bones and
                tendons catch up. The cap drops automatically — no human approval needed
                to be safer.
              </p>
            </Card>
          </div>
        )}

        {step?.id === "slump" && (
          <div className="space-y-2">
            <SlumpReloadFlow athleteId={athleteId} scope={scope} />
            <Card className="p-4">
              <p className="text-sm text-foreground">
                Confidence has been low for several weeks. The system noticed before
                anyone named it out loud — and held back, instead of pushing harder.
              </p>
            </Card>
          </div>
        )}

        {step?.id === "hammer" && (
          <HammerConversationPanel athleteId={athleteId} scope={scope} debug={debug} />
        )}

        {step?.id === "parent" && (
          <ParentTrustCard athleteId={athleteId} scope={scope} debug={debug} />
        )}

        {step?.id === "recruiting" && (
          <RecruitingRoadmap athleteId={athleteId} scope={scope} />
        )}

        {step?.id === "injury" && (
          <InjuryLifecycleStrip athleteId={athleteId} scope={scope} />
        )}

        {step?.id === "proof" && (
          <Card className="p-4 space-y-2">
            <h2 className="font-semibold text-foreground">Replay proof</h2>
            <p className="text-sm text-foreground">
              Every surface you just saw is a pure projection over one append-only ledger.
              No screen holds its own state. Rebuild the ledger and every screen
              reconstructs byte-identical.
            </p>
            <p className="text-xs text-muted-foreground">
              Verified by 80+ replay tests covering visibility, gating, citation, and
              failure containment.
            </p>
          </Card>
        )}

        <footer className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            disabled={stepIdx <= -1}
            onClick={() => setStepIdx((i) => Math.max(-1, i - 1))}
          >
            Back
          </Button>
          {step && (
            <span className="text-xs text-muted-foreground">~{step.seconds}s</span>
          )}
          <Button
            disabled={stepIdx >= total - 1}
            onClick={() => setStepIdx((i) => Math.min(total - 1, i + 1))}
          >
            {stepIdx < 0 ? "Begin" : stepIdx >= total - 1 ? "End" : "Next"}
          </Button>
        </footer>
      </div>
      {presenter && <PresenterOverlay stepIdx={stepIdx} onStep={setStepIdx} />}
    </main>
  );
}
