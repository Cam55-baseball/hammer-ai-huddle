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