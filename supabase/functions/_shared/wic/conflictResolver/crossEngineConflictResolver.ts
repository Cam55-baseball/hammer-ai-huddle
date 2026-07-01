// Phase 11–12 — Cross-Engine Conflict Resolver
// Detects contradictions between engines and returns fatals; never silently overrides.

export interface CrossEngineRx {
  slot: string;
  movement_slug: string;
  engine?: string;
  cns_cost?: number | null;
  why_payload?: Record<string, unknown> | null;
  [k: string]: unknown;
}

export interface CrossEngineContext {
  is_game_day: boolean;
  throwing_phase?: string | null;
  cns_readiness?: number | null;
  metabolic_budget?: number | null;
}

export interface ConflictFatal {
  code: "cross_engine_conflict_detected";
  detail: string;
  engines: string[];
  slugs?: string[];
}

export interface ConflictResult {
  ok: boolean;
  resolved: CrossEngineRx[];
  fatals: ConflictFatal[];
}

function sumCnsBySlot(rxs: CrossEngineRx[], slots: string[]): number {
  return rxs.filter((r) => slots.includes(r.slot))
    .reduce((acc, r) => acc + (Number(r.cns_cost) || 0), 0);
}

export function resolveCrossEngineConflicts(
  rxs: CrossEngineRx[],
  ctx: CrossEngineContext,
): ConflictResult {
  const fatals: ConflictFatal[] = [];

  // 1) Conflicting metabolic loads: conditioning + recovery both prescribed at high CNS.
  const condCns = sumCnsBySlot(rxs, ["conditioning"]);
  const recCns = sumCnsBySlot(rxs, ["recovery"]);
  if (condCns > 0 && recCns > 0 && condCns + recCns > (ctx.metabolic_budget ?? 100)) {
    fatals.push({
      code: "cross_engine_conflict_detected",
      detail: `conditioning+recovery CNS cost ${condCns + recCns} exceeds budget ${ctx.metabolic_budget ?? 100}`,
      engines: ["conditioning", "recovery"],
    });
  }

  // 2) Arm care vs throwing phase mismatch.
  if (ctx.throwing_phase) {
    for (const r of rxs.filter((x) => x.slot === "arm_care")) {
      const wp = (r.why_payload ?? {}) as Record<string, unknown>;
      const phase = (wp.throwing_phase as string) ?? null;
      if (phase && phase !== ctx.throwing_phase) {
        fatals.push({
          code: "cross_engine_conflict_detected",
          detail: `arm_care movement throwing_phase=${phase} conflicts with ctx.throwing_phase=${ctx.throwing_phase}`,
          engines: ["arm_care"],
          slugs: [r.movement_slug],
        });
      }
    }
  }

  // 3) Cross-sport illegal transfer during game day.
  if (ctx.is_game_day) {
    for (const r of rxs.filter((x) => x.slot === "cross_sport")) {
      const wp = (r.why_payload ?? {}) as Record<string, unknown>;
      const placement = (wp.placement as string) ?? "";
      if (placement !== "early_activation") {
        fatals.push({
          code: "cross_engine_conflict_detected",
          detail: `cross_sport ${r.movement_slug} on game day must be early_activation (got=${placement || "unspecified"})`,
          engines: ["cross_sport"],
          slugs: [r.movement_slug],
        });
      }
    }
  }

  // 4) Fatigue–readiness contradiction: low readiness but heavy prescriptions.
  const heavyCns = sumCnsBySlot(rxs, ["lift", "speed", "bat_speed", "conditioning"]);
  if (typeof ctx.cns_readiness === "number" && ctx.cns_readiness < 0.4 && heavyCns > 60) {
    fatals.push({
      code: "cross_engine_conflict_detected",
      detail: `cns_readiness=${ctx.cns_readiness} contradicts heavy CNS load ${heavyCns}`,
      engines: ["lift", "speed", "bat_speed", "conditioning"],
    });
  }

  return { ok: fatals.length === 0, resolved: rxs, fatals };
}
