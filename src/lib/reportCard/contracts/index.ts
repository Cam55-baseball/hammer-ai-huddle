import type { DisciplineContract } from "./shared";
import { bpContract } from "./bp.contract";
import { bhContract } from "./bh.contract";
import { throwingContract } from "./throwing.contract";

export * from "./shared";
export { bpContract, bhContract, throwingContract };

/** Softball pitching shares BP tiles for now (windmill deferred). */
export const sbPitchingContract: DisciplineContract = { ...bpContract, id: "sb-pitching", label: "Softball Pitching" };
/** Softball hitting mirrors BH. */
export const shContract: DisciplineContract = { ...bhContract, id: "sh", label: "Softball Hitting" };

export function getContract(sport: string | undefined, module: string | undefined): DisciplineContract | null {
  const s = (sport ?? "").toLowerCase();
  const m = (module ?? "").toLowerCase();
  if (s === "baseball" && m === "pitching") return bpContract;
  if (s === "baseball" && m === "hitting") return bhContract;
  if (m === "throwing") return throwingContract;
  if (s === "softball" && m === "pitching") return sbPitchingContract;
  if (s === "softball" && m === "hitting") return shContract;
  return null;
}
