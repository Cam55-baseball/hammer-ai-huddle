/**
 * useWkDailyPrescriptions — fetch + lazy-generate today's elite Lift/Speed plan.
 *
 * Reads from `wk_prescriptions`. If the user has no rows for `planDate`, it
 * invokes the `wk-generate-daily` edge function to produce them, then refetches.
 *
 * Elite hardening:
 *   - 30s timeout on invoke
 *   - one automatic retry with backoff
 *   - explicit `failed` state + manual `retry()` so the user is never stuck
 *   - threads most recent recovery ack (sleep/soreness/readiness) into the
 *     edge function so the plan actually adapts day-to-day
 *   - computes `effectiveCnsTotal` from `status` (skipped → 0 CNS) so the
 *     CNS-heavy clamp reflects what the athlete actually did
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { useSideContext } from "@/contexts/SideContext";
import { toast } from "sonner";
import type { TrainingContext } from "@/lib/wic/trainingContext";
import type { AthleteContext } from "@/lib/wic/athleteContext";
import type { PersonalizationContext } from "@/lib/wic/personalizationContext";
import type { TrainingAgeContext } from "@/lib/wic/trainingAge";
import { resolveWkPhase } from "@/lib/hammer/workout/phaseQuarter";

const WK_GENERATOR_VERSION = "wic_v1.1";

export type WkSlot = "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental";

export type WkSequenceRole =
  | "arm_care"
  | "trunk_primer"
  | "compound_lower"
  | "unilateral_lower"
  | "upper_push"
  | "upper_pull"
  | "carry_antirotation"
  | "trunk_finisher"
  | "supplemental"
  | "speed"
  | "bat_speed"
  | "conditioning"
  | "cross_sport";

export interface WkRx {
  id: string;
  plan_date: string;
  slot: WkSlot;
  sequence_order: number;
  sequence_role: WkSequenceRole | null;
  movement_slug: string;
  movement_name: string;
  phase: string;
  sets: number | null;
  reps: number | null;
  tempo: string | null;
  load_pct: number | null;
  duration_seconds: number | null;
  distance_feet: number | null;
  total_reps: number | null;
  dosage_unit: string | null;
  cns_cost: number;
  cns_clamped: boolean;
  substituted_from_slug: string | null;
  substitution_reason: string | null;
  rationale: string | null;
  why_payload: {
    phase?: string;
    phase_display?: string;
    why?: string;
    cue?: string;
    rep_rule?: string;
    sequencing_hint?: string;
    placement?: string;
    generator_version?: string;
    game_day?: boolean;
    reductions?: { reason: string; detail: string }[];
    training_age_years?: number;
    is_pro_prospect?: boolean;
    intensity_class?: string;
    source_philosophy?: string;
    override?: { reason: string | null; actor_role: string; expires_at: string } | null;
    training_context?: TrainingContext | null;
    athlete_context?: AthleteContext | null;
    personalization_context?: PersonalizationContext | null;
    training_age_context?: TrainingAgeContext | null;
  };
  // WIC constitutional fields
  adaptation?: string | null;
  engine?: string | null;
  why_v2?: {
    why_today?: string;
    why_athlete?: string;
    why_exercise?: string;
    why_volume?: string;
    why_order?: string;
    why_recovery?: string;
  } | null;
  status: "planned" | "completed" | "skipped";
}

const LIFT_ROLE_ORDER: WkSequenceRole[] = [
  "arm_care",
  "trunk_primer",
  "compound_lower",
  "unilateral_lower",
  "upper_push",
  "upper_pull",
  "carry_antirotation",
  "trunk_finisher",
  "supplemental",
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export type WkFailureReason = {
  code: string | null;
  title: string | null;
  detail: string | null;
  missingFields: string[];
  engineFailures: Record<string, string[]>;
} | null;

export function useWkDailyPrescriptions(planDate: string = todayStr()) {
  const { user } = useAuth();
  const season = useSeasonStatus();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<WkFailureReason>(null);
  const autoTriedKey = useRef<string | null>(null);
  const sideCtx = useSideContext();
  const sideHit = sideCtx.selectedSide?.hit;
  const sideThrow = sideCtx.selectedSide?.throw;

  const canonicalPhase = useMemo(() => resolveWkPhase({
    season_status: season.seasonStatus,
    preseason_start_date: season.preseasonStartDate,
    preseason_end_date: season.preseasonEndDate,
    in_season_start_date: season.inSeasonStartDate,
    in_season_end_date: season.inSeasonEndDate,
    post_season_start_date: season.postSeasonStartDate,
    post_season_end_date: season.postSeasonEndDate,
  }), [
    season.seasonStatus,
    season.preseasonStartDate,
    season.preseasonEndDate,
    season.inSeasonStartDate,
    season.inSeasonEndDate,
    season.postSeasonStartDate,
    season.postSeasonEndDate,
  ]);

  const query = useQuery({
    queryKey: ["wk-rx", user?.id, planDate],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_prescriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("plan_date", planDate)
        .order("sequence_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WkRx[];
    },
    staleTime: 60_000,
  });

  const gameDayQuery = useQuery({
    queryKey: ["wk-rx-game-day", user?.id, planDate],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_games")
        .select("id")
        .eq("user_id", user!.id)
        .eq("game_date", planDate)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  // Phase 3 — practice-day awareness (mirrors the generator's query so the
  // client-side dayKind cannot drift from what the server prescribed against).
  const practiceDayQuery = useQuery({
    queryKey: ["wk-rx-practice-day", user?.id, planDate],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scheduled_practice_sessions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("session_date", planDate)
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  const invokeOnce = useCallback(async () => {
    // Pull the most recent recovery ack so the edge function can bias the
    // next plan (real learning loop instead of one-way personalization).
    const { data: lastAck } = await supabase
      .from("wk_recovery_acks" as any)
      .select("reduction_reason, reduction_payload, acknowledged_at")
      .eq("user_id", user!.id)
      .order("acknowledged_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return withTimeout(
      supabase.functions.invoke("wk-generate-daily", {
        body: {
          plan_date: planDate,
          side_hit: sideHit,
          side_throw: sideThrow,
          recent_ack: lastAck ?? null,
        },
      }),
      30_000,
      "wk-generate-daily",
    );
  }, [user, planDate, sideHit, sideThrow]);

  // Phase 2 Fix 3 — stable generate identity + in-flight lock.
  // Using a ref instead of state removes `generating` from the callback deps,
  // so the identity of `generate` no longer flips every time we start/finish.
  // Any second concurrent call while the first is in-flight is a no-op.
  const inFlightRef = useRef(false);
  const generate = useCallback(async () => {
    if (!user?.id) return;
    if (inFlightRef.current) {
      console.debug("[wk-generate-daily] skipped — already in flight");
      return;
    }
    inFlightRef.current = true;
    setGenerating(true);
    setFailed(false);
    setFailureReason(null);
    const started = Date.now();
    try {
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { error } = await invokeOnce();
          if (error) throw error;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
      if (lastErr) throw lastErr;
      console.debug("[wk-generate-daily] ok", { ms: Date.now() - started });
      await qc.invalidateQueries({ queryKey: ["wk-rx", user.id, planDate] });
    } catch (e: any) {
      console.warn("wk-generate-daily failed (after retry)", e);
      // Parse the structured error body the edge function returns so cards
      // can show the *actual* reason instead of a bare "Retry" button.
      let parsed: WkFailureReason = null;
      try {
        const ctx = e?.context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.clone().json();
          const engineFailures: Record<string, string[]> = {};
          const rawEngines = body?.engine_failures ?? body?.validator_report?.engine_failures ?? {};
          for (const [k, v] of Object.entries(rawEngines)) {
            if (Array.isArray(v)) engineFailures[k] = v.map(String);
          }
          parsed = {
            code: body?.error ?? null,
            title: body?.title ?? null,
            detail: body?.detail ?? body?.message ?? null,
            missingFields: Array.isArray(body?.missing_context_fields)
              ? body.missing_context_fields.map(String)
              : Array.isArray(body?.validator_report?.missing_context_fields)
                ? body.validator_report.missing_context_fields.map(String)
                : [],
            engineFailures,
          };
        }
      } catch {
        /* body not JSON — leave parsed null */
      }
      setFailureReason(parsed);
      setFailed(true);
      toast.error(
        parsed?.detail ?? parsed?.title ?? "Today's plan couldn't publish — tap Retry.",
        { id: "wk-generate-failed" },
      );
    } finally {
      inFlightRef.current = false;
      setGenerating(false);
    }
  }, [user?.id, planDate, qc, invokeOnce]);

  // Auto-generate exactly once per mount if empty.
  useEffect(() => {
    const first = query.data?.[0];
    const staleVersion = !!first && first.why_payload?.generator_version !== WK_GENERATOR_VERSION;
    const isGameDayForPlan = gameDayQuery.data ?? false;
    const staleGameDay = !!first && typeof first.why_payload?.game_day === "boolean" && first.why_payload.game_day !== isGameDayForPlan;
    const expectedPhase = canonicalPhase.phase;
    const stalePhase =
      !!first &&
      !season.isLoading &&
      (query.data ?? []).some((rx) => {
        const storedPhase = rx.why_payload?.phase ?? rx.phase ?? null;
        return !!storedPhase && storedPhase !== expectedPhase;
      });
    const refreshKey = !query.data
      ? null
      : query.data.length === 0
        ? "empty"
        : staleVersion
          ? `version:${first?.why_payload?.generator_version ?? "missing"}`
          : staleGameDay
            ? `game:${String(first?.why_payload?.game_day)}->${String(isGameDayForPlan)}`
            : stalePhase
              ? `phase:${first?.why_payload?.phase ?? first?.phase ?? "missing"}->${expectedPhase}`
              : null;
    if (
      !query.isLoading &&
      !gameDayQuery.isLoading &&
      !season.isLoading &&
      refreshKey &&
      !generating &&
      !failed &&
      autoTriedKey.current !== refreshKey
    ) {
      autoTriedKey.current = refreshKey;
      generate();
    }
  }, [query.isLoading, query.data, gameDayQuery.isLoading, gameDayQuery.data, canonicalPhase.phase, season.isLoading, generate, generating, failed]);

  const retry = useCallback(() => {
    autoTriedKey.current = null;
    setFailed(false);
    generate();
  }, [generate]);

  const grouped = useMemo(() => {
    const rxs = query.data ?? [];
    const byRoleOrder = (a: WkRx, b: WkRx) => {
      const ai = a.sequence_role ? LIFT_ROLE_ORDER.indexOf(a.sequence_role) : 999;
      const bi = b.sequence_role ? LIFT_ROLE_ORDER.indexOf(b.sequence_role) : 999;
      if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.sequence_order - b.sequence_order;
    };
    return {
      // Legacy buckets (kept for anything still importing them)
      lift: rxs.filter((r) => r.slot === "lift").sort(byRoleOrder),
      supplemental: rxs.filter((r) => r.slot === "supplemental"),
      speed: rxs.filter((r) => r.slot === "speed"),
      bat_speed: rxs.filter((r) => r.slot === "bat_speed"),
      conditioning: rxs.filter((r) => r.slot === "conditioning"),
      cross_sport: rxs.filter((r) => r.slot === "cross_sport"),
      // New card-scoped buckets — Phase 3 splits Speed and Bat Speed into
      // independent cards. Cross-sport at early_activation placement remains
      // available for the Speed card banner on game days; content itself is
      // owned by the cross_sport card.
      speedCard: [
        ...rxs.filter((r) => r.slot === "cross_sport" && r.why_payload?.placement === "early_activation"),
        ...rxs.filter((r) => r.slot === "speed"),
      ],
      batSpeedCard: rxs.filter((r) => r.slot === "bat_speed"),
      lifts: [
        ...rxs.filter((r) => r.slot === "lift").sort(byRoleOrder),
        ...rxs.filter((r) => r.slot === "supplemental"),
      ],
      conditioningCard: [
        ...rxs.filter((r) => r.slot === "conditioning"),
        ...rxs.filter((r) => r.slot === "cross_sport" && r.why_payload?.placement !== "early_activation"),
      ],
      // Legacy alias kept for any lingering imports; will be removed after
      // callers are migrated. Prefer speedCard + batSpeedCard.
      speedBat: [
        ...rxs.filter((r) => r.slot === "cross_sport" && r.why_payload?.placement === "early_activation"),
        ...rxs.filter((r) => r.slot === "bat_speed"),
        ...rxs.filter((r) => r.slot === "speed"),
      ],
    };
  }, [query.data]);

  const reductions = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.reductions ?? [];
  }, [query.data]);

  const phaseDisplay = useMemo(() => {
    const first = (query.data ?? [])[0];
    const storedPhase = first?.why_payload?.phase ?? first?.phase ?? null;
    if (storedPhase && storedPhase !== canonicalPhase.phase) return canonicalPhase.displayName;
    return first?.why_payload?.phase_display ?? canonicalPhase.displayName ?? null;
  }, [query.data, canonicalPhase.phase, canonicalPhase.displayName]);

  const phaseKey = useMemo(() => {
    const first = (query.data ?? [])[0];
    const storedPhase = first?.why_payload?.phase ?? first?.phase ?? null;
    if (storedPhase && storedPhase !== canonicalPhase.phase) return canonicalPhase.phase;
    return first?.why_payload?.phase ?? canonicalPhase.phase ?? null;
  }, [query.data, canonicalPhase.phase]);

  // Effective CNS = skipped rows contribute 0, everything else contributes
  // full cns_cost. Keeps the "CNS heavy" clamp honest to actuals.
  const effectiveCnsTotal = useMemo(
    () =>
      (query.data ?? []).reduce(
        (s, r) => s + (r.status === "skipped" ? 0 : Number(r.cns_cost) || 0),
        0,
      ),
    [query.data],
  );

  const overrideMovement = useCallback(async (movementSlug: string, reason: string) => {
    if (!user?.id || !reason.trim()) return;
    const { error } = await supabase.from("wk_movement_overrides" as any).insert({
      user_id: user.id,
      movement_slug: movementSlug,
      ack_date: planDate,
      reason: reason.trim(),
      actor_role: "self",
    });
    if (error) return toast.error("Could not record override");
    toast.success("Override logged — regenerating plan");
    await generate();
  }, [user?.id, planDate, generate]);

  // Phase 3 — unified snapshot identity. Every card stamps this so cross-card
  // consistency is provable at render time; a card carrying a different
  // identity is by definition stale and must refetch.
  const snapshotIdentity = useMemo(() => {
    const rxs = query.data ?? [];
    const first = rxs[0];
    const generatedAt =
      rxs.reduce<string | null>((min, r: any) => {
        const c = r?.created_at ?? null;
        if (!c) return min;
        return !min || c < min ? c : min;
      }, null) ?? null;
    const generatorVersion = (first as any)?.generator_version ?? first?.why_payload?.generator_version ?? null;
    const storedSeasonPhase = first?.why_payload?.phase ?? null;
    const seasonPhase = storedSeasonPhase && storedSeasonPhase !== canonicalPhase.phase
      ? canonicalPhase.phase
      : storedSeasonPhase;
    const generationId =
      user?.id && generatedAt
        ? `${user.id}:${planDate}:${generatorVersion ?? "na"}:${generatedAt}`
        : null;
    return {
      generation_id: generationId,
      generated_at: generatedAt,
      generator_version: generatorVersion,
      season_phase: seasonPhase,
      season_display: storedSeasonPhase && storedSeasonPhase !== canonicalPhase.phase
        ? canonicalPhase.displayName
        : ((first?.why_payload?.phase_display as string | undefined) ?? canonicalPhase.displayName ?? null),
      plan_date: planDate,
    };
  }, [query.data, user?.id, planDate, canonicalPhase.phase, canonicalPhase.displayName]);

  // Phase 3 — day kind. Derived from the SAME sources the generator uses
  // (gp_games + scheduled_practice_sessions) so the daily flow accurately
  // reflects the athlete's schedule.
  const dayKind: "game" | "practice" | "both" | "neither" = useMemo(() => {
    const g = !!gameDayQuery.data;
    const p = !!practiceDayQuery.data;
    if (g && p) return "both";
    if (g) return "game";
    if (p) return "practice";
    return "neither";
  }, [gameDayQuery.data, practiceDayQuery.data]);

  // Phase 4 — Canonical TrainingContext. Sourced from the first prescription's
  // why_payload.training_context (generator is the single authority). Every
  // card reads from the SAME object; no card resolves context locally.
  const trainingContext: TrainingContext | null = useMemo(() => {
    const first = (query.data ?? [])[0];
    const tc = first?.why_payload?.training_context ?? null;
    if (!tc) return null;
    return {
      ...tc,
      generation_id: tc.generation_id ?? snapshotIdentity.generation_id ?? null,
    } as TrainingContext;
  }, [query.data, snapshotIdentity.generation_id]);

  // Phases 5–7 — Athlete / Personalization / Training-Age contexts.
  // Sourced from the first prescription's why_payload; generator is the single
  // authority. Every card reads referentially-identical objects.
  const athleteContext: AthleteContext | null = useMemo(() => {
    const first = (query.data ?? [])[0];
    return (first?.why_payload?.athlete_context as AthleteContext | undefined) ?? null;
  }, [query.data]);

  const personalizationContext: PersonalizationContext | null = useMemo(() => {
    const first = (query.data ?? [])[0];
    return (first?.why_payload?.personalization_context as PersonalizationContext | undefined) ?? null;
  }, [query.data]);

  const trainingAgeContext: TrainingAgeContext | null = useMemo(() => {
    const first = (query.data ?? [])[0];
    return (first?.why_payload?.training_age_context as TrainingAgeContext | undefined) ?? null;
  }, [query.data]);

  return {
    ...query,
    grouped,
    reductions,
    phaseDisplay,
    phaseKey,
    generate,
    generating,
    failed,
    failureReason,
    retry,
    effectiveCnsTotal,
    overrideMovement,
    snapshotIdentity,
    dayKind,
    trainingContext,
    athleteContext,
    personalizationContext,
    trainingAgeContext,
  };
}
