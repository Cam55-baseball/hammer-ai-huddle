/**
 * Phase 152–154 — Relational substrate showcase page.
 *
 * All surfaces are pure projections over the canonical ASB ledger. No local
 * relational state; no mocks; no fabricated lineage. Demo seeding (when
 * present in the ledger) is firewalled to demo scope per Phase 151.
 *
 * Phase C humanization: single-column on mobile, calmer title, ordered
 * by emotional weight (check-in → conversation → protection → history).
 */
import { useAuth } from "@/hooks/useAuth";
import type { Scope } from "@/lib/runtime/projections/types";
import { HammerConversationPanel } from "@/components/relational/HammerConversationPanel";
import { DevelopmentalStageChip } from "@/components/relational/DevelopmentalStageChip";
import { ParentTrustCard } from "@/components/relational/ParentTrustCard";
import { SlumpReloadFlow } from "@/components/relational/SlumpReloadFlow";
import { InjuryLifecycleStrip } from "@/components/relational/InjuryLifecycleStrip";
import { RecruitingRoadmap } from "@/components/relational/RecruitingRoadmap";
import { AthleteJourneyMap } from "@/components/relational/AthleteJourneyMap";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { RELATIONAL_PAGE_VOICE } from "@/lib/relational/copy";

export default function Relational() {
  const { user } = useAuth();
  const { isDemo } = useDemoMode();
  const athleteId = user?.id ?? "demo-athlete";
  const scope: Scope = isDemo ? "demo" : "self";

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {RELATIONAL_PAGE_VOICE.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {RELATIONAL_PAGE_VOICE.subtitle}
              </p>
            </div>
            <DevelopmentalStageChip athleteId={athleteId} scope={scope} />
          </div>
        </header>

        {/* Emotional weight order: check-in first, then conversation,
            then protection signals, then history. */}
        <SlumpReloadFlow athleteId={athleteId} scope={scope} />

        <HammerConversationPanel athleteId={athleteId} scope={scope} />

        <ParentTrustCard athleteId={athleteId} scope={scope} />

        <RecruitingRoadmap athleteId={athleteId} scope={scope} />

        <InjuryLifecycleStrip athleteId={athleteId} scope={scope} />

        <AthleteJourneyMap athleteId={athleteId} scope={scope} />
      </div>
    </main>
  );
}
