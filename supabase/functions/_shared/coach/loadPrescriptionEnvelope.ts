import { judgeCoachEnvelope } from "./prescriptionEnvelope.ts";
import { injuryWords, rememberedMissingGear } from "../planSwap/simpleSwap.ts";
import { resolvePhaseState } from "../phaseState.ts";
import { ageFromDob } from "../age/ageFromDob.ts";
import { classifyTrainingAge } from "../wic/trainingAge.ts";
import { fetchShadowData, decideFromRaw } from "../wic/schedule/tissueCost/shadow/run.ts";
import { applyDecision } from "../wic/schedule/tissueCost/apply.ts";
import { buildLedger, computeRm28, wasBuildDay } from "../wic/exposure/ledger.ts";
import { CHANNELS } from "../wic/exposure/types.ts";
import { dayKinds } from "../wic/schedule/finalCheck.ts";
import { mergeExternal } from "../wic/schedule/externalTraining.ts";
import { loadU13ThrowBlock } from "../wic/phases/u13ThrowGate.ts";
import { equivalentsByDay } from "../wic/phases/nextThrowDate.ts";
import { growthAdjustment, checkCaps, pitchSmartApplies } from "../wic/phases/youthThrowing.ts";
import { armBudget, windmillCheck } from "../wic/phases/armLedger.ts";
import { categorySlots, type RxCategory } from "./prescriptionSafety.ts";

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
  const from = shift(date, -365);
  const [profile, context, settings, inventory, answers, current, arm, external, raw] = await Promise.all([
    checked(admin.from("profiles").select("date_of_birth,positions").eq("id", userId).maybeSingle()),
    checked(admin.from("athlete_context").select("*").eq("user_id", userId).maybeSingle()),
    checked(admin.from("athlete_mpi_settings").select("*").eq("user_id", userId).maybeSingle()),
    checked(admin.from("athlete_equipment_context").select("*").eq("user_id", userId).order("created_at", { ascending: false })),
    checked(admin.from("athlete_equipment_memory").select("confirmed_have,confirmed_lacks").eq("user_id", userId).or(`scope.eq.always,plan_date.eq.${date}`).order("created_at", { ascending: true })),
    checked(admin.from("wk_prescriptions").select("*").eq("user_id", userId).eq("plan_date", date).not("status", "in", "(skipped,missed)")),
    checked(admin.from("arm_ledger_entries").select("entry_date,source,throw_type,count,status").eq("user_id", userId).gte("entry_date", from).lte("entry_date", date).limit(20000)),
    checked(admin.rpc("wk_external_training_days", { p_user: userId, p_from: shift(date, -13), p_to: date })),
    fetchShadowData(strictDb(admin), userId, date, "UTC"),
  ]);
  const refused = (reason: string) => ({ allowed: false, reasons: [reason], safeOption: "Safe option: save for later and finish your check-in or ask your coach to review it.", rows: [] as Row[] });
  if (!profile || !context || !settings || !["baseball", "softball"].includes(context.sport_primary)) return refused("Your current player and season details couldn't be checked. Nothing was changed.");
  const age = ageFromDob(profile.date_of_birth, date);
  if (age == null || context.lifting_age_years == null) return refused("Confirm your age and training experience before using this workout.");
  const phase = resolvePhaseState({ settings, date, heights: raw.heights });
  const owned = new Set<string>((inventory ?? []).find((r: Row) => !r.valid_until || Date.parse(r.valid_until) > Date.now())?.equipment ?? []);
  for (const answer of answers ?? []) { for (const gear of answer.confirmed_have ?? []) owned.add(gear); for (const gear of answer.confirmed_lacks ?? []) owned.delete(gear); }
  const slugs = [...new Set([...rows, ...current, ...raw.prescriptions].map((r: Row) => r.movement_slug).filter(Boolean))];
  const catalogRows = await checked(admin.from("wk_movement_catalog").select("*").in("slug", slugs));
  const catalog = new Map<string, Row>((catalogRows ?? []).map((row: Row) => [row.slug, row]));
  const proposed = rows.map(row => ({ ...row, phase: phase.sub_block, cns_cost: catalog.get(row.movement_slug)?.cns_cost ?? null }));
  if (proposed.some(row => row.cns_cost == null)) return refused("An exercise's workload isn't declared in Exercise Vault. Ask your coach to choose a reviewed item.");
  const resultingDay = [...current.filter((r: Row) => !(replace && categorySlots(category).includes(r.slot) && r.status !== "completed")), ...proposed];
  const decision = decideFromRaw(raw).decision;
  const ledger = await checked(admin.from("wk_cns_ledger").select("units_spent,units_cap").eq("user_id", userId).eq("ledger_date", date).maybeSingle());
  if (!ledger || ledger.units_cap == null) return refused("Today's saved workload limit is missing. Open your plan and finish your check-in first.");
  const recovery = applyDecision({ ...decision, blockCnsCap: ledger.units_cap, isGameDay: raw.games.some(g => g.game_date === date && !g.deleted_at && !g.ignored_for_training), planDate: date });
  const removedCost = replace ? current.filter((r: Row) => categorySlots(category).includes(r.slot) && r.status !== "completed").reduce((n: number, r: Row) => n + Number(r.cns_cost ?? 0), 0) : 0;
  const proposedCost = proposed.reduce((n, row) => n + Number(row.cns_cost), 0);
  if (Math.max(0, Number(ledger.units_spent) - removedCost) + proposedCost > recovery.cnsCap) return refused("This workout would pass today's saved workload limit. Ask your coach for a lighter version.");
  const injuries = injuryWords(context.injury_history);
  if (injuries.length || raw.dailyLogs.some(d => d.entry_date === date && d.injury_mode) || raw.quizzes.some(q => q.entry_date === date && Number(q.pain_scale) > 0)) return refused("Pain or injury is recorded. Keep your current recovery plan and ask your coach before changing work.");
  const throwing = proposed.filter(row => row.dosage_unit === "throws" || catalog.get(row.movement_slug)?.exposure_channel?.toLowerCase() === "throwing");
  if (throwing.some(row => row.reps == null || row.sets == null)) return refused("Throwing items need an exact throw count before your arm limit can be checked.");
  const throws = throwing.reduce((n, row) => n + row.reps * row.sets, 0);
  if (throws > 0) {
    const byDay = equivalentsByDay(arm ?? []);
    const daily = byDay.get(date) ?? 0;
    if (context.sport_primary === "baseball" && pitchSmartApplies(age, context.competition_level)) {
      const growth = growthAdjustment(age, raw.heights ?? [], date);
      if (daily + throws > growth.band.dailyMax) return refused("This workout would pass today's pitch-count limit. Save it for later.");
      const sum = (start: string) => [...byDay].filter(([day]) => day >= start).reduce((n, [, amount]) => n + amount, 0);
      const caps = checkCaps(age, context.competition_level, { week: sum(shift(date, -6)), season: sum(String(settings.in_season_start_date ?? from)), year: sum(from), inningsYear: 0 }, throws);
      if (caps.blocked) return refused(caps.blocks[0] ?? "Your arm needs rest before more throws.");
    } else {
      const positions = profile.positions ?? [];
      const role = positions.some((p: string) => /pitch|^p$/i.test(p)) ? "pitcher" : positions.some((p: string) => /catch|^c$/i.test(p)) ? "catcher" : "position";
      const budget = armBudget({ sport: context.sport_primary, role, age });
      const weekly = [...byDay].filter(([day]) => day >= shift(date, -6)).reduce((n, [, amount]) => n + amount, 0);
      if (daily + throws > budget.daily || weekly + throws > budget.weekly) return refused("This workout would pass your arm's daily or weekly limit. Save it for later.");
      if (context.sport_primary === "softball" && category === "pitching") {
        const problems = windmillCheck(age, [...byDay].map(([day, count]) => ({ date: day, pitches: count, innings: 0 })), date, { pitches: daily + throws, innings: 0 });
        if (problems.length) return refused(problems[0]);
      }
    }
  }
  const previous = raw.prescriptions.filter(row => row.plan_date < date);
  const priorKinds: any = {};
  for (const kind of dayKinds(previous.filter(row => row.plan_date === shift(date, -1)), catalog)) priorKinds[kind] = [shift(date, -1)];
  const merged = mergeExternal(external ?? [], date, [...new Set(previous.filter(row => row.slot === "lift").map(row => row.plan_date))], priorKinds);
  const history = buildLedger(raw, Object.fromEntries(catalog) as any);
  const result = judgeCoachEnvelope({ rows: proposed, resultingDay, catalog, owned: [...owned], missing: [...rememberedMissingGear(answers ?? [])], age,
    trainingAge: classifyTrainingAge({ yearsLifting: context.lifting_age_years, isProProspect: false, competitiveLevel: context.competition_level }), trainingYears: context.lifting_age_years,
    sport: context.sport_primary, positions: profile.positions ?? [], blockedIntensityClasses: recovery.blockedIntensityClasses,
    final: { planDate: date, phase: phase.sub_block, age, growthMode: phase.growth, ...merged, restDaysBetweenLifts: 2, weeklyLiftMax: phase.sub_block === "in_season" ? 2 : null, liftRemoved: recovery.removeLift,
      u13ThrowBlock: await loadU13ThrowBlock(strictDb(admin), userId, age, date), catalog, gameTomorrow: raw.games.some(g => g.game_date === shift(date, 1) && !g.deleted_at && !g.ignored_for_training) },
    rm28: computeRm28(history, date), governor: { block: phase.sub_block === "os_q1" ? "B1" : phase.sub_block === "os_q2" ? "B2" : phase.sub_block === "os_q3" ? "B3" : phase.sub_block === "os_q4" ? "B4" : "B5", inSeason: phase.season === "in_season", growthMode: phase.growth, buildYesterday: CHANNELS.filter(ch => wasBuildDay(history, shift(date, -1), ch)) },
  });
  return { ...result, rows: proposed };
}