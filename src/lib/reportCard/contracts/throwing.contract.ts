import type { DisciplineContract } from "./shared";
import { bpContract } from "./bp.contract";

/** Legacy AI metrics contract; the new pose-only throwing card never consumes it. */
const EXCLUDED = new Set(["energy_angle_deg", "tempo_sec", "lift_thrust_deg"]);

export const throwingContract: DisciplineContract = {
  id: "throwing",
  label: "Baseball Throwing",
  metrics: bpContract.metrics.filter((m) => !EXCLUDED.has(m.key)),
};
