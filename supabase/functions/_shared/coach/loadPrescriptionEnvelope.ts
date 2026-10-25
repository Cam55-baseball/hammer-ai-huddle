import { judgeCoachEnvelope } from "./prescriptionEnvelope.ts";
import { injuryWords, rememberedMissingGear } from "../planSwap/simpleSwap.ts";
import { resolvePhaseState } from "../phaseState.ts";
import { ageFromDob } from "../age/ageFromDob.ts";
import { classifyTrainingAge } from "../wic/trainingAge.ts";
import { fetchShadowData, decideFromRaw } from "../wic/schedule/tissueCost/shadow/run.ts";
import { applyDecision } from "../wic/schedule/tissueCost/apply.ts";
import { buildLedger, classify, computeRm28, wasBuildDay } from "../wic/exposure/ledger.ts";
import { checkInReductions, latestCheckInValues } from "../wic/checkInReductions.ts";
import { CHANNELS } from "../wic/exposure/types.ts";
import { dayKinds } from "../wic/schedule/finalCheck.ts";
import { mergeExternal } from "../wic/schedule/externalTraining.ts";
import { loadU13ThrowBlock } from "../wic/phases/u13ThrowGate.ts";
import { categorySlots, type RxCategory } from "./prescriptionSafety.ts";
import { savedDayCoverage } from "./savedDayCoverage.ts";
import { pendingEquipmentReviews } from "../vault/equipmentReview.ts";
import { checkCoachArmLoad } from "./armLoadCheck.ts";
import { workloadWarning, type CoachGuidelineWarning } from "./guidelineWarnings.ts";

type Row = Record<string, any>;
const shift = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
async function checked(query: any) { const result = await query; if (result.error) throw result.error; return result.data; }
/** Same read adapter as the builder, with read failures preserved rather than defaulted. */
function strictDb(admin: any) {
  const wrap = (query: any): any => new Proxy(query, { get(target, key) {
    if (key === "then") return (resolve: any, reject: any) => Promise.resolve(target).then((result: any) => { if (result.error) throw result.error; return resolve(result); }).catch(reject);
    const value = target[key];
    return typeof value === "function" ? (...args: any[]) => wrap(value.apply(target, args)) : value;
  } });
  return { from: (table: string) => wrap(admin.from(table)) };
}

export async function loadPrescriptionEnvelope(admin: any, userId: string, date: string, category: RxCategory, rows: Row[], replace: boolean) {
  const warnings: CoachGuidelineWarning[] = [];
  const from = shift(date, -365);
  const [profile, context, settings, inventory, answers, current, arm, external, raw, events, intent, snapshots] = await Promise.all([
    checked(admin.from("profiles").select("date_of_birth,positions").eq("id", userId).maybeSingle()),
    checked(admin.from("athlete_context").select("*").eq("user_id", userId).maybeSingle()),
    checked(admin.from("athlete_mpi_settings").select("*").eq("user_id", userId).maybeSingle()),
    checked(admin.from("athlete_equipment_context").select("*").eq("user_id", userId).order("created_at", { ascending: false })),
    checked(admin.from("athlete_equipment_memory").select("confirmed_have,confirmed_lacks").eq("user_id", userId).or(`scope.eq.always,plan_date.eq.${date}`).order("created_at", { ascending: true })),
    checked(admin.from("wk_prescriptions").select("*").eq("user_id", userId).eq("plan_date", date).not("status", "in", "(skipped,missed)")),
    checked(admin.from("arm_ledger_entries").select("entry_date,source,throw_type,count,status").eq("user_id", userId).gte("entry_date", from).lte("entry_date", date).limit(20000)),
    checked(admin.rpc("wk_external_training_days", { p_user: userId, p_from: shift(date, -13), p_to: date })),
    fetchShadowData(strictDb(admin), userId, date, "UTC"),
    checked(admin.from("asb_events").select("topic_id,payload,occurred_at").eq("athlete_id", userId).in("topic_id", ["behavioral.readiness", "behavioral.soreness", "behavioral.fatigue", "behavioral.sleep"]).gte("occurred_at", `${shift(date, -1)}T12:00:00Z`).lt("occurred_at", `${shift(date, 1)}T00:00:00Z`).order("occurred_at", { ascending: false }).limit(20)),
    checked(admin.from("user_day_state_overrides").select("type").eq("user_id", userId).eq("date", date).maybeSingle()),
    checked(admin.from("athlete_plan_snapshots").select("sport,payload").eq("user_id", userId).eq("plan_date", date)),
  ]);
  const refused = (reason: string) => ({ allowed: false, reasons: [reason], safeOption: "Safe option: save for later and finish your check-in or ask your coach to review it.", rows: [] as Row[] });
  if (!profile || !context || !settings || !["baseball", "softball"].includes(context.sport_primary)) return refused("Your current player and season details couldn't be checked. Nothing was changed.");
  const age = ageFromDob(profile.date_of_birth, date);
  if (age == null || context.lifting_age_years == null) return refused("Confirm your age and training experience before using this workout.");
  const snapshot = snapshots?.find((s: Row) => s.sport === context.sport_primary);
  if (!savedDayCoverage(snapshot?.payload, current)) return refused("Today's saved skill work couldn't be included in the full workload check. Keep your plan and save this workout for later.");
  const savedPhases = current.map((r: Row) => r.why_payload?.phase_state).filter(Boolean);
  const savedPhase = savedPhases[0];
  if (!savedPhase || savedPhases.length !== current.length || savedPhase.date !== date || savedPhases.some((p: Row) => p.date !== date || p.season !== savedPhase.season || p.sub_block !== savedPhase.sub_block || p.lighter_week !== savedPhase.lighter_week || p.growth !== savedPhase.growth)) return refused("Today's saved training phase couldn't be confirmed. Your plan is unchanged.");
  const phase = resolvePhaseState({ settings, date, heights: raw.heights, plannedDeload: savedPhase.lighter_week === "planned", trendLighter: savedPhase.lighter_week === "trend" });
  if (phase.sub_block !== savedPhase.sub_block || phase.season !== savedPhase.season || phase.growth !== savedPhase.growth) return refused("Your season or growth details changed. Refresh your plan before using this workout.");
  const owned = new Set<string>((inventory ?? []).find((r: Row) => !r.valid_until || Date.parse(r.valid_until) > Date.now())?.equipment ?? []);
  for (const answer of answers ?? []) { for (const gear of answer.confirmed_have ?? []) owned.add(gear); for (const gear of answer.confirmed_lacks ?? []) owned.delete(gear); }
  const slugs = [...new Set([...rows, ...current, ...raw.prescriptions].map((r: Row) => r.movement_slug).filter(Boolean))];
  const catalogRows = await checked(admin.from("wk_movement_catalog").select("*").in("slug", slugs));
  const reviewEvents = await checked(admin.from("exercise_vault_audit").select("slug,action,at").in("slug", slugs).in("action", ["equipment_corrected", "review_approved", "make_live"]).order("at", { ascending: false }));
  const catalog = new Map<string, Row>((catalogRows ?? []).map((row: Row) => [row.slug, row]));
  const proposed: Row[] = rows.map(row => ({ ...row, phase: phase.sub_block, cns_cost: catalog.get(row.movement_slug)?.cns_cost ?? null, why_payload: { ...row.why_payload, phase_state: phase } }));
  const undeclared = proposed.find(row => typeof row.cns_cost !== "number" || !Number.isFinite(row.cns_cost) || row.cns_cost < 0);
  if (undeclared) return refused(undeclared.movement_slug
    ? `${undeclared.movement_name}: its workload isn't declared in Exercise Vault. Ask your coach to choose a reviewed item.`
    : `${undeclared.movement_name}: coach-written items have no reviewed workload, so today's load limit can't be checked exactly. Ask your coach to build it from Exercise Vault items.`);
  const resultingDay = [...current.filter((r: Row) => !(replace && categorySlots(category).includes(r.slot) && r.status !== "completed")), ...proposed];
  if (current.some((row: Row) => typeof row.cns_cost !== "number" || !Number.isFinite(row.cns_cost) || row.cns_cost < 0)) return refused("Today's saved workload couldn't be checked. Nothing was changed.");
  const decision = decideFromRaw(raw).decision;
  const ledger = await checked(admin.from("wk_cns_ledger").select("units_spent,units_cap").eq("user_id", userId).eq("ledger_date", date).maybeSingle());
  if (!ledger || !Number.isFinite(ledger.units_cap) || !Number.isFinite(ledger.units_spent) || ledger.units_cap < 0 || ledger.units_spent < 0) return refused("Today's saved workload limit is missing. Open your plan and finish your check-in first.");
  const freshCheckIn = latestCheckInValues(events ?? []);
  if (!freshCheckIn) return refused("Finish today's check-in before using this workout. Your saved plan is unchanged.");
  const dayIntent = ["rest", "skip", "push"].includes(intent?.type) ? intent.type : null;
  const freshCap = checkInReductions(ledger.units_cap, freshCheckIn, dayIntent).cnsCap;
  const isGameDay = raw.games.some(g => g.game_date === date && !g.deleted_at && !g.ignored_for_training);
  const recovery = applyDecision({ ...decision, blockCnsCap: Math.min(ledger.units_cap, freshCap), isGameDay, planDate: date });
  const removedCost = replace ? current.filter((r: Row) => categorySlots(category).includes(r.slot) && r.status !== "completed").reduce((n: number, r: Row) => n + Number(r.cns_cost ?? 0), 0) : 0;
  const proposedCost = proposed.reduce((n, row) => n + Number(row.cns_cost), 0);
  const resultingCost = Math.max(0, Number(ledger.units_spent) - removedCost) + proposedCost;
  if (resultingCost > recovery.cnsCap) warnings.push(workloadWarning(date, resultingCost, recovery.cnsCap));
  const injuries = injuryWords(context.injury_history);
  if (injuries.length || raw.dailyLogs.some(d => d.entry_date === date && d.injury_mode) || raw.quizzes.some(q => q.entry_date === date && Number(q.pain_scale) > 0)) return refused("Pain or injury is recorded. Keep your current recovery plan and ask your coach before changing work.");
  const throwing = proposed.filter(row => ["throws", "pitches", "innings"].includes(row.dosage_unit) || classify(catalog.get(row.movement_slug) as any)?.channel === "THROW");
  if (throwing.some(row => row.reps == null || row.sets == null)) return refused("Throwing items need an exact throw count before your arm limit can be checked.");
  // Innings have no exact throw count; never guess one into the arm ledger.
  if (throwing.some(row => row.dosage_unit === "innings")) return refused("Innings can't be checked against your arm limit. Ask your coach for an exact throw or pitch count.");
  if (throwing.length) {
    // Same judges the plan's arm ledger and Ramp Law use — one budget, logged
    // plus planned throws added together, stricter role rule wins. No
    // coach-specific rules (see _shared/coach/armLoadCheck.ts).
    const armCheck = checkCoachArmLoad({
      sport: context.sport_primary, positions: profile.positions ?? [], age, growthMode: phase.growth, date,
      entries: (arm ?? []) as any,
      planned: throwing.map(row => ({
        count: row.dosage_unit === "total_reps" ? row.total_reps : row.sets * row.reps,
        kind: row.dosage_unit === "pitches" ? "pitch" as const : "practice" as const,
        intensityClass: catalog.get(row.movement_slug)?.intensity_class ?? null,
      })),
      gameDates: raw.games.filter((g: Row) => !g.deleted_at && !g.ignored_for_training).map((g: Row) => g.game_date),
    });
    if (!armCheck.allowed) return refused(armCheck.reason ?? "Your arm-health limit requires review before changing work.");
  }
  const previous = raw.prescriptions.filter(row => row.plan_date < date);
  const priorKinds: any = {};
  for (const kind of dayKinds(previous.filter(row => row.plan_date === shift(date, -1)), catalog)) priorKinds[kind] = [shift(date, -1)];
  const merged = mergeExternal(external ?? [], date, [...new Set(previous.filter(row => row.slot === "lift").map(row => row.plan_date))], priorKinds);
  const history = buildLedger(raw, Object.fromEntries(catalog) as any);
  const result = judgeCoachEnvelope({ userId, rows: proposed, resultingDay, catalog, pendingReview: pendingEquipmentReviews(reviewEvents ?? []).map(row => row.slug), owned: [...owned], missing: [...rememberedMissingGear(answers ?? [])], age,
    trainingAge: classifyTrainingAge({ yearsLifting: context.lifting_age_years, isProProspect: false, competitiveLevel: context.competition_level }), trainingYears: context.lifting_age_years,
    sport: context.sport_primary, positions: profile.positions ?? [], blockedIntensityClasses: recovery.blockedIntensityClasses, isGameDay,
    final: { planDate: date, phase: phase.sub_block, age, growthMode: phase.growth, ...merged, restDaysBetweenLifts: 2, weeklyLiftMax: phase.sub_block === "in_season" ? 2 : null, liftRemoved: recovery.removeLift,
      u13ThrowBlock: await loadU13ThrowBlock(strictDb(admin), userId, age, date), catalog, gameTomorrow: raw.games.some(g => g.game_date === shift(date, 1) && !g.deleted_at && !g.ignored_for_training) },
    rm28: computeRm28(history, date), governor: { block: phase.sub_block === "os_q1" ? "B1" : phase.sub_block === "os_q2" ? "B2" : phase.sub_block === "os_q3" ? "B3" : phase.sub_block === "os_q4" ? "B4" : "B5", inSeason: phase.season === "in_season", growthMode: phase.growth, buildYesterday: CHANNELS.filter(ch => wasBuildDay(history, shift(date, -1), ch)) },
  });
  return { ...result, warnings: [...warnings, ...result.warnings], rows: proposed, cnsResult: resultingCost };
}