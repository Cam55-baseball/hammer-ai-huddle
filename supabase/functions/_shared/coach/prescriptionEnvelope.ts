// Input adapter over existing WIC/Swap judges; no coach-specific training rules.
import { ownsAllGear, avoidsMissingGear, requiredGear } from "../planSwap/simpleSwap.ts";
import { checkDomainGate } from "../wic/domainGate.ts";
import { isMovementSeasonLegal, seasonContextFromPhase } from "../wic/season.ts";
import { finalRuleCheck, type FinalCheckContext } from "../wic/schedule/finalCheck.ts";
import { isWithinEnvelope, isRepDosed } from "../wic/dosage/doctrine.ts";
import { classify, amountPerSet, type CatalogFact } from "../wic/exposure/ledger.ts";
import { runGovernor, type GovernorContext } from "../wic/exposure/governor.ts";
import type { GovItem, Rm28 } from "../wic/exposure/types.ts";
import { certifyLift } from "../wic/lift/sessionBuilder.ts";
import { certifySpeed } from "../wic/speed/sessionBuilder.ts";
import { certifyConditioning } from "../wic/conditioning/sessionBuilder.ts";
import { certifyBatSpeed } from "../wic/batSpeed/sessionBuilder.ts";
import { certifyRecovery } from "../wic/recovery/sessionBuilder.ts";
import { ADVISORY_PLAN_RULES, type CoachGuidelineWarning } from "./guidelineWarnings.ts";

type Row = Record<string, any>;
export function judgeCoachEnvelope(input: {
  rows: Row[]; resultingDay: Row[]; catalog: Map<string, Row>; owned: string[]; missing: string[];
  age: number | null; trainingAge: string; trainingYears: number; sport: string; positions: string[];
  final: FinalCheckContext; rm28: Rm28; governor: GovernorContext; blockedIntensityClasses: string[];
  isGameDay?: boolean;
  pendingReview?: readonly string[];
  userId?: string;
}) {
  const reasons: string[] = [];
  const warnings: CoachGuidelineWarning[] = [];
  const date = input.final.planDate;
  for (const row of input.rows) {
    const movement = input.catalog.get(row.movement_slug);
    if (!movement || movement.is_active !== true || movement.superseded_by != null) {
      reasons.push(`${row.movement_name}: ask your coach to choose a reviewed Exercise Vault item.`); continue;
    }
    if (Array.isArray(movement.visible_to) && (!input.userId || !movement.visible_to.includes(input.userId))) reasons.push(`${row.movement_name}: this item isn't available to your account. Ask your coach to choose another Exercise Vault item.`);
    if (input.pendingReview?.includes(row.movement_slug)) reasons.push(`${row.movement_name}: its changed gear is waiting for owner review. Save this workout for later.`);
    const dose = row.dosage_unit === "seconds" ? row.duration_seconds : row.dosage_unit === "feet" ? row.distance_feet : row.dosage_unit === "total_reps" ? row.total_reps : row.reps;
    if (typeof dose !== "number" || !Number.isFinite(dose) || dose <= 0 || (row.sets != null && (!Number.isInteger(row.sets) || row.sets <= 0))) reasons.push(`${row.movement_name}: enter an exact positive dose. Fix this entry.`);
    if (!["seconds", "feet"].includes(row.dosage_unit) && typeof dose === "number" && !Number.isInteger(dose)) reasons.push(`${row.movement_name}: reps and throws must be whole counts. Fix this entry.`);
    if (!ownsAllGear(movement, input.owned) || !avoidsMissingGear(movement, input.missing)) {
      const reported = requiredGear(movement).filter(gear => input.missing.includes(gear));
      const detail = reported.length ? `Player reported no ${reported.map(gear => gear.replace(/_/g, " ")).join(" or ")}.` : `Required equipment is not confirmed in the player's saved answers: ${requiredGear(movement).map(gear => gear.replace(/_/g, " ")).join(", ")}.`;
      warnings.push({ code: "missing_equipment", date: input.final.planDate, rule: `${row.movement_name}: ${detail}` });
    }
    const scope = checkDomainGate(movement as any, { engine: row.slot === "hitting" ? "bat_speed" : row.slot === "mobility" ? "recovery" : row.slot,
      sport: input.sport, positions: input.positions, ageYears: input.age, trainingAgeClass: input.trainingAge, seasonPhase: input.final.phase });
    if (!scope.allowed) warnings.push({ code: "age_gate", date, medical: true, rule: `${row.movement_name}: normally held for age ${input.age ?? "unknown"}, this position or the ${input.final.phase} phase (${scope.reason}).` });
    const season = isMovementSeasonLegal(seasonContextFromPhase(input.final.phase as any), movement as any);
    // Owner law L0.3: in-season eccentric overload is never legal on any path.
    if (!season.legal && movement.eccentric_overload === true && /in_season|post_season/.test(String(input.final.phase))) reasons.push(`${row.movement_name}: eccentric-overload work is never allowed in season. Fix this entry.`);
    else if (!season.legal) warnings.push({ code: "season_rule", date, rule: `${row.movement_name}: normally held during the ${input.final.phase} phase.` });
    if (input.blockedIntensityClasses.includes(movement.intensity_class)) warnings.push({ code: "recovery_intensity", date, rule: `${row.movement_name}: today's recovery check normally allows lighter work only (${movement.intensity_class} intensity).` });
    if (!movement.dosage_unit || movement.dosage_unit !== row.dosage_unit) reasons.push(`${row.movement_name}: the measure must match its Exercise Vault entry. Fix this entry.`);
    if (row.slot === "lift" && isRepDosed(row.dosage_unit)) {
      if (!isWithinEnvelope(input.final.phase, movement.movement_category, movement.category, row.sets, row.reps)) warnings.push({ code: "dose_range", date: input.final.planDate, rule: `${row.movement_name}: prescribed ${row.sets} sets × ${row.reps} reps is outside the lifting range for ${input.final.phase}.` });
    }
  }
  const final = finalRuleCheck(input.resultingDay, input.final);
  const sessionInput = { prescriptions: input.resultingDay as any, catalog: [...input.catalog.values()] as any,
    template: { seasonPhase: input.final.phase, trainingAge: input.trainingAge, isGameDay: input.isGameDay === true, isRecoveryDay: input.final.liftRemoved },
    availableEquipment: input.owned, trainingAgeClass: input.trainingAge };
  const affected = new Set(input.rows.map(row => row.slot));
  const addIssues = (issues: Array<{ code: string; message: string }>) => {
    for (const issue of issues) {
      if (issue.code.endsWith("_illegal_equipment")) warnings.push({ code: "missing_equipment", date: input.final.planDate, rule: issue.message });
      else reasons.push(issue.message);
    }
  };
  if (affected.has("lift")) addIssues(certifyLift(sessionInput).fatal);
  if (affected.has("speed")) addIssues(certifySpeed(sessionInput).fatal);
  if (affected.has("conditioning")) addIssues(certifyConditioning(sessionInput).fatal);
  if (affected.has("hitting")) addIssues(certifyBatSpeed({ ...sessionInput,
    prescriptions: input.resultingDay.map(row => ({ ...row, slot: row.slot === "hitting" ? "bat_speed" : row.slot })) as any,
  }).fatal);
  if (affected.has("recovery") || affected.has("mobility")) addIssues(certifyRecovery(sessionInput).fatal);
  for (const dropped of final.swaps) {
    if (ADVISORY_PLAN_RULES.has(dropped.rule)) warnings.push({ code: dropped.rule, date: input.final.planDate, rule: `${dropped.slot ?? "Work"}: ${dropped.detail} (${dropped.rule}).` });
    else warnings.push({ code: /u13|age/i.test(dropped.rule) ? "age_gate" : "plan_rule", date, medical: /u13|age/i.test(dropped.rule) || undefined, rule: `${dropped.slot ?? "Work"}: ${dropped.detail} (${dropped.rule}).` });
  }
  const items: GovItem[] = [];
  for (const row of input.resultingDay) {
    const fact = input.catalog.get(row.movement_slug) as CatalogFact | undefined;
    const channel = classify(fact);
    if (!fact) {
      reasons.push(`${row.movement_name}: today's saved exercise is missing its Exercise Vault workload details.`);
      continue;
    }
    if (!channel) continue;
    // Shared amountPerSet defaults a missing contact declaration to one.
    // Acceptance cannot certify that fallback as the athlete's exact load.
    if ((channel.channel === "JUMP" || channel.channel === "UB_PLYO") &&
        (typeof fact.contacts_per_rep !== "number" || !Number.isInteger(fact.contacts_per_rep) || fact.contacts_per_rep <= 0)) {
      reasons.push(`${row.movement_name}: its contacts per rep aren't declared in Exercise Vault. Keep your plan and save this workout for later.`);
      continue;
    }
    const sets = row.sets ?? 1;
    const reps = row.dosage_unit === "total_reps" ? row.total_reps / sets : row.reps;
    // amountPerSet has builder defaults. A coach acceptance must not promote
    // missing counts/distances into a certified one-rep exposure.
    if (!Number.isInteger(sets) || sets <= 0 ||
        (channel.channel !== "LIFT" && (typeof reps !== "number" || !Number.isFinite(reps) || reps <= 0)) ||
        (channel.channel === "SPRINT" && (typeof row.distance_feet !== "number" || !Number.isFinite(row.distance_feet) || row.distance_feet <= 0))) {
      reasons.push(`${row.movement_name}: today's saved workload needs exact counts and distance. Keep your plan and save this workout for later.`);
      continue;
    }
    items.push({ slug: row.movement_slug, name: row.movement_name, ...channel, sets,
      amountPerSet: amountPerSet(fact, channel.channel, reps, row.distance_feet), floorSets: 1, substitutionFamily: fact.substitution_family ?? null });
  }
  const governed = runGovernor({ items, rm28: input.rm28, ctx: input.governor });
  for (const trim of governed.trims) {
    if (trim.channel === "THROW") warnings.push({ code: "arm_limit", date, medical: true, rule: trim.reason });
    else {
      const diagnostic = governed.diagnostics[trim.channel];
      warnings.push({ code: "workload_cap", date: input.final.planDate, rule: `${trim.reason}${diagnostic ? ` Planned ${diagnostic.planned_before ?? trim.from.amount}; cap ${diagnostic.cap ?? "not established"}.` : ""}` });
    }
  }
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)], warnings, safeOption: reasons.length ? "Safe option: save this workout for later and ask your coach to review the listed items." : null };
}