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
import { useSideContext } from "@/contexts/SideContext";
import { toast } from "sonner";

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
    reductions?: { reason: string; detail: string }[];
    training_age_years?: number;
    is_pro_prospect?: boolean;
    intensity_class?: string;
    source_philosophy?: string;
    override?: { reason: string | null; actor_role: string; expires_at: string } | null;
  };
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

export function useWkDailyPrescriptions(planDate: string = todayStr()) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const autoTried = useRef(false);
  const sideCtx = useSideContext();
  const sideHit = sideCtx.selectedSide?.hit;
  const sideThrow = sideCtx.selectedSide?.throw;

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

  const generate = useCallback(async () => {
    if (!user?.id || generating) return;
    setGenerating(true);
    setFailed(false);
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
            // Backoff before the single retry
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }
      if (lastErr) throw lastErr;
      console.debug("[wk-generate-daily] ok", { ms: Date.now() - started });
      await qc.invalidateQueries({ queryKey: ["wk-rx", user.id, planDate] });
    } catch (e) {
      console.error("wk-generate-daily failed (after retry)", e);
      setFailed(true);
      toast.error("Elite plan couldn't build. Tap Regenerate.");
    } finally {
      setGenerating(false);
    }
  }, [user?.id, planDate, qc, generating, invokeOnce]);

  // Auto-generate exactly once per mount if empty.
  useEffect(() => {
    if (
      !query.isLoading &&
      query.data &&
      query.data.length === 0 &&
      !generating &&
      !failed &&
      !autoTried.current
    ) {
      autoTried.current = true;
      generate();
    }
  }, [query.isLoading, query.data, generate, generating, failed]);

  const retry = useCallback(() => {
    autoTried.current = false;
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
      // New card-scoped buckets
      speedBat: [
        ...rxs.filter((r) => r.slot === "bat_speed"),
        ...rxs.filter((r) => r.slot === "speed"),
      ],
      lifts: [
        ...rxs.filter((r) => r.slot === "lift").sort(byRoleOrder),
        ...rxs.filter((r) => r.slot === "supplemental"),
      ],
      conditioningCard: [
        ...rxs.filter((r) => r.slot === "conditioning"),
        ...rxs.filter((r) => r.slot === "cross_sport"),
      ],
    };
  }, [query.data]);

  const reductions = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.reductions ?? [];
  }, [query.data]);

  const phaseDisplay = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.phase_display ?? null;
  }, [query.data]);

  const phaseKey = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.phase ?? null;
  }, [query.data]);

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

  return {
    ...query,
    grouped,
    reductions,
    phaseDisplay,
    generate,
    generating,
    failed,
    retry,
    effectiveCnsTotal,
    overrideMovement,
  };
}
