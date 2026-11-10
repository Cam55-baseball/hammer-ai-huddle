import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/hammer/context/athleteContext", () => ({ useHammerAthleteContext: () => null }));
vi.mock("@/lib/hammer/context/decisionFilters", () => ({ projectEnvelope: () => null, toEdgeFunctionPayload: () => null }));

import {
  analyzeRecoveryStatus,
  withoutStress,
  type RecoveryContext,
} from "../../../supabase/functions/recommend-workout/recoveryStatus";
import { deriveRecoveryContext } from "@/hooks/useWorkoutRecommendations";

const fine = { sleep_quality: 4, physical_readiness: 4, perceived_recovery: 8, pain_location: [], pain_scales: null };

function serverCtx(over: Partial<RecoveryContext> & { stressLevel?: unknown } = {}): RecoveryContext {
  return {
    sleepQuality: 4,
    physicalReadiness: 4,
    perceivedRecovery: 8,
    painAreas: [],
    painScales: null,
    suggestRecovery: false,
    recoveryReason: null,
    ...over,
  };
}

describe("AI workout recommendations: stress removed (owner Nov 9)", () => {
  it("stress 5 with everything else fine gives no recovery suggestion in the app", () => {
    const ctx = deriveRecoveryContext({ ...fine, stress_level: 5 } as typeof fine);
    expect(ctx.suggestRecovery).toBe(false);
    expect(ctx.recoveryReason).toBeNull();
    expect(JSON.stringify(ctx).toLowerCase()).not.toContain("stress");
  });

  it("stress 5 with everything else fine gives no recovery warning from the server", () => {
    const warning = analyzeRecoveryStatus(withoutStress(serverCtx({ stressLevel: 5 })));
    expect(warning).toBeNull();
  });

  it("an older client's stress-only reason is ignored and never reaches the AI", () => {
    const ctx = withoutStress(serverCtx({ stressLevel: 5, suggestRecovery: true, recoveryReason: "High stress levels detected" }));
    expect(ctx).toBeDefined();
    expect(ctx!.suggestRecovery).toBe(false);
    expect(ctx!.recoveryReason).toBeNull();
    expect("stressLevel" in ctx!).toBe(false);
  });

  it("a request that still includes stressLevel is accepted (other reasons kept)", () => {
    const ctx = withoutStress(serverCtx({ stressLevel: 4, perceivedRecovery: 3, suggestRecovery: true, recoveryReason: "Incomplete recovery from previous training" }));
    expect(ctx!.suggestRecovery).toBe(true);
    expect(ctx!.recoveryReason).toBe("Incomplete recovery from previous training");
    expect(analyzeRecoveryStatus(ctx)?.show).toBe(true);
  });

  it("recovery 4 warns and recovery 5 doesn't (server and app)", () => {
    expect(analyzeRecoveryStatus(serverCtx({ perceivedRecovery: 4 }))?.show).toBe(true);
    expect(analyzeRecoveryStatus(serverCtx({ perceivedRecovery: 5 }))).toBeNull();
    expect(deriveRecoveryContext({ ...fine, perceived_recovery: 4 }).suggestRecovery).toBe(true);
    expect(deriveRecoveryContext({ ...fine, perceived_recovery: 5 }).suggestRecovery).toBe(false);
  });

  it("sleep, physical readiness and pain still warn as before", () => {
    expect(analyzeRecoveryStatus(serverCtx({ sleepQuality: 1 }))?.severity).toBe("high");
    expect(analyzeRecoveryStatus(serverCtx({ physicalReadiness: 2 }))?.severity).toBe("moderate");
    expect(analyzeRecoveryStatus(serverCtx({ painAreas: ["a", "b", "c"] }))?.severity).toBe("high");
  });

  it("the AI prompt no longer has a Stress Level line and the app no longer reads stress", () => {
    const edge = readFileSync("supabase/functions/recommend-workout/index.ts", "utf8");
    expect(edge).not.toMatch(/Stress Level/);
    expect(edge).not.toMatch(/elevated stress/);
    const hook = readFileSync("src/hooks/useWorkoutRecommendations.ts", "utf8");
    expect(hook).not.toMatch(/stress_level|High stress/);
  });
});
