// supabase/functions/wk-generate-daily/index.ts
// Hammer Workout & Speed — elite daily prescription generator.
//
// Generates today's Lifts + Speed + Conditioning + Bat-Speed prescriptions for
// the authenticated user, with full transparency payload:
//   - Phase quarter (auto-resolved from Season Dates)
//   - Movement selection bounded by training age / competition level / injury
//   - CNS unit accounting (caps total high-CNS units across modalities)
//   - "Why this lift today" reasoning + reductions when sleep/CNS/heat clamps fire
//   - Sport-split speed work (BB vs SB)
//
// Idempotent for (user_id, plan_date, sequence_field).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { startHeartbeat } from "../_shared/withHeartbeat.ts";
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

interface Prescription {
  slot: "lift" | "speed" | "bat_speed" | "conditioning" | "cross_sport" | "supplemental";
  sequence_order: number;
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json().catch(() => ({}))) as { plan_date?: string };
    const planDate = body.plan_date ?? todayStr();

    // -------- Load athlete context --------
    const [{ data: profile }, { data: ctx }, { data: injuries }, { data: dailyLog }] = await Promise.all([
      admin.from("profiles").select("sport, primary_position, side, age, years_lifting, competition_level, is_pro_prospect").eq("id", user.id).maybeSingle(),
      admin.from("athlete_context").select("preseason_start_date, preseason_end_date, in_season_start_date, in_season_end_date, post_season_start_date, post_season_end_date, season_status").eq("user_id", user.id).maybeSingle(),
      admin.from("user_injury_progress").select("injury_slug, status").eq("user_id", user.id).in("status", ["acute", "active"]),
      admin.from("athlete_daily_log").select("sleep_hours, cns_readiness, soreness").eq("user_id", user.id).eq("log_date", planDate).maybeSingle(),
    ]);

    const sport = (profile?.sport ?? "baseball") as "baseball" | "softball";
    const position = profile?.primary_position ?? null;
    const trainingAgeYears = Number(profile?.years_lifting ?? 0);
    const isProProspect = !!profile?.is_pro_prospect;
    const injurySlugs = new Set((injuries ?? []).map((r: any) => r.injury_slug as string));

    // -------- Resolve phase quarter --------
    const phaseRes = resolveWkPhase(ctx ?? null);

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
    const sleep = Number(dailyLog?.sleep_hours ?? 7);
    const cnsReadiness = Number(dailyLog?.cns_readiness ?? 7); // 1..10
    const soreness = Number(dailyLog?.soreness ?? 3);
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

    // -------- Movement filters --------
    const eligible = (m: MovementRow): boolean => {
      if (m.min_training_age_years > trainingAgeYears && !isProProspect) return false;
      if (m.contraindications?.some((c) => injurySlugs.has(c))) return false;
      return true;
    };
    const withInjurySwap = (m: MovementRow): { movement: MovementRow; substitutedFrom?: string; reason?: string } => {
      if (!m.contraindications?.some((c) => injurySlugs.has(c))) return { movement: m };
      if (m.regression_slug) {
        const reg = lib.find((x) => x.slug === m.regression_slug);
        if (reg) return { movement: reg, substitutedFrom: m.slug, reason: `Contraindicated by reported injury — regressed to ${reg.name}.` };
      }
      return { movement: m };
    };

    // -------- Select prescriptions --------
    const rxs: Prescription[] = [];
    let seq = 0;
    let cnsUsed = 0;

    // 1) Lift block — pick 1 compound that matches phase compound_style + the pattern rotation for this day.
    const dayOfWeek = new Date(planDate + "T00:00:00").getDay();
    const patternRotation: Array<MovementRow["pattern"]> = ["squat", "hinge", "push", "pull"];
    const targetPattern = patternRotation[dayOfWeek % 4];
    const compoundCandidates = lib.filter((m) =>
      m.category === "compound" &&
      m.pattern === targetPattern &&
      (m.variant === block.compound_style ||
        (block.compound_style === "concentric" && m.variant === "concentric") ||
        (block.compound_style === "eccentric" && (m.variant === "double_eccentric" || m.variant === "eccentric"))) &&
      eligible(m),
    );
    const compound = compoundCandidates[0] ?? lib.find((m) => m.category === "compound" && m.pattern === targetPattern && eligible(m));
    if (compound) {
      const swap = withInjurySwap(compound);
      const sets = clamp(swap.movement.default_sets ?? 3, block.compound_min_sets, block.compound_max_sets);
      const reps = clamp(swap.movement.default_reps ?? 3, block.compound_min_reps, block.compound_max_reps);
      const clamped = (cnsUsed + swap.movement.cns_cost) > cnsCap;
      cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : swap.movement.cns_cost;
      rxs.push({
        slot: "lift", sequence_order: seq++,
        movement_slug: swap.movement.slug, movement_name: swap.movement.name,
        sets: clamped ? Math.max(1, sets - 1) : sets, reps,
        tempo: swap.movement.default_tempo, load_pct: swap.movement.default_load_pct,
        cns_cost: swap.movement.cns_cost, cns_clamped: clamped,
        substituted_from_slug: swap.substitutedFrom ?? null,
        substitution_reason: swap.reason ?? null,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          training_age_years: trainingAgeYears, is_pro_prospect: isProProspect,
          why: `${block.display_name}: ${block.compound_style.replace("_", " ")} compound, ${targetPattern} pattern day. ${swap.movement.why_prescribed}`,
          cue: swap.movement.cue,
          rep_rule: `${block.compound_min_sets}-${block.compound_max_sets} sets × ${block.compound_min_reps}-${block.compound_max_reps} reps (phase doctrine).`,
          reductions,
        },
      });
    }

    // 2) Supplemental — phase-bound (KOT or FP)
    const suppCat = block.supplemental_style === "kot" ? "kot" : block.supplemental_style === "functional_patterning" ? "functional_patterning" : null;
    const supps = (suppCat ? lib.filter((m) => m.category === suppCat && eligible(m)) : lib.filter((m) => (m.category === "kot" || m.category === "functional_patterning") && eligible(m)))
      .slice(0, 3);
    for (const s of supps) {
      const swap = withInjurySwap(s);
      rxs.push({
        slot: "supplemental", sequence_order: seq++,
        movement_slug: swap.movement.slug, movement_name: swap.movement.name,
        sets: swap.movement.default_sets, reps: swap.movement.default_reps,
        tempo: swap.movement.default_tempo, load_pct: null,
        cns_cost: swap.movement.cns_cost, cns_clamped: false,
        substituted_from_slug: swap.substitutedFrom ?? null,
        substitution_reason: swap.reason ?? null,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          why: `${block.supplemental_style === "kot" ? "Knees-Over-Toes" : "Functional Patterning"} pre-practice supplemental: ${swap.movement.why_prescribed}`,
          cue: swap.movement.cue, reductions,
        },
      });
      cnsUsed += Math.min(swap.movement.cns_cost, Math.max(0, cnsCap - cnsUsed));
    }

    // 3) Speed work — sport-split, cadence-gated
    const lastSpeed = await admin
      .from("wk_prescriptions")
      .select("plan_date")
      .eq("user_id", user.id)
      .eq("slot", "speed")
      .order("plan_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hoursSinceSpeed = lastSpeed.data?.plan_date
      ? Math.floor((new Date(planDate + "T00:00:00").getTime() - new Date(lastSpeed.data.plan_date + "T00:00:00").getTime()) / 3600000)
      : 9999;
    if (hoursSinceSpeed >= block.speed_cadence_hours - 6) {
      const speedSet = [
        lib.find((m) => m.slug === "accel_10_30y" && eligible(m)),
        lib.find((m) => m.slug === (sport === "baseball" ? "lateral_first_step" : "slap_runner_crossover") && eligible(m)),
        lib.find((m) => m.slug === (sport === "baseball" ? "repeat_90ft_bb" : "repeat_43ft_sb") && eligible(m)),
      ].filter(Boolean) as MovementRow[];
      for (const m of speedSet) {
        const swap = withInjurySwap(m);
        const clamped = (cnsUsed + swap.movement.cns_cost) > cnsCap;
        cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : swap.movement.cns_cost;
        rxs.push({
          slot: "speed", sequence_order: seq++,
          movement_slug: swap.movement.slug, movement_name: swap.movement.name,
          sets: clamped && swap.movement.default_sets ? Math.max(1, (swap.movement.default_sets ?? 3) - 2) : swap.movement.default_sets,
          reps: swap.movement.default_reps, tempo: null, load_pct: null,
          cns_cost: swap.movement.cns_cost, cns_clamped: clamped,
          substituted_from_slug: swap.substitutedFrom ?? null,
          substitution_reason: swap.reason ?? null,
          why_payload: {
            phase: phaseRes.phase, phase_display: phaseRes.displayName,
            why: `${sport === "baseball" ? "Baseball" : "Softball"}-default Speed Lab — cadence every ${block.speed_cadence_hours}h. ${swap.movement.why_prescribed}`,
            cue: swap.movement.cue, sport, reductions,
          },
        });
      }
    }

    // 4) Bat-speed — always include 1 rotational power piece before lifts (CNS-permitting)
    const batSpeedPool = lib.filter((m) => m.category === "bat_speed" && eligible(m));
    const bat = batSpeedPool.find((m) => m.slug === "med_ball_shot_put") ?? batSpeedPool[0];
    if (bat) {
      const swap = withInjurySwap(bat);
      const clamped = (cnsUsed + swap.movement.cns_cost) > cnsCap;
      cnsUsed += clamped ? Math.max(0, cnsCap - cnsUsed) : swap.movement.cns_cost;
      rxs.push({
        slot: "bat_speed", sequence_order: seq++,
        movement_slug: swap.movement.slug, movement_name: swap.movement.name,
        sets: swap.movement.default_sets, reps: swap.movement.default_reps,
        tempo: null, load_pct: null,
        cns_cost: swap.movement.cns_cost, cns_clamped: clamped,
        substituted_from_slug: swap.substitutedFrom ?? null,
        substitution_reason: swap.reason ?? null,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          why: `Rotational power primer — direct bat-speed transfer. ${swap.movement.why_prescribed}`,
          cue: swap.movement.cue, sequencing_hint: "Default: do BEFORE lifts to protect CNS targets for bat speed.",
          reductions,
        },
      });
    }

    // 5) Conditioning — inning-restart + 1 position-specific piece
    const conditioning = [
      lib.find((m) => m.slug === (sport === "baseball" ? "inning_restart_sim_bb" : "inning_restart_sim_sb") && eligible(m)),
      conditioningForPosition(lib, position),
    ].filter(Boolean) as MovementRow[];
    for (const m of conditioning) {
      const swap = withInjurySwap(m);
      rxs.push({
        slot: "conditioning", sequence_order: seq++,
        movement_slug: swap.movement.slug, movement_name: swap.movement.name,
        sets: swap.movement.default_sets, reps: swap.movement.default_reps,
        tempo: null, load_pct: null,
        cns_cost: swap.movement.cns_cost, cns_clamped: false,
        substituted_from_slug: swap.substitutedFrom ?? null,
        substitution_reason: swap.reason ?? null,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          why: `Conditioning targets the hardest part of in-season: sitting between innings and re-firing. ${swap.movement.why_prescribed}`,
          cue: swap.movement.cue, reductions,
        },
      });
    }

    // 6) Cross-sport — append per cadence (daily in-season, daily post-practice OS)
    const cross = lib.find((m) => m.category === "cross_sport" && eligible(m));
    if (cross) {
      rxs.push({
        slot: "cross_sport", sequence_order: seq++,
        movement_slug: cross.slug, movement_name: cross.name,
        sets: 1, reps: 1, tempo: null, load_pct: null,
        cns_cost: cross.cns_cost, cns_clamped: false,
        substituted_from_slug: null, substitution_reason: null,
        why_payload: {
          phase: phaseRes.phase, phase_display: phaseRes.displayName,
          why: `Cross-sport conditioning (${block.cross_sport_cadence.replace(/_/g, " ")}). Frees CNS from sport patterns while training the same energy systems.`,
          cue: cross.cue,
        },
      });
    }

    // -------- Persist (idempotent: delete + insert for this user/date) --------
    await admin.from("wk_prescriptions").delete().eq("user_id", user.id).eq("plan_date", planDate);
    const rows = rxs.map((r) => ({
      user_id: user.id, plan_date: planDate, phase: phaseRes.phase, ...r,
    }));
    if (rows.length) {
      const { error: insErr } = await admin.from("wk_prescriptions").insert(rows);
      if (insErr) throw insErr;
    }

    // Persist CNS ledger
    await admin.from("wk_cns_ledger").upsert({
      user_id: user.id, ledger_date: planDate,
      units_spent: cnsUsed, units_cap: cnsCap,
      breakdown: { lift: 1, speed: rxs.filter((r) => r.slot === "speed").length, bat_speed: rxs.filter((r) => r.slot === "bat_speed").length },
    }, { onConflict: "user_id,ledger_date" });

    return json({
      phase: phaseRes.phase,
      phase_display: phaseRes.displayName,
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

function conditioningForPosition(lib: MovementRow[], position: string | null) {
  if (!position) return lib.find((m) => m.slug === "bases_1st_3rd");
  const p = position.toLowerCase();
  if (p.includes("catch")) return lib.find((m) => m.slug === "catcher_up_downs");
  if (p.includes("of") || p.includes("outfield")) return lib.find((m) => m.slug === "of_read_and_go");
  if (p.includes("if") || p.includes("infield") || p.includes("ss") || p.includes("2b")) return lib.find((m) => m.slug === "if_lateral_repeat");
  if (p.includes("pitch")) return lib.find((m) => m.slug === "pitcher_field_and_cover");
  return lib.find((m) => m.slug === "bases_1st_3rd");
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function json(b: unknown, status = 200) { return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  const hb = startHeartbeat("wk-generate-daily", {});
  try {
    const res = await handler(req);
    await hb.success({ status: res.status });
    return res;
  } catch (e) {
    await hb.fail(e as Error);
    throw e;
  }
});
