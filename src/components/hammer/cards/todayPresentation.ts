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
    if (mentalDrills.length) mental.push({ ...block, title: "Baserunning IQ — mental work only", route: "/baserunning-iq", ctaLabel: "Open Baserunning IQ", drills: mentalDrills });
    if (physicalDrills.length) physical.push({ ...block, drills: physicalDrills });
  }
  return { mental, physical };
}