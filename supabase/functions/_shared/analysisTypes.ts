/** Analyzer identity is explicit: positions and taxonomy never select another type. */
export const ANALYSIS_TYPES = ["hitting", "pitching", "throwing"] as const;
export type AnalysisType = (typeof ANALYSIS_TYPES)[number];
export function isAnalysisType(value: unknown): value is AnalysisType {
  return typeof value === "string" && ANALYSIS_TYPES.some(type => type === value);
}
export function dispatchAnalysisType<T>(value: unknown, analyzers: Record<AnalysisType, () => T>): T {
  if (!isAnalysisType(value)) throw new Error("This analysis is coming soon");
  return analyzers[value]();
}