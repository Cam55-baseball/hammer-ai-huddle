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
import { WIC_VERSION } from "../../supabase/functions/_shared/wic/constitution";
import { resolveWkPhase } from "@/lib/hammer/workout/phaseQuarter";
import { useTellHammersEnabled, SCHEDULE_CHANGED_EVENT } from "@/hooks/useScheduleTimeline";

// Must equal the version the generator stamps on every row. A mismatch made
// every visit look "stale" and rebuild today's plan, wiping check-offs.
const WK_GENERATOR_VERSION = WIC_VERSION;

export type WkSlot = "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental" | "ub_primer";

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
    /** Named schedule enforcement — which game moved the session, and why. */
    schedule?: {
      version?: string;
      headline?: string | null;
      driving_game?: {
        id: string | null;
        date: string;
        time: string;
        assumedTime: boolean;
        label: string | null;
        source: "gp_games" | "calendar_events";
        whenLabel: string;
      } | null;
      primer_only?: boolean;
      lift_removed?: boolean;
      within_48h?: boolean;
      hours_to_game?: number | null;
      assumed_game_time?: boolean;
      games_today?: number;
      doubleheader_today?: boolean;
      games_per_rolling_week?: number;
      high_density?: boolean;
      zero_exposure_relief?: boolean;
      override_available?: boolean;
      override_applied?: boolean;
      duplicates_collapsed?: number;
      finished_excluded?: number;
      reasons?: string[];
    } | null;
    training_age_years?: number;
    is_pro_prospect?: boolean;
    intensity_class?: string;
    source_philosophy?: string;
    override?: { reason: string | null; actor_role: string; expires_at: string } | null;
    lift_governance?: {
      template_id?: string;
      template_name?: string;
      movement_category?: string;
      substitution_family?: string | null;
      substitution_ladder?: Record<string, string[]>;
      substitution_ladder_score?: number;
      governance_version?: string;
    } | null;
    athlete_substitution?: {
      from_slug: string;
      from_name: string;
      from_sets: number | null;
      to_slug: string;
      reason: string;
      reason_label: string;
      at: string;
    } | null;
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
  status: "planned" | "pending" | "completed" | "skipped" | "missed";
}

/**
 * Canonical lift role order. Retained for reference and for any consumer that
 * needs the doctrine sequence; it is deliberately NOT used to sort rendered
 * prescriptions — persisted `sequence_order` is the only render order.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Round 6 (plan never changes on reload): the last plan this device saw is
  // shown instantly from the device, then quietly checked against the server.
  // Nothing below may act on the device copy — every rule and rebuild decision
  // waits until the server answer for this visit has arrived.
  const deviceKey = user?.id ? `hm.wkrx.v1.${user.id}.${planDate}` : null;
  const deviceCopy = useMemo(() => {
    if (!deviceKey) return undefined;
    try {
      const raw = localStorage.getItem(deviceKey);
      const rows = raw ? (JSON.parse(raw) as WkRx[]) : undefined;
      return Array.isArray(rows) && rows.length > 0 ? rows : undefined;
    } catch { return undefined; }
  }, [deviceKey]);
  const query = useQuery({
    queryKey: ["wk-rx", user?.id, planDate],
    enabled: !!user?.id,
    initialData: deviceCopy,
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wk_prescriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("plan_date", planDate)
        .order("sequence_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as WkRx[];
      try {
        if (deviceKey) {
          if (rows.length > 0) localStorage.setItem(deviceKey, JSON.stringify(rows));
          else localStorage.removeItem(deviceKey);
        }
      } catch { /* device storage full or blocked — the plan still shows */ }
      return rows;
    },
    staleTime: 60_000,
  });
  // True once this visit's server answer is in (not just the device copy).
  const serverFresh = query.isFetchedAfterMount && !query.isFetching;

  const gameDayQuery = useQuery({
    queryKey: ["wk-rx-game-day", user?.id, planDate],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("gp_games")
        .select("id")
        .is("deleted_at", null)
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

  // Update Hammer — the newest timeline change. A plan built before it is stale
  // and re-plans on open. Inert (never runs) while the switch is off.
  const tellHammersOn = useTellHammersEnabled();
  const timelineQuery = useQuery({
    queryKey: ["wk-rx-timeline", user?.id],
    enabled: !!user?.id && tellHammersOn,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("schedule_timeline_entries")
        .select("updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.updated_at as string | undefined) ?? null;
    },
  });

  // Stage 3 — today's Day intent answer. A plan built before the athlete
  // answered (or changed) it is stale and rebuilds once, like a season change.
  const dayIntentQuery = useQuery({
    queryKey: ["day-state-overrides", user?.id, "plan", planDate],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<"rest" | "skip" | "push" | null> => {
      const { data } = await (supabase as any)
        .from("user_day_state_overrides")
        .select("type")
        .eq("user_id", user!.id)
        .eq("date", planDate)
        .maybeSingle();
      const t = data?.type;
      return t === "rest" || t === "skip" || t === "push" ? t : null;
    },
  });

  // One plan per day: every change to a built day is logged with its reason.
  const planChangesQuery = useQuery({
    queryKey: ["wk-plan-changes", user?.id, planDate],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from("wk_plan_changes")
        .select("id, reason_code, reason_text, changed_slots, outcome, detail, created_at")
        .eq("user_id", user!.id).eq("plan_date", planDate)
        .order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as Array<{ id: string; reason_code: string; reason_text: string; changed_slots: string[]; outcome: string; detail: any; created_at: string }>;
    },
  });
  // Latest morning/night check-in for this day — a check-in after the plan
  // was built is tracked activity that may adjust the remaining cards.
  const checkInQuery = useQuery({
    queryKey: ["wk-plan-checkin", user?.id, planDate],
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase.from("vault_focus_quizzes").select("created_at")
        .eq("user_id", user!.id).eq("entry_date", planDate)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return ((data as any)?.created_at as string | undefined) ?? null;
    },
  });

  type ChangeReq = { reason: "player_request" | "tracked_activity"; text: string; key: string };
  const invokeOnce = useCallback(async (change?: ChangeReq) => {
    // Pull the most recent *live* recovery ack so the edge function can bias the
    // next plan (real learning loop instead of one-way personalization).
    // Superseded acks are spent — their cause has cleared, or they were written
    // by a rule that has since been fixed — and must never bias anything again.
    // The function re-reads and re-validates this server-side; this is a hint.
    const { data: lastAck } = await supabase
      .from("wk_recovery_acks" as any)
      .select("reduction_reason, reduction_payload, acknowledged_at")
      .eq("user_id", user!.id)
      .is("superseded_at", null)
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
          ...(change ? { change_reason: change.reason, change_text: change.text, change_key: change.key } : {}),
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
  const confirmedRef = useRef(false);
  confirmedRef.current = (query.data ?? []).some(
    (r) => !!r.status && r.status !== "planned" && r.status !== "pending",
  );
  // Record the device time zone so "the day ended" is judged in the
  // athlete's own time when missed lifts are marked.
  useEffect(() => {
    if (!user?.id) return;
    let tz: string | null = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; } catch { tz = null; }
    if (!tz) return;
    const key = `hm.tz.${user.id}`;
    if (sessionStorage.getItem(key) === tz) return;
    void (supabase as any).from("profiles").update({ timezone: tz }).eq("id", user.id)
      .then(({ error }: { error: unknown }) => { if (!error) sessionStorage.setItem(key, tz as string); });
  }, [user?.id]);
  const generate = useCallback(async (change?: ChangeReq) => {
    if (!user?.id) return;
    // A built day is never rebuilt. With a stated change the server adjusts
    // only the remaining unmarked cards; marked cards are never touched.
    if (confirmedRef.current && !change) {
      console.debug("[wk-generate-daily] skipped — day already has check-offs");
      return;
    }
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
          const { error } = await invokeOnce(change);
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
      await qc.invalidateQueries({ queryKey: ["wk-plan-changes", user.id, planDate] });
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
      // The toast never carries raw engine text (it contained catalog slugs
      // repeated three times). The card explains the real reason in plain
      // language via WkCardFailureNotice.
      toast.error("Today's plan couldn't publish — see the card for why.", {
        id: "wk-generate-failed",
      });
    } finally {
      inFlightRef.current = false;
      setGenerating(false);
    }
  }, [user?.id, planDate, qc, invokeOnce]);

  // Step 21E3 — plain reason shown in the day header after a season change.
  const [replanReason, setReplanReason] = useState<string | null>(null);

  // Update Hammer — a saved entry re-plans the next 7 days right now, in place,
  // with the plain "what changed" line. No restart, no navigation.
  const generateRef = useRef<(c?: ChangeReq) => Promise<void>>(async () => undefined);
  useEffect(() => {
    if (!tellHammersOn) return;
    const onChange = (ev: Event) => {
      const reason = (ev as CustomEvent<{ reason?: string }>).detail?.reason ?? null;
      if (reason) setReplanReason(reason);
      if (user?.id) {
        for (let d = 0; d <= 7; d++) {
          const dt = new Date(`${planDate}T00:00:00Z`);
          dt.setUTCDate(dt.getUTCDate() + d);
          const iso = dt.toISOString().slice(0, 10);
          qc.invalidateQueries({ queryKey: ["wk-rx", user.id, iso] });
        }
      }
      const key = `timeline-event:${Date.now()}`;
      autoTriedKey.current = key;
      void generateRef.current({ reason: "player_request", text: reason ?? "You updated Hammer, so we adjusted what's left today.", key });
    };
    window.addEventListener(SCHEDULE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SCHEDULE_CHANGED_EVENT, onChange);
  }, [tellHammersOn, user?.id, planDate, qc]);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  // Saved-plan re-check (owner ruling 2026-10-06): whenever a saved plan is
  // shown, the server re-runs the final rule check on it once. A failing plan
  // is rebuilt (nothing marked) or trimmed of failing unmarked cards.
  const verifiedKey = useRef<string | null>(null);
  const [nextEligible, setNextEligible] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    const rows = query.data ?? [];
    if (!user?.id || rows.length === 0 || generating || !serverFresh) return;
    const key = `${user.id}:${planDate}:${(rows[0] as any)?.created_at ?? ""}`;
    if (verifiedKey.current === key) return;
    verifiedKey.current = key;
    void supabase.functions
      .invoke("wk-generate-daily", { body: { plan_date: planDate, verify_saved: true } })
      .then(({ data, error }) => {
        if (error) { console.debug("[wk-verify-saved] failed", error); return; }
        const ne = (data as any)?.next_eligible;
        if (ne && typeof ne === "object") setNextEligible(ne);
        if (data && (data as any).verified !== true) {
          void qc.invalidateQueries({ queryKey: ["wk-rx", user.id, planDate] });
          void qc.invalidateQueries({ queryKey: ["wk-plan-changes", user.id, planDate] });
        }
      });
  }, [user?.id, planDate, query.data, generating, qc, serverFresh]);

  // Auto-generate exactly once per mount if empty.
  useEffect(() => {
    const first = query.data?.[0];
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
    const firstCreated = (first as any)?.created_at as string | undefined;
    const staleTimeline =
      tellHammersOn && !!first && !!timelineQuery.data && !!firstCreated && firstCreated < timelineQuery.data;
    // Rows built before Stage 3 carry no intent; they rebuild only for an easier day.
    const intentRow = (query.data ?? []).find((rx) => rx.why_payload && "day_intent" in (rx.why_payload as any));
    const storedIntent = intentRow ? ((intentRow.why_payload as any).day_intent ?? null) : undefined;
    const staleIntent =
      !!first && !dayIntentQuery.isLoading && dayIntentQuery.data !== undefined &&
      (storedIntent === undefined ? dayIntentQuery.data === "rest" : storedIntent !== dayIntentQuery.data);
    const checkInAt = checkInQuery.data ?? null;
    const staleCheckIn = !!first && !!checkInAt && !!firstCreated && checkInAt > firstCreated;
    // A built day is never rebuilt for a new app version. It changes only for
    // a stated reason, and each reason is applied once (logged change_key).
    const refreshKey = !query.data
      ? null
      : query.data.length === 0
        ? "empty"
        : staleGameDay
          ? `game:${String(first?.why_payload?.game_day)}->${String(isGameDayForPlan)}`
          : stalePhase
            ? `phase:${first?.why_payload?.phase ?? first?.phase ?? "missing"}->${expectedPhase}`
            : staleIntent
              ? `intent:${storedIntent ?? "none"}->${dayIntentQuery.data ?? "none"}`
              : staleTimeline
                ? `timeline:${timelineQuery.data}`
                : staleCheckIn
                  ? `checkin:${checkInAt}`
                  : null;
    const alreadyApplied = !!refreshKey && refreshKey !== "empty" &&
      (planChangesQuery.data ?? []).some((c) => c.detail?.change_key === refreshKey);
    const change: ChangeReq | undefined = !refreshKey || refreshKey === "empty" ? undefined
      : refreshKey.startsWith("game:")
        ? { reason: "tracked_activity", text: isGameDayForPlan ? "A game was added for today, so we adjusted what's left." : "Today's game came off your schedule, so we adjusted what's left.", key: refreshKey }
        : refreshKey.startsWith("phase:")
          ? { reason: "player_request", text: `You changed your season to ${canonicalPhase.displayName ?? expectedPhase}, so we adjusted what's left today.`, key: refreshKey }
          : refreshKey.startsWith("intent:")
            ? { reason: "player_request", text: "You told Hammer how you want today to go, so we adjusted what's left.", key: refreshKey }
            : refreshKey.startsWith("timeline:")
              ? { reason: "player_request", text: "You updated Hammer, so we adjusted what's left today.", key: refreshKey }
              : { reason: "tracked_activity", text: "You checked in, so we fitted what's left today to how you feel.", key: refreshKey };
    if (
      serverFresh &&
      !alreadyApplied &&
      !planChangesQuery.isLoading &&
      !checkInQuery.isLoading &&
      !query.isLoading &&
      !gameDayQuery.isLoading &&
      !season.isLoading &&
      refreshKey &&
      !generating &&
      !failed &&
      autoTriedKey.current !== refreshKey
    ) {
      autoTriedKey.current = refreshKey;
      // Step 21E3 — a season change re-plans the next 7 days immediately: the
      // cached cards for tomorrow through day 7 are dropped so nothing stale
      // survives the switch, and the change carries a plain reason.
      if (refreshKey.startsWith("phase:")) {
        setReplanReason(
          `Your season changed to ${canonicalPhase.displayName ?? expectedPhase} — Hammer re-planned the next 7 days.`,
        );
        if (user?.id) {
          for (let d = 0; d <= 7; d++) {
            const dt = new Date(`${planDate}T00:00:00Z`);
            dt.setUTCDate(dt.getUTCDate() + d);
            const iso = dt.toISOString().slice(0, 10);
            qc.invalidateQueries({ queryKey: ["wk-rx", user.id, iso] });
            qc.invalidateQueries({ queryKey: ["wk-rx-game-day", user.id, iso] });
            qc.invalidateQueries({ queryKey: ["wk-rx-practice-day", user.id, iso] });
          }
        }
      }
      generate(change);
    }
  }, [planChangesQuery.data, planChangesQuery.isLoading, checkInQuery.data, checkInQuery.isLoading, dayIntentQuery.isLoading, dayIntentQuery.data, tellHammersOn, timelineQuery.data, query.isLoading, query.data, gameDayQuery.isLoading, gameDayQuery.data, canonicalPhase.phase, canonicalPhase.displayName, season.isLoading, generate, generating, failed, qc, planDate, user?.id, serverFresh]);

  const planChangeNotes = useMemo(
    () => (planChangesQuery.data ?? []).filter((c) => c.outcome === "changed").map((c) => ({ id: c.id, text: c.reason_text, at: c.created_at, kind: c.reason_code })),
    [planChangesQuery.data],
  );

  const retry = useCallback(() => {
    autoTriedKey.current = null;
    setFailed(false);
    generate();
  }, [generate]);

  const grouped = useMemo(() => {
    const rxs = query.data ?? [];
    // Persisted order wins. The server orders lifts once, and a coach pin
    // moves a movement by rewriting `sequence_order` — a client-side re-sort
    // by `sequence_role` silently undid the pin, which is why a pinned lift
    // snapped back on the athlete's screen. Never re-sort here.
    const byRoleOrder = (a: WkRx, b: WkRx) => a.sequence_order - b.sequence_order;
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
      // owned by the cross_sport card. `warmup_integration` placement is
      // rendered inside the Warm-up card (in-season crossover primer).
      warmupAddons: [
        ...rxs.filter((r) => r.slot === "cross_sport" && r.why_payload?.placement === "warmup_integration"),
        // Upper-body primer — own slot, right after the warm-up (owner decision 2026-09-25).
        ...rxs.filter((r) => r.slot === "ub_primer"),
      ],
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
        ...rxs.filter(
          (r) =>
            r.slot === "cross_sport" &&
            r.why_payload?.placement !== "early_activation" &&
            r.why_payload?.placement !== "warmup_integration",
        ),
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

  /** Named schedule adjustment for today, or null when nothing moved. */
  const schedule = useMemo(() => {
    const first = (query.data ?? [])[0];
    return first?.why_payload?.schedule ?? null;
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
        (s, r) => s + (r.status === "skipped" || r.status === "missed" ? 0 : Number(r.cns_cost) || 0),
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
    await generate({ reason: "player_request", text: "You swapped an exercise, so we adjusted that card.", key: `override:${movementSlug}:${Date.now()}` });
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
    planDate,
    grouped,
    reductions,
    schedule,
    phaseDisplay,
    phaseKey,
    generate,
    generating,
    failed,
    failureReason,
    retry,
    planChangeNotes,
    effectiveCnsTotal,
    overrideMovement,
    snapshotIdentity,
    dayKind,
    trainingContext,
    athleteContext,
    personalizationContext,
    trainingAgeContext,
    /** Step 21E3 — plain reason for the last season-driven re-plan. */
    replanReason,
    /** Round 8 — next allowed plan date per spaced card type, from the server's rule check. */
    nextEligible,
  };
}
