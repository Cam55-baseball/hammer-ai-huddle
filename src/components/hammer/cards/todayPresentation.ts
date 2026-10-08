import type { PrescribedBlock } from "@/lib/hammer/prescription/dailyPlan";

export function prescribedToday(block: PrescribedBlock): boolean {
  return block.status === "ready" && block.drills.length > 0;
}

/** Partition existing drills without changing a single instruction, dose or task key. */
export function splitBaserunning(blocks: readonly PrescribedBlock[]) {
  const mental: PrescribedBlock[] = [];
  const physical: PrescribedBlock[] = [];
  for (const block of blocks) {
    if (block.modality !== "baserunning" || !prescribedToday(block)) continue;
    // Running/tag-up scenarios are physical unless explicitly prescribed as film
    // or reads. A display change must not turn running reps into mental reps.
    const mentalDrills = block.drills.filter(d => /film|reads?/i.test(d.name) && !/footwork/i.test(d.name));
    const physicalDrills = block.drills.filter(d => !mentalDrills.includes(d));
    // A split must not retain a combined checklist or let a partial card mark
    // the whole original modality done. Individual drill task IDs stay intact.
    if (mentalDrills.length) mental.push({ ...block, title: "Baserunning IQ — mental work only", route: "/baserunning-iq", ctaLabel: "Open Baserunning IQ", drills: mentalDrills, steps: mentalDrills.map(d => `${d.name}: ${d.dosage}`), gamePlanTemplate: null });
    if (physicalDrills.length) physical.push({ ...block, drills: physicalDrills, steps: physicalDrills.map(d => `${d.name}: ${d.dosage}`), gamePlanTemplate: null });
  }
  return { mental, physical };
}

/** Only explicitly prescribed Base Stealer work belongs to that module. */
export function groupPhysicalBaserunning(blocks: readonly PrescribedBlock[], eligible: boolean) {
  const speed: PrescribedBlock[] = [];
  const conditioning: PrescribedBlock[] = [];
  for (const block of blocks) {
    const speedDrills = eligible ? block.drills.filter(d => /base stealer|steal(?:ing)? (?:attempt|rep|start|sprint)/i.test(d.name)) : [];
    const conditioningDrills = block.drills.filter(d => !speedDrills.includes(d));
    if (speedDrills.length) speed.push({ ...block, drills: speedDrills, steps: speedDrills.map(d => `${d.name}: ${d.dosage}`) });
    if (conditioningDrills.length) conditioning.push({ ...block, drills: conditioningDrills, steps: conditioningDrills.map(d => `${d.name}: ${d.dosage}`) });
  }
  return { speed, conditioning };
}