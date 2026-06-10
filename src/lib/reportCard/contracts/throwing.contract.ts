import type { DisciplineContract } from "./shared";
import { bpContract } from "./bp.contract";

/** Throwing = BP minus Energy Angle, Tempo, Lift & Thrust (no rubber, no leg lift). */
const EXCLUDED = new Set(["energy_angle_deg", "tempo_sec", "lift_thrust_deg"]);

export const throwingContract: DisciplineContract = {
  id: "throwing",
  label: "Baseball Throwing",
  metrics: bpContract.metrics.filter((m) => !EXCLUDED.has(m.key)),
};
