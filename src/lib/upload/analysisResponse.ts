/** One response contract for uploads, camera recordings and manual retries. */
export function normalizeAnalysisResponse(data: any) {
  if (data?.replay_cache && data.ai_analysis) return { ...data.ai_analysis, saved: data.saved === true, efficiency_score: data.efficiency_score ?? data.ai_analysis.efficiency_score };
  return data;
}

export async function analysisErrorDetails(error: unknown): Promise<{ status: number; message: string; report?: any }> {
  const value = error as { message?: string; context?: Response } | null;
  const response = value?.context;
  let message = "Your clip is saved, but its analysis did not finish.";
  let report: any;
  if (response && typeof response.clone === "function") {
    try {
      const body = await response.clone().json();
      message = body.message || body.detail || body.error || message;
      if (body.report && typeof body.report.feedback === "string") report = { ...body.report, saved: body.saved === true };
    } catch { /* preserve safe default, never dump upstream raw bodies */ }
  }
  return { status: response?.status ?? 0, message: String(message), ...(report ? { report } : {}) };
}
/** True when a report carries real coaching words, whatever its metrics or flags say. */
export function hasCoachingContent(report: any): boolean {
  if (!report || typeof report !== "object") return false;
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0 && !/^not measured\b/i.test(v.trim()) && !/report: not measured/i.test(v);
  return (Array.isArray(report.summary) && report.summary.some(text)) ||
    (Array.isArray(report.drills) && report.drills.length > 0) ||
    (Array.isArray(report.improvements) && report.improvements.length > 0) ||
    (Array.isArray(report.positives) && report.positives.some(text)) ||
    text(report.feedback);
}

/** Coaching present means the screen is a coaching report, never "Not measured". */
export function displayableReport<T extends Record<string, any>>(report: T): T {
  if (!hasCoachingContent(report) || report.report_status !== "not_measured") return report;
  const { report_status: _drop, ...rest } = report;
  return rest as T;
}

/**
 * The saved copy is the truth: when the reply was lost, failed, or came back
 * without coaching or without a save confirmation, read the clip's saved
 * report and show it if it has coaching.
 */
export async function settleAnalysisReport(
  supabase: any,
  videoId: string | null | undefined,
  userId: string | null | undefined,
  candidate: any,
): Promise<any | null> {
  const fine = candidate && hasCoachingContent(candidate) && candidate.saved !== false;
  if (fine) return displayableReport(candidate);
  if (videoId && userId) {
    try {
      // Players can't read report columns directly; use the self-only reader.
      const { data } = await supabase.functions.invoke("get-my-analysis-report", { body: { videoId } });
      const stored = data?.ai_analysis;
      if (data?.status === "completed" && hasCoachingContent(stored)) {
        return displayableReport({ ...stored, efficiency_score: candidate?.efficiency_score ?? data.efficiency_score ?? stored.efficiency_score, saved: true, save_error: null });
      }
    } catch { /* fall through to what we have */ }
  }
  return candidate ? displayableReport(candidate) : null;
}
