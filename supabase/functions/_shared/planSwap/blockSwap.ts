import sportCatalog from "./sportSwapCatalog.json" with { type: "json" };
import warmupCatalog from "./warmupSwapCatalog.json" with { type: "json" };
import { ownsAllGear, avoidsMissingGear } from "./simpleSwap.ts";

type Drill = { name: string; slug?: string | null; dosage: string; stage?: string | null; cue?: string | null; swapReason?: string };
export function blockKnownGear(source: Drill, modality: string, sport: "baseball" | "softball"): string[] {
  if (modality === "warmup" || modality === "recovery") {
    return warmupCatalog.find(drill => drill.slug === source.slug || drill.name === source.name)?.equipment ?? [];
  }
  const drill = sportCatalog[sport].find(drill => drill.id === source.slug);
  if (drill) return drill.equipmentNeeded;
  if (modality === "hitting" && (source.name === "Live BP or machine" || source.name === "Full-go: machine at-bats with counts")) return ["pitching_machine"];
  return [];
}
export function blockSwapChoices(source: Drill, modality: string, sport: "baseball" | "softball", owned: string[], missing: string[]) {
  if (modality === "warmup" || modality === "recovery") {
    const original = warmupCatalog.find(drill => drill.slug === source.slug || drill.name === source.name);
    const sibling = original?.fallbackSlug ? warmupCatalog.find(drill => drill.slug === original.fallbackSlug) : undefined;
    if (!sibling || !original || !missing.length) return [];
    const gear = { equipment_requirements: sibling.equipment, equipment_alternatives: [] };
    if (!ownsAllGear(gear, owned) || !avoidsMissingGear(gear, missing)) return [];
    const reason = `Because the equipment is missing, ${sibling.name.toLowerCase()} keeps your ${source.dosage}.`;
    return [{ slug: sibling.slug, name: sibling.name, reason,
      replacement: { ...source, slug: sibling.slug, name: sibling.name, cue: sibling.cue,
        setup: sibling.setup, stopIf: sibling.stopIf, guide: null, equipmentNote: null,
        swapReason: reason } }];
  }
  // Explicit owner-authorized machine → partner-flips pair; no name-generated alternatives.
  const machine = source.slug === "machine_bp" || source.name === "Live BP or machine" || source.name === "Full-go: machine at-bats with counts";
  if (modality !== "hitting" || !machine) return [];
  const catalog = sportCatalog[sport];
  const flips = catalog.find(drill => drill.id === "flip_drill");
  if (!flips) return [];
  const gear = { equipment_requirements: flips.equipmentNeeded, equipment_alternatives: flips.equipmentAlternatives ?? [] };
  if (!ownsAllGear(gear, owned) || !avoidsMissingGear(gear, missing)) return [];
  return [{ slug: flips.id, name: "Partner flips", reason: `Partner flips: same ${source.dosage}, no machine needed`,
    replacement: { ...source, slug: flips.id, name: "Partner flips", cue: flips.description, swapReason: `Because the machine is missing, partner flips keep your ${source.dosage}.` } }];
}