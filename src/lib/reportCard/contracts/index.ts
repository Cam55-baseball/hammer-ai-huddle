import type { DisciplineContract } from "./shared";
import { bpContract } from "./bp.contract";
import { bhContract } from "./bh.contract";
import { spContract } from "./sp.contract";
import { throwingContract } from "./throwing.contract";

export * from "./shared";
export { bpContract, bhContract, spContract, throwingContract };

/** Softball hitting mirrors BH until its sport-specific contract is ratified. */
export const shContract: DisciplineContract = { ...bhContract, id: "sh", label: "Softball Hitting" };

export function getContract(sport: string | undefined, module: string | undefined): DisciplineContract | null {
  const s = (sport ?? "").toLowerCase();
  const m = (module ?? "").toLowerCase();
  if (s === "baseball" && m === "pitching") return bpContract;
  if (s === "baseball" && m === "hitting") return bhContract;
  if (m === "throwing") return throwingContract;
  if (s === "softball" && m === "pitching") return spContract;
  if (s === "softball" && m === "hitting") return shContract;
  return null;
}
