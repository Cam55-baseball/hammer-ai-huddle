// Input adapter over existing WIC/Swap judges; no coach-specific training rules.
import { ownsAllGear, avoidsMissingGear } from "../planSwap/simpleSwap.ts";
import { checkAthleteScope } from "../wic/domainGate.ts";
import { isMovementSeasonLegal, seasonContextFromPhase } from "../wic/season.ts";
import { finalRuleCheck, type FinalCheckContext } from "../wic/schedule/finalCheck.ts";
import { isWithinEnvelope, isRepDosed } from "../wic/dosage/doctrine.ts";
import { classify, amountPerSet, type CatalogFact } from "../wic/exposure/ledger.ts";
import { runGovernor, type GovernorContext } from "../wic/exposure/governor.ts";
import type { GovItem, Rm28 } from "../wic/exposure/types.ts";
import { certifyLift } from "../wic/lift/sessionBuilder.ts";
import { certifySpeed } from "../wic/speed/sessionBuilder.ts";
import { certifyConditioning } from "../wic/conditioning/sessionBuilder.ts";

type Row = Record<string, any>;
export function judgeCoachEnvelope(input: {
  rows: Row[]; resultingDay: Row[]; catalog: Map<string, Row>; owned: string[]; missing: string[];
  age: number | null; trainingAge: string; trainingYears: number; sport: string; positions: string[];
  final: FinalCheckContext; rm28: Rm28; governor: GovernorContext; blockedIntensityClasses: string[];
  isGameDay?: boolean;
}) {
  const reasons: string[] = [];
  for (const row of input.rows) {
    const movement = input.catalog.get(row.movement_slug);
    if (!movement || movement.is_active !== true || movement.superseded_by != null) {
      reasons.push(`${row.movement_name}: ask your coach to choose a reviewed Exercise Vault item.`); continue;
    }
    const dose = row.dosage_unit === "seconds" ? row.duration_seconds : row.dosage_unit === "feet" ? row.distance_feet : row.dosage_unit === "total_reps" ? row.total_reps : row.reps;
    if (typeof dose !== "number" || !Number.isFinite(dose) || dose <= 0 || (row.sets != null && (!Number.isInteger(row.sets) || row.sets <= 0))) reasons.push(`${row.movement_name}: enter an exact positive dose before using this workout.`);
    if (!ownsAllGear(movement, input.owned) || !avoidsMissingGear(movement, input.missing)) reasons.push(`${row.movement_name}: required gear is missing from your saved answers.`);
    const scope = checkAthleteScope(movement as any, { sport: input.sport, positions: input.positions, ageYears: input.age, trainingAgeClass: input.trainingAge, seasonPhase: input.final.phase });
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
  for (const dropped of final.swaps) reasons.push(`Today's ${dropped.slot ?? "work"} would break a plan rule (${dropped.rule}). Keep the saved plan and ask your coach to review it.`);
  const items: GovItem[] = [];
  for (const row of input.resultingDay) {
    const fact = input.catalog.get(row.movement_slug) as CatalogFact | undefined;
    const channel = classify(fact);
    if (!fact || !channel) continue;
    items.push({ slug: row.movement_slug, name: row.movement_name, ...channel, sets: row.sets ?? 1,
      amountPerSet: amountPerSet(fact, channel.channel, row.reps, row.distance_feet), floorSets: 1, substitutionFamily: fact.substitution_family ?? null });
  }
  const governed = runGovernor({ items, rm28: input.rm28, ctx: input.governor });
  reasons.push(...governed.trims.map(trim => trim.reason));
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)], safeOption: reasons.length ? "Safe option: save this workout for later and ask your coach to review the listed items." : null };
}