/**
 * Phase 152–154 — Relational substrate showcase page.
 *
 * All surfaces are pure projections over the canonical ASB ledger. No local
 * relational state; no mocks; no fabricated lineage. Demo seeding (when
 * present in the ledger) is firewalled to demo scope per Phase 151.
 *
 * G2 remediation — additive mount of the already-ratified Wave 4
 * `HammerParentVoice` on post-accept parent surfaces. `ParentStateKind`
 * is derived purely from replay-derived projection state (RR-6 injury,
 * RR-8 life context). Interpretive overlay only; never authors organism
 * truth, athlete_intent, authority_override, hard_stop, or
 * rehabilitation_state. Onboarding / setback branches remain reachable
 * only from their owning surfaces, which supply the required resolver
 * inputs.
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
import { HammerParentVoice } from "@/components/parent/HammerParentVoice";
import {
  useInjuryRecoveryState,
  useLifeContextState,
} from "@/hooks/useRelationalProjections";
import type {
  ParentInput,
  ParentStateKind,
} from "@/lib/runtime/parent/types";

function deriveParentState(
  injury: ReturnType<typeof useInjuryRecoveryState>,
  life: ReturnType<typeof useLifeContextState>,
): {
  state: ParentStateKind;
  safeguardingActive: boolean;
  unknownSignalRefs: string[];
} {
  const injuryState = injury?.state;
  const lifeState = life?.state;

  const safeguardingActive =
    Boolean(injuryState?.safeguardingHeld) ||
    Boolean(lifeState?.safeguardingHeld);

  const unknownSignalRefs = [
    ...(injuryState?.missingness?.fields ?? []),
    ...(lifeState?.missingness?.fields ?? []),
  ];

  const inActiveRecovery = Object.values(
    injuryState?.activeRecoveryState ?? {},
  ).some((r) => !r.rtp_authorized);

  let state: ParentStateKind = "accepted-active-athlete";
  if (inActiveRecovery) {
    state = "accepted-recovery-state";
  } else if (unknownSignalRefs.length > 0) {
    state = "accepted-missingness-state";
  }

  return { state, safeguardingActive, unknownSignalRefs };
}

export default function Relational() {
  const { user } = useAuth();
  const { isDemo } = useDemoMode();
  const athleteId = user?.id ?? "demo-athlete";
  const scope: Scope = isDemo ? "demo" : "self";

  const injury = useInjuryRecoveryState(athleteId, scope);
  const life = useLifeContextState(athleteId, scope);

  const { state, safeguardingActive, unknownSignalRefs } = deriveParentState(
    injury,
    life,
  );

  const parentInput: ParentInput = {
    state,
    safeguardingActive,
    unknownSignalRefs,
  };

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

        {/* G2 — Parent Voice mounted on post-accept parent surface.
            Renders nothing when all slots are lawful-silent. */}
        <HammerParentVoice input={parentInput} />

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
