// Area grade on the 20–80 scale by 5s, from a measured 0–100 report-card score.
// Bands: Sub Par <40, Acceptable 40–60, Elite 65+ (owner rule).
export type AreaBand = "Sub Par" | "Acceptable" | "Elite";
export function areaGrade(score: number): { grade: number; band: AreaBand } {
  const raw = 20 + Math.max(0, Math.min(100, score)) * 0.6;
  const grade = Math.round(raw / 5) * 5;
  const band: AreaBand = grade < 40 ? "Sub Par" : grade >= 65 ? "Elite" : "Acceptable";
  return { grade, band };
}
