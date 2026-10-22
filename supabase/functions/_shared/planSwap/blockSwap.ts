import { baseballDrills } from "../../../../src/data/baseball/drillDefinitions.ts";
import { softballDrills } from "../../../../src/data/softball/drillDefinitions.ts";
import { ownsAllGear, avoidsMissingGear } from "./simpleSwap.ts";

type Drill = { name: string; slug?: string | null; dosage: string; stage?: string | null; cue?: string | null; swapReason?: string };
export function blockSwapChoices(source: Drill, modality: string, sport: "baseball" | "softball", owned: string[], missing: string[]) {
  // Explicit owner-authorized machine → partner-flips pair; no name-generated alternatives.
  const machine = source.slug === "machine_bp" || source.name === "Live BP or machine" || source.name === "Full-go: machine at-bats with counts";
  if (modality !== "hitting" || !machine) return [];
  const catalog = sport === "baseball" ? baseballDrills : softballDrills;
  const flips = catalog.find(drill => drill.id === "flip_drill");
  if (!flips) return [];
  const gear = { equipment_requirements: flips.equipmentNeeded, equipment_alternatives: flips.equipmentAlternatives ?? [] };
  if (!ownsAllGear(gear, owned) || !avoidsMissingGear(gear, missing)) return [];
  return [{ slug: flips.id, name: "Partner flips", reason: `Partner flips: same ${source.dosage}, no machine needed`,
    replacement: { ...source, slug: flips.id, name: "Partner flips", cue: flips.description, swapReason: `Because the machine is missing, partner flips keep your ${source.dosage}.` } }];
}