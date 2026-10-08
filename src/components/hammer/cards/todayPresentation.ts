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
    const mentalDrills = block.drills.filter(d => /film|reads?|scenarios?/i.test(d.name) && !/footwork/i.test(d.name));
    const physicalDrills = block.drills.filter(d => !mentalDrills.includes(d));
    // A split must not retain a combined checklist or let a partial card mark
    // the whole original modality done. Individual drill task IDs stay intact.
    if (mentalDrills.length) mental.push({ ...block, title: "Baserunning IQ — mental work only", route: "/baserunning-iq", ctaLabel: "Open Baserunning IQ", drills: mentalDrills, steps: mentalDrills.map(d => `${d.name}: ${d.dosage}`), gamePlanTemplate: null });
    if (physicalDrills.length) physical.push({ ...block, drills: physicalDrills, steps: physicalDrills.map(d => `${d.name}: ${d.dosage}`), gamePlanTemplate: null });
  }
  return { mental, physical };
}