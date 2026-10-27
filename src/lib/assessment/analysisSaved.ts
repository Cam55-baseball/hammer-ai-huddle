/** Completion hints only follow a confirmed saved, readable analysis. */
export function assessmentAnalysisSaved(report: unknown): boolean {
  if (!report || typeof report !== "object") return false;
  const value = report as Record<string, unknown>;
  return value.saved === true && value.report_status !== "not_measured" &&
    typeof value.feedback === "string" && value.feedback.trim().length > 0 &&
    Array.isArray(value.summary) && value.summary.some(item => typeof item === "string" && item.trim().length > 0) &&
    Array.isArray(value.drills);
}