// supabase/functions/wk-generate-daily/index.ts
// Hammer Workout & Speed — elite daily prescription generator.
//
// v2 rewrite:
//   - FULL-BODY lift template (not a single-pattern day)
//   - Phase modulation (OS Q1-Q2, OS Q3-Q4, In-Season, Post-Season)
//   - sequence_role tagged per prescription so the UI can render lifts
//     in the canonical order (arm care → trunk primer → compound →
//     unilateral → upper push → upper pull → carry → trunk finisher)
//   - Speed / Bat-Speed / Conditioning kept as distinct slots so the app
//     can render them in three separate cards (Speed & Bat before lifts,
//     conditioning next to practice)
//
// Idempotent for (user_id, plan_date, sequence_field).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveWkPhase } from "../_shared/wkPhaseQuarter.ts";

interface MovementRow {
  slug: string;
  name: string;
  category: string;
  pattern: string | null;
  variant: string | null;
  sport_scope: "baseball" | "softball" | "both";
  position_scope: string[] | null;
  min_training_age_years: number;
  min_competition_level: string | null;
  cns_cost: number;
  cue: string;
  why_prescribed: string;
  contraindications: string[];
  regression_slug: string | null;
  progression_slug: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_tempo: string | null;
  default_load_pct: number | null;
  family: string | null;
  intensity_class: string | null;
  phase_allow: string[] | null;
  is_eccentric_dominant: boolean | null;
  source_philosophy: string | null;
}

interface BlockRow {
  phase: string;
  display_name: string;
  compound_style: "double_eccentric" | "eccentric" | "concentric";
  supplemental_style: "kot" | "functional_patterning" | "mixed";
  speed_cadence_hours: number;
  cross_sport_cadence: string;
  compound_min_sets: number;
  compound_max_sets: number;
  compound_min_reps: number;
  compound_max_reps: number;
  cns_unit_cap: number;
  notes: string | null;
}

type Slot = "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental";

type SequenceRole =
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

interface Prescription {
  slot: Slot;
  sequence_order: number;
  sequence_role: SequenceRole;
  movement_slug: string;
  movement_name: string;
  sets: number | null;
  reps: number | null;
  tempo: string | null;
  load_pct: number | null;
  cns_cost: number;
  cns_clamped: boolean;
  substituted_from_slug: string | null;
  substitution_reason: string | null;
  why_payload: Record<string, unknown>;
  rationale?: string;
}

const OS_ONLY_ECCENTRIC_SLUGS = new Set([
  "back_squat_double_ecc",
  "front_squat_double_ecc",
  "bench_press_double_ecc",
  "incline_bench_double_ecc",
  "hip_thrust_double_ecc",
  "rdl_double_ecc",
  "trap_bar_dl_double_ecc",
  "weighted_pullup_double_ecc",
  "nordic_curl",
  "reverse_nordic",
  "copenhagen_adduction_ecc",
  "plyo_depth_jump",
]);

const IN_SEASON_BLOCKED_SLUGS = new Set([
  ...OS_ONLY_ECCENTRIC_SLUGS,
  "atg_split_squat",
  "sissy_squat",
  "slide_lunge",
]);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json().catch(() => ({}))) as {
      plan_date?: string;
      recent_ack?: { reduction_reason?: string; reduction_payload?: unknown; acknowledged_at?: string } | null;
    };
    const planDate = body.plan_date ?? todayStr();
    const recentAck = body.recent_ack ?? null;

    // -------- Load athlete context --------
    const [{ data: profile }, { data: ctx }, { data: injuries }, { data: dailyLog }, { data: gamesToday }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      admin.from("athlete_context").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("user_injury_progress").select("injury_slug, status").eq("user_id", user.id).in("status", ["acute", "active"]),
      admin.from("athlete_daily_log").select("*").eq("user_id", user.id).eq("log_date", planDate).maybeSingle(),
      admin.from("gp_games")
        .select("id, game_date, status, game_type")
        .eq("user_id", user.id)
        .eq("game_date", planDate)
        .not("status", "in", "(canceled,cancelled,rescheduled)")
        .limit(1),
    ]);

    const p: any = profile ?? {};
    const sport = (p.sport ?? "baseball") as "baseball" | "softball";
    const position = p.primary_position ?? p.position ?? null;
    const trainingAgeYears = Number(p.years_lifting ?? p.training_age_years ?? 0);
    const isProProspect = !!(p.is_pro_prospect ?? p.pro_prospect ?? false);
    const injurySlugs = new Set((injuries ?? []).map((r: any) => r.injury_slug as string));
    const isGameDay = (gamesToday ?? []).length > 0;

    // -------- Resolve phase quarter --------
    const phaseRes = resolveWkPhase(ctx ?? null);
    const isOffseason = phaseRes.phase.startsWith("os_");
    const isDeep = phaseRes.phase === "os_q1" || phaseRes.phase === "os_q2";
    const isInSeason = phaseRes.phase === "in_season";
    const isPostSeason = phaseRes.phase === "post_season";

    // -------- Load phase block + catalog --------
    const [{ data: blocks, error: blocksErr }, { data: catalog, error: catErr }] = await Promise.all([
      admin.from("wk_periodization_blocks").select("*").eq("phase", phaseRes.phase).maybeSingle() as unknown as Promise<{ data: BlockRow | null; error: any }>,
      admin.from("wk_movement_catalog").select("*").or(`sport_scope.eq.both,sport_scope.eq.${sport}`) as unknown as Promise<{ data: MovementRow[] | null; error: any }>,
    ]);
    if (blocksErr) throw blocksErr;
    if (catErr) throw catErr;
    const block = blocks!;
    const lib = catalog ?? [];

    // -------- Determine reductions --------
    const reductions: { reason: string; detail: string }[] = [];
    let cnsCap = block.cns_unit_cap;
    const dl: any = dailyLog ?? {};
    const sleep = Number(dl.sleep_hours ?? dl.sleep ?? 7);
    const cnsReadiness = Number(dl.cns_readiness ?? dl.readiness ?? 7);
    const soreness = Number(dl.soreness ?? 3);
    if (sleep < 6) {
      reductions.push({ reason: "sleep", detail: `Only ${sleep}h sleep — high-CNS work reduced.` });
      cnsCap = Math.max(1, cnsCap - 1);
    }
    if (cnsReadiness <= 4) {
      reductions.push({ reason: "cns", detail: `Self-reported CNS readiness ${cnsReadiness}/10 — capping CNS units.` });
      cnsCap = Math.max(1, cnsCap - 1);
    }
    if (soreness >= 8) {
      reductions.push({ reason: "soreness", detail: `Reported soreness ${soreness}/10 — substituting regressions where possible.` });
    }
    if (recentAck?.acknowledged_at) {
      const ackAgeH = (Date.now() - new Date(recentAck.acknowledged_at).getTime()) / 3600000;
      if (ackAgeH >= 0 && ackAgeH <= 48) {
        cnsCap = Math.max(1, cnsCap - 1);
        reductions.push({
          reason: "learning_loop",
          detail: `Recent recovery ack (${recentAck.reduction_reason ?? "mixed"}) — holding CNS cap conservative for one more day.`,
        });
      }
    }

    // -------- Load 72h lift history + active overrides (drift guards) --------
    const threeDaysAgo = new Date(planDate + "T00:00:00");
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10);
    const [{ data: recentLifts }, { data: activeOverrides }] = await Promise.all([
      admin.from("wk_prescriptions")
        .select("movement_slug, plan_date, slot")
        .eq("user_id", user.id)
        .eq("slot", "lift")
        .gte("plan_date", threeDaysAgoStr)
        .lt("plan_date", planDate),
      admin.from("wk_movement_overrides")
        .select("movement_slug, expires_at, reason, actor_role")
        .eq("user_id", user.id)
        .eq("ack_date", planDate)
        .gt("expires_at", new Date().toISOString()),
    ]);
    const recentCompoundSlugs = new Set((recentLifts ?? []).map((r: any) => r.movement_slug as string));
    const overrideSlugs = new Set((activeOverrides ?? []).map((r: any) => r.movement_slug as string));
    const usedThisSession = new Set<string>();
    const usedNamesThisSession = new Set<string>();

    const isCompoundMovement = (m: MovementRow) =>
      m.category === "compound" || (m.intensity_class ?? "").includes("compound");

    const isPhaseHardBlocked = (m: MovementRow) => {
      if (!isOffseason && OS_ONLY_ECCENTRIC_SLUGS.has(m.slug)) return true;
      if (isInSeason && IN_SEASON_BLOCKED_SLUGS.has(m.slug)) return true;
      if (m.is_eccentric_dominant && !isOffseason) return true;
      if (m.phase_allow && m.phase_allow.length > 0 && !m.phase_allow.includes(phaseRes.phase)) return true;
      return false;
    };

    // -------- Movement filters --------
    const eligible = (m: MovementRow | undefined | null): m is MovementRow => {
      if (!m) return false;
      if (m.min_training_age_years > trainingAgeYears && !isProProspect) return false;
      if (m.contraindications?.some((c) => injurySlugs.has(c))) return false;
      // Phase legality — hard-block eccentric/OS-only movements outside legal phases, unless override
      if (isPhaseHardBlocked(m)) {
        if (!overrideSlugs.has(m.slug)) return false;
      }
      // Session dedupe — no movement twice in a day
      if (usedThisSession.has(m.slug)) return false;
      if (usedNamesThisSession.has(normalizeName(m.name))) return false;
      // 72h non-repeat for compound lifts
      if (isCompoundMovement(m) && recentCompoundSlugs.has(m.slug)) return false;
      return true;
    };
    const swap = (m: MovementRow) => {
      if (!m.contraindications?.some((c) => injurySlugs.has(c))) return { movement: m, substitutedFrom: null as string | null, reason: null as string | null };
      if (m.regression_slug) {
        const reg = lib.find((x) => x.slug === m.regression_slug);
        if (reg) return { movement: reg, substitutedFrom: m.slug, reason: `Contraindicated by reported injury — regressed to ${reg.name}.` };
      }
      return { movement: m, substitutedFrom: null, reason: null };
    };
    const pickFirst = (slugs: string[]): MovementRow | undefined => {
      for (const s of slugs) {
        const m = lib.find((x) => x.slug === s);
        if (eligible(m)) return m;
      }
      return undefined;
    };
    const pickCat = (cat: string): MovementRow | undefined =>
      lib.find((m) => m.category === cat && eligible(m));

    // -------- Rotate unilateral lower / upper push across the week --------
    const dayOfWeek = new Date(planDate + "T00:00:00").getDay(); // 0..6

    // -------- Build full-body lift template (phase-modulated) --------
    const rxs: Prescription[] = [];
    let seq = 0;
    let cnsUsed = 0;

    const humanizeClass = (c: string | null) => {
      switch (c) {
        case "max_effort_compound": return "max-effort compound";
        case "eccentric_compound": return "eccentric-focus compound";
        case "compound": return "compound";
        case "unilateral": return "unilateral / single-leg";
        case "arm_care": return "arm-care";
        case "trunk": return "trunk / anti-rotation";
        case "carry": return "loaded carry";
        default: return c ?? "supplemental";
      }
    };
    const humanizePhilosophy = (p: string | null) => p ? p.replace(/_/g, " ") : null;

    const push = (
      slot: Slot,
      role: SequenceRole,
      m: MovementRow,
      overrides: Partial<Prescription> = {},
      why: string = "",
      meta: Record<string, unknown> = {},
    ): boolean => {
      const s = swap(m);
      if (usedThisSession.has(s.movement.slug)) return false;
      const nameKey = normalizeName(s.movement.name);
      if (usedNamesThisSession.has(nameKey)) return false;
      usedThisSession.add(s.movement.slug);
      usedNamesThisSession.add(nameKey);
      const setsBase = overrides.sets ?? s.movement.default_sets ?? null;
      const repsBase = overrides.reps ?? s.movement.default_reps ?? null;
      const clamped = (cnsUsed + s.movement.cns_cost) > cnsCap;
      cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : s.movement.cns_cost;

      // Override provenance
      const phaseBlocked = !!(s.movement.phase_allow && s.movement.phase_allow.length > 0 && !s.movement.phase_allow.includes(phaseRes.phase));
      const overrideRow = phaseBlocked ? (activeOverrides ?? []).find((o: any) => o.movement_slug === s.movement.slug) : null;
      const overrideMeta = overrideRow
        ? { reason: (overrideRow as any).reason ?? null, actor_role: "self", expires_at: (overrideRow as any).expires_at }
        : null;

      // Plain-English rationale
      const philo = humanizePhilosophy(s.movement.source_philosophy);
      const cls = humanizeClass(s.movement.intensity_class);
      const ageStr = trainingAgeYears > 0 ? `${trainingAgeYears}-year training age` : "beginner training age";
      const proStr = isProProspect ? " (pro prospect)" : "";
      const reasonPiece = why || s.movement.why_prescribed || `${cls} pick for today`;
      const reductionsPiece = reductions.length
        ? ` Volume trimmed today because ${reductions.map((r) => r.detail.toLowerCase()).join(" and ")}.`
        : "";
      const overridePiece = overrideMeta
        ? ` Unlocked for this session by your override — reason: "${overrideMeta.reason ?? "not stated"}".`
        : "";
      const philoPiece = philo ? ` Doctrine: ${philo}.` : "";
      const rationale = `Chosen because you're in ${phaseRes.displayName} with a ${ageStr}${proStr}, and this is a ${cls}. ${reasonPiece}.${philoPiece}${overridePiece}${reductionsPiece}`.replace(/\s+/g, " ").trim();

      rxs.push({
        slot, sequence_order: seq++, sequence_role: role,
        movement_slug: s.movement.slug, movement_name: s.movement.name,
        sets: clamped && typeof setsBase === "number" ? Math.max(1, setsBase - 1) : setsBase,
        reps: repsBase,
        tempo: overrides.tempo ?? s.movement.default_tempo,
        load_pct: overrides.load_pct ?? s.movement.default_load_pct,
        cns_cost: s.movement.cns_cost,
        cns_clamped: clamped,
        substituted_from_slug: s.substitutedFrom,
        substitution_reason: s.reason,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          generator_version: "full_body_game_day_v3",
          game_day: isGameDay,
          training_age_years: trainingAgeYears, is_pro_prospect: isProProspect,
          intensity_class: s.movement.intensity_class,
          pattern: s.movement.pattern,
          category: s.movement.category,
          family: s.movement.family,
          source_philosophy: s.movement.source_philosophy,
          why: why || s.movement.why_prescribed,
          cue: s.movement.cue,
          rep_rule: `${block.compound_min_sets}-${block.compound_max_sets} sets × ${block.compound_min_reps}-${block.compound_max_reps} reps (phase doctrine).`,
          reductions,
          override: overrideMeta,
          ...meta,
        },
        rationale,
      } as any);
      return true;
    };

    if (isGameDay) {
      const primer = pickFirst(["contralateral_cross_crawl", "frc_cars_full_body", "fp_arm_line_spiral"]);
      if (primer) {
        push(
          "cross_sport",
          "cross_sport",
          primer,
          { sets: 1, reps: primer.slug === "contralateral_cross_crawl" ? 20 : 1 },
          "Game-day crossover activation — short, early, and low-cost. It starts the day after warm-up instead of sitting on the back end.",
          { placement: "early_activation", sequencing_hint: "Do after warm-up and before the game. Stop before fatigue shows up." },
        );
      }
    }

    if (!isGameDay) {
      // 1) Arm care — every session, non-negotiable
      const armCare = pickFirst(["crossover_symmetry_full", "jband_full_chart"]);
      if (armCare) push("lift", "arm_care", armCare, { sets: 1, reps: 1 }, "Non-negotiable shoulder prep. Every session opens here.");

      // 2) Trunk primer — every session
      const trunkPrimer = pickFirst(["trap_bar_trunk_twist", "paloff_press"]);
      if (trunkPrimer) push("lift", "trunk_primer", trunkPrimer, { sets: 1, reps: isInSeason ? 6 : 10 }, "Loaded rotation primer — wakes obliques + preps swing plane.");

      // 3) Compound A — lower strength primer, phase legal
      const compoundSlugsByPhase = isDeep
        ? ["back_squat_double_ecc", "front_squat_double_ecc", "trap_bar_dl_double_ecc"]
        : phaseRes.phase === "os_q3" || phaseRes.phase === "os_q4"
          ? ["front_squat_double_ecc", "hip_thrust_concentric", "back_squat_concentric"]
          : ["hip_thrust_concentric", "rdl_concentric", "back_squat_concentric"];
      const compound = pickFirst(compoundSlugsByPhase) ?? lib.find((m) => m.category === "compound" && eligible(m) && ["squat", "hinge"].includes(m.pattern ?? ""));
      if (compound) {
        const sets = isInSeason ? 2 : clamp(2, block.compound_min_sets, block.compound_max_sets);
        const reps = isInSeason ? 3 : clamp(3, block.compound_min_reps, block.compound_max_reps);
        push("lift", "compound_lower", compound, { sets, reps }, `${block.display_name}: ${block.compound_style.replace("_", " ")} lower-body primer — strong enough to maintain output without stealing sport freshness.`);
      }

      // 4) Unilateral lower — rotate across the week to build all planes
      const unilateralRotation = isInSeason
        ? ["lateral_db_step_up", "sl_deadlift_fat_grips"]
        : ["lateral_db_step_up", "kot_lunge", "slide_lunge", "sl_deadlift_fat_grips"];
      const uniLower = pickFirst([unilateralRotation[dayOfWeek % unilateralRotation.length], ...unilateralRotation]);
      if (uniLower) push("lift", "unilateral_lower", uniLower, { sets: isInSeason ? 1 : 2, reps: 3 }, "Single-leg dominance — closes L/R imbalances the compound hides.");

      // 5) Upper push — unilateral / integrated (skip in post-season)
      const upperPush = pickFirst([
        isInSeason ? "push_press_concentric" : dayOfWeek % 2 === 0 ? "sa_db_chest_press" : "landmine_row_to_press",
        "push_press_concentric",
        "bench_press_concentric",
        "sa_db_chest_press",
        "landmine_row_to_press",
      ]);
      if (upperPush) push("lift", "upper_push", upperPush, { sets: isInSeason ? 1 : 2, reps: 3 }, "Upper push — enough strength signal to maintain full-body balance without chasing soreness.");

      // 6) Upper pull — unilateral / weighted
      const upperPull = pickFirst([
        isInSeason ? "sa_standing_cable_row" : dayOfWeek % 3 === 0 ? "renegade_row" : dayOfWeek % 3 === 1 ? "sa_standing_cable_row" : "weighted_pullup_full",
        "sa_standing_cable_row",
        "weighted_pullup_concentric",
        "renegade_row",
        "weighted_pullup_full",
      ]);
      if (upperPull) push("lift", "upper_pull", upperPull, { sets: isInSeason ? 1 : 2, reps: 3 }, "Upper pull — decel chain, posture, and shoulder balance stay in the plan.");

      // 7) Carry / anti-rotation — phase legal, not a junk-volume finisher
      if (isInSeason || isDeep || phaseRes.phase === "os_q3") {
        const carry = pickFirst(isInSeason ? ["paloff_press", "standing_cable_hip_flexor"] : ["waiter_carry", "standing_cable_hip_flexor", "paloff_press"]);
        if (carry) push("lift", "carry_antirotation", carry, { sets: isInSeason ? 1 : undefined, reps: isInSeason ? 6 : undefined }, "Carry / anti-rotation — trunk stiffness that transfers without burying the athlete.");
      }

      // 8) Trunk finisher — offseason only (in-season stays fresh)
      if (isOffseason) {
        const finisher = pickFirst(["heavy_russian_twist"]);
        if (finisher) push("lift", "trunk_finisher", finisher, { sets: 1, reps: 10 }, "Loaded trunk finisher — locks the rotational strength from above.");
      }

      ensureFullBodyLift(rxs, pickFirst, push, isInSeason);
    }

    // -------- Bat-speed (its own card, always pre-lift) --------
    if (!isGameDay) {
      const batSpeedPool = lib.filter((m) => m.category === "bat_speed" && eligible(m));
      const bat = batSpeedPool.find((m) => m.slug === "med_ball_shot_put") ?? batSpeedPool[0];
      if (bat) {
        push("bat_speed", "bat_speed", bat, {}, "Rotational power primer — direct bat-speed transfer. Do BEFORE lifts while CNS is fresh.");
      }
    }

    // -------- Speed work (its own card, cadence-gated, pre-lift) --------
    const lastSpeed = !isGameDay ? await admin
      .from("wk_prescriptions")
      .select("plan_date")
      .eq("user_id", user.id)
      .eq("slot", "speed")
      .order("plan_date", { ascending: false })
      .limit(1)
      .maybeSingle() : { data: null };
    const hoursSinceSpeed = lastSpeed.data?.plan_date
      ? Math.floor((new Date(planDate + "T00:00:00").getTime() - new Date(lastSpeed.data.plan_date + "T00:00:00").getTime()) / 3600000)
      : 9999;
    if (!isGameDay && hoursSinceSpeed >= block.speed_cadence_hours - 6) {
      const speedSet: MovementRow[] = [
        lib.find((m) => m.slug === "accel_10_30y" && eligible(m)),
        lib.find((m) => m.slug === (sport === "baseball" ? "lateral_first_step" : "slap_runner_crossover") && eligible(m)),
        lib.find((m) => m.slug === (sport === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb") && eligible(m)),
      ].filter(Boolean) as MovementRow[];
      for (const m of speedSet) {
        push("speed", "speed", m, {}, `${sport === "baseball" ? "Baseball" : "Softball"} Speed Lab — cadence every ${block.speed_cadence_hours}h.`);
      }
    }

    // -------- Conditioning (its own card, placed next to practice) --------
    if (!isGameDay && !isPostSeason) {
      const conditioning: MovementRow[] = [
        lib.find((m) => m.slug === (sport === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb") && eligible(m)),
        conditioningForPosition(lib, position, eligible),
      ].filter(Boolean) as MovementRow[];
      for (const m of conditioning) {
        push("conditioning", "conditioning", m, {}, "Conditioning belongs next to practice — inning-restart + position-specific.");
      }
    }

    // -------- Cross-sport (its own slot, appended) --------
    const cross = lib.find((m) => m.category === "cross_sport" && eligible(m));
    if (cross && isOffseason) {
      push(
        "cross_sport",
        "cross_sport",
        cross,
        { sets: 1, reps: 1 },
        `Offseason cross-sport conditioning (${block.cross_sport_cadence.replace(/_/g, " ")}). Frees CNS from sport patterns after the main training day.`,
        { placement: "offseason_back_end", sequencing_hint: "Offseason only: do after the primary work, never before an in-season game." },
      );
    }

    const finalRxs = dedupePrescriptions(rxs);

    // -------- Persist --------
    await admin.from("wk_prescriptions").delete().eq("user_id", user.id).eq("plan_date", planDate);
    const rows = finalRxs.map((r) => ({ user_id: user.id, plan_date: planDate, phase: phaseRes.phase, ...r }));
    if (rows.length) {
      const { error: insErr } = await admin.from("wk_prescriptions").insert(rows);
      if (insErr) throw insErr;
    }

    await admin.from("wk_cns_ledger").upsert({
      user_id: user.id, ledger_date: planDate,
      units_spent: cnsUsed, units_cap: cnsCap,
      breakdown: {
        lift: finalRxs.filter((r) => r.slot === "lift").length,
        speed: finalRxs.filter((r) => r.slot === "speed").length,
        bat_speed: finalRxs.filter((r) => r.slot === "bat_speed").length,
        conditioning: finalRxs.filter((r) => r.slot === "conditioning").length,
        cross_sport: finalRxs.filter((r) => r.slot === "cross_sport").length,
      },
    }, { onConflict: "user_id,ledger_date" });

    console.info("[wk-generate-daily] ok v2", {
      user_id: user.id, plan_date: planDate, phase: phaseRes.phase,
      cns_used: cnsUsed, cns_cap: cnsCap, blocks_n: rows.length, game_day: isGameDay,
    });
    return json({
      phase: phaseRes.phase,
      phase_display: phaseRes.displayName,
      game_day: isGameDay,
      cns_used: cnsUsed,
      cns_cap: cnsCap,
      reductions,
      prescriptions: rows,
    });
  } catch (e) {
    console.error("wk-generate-daily error", e);
    return json({ error: (e as Error).message }, 500);
  }
};

function conditioningForPosition(
  lib: MovementRow[],
  position: string | null,
  eligible: (m: MovementRow | undefined | null) => m is MovementRow,
): MovementRow | undefined {
  const pos = (position ?? "").toLowerCase();
  const findEligible = (slug: string) => {
    const m = lib.find((x) => x.slug === slug);
    return eligible(m) ? m : undefined;
  };
  if (pos.includes("catch")) return findEligible("catcher_up_downs");
  if (pos.includes("pitch")) return findEligible("pitcher_field_and_cover");
  if (pos.includes("of") || pos.includes("outfield")) return findEligible("of_read_and_go");
  if (pos === "ss" || pos === "2b" || pos.includes("mid") || pos.includes("infield")) return findEligible("mif_turn_and_fire");
  if (pos.includes("if")) return findEligible("if_lateral_repeat");
  return findEligible("bases_1st_3rd");
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[—–-].*$/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupePrescriptions(rxs: Prescription[]): Prescription[] {
  const seenSlug = new Set<string>();
  const seenName = new Set<string>();
  return rxs.filter((rx) => {
    const nameKey = normalizeName(rx.movement_name);
    if (seenSlug.has(rx.movement_slug) || seenName.has(nameKey)) return false;
    seenSlug.add(rx.movement_slug);
    seenName.add(nameKey);
    return true;
  });
}

function ensureFullBodyLift(
  rxs: Prescription[],
  pickFirst: (slugs: string[]) => MovementRow | undefined,
  push: (
    slot: Slot,
    role: SequenceRole,
    m: MovementRow,
    overrides?: Partial<Prescription>,
    why?: string,
    meta?: Record<string, unknown>,
  ) => boolean,
  isInSeason: boolean,
) {
  const liftRoles = new Set(rxs.filter((r) => r.slot === "lift").map((r) => r.sequence_role));

  if (!liftRoles.has("arm_care")) {
    const m = pickFirst(["crossover_symmetry_full", "jband_full_chart"]);
    if (m) push("lift", "arm_care", m, { sets: 1, reps: 1 }, "Full-body guardrail: arm care is mandatory, not optional.");
  }

  if (!liftRoles.has("trunk_primer")) {
    const m = pickFirst(["paloff_press", "trap_bar_trunk_twist", "contralateral_cross_crawl"]);
    if (m) push("lift", "trunk_primer", m, { sets: 1, reps: isInSeason ? 6 : 10 }, "Full-body guardrail: trunk primer keeps the lift from becoming lower-body-only.");
  }

  if (!liftRoles.has("compound_lower")) {
    const m = pickFirst(isInSeason
      ? ["hip_thrust_concentric", "rdl_concentric", "back_squat_concentric"]
      : ["back_squat_double_ecc", "front_squat_double_ecc", "trap_bar_dl_double_ecc", "hip_thrust_concentric", "back_squat_concentric"]);
    if (m) push("lift", "compound_lower", m, { sets: isInSeason ? 2 : 3, reps: 3 }, "Full-body guardrail: one legal lower-body compound anchors the session.");
  }

  if (!liftRoles.has("unilateral_lower")) {
    const m = pickFirst(isInSeason ? ["lateral_db_step_up", "sl_deadlift_fat_grips"] : ["lateral_db_step_up", "kot_lunge", "sl_deadlift_fat_grips"]);
    if (m) push("lift", "unilateral_lower", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: unilateral work covers side-to-side asymmetry without junk volume.");
  }

  if (!liftRoles.has("upper_push")) {
    const m = pickFirst(isInSeason
      ? ["push_press_concentric", "bench_press_concentric", "sa_db_chest_press", "landmine_row_to_press"]
      : ["sa_db_chest_press", "landmine_row_to_press", "bench_press_concentric", "push_press_concentric"]);
    if (m) push("lift", "upper_push", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: upper push is required so the day is not lower-body-only.");
  }

  if (!liftRoles.has("upper_pull")) {
    const m = pickFirst(isInSeason
      ? ["sa_standing_cable_row", "weighted_pullup_concentric", "renegade_row"]
      : ["weighted_pullup_full", "sa_standing_cable_row", "weighted_pullup_concentric", "renegade_row"]);
    if (m) push("lift", "upper_pull", m, { sets: isInSeason ? 1 : 2, reps: 3 }, "Full-body guardrail: upper pull is mandatory for throwing decel and shoulder balance.");
  }
}

Deno.serve(handler);
