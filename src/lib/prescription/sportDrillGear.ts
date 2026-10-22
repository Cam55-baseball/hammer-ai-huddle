import type { DrillDefinition } from "@/data/baseball/drillDefinitions";
import { ownsAllGear, requiredGear } from "../../../supabase/functions/_shared/planSwap/simpleSwap";

/** Sport-library declarations use the same gear judge as saved-plan Swap. */
export function sportDrillGear(drill: DrillDefinition) {
  return { equipment_requirements: drill.equipmentNeeded, equipment_alternatives: drill.equipmentAlternatives ?? [] };
}

export function ownsSportDrillGear(drill: DrillDefinition, owned: Iterable<string>) {
  return ownsAllGear(sportDrillGear(drill), owned);
}

export function listedSportDrillGear(drill: DrillDefinition) {
  return requiredGear(sportDrillGear(drill));
}