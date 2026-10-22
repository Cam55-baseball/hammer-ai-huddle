import sportCatalog from "./sportSwapCatalog.json" with { type: "json" };
import warmupCatalog from "./warmupSwapCatalog.json" with { type: "json" };
import { ownsAllGear, avoidsMissingGear } from "./simpleSwap.ts";
import { chooseNoFieldMix, type NoFieldInputs } from "./noFieldMix.ts";
import { SPEED_SOURCE_INTENTS, SPEED_SWAP_CATALOG } from "./speedSwapCatalog.ts";

type Drill = { name: string; slug?: string | null; dosage: string; stage?: string | null; cue?: string | null; swapReason?: string; speedMix?: unknown };
export function blockKnownGear(source: Drill, modality: string, sport: "baseball" | "softball"): string[] {
  if (modality === "speed" && SPEED_SOURCE_INTENTS[source.name]) return ["open_field"];
  if (modality === "recovery" && source.name === "Mobility + foam roll") return ["foam_roller"];
  if (modality === "warmup" || modality === "recovery") {
    return warmupCatalog.find(drill => drill.slug === source.slug || drill.name === source.name)?.equipment ?? [];
  }
  const drill = sportCatalog[sport].find(drill => drill.id === source.slug);
  if (drill) return drill.equipmentNeeded;
  if (modality === "hitting" && (source.name === "Live BP or machine" || source.name === "Full-go: machine at-bats with counts")) return ["pitching_machine"];
  return [];
}
export function blockSwapChoices(source: Drill, modality: string, sport: "baseball" | "softball", owned: string[], missing: string[], speedInputs?: Omit<NoFieldInputs, "goal" | "totalReps">) {
  if (modality === "speed") {
    const intent = SPEED_SOURCE_INTENTS[source.name];
    // The old dose remains the slot total. Each child shows its share, distance and exact rest.
    const dose = source.dosage.match(/^(\d+)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*yards\b/i);
    if (!intent || !dose || !speedInputs || !missing.includes("open_field") || source.speedMix) return [];
    const has = (item: string) => !missing.includes(item) && owned.includes(item);
    const result = chooseNoFieldMix({ ...speedInputs, hill: speedInputs.hill && has("hill"),
      sled: speedInputs.sled && has("sled"), band: speedInputs.band && has("bands"),
      goal: intent, totalReps: Number(dose[1]) });
    if (!result.items.length) return [];
    const speedMix = result.items.map(item => {
      const catalog = SPEED_SWAP_CATALOG.find(entry => entry.slug === item.slug);
      return { ...item, cue: catalog?.cue, equipment: catalog?.equipment ?? [] };
    });
    return [{ slug: "swap_acceleration_mix", name: "Acceleration mix", reason: result.because,
      replacement: { ...source, slug: "swap_acceleration_mix", name: "Acceleration mix", speedMix,
        cue: speedMix.map(item => `${item.name}: ${item.reps} reps × ${item.distanceYards} yards; rest ${item.restSeconds} seconds after each rep. ${item.cue}`).join(" "),
        setup: "Marked safe running lane with clear stopping space. Use only the confirmed equipment below.",
        stopIf: "Any pain, tightness, slipping or slower steps — stop the session.", guide: null, equipmentNote: null, swapReason: result.because } }];
  }
  if (modality === "recovery" && source.name === "Mobility + foam roll" && missing.includes("foam_roller")) {
    const reason = `Because the foam roller is missing, gentle mobility keeps your ${source.dosage} without equipment.`;
    return [{ slug: "recovery_gentle_mobility", name: "Gentle mobility", reason,
      replacement: { ...source, slug: "recovery_gentle_mobility", name: "Gentle mobility",
        cue: "Move gently through the same focus areas; breathe slowly and stay in a comfortable range.",
        setup: "Clear floor space. No foam roller needed.", stopIf: "Sharp pain, numbness or a pinching joint — stop.",
        guide: null, equipmentNote: null, swapReason: reason } }];
  }
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