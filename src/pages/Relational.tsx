/**
 * Phase 152–154 — Relational substrate showcase page.
 *
 * All surfaces are pure projections over the canonical ASB ledger. No local
 * relational state; no mocks; no fabricated lineage. Demo seeding (when
 * present in the ledger) is firewalled to demo scope per Phase 151.
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

export default function Relational() {
  const { user } = useAuth();
  const { isDemo } = useDemoMode();
  const athleteId = user?.id ?? "demo-athlete";
  const scope: Scope = isDemo ? "demo" : "self";

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Relational organism
          </h1>
          <DevelopmentalStageChip athleteId={athleteId} scope={scope} />
        </header>
        <SlumpReloadFlow athleteId={athleteId} scope={scope} />
        <div className="grid gap-4 md:grid-cols-2">
          <HammerConversationPanel athleteId={athleteId} scope={scope} />
          <div className="space-y-4">
            <ParentTrustCard athleteId={athleteId} scope={scope} />
            <InjuryLifecycleStrip athleteId={athleteId} scope={scope} />
          </div>
          <RecruitingRoadmap athleteId={athleteId} scope={scope} />
          <AthleteJourneyMap athleteId={athleteId} scope={scope} />
        </div>
      </div>
    </main>
  );
}
