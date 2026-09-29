import type { DisciplineContract } from "./shared";
/** Throwing uses pose-only results; these are diagnostics, never AI vision requests. */

export const throwingContract: DisciplineContract = {
  id: "throwing",
  label: "Baseball Throwing",
  metrics: [],
};
