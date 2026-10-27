/** A readable report is not a measured result. Missing values never become scores. */
export function unavailableAnalysis(module: string, stage: string) {
  return {
    efficiency_score: null,
    summary: [`${module.charAt(0).toUpperCase() + module.slice(1)} report: Not measured.`],
    feedback: "Not measured: this clip could not be fully checked. No measurements, grades or faults have been guessed. Your clip can be checked again.",
    positives: [], improvements: [], drills: [], violations_detected: {}, metrics: null,
    report_status: "not_measured", unavailable_stage: stage,
  };
}

/** Saved reports omit scores; missing measurements must not invalidate readable coaching. */
export function hasReadableReport(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const report = data as Record<string, unknown>;
  return typeof report.feedback === "string" && report.feedback.trim().length > 0 &&
    Array.isArray(report.summary) && report.summary.some((s: unknown) => typeof s === "string" && s.trim().length > 0) &&
    Array.isArray(report.drills);
}

export function hasStructuredAnalysis(data: unknown): boolean {
  try {
    const d = data as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
    const args = d?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return false;
    const report = JSON.parse(args);
    return hasReadableReport(report) && typeof report.efficiency_score === "number" && Number.isFinite(report.efficiency_score);
  } catch { return false; }
}

export function analysisRefused(data: unknown): boolean {
  const value = data as { choices?: Array<{ finish_reason?: string; message?: { refusal?: string; content?: string; tool_calls?: unknown[] } }> } | null;
  return value?.choices?.some(choice => /safety|content_filter|recitation|prohibited|blocklist/i.test(choice.finish_reason ?? "") || !!choice.message?.refusal) ?? false;
}

export async function reliableAnalysis<T extends { ok: boolean; status: number; data: unknown; errorBody?: string }>(
  call: (model: string) => Promise<T>, record: (result: T) => Promise<void>,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)),
): Promise<T> {
  let result = await call("google/gemini-2.5-flash");
  const recordSafely = async (attempt: T) => {
    try { await record(attempt); } catch { console.warn("[analysis] usage logging failed; report retry continues"); }
  };
  await recordSafely(result);
  if (result.ok && hasStructuredAnalysis(result.data)) return result;
  if (analysisRefused(result.data) || (!result.ok && result.status !== 429 && result.status < 500)) return result;
  await wait();
  result = await call("google/gemini-2.5-flash");
  await recordSafely(result);
  if (result.ok && hasStructuredAnalysis(result.data)) return result;
  if (analysisRefused(result.data) || (!result.ok && result.status !== 429 && result.status < 500)) return result;
  await wait();
  result = await call("openai/gpt-4o-mini");
  await recordSafely(result);
  return result;
}