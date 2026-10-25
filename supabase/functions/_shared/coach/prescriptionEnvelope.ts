// Input adapter over existing WIC/Swap judges; no coach-specific training rules.
import { ownsAllGear, avoidsMissingGear } from "../planSwap/simpleSwap.ts";
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
  for (const row of input.rows) {
    const movement = input.catalog.get(row.movement_slug);
    if (!movement || movement.is_active !== true || movement.superseded_by != null) {
      reasons.push(`${row.movement_name}: ask your coach to choose a reviewed Exercise Vault item.`); continue;
    }
    if (Array.isArray(movement.visible_to) && (!input.userId || !movement.visible_to.includes(input.userId))) reasons.push(`${row.movement_name}: this item isn't available to your account. Ask your coach to choose another Exercise Vault item.`);
    if (input.pendingReview?.includes(row.movement_slug)) reasons.push(`${row.movement_name}: its changed gear is waiting for owner review. Save this workout for later.`);
    const dose = row.dosage_unit === "seconds" ? row.duration_seconds : row.dosage_unit === "feet" ? row.distance_feet : row.dosage_unit === "total_reps" ? row.total_reps : row.reps;
    if (typeof dose !== "number" || !Number.isFinite(dose) || dose <= 0 || (row.sets != null && (!Number.isInteger(row.sets) || row.sets <= 0))) reasons.push(`${row.movement_name}: enter an exact positive dose before using this workout.`);
    if (!["seconds", "feet"].includes(row.dosage_unit) && typeof dose === "number" && !Number.isInteger(dose)) reasons.push(`${row.movement_name}: reps and throws must be whole counts.`);
    if (!ownsAllGear(movement, input.owned) || !avoidsMissingGear(movement, input.missing)) reasons.push(`${row.movement_name}: required gear is missing from your saved answers.`);
    const scope = checkDomainGate(movement as any, { engine: row.slot === "hitting" ? "bat_speed" : row.slot === "mobility" ? "recovery" : row.slot,
      sport: input.sport, positions: input.positions, ageYears: input.age, trainingAgeClass: input.trainingAge, seasonPhase: input.final.phase });
    if (!scope.allowed) reasons.push(`${row.movement_name}: this item isn't allowed for your age, position or training phase (${scope.reason}).`);
    const season = isMovementSeasonLegal(seasonContextFromPhase(input.final.phase as any), movement as any);
    if (!season.legal) reasons.push(`${row.movement_name}: this item isn't allowed in your current season.`);
    if (input.blockedIntensityClasses.includes(movement.intensity_class)) reasons.push(`${row.movement_name}: today's recovery check allows lighter work only.`);
    if (!movement.dosage_unit || movement.dosage_unit !== row.dosage_unit) reasons.push(`${row.movement_name}: the measure must match its Exercise Vault entry.`);
    if (row.slot === "lift" && isRepDosed(row.dosage_unit)) {
      if (!isWithinEnvelope(input.final.phase, movement.movement_category, movement.category, row.sets, row.reps)) reasons.push(`${row.movement_name}: the coach's sets and reps are outside your current lifting range.`);
    }
  }
  const final = finalRuleCheck(input.resultingDay, input.final);
  const sessionInput = { prescriptions: input.resultingDay as any, catalog: [...input.catalog.values()] as any,
    template: { seasonPhase: input.final.phase, trainingAge: input.trainingAge, isGameDay: input.isGameDay === true, isRecoveryDay: input.final.liftRemoved },
    availableEquipment: input.owned, trainingAgeClass: input.trainingAge };
  const affected = new Set(input.rows.map(row => row.slot));
  if (affected.has("lift")) reasons.push(...certifyLift(sessionInput).fatal.map(issue => issue.message));
  if (affected.has("speed")) reasons.push(...certifySpeed(sessionInput).fatal.map(issue => issue.message));
  if (affected.has("conditioning")) reasons.push(...certifyConditioning(sessionInput).fatal.map(issue => issue.message));
  if (affected.has("hitting")) reasons.push(...certifyBatSpeed({ ...sessionInput,
    prescriptions: input.resultingDay.map(row => ({ ...row, slot: row.slot === "hitting" ? "bat_speed" : row.slot })) as any,
  }).fatal.map(issue => issue.message));
  if (affected.has("recovery") || affected.has("mobility")) reasons.push(...certifyRecovery(sessionInput).fatal.map(issue => issue.message));
  for (const dropped of final.swaps) {
    if (ADVISORY_PLAN_RULES.has(dropped.rule)) warnings.push({ code: dropped.rule, date: input.final.planDate, rule: `${dropped.slot ?? "Work"}: ${dropped.detail} (${dropped.rule}).` });
    else reasons.push(`Today's ${dropped.slot ?? "work"} would break a plan rule (${dropped.rule}). Keep the saved plan and ask your coach to review it.`);
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
  reasons.push(...governed.trims.map(trim => trim.reason));
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)], warnings, safeOption: reasons.length ? "Safe option: save this workout for later and ask your coach to review the listed items." : null };
}